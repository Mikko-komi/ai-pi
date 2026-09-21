/**
 * Path helpers for the built-in file tools.
 *
 * 内置文件工具的路径解析。先规范化再交给 ExecutionEnv。
 */

import type { Context } from "../context.ts";
import type { ExecutionEnv } from "../types.ts";
import { getOrThrow } from "../types.ts";

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const NARROW_NO_BREAK_SPACE = "\u202F";

function normalizeToolPath(path: string): string {
	const normalized = path.replace(UNICODE_SPACES, " ");
	return normalized.startsWith("@") ? normalized.slice(1) : normalized;
}

/**
 * Normalize a tool path and resolve it against the execution environment.
 *
 * 规范化工具路径并解析成绝对路径。Unicode 空白收成普通空格；前导 @ 去掉。
 */
export async function resolveToolPath(env: ExecutionEnv, path: string, context: Context): Promise<string> {
	return getOrThrow(await env.absolutePath(normalizeToolPath(path), context));
}

/**
 * Resolve a read path, trying macOS screenshot and Unicode filename variants.
 *
 * 读路径解析。先试规范化结果，再试 macOS 截图空格、NFD 和弯引号变体。
 */
export async function resolveReadToolPath(env: ExecutionEnv, path: string, context: Context): Promise<string> {
	const resolved = await resolveToolPath(env, path, context);
	const variants = [
		resolved,
		resolved.replace(/ (AM|PM)\./gi, `${NARROW_NO_BREAK_SPACE}$1.`),
		resolved.normalize("NFD"),
		resolved.replace(/'/g, "\u2019"),
		resolved.normalize("NFD").replace(/'/g, "\u2019"),
	];

	for (const variant of new Set(variants)) {
		if (getOrThrow(await env.exists(variant, context))) return variant;
	}
	return resolved;
}
