/**
 * Workaround for https://github.com/oven-sh/bun/issues/27802
 *
 * Bun compiled binaries have an empty `process.env` when running inside
 * sandbox environments (e.g. nono on Linux/macOS). On Linux we can recover
 * the environment from `/proc/self/environ`.
 *
 * Keep this in sync with getBunSandboxEnvValue() in
 * packages/ai/src/utils/provider-env.ts. The ai package duplicates the lookup
 * for direct consumers that do not go through this coding-agent entrypoint.
 *
 * Bun 编译二进制在沙箱里 process.env 为空时的补救。Linux 从 /proc/self/environ 恢复；与 ai 包 getBunSandboxEnvValue 保持同步。
 */

import { readFileSync } from "node:fs";

/**
 * Restore environment variables from `/proc/self/environ` when running
 * inside a sandbox where Bun's `process.env` is empty.
 *
 * 在 Bun 的 process.env 被沙箱掏空时，从 `/proc/self/environ` 恢复环境变量。非 Bun 或 env 已有键则直接返回；读不到 /proc 忽略，不抛。
 */
export function restoreSandboxEnv(): void {
	if (!process.versions?.bun) return;

	// If process.env already has entries, nothing to fix.
	if (Object.keys(process.env).length > 0) return;

	try {
		const data = readFileSync("/proc/self/environ", "utf-8");
		for (const entry of data.split("\0")) {
			const idx = entry.indexOf("=");
			if (idx > 0) {
				process.env[entry.slice(0, idx)] = entry.slice(idx + 1);
			}
		}
	} catch {
		// /proc/self/environ may not be readable; ignore.
	}
}
