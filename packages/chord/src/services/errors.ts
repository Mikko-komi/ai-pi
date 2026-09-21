/**
 * Closed set of remote-service errors that may cross a Chord adapter boundary.
 *
 * 可过线的远端服务错误。业务异常不要塞进这些 code。
 */

/**
 * Closed list of remote-service error codes that may cross an adapter boundary.
 *
 * 可过线的错误码闭集。新 code 必须加进这里，业务错误不要混进来。
 */
export const REMOTE_SERVICE_ERROR_CODES = [
	"service_not_allowed",
	"service_not_found",
	"service_mode_mismatch",
	"service_member_not_found",
	"service_member_mismatch",
	"service_instance_not_found",
	"service_stale_instance",
	"service_invalid_value",
] as const;

/**
 * One code from {@link REMOTE_SERVICE_ERROR_CODES}.
 *
 * 远端服务错误码。只来自闭集，不是任意 string。
 */
export type RemoteServiceErrorCode = (typeof REMOTE_SERVICE_ERROR_CODES)[number];

/**
 * Return whether a value is a known {@link RemoteServiceErrorCode}.
 *
 * 运行时判定已知错误码。未知字符串为 false。
 */
export function isRemoteServiceErrorCode(value: unknown): value is RemoteServiceErrorCode {
	return typeof value === "string" && REMOTE_SERVICE_ERROR_CODES.includes(value as RemoteServiceErrorCode);
}

/**
 * Typed remote-service failure with a stable {@link RemoteServiceErrorCode}.
 *
 * 可过线的远端服务错误。`code` 必须在闭集里。
 */
export class RemoteServiceError extends Error {
	readonly code: RemoteServiceErrorCode;

	constructor(code: RemoteServiceErrorCode, message: string) {
		super(message);
		this.name = "RemoteServiceError";
		this.code = code;
	}
}
