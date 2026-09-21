/**
 * Bounded server errors that may cross the protocol boundary.
 *
 * 可过线的服务端错误。未知异常不要原样过线，改走 internal。
 */

import type { RemoteServiceErrorCode } from "@earendil-works/chord";

type ServerOperationErrorCode =
	| RemoteServiceErrorCode
	| "wrong_server"
	| "session_not_found"
	| "session_ambiguous"
	| "session_not_attached"
	| "server_draining";

/**
 * Opaque message used when an unexpected error is mapped to `internal_error`.
 *
 * 内部错误对外文案。不要把未知异常的 message 直接过线。
 */
export const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

/**
 * A host or lifecycle error that can safely cross the protocol boundary.
 *
 * 可过线错误。code 必须是协议或路由闭集里的值。
 */
export class ServerError extends Error {
	readonly code: ServerOperationErrorCode;

	constructor(code: ServerOperationErrorCode, message: string) {
		super(message);
		this.name = "ServerError";
		this.code = code;
	}
}

/**
 * Request target.serverId does not match this process's logical identity.
 *
 * 围栏打到别的 server。请求被拒，不改本机状态。
 */
export class WrongServerError extends ServerError {
	constructor() {
		super("wrong_server", "Request was addressed to another server");
		this.name = "WrongServerError";
	}
}

/**
 * Resolver found no durable Session for the requested id.
 *
 * 会话不存在。resolveSession 零匹配时抛。
 */
export class SessionNotFoundError extends ServerError {
	constructor(message = "Session was not found") {
		super("session_not_found", message);
		this.name = "SessionNotFoundError";
	}
}

/**
 * Resolver found more than one durable Session for the requested id.
 *
 * 会话 id 歧义。多匹配时抛，不能随便挑一个。
 */
export class SessionAmbiguousError extends ServerError {
	constructor() {
		super("session_ambiguous", "Session ID matches more than one session");
		this.name = "SessionAmbiguousError";
	}
}

/**
 * Session-scoped call arrived without a live matching attachment.
 *
 * 本连接没挂这个会话或 attachment。过期 attachmentId 也走它。
 */
export class SessionNotAttachedError extends ServerError {
	constructor() {
		super("session_not_attached", "Session is not attached to this client");
		this.name = "SessionNotAttachedError";
	}
}

/**
 * Server is closing; new attach or Session work is refused.
 *
 * 正在排空。新 attach/open 一律拒；已接纳的调用可以收尾。
 */
export class ServerDrainingError extends ServerError {
	constructor() {
		super("server_draining", "Server is draining");
		this.name = "ServerDrainingError";
	}
}
