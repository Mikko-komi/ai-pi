/**
 * Cleanup helper for facet loader results.
 *
 * loader 结果清理。
 */

import type { LoadedFacets } from "../types.ts";

/**
 * Dispose loaded facet batches and collect rejection reasons without stopping early.
 *
 * 尽量卸完一批 LoadedFacets。单个失败不打断其余；返回收集到的 reason。
 */
export async function disposeLoadedFacets(loaded: readonly LoadedFacets[]): Promise<unknown[]> {
	const results = await Promise.allSettled(loaded.map((entry) => entry.dispose()));
	return results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
}
