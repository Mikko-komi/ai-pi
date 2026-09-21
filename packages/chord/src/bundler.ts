/**
 * Node bundler entry: esbuild facet packages and content-addressed CommonJS entries.
 *
 * 打包入口。只再导出 `bundleFacets` / `bundleFacetPackage` 及其选项；不在这里实现。
 */

export type {
	BundleFacetsOptions,
	BundleFacetsResult,
	FacetBundlePlatform,
} from "./node/bundle.ts";
export { bundleFacets } from "./node/bundle.ts";
export type { FacetBundleEntry, FacetBundleManifest } from "./node/manifest.ts";
export type { BundleFacetPackageOptions, BundleFacetPackageResult } from "./node/package.ts";
export { bundleFacetPackage } from "./node/package.ts";
