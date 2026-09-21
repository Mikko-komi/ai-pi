/**
 * Once-per-message deprecation warnings for CLI and config migrations.
 *
 * 同一 message 只打一次。测试用 clear 清空集合。
 */

import chalk from "chalk";

const emittedDeprecationWarnings = new Set<string>();

/**
 * Warn once for a deprecation message.
 *
 * 已发过的 message 静默。输出走 console.warn。
 */
export function warnDeprecation(message: string): void {
	if (emittedDeprecationWarnings.has(message)) return;
	emittedDeprecationWarnings.add(message);
	console.warn(chalk.yellow(`Deprecation warning: ${message}`));
}

/**
 * Clear deprecation warning state. Exported for tests.
 *
 * 只清已发集合。测试之间隔离用。
 */
export function clearDeprecationWarningsForTests(): void {
	emittedDeprecationWarnings.clear();
}
