/**
 * Session and entry search contracts used by hosts that index transcripts.
 *
 * 会话检索接口。本包只定义合同，不内置索引实现。
 */

/**
 * Text query for session or entry search.
 *
 * 检索查询。`limit` 限制返回条数，不规定排序算法。
 */
export interface SearchQuery {
	text: string;
	limit?: number;
}

/**
 * One matching session, optionally with its best entry snippet.
 *
 * 命中的会话。`top` 只是展示用的最佳条目，不是完整命中列表。
 */
export interface SessionSearchHit {
	sessionId: string;
	score?: number;
	top?: { entryId: string; snippet?: string; timestamp: number };
}

/**
 * One matching transcript entry inside a session.
 *
 * 命中的一条会话记录。`searchEntries` 可选，宿主可以只做会话级检索。
 */
export interface EntrySearchHit {
	sessionId: string;
	entryId: string;
	timestamp: number;
	snippet?: string;
	score?: number;
}

/**
 * Host-provided search index over persisted sessions.
 *
 * 宿主实现的会话索引。`notify` / `remove` / `sync` 负责和磁盘会话对齐。
 */
export interface SessionSearchService {
	searchSessions(query: SearchQuery): Promise<SessionSearchHit[]>;
	searchEntries?(query: SearchQuery): Promise<EntrySearchHit[]>;
	sync(): Promise<void>;
	notify(sessionId: string): void;
	remove(sessionId: string): Promise<void>;
	close(): Promise<void>;
}
