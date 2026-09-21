/**
 * Shared utility for truncating text to visual lines (accounting for line wrapping).
 * Used by both tool-execution.ts and bash-execution.ts for consistent behavior.
 *
 * 按终端宽度折行后再从尾部截视觉行。tool 和 bash 输出共用，避免两边各切一遍。
 */

import { Text } from "@earendil-works/pi-tui";

/**
 * Visual lines kept after truncation, plus how many were hidden.
 *
 * 截完后留下的视觉行。`skippedCount` 是丢掉的行数，不是字符数。
 */
export interface VisualTruncateResult {
	/** The visual lines to display */
	visualLines: string[];
	/** Number of visual lines that were skipped (hidden) */
	skippedCount: number;
}

/**
 * Truncate text to a maximum number of visual lines (from the end).
 * This accounts for line wrapping based on terminal width.
 *
 * @param text - The text content (may contain newlines)
 * @param maxVisualLines - Maximum number of visual lines to show
 * @param width - Terminal/render width
 * @param paddingX - Horizontal padding for Text component (default 0).
 *                   Use 0 when result will be placed in a Box (Box adds its own padding).
 *                   Use 1 when result will be placed in a plain Container.
 * @returns The truncated visual lines and count of skipped lines
 *
 * 用临时 Text 按 width 折行，再取最后 `maxVisualLines` 行。空文本返回空数组。
 */
export function truncateToVisualLines(
	text: string,
	maxVisualLines: number,
	width: number,
	paddingX: number = 0,
): VisualTruncateResult {
	if (!text) {
		return { visualLines: [], skippedCount: 0 };
	}

	// Create a temporary Text component to render and get visual lines
	const tempText = new Text(text, paddingX, 0);
	const allVisualLines = tempText.render(width);

	if (allVisualLines.length <= maxVisualLines) {
		return { visualLines: allVisualLines, skippedCount: 0 };
	}

	// Take the last N visual lines
	const truncatedLines = allVisualLines.slice(-maxVisualLines);
	const skippedCount = allVisualLines.length - maxVisualLines;

	return { visualLines: truncatedLines, skippedCount };
}
