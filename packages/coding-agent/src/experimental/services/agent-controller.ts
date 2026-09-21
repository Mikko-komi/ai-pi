/**
 * Chord service contract for prompting and steering the worker-owned main AgentLane.
 *
 * 展示侧对主 lane 的命令合同。实现在 worker；这里只定义可跨进程的请求/回包。
 */

import { type Context, defineService } from "@earendil-works/chord";

/**
 * Encoded image attached to a controller prompt.
 *
 * 提示里的图片。data 是编码字节，不是路径。
 */
export interface AgentPromptImage {
	type: "image";
	data: string;
	mimeType: string;
}

/**
 * Text plus optional images for one controller prompt or queue entry.
 *
 * 一次 prompt/steer/followUp/nextRun 的输入。images=null 表示没有图。
 */
export interface AgentPromptRequest {
	message: string;
	images: AgentPromptImage[] | null;
}

/**
 * Presentation-safe failure from a controller operation.
 *
 * 展示侧错误。code 是稳定字符串，不是 lane 的内部 _tag。
 */
export interface AgentOperationError {
	code: string;
	message: string;
}

/**
 * Outcome of a start-now controller operation.
 *
 * 立即开跑类操作的回包。accepted=false 时 operationId 仍可能有。
 */
export type AgentOperationResponse =
	| { accepted: true; operationId: string; error: AgentOperationError | null }
	| { accepted: false; operationId: string | null; error: AgentOperationError };

/**
 * Outcome of queueing steer, follow-up, or next-run.
 *
 * 入队类操作的回包。accepted=true 必有 entryId；失败 entryId 为 null。
 */
export type AgentQueueResponse =
	| { accepted: true; entryId: string; error: null }
	| { accepted: false; entryId: null; error: AgentOperationError };

/**
 * Manual compaction request.
 *
 * 手动压缩输入。customInstructions=null 表示用默认说明。
 */
export interface AgentCompactionRequest {
	customInstructions: string | null;
}

/**
 * Session tree navigation request.
 *
 * 会话树导航输入。targetId=null 走默认目标；label/说明为 null 则不下发。
 */
export interface AgentNavigationRequest {
	targetId: string | null;
	summarize: boolean;
	label: string | null;
	customInstructions: string | null;
}

/**
 * Presentation-safe command facade over the worker-owned main AgentLane.
 *
 * 展示侧对主 lane 的命令门面。不持有 lane；失败用 AgentOperationError，不抛内部 tag。
 */
export interface AgentController {
	prompt(request: AgentPromptRequest, context: Context): Promise<AgentOperationResponse>;
	requestAbort(operationId: string, context: Context): Promise<void>;
	steer(request: AgentPromptRequest, context: Context): Promise<AgentQueueResponse>;
	followUp(request: AgentPromptRequest, context: Context): Promise<AgentQueueResponse>;
	nextRun(request: AgentPromptRequest, context: Context): Promise<AgentQueueResponse>;
	cancelQueued(
		entryId: string,
		context: Context,
	): Promise<{ outcome: "cancelled" | "already_consumed" | "not_found" }>;
	resume(context: Context): Promise<AgentOperationResponse>;
	compact(request: AgentCompactionRequest, context: Context): Promise<AgentOperationResponse>;
	navigate(request: AgentNavigationRequest, context: Context): Promise<AgentOperationResponse>;
}

/**
 * Chord service token for AgentController.
 *
 * 服务令牌。id 固定 `pi.agent-controller`。
 */
export const AgentController = defineService<AgentController>("pi.agent-controller");
