/**
 * Ordered byte transport contract used by the transport-neutral Client.
 *
 * 有序字节传输。factory 每次连都造新的；终态 handler 只该来一次。
 */

/**
 * Connected, authenticated outbound byte sink.
 *
 * 已连接字节发送端。send 按调用序；close 重复调用必须无害。
 */
export interface ByteTransport {
	/** Sends one byte chunk. Calls must be delivered in invocation order. */
	send(chunk: Uint8Array): Promise<void>;
	/** Closes the transport. Implementations must make repeated calls harmless. */
	close(): void;
}

/**
 * Inbound callbacks installed when a transport is created.
 *
 * 入站回调。onClose 是正常终态，onError 是失败终态，只该来一个。
 */
export interface ByteTransportHandlers {
	/** Delivers an arbitrary inbound byte chunk. */
	onData(chunk: Uint8Array): void;
	/** Reports an orderly terminal close. */
	onClose(): void;
	/** Reports a terminal transport failure. */
	onError(error: Error): void;
}

/**
 * Creates a fresh connected, authenticated transport. Exactly one terminal handler is expected.
 *
 * 每次连接造一条新传输。onClose 和 onError 只该来一个终态。
 */
export type ByteTransportFactory = (handlers: ByteTransportHandlers) => ByteTransport | Promise<ByteTransport>;
