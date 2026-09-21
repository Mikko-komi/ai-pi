/**
 * Shared facet, service, context, and replicated-state contracts for Chord.
 *
 * Chord 的公共合同：Context、Service、Facet、远端绑定和复制状态。远端成员必须是 JSON 方法或 ReplicatedState。
 */

import type { Op } from "./delta/index.ts";
import type { RemoteServiceProvider } from "./services/provider.ts";

export type { RemoteServiceError } from "./services/errors.ts";
export type { RemoteServiceProvider } from "./services/provider.ts";

/**
 * Typed identity for one value carried by a {@link Context}.
 *
 * Context 里一个值的类型身份。`token` 是运行时比较键；不同类型的 key 不能互换。
 */
export interface ContextKey<T> {
	readonly token: symbol;
	/** Type-only marker that prevents keys with different value types from being interchangeable. */
	readonly valueType?: (value: T) => T;
}

/**
 * Immutable invocation-scoped values passed explicitly through operations.
 *
 * 调用范围的不可变上下文。必须显式传递，不从全局读。
 */
export interface Context {
	readonly abortSignal: AbortSignal | undefined;
	value<T>(key: ContextKey<T>): T | undefined;
	toString(): string;
}

/**
 * Finite strict JSON: null, boolean, number, string, arrays, and plain objects.
 *
 * 严格 JSON。循环、NaN、class 实例都不算。
 */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Strict-JSON representation of an application data type. Unknown payloads become JsonValue.
 *
 * 应用数据类型的严格 JSON 投影。`any`/`unknown` 落到 {@link JsonValue}；推不出 JSON 则为 never。
 */
export type JsonRepresentation<T> = IsAny<T> extends true
	? JsonValue
	: unknown extends T
		? JsonValue
		: T extends null | boolean | number | string
			? T
			: T extends readonly (infer TItem)[]
				? JsonRepresentation<TItem>[]
				: T extends object
					? { [TKey in keyof T]: JsonRepresentation<T[TKey]> }
					: never;

/**
 * How one replica revision arrived: full hydration or a later incremental update.
 *
 * 一次副本投递的形态。`hydrate` 是完整快照；`update` 必须接在连续 sequence 上。
 */
export interface ReplicatedStateDelivery {
	readonly kind: "hydrate" | "update";
	readonly sequence: number;
}

/**
 * Read-only replica of one published value. Listeners see immutable revisions.
 *
 * 只读副本。`value` 在 hydrate 前是 undefined；后续修订不改已经返回的对象。
 */
export interface ReplicatedState<T> {
	/** Immutable value, or undefined until hydration. Later updates do not mutate previously returned values. */
	readonly value: T | undefined;
	/** Listener values are immutable and may structurally share unchanged data with other revisions. */
	subscribe(listener: (value: T, context: Context, delivery: ReplicatedStateDelivery) => void): () => void;
}

/**
 * Authoritative producer state. Writes go through {@link state}; {@link publish} emits them.
 *
 * 生产者侧可写复制状态。写必须走 `state` 代理；`publish` 才发出一批 ops。
 */
export interface MutableReplicatedState<T extends object> extends ReplicatedState<T> {
	readonly value: T;
	/** Mutable tracked state. All writes must go through this proxy. */
	readonly state: T;
	/** Publish the changes made through {@link state} since the previous publication. */
	publish(context: Context): void;
}

declare const SERVICE_TYPE: unique symbol;

/**
 * Whether a service has one process-wide instance or many keyed instances.
 *
 * 服务实例形态。singleton 一个；keyed 按 key 多实例。同一 id 不能两种 mode 混用。
 */
export type ServiceMode = "singleton" | "keyed";

/**
 * Stable identity for one shared TypeScript service contract.
 *
 * 服务合同的稳定令牌。`local: true` 只在进程内，不进远端目录。
 */
export interface Service<T> {
	readonly id: string;
	/** Process-local services accept unrestricted object contracts and are never published remotely. */
	readonly local: boolean;
	readonly [SERVICE_TYPE]?: (value: T) => T;
}

type InvalidJsonPart<T> = IsAny<T> extends true
	? T
	: unknown extends T
		? never
		: [T] extends [JsonValue]
			? [JsonValue] extends [T]
				? never
				: InvalidJsonStructure<T>
			: InvalidJsonStructure<T>;

type InvalidJsonProperty<T> = [Exclude<T, undefined>] extends [never] ? T : InvalidJsonPart<Exclude<T, undefined>>;

type InvalidJsonStructure<T> = T extends null | boolean | number | string
	? never
	: T extends readonly (infer TItem)[]
		? InvalidJsonPart<TItem>
		: T extends (...args: never[]) => unknown
			? T
			: T extends object
				? { [TKey in keyof T]-?: InvalidJsonProperty<T[TKey]> }[keyof T]
				: T;

type InvalidRemoteMember<T> = T extends ReplicatedState<infer TValue>
	? InvalidJsonPart<TValue> extends never
		? never
		: "state value is not JSON"
	: T extends (...args: [...infer TArgs, Context]) => Promise<infer TResult>
		? InvalidJsonPart<TArgs[number]> extends never
			? TResult extends void
				? never
				: InvalidJsonPart<TResult> extends never
					? never
					: "method result is not JSON or void"
			: "method argument is not JSON"
		: "member is not a remote method or ReplicatedState";

type InvalidRemoteMemberNames<T> = {
	[TKey in keyof T]-?: InvalidRemoteMember<T[TKey]> extends never ? never : TKey;
}[keyof T];

/**
 * Compile-time check that a service contract is remotely exposable as JSON methods or state.
 *
 * 远端合同检查。成员必须是带尾 Context 的 JSON 方法或 JSON 的 ReplicatedState，否则变成 never。
 */
export type RemoteServiceContract<T> = InvalidRemoteMemberNames<T> extends never ? T : never;

/**
 * Deferred capability to spawn keyed service instances after the facet is active.
 *
 * keyed 服务的延迟生成器。`spawn` 在 facet 激活后才合法；返回的关闭函数卸掉该实例。
 */
export interface ServiceSpawner<T> {
	spawn(key: string, implementation: T): () => void;
}

/**
 * Consumer-side access to allowlisted remote services: acquire, observe, wait, dispose.
 *
 * 远端服务消费面。`use`/`observe` 拿稳定 facade；`ready` 等到当前已获取服务的初始快照。
 */
export interface RemoteServices {
	use<T>(service: Service<T>): T;
	observe<T>(service: Service<T>, handler: (service: T, context: Context) => void | Promise<void>): () => void;
	/** Wait until every currently acquired service has installed its initial snapshot. */
	ready(context: Context): Promise<void>;
	dispose(context: Context): Promise<void>;
}

/**
 * One advertised service in a remote catalogue: id plus singleton or keyed mode.
 *
 * 目录里的一条服务广告。同一 catalogue 里 serviceId 不能重复。
 */
export type ServiceCatalogueEntry = {
	readonly serviceId: string;
	readonly mode: ServiceMode;
};

/**
 * Identity of one keyed instance: stable key plus a generation that advances on respawn.
 *
 * keyed 实例地址。key 稳定；generation 重生递增。旧 generation 的调用必须当过期。
 */
export type ServiceInstanceAddress = {
	readonly key: string;
	readonly generation: number;
};

/**
 * One published member: a remote method, or replicated state with a sequence and ops.
 *
 * 实例快照里的一个成员。state 的 ops 是已解码的 Op；sequence 从 0 起。
 */
export type ServiceMemberSnapshot =
	| { readonly name: string; readonly kind: "method" }
	| { readonly name: string; readonly kind: "state"; readonly sequence: number; readonly ops: readonly Op[] };

/**
 * One service instance at subscribe time: optional address and its member snapshots.
 *
 * 一次订阅看到的单个实例。singleton 没有 instance 地址；keyed 必须带地址。
 */
export type ServiceInstanceSnapshot = {
	readonly instance?: ServiceInstanceAddress;
	readonly members: readonly ServiceMemberSnapshot[];
};

/**
 * Opening snapshot for one service subscription: id, mode, and live instances.
 *
 * 订阅打开时的完整快照。singleton 恰好一个实例；keyed 可以是多个。
 */
export type ServiceSubscriptionSnapshot = {
	readonly serviceId: string;
	readonly mode: ServiceMode;
	readonly instances: readonly ServiceInstanceSnapshot[];
};

/**
 * Incremental lifecycle or state event after a subscription is open.
 *
 * 订阅打开后的增量。keyed 不收 `unavailable`/`replaced`；state 更新必须带对上的 instance。
 */
export type ServiceProviderUpdate =
	| {
			readonly type: "state";
			readonly instance?: ServiceInstanceAddress;
			readonly member: string;
			readonly sequence: number;
			readonly ops: readonly Op[];
	  }
	| { readonly type: "unavailable" }
	| { readonly type: "replaced"; readonly snapshot: ServiceInstanceSnapshot }
	| { readonly type: "spawned"; readonly instance: ServiceInstanceSnapshot }
	| { readonly type: "closed"; readonly instance: ServiceInstanceAddress };

/**
 * One remote method invocation: service, optional instance, member name, and JSON args.
 *
 * 一次远端方法调用。args 是借用的不可变 JSON；Chord 校验但不克隆。
 */
export type ServiceCall = {
	readonly serviceId: string;
	readonly instance?: ServiceInstanceAddress;
	readonly member: string;
	/** Borrowed immutable values. Chord validates but does not clone them. */
	readonly args: readonly JsonValue[];
};

/**
 * Live subscription handle. {@link activate} starts delivery; {@link close} tears it down.
 *
 * 订阅句柄。activate 之前的更新会缓冲；close 后不再投递。
 */
export interface ServiceSubscription {
	readonly snapshot: ServiceSubscriptionSnapshot;
	activate(): void;
	close(context?: Context): void | Promise<void>;
}

/**
 * Pluggable wire boundary consumed by a remote service binding.
 *
 * Implementations choose transport, framing, routing, and envelope encoding. Values crossing this
 * boundary must remain strict JSON. Chord does not clone values or require a particular application wire protocol;
 * adapters own serialization and any isolation copies they require.
 *
 * 可插拔的远端线边界。值必须是严格 JSON；Chord 不规定帧、路由或信封，也不克隆。
 */
export interface RemoteServiceTransport {
	invoke(call: ServiceCall, context: Context): Promise<JsonValue | undefined>;
	subscribe(
		serviceId: string,
		mode: ServiceMode,
		listener: (update: ServiceProviderUpdate, context: Context) => void,
		context: Context,
	): Promise<ServiceSubscription>;
}

/**
 * Inputs for a consumer binding: allowlist, transport, and optional access/error hooks.
 *
 * 绑定构造参数。services 是 allowlist；重复 id 非法。bound 默认 true。
 */
export interface RemoteServiceBindingOptions {
	readonly services: readonly { readonly id: string }[];
	readonly transport: RemoteServiceTransport;
	readonly bound?: boolean;
	readonly onError?: (error: Error) => void;
	readonly assertAccess?: () => void;
}

/**
 * {@link RemoteServices} plus {@link rebind} to attach or detach the transport without dropping facades.
 *
 * 可重绑的远端消费面。rebind 关/开订阅，但已拿到的 facade 身份保持。
 */
export interface RemoteServiceBinding extends RemoteServices {
	rebind(bound: boolean, context: Context): Promise<void>;
}

/**
 * Synchronous setup surface a facet uses to declare services, state, and lifecycle hooks.
 *
 * facet setup 时的环境。use/provide/observe 只在 setup 同步声明；setup 不能返回 Promise。
 */
export interface FacetEnvironment {
	/** Declare a hard dependency on one singleton service and return its stable handle. */
	use<T>(service: Service<T>): T;
	/** Declare a hard dependency on a keyed service and observe each live instance. */
	observe<T>(service: Service<T>, handler: (service: T, context: Context) => void | Promise<void>): void;
	/** Declare and install this facet's singleton implementation of a service. */
	provide<T>(service: Service<T>, implementation: NoInfer<T>): void;
	/** Declare ownership of a multi-instance service and return its deferred spawning capability. */
	provideMany<T>(service: Service<T>): ServiceSpawner<T>;
	/** Create initialized mutable state suitable for exposing through a service implementation. */
	replicatedState<T extends object>(initial: T): MutableReplicatedState<T>;
	/** Give the facet ownership of a resource cleanup function. */
	own(disposal: () => void | Promise<void>): void;
	/** Register asynchronous initialization after dependencies are bound and ready. */
	onActivate(callback: () => void | Promise<void>): void;
	/** Register final facet teardown. */
	onDeactivate(callback: () => void | Promise<void>): void;
}

/**
 * One plugin piece: a stable id and a synchronous {@link setup} that declares its shape.
 *
 * 插件的一块。id 在一代 host 内唯一；setup 必须同步声明依赖和提供。
 */
export interface Facet {
	readonly id: string;
	setup(env: FacetEnvironment): void;
}

/**
 * External catalogue and opener used by a host to satisfy facets that need remote services.
 *
 * host 外的服务来源。catalogue 广告；open 按所需 id 开 binding。不可用服务最多一个 deferred source。
 */
export interface RemoteServiceSource {
	/** Whether this currently unavailable source may provisionally own absent requirements. */
	readonly acceptsUnavailableServices: boolean;
	catalogue(context: Context): Promise<readonly ServiceCatalogueEntry[]>;
	open(options: {
		readonly services: readonly { readonly id: string }[];
		assertAccess(): void;
		onError(error: Error): void;
	}): RemoteServices;
}

/**
 * Inputs for one facet generation: facets, optional remote sources, and an error reporter.
 *
 * 一代 host 的输入。facet id 非空且唯一。
 */
export interface FacetOptions {
	readonly facets: readonly Facet[];
	readonly serviceSources?: readonly RemoteServiceSource[];
	readonly onError?: (error: Error) => void;
}

/**
 * Active generation: published remote services, same-shape reload, and reverse-order dispose.
 *
 * 已激活的 facet 代。reload 必须保持服务形状；dispose 按依赖反序。
 */
export interface FacetHost {
	readonly services: RemoteServiceProvider;
	/** Activate and replace facets with matching IDs without disconnecting consumer service handles. */
	reload(facets: readonly Facet[]): Promise<void>;
	dispose(): Promise<void>;
}

/**
 * Facets produced by one loader invocation, plus disposal of loader-owned resources.
 *
 * 一次 load 的结果。dispose 卸掉 loader 自己的资源，不卸 host。
 */
export interface LoadedFacets {
	readonly facets: readonly Facet[];
	dispose(): Promise<void>;
}

/**
 * Async source of facets. Each {@link load} must return a fresh generation.
 *
 * facet 异步来源。每次 load 出新一代；失败时已 load 的必须被清理。
 */
export interface FacetLoader {
	load(): Promise<LoadedFacets>;
}
