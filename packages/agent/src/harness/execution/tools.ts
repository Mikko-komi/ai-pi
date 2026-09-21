/**
 * Tool-call phases for one harness drive.
 *
 * Prepare, admit, execute, and finalize stay separate. Expected tool throws
 * become error output instead of aborting the drive.
 *
 * 一轮 drive 里的工具相位。准备、准入、执行、收尾分开；工具预期抛错改成错误结果，不中断 drive。
 */

import { type ToolResultMessage, validateToolArguments } from "@earendil-works/pi-ai";
import type { AgentToolCall, AgentToolResult } from "../../types.ts";
import { type Context, withAbortSignal } from "../context.ts";
import type { JsonValue } from "../session/types.ts";
import type { AgentHarnessTool, AgentHarnessToolInvocation, AgentHarnessToolUpdateCallback } from "../types.ts";
import type { Gate } from "./effect-gate.ts";

/**
 * A tool call whose tool exists and whose prepared arguments passed validation.
 *
 * 工具存在且参数校验通过后的调用。还没过 before_tool，不能当已准入。
 */
export interface PreparedToolCall<TContext extends object | undefined> {
	toolCall: AgentToolCall;
	tool: AgentHarnessTool<TContext>;
	args: Record<string, JsonValue>;
}

/**
 * Synthetic result produced without crossing the external tool-effect boundary.
 *
 * 没跨外部工具边界的合成错误结果。缺工具、校验失败或被 hook 拦住都走这里。
 */
export interface ImmediateToolOutcome {
	kind: "immediate";
	toolCall: AgentToolCall;
	result: AgentToolResult<unknown>;
	isError: true;
	terminate: boolean;
}

/**
 * Aggregated decision from the before-tool hook pipeline.
 *
 * before_tool 聚合结果。`block` 则改发错误结果，不执行工具。
 */
export interface BeforeToolDecision {
	args?: Record<string, JsonValue>;
	block?: { reason: string; terminate?: boolean };
}

/**
 * A prepared call cleared for durable intent publication and execution.
 *
 * 已过 before_tool、可以落盘意图并执行的调用。替换参数会再校验一次。
 */
export interface ClearedToolCall<TContext extends object | undefined> {
	toolCall: AgentToolCall;
	tool: AgentHarnessTool<TContext>;
	args: Record<string, JsonValue>;
}

/**
 * Raw phase-two tool output before after-tool patching.
 *
 * 第二相位的原始工具输出。after_tool 还没叠上去。
 */
export interface ExecutedToolCall {
	result: AgentToolResult<unknown>;
	isError: boolean;
}

/**
 * Aggregated patch from the after-tool hook pipeline.
 *
 * after_tool 聚合补丁。只覆盖给出的字段，没给的保持执行结果。
 */
export interface AfterToolPatch {
	content?: AgentToolResult<unknown>["content"];
	details?: JsonValue;
	isError?: boolean;
	usage?: AgentToolResult<unknown>["usage"];
	terminate?: boolean;
}

/**
 * Final tool output ready to become a durable tool-result message.
 *
 * 可以落成 toolResult 消息的最终输出。`terminate` 为真才提前停。
 */
export interface FinalizedToolCall {
	toolCall: AgentToolCall;
	result: AgentToolResult<unknown>;
	isError: boolean;
	terminate: boolean;
}

function createErrorToolResult(message: string): AgentToolResult<unknown> {
	return {
		content: [{ type: "text", text: message }],
		details: undefined,
	};
}

function immediateError(toolCall: AgentToolCall, message: string, terminate = false): ImmediateToolOutcome {
	return {
		kind: "immediate",
		toolCall,
		result: createErrorToolResult(message),
		isError: true,
		terminate,
	};
}

/**
 * Resolve a tool, apply its deterministic argument preparation, and validate the result.
 *
 * 解析工具、跑确定性 prepareArguments 并校验。缺工具或校验失败走 ImmediateToolOutcome。
 */
export function prepareToolCall<TContext extends object | undefined>(
	call: AgentToolCall,
	tools: AgentHarnessTool<TContext>[],
): PreparedToolCall<TContext> | ImmediateToolOutcome {
	const tool = tools.find((candidate) => candidate.name === call.name);
	if (!tool) {
		return immediateError(call, `Tool ${JSON.stringify(call.name)} is unavailable`);
	}

	try {
		const preparedArguments = tool.prepareArguments ? tool.prepareArguments(call.arguments) : call.arguments;
		const preparedCall: AgentToolCall =
			preparedArguments === call.arguments
				? call
				: { ...call, arguments: preparedArguments as Record<string, JsonValue> };
		const args = validateToolArguments(tool, preparedCall) as Record<string, JsonValue>;
		return { toolCall: call, tool, args };
	} catch (error) {
		return immediateError(call, error instanceof Error ? error.message : String(error));
	}
}

/**
 * Apply an explicit hook decision and revalidate replacement arguments.
 *
 * 套 before_tool 决定。`block` 变错误结果；替换参数会再校验一次。
 */
export function applyBeforeToolDecision<TContext extends object | undefined>(
	prepared: PreparedToolCall<TContext>,
	decision: BeforeToolDecision | undefined,
): ClearedToolCall<TContext> | ImmediateToolOutcome {
	if (decision?.block) {
		return immediateError(prepared.toolCall, decision.block.reason, decision.block.terminate === true);
	}

	if (!decision?.args) {
		return { toolCall: prepared.toolCall, tool: prepared.tool, args: prepared.args };
	}

	try {
		const validatedArgs = validateToolArguments(prepared.tool, {
			...prepared.toolCall,
			arguments: decision.args,
		}) as Record<string, JsonValue>;
		return { toolCall: prepared.toolCall, tool: prepared.tool, args: validatedArgs };
	} catch (error) {
		return immediateError(prepared.toolCall, error instanceof Error ? error.message : String(error));
	}
}

/**
 * Execute one cleared external tool effect, converting expected tool throws to error output.
 *
 * 执行已准入的外部工具。工具抛错改成错误结果；执行结束后不再转发 onUpdate。
 */
export function executeToolCall<TContext extends object | undefined>(
	call: ClearedToolCall<TContext>,
	gate: Gate,
	onUpdate: AgentHarnessToolUpdateCallback<unknown>,
	toolContext: TContext,
	invocation: AgentHarnessToolInvocation,
	context: Context,
): Promise<ExecutedToolCall> {
	let acceptingUpdates = true;
	return gate.admit(async () => {
		const admittedContext = withAbortSignal(gate.signal, context);
		admittedContext.abortSignal?.throwIfAborted();
		try {
			const result = await call.tool.execute(
				call.toolCall.id,
				call.args,
				(partial, options) => {
					if (acceptingUpdates) onUpdate(partial, options);
				},
				toolContext,
				invocation,
				admittedContext,
			);
			return { result, isError: false };
		} catch (error) {
			return {
				result: createErrorToolResult(error instanceof Error ? error.message : String(error)),
				isError: true,
			};
		} finally {
			acceptingUpdates = false;
		}
	});
}

/**
 * Apply an after-tool patch field by field.
 *
 * 按字段叠 after_tool 补丁。没给的字段保持执行结果。
 */
export function finalizeToolCall<TContext extends object | undefined>(
	call: ClearedToolCall<TContext>,
	executed: ExecutedToolCall,
	patch: AfterToolPatch | undefined,
): FinalizedToolCall {
	const result: AgentToolResult<unknown> = patch
		? {
				...executed.result,
				content: patch.content === undefined ? executed.result.content : patch.content,
				details: patch.details === undefined ? executed.result.details : patch.details,
				usage: patch.usage === undefined ? executed.result.usage : patch.usage,
				terminate: patch.terminate === undefined ? executed.result.terminate : patch.terminate,
			}
		: executed.result;
	return {
		toolCall: call.toolCall,
		result,
		isError: patch?.isError ?? executed.isError,
		terminate: result.terminate === true,
	};
}

/**
 * Reconstruct the canonical tool result represented by a staged transcript message.
 *
 * 从已入账的 toolResult 消息还原规范结果。`terminate` 由调用方另行传入。
 */
export function toolResultFromMessage(
	message: ToolResultMessage<unknown>,
	terminate: boolean,
): AgentToolResult<unknown> {
	return {
		content: message.content,
		details: message.details,
		...(message.usage === undefined ? {} : { usage: message.usage }),
		...(message.addedToolNames === undefined ? {} : { addedToolNames: message.addedToolNames }),
		...(terminate ? { terminate: true } : {}),
	};
}

/**
 * Convert finalized tool output to the provider-facing transcript message.
 *
 * 把最终工具输出收成 provider 侧 toolResult 消息。时间戳取此刻。
 */
export function createToolResultMessage(call: FinalizedToolCall): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: call.toolCall.id,
		toolName: call.toolCall.name,
		content: call.result.content ?? [],
		...(call.result.details === undefined ? {} : { details: call.result.details }),
		...(call.result.usage === undefined ? {} : { usage: call.result.usage }),
		...(call.result.addedToolNames?.length ? { addedToolNames: call.result.addedToolNames } : {}),
		isError: call.isError,
		timestamp: Date.now(),
	};
}
