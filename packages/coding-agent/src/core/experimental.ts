/**
 * Process-wide experimental feature gate.
 *
 * 实验功能总开关。只有 `PI_EXPERIMENTAL=1` 才开，其他真值不算。
 */

/**
 * Whether experimental features are enabled for this process.
 *
 * 本进程是否打开实验功能。只认环境变量恰好为 `"1"`。
 */
export function areExperimentalFeaturesEnabled(): boolean {
	return process.env.PI_EXPERIMENTAL === "1";
}
