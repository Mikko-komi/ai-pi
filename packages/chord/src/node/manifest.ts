/**
 * On-disk and transportable facet-bundle formats.
 *
 * facet bundle 的格式常量和形状。版本不匹配必须拒读。
 */

/**
 * Manifest format id written into `chord-facets.json`.
 *
 * 磁盘 manifest 的 format 字段。不是 artifact format。
 */
export const FACET_BUNDLE_FORMAT = "chord.facet-bundle";

/**
 * Current manifest format version accepted by loaders.
 *
 * 当前 manifest 版本。旧版本必须拒绝。
 */
export const FACET_BUNDLE_FORMAT_VERSION = 2;

/**
 * Manifest filename placed next to bundled entry files.
 *
 * 清单文件名。必须和 entry 文件在同一目录。
 */
export const FACET_BUNDLE_MANIFEST_FILE = "chord-facets.json";

/**
 * Transportable artifact format id for one materialized entry.
 *
 * 可搬运 artifact 的 format。和磁盘 manifest 不是同一个。
 */
export const FACET_BUNDLE_ARTIFACT_FORMAT = "chord.facet-bundle-artifact";

/**
 * Current artifact format version accepted by artifact loaders.
 *
 * 当前 artifact 版本。对不上必须拒绝。
 */
export const FACET_BUNDLE_ARTIFACT_FORMAT_VERSION = 2;

/**
 * One bundled entry: content-addressed file, integrity, and leftover imports.
 *
 * 清单里的一条 entry。file 必须是相对文件名；integrity 是 sha256。
 */
export interface FacetBundleEntry {
	/** Content-addressed CommonJS filename relative to the manifest. */
	readonly file: string;
	/** SHA-256 subresource-integrity value for the JavaScript file. */
	readonly integrity: string;
	/** Imports intentionally left for the loading application to resolve. */
	readonly externalImports: readonly string[];
	/** Source map filename relative to the manifest, when emitted. */
	readonly sourceMap?: string;
}

/**
 * Versioned on-disk manifest for one plugin's facet entries.
 *
 * 磁盘清单。format/version 对不上就拒；entries 不能空。
 */
export interface FacetBundleManifest {
	readonly format: typeof FACET_BUNDLE_FORMAT;
	readonly formatVersion: typeof FACET_BUNDLE_FORMAT_VERSION;
	readonly plugin: FacetBundlePlugin;
	readonly entries: Readonly<Record<string, FacetBundleEntry>>;
}

/**
 * Plugin identity recorded in a manifest or artifact.
 *
 * 插件身份。id 非空；version 若出现也不能空。
 */
export interface FacetBundlePlugin {
	readonly id: string;
	readonly version?: string;
}

/**
 * One self-contained manifest entry suitable for storage or transport to another Node host.
 *
 * 可搬运的单 entry。带源码；有 sourceMap 文件名时必须带 contents。
 */
export interface FacetBundleArtifact {
	readonly format: typeof FACET_BUNDLE_ARTIFACT_FORMAT;
	readonly formatVersion: typeof FACET_BUNDLE_ARTIFACT_FORMAT_VERSION;
	readonly plugin: FacetBundlePlugin;
	readonly entryName: string;
	readonly entry: FacetBundleEntry;
	readonly source: string;
	readonly sourceMapContents?: string;
}
