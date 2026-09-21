/**
 * Join text blocks from mixed message content.
 *
 * 从混合 content 抽出 text 块拼接。非 text 丢掉。
 */

import type { ImageContent, TextContent, ThinkingContent, ToolCall } from "../types.ts";

type Content = TextContent | ImageContent | ThinkingContent | ToolCall;

/**
 * Extract and join text from message content.
 *
 * 字符串原样返回。数组只拼 type=text，默认换行分隔。
 */
export function contentText(content: string | readonly Content[], separator = "\n"): string {
	if (typeof content === "string") return content;
	return content
		.filter((block) => block.type === "text")
		.map((block) => block.text)
		.join(separator);
}
