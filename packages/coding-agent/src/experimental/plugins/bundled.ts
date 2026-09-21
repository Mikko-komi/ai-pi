/**
 * Load experimental presentation facets from session manifests or server artifacts.
 *
 * 实验展示 facet 加载。session 入口可选；TUI 只加载 server 选中并下发的 artifact。
 */

import { combineFacetLoaders, type FacetLoader, type JsonValue } from "@earendil-works/chord";
import {
	createFacetBundleArtifactLoader,
	createFacetBundleLoader,
	type FacetBundleArtifact,
	readFacetBundleManifest,
} from "@earendil-works/chord/node";

const PRESENTATION_FACET_BUNDLES_KEY = "presentationFacetBundles";
const PI_PLUGIN_API = "@earendil-works/pi-coding-agent/experimental/plugin";

/**
 * Combine optional session-entry facet loaders from plugin bundle manifests.
 *
 * 从清单建 session 加载器。空路径返回 undefined；清单没有 session 入口则加载空 facets。
 */
export function createSessionPluginFacetLoader(manifestPaths: readonly string[]): FacetLoader | undefined {
	if (manifestPaths.length === 0) return undefined;
	return combineFacetLoaders(manifestPaths.map(createOptionalSessionFacetLoader));
}

function createOptionalSessionFacetLoader(manifestPath: string): FacetLoader {
	const loader = createFacetBundleLoader({
		manifestPath,
		entry: "session",
		resolveExternal: resolvePluginExternal,
	});
	return {
		async load() {
			const manifest = await readFacetBundleManifest(manifestPath);
			if (manifest.entries.session !== undefined) return loader.load();
			return { facets: Object.freeze([]), async dispose() {} };
		},
	};
}

/**
 * Serialize TUI facet-bundle artifacts for the presentation plugin channel.
 *
 * 把 TUI artifact 打成 JsonValue。键固定；对端必须用 createPresentationFacetLoaders 解。
 */
export function createPresentationFacetData(artifacts: readonly FacetBundleArtifact[]): JsonValue {
	return {
		[PRESENTATION_FACET_BUNDLES_KEY]: artifacts.map((artifact) => artifact as unknown as JsonValue),
	};
}

/**
 * Create local loaders only from artifacts selected and sent by the connected server.
 *
 * 只从已连接 server 下发的 artifact 建本地加载器。缺键当空列表；非对象或非数组抛错。
 */
export function createPresentationFacetLoaders(data: JsonValue): readonly FacetLoader[] {
	if (data === null || Array.isArray(data) || typeof data !== "object") {
		throw new Error("Invalid presentation plugin data");
	}
	const artifacts = data[PRESENTATION_FACET_BUNDLES_KEY];
	if (artifacts === undefined) return [];
	if (!Array.isArray(artifacts)) throw new Error("Invalid presentation plugin bundle list");
	return artifacts.map((artifact) =>
		createFacetBundleArtifactLoader({ artifact, resolveExternal: resolvePluginExternal }),
	);
}

function resolvePluginExternal(specifier: string): string | undefined {
	if (specifier !== PI_PLUGIN_API) return undefined;
	const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";
	return new URL(`../plugin.${extension}`, import.meta.url).href;
}
