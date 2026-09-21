/**
 * fs.watch wrappers that swallow close errors and retry via the caller.
 *
 * close 失败忽略。watch 抛错则调 onError 并返回 null，由调用方按 FS_WATCH_RETRY_DELAY_MS 重试。
 */

import { type FSWatcher, type WatchListener, watch } from "node:fs";

/**
 * Delay before the caller should recreate a failed watcher.
 *
 * 5 秒。本模块不自己重试。
 */
export const FS_WATCH_RETRY_DELAY_MS = 5000;

/**
 * Close a watcher if present, ignoring close errors.
 *
 * null/undefined 直接返回。close 抛错吞掉。
 */
export function closeWatcher(watcher: FSWatcher | null | undefined): void {
	if (!watcher) {
		return;
	}

	try {
		watcher.close();
	} catch {
		// Ignore watcher close errors
	}
}

/**
 * Start `fs.watch` and route watcher errors to `onError`.
 *
 * 构造失败也调 onError，返回 null。成功则挂 error 监听。
 */
export function watchWithErrorHandler(
	path: string,
	listener: WatchListener<string>,
	onError: () => void,
): FSWatcher | null {
	try {
		const watcher = watch(path, listener);
		watcher.on("error", onError);
		return watcher;
	} catch {
		onError();
		return null;
	}
}
