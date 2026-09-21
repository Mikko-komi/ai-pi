/**
 * package.json "pi" manifest for bundled extensions, skills, prompts, and themes.
 *
 * 读 package.json 的 `pi` 字段。字段不是字符串数组就忽略，整文件坏了返回 null。
 */

import { readFileSync } from "node:fs";
import { stripBom } from "../utils/text.ts";

/**
 * Declared resource paths under package.json "pi".
 *
 * package.json `pi` 段声明的资源路径。缺字段表示这类资源没有。
 */
export interface PiManifest {
	extensions?: string[];
	skills?: string[];
	prompts?: string[];
	themes?: string[];
}

const RESOURCE_FIELDS = ["extensions", "skills", "prompts", "themes"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read and validate a package.json pi manifest.
 *
 * 读并校验 `pi` 段。解析失败或没有 `pi` 对象返回 null。
 */
export function readPiManifest(packageJsonPath: string): PiManifest | null {
	try {
		const pkg: unknown = JSON.parse(stripBom(readFileSync(packageJsonPath, "utf-8")));
		if (!isObject(pkg) || !isObject(pkg.pi)) {
			return null;
		}

		const manifest: PiManifest = {};
		for (const field of RESOURCE_FIELDS) {
			const entries = pkg.pi[field];
			if (Array.isArray(entries) && entries.every((entry) => typeof entry === "string")) {
				manifest[field] = entries;
			}
		}
		return manifest;
	} catch {
		return null;
	}
}
