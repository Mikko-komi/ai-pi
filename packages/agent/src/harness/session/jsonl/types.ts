/**
 * JSONL session file format versions, headers, and repository options.
 *
 * JSONL 会话文件的格式头和仓库选项。`JSONL_FORMAT_VERSION` 是行格式，`JSONL_STORAGE_VERSION` 是逻辑存储版本。
 */

import type { FileSystem } from "../../types.ts";
import type { SessionCreateOptions, SessionMetadata } from "../types.ts";

/**
 * On-disk line format version. Currently 4.
 *
 * 行格式版本。现在是 4。
 */
export const JSONL_FORMAT_VERSION = 4;
/**
 * Logical storage version. Not the same number as the line format.
 *
 * 逻辑存储版本。和行格式不是同一个数。
 */
export const JSONL_STORAGE_VERSION = 1;

/**
 * Format-4 file header. Must be the first line of the file.
 *
 * v4 文件头。必须是文件第一行。
 */
export interface JsonlStorageHeader {
	v: typeof JSONL_FORMAT_VERSION;
	kind: "header";
	id: string;
	storageVersion: number;
	createdAt: number;
	cwd: string;
	parentSessionId?: string;
	legacyParentSessionPath?: string;
	/** Sequence high-water mark written by snapshot rewrites. */
	nextSeq?: number;
}

/**
 * Options for opening or creating one JSONL storage file.
 *
 * 打开/创建单个 JSONL 文件的选项。
 */
export interface JsonlStorageOptions {
	fileSystem: FileSystem;
	path: string;
	now?: () => number;
}

/**
 * Catalog metadata for a JSONL session. `path` points at the `.jsonl` file.
 *
 * 列出/打开用的元数据。`path` 指向 `.jsonl` 文件。
 */
export interface JsonlSessionMetadata extends SessionMetadata {
	cwd: string;
	path: string;
	/** Filesystem modification time as milliseconds since Unix epoch. */
	modifiedAt: number;
}

/**
 * Create options. `cwd` is required.
 *
 * 创建时必须给 cwd。
 */
export interface JsonlSessionCreateOptions extends SessionCreateOptions {
	cwd: string;
}

/**
 * List filter. Omit `cwd` to list every session under the repo root.
 *
 * 按 cwd 过滤列表。缺省列出全部。
 */
export interface JsonlSessionListOptions {
	cwd?: string;
}

/**
 * Filesystem and root directory for JsonlSessionRepo.
 *
 * 仓库根目录和文件系统。
 */
export interface JsonlSessionRepoOptions {
	fileSystem: FileSystem;
	sessionsRoot: string;
	now?: () => number;
}
