/**
 * Launch `$EDITOR` (or equivalent) against a temp prompt file.
 *
 * 用外部编辑器改一段提示。Windows 必须异步 spawn，避免和父进程抢控制台输入。
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripBom } from "../../utils/text.ts";

/**
 * Command line and starting buffer for {@link editInExternalEditor}.
 *
 * 外部编辑器命令和初始内容。`command` 按空格拆成可执行文件和参数。
 */
export interface ExternalEditorOptions {
	command: string;
	content: string;
}

/**
 * Outcome of one external-editor session.
 *
 * 一次外部编辑结果。非 0 退出或 spawn 失败都是 `failed`，不带部分内容。
 */
export type ExternalEditorResult = { status: "complete"; content: string } | { status: "failed" };

/**
 * Write content to a temp file, wait for the editor, then read it back.
 *
 * 写临时 `prompt.md` 并等编辑器退出。成功后去 BOM、去掉末尾单个换行；目录清理失败忽略。
 */
export async function editInExternalEditor(options: ExternalEditorOptions): Promise<ExternalEditorResult> {
	const directory = mkdtempSync(join(tmpdir(), "pi-editor-"));
	const filePath = join(directory, "prompt.md");
	try {
		writeFileSync(filePath, options.content, "utf-8");
		const [editor, ...editorArgs] = options.command.split(" ");
		process.stdout.write(`Launching external editor: ${options.command}\nPi will resume when the editor exits.\n`);

		// Do not use spawnSync here. On Windows, synchronous child_process calls can keep
		// Node/libuv's console input read active after the parent pauses stdin, racing
		// vim/nvim for the console input buffer until Ctrl+C cancels the pending read.
		const exitCode = await new Promise<number | null>((resolve) => {
			const child = spawn(editor, [...editorArgs, filePath], {
				stdio: "inherit",
				shell: process.platform === "win32",
			});
			child.on("error", () => resolve(null));
			child.on("close", (code) => resolve(code));
		});

		if (exitCode !== 0) {
			return { status: "failed" };
		}

		return { status: "complete", content: stripBom(readFileSync(filePath, "utf-8")).replace(/\n$/, "") };
	} finally {
		try {
			rmSync(directory, { recursive: true, force: true });
		} catch {
			// Cleanup is best effort.
		}
	}
}
