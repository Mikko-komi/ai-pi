/**
 * Public barrel for `@earendil-works/pi-client`.
 *
 * 包的再导出门面。Unix 传输走 `./unix`，本文件不定义符号。
 */

export { Client, createClientServiceTransport } from "./client.ts";
export { ClientDisposedError, DisconnectedError, ServerError } from "./errors.ts";
export type { ByteTransport, ByteTransportFactory, ByteTransportHandlers } from "./transport.ts";
export type {
	AttachmentChangeListener,
	ClientOptions,
	ConnectionState,
	ConnectionStateChange,
	ListenerErrorHandler,
	ServiceSubscription,
	Unsubscribe,
} from "./types.ts";
