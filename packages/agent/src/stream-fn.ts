/**
 * Process-wide fallback StreamFn for Agent and low-level loops.
 *
 * 进程级默认拉流函数。未显式传 `streamFn` 时走这里；没配置就抛错，不会偷偷调某个 provider。
 */

import type { StreamFn } from "./types.ts";

let defaultStreamFn: StreamFn | undefined;

/**
 * Configure the fallback used by Agent and low-level loops when callers omit streamFn.
 *
 * Hosts that provide a default model runtime can install its stream function here
 * without making pi-agent-core depend on a provider catalog or compatibility layer.
 *
 * 安装或清空默认 `streamFn`。传 `undefined` 等于卸掉，下次 `getDefaultStreamFn` 会失败。
 */
export function setDefaultStreamFn(streamFn: StreamFn | undefined): void {
	defaultStreamFn = streamFn;
}

/**
 * Return the installed fallback StreamFn, or throw if none is configured.
 *
 * 取出默认拉流函数。没有先 `setDefaultStreamFn` 就抛错。
 */
export function getDefaultStreamFn(): StreamFn {
	if (!defaultStreamFn) {
		throw new Error("No default stream function configured. Pass streamFn explicitly or call setDefaultStreamFn().");
	}
	return defaultStreamFn;
}
