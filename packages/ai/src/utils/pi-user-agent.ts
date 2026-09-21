/**
 * Browser-safe pi User-Agent string.
 *
 * 有 node:os 则带平台；浏览器写 `pi (browser)`。不能顶层 import node:os。
 */

import type * as NodeOs from "node:os";

type ProcessWithOsBuiltinModule = typeof process & {
	getBuiltinModule?: (id: "node:os") => typeof NodeOs;
};

function loadNodeOs(): typeof NodeOs | null {
	if (typeof process === "undefined" || !(process.versions?.node || process.versions?.bun)) {
		return null;
	}
	return (process as ProcessWithOsBuiltinModule).getBuiltinModule?.("node:os") ?? null;
}

// Keep runtime OS loading browser-safe. A top-level runtime import of node:os breaks browser/Vite builds.
const nodeOs = loadNodeOs();

/**
 * Build the pi User-Agent for the current runtime.
 *
 * Node/Bun 用 os.platform/release/arch。其它环境固定 browser。
 */
export function getPiUserAgent(): string {
	return nodeOs ? `pi (${nodeOs.platform()} ${nodeOs.release()}; ${nodeOs.arch()})` : "pi (browser)";
}
