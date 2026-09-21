/**
 * Write tool: create or overwrite a file, creating parent directories.
 *
 * 写文件工具。整文件覆盖；同路径写入走 mutation queue 串行。
 */

import type { AgentTool } from "@earendil-works/pi-agent-core";
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "fs/promises";
import { dirname } from "path";
import { type Static, Type } from "typebox";
import type { ExtensionContext, ToolDefinition } from "../extensions/types.ts";
import { withFileMutationQueue } from "./file-mutation-queue.ts";
import { resolveToCwd } from "./path-utils.ts";
import { writeRenderers } from "./renderers/write.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const writeSchema = Type.Object({
	path: Type.String({ description: "Path to the file to write (relative or absolute)" }),
	content: Type.String({ description: "Content to write to the file" }),
});

/**
 * System-prompt snippet and guidelines for the write tool.
 *
 * write 写进系统提示的片段。只用于新文件或整文件重写。
 */
export const writeToolSystemPromptContribution = {
	snippet: "Create or overwrite files",
	guidelines: ["Use write only for new files or complete rewrites."],
} as const;

/**
 * Arguments the model sends to the write tool.
 *
 * write 调用参数。path 相对或绝对都可以。
 */
export type WriteToolInput = Static<typeof writeSchema>;

/**
 * Pluggable operations for the write tool.
 * Override these to delegate file writing to remote systems (for example SSH).
 *
 * write 的可替换写盘口。远程只换这一层。
 */
export interface WriteOperations {
	/** Write content to a file */
	writeFile: (absolutePath: string, content: string) => Promise<void>;
	/** Create directory recursively */
	mkdir: (dir: string) => Promise<void>;
}

const defaultWriteOperations: WriteOperations = {
	writeFile: (path, content) => fsWriteFile(path, content, "utf-8"),
	mkdir: (dir) => fsMkdir(dir, { recursive: true }).then(() => {}),
};

/**
 * Options for creating the write tool.
 *
 * write 工厂选项。operations 缺省走本地文件系统。
 */
export interface WriteToolOptions {
	/** Custom operations for file writing. Default: local filesystem */
	operations?: WriteOperations;
}

/**
 * Create the built-in write ToolDefinition.
 *
 * 内置 write 定义。先建父目录再写；中止不从 listener reject，避免提前放锁。
 */
export function createWriteToolDefinition(
	cwd: string,
	options?: WriteToolOptions,
): ToolDefinition<typeof writeSchema, undefined> {
	const ops = options?.operations ?? defaultWriteOperations;
	return {
		name: "write",
		label: "write",
		description:
			"Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
		promptSnippet: writeToolSystemPromptContribution.snippet,
		promptGuidelines: [...writeToolSystemPromptContribution.guidelines],
		parameters: writeSchema,
		constrainedSampling: { type: "json_schema", strict: "prefer" },
		async execute(
			_toolCallId,
			{ path, content }: { path: string; content: string },
			signal?: AbortSignal,
			_onUpdate?,
			ctx?: ExtensionContext,
		) {
			const absolutePath = resolveToCwd(path, ctx?.cwd || cwd);
			const dir = dirname(absolutePath);
			return withFileMutationQueue(absolutePath, async () => {
				// Do not reject from an abort event listener here: that would release the
				// mutation queue while an in-flight filesystem operation may still finish.
				// Checking signal.aborted after each await observes the same aborts while
				// keeping the queue locked until the current operation has settled.
				const throwIfAborted = (): void => {
					if (signal?.aborted) throw new Error("Operation aborted");
				};

				throwIfAborted();
				// Create parent directories if needed.
				await ops.mkdir(dir);
				throwIfAborted();

				// Write the file contents.
				await ops.writeFile(absolutePath, content);
				throwIfAborted();

				return {
					content: [{ type: "text", text: `Successfully wrote to ${path}` }],
					details: undefined,
				};
			});
		},
		...writeRenderers,
	};
}

/**
 * Create the built-in write AgentTool.
 *
 * 内置 write 运行时工具。定义再 wrap。
 */
export function createWriteTool(cwd: string, options?: WriteToolOptions): AgentTool<typeof writeSchema> {
	return wrapToolDefinition(createWriteToolDefinition(cwd, options));
}
