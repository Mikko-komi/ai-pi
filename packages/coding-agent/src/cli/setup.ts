/**
 * Process-wide CLI bootstrap: title, env flags, and the HTTP dispatcher.
 *
 * 进程级 CLI 引导。设标题和环境旗标，并在发请求前装好 HTTP dispatcher。
 */

import { APP_NAME } from "../config.ts";
import { configureHttpDispatcher } from "../core/http-dispatcher.ts";

/**
 * Mark this process as the coding-agent CLI and silence Node warnings.
 *
 * 把本进程标成 coding-agent CLI，并关掉 `process.emitWarning`。HTTP 设置仍等 SettingsManager。
 */
export function setupCli(): void {
	process.title = APP_NAME;
	process.env.PI_CODING_AGENT = "true";
	process.env.AI_AGENT = "pi";
	process.emitWarning = (() => {}) as typeof process.emitWarning;

	// Configure undici before provider SDKs issue requests. Settings are applied
	// once SettingsManager has loaded global/project configuration.
	configureHttpDispatcher();
}
