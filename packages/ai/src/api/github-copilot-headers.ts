/**
 * GitHub Copilot request headers derived from conversation shape.
 *
 * 只看最后一条消息和有没有图。不发请求。
 */

import type { Message } from "../types.ts";

/**
 * Infer X-Initiator from the last conversation message.
 *
 * 最后一条不是 user 则 agent。空历史当 user。
 */
export function inferCopilotInitiator(messages: Message[]): "user" | "agent" {
	const last = messages[messages.length - 1];
	return last && last.role !== "user" ? "agent" : "user";
}

/**
 * Whether user or toolResult content contains an image block.
 *
 * 只扫 user / toolResult 的 image 块。assistant 图不算。
 */
export function hasCopilotVisionInput(messages: Message[]): boolean {
	return messages.some((msg) => {
		if (msg.role === "user" && Array.isArray(msg.content)) {
			return msg.content.some((c) => c.type === "image");
		}
		if (msg.role === "toolResult" && Array.isArray(msg.content)) {
			return msg.content.some((c) => c.type === "image");
		}
		return false;
	});
}

/**
 * Build Copilot-only headers for the current turn.
 *
 * 总是带 X-Initiator 和 Openai-Intent。有图才加 Copilot-Vision-Request。
 */
export function buildCopilotDynamicHeaders(params: {
	messages: Message[];
	hasImages: boolean;
}): Record<string, string> {
	const headers: Record<string, string> = {
		"X-Initiator": inferCopilotInitiator(params.messages),
		"Openai-Intent": "conversation-edits",
	};

	if (params.hasImages) {
		headers["Copilot-Vision-Request"] = "true";
	}

	return headers;
}
