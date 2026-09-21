/**
 * Options for a Unix-domain listener and the one-listener Server preset.
 *
 * Unix 监听选项。path 必填；maxPendingBytes 至少 maxFrameLength+4。
 */

import type { ServerOptions } from "../../types.ts";

/**
 * Filesystem path and backpressure bounds for one Unix-domain listener.
 *
 * Unix 监听选项。path 非空；mode 默认 0o600。
 */
export interface UnixListenerOptions {
	path: string;
	/** Socket filesystem permissions. Defaults to owner read/write only (0o600). */
	mode?: number;
	/** Maximum framed bytes queued per connection before a slow peer is disconnected. */
	maxPendingBytes?: number;
	gracefulCloseTimeoutMs?: number;
	/** Used to derive and validate maxPendingBytes. Must match the server when customized. */
	maxFrameLength?: number;
	onError?: (error: Error) => void;
}

/**
 * ServerOptions plus one Unix listener, without a listeners array.
 *
 * Unix 预设选项。listeners 由 preset 自己造，调用方只给 path。
 */
export interface UnixServerOptions extends Omit<ServerOptions, "listeners">, UnixListenerOptions {}
