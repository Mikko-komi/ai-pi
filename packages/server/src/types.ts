/**
 * Host and routing contracts for the presentation-layer RPC server.
 *
 * 服务端路由合同。Server 只校验围栏和 attachment，不解码业务 payload。
 */

import type { JsonValue, ServiceCall, ServiceProviderUpdate } from "@earendil-works/chord";
import type { Context, SessionMetadata } from "@earendil-works/pi-agent-core";
import type { ServerListener } from "./listener.ts";

/**
 * Listener list plus logical server identity and optional protocol bounds.
 *
 * 启动选项。serverId 必须是小写 UUIDv4；listeners 在 start 时一次性挂上。
 */
export interface ServerOptions {
	listeners: readonly ServerListener[];
	/** Stable logical server identity supplied by the installation or profile. */
	serverId: string;
	maxFrameLength?: number;
	handshakeTimeoutMs?: number;
	onConnectionCountChanged?: (count: number) => void;
	onError?: (error: Error) => void;
}

/**
 * Sync or async result of one host or lifecycle callback.
 *
 * 同步或 Promise。宿主回调两种都能交。
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * One presentation connection's live capability for a hosted Session.
 *
 * 连接上的会话能力。invokeService 走不透明 call；release 后不能再调。
 */
export interface RoutedSessionAttachment {
	/** Route one contract-agnostic service operation to the attached Session endpoint. */
	invokeService(
		call: ServiceCall,
		publish: (subscriptionId: string, update: ServiceProviderUpdate, context: Context) => MaybePromise<void>,
		context: Context,
	): Promise<JsonValue | undefined>;
	release(context: Context): MaybePromise<void>;
}

/**
 * Presentation-scoped routing capabilities available to server service implementations.
 *
 * 连接级会话路由。同一连接重复 attach 同 session 幂等；删会话前必须 prepareSessionRemoval。
 */
export interface RoutedServerPresentation {
	attachSession(sessionId: string, context: Context): Promise<void>;
	detachSession(context: Context): Promise<void>;
	/** Release routed attachments and handles before the application deletes durable metadata. */
	prepareSessionRemoval(sessionId: string, context: Context): Promise<void>;
}

/**
 * One connection's server-scoped service endpoint.
 *
 * 连接级服务端点。只管本连接；断线后必须 release。
 */
export interface RoutedServerServiceAttachment {
	invokeService(
		call: ServiceCall,
		publish: (subscriptionId: string, update: ServiceProviderUpdate, context: Context) => MaybePromise<void>,
		context: Context,
	): Promise<JsonValue | undefined>;
	release(context: Context): MaybePromise<void>;
}

/**
 * Application host that attaches one server-scoped endpoint per connection.
 *
 * 宿主提供的服务端服务。每个连接一次 attachClient。
 */
export interface RoutedServerServiceHost {
	attachClient(presentation: RoutedServerPresentation, context: Context): MaybePromise<RoutedServerServiceAttachment>;
}

/**
 * A process-safe handle that acquires presentation-scoped Session capabilities.
 *
 * 进程内会话句柄。open 后由 router 持有；terminated 异常结束带 Error，正常关闭为 undefined。
 */
export interface RoutedSessionHandle {
	attachClient(context: Context): MaybePromise<RoutedSessionAttachment>;
	/** Resolves with an error for unexpected termination, or undefined after an expected close. */
	readonly terminated?: Promise<Error | undefined>;
	close(context: Context): Promise<void>;
}

/**
 * Application capabilities used by server-wide management and Session routing.
 *
 * 应用宿主。resolveSession 找不到或歧义必须抛有界错误，不要回空。
 */
export interface ServerHost<TMetadata extends SessionMetadata = SessionMetadata> {
	readonly serverServices: RoutedServerServiceHost;
	/** Resolve one durable Session ID or throw a bounded routing error. */
	resolveSession(sessionId: string, context: Context): Promise<TMetadata>;
	openSession(metadata: TMetadata, context: Context): Promise<RoutedSessionHandle>;
}
