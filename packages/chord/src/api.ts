/**
 * Public factories for facet hosts, loaders, service tokens, bindings, and replicated state.
 *
 * Chord 运行时的工厂入口。host 一次激活一整代 facet；`defineService` 的远端合同必须过 RemoteServiceContract。
 */

import { FacetKernel } from "./facets/host.ts";
import { disposeLoadedFacets } from "./facets/loader.ts";
import { RemoteServiceBindingImpl } from "./services/consumer.ts";
import { MutableReplicatedStateImpl } from "./services/state.ts";
import type {
	Facet,
	FacetHost,
	FacetLoader,
	FacetOptions,
	LoadedFacets,
	MutableReplicatedState,
	RemoteServiceBinding,
	RemoteServiceBindingOptions,
	RemoteServiceContract,
	Service,
} from "./types.ts";

/**
 * Create an active host for one complete set of facets.
 *
 * 激活一代 facet。图校验失败会回滚已 setup 的资源；成功后才能 reload/dispose。
 */
export async function createFacetHost(options: FacetOptions): Promise<FacetHost> {
	const kernel = new FacetKernel(options);
	await kernel.activate();
	return Object.freeze({
		services: kernel.provider,
		reload: (facets: readonly Facet[]) => kernel.reload(facets),
		dispose: () => kernel.dispose(),
	});
}

/**
 * Wrap an already-constructed facet list as a loader that never owns extra resources.
 *
 * 把现成 facet 列表包成 loader。`dispose` 是空操作。
 */
export function createStaticFacetLoader(facets: readonly Facet[]): FacetLoader {
	const loadedFacets = Object.freeze([...facets]);
	return {
		async load() {
			return { facets: loadedFacets, async dispose() {} };
		},
	};
}

/**
 * Load several facet sources in order and dispose already-loaded ones if a later load fails.
 *
 * 按序合并多个 loader。中途失败必须反序清理已 load 的；dispose 也反序。
 */
export function combineFacetLoaders(loaders: readonly FacetLoader[]): FacetLoader {
	return {
		async load() {
			const loaded: LoadedFacets[] = [];
			try {
				for (const loader of loaders) loaded.push(await loader.load());
			} catch (error) {
				const cleanupErrors = await disposeLoadedFacets(loaded.reverse());
				if (cleanupErrors.length > 0) {
					throw new AggregateError([error, ...cleanupErrors], "Facet loading and cleanup failed");
				}
				throw error;
			}
			let disposed = false;
			return {
				facets: Object.freeze(loaded.flatMap(({ facets }) => facets)),
				async dispose() {
					if (disposed) return;
					disposed = true;
					const errors = await disposeLoadedFacets([...loaded].reverse());
					if (errors.length === 1) throw errors[0];
					if (errors.length > 1) throw new AggregateError(errors, "Failed to dispose loaded facets");
				},
			};
		},
	};
}

/**
 * Identity helper that preserves a facet object for typed registration.
 *
 * 原样返回 facet。只做类型锚点，不改对象、不注册。
 */
export function defineFacet(facet: Facet): Facet {
	return facet;
}

/**
 * Create a frozen service token. Local services skip JSON contracts; remote ones must be exposable.
 *
 * 冻结的服务令牌。id 非空且不能用 `$chord.` 前缀；`local: true` 不进远端，否则合同必须是 JSON。
 */
export function defineService<T>(id: string, options: { readonly local: true }): Service<T>;
export function defineService<T>(
	id: string,
	...options: [RemoteServiceContract<T>] extends [never]
		? readonly [options: never]
		: readonly [options?: { readonly local?: false }]
): Service<T>;
export function defineService(id: string, options?: { readonly local?: boolean }): Service<unknown> {
	if (id.length === 0) throw new TypeError("Service ID must not be empty");
	// TODO: check if the reserved namespace should be part of Chord.
	if (id.startsWith("$chord.")) throw new TypeError("Service IDs beginning with $chord. are reserved");
	return Object.freeze({ id, local: options?.local ?? false });
}

/**
 * Bind allowlisted remote services through an application-supplied transport.
 *
 * 按 allowlist 开远端消费绑定。重复 service id 非法；facade 在 rebind 时保持身份。
 */
export function createRemoteServiceBinding(options: RemoteServiceBindingOptions): RemoteServiceBinding {
	return new RemoteServiceBindingImpl(options);
}

/**
 * Create authoritative mutable state that publishes immutable revisions to subscribers.
 *
 * 生产者复制状态。写必须走返回值的 `state`；未 `publish` 的改动不外传。
 */
export function replicatedState<T extends object>(initial: T): MutableReplicatedState<T> {
	return new MutableReplicatedStateImpl(initial);
}
