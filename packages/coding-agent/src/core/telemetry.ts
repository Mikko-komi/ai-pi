/**
 * Install-telemetry gate used before sending provider attribution headers.
 *
 * 安装遥测开关。环境变量优先于 settings；未设环境变量才读设置。
 */

import type { SettingsManager } from "./settings-manager.ts";

function isTruthyEnvFlag(value: string | undefined): boolean {
	if (!value) return false;
	return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

/**
 * Whether install telemetry (and default attribution headers) may run.
 *
 * 是否允许安装遥测。环境变量已出现则不再读 settings。
 */
export function isInstallTelemetryEnabled(
	settingsManager: SettingsManager,
	telemetryEnv: string | undefined = process.env.PI_TELEMETRY,
): boolean {
	return telemetryEnv !== undefined ? isTruthyEnvFlag(telemetryEnv) : settingsManager.getEnableInstallTelemetry();
}
