/**
 * Assemble the first prompt from stdin, `@file` text, and the first CLI message.
 *
 * 拼第一条 prompt。会 `shift` 掉 `parsed.messages[0]`，后续消息留给模式循环。
 */

import type { ImageContent } from "@earendil-works/pi-ai";
import type { Args } from "./args.ts";

/**
 * Inputs for {@link buildInitialMessage}.
 *
 * 拼初始消息的原料。`parsed.messages` 会被就地改掉。
 */
export interface InitialMessageInput {
	parsed: Args;
	fileText?: string;
	fileImages?: ImageContent[];
	stdinContent?: string;
}

/**
 * First prompt and optional images for print / interactive startup.
 *
 * 第一条消息和可选图片。三部分都空则 `initialMessage` 为 undefined。
 */
export interface InitialMessageResult {
	initialMessage?: string;
	initialImages?: ImageContent[];
}

/**
 * Combine stdin content, @file text, and the first CLI message into a single
 * initial prompt for non-interactive mode.
 *
 * 按 stdin、`@file`、首条 CLI 消息顺序拼接。首条消息从 `parsed.messages` 拿走。
 */
export function buildInitialMessage({
	parsed,
	fileText,
	fileImages,
	stdinContent,
}: InitialMessageInput): InitialMessageResult {
	const parts: string[] = [];
	if (stdinContent !== undefined) {
		parts.push(stdinContent);
	}
	if (fileText) {
		parts.push(fileText);
	}

	if (parsed.messages.length > 0) {
		parts.push(parsed.messages[0]);
		parsed.messages.shift();
	}

	return {
		initialMessage: parts.length > 0 ? parts.join("") : undefined,
		initialImages: fileImages && fileImages.length > 0 ? fileImages : undefined,
	};
}
