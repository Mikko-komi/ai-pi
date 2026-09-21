/**
 * Session-scoped resource cleanup registry.
 *
 * 会话资源清理注册表。一个 session 结束时跑全部回调。
 */

/**
 * Cleanup callback invoked when a session is torn down.
 *
 * 会话拆除时的清理回调。可按 sessionId 收窄。
 */
export type SessionResourceCleanup = (sessionId?: string) => void;

const sessionResourceCleanups = new Set<SessionResourceCleanup>();

/**
 * Register a session cleanup. Returns an unregister function.
 *
 * 注册会话清理。返回值用来摘掉自己。
 */
export function registerSessionResourceCleanup(cleanup: SessionResourceCleanup): () => void {
	sessionResourceCleanups.add(cleanup);
	return () => {
		sessionResourceCleanups.delete(cleanup);
	};
}

/**
 * Run every registered cleanup. Aggregates thrown errors.
 *
 * 跑全部已注册清理。有抛错则合成 AggregateError。
 */
export function cleanupSessionResources(sessionId?: string): void {
	const errors: unknown[] = [];
	for (const cleanup of sessionResourceCleanups) {
		try {
			cleanup(sessionId);
		} catch (error) {
			errors.push(error);
		}
	}
	if (errors.length > 0) {
		throw new AggregateError(errors, "Failed to cleanup session resources");
	}
}
