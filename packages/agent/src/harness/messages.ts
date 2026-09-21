/**
 * Harness-owned AgentMessage variants and the default convertToLlm.
 *
 * harness 侧自定义消息，以及默认的 `convertToLlm`。这些角色靠 declaration merging 并进 `AgentMessage`。
 */

import type { ImageContent, Message, TextContent } from "@earendil-works/pi-ai";
import type { AgentMessage } from "../types.ts";

/**
 * Marker wrapping a compacted history summary when it is injected as a user message.
 *
 * 压缩摘要作为 user 消息注入时的开头标记。
 */
export const COMPACTION_SUMMARY_PREFIX = `The conversation history before this point was compacted into the following summary:

<summary>
`;

/**
 * Closes {@link COMPACTION_SUMMARY_PREFIX}.
 *
 * 压缩摘要的结尾标记。
 */
export const COMPACTION_SUMMARY_SUFFIX = `
</summary>`;

/**
 * Marker wrapping a branch summary when the conversation returns from another leaf.
 *
 * 从另一分支回来时插入摘要的开头标记。
 */
export const BRANCH_SUMMARY_PREFIX = `The following is a summary of a branch that this conversation came back from:

<summary>
`;

/**
 * Closes {@link BRANCH_SUMMARY_PREFIX}.
 *
 * 分支摘要的结尾标记。
 */
export const BRANCH_SUMMARY_SUFFIX = `</summary>`;

/**
 * User-visible record of a shell command the host ran outside the model tool loop.
 *
 * 宿主自己跑的 bash 记录。`excludeFromContext` 为真则 `convertToLlm` 会丢掉它。
 */
export interface BashExecutionMessage {
	role: "bashExecution";
	command: string;
	output: string;
	exitCode: number | undefined;
	cancelled: boolean;
	truncated: boolean;
	fullOutputPath?: string;
	timestamp: number;
	excludeFromContext?: boolean;
}

/**
 * Application-defined transcript row that still converts to a user message.
 *
 * 应用自定义行。`display` 只影响 UI，不决定是否进模型。
 */
export interface CustomMessage<T = unknown> {
	role: "custom";
	customType: string;
	content: string | (TextContent | ImageContent)[];
	display: boolean;
	details?: T;
	timestamp: number;
}

/**
 * Summary of a branch the conversation left and later came back from.
 *
 * 从另一条分支回来时插入的摘要。`fromId` 指向离开的那个节点。
 */
export interface BranchSummaryMessage {
	role: "branchSummary";
	summary: string;
	fromId: string | null;
	timestamp: number;
}

/**
 * Compacted history summary injected as a synthetic user message.
 *
 * 压缩后的历史摘要。`tokensBefore` 是压缩前的估算，不是压缩后窗口。
 */
export interface CompactionSummaryMessage {
	role: "compactionSummary";
	summary: string;
	tokensBefore: number;
	timestamp: number;
}

declare module "../types.ts" {
	interface CustomAgentMessages {
		bashExecution: BashExecutionMessage;
		custom: CustomMessage;
		branchSummary: BranchSummaryMessage;
		compactionSummary: CompactionSummaryMessage;
	}
}

/**
 * Render a bash-execution message as the text a model would see.
 *
 * 把 bash 记录收成模型可读文本。取消、非零退出码和截断提示都会写进去。
 */
export function bashExecutionToText(msg: BashExecutionMessage): string {
	let text = `Ran \`${msg.command}\`\n`;
	if (msg.output) {
		text += `\`\`\`\n${msg.output}\n\`\`\``;
	} else {
		text += "(no output)";
	}
	if (msg.cancelled) {
		text += "\n\n(command cancelled)";
	} else if (msg.exitCode !== null && msg.exitCode !== undefined && msg.exitCode !== 0) {
		text += `\n\nCommand exited with code ${msg.exitCode}`;
	}
	if (msg.truncated && msg.fullOutputPath) {
		text += `\n\n[Output truncated. Full output: ${msg.fullOutputPath}]`;
	}
	return text;
}

/**
 * Build a {@link BranchSummaryMessage} from a summary and source entry id.
 *
 * 构造分支摘要消息。时间戳可以是 epoch 毫秒或可被 `Date` 解析的字符串。
 */
export function createBranchSummaryMessage(
	summary: string,
	fromId: string | null,
	timestamp: string | number,
): BranchSummaryMessage {
	return {
		role: "branchSummary",
		summary,
		fromId,
		timestamp: typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime(),
	};
}

/**
 * Build a {@link CompactionSummaryMessage}.
 *
 * 构造压缩摘要消息。
 */
export function createCompactionSummaryMessage(
	summary: string,
	tokensBefore: number,
	timestamp: string | number,
): CompactionSummaryMessage {
	return {
		role: "compactionSummary",
		summary,
		tokensBefore,
		timestamp: typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime(),
	};
}

/**
 * Build a {@link CustomMessage}.
 *
 * 构造自定义消息。
 */
export function createCustomMessage(
	customType: string,
	content: string | (TextContent | ImageContent)[],
	display: boolean,
	details: unknown | undefined,
	timestamp: string | number,
): CustomMessage {
	return {
		role: "custom",
		customType,
		content,
		display,
		details,
		timestamp: typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime(),
	};
}

/**
 * Default AgentMessage → Message conversion for harness transcripts.
 *
 * harness 默认的 `convertToLlm`。自定义角色收成 user 文本；`excludeFromContext` 的 bash 记录会被丢掉。
 */
export function convertToLlm(messages: AgentMessage[]): Message[] {
	return messages
		.map((m): Message | undefined => {
			switch (m.role) {
				case "bashExecution":
					if (m.excludeFromContext) {
						return undefined;
					}
					return {
						role: "user",
						content: [{ type: "text", text: bashExecutionToText(m) }],
						timestamp: m.timestamp,
					};
				case "custom": {
					const content = typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : m.content;
					return {
						role: "user",
						content,
						timestamp: m.timestamp,
					};
				}
				case "branchSummary":
					return {
						role: "user",
						content: [{ type: "text" as const, text: BRANCH_SUMMARY_PREFIX + m.summary + BRANCH_SUMMARY_SUFFIX }],
						timestamp: m.timestamp,
					};
				case "compactionSummary":
					return {
						role: "user",
						content: [
							{ type: "text" as const, text: COMPACTION_SUMMARY_PREFIX + m.summary + COMPACTION_SUMMARY_SUFFIX },
						],
						timestamp: m.timestamp,
					};
				case "user":
				case "assistant":
				case "toolResult":
					return m;
				default:
					return undefined;
			}
		})
		.filter((m): m is Message => m !== undefined);
}
