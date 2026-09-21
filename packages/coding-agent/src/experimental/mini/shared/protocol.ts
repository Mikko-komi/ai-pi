/**
 * Service contracts and everything that crosses the wire.
 *
 * 线上契约。命令用 CommandResult 回数据，不抛异常；Model 对象不出 worker。
 */

import type { HarnessEvent, LaneSnapshot } from "@earendil-works/pi-agent-core";
import type { AuthEvent, AuthPrompt } from "@earendil-works/pi-ai";

/**
 * Commands answer with data, never exceptions, exactly like a remote call would.
 *
 * 命令结果。与远程调用一样只带数据，成功/失败互斥，不靠抛错。
 */
export type CommandResult = { ok: true } | { ok: false; error: string };

/**
 * Durable model identity. Nothing outside a worker holds a `Model` object.
 *
 * 可持久的模型身份。worker 外只传 provider/modelId，不传 Model 对象。
 */
export interface ModelRef {
	provider: string;
	modelId: string;
}

/**
 * One catalog row: durable identity plus a display name.
 *
 * 给目录展示的模型一行。在 ModelRef 上加显示名。
 */
export interface ModelSummary extends ModelRef {
	name: string;
}

/**
 * Serializable view of one provider account.
 *
 * 一个供应商账号的可序列化视图。ambient 凭据 interactive 为 false，pi 不能自己采集。
 */
export interface ProviderAccount {
	id: string;
	name: string;
	authType: "oauth" | "api_key";
	configured: boolean;
	/** Where the credential came from, for display: "stored", "environment", an env var name. */
	source?: string;
	/** False for ambient credentials pi cannot collect itself, such as AWS profiles or env vars. */
	interactive: boolean;
	methodName?: string;
}

/**
 * Whole publishable `Models` catalog and account list.
 *
 * Models 服务的整份可发布状态。refreshing 为真时目录可能不完整。
 */
export interface ModelsState {
	readonly models: readonly ModelSummary[];
	readonly accounts: readonly ProviderAccount[];
	readonly refreshing: boolean;
}

/**
 * An auth prompt without its `AbortSignal`: the part that can cross a transport.
 *
 * 可过传输的 auth 提问。从 AuthPrompt 去掉 AbortSignal，信号不能过线。
 */
export type AuthPromptRequest = AuthPrompt extends infer Prompt
	? Prompt extends unknown
		? Omit<Prompt, "signal">
		: never
	: never;

/**
 * A service seen from the other side of a connection: every method returns a promise.
 *
 * 连接对端看到的服务：每个方法都返回 Promise，不论实现是否同步。
 */
export type Remote<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;
};

/**
 * Names one service and carries its call and event types. Names are globally unique.
 *
 * 命名一项服务并携带调用/事件类型。name 全局唯一；types 只是幻影字段。
 */
export interface ServiceToken<TApi extends object, TEvent = never> {
	readonly name: string;
	/** Phantom, never read: keeps the types attached to the token. */
	readonly types?: (api: TApi, event: TEvent) => void;
}

/**
 * Declare a typed service token. Registers no implementation.
 *
 * 声明一个带类型的服务令牌。只带 name，不注册实现。
 */
export function defineService<TApi extends object, TEvent = never>(name: string): ServiceToken<TApi, TEvent> {
	return { name };
}

/**
 * One row from the durable session directory.
 *
 * 会话目录一行。id/path/cwd/createdAt 来自 Jsonl 元数据。
 */
export interface SessionSummary {
	id: string;
	path: string;
	cwd: string;
	createdAt: number;
}

/**
 * Whole session view captured by one `watch`.
 *
 * 一次 watch 捕获的整份会话视图。lane 配置、队列、统计都在里面，没有旁路复制。
 */
export interface SessionSnapshot {
	sessionId: string;
	cwd: string;
	sessionPath: string;
	/** Carries the lane configuration, queues, and stats: no side-channel replication. */
	lane: LaneSnapshot;
	models: ModelsState;
}

/**
 * Everything the `Models` service publishes.
 *
 * Models 服务发布的全部事件。login 请求是事件，回答走普通调用。
 */
export type ModelsEvent =
	| { type: "state"; state: ModelsState }
	// Login runs the wrong way round: the request is an event, the answer is an ordinary call.
	| { type: "prompt"; requestId: string; request: AuthPromptRequest }
	| { type: "notice"; notice: AuthEvent };

/**
 * The login half, for whatever drives the dialog.
 *
 * login 对话半边。从 ModelsEvent 去掉 state，只留 prompt 与 notice。
 */
export type AuthEventPayload = Exclude<ModelsEvent, { type: "state" }>;

/**
 * One presentation's subscription: a `lane.watch()` in the worker, named so its events can be filtered.
 *
 * 一个展示的订阅：worker 里的 lane.watch()，用 id 过滤后续事件。
 */
export interface LaneSubscription {
	subscriptionId: string;
	snapshot: SessionSnapshot;
}

/**
 * Lane events are addressed to the subscription whose watch produced them.
 *
 * 发给某个订阅的 lane 事件。server 按 subscription 路由，不广播。
 */
export interface LaneEvent {
	subscriptionId: string;
	event: HarnessEvent;
}

/**
 * Worker `Lane` command surface. One subscription per presentation; `watch` again to rebase.
 *
 * worker 提供的 lane 命令面。watch 按 presentationId 寻址；再 watch 即 rebase。
 */
export interface LaneServiceApi {
	/**
	 * Capture a snapshot and open a subscription for one presentation. Its events are addressed to
	 * `presentationId`, so the server routes them instead of broadcasting. Buffered until `start`.
	 */
	watch(presentationId: string): Promise<LaneSubscription>;
	/** Begin delivery, draining everything buffered since the snapshot. */
	start(subscriptionId: string): Promise<void>;
	unwatch(subscriptionId: string): Promise<void>;
	prompt(text: string): Promise<CommandResult>;
	steer(text: string): Promise<CommandResult>;
	followUp(text: string): Promise<CommandResult>;
	compact(): Promise<CommandResult>;
	abort(): Promise<CommandResult>;
	setModel(ref: ModelRef): Promise<CommandResult>;
}

/**
 * Worker model catalog and login. Replies are data; `authReply` has no result.
 *
 * worker 提供的模型目录与登录。refresh/login 回 CommandResult；authReply 无结果。
 */
export interface ModelsServiceApi {
	refresh(): Promise<CommandResult>;
	login(providerId: string, authType: "oauth" | "api_key"): Promise<CommandResult>;
	authReply(requestId: string, answer: string | null): Promise<void>;
}

/**
 * Provided by a worker so the server can identify the session it opened, without naming lane methods.
 *
 * worker 给 server 的自述。只报 sessionId，不暴露 lane 方法名。
 */
export interface WorkerServiceApi {
	describe(): Promise<{ sessionId: string }>;
}

/**
 * Server session directory and attach. `sessionId` null creates a new session.
 *
 * server 提供的会话目录与附着。attach 的 sessionId 为 null 表示新建。
 */
export interface SessionsServiceApi {
	list(): Promise<SessionSummary[]>;
	attach(sessionId: string | null, cwd: string, presentationId: string): Promise<string>;
}

/**
 * Provided by the worker. One subscription per presentation; `watch` again to rebase.
 *
 * worker 提供。每个展示一个订阅；再次 watch 即 rebase。
 */
export const Lane = defineService<LaneServiceApi, LaneEvent>("lane");
/**
 * Provided by the worker. Small enough to publish whole.
 *
 * worker 提供。目录够小，整份发布。
 */
export const Models = defineService<ModelsServiceApi, ModelsEvent>("models");
/**
 * Provided by the worker, consumed only by the server.
 *
 * worker 提供，仅 server 消费。
 */
export const Worker = defineService<WorkerServiceApi>("worker");
/**
 * Provided by the server.
 *
 * server 提供。
 */
export const Sessions = defineService<SessionsServiceApi>("sessions");
