/**
 * Shared TUI helpers for tool call/result renderers.
 *
 * 工具渲染共用辅助。路径可点、图片按终端能力回退。
 */

import * as os from "node:os";
import { pathToFileURL } from "node:url";
import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import { getCapabilities, getImageDimensions, hyperlink, imageFallback } from "@earendil-works/pi-tui";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import { stripAnsi } from "../../utils/ansi.ts";
import { resolvePath } from "../../utils/paths.ts";
import { sanitizeBinaryOutput } from "../../utils/shell.ts";

/**
 * Replace the home-directory prefix with `~`.
 *
 * 家目录换成 `~`。非字符串返回空串。
 */
export function shortenPath(path: unknown): string {
	if (typeof path !== "string") return "";
	const home = os.homedir();
	if (path.startsWith(home)) {
		return `~${path.slice(home.length)}`;
	}
	return path;
}

/**
 * Wrap styled path text in a file hyperlink when the terminal supports it.
 *
 * 终端支持时给路径加 file URL 超链接。不支持则原样返回。
 */
export function linkPath(styledText: string, rawPath: string, cwd: string): string {
	if (!getCapabilities().hyperlinks) return styledText;
	const absolutePath = resolvePath(rawPath, cwd);
	return hyperlink(styledText, pathToFileURL(absolutePath).href);
}

/**
 * Coerce a tool argument to a string, or null if it is the wrong type.
 *
 * 参数收成字符串。null/undefined 变空串；其他非字符串返回 null。
 */
export function str(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (value == null) return "";
	return null;
}

/**
 * Expand tabs to three spaces for TUI display.
 *
 * 制表符换成三个空格。只服务显示。
 */
export function replaceTabs(text: string): string {
	return text.replace(/\t/g, "   ");
}

/**
 * Strip carriage returns from display text.
 *
 * 去掉 `\r`。留给渲染，不改文件内容。
 */
export function normalizeDisplayText(text: string): string {
	return text.replace(/\r/g, "");
}

/**
 * Flatten tool result content into display text, with image fallbacks.
 *
 * 结果收成纯文本。终端不能显示图时改用占位说明。
 */
export function getTextOutput(
	result: { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> } | undefined,
	showImages: boolean,
): string {
	if (!result) return "";

	const textBlocks = result.content.filter((c) => c.type === "text");
	const imageBlocks = result.content.filter((c) => c.type === "image");

	let output = textBlocks.map((c) => sanitizeBinaryOutput(stripAnsi(c.text || "")).replace(/\r/g, "")).join("\n");

	const caps = getCapabilities();
	if (imageBlocks.length > 0 && (!caps.images || !showImages)) {
		const imageIndicators = imageBlocks
			.map((img) => {
				const mimeType = img.mimeType ?? "image/unknown";
				const dims =
					img.data && img.mimeType ? (getImageDimensions(img.data, img.mimeType) ?? undefined) : undefined;
				return imageFallback(mimeType, dims);
			})
			.join("\n");
		output = output ? `${output}\n${imageIndicators}` : imageIndicators;
	}

	return output;
}

/**
 * Minimal tool-result shape used by renderers.
 *
 * 渲染器用的结果形状。只要 content 和 details。
 */
export type ToolRenderResultLike<TDetails> = {
	content: (TextContent | ImageContent)[];
	details: TDetails;
};

/**
 * Themed placeholder for a missing or invalid tool argument.
 *
 * 无效参数占位。颜色走 theme.error。
 */
export function invalidArgText(theme: Theme): string {
	return theme.fg("error", "[invalid arg]");
}

/**
 * Theme and optionally hyperlink a tool path argument.
 *
 * 渲染工具路径。null 当无效参数；空串可用 emptyFallback。
 */
export function renderToolPath(
	rawPath: string | null,
	theme: Theme,
	cwd: string,
	options?: { emptyFallback?: string },
): string {
	if (rawPath === null) return invalidArgText(theme);
	const value = rawPath || options?.emptyFallback;
	if (!value) return theme.fg("toolOutput", "...");
	return linkPath(theme.fg("accent", shortenPath(value)), value, cwd);
}
