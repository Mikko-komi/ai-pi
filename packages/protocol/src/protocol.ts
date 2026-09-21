/**
 * Chord RPC envelope types and TypeBox schemas for client and server frames.
 *
 * Chord RPC 信封。hello / request / cancel / response / 事件 / attachment；版本钉死当前常量。
 */

import type { JsonValue } from "@earendil-works/chord";
import Type, { type Static } from "typebox";
import { Check } from "typebox/value";

/**
 * Current Chord RPC protocol version accepted by this package.
 *
 * 本包接受的协议版本。服务端 hello 必须回这个字面量。
 */
export const PROTOCOL_VERSION = 8 as const;

const IdSchema = Type.String({ minLength: 1 });
const OpaqueJsonValueSchema = Type.Unsafe<JsonValue>(Type.Unknown());
const StrictObject = <const T extends Parameters<typeof Type.Object>[0]>(properties: T) =>
	Type.Object(properties, { additionalProperties: false });

const ServerIdSchema = Type.String({
	pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
});
/**
 * UUID v4 string identifying one logical server.
 *
 * 逻辑服务器 id。必须是小写 UUID v4，否则 {@link isServerId} 为假。
 */
export type ServerId = Static<typeof ServerIdSchema>;

/**
 * Type-guard for a UUID-v4 server id string.
 *
 * 校验 ServerId。过不了 schema 就不能当 server 围栏。
 */
export function isServerId(value: unknown): value is ServerId {
	return Check(ServerIdSchema, value);
}

const ProtocolErrorSchema = StrictObject({
	code: IdSchema,
	message: Type.String(),
});
/**
 * Stable protocol error code string.
 *
 * 协议错误码。非空字符串；语义由上层约定。
 */
export type ProtocolErrorCode = string;

/**
 * Structured protocol error carried on hello_error and failed responses.
 *
 * 协议错误。code + message；hello 失败和 response.ok=false 都用它。
 */
export type ProtocolError = Static<typeof ProtocolErrorSchema>;

/** Must be the first frame sent by a client. */
const ClientHelloSchema = StrictObject({
	type: Type.Literal("hello"),
	version: Type.Integer({ minimum: 0 }),
});
/**
 * First client frame: protocol hello with a requested version.
 *
 * 客户端第一帧。必须先发 hello，再发 request/cancel。
 */
export type ClientHello = Static<typeof ClientHelloSchema>;

/** A server-wide call, fenced to one logical server. */
const ServerTargetSchema = StrictObject({
	serverId: ServerIdSchema,
});
/** A session call, fenced to one logical server, durable session, and live attachment. */
const SessionTargetSchema = StrictObject({
	serverId: ServerIdSchema,
	sessionId: IdSchema,
	attachmentId: IdSchema,
});
/**
 * RPC target fenced to one server, durable session, and live attachment.
 *
 * 会话级目标。三条 id 都要有，才能打到具体 attachment。
 */
export type SessionTarget = Static<typeof SessionTargetSchema>;
const RpcTargetSchema = Type.Union([ServerTargetSchema, SessionTargetSchema]);
/**
 * Call fence: server-wide or session-scoped.
 *
 * RPC 围栏。要么只有 serverId，要么带 session/attachment。
 */
export type RpcTarget = Static<typeof RpcTargetSchema>;

const RequestEnvelopeSchema = StrictObject({
	type: Type.Literal("request"),
	id: IdSchema,
	target: RpcTargetSchema,
	call: OpaqueJsonValueSchema,
});
const CancelEnvelopeSchema = StrictObject({
	type: Type.Literal("cancel"),
	id: IdSchema,
	target: RpcTargetSchema,
});
/**
 * Client RPC request: id, target fence, and opaque call payload.
 *
 * 客户端请求。call 是不透明 JSON；id 用来对响应。
 */
export type RequestEnvelope = Static<typeof RequestEnvelopeSchema>;
/**
 * Client cancel for an in-flight request id at the same target.
 *
 * 取消进行中的请求。id 和 target 必须对上原 request。
 */
export type CancelEnvelope = Static<typeof CancelEnvelopeSchema>;
/**
 * TypeBox union of every client wire frame.
 *
 * 客户端帧联合 schema。hello / request / cancel；校验走 parseClientMessage。
 */
export const ClientMessageSchema = Type.Union([ClientHelloSchema, RequestEnvelopeSchema, CancelEnvelopeSchema]);
/**
 * One client wire frame: hello, request, or cancel.
 *
 * 客户端线上消息。三种 type 互斥。
 */
export type ClientMessage = Static<typeof ClientMessageSchema>;

const ServerHelloSchema = StrictObject({
	type: Type.Literal("hello"),
	version: Type.Literal(PROTOCOL_VERSION),
	serverId: ServerIdSchema,
});
const ServerHelloErrorSchema = StrictObject({
	type: Type.Literal("hello_error"),
	error: ProtocolErrorSchema,
});
const ResponseEnvelopeSchema = Type.Union([
	StrictObject({
		type: Type.Literal("response"),
		id: IdSchema,
		ok: Type.Literal(true),
		result: Type.Optional(OpaqueJsonValueSchema),
	}),
	StrictObject({
		type: Type.Literal("response"),
		id: IdSchema,
		ok: Type.Literal(false),
		error: ProtocolErrorSchema,
	}),
]);
const ServiceEventEnvelopeSchema = StrictObject({
	type: Type.Literal("service_update"),
	subscriptionId: IdSchema,
	update: OpaqueJsonValueSchema,
});
/** Out-of-band update to this presentation's selected Session route. */
const AttachmentEnvelopeSchema = StrictObject({
	type: Type.Literal("attachment"),
	attachment: Type.Union([SessionTargetSchema, Type.Null()]),
});
/**
 * TypeBox union of every server wire frame.
 *
 * 服务端帧联合 schema。hello / hello_error / response / 事件 / attachment。
 */
export const ServerMessageSchema = Type.Union([
	ServerHelloSchema,
	ServerHelloErrorSchema,
	ResponseEnvelopeSchema,
	ServiceEventEnvelopeSchema,
	AttachmentEnvelopeSchema,
]);
/**
 * Successful server hello: pinned version and this process's server id.
 *
 * 服务端握手成功。version 必须是 PROTOCOL_VERSION。
 */
export type ServerHello = Static<typeof ServerHelloSchema>;
/**
 * Server hello rejection with a protocol error.
 *
 * 握手失败。之后不应再当已建立会话。
 */
export type ServerHelloError = Static<typeof ServerHelloErrorSchema>;
/**
 * Server RPC response: ok with optional result, or a protocol error.
 *
 * 请求响应。ok=true 可带 result；ok=false 必须带 error。
 */
export type ResponseEnvelope = Static<typeof ResponseEnvelopeSchema>;
/**
 * Out-of-band service update for one subscription id.
 *
 * 订阅推送。subscriptionId 对应先前订阅；update 不透明。
 */
export type ServiceEventEnvelope = Static<typeof ServiceEventEnvelopeSchema>;
/**
 * Out-of-band update of this presentation's selected Session route.
 *
 * 当前展示所选 session 路由。null 表示卸掉 attachment。
 */
export type AttachmentEnvelope = Static<typeof AttachmentEnvelopeSchema>;
/**
 * One server wire frame.
 *
 * 服务端线上消息。五种 type 互斥。
 */
export type ServerMessage = Static<typeof ServerMessageSchema>;
