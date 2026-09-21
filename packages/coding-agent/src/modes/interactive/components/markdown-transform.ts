/**
 * Fold registered Markdown transformers into one width-aware function.
 *
 * 把扩展 transformer 收成一次调用。某个抛错就跳过，继续用当前文本。
 */

import type { MarkdownTransformContext, MarkdownTransformer } from "../../../core/extensions/types.ts";

/**
 * Apply transformers for one message type and streaming flag.
 *
 * 按 messageType/isStreaming/宽度依次跑 transformer。返回值非字符串则忽略。
 */
export function createMarkdownTransform(
	messageType: MarkdownTransformContext["messageType"],
	isStreaming: boolean,
	transformers: readonly MarkdownTransformer[],
): (markdown: string, availableWidth: number) => string {
	return (markdown, availableWidth) =>
		applyMarkdownTransformers(markdown, { messageType, isStreaming, availableWidth }, transformers);
}

function applyMarkdownTransformers(
	markdown: string,
	context: MarkdownTransformContext,
	transformers: readonly MarkdownTransformer[],
): string {
	let transformedMarkdown = markdown;
	for (const transformer of transformers) {
		try {
			const transformed = transformer(transformedMarkdown, context);
			if (typeof transformed === "string") {
				transformedMarkdown = transformed;
			}
		} catch {
			// Keep the current Markdown and continue with the next transformer.
		}
	}
	return transformedMarkdown;
}
