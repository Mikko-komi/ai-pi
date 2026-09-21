/**
 * Shared context required by the built-in execution tools.
 *
 * 内置执行工具共用的文件系统和 shell 上下文。
 */

import type { ExecutionEnv } from "../types.ts";

/**
 * Filesystem and shell context required by the built-in execution tools.
 *
 * 内置执行工具需要的 env。没有 env 就不能解析路径或跑 shell。
 */
export interface ExecutionToolContext {
	env: ExecutionEnv;
}
