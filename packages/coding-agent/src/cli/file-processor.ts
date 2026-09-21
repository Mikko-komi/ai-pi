/**
 * Process @file CLI arguments into text content and image attachments
 *
 * 把 `@file` 收成文本块和图片附件。缺文件或读失败会 `process.exit(1)`。
 */

import { access, readFile, stat } from "node:fs/promises";
import type { ImageContent } from "@earendil-works/pi-ai";
import chalk from "chalk";
import { resolve } from "path";
import { resolveReadPath } from "../core/tools/path-utils.ts";
import { processImage } from "../utils/image-process.ts";
import { detectSupportedImageMimeTypeFromFile } from "../utils/mime.ts";
import { stripBom } from "../utils/text.ts";

/**
 * Text blocks and image attachments produced from `@file` args.
 *
 * `@file` 处理后的文本和图片。空文件被跳过，不占任一侧。
 */
export interface ProcessedFiles {
	text: string;
	images: ImageContent[];
}

/**
 * Image processing knobs for {@link processFileArguments}.
 *
 * 处理 `@file` 时的图片选项。默认会把图缩到 2000x2000。
 */
export interface ProcessFileOptions {
	/** Whether to auto-resize images to 2000x2000 max. Default: true */
	autoResizeImages?: boolean;
}

/**
 * Process @file arguments into text content and image attachments
 *
 * 逐个读 `@file`。图片进 attachments，文本包进 `<file>`；处理失败的图改记文本提示。
 */
export async function processFileArguments(fileArgs: string[], options?: ProcessFileOptions): Promise<ProcessedFiles> {
	const autoResizeImages = options?.autoResizeImages ?? true;
	let text = "";
	const images: ImageContent[] = [];

	for (const fileArg of fileArgs) {
		// Expand and resolve path (handles ~ expansion and macOS screenshot Unicode spaces)
		const absolutePath = resolve(resolveReadPath(fileArg, process.cwd()));

		// Check if file exists
		try {
			await access(absolutePath);
		} catch {
			console.error(chalk.red(`Error: File not found: ${absolutePath}`));
			process.exit(1);
		}

		// Check if file is empty
		const stats = await stat(absolutePath);
		if (stats.size === 0) {
			// Skip empty files
			continue;
		}

		const mimeType = await detectSupportedImageMimeTypeFromFile(absolutePath);

		if (mimeType) {
			// Handle image file
			const content = await readFile(absolutePath);
			const processed = await processImage(content, mimeType, { autoResizeImages });

			if (!processed.ok) {
				text += `<file name="${absolutePath}">${processed.message}</file>\n`;
				continue;
			}

			const attachment: ImageContent = {
				type: "image",
				mimeType: processed.mimeType,
				data: processed.data,
			};
			images.push(attachment);

			// Add text reference to image with optional processing hints
			if (processed.hints.length > 0) {
				text += `<file name="${absolutePath}">${processed.hints.join("\n")}</file>\n`;
			} else {
				text += `<file name="${absolutePath}"></file>\n`;
			}
		} else {
			// Handle text file
			try {
				const content = stripBom(await readFile(absolutePath, "utf-8"));
				text += `<file name="${absolutePath}">\n${content}\n</file>\n`;
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(chalk.red(`Error: Could not read file ${absolutePath}: ${message}`));
				process.exit(1);
			}
		}
	}

	return { text, images };
}
