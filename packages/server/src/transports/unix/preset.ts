/**
 * Compose Server with a single Unix-domain socket listener.
 *
 * Unix 预设。一个 Server 配一条 socket；path 是物理地址，serverId 仍是逻辑身份。
 */

import type { SessionMetadata } from "@earendil-works/pi-agent-core";
import { Server } from "../../server.ts";
import type { ServerHost } from "../../types.ts";
import { createUnixListener } from "./listener.ts";
import type { UnixServerOptions } from "./types.ts";

/**
 * Compose Server with one Unix-domain socket listener.
 *
 * 用一条 Unix socket 组装 Server。不 start；调用方自己 start/close。
 */
export function createUnixServer<TMetadata extends SessionMetadata>(
	host: ServerHost<TMetadata>,
	options: UnixServerOptions,
): Server<TMetadata> {
	const listener = createUnixListener({
		path: options.path,
		mode: options.mode,
		maxFrameLength: options.maxFrameLength,
		maxPendingBytes: options.maxPendingBytes,
		gracefulCloseTimeoutMs: options.gracefulCloseTimeoutMs,
		onError: options.onError,
	});
	return new Server(host, {
		listeners: [listener],
		maxFrameLength: options.maxFrameLength,
		handshakeTimeoutMs: options.handshakeTimeoutMs,
		onConnectionCountChanged: options.onConnectionCountChanged,
		serverId: options.serverId,
		onError: options.onError,
	});
}
