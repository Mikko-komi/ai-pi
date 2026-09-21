/**
 * Provenance for a loaded resource path (skill, prompt, theme, extension).
 *
 * 资源路径的来源信息。scope / origin 决定覆盖和信任，不参与模型上下文。
 */

import type { PathMetadata } from "./package-manager.ts";

/**
 * Whether a resource is user-global, project-local, or ephemeral.
 *
 * 资源作用域。temporary 表示这次运行才有，不写回磁盘配置。
 */
export type SourceScope = "user" | "project" | "temporary";

/**
 * Whether the path came from a package or a top-level user/project file.
 *
 * 路径来自包装还是顶层文件。同名冲突时用来解释谁赢。
 */
export type SourceOrigin = "package" | "top-level";

/**
 * Provenance attached to a loaded resource.
 *
 * 挂在已加载资源上的来源。`path` 必须是绝对路径。
 */
export interface SourceInfo {
	path: string;
	source: string;
	scope: SourceScope;
	origin: SourceOrigin;
	baseDir?: string;
}

/**
 * Build SourceInfo from package-manager path metadata.
 *
 * 从包管理器的 PathMetadata 构造。字段原样拷贝。
 */
export function createSourceInfo(path: string, metadata: PathMetadata): SourceInfo {
	return {
		path,
		source: metadata.source,
		scope: metadata.scope,
		origin: metadata.origin,
		baseDir: metadata.baseDir,
	};
}

/**
 * Build SourceInfo when no package metadata exists.
 *
 * 没有包元数据时的合成来源。默认 scope 为 temporary、origin 为 top-level。
 */
export function createSyntheticSourceInfo(
	path: string,
	options: {
		source: string;
		scope?: SourceScope;
		origin?: SourceOrigin;
		baseDir?: string;
	},
): SourceInfo {
	return {
		path,
		source: options.source,
		scope: options.scope ?? "temporary",
		origin: options.origin ?? "top-level",
		baseDir: options.baseDir,
	};
}
