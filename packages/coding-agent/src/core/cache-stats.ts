/**
 * Session prompt-cache miss accounting for transcript notices.
 *
 * 会话级 prompt-cache 浪费统计。compaction / branch_summary 会重置前序请求，换模型不重置。
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { SessionEntry } from "./session-manager.ts";

/**
 * Prompt-cache TTL: idle gaps longer than this are worth mentioning as the
 * likely cause of a miss. Anthropic's default cache TTL is 5 minutes.
 *
 * 空闲超过这个时长才值得提 TTL。按 Anthropic 默认 5 分钟。
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/** Per-turn misses at or below this are cache breakpoint granularity noise. */
const NOISE_FLOOR_TOKENS = 1024;

/**
 * A counted cache miss on a single assistant message.
 *
 * 单条 assistant 消息上计入的 cache miss。低于噪声地板的不算。
 */
export interface CacheMiss {
	/** Prompt tokens that were in the previous turn's prompt but not read from cache. */
	missedTokens: number;
	/** Extra dollars paid vs. a full cache hit; 0 when pricing is unknown. */
	missedCost: number;
	/** Milliseconds since the previous request (which last refreshed the cache). */
	idleMs: number;
	/** True when the model changed relative to the previous request. */
	modelChanged: boolean;
}

/**
 * Session-wide cache-waste totals.
 *
 * 会话累计浪费。`missCount` 只计超过噪声地板的轮次。
 */
export interface CacheWasteTotals {
	missedTokens: number;
	missedCost: number;
	/** Number of counted misses (turns above the noise floor). */
	missCount: number;
}

/**
 * Minimal pricing lookup, satisfied by ModelRuntime. Cost is $/million tokens.
 *
 * 最小计价查询。cost 单位是 $/百万 token。
 */
export interface ModelPriceSource {
	getModel(provider: string, modelId: string): { cost: { cacheRead: number } } | undefined;
}

/** The last request seen by the scan; everything in its prompt should be cached. */
interface PreviousRequest {
	promptTokens: number;
	modelKey: string;
	timestamp: number;
	/**
	 * Sticky: some earlier request in this scan segment reported cache activity.
	 * Distinguishes a total miss on a cache-read-only provider (OpenAI-style,
	 * writes unreported) from a provider that never reports caching at all.
	 */
	reportedCache: boolean;
}

/**
 * Compute the cache miss for one assistant message relative to the previous
 * request. Returns undefined when nothing is counted: first turn, after a
 * reset, no cache activity ever reported (provider without cache support), or
 * miss below the noise floor.
 */
function detectMiss(
	prev: PreviousRequest | undefined,
	message: AssistantMessage,
	models: ModelPriceSource,
): CacheMiss | undefined {
	const usage = message.usage;
	const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
	// A zero-cache turn only counts when cache activity was reported before:
	// on cache-read-only providers that is a total miss, while on providers
	// that never report caching it means nothing.
	if (!prev || promptTokens <= 0 || (usage.cacheRead + usage.cacheWrite === 0 && !prev.reportedCache)) {
		return undefined;
	}

	const missedTokens = Math.min(prev.promptTokens, promptTokens) - usage.cacheRead;
	if (missedTokens <= NOISE_FLOOR_TOKENS) return undefined;

	// Extra cost = missed tokens billed at the actual paid rate (input/cacheWrite,
	// incl. write premium) instead of the cache-read rate. Missed tokens can only
	// land in the input or cacheWrite buckets, so the paid rate comes straight
	// from this message's own cost breakdown.
	const paidTokens = usage.input + usage.cacheWrite;
	const paidPerToken = paidTokens > 0 ? (usage.cost.input + usage.cost.cacheWrite) / paidTokens : 0;
	const readPerToken =
		usage.cacheRead > 0
			? usage.cost.cacheRead / usage.cacheRead
			: (models.getModel(message.provider, message.model)?.cost.cacheRead ?? 0) / 1_000_000;

	return {
		missedTokens,
		missedCost: missedTokens * Math.max(0, paidPerToken - readPerToken),
		idleMs: Math.max(0, message.timestamp - prev.timestamp),
		modelChanged: `${message.provider}/${message.model}` !== prev.modelKey,
	};
}

function asPreviousRequest(message: AssistantMessage, reportedCache: boolean): PreviousRequest | undefined {
	const usage = message.usage;
	const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
	if (promptTokens <= 0) return undefined;
	return {
		promptTokens,
		modelKey: `${message.provider}/${message.model}`,
		timestamp: message.timestamp,
		reportedCache: reportedCache || usage.cacheRead + usage.cacheWrite > 0,
	};
}

function scan(
	entries: SessionEntry[],
	models: ModelPriceSource,
): { prev: PreviousRequest | undefined; totals: CacheWasteTotals; misses: Map<AssistantMessage, CacheMiss> } {
	let prev: PreviousRequest | undefined;
	const totals: CacheWasteTotals = { missedTokens: 0, missedCost: 0, missCount: 0 };
	const misses = new Map<AssistantMessage, CacheMiss>();

	for (const entry of entries) {
		if (entry.type === "compaction" || entry.type === "branch_summary") {
			// The context legitimately changed; the next turn's prompt is new content,
			// not re-billed content. Model switches are NOT exempt: they re-bill the
			// full prompt and should be counted.
			prev = undefined;
			continue;
		}
		if (entry.type === "message" && entry.message.role === "assistant") {
			const miss = detectMiss(prev, entry.message, models);
			if (miss) {
				totals.missedTokens += miss.missedTokens;
				totals.missedCost += miss.missedCost;
				totals.missCount += 1;
				misses.set(entry.message, miss);
			}
			prev = asPreviousRequest(entry.message, prev?.reportedCache ?? false) ?? prev;
		}
	}
	return { prev, totals, misses };
}

/**
 * Cumulative cache waste across a session: prompt tokens that should have been
 * cache reads (they were in the previous turn's prompt) but were re-billed.
 *
 * 会话里本该命中 cache 却被重新计费的 prompt token 累计。
 */
export function computeCacheWaste(entries: SessionEntry[], models: ModelPriceSource): CacheWasteTotals {
	return scan(entries, models).totals;
}

/**
 * All counted cache misses across a session, keyed by the assistant message
 * (by reference) that paid for them. Used to re-derive transcript notices when
 * rebuilding the chat from entries (resume, post-compaction rebuild).
 *
 * 按 assistant 消息引用收集计入的 miss。重建 transcript 通知时按引用找回。
 */
export function collectCacheMisses(
	entries: SessionEntry[],
	models: ModelPriceSource,
): Map<AssistantMessage, CacheMiss> {
	return scan(entries, models).misses;
}

/**
 * Detect a cache miss on a just-completed assistant message.
 * `entries` must not yet contain `message` (message_end fires before persistence).
 *
 * 刚结束的 assistant 消息上的 miss。`entries` 里还不能有这条 message。
 */
export function detectCacheMiss(
	entries: SessionEntry[],
	message: AssistantMessage,
	models: ModelPriceSource,
): CacheMiss | undefined {
	return detectMiss(scan(entries, models).prev, message, models);
}
