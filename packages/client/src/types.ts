/**
 * Public client options, connection state, and service-subscription handles.
 *
 * 客户端公共类型。serverId 是期望的逻辑身份，必须和 hello 对上。
 */

import type { ServiceSubscriptionSnapshot } from "@earendil-works/chord";
import type { RpcTarget, SessionTarget } from "@earendil-works/pi-protocol";
import type { ByteTransportFactory } from "./transport.ts";

/**
 * Client transport lifecycle: idle, opening, or ready for RPC.
 *
 * 连接生命周期。disconnected 后不自动重连。
 */
export type ConnectionState = "disconnected" | "connecting" | "connected";

/**
 * Connection-state notification, with an error on unexpected disconnect.
 *
 * 状态变更。断开可带 error；正常 disconnect 也走 disconnected。
 */
export interface ConnectionStateChange {
	state: ConnectionState;
	error?: Error;
}

/**
 * Removes one previously registered listener.
 *
 * 取消订阅。重复调用应无害。
 */
export type Unsubscribe = () => void;
/**
 * Observer for subscriber failures that must not corrupt client state.
 *
 * 监听器异常上报。实现抛错也不能改协议或传输状态。
 */
export type ListenerErrorHandler = (error: Error) => void;
/**
 * Observer for out-of-band live Session attachment changes.
 *
 * attachment 变更。undefined 表示本连接已卸下会话。
 */
export type AttachmentChangeListener = (attachment: SessionTarget | undefined) => void;

/**
 * Live service subscription: snapshot first, then ordered updates after start.
 *
 * 服务订阅。先装 snapshot 再 start；start 前的更新会缓冲。
 */
export interface ServiceSubscription {
	readonly id: string;
	readonly target: RpcTarget;
	readonly snapshot: ServiceSubscriptionSnapshot;
	/** Begin ordered update delivery after the caller has installed the snapshot. */
	start(): void;
	dispose(): Promise<void>;
}

/**
 * Transport factory, expected logical server id, and optional frame bound.
 *
 * 客户端选项。serverId 必须是小写 UUIDv4；transportFactory 每次连都造新传输。
 */
export interface ClientOptions {
	transportFactory: ByteTransportFactory;
	/** Logical server identity expected at the physical endpoint. */
	serverId: string;
	maxFrameLength?: number;
	/** Reports subscriber failures without allowing them to corrupt client state. */
	onListenerError?: ListenerErrorHandler;
}
