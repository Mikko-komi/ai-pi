/**
 * Export the current session branch as a standalone JSONL file.
 *
 * 把当前分支导出成独立 JSONL。树被压成一条链，`parentId` 按导出顺序重写。
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { resolvePath } from "../utils/paths.ts";
import { CURRENT_SESSION_VERSION, type SessionHeader, type SessionManager } from "./session-manager.ts";

/**
 * Write the current session branch and optional trailing export-only entries as JSONL.
 *
 * 写出当前分支和可选的尾部导出条目。未给路径则在 cwd 生成带时间戳的文件名。
 */
export function exportSessionToJsonl(
	sessionManager: SessionManager,
	outputPath?: string,
	createTrailingEntries?: (parentId: string | null, timestamp: string) => readonly object[],
): string {
	const filePath = resolvePath(
		outputPath ?? `session-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`,
		process.cwd(),
	);
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const timestamp = new Date().toISOString();
	const header: SessionHeader = {
		type: "session",
		version: CURRENT_SESSION_VERSION,
		id: sessionManager.getSessionId(),
		timestamp,
		cwd: sessionManager.getCwd(),
	};
	const lines = [JSON.stringify(header)];

	let parentId: string | null = null;
	for (const entry of sessionManager.getBranch()) {
		lines.push(JSON.stringify({ ...entry, parentId }));
		parentId = entry.id;
	}
	for (const entry of createTrailingEntries?.(parentId, timestamp) ?? []) {
		lines.push(JSON.stringify(entry));
	}

	writeFileSync(filePath, `${lines.join("\n")}\n`);
	return filePath;
}
