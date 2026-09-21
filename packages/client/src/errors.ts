/**
 * Client-visible protocol, disconnect, and disposal errors.
 *
 * 客户端错误。ServerError 才过线；断开和 disposal 是本地终态。
 */

import type { ProtocolError, ProtocolErrorCode } from "@earendil-works/pi-protocol";

/**
 * Failed RPC response carrying a protocol error code from the server.
 *
 * 服务端失败响应。code 来自协议，不是本地编的。
 */
export class ServerError extends Error {
	readonly code: ProtocolErrorCode;

	constructor(error: ProtocolError) {
		super(error.message);
		this.name = "ServerError";
		this.code = error.code;
	}
}

/**
 * Transport is down or the client is not connected.
 *
 * 未连接。进行中的请求就地 reject，不自动重试。
 */
export class DisconnectedError extends Error {
	constructor(message = "Client is disconnected", cause?: Error) {
		super(message, cause === undefined ? undefined : { cause });
		this.name = "DisconnectedError";
	}
}

/**
 * Client was disposed and must not be used again.
 *
 * 已 dispose。connect/request/监听一律拒。
 */
export class ClientDisposedError extends Error {
	constructor() {
		super("Client is disposed");
		this.name = "ClientDisposedError";
	}
}

/**
 * Coerce an unknown throw into an Error instance.
 *
 * 收成 Error。已经是 Error 就原样返回。
 */
export function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

/**
 * Wrap an unknown failure as DisconnectedError, preserving the cause.
 *
 * 收成断开错误。已经是 DisconnectedError 不再包一层。
 */
export function toDisconnectedError(error: unknown): DisconnectedError {
	const cause = toError(error);
	return cause instanceof DisconnectedError ? cause : new DisconnectedError(cause.message, cause);
}
