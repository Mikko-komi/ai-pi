/**
 * Relaxed JSON cleanup for settings and config files.
 *
 * 去掉 `//` 行注释和尾逗号。字符串字面量不动。
 */

/**
 * Strip `//` line comments and trailing commas from JSON, leaving string literals untouched.
 *
 * 只处理 `//`，不处理块注释。尾逗号只在 `}` / `]` 前。
 */
export function stripJsonComments(input: string): string {
	return input
		.replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*/g, (m) => (m[0] === '"' ? m : ""))
		.replace(/"(?:\\.|[^"\\])*"|,(\s*[}\]])/g, (m, tail) => tail ?? (m[0] === '"' ? m : ""));
}
