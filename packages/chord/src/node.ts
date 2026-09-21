/**
 * Node host entry: load, verify, and materialize on-disk or transported facet bundles.
 *
 * Node 加载入口。只再导出 manifest 常量和 bundle loader；校验与 VM 执行在 `node/` 里。
 */

export type {
	FacetBundleArtifactLoaderOptions,
	FacetBundleExternalResolver,
	FacetBundleLoaderOptions,
} from "./node/bundle-loader.ts";
export {
	createFacetBundleArtifactLoader,
	createFacetBundleLoader,
	readFacetBundleArtifact,
	readFacetBundleManifest,
} from "./node/bundle-loader.ts";
export type {
	FacetBundleArtifact,
	FacetBundleEntry,
	FacetBundleManifest,
	FacetBundlePlugin,
} from "./node/manifest.ts";
export {
	FACET_BUNDLE_ARTIFACT_FORMAT,
	FACET_BUNDLE_ARTIFACT_FORMAT_VERSION,
	FACET_BUNDLE_FORMAT,
	FACET_BUNDLE_FORMAT_VERSION,
	FACET_BUNDLE_MANIFEST_FILE,
} from "./node/manifest.ts";
