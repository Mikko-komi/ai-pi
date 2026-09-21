/**
 * Byte-connection contract and per-connection handshake/request state.
 *
 * 连接状态机。closing/closed/disconnected 都算终态，不再收帧。
 */

import type { ServiceStateEncoder } from "@earendil-works/chord";
import type { ClientMessageDecoder, RpcTarget } from "@earendil-works/pi-protocol";

import type { MaybePromise, RoutedServerServiceAttachment } from "./types.ts";

/**
 * An established, authorized ordered byte connection.
 *
 * 已授权有序字节流。send 按调用序；close 可带最后一帧。
 */
export interface ByteConnection {
	readonly closed: boolean;
	send(chunk: Uint8Array): Promise<void>;
	close(finalChunk?: Uint8Array): MaybePromise<void>;
}

/**
 * Inbound callbacks installed when the server accepts a byte connection.
 *
 * 入站回调。onClose/onError 是终态；实现不应再 send。
 */
export interface ByteConnectionHandler {
	onData(chunk: Uint8Array): void;
	onClose(): void;
	onError(error: Error): void;
}

/**
 * Accepts one authorized connection and returns its inbound handlers.
 *
 * 接入回调。返回的 handler 只管这一条连接。
 */
export type ByteConnectionAcceptor = (connection: ByteConnection) => ByteConnectionHandler;

/**
 * Handshake and lifetime stage of one accepted connection.
 *
 * 连接阶段。awaitingHello → handshaking → ready；closing/closed 不再派发。
 */
export type ConnectionStage = "awaitingHello" | "handshaking" | "ready" | "closing" | "closed";

/**
 * Mutable per-connection decoder, handshake, and in-flight request book.
 *
 * 单连接可变状态。disconnected 后进行中的 request 一律 abort。
 */
export interface ConnectionState {
	connection: ByteConnection;
	decoder: ClientMessageDecoder;
	serviceStateEncoders: Map<string, ServiceStateEncoder>;
	stage: ConnectionStage;
	disconnected: boolean;
	handshake?: Promise<void>;
	handshakeTimeout: NodeJS.Timeout;
	serverServices?: RoutedServerServiceAttachment;
	activeRequests: Map<string, { controller: AbortController; target: RpcTarget }>;
}

/**
 * Return whether a connection will accept no further protocol work.
 *
 * 终态判定。disconnected、closing、closed 都不再收新帧。
 */
export function isTerminalConnection(state: ConnectionState): boolean {
	return state.disconnected || state.stage === "closing" || state.stage === "closed";
}
