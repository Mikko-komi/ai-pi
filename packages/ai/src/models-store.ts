/**
 * Persistent model-catalog storage keyed by provider ID.
 *
 * 按 Provider ID 存模型目录。刷新读写都走这里。
 */

import type { Api, Model } from "./types.ts";

/**
 * One persisted provider catalog plus freshness validators.
 *
 * 一份已持久化的 Provider 目录。etag 原样回传 If-None-Match。
 */
export interface ModelsStoreEntry {
	models: readonly Model<Api>[];
	/** Unix timestamp from the remote catalog's Last-Modified header. */
	lastModified?: number;
	/** Unix timestamp of the last completed remote check. */
	checkedAt?: number;
	/**
	 * Opaque validator from the remote catalog's ETag header, stored verbatim
	 * (quotes included) and echoed back as If-None-Match.
	 */
	etag?: string;
}

/**
 * Optional cancellation for catalog store operations.
 *
 * 目录存储操作的取消信号。
 */
export interface ModelsStoreOperationOptions {
	signal?: AbortSignal;
}

/**
 * Persistent model catalogs keyed by provider ID.
 *
 * 按 Provider ID 持久化的模型目录。读写删都按这个键。
 */
export interface ModelsStore {
	read(providerId: string, options?: ModelsStoreOperationOptions): Promise<ModelsStoreEntry | undefined>;
	write(providerId: string, entry: ModelsStoreEntry, options?: ModelsStoreOperationOptions): Promise<void>;
	delete(providerId: string, options?: ModelsStoreOperationOptions): Promise<void>;
}

/**
 * Process-local catalog store. Entries are cloned on read and write.
 *
 * 进程内目录存储。读写都 structuredClone，避免调用方改到内部。
 */
export class InMemoryModelsStore implements ModelsStore {
	private readonly entries = new Map<string, ModelsStoreEntry>();

	async read(providerId: string, options?: ModelsStoreOperationOptions): Promise<ModelsStoreEntry | undefined> {
		options?.signal?.throwIfAborted();
		const entry = this.entries.get(providerId);
		return entry ? structuredClone(entry) : undefined;
	}

	async write(providerId: string, entry: ModelsStoreEntry, options?: ModelsStoreOperationOptions): Promise<void> {
		options?.signal?.throwIfAborted();
		this.entries.set(providerId, structuredClone(entry));
	}

	async delete(providerId: string, options?: ModelsStoreOperationOptions): Promise<void> {
		options?.signal?.throwIfAborted();
		this.entries.delete(providerId);
	}
}
