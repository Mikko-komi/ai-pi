/**
 * Accumulate token and cost totals from session usage records.
 *
 * 从会话用量累加 token 和费用。`addUsageToTotals` 会改传入的 totals。
 */

import type { Usage } from "@earendil-works/pi-ai/compat";
import type { SessionEntry } from "./session-manager.ts";

/**
 * Running token and cost totals.
 *
 * 用量累计。`cost` 是美元总额，不是费率。
 */
export interface UsageTotals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
}

/**
 * Create a zeroed UsageTotals object.
 *
 * 造一个全零累计。随后交给 `addUsageToTotals` 就地加。
 */
export function createUsageTotals(): UsageTotals {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		cost: 0,
	};
}

/**
 * Add one Usage snapshot into totals in place.
 *
 * 就地加上一条 Usage。`cost` 用 `usage.cost.total`。
 */
export function addUsageToTotals(totals: UsageTotals, usage: Usage): void {
	totals.input += usage.input;
	totals.output += usage.output;
	totals.cacheRead += usage.cacheRead;
	totals.cacheWrite += usage.cacheWrite;
	totals.cost += usage.cost.total;
}

/**
 * One bucket in a per-model / tools cost breakdown.
 *
 * 按模型或 Tools/summaries 分桶后的一行。`tokens` 含 cache。
 */
export interface UsageCostBreakdownEntry {
	key: string;
	cost: number;
	tokens: number;
}

/**
 * Group attributable assistant usage by model and all other usage into a separate bucket.
 *
 * 助手用量按模型分桶，其余用量进 Tools/summaries。零用量桶丢掉。
 */
export function getUsageCostBreakdown(entries: SessionEntry[]): UsageCostBreakdownEntry[] {
	const totalsByKey = new Map<string, UsageTotals>();

	for (const entry of entries) {
		let key: string | undefined;
		let usage: Usage | undefined;
		if (entry.type === "message" && entry.message.role === "assistant") {
			key = `${entry.message.provider}/${entry.message.responseModel ?? entry.message.model}`;
			usage = entry.message.usage;
		} else if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.usage) {
			key = "Tools/summaries";
			usage = entry.message.usage;
		} else if ((entry.type === "branch_summary" || entry.type === "compaction") && entry.usage) {
			key = "Tools/summaries";
			usage = entry.usage;
		}
		if (!key || !usage) continue;

		let totals = totalsByKey.get(key);
		if (!totals) {
			totals = createUsageTotals();
			totalsByKey.set(key, totals);
		}
		addUsageToTotals(totals, usage);
	}

	return Array.from(totalsByKey, ([key, totals]) => ({
		key,
		cost: totals.cost,
		tokens: totals.input + totals.output + totals.cacheRead + totals.cacheWrite,
	}))
		.filter((entry) => entry.cost > 0 || entry.tokens > 0)
		.sort((a, b) => b.cost - a.cost);
}
