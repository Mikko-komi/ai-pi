/**
 * Spawn a clipboard helper and collect its stdout.
 *
 * 失败或超时返回 undefined；空 buffer 算成功。写入端不给输出管道以免常驻。
 */

import { spawn } from "node:child_process";

/**
 * Undefined means the command failed; an empty buffer is a successful result.
 *
 * 超时 SIGKILL。超 maxBuffer 也当失败。stdin 写失败忽略。
 */
export function runClipboardCommand(
	command: string,
	args: readonly string[],
	options?: { input?: string; timeoutMs?: number; maxBufferBytes?: number },
): Promise<Buffer | undefined> {
	return new Promise((resolve) => {
		// Clipboard writers can daemonize. Do not give them output pipes to retain.
		const child = spawn(command, args, {
			stdio: ["pipe", options?.input === undefined ? "pipe" : "ignore", "ignore"],
			windowsHide: true,
		});
		const chunks: Buffer[] = [];
		let length = 0;
		let settled = false;
		const finish = (result: Buffer | undefined): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(result);
		};
		const abort = (): void => {
			child.kill("SIGKILL");
			child.stdout?.destroy();
			child.stdin?.destroy();
			finish(undefined);
		};
		const timer = setTimeout(abort, options?.timeoutMs ?? 3000);
		child.on("error", () => finish(undefined));
		child.on("close", (code) => {
			if (!settled) finish(code === 0 ? Buffer.concat(chunks, length) : undefined);
		});
		child.stdout?.on("data", (chunk: Buffer) => {
			if (settled) return;
			length += chunk.length;
			if (length > (options?.maxBufferBytes ?? 50 * 1024 * 1024)) abort();
			else chunks.push(chunk);
		});
		child.stdin?.on("error", () => {}); // A writer may exit before consuming all input.
		child.stdin?.end(options?.input);
	});
}
