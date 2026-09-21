/**
 * Startup validation and defaults for harness configuration.
 *
 * Harness 启动时的默认值和校验。非法配置立刻抛，不带病运行。
 */

import { DEFAULT_MAX_AGENT_RETRY_DELAY_MS, type RetryPolicy } from "@earendil-works/pi-ai";
import type { CompactionSettings } from "./compaction/compaction.ts";

/**
 * Default retry policy used by the harness.
 *
 * 默认瞬时失败重试策略。调用方没覆盖就用这组。
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
	enabled: true,
	maxRetries: 3,
	baseDelayMs: 1_000,
	maxAgentDelayMs: DEFAULT_MAX_AGENT_RETRY_DELAY_MS,
};

/**
 * Reject duplicate tool names.
 *
 * 工具名必须唯一。重复立刻抛 TypeError。
 */
export function validateToolNames(tools: readonly { name: string }[]): void {
	const names = new Set<string>();
	for (const tool of tools) {
		if (names.has(tool.name)) throw new TypeError(`Duplicate tool name: ${JSON.stringify(tool.name)}`);
		names.add(tool.name);
	}
}

/**
 * Reject retry policies with non-finite or negative integer fields.
 *
 * 重试次数和延迟必须是非负安全整数。非法立刻抛 RangeError。
 */
export function validateRetryPolicy(policy: RetryPolicy): void {
	if (
		!Number.isSafeInteger(policy.maxRetries) ||
		policy.maxRetries < 0 ||
		policy.maxRetries === Number.MAX_SAFE_INTEGER ||
		!Number.isSafeInteger(policy.baseDelayMs) ||
		policy.baseDelayMs < 0 ||
		(policy.maxAgentDelayMs !== undefined &&
			(!Number.isSafeInteger(policy.maxAgentDelayMs) || policy.maxAgentDelayMs < 0))
	) {
		throw new RangeError("Retry policy values must be finite non-negative safe integers");
	}
}

/**
 * Reject compaction settings with non-finite or negative token counts.
 *
 * 压缩预算必须是非负安全整数。非法立刻抛 RangeError。
 */
export function validateCompactionSettings(settings: CompactionSettings): void {
	if (
		!Number.isSafeInteger(settings.reserveTokens) ||
		settings.reserveTokens < 0 ||
		!Number.isSafeInteger(settings.keepRecentTokens) ||
		settings.keepRecentTokens < 0
	) {
		throw new RangeError("Compaction token counts must be finite non-negative safe integers");
	}
}
