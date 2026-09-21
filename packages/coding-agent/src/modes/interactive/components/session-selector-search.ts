/**
 * Parse, match, and sort session search queries.
 *
 * 会话搜索。`re:` 走正则；引号是短语；未闭合引号退回空白分词。
 */

import { fuzzyMatch } from "@earendil-works/pi-tui";
import type { SessionInfo } from "../../../core/session-manager.ts";

/**
 * How filtered sessions are ordered after a search.
 *
 * 搜索后的排序。`recent` 只过滤不重排；`relevance` 按匹配分。
 */
export type SortMode = "threaded" | "recent" | "relevance";

/**
 * Restrict the list to named sessions, or show all.
 *
 * 名字过滤。`named` 只要有非空 `session.name`。
 */
export type NameFilter = "all" | "named";

/**
 * Tokenized or regex query after {@link parseSearchQuery}.
 *
 * 解析后的查询。`error` 有值时整次搜索当无匹配。
 */
export interface ParsedSearchQuery {
	mode: "tokens" | "regex";
	tokens: { kind: "fuzzy" | "phrase"; value: string }[];
	regex: RegExp | null;
	/** If set, parsing failed and we should treat query as non-matching. */
	error?: string;
}

/**
 * Whether a session matched, plus a lower-is-better score.
 *
 * 单条会话的匹配结果。`score` 只在 `matches` 时有意义。
 */
export interface MatchResult {
	matches: boolean;
	/** Lower is better; only meaningful when matches === true */
	score: number;
}

function normalizeWhitespaceLower(text: string): string {
	return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function getSessionSearchText(session: SessionInfo): string {
	return `${session.id} ${session.name ?? ""} ${session.allMessagesText} ${session.cwd}`;
}

/**
 * True when the session has a non-empty display name.
 *
 * 有没有去掉空白后的 `name`。给 named 过滤复用。
 */
export function hasSessionName(session: SessionInfo): boolean {
	return Boolean(session.name?.trim());
}

function matchesNameFilter(session: SessionInfo, filter: NameFilter): boolean {
	if (filter === "all") return true;
	return hasSessionName(session);
}

/**
 * Parse a search box into tokens or a `re:` regular expression.
 *
 * 解析搜索框。空串是空 token 列表；非法正则带 `error`。
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
	const trimmed = query.trim();
	if (!trimmed) {
		return { mode: "tokens", tokens: [], regex: null };
	}

	// Regex mode: re:<pattern>
	if (trimmed.startsWith("re:")) {
		const pattern = trimmed.slice(3).trim();
		if (!pattern) {
			return { mode: "regex", tokens: [], regex: null, error: "Empty regex" };
		}
		try {
			return { mode: "regex", tokens: [], regex: new RegExp(pattern, "i") };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return { mode: "regex", tokens: [], regex: null, error: msg };
		}
	}

	// Token mode with quote support.
	// Example: foo "node cve" bar
	const tokens: { kind: "fuzzy" | "phrase"; value: string }[] = [];
	let buf = "";
	let inQuote = false;
	let hadUnclosedQuote = false;

	const flush = (kind: "fuzzy" | "phrase"): void => {
		const v = buf.trim();
		buf = "";
		if (!v) return;
		tokens.push({ kind, value: v });
	};

	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i]!;
		if (ch === '"') {
			if (inQuote) {
				flush("phrase");
				inQuote = false;
			} else {
				flush("fuzzy");
				inQuote = true;
			}
			continue;
		}

		if (!inQuote && /\s/.test(ch)) {
			flush("fuzzy");
			continue;
		}

		buf += ch;
	}

	if (inQuote) {
		hadUnclosedQuote = true;
	}

	// If quotes were unbalanced, fall back to plain whitespace tokenization.
	if (hadUnclosedQuote) {
		return {
			mode: "tokens",
			tokens: trimmed
				.split(/\s+/)
				.map((t) => t.trim())
				.filter((t) => t.length > 0)
				.map((t) => ({ kind: "fuzzy" as const, value: t })),
			regex: null,
		};
	}

	flush(inQuote ? "phrase" : "fuzzy");

	return { mode: "tokens", tokens, regex: null };
}

/**
 * Test one session against a parsed query.
 *
 * 对一条会话做匹配。短语看规范化空白，fuzzy 走 tui 的 fuzzyMatch。
 */
export function matchSession(session: SessionInfo, parsed: ParsedSearchQuery): MatchResult {
	const text = getSessionSearchText(session);

	if (parsed.mode === "regex") {
		if (!parsed.regex) {
			return { matches: false, score: 0 };
		}
		const idx = text.search(parsed.regex);
		if (idx < 0) return { matches: false, score: 0 };
		return { matches: true, score: idx * 0.1 };
	}

	if (parsed.tokens.length === 0) {
		return { matches: true, score: 0 };
	}

	let totalScore = 0;
	let normalizedText: string | null = null;

	for (const token of parsed.tokens) {
		if (token.kind === "phrase") {
			if (normalizedText === null) {
				normalizedText = normalizeWhitespaceLower(text);
			}
			const phrase = normalizeWhitespaceLower(token.value);
			if (!phrase) continue;
			const idx = normalizedText.indexOf(phrase);
			if (idx < 0) return { matches: false, score: 0 };
			totalScore += idx * 0.1;
			continue;
		}

		const m = fuzzyMatch(token.value, text);
		if (!m.matches) return { matches: false, score: 0 };
		totalScore += m.score;
	}

	return { matches: true, score: totalScore };
}

/**
 * Filter sessions by name and query, then sort by {@link SortMode}.
 *
 * 先按名字再按查询过滤。解析失败返回空数组，不是原列表。
 */
export function filterAndSortSessions(
	sessions: SessionInfo[],
	query: string,
	sortMode: SortMode,
	nameFilter: NameFilter = "all",
): SessionInfo[] {
	const nameFiltered =
		nameFilter === "all" ? sessions : sessions.filter((session) => matchesNameFilter(session, nameFilter));
	const trimmed = query.trim();
	if (!trimmed) return nameFiltered;

	const parsed = parseSearchQuery(query);
	if (parsed.error) return [];

	// Recent mode: filter only, keep incoming order.
	if (sortMode === "recent") {
		const filtered: SessionInfo[] = [];
		for (const s of nameFiltered) {
			const res = matchSession(s, parsed);
			if (res.matches) filtered.push(s);
		}
		return filtered;
	}

	// Relevance mode: sort by score, tie-break by modified desc.
	const scored: { session: SessionInfo; score: number }[] = [];
	for (const s of nameFiltered) {
		const res = matchSession(s, parsed);
		if (!res.matches) continue;
		scored.push({ session: s, score: res.score });
	}

	scored.sort((a, b) => {
		if (a.score !== b.score) return a.score - b.score;
		return b.session.modified.getTime() - a.session.modified.getTime();
	});

	return scored.map((r) => r.session);
}
