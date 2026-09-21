/**
 * Candidate filesystem paths for packaged native `.node` binaries.
 *
 * 给原生模块找候选路径。安装包、源码树、standalone 二进制各试一次。
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleRequire = createRequire(import.meta.url);
const TUI_PACKAGE_NAME = "@earendil-works/pi-tui";

/**
 * Overrides for resolving native-module candidate paths in tests or binaries.
 *
 * 覆盖模块 URL / execPath / 包解析。测独立二进制时用。
 */
export interface NativeModuleCandidateOptions {
	moduleUrl?: string;
	execPath?: string;
	resolvePackage?: (specifier: string) => string;
}

/**
 * List unique candidate paths for a native addon relative to this package.
 *
 * 去重后的候选绝对路径。装不上 npm 包时跳过那一条，不抛。
 */
export function getNativeModuleCandidates(nativePath: string, options: NativeModuleCandidateOptions = {}): string[] {
	const moduleDir = dirname(fileURLToPath(options.moduleUrl ?? import.meta.url));
	const candidates: string[] = [];

	try {
		const packageEntry = (options.resolvePackage ?? moduleRequire.resolve)(TUI_PACKAGE_NAME);
		candidates.push(join(dirname(packageEntry), "..", nativePath));
	} catch {
		// Standalone binaries do not have an installed TUI package.
	}

	candidates.push(
		join(moduleDir, "..", nativePath),
		join(moduleDir, nativePath),
		join(dirname(options.execPath ?? process.execPath), nativePath),
	);
	return Array.from(new Set(candidates));
}
