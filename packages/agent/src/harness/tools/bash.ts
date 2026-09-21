/**
 * Built-in bash tool.
 *
 * Runs a command in the current working directory and returns combined stdout
 * and stderr, truncated from the tail.
 *
 * 内置 bash 工具。合并 stdout/stderr，从尾截断；超时和失败抛错。
 */

import { type Static, Type } from "typebox";
import type { Context } from "../context.ts";
import type { AgentHarnessTool, ShellOutputTruncation, ShellOutputView } from "../types.ts";
import { applyShellOutputUpdate } from "../utils/output-capture.ts";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "../utils/truncate.ts";
import type { ExecutionToolContext } from "./tool-context.ts";

const MAX_TIMEOUT_SECONDS = 2_147_483_647 / 1000;
const BASH_CHECKPOINT_INTERVAL_MS = 2_000;

const bashSchema = Type.Object({
	command: Type.String({ description: "Bash command to execute" }),
	timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),
});

/**
 * Parameters accepted by the bash tool.
 *
 * bash 工具的入参。timeout 是秒；非法超时立刻抛。
 */
export type BashToolInput = Static<typeof bashSchema>;

/**
 * Truncation metadata attached to a bash result.
 *
 * 输出被截断时附带的信息。完整输出可落到 fullOutputPath。
 */
export interface BashToolDetails {
	truncation?: ShellOutputTruncation;
	fullOutputPath?: string;
}

/**
 * Concrete command about to be executed, after prefix and prepare hooks.
 *
 * 前缀和 prepare 之后真正要跑的命令。cwd/env 可被 prepare 改。
 */
export interface BashExecution {
	command: string;
	cwd: string;
	env: Record<string, string>;
	inheritEnv: boolean;
}

/**
 * Hook that mutates a bash execution before it is spawned.
 *
 * 开跑前改命令/cwd/env 的钩子。可以异步。
 */
export type BashPrepare<TContext extends ExecutionToolContext = ExecutionToolContext> = (
	execution: BashExecution,
	toolContext: TContext,
	context: Context,
) => void | Promise<void>;

/**
 * Options for createBashTool.
 *
 * createBashTool 的选项。commandPrefix 叠在用户命令前面。
 */
export interface BashToolOptions<TContext extends ExecutionToolContext = ExecutionToolContext> {
	commandPrefix?: string;
	prepare?: BashPrepare<TContext>;
}

function validateTimeout(timeout: number | undefined): void {
	if (timeout === undefined) return;
	if (!Number.isFinite(timeout) || timeout <= 0) {
		throw new Error("Invalid timeout: must be a finite number of seconds");
	}
	if (timeout > MAX_TIMEOUT_SECONDS) {
		throw new Error(`Invalid timeout: maximum is ${MAX_TIMEOUT_SECONDS} seconds`);
	}
}

/**
 * Create the built-in bash tool bound to an ExecutionToolContext.
 *
 * 创建内置 bash 工具。输出从尾截；非零退出和超时抛错。
 */
export function createBashTool<TContext extends ExecutionToolContext = ExecutionToolContext>(
	options?: BashToolOptions<TContext>,
): AgentHarnessTool<TContext, typeof bashSchema, BashToolDetails | undefined> {
	return {
		name: "bash",
		label: "bash",
		description: `Execute a bash command in the current working directory. Returns combined stdout and stderr. Output is truncated to last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds.`,
		parameters: bashSchema,
		async execute(_toolCallId, { command, timeout }, onUpdate, toolContext, _invocation, context) {
			validateTimeout(timeout);
			const { env } = toolContext;
			const execution: BashExecution = {
				command: options?.commandPrefix ? `${options.commandPrefix}\n${command}` : command,
				cwd: env.cwd,
				env: {},
				inheritEnv: true,
			};
			await options?.prepare?.(execution, toolContext, context);
			let view: ShellOutputView | undefined;
			let lastCheckpointAt = Date.now();
			let lastCheckpoint: string | undefined;
			let acceptingUpdates = true;

			onUpdate({ content: [], details: undefined });
			const result = await env.exec(
				execution.command,
				{
					cwd: execution.cwd,
					env: execution.env,
					inheritEnv: execution.inheritEnv,
					timeout,
					capture: {
						limits: { maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES, retain: "tail" },
						spill: true,
					},
					onUpdate: (update) => {
						if (!acceptingUpdates) return;
						view = applyShellOutputUpdate(view, update);
						const snapshot = {
							content: [{ type: "text" as const, text: view.text }],
							details: {
								truncation: view.truncation.truncated ? view.truncation : undefined,
								fullOutputPath: view.spillPath,
							},
						};
						const now = Date.now();
						const encoded = JSON.stringify(snapshot);
						const checkpoint =
							now - lastCheckpointAt >= BASH_CHECKPOINT_INTERVAL_MS && encoded !== lastCheckpoint;
						onUpdate(snapshot, checkpoint ? { checkpoint: true } : undefined);
						if (checkpoint) {
							lastCheckpointAt = now;
							lastCheckpoint = encoded;
						}
					},
				},
				context,
			);
			acceptingUpdates = false;

			let outputText = view?.text ?? "";
			const capture = result.ok ? { text: outputText, ...result.value } : view;
			let details: BashToolDetails | undefined;
			if (capture?.truncation.truncated) {
				details = { truncation: capture.truncation, fullOutputPath: capture.spillPath };
				const startLine = capture.truncation.totalLines - capture.truncation.outputLines + 1;
				const endLine = capture.truncation.totalLines;
				if (capture.truncation.lastLinePartial) {
					const lastLineSize = formatSize(capture.lastLineBytes ?? capture.truncation.outputBytes);
					outputText += `\n\n[Showing last ${formatSize(capture.truncation.outputBytes)} of line ${endLine} (line is ${lastLineSize}). Full output: ${capture.spillPath}]`;
				} else if (capture.truncation.truncatedBy === "lines") {
					outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${capture.truncation.totalLines}. Full output: ${capture.spillPath}]`;
				} else {
					outputText += `\n\n[Showing lines ${startLine}-${endLine} of ${capture.truncation.totalLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Full output: ${capture.spillPath}]`;
				}
			}

			if (!result.ok) {
				const status =
					result.error.code === "timeout"
						? `Command timed out after ${timeout} seconds`
						: result.error.code === "aborted"
							? "Command aborted"
							: result.error.message;
				throw new Error(outputText ? `${outputText}\n\n${status}` : status, { cause: result.error });
			}
			if (result.value.exitCode !== 0) {
				throw new Error(
					`${outputText ? `${outputText}\n\n` : ""}Command exited with code ${result.value.exitCode}`,
				);
			}
			return { content: [{ type: "text", text: outputText || "(no output)" }], details };
		},
	};
}
