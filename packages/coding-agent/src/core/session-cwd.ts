/**
 * Guards that a persisted session's stored cwd still exists on disk.
 *
 * 检查会话文件里的 cwd 是否还在。没有会话文件或目录仍在则放行。
 */

import { existsSync } from "node:fs";

/**
 * Details when a session file's cwd is missing.
 *
 * 会话 cwd 丢失时的上下文。`fallbackCwd` 是当前进程目录。
 */
export interface SessionCwdIssue {
	sessionFile?: string;
	sessionCwd: string;
	fallbackCwd: string;
}

interface SessionCwdSource {
	getCwd(): string;
	getSessionFile(): string | undefined;
}

/**
 * Return a cwd issue when the session file exists but its cwd does not.
 *
 * 有会话文件且记录的 cwd 不存在才返回问题。否则 undefined。
 */
export function getMissingSessionCwdIssue(
	sessionManager: SessionCwdSource,
	fallbackCwd: string,
): SessionCwdIssue | undefined {
	const sessionFile = sessionManager.getSessionFile();
	if (!sessionFile) {
		return undefined;
	}

	const sessionCwd = sessionManager.getCwd();
	if (!sessionCwd || existsSync(sessionCwd)) {
		return undefined;
	}

	return {
		sessionFile,
		sessionCwd,
		fallbackCwd,
	};
}

/**
 * Format a fatal missing-cwd error for CLI/print modes.
 *
 * 给 CLI / print 的致命错误文案。
 */
export function formatMissingSessionCwdError(issue: SessionCwdIssue): string {
	const sessionFile = issue.sessionFile ? `\nSession file: ${issue.sessionFile}` : "";
	return `Stored session working directory does not exist: ${issue.sessionCwd}${sessionFile}\nCurrent working directory: ${issue.fallbackCwd}`;
}

/**
 * Format an interactive prompt offering to continue in the current cwd.
 *
 * 交互模式里问是否改用当前 cwd 的文案。
 */
export function formatMissingSessionCwdPrompt(issue: SessionCwdIssue): string {
	return `cwd from session file does not exist\n${issue.sessionCwd}\n\ncontinue in current cwd\n${issue.fallbackCwd}`;
}

/**
 * Error thrown when a session cwd is missing and the caller must stop.
 *
 * 会话 cwd 不存在且调用方必须停时抛出。`issue` 原样挂在错误上。
 */
export class MissingSessionCwdError extends Error {
	readonly issue: SessionCwdIssue;

	constructor(issue: SessionCwdIssue) {
		super(formatMissingSessionCwdError(issue));
		this.name = "MissingSessionCwdError";
		this.issue = issue;
	}
}

/**
 * Throw MissingSessionCwdError when the stored session cwd is gone.
 *
 * 会话 cwd 不在就 throw。给 runtime 创建和切换用。
 */
export function assertSessionCwdExists(sessionManager: SessionCwdSource, fallbackCwd: string): void {
	const issue = getMissingSessionCwdIssue(sessionManager, fallbackCwd);
	if (issue) {
		throw new MissingSessionCwdError(issue);
	}
}
