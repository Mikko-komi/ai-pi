/**
 * Build the project-trust UI adapter used during CLI startup.
 *
 * 启动时给项目信任探测的 UI 适配。非 interactive 或没有 UI 时选择/输入直接空过。
 */

import chalk from "chalk";
import type { ProjectTrustContext } from "../core/extensions/types.ts";
import type { AppMode } from "../core/project-trust.ts";
import type { SettingsManager } from "../core/settings-manager.ts";
import { showStartupInput, showStartupSelector } from "./startup-ui.ts";

/**
 * Map CLI mode onto {@link ProjectTrustContext} dialogs.
 *
 * 把 CLI 模式映射成信任对话框。interactive 才弹 TUI；其它模式 notify 打到 stderr。
 */
export function createProjectTrustContext(options: {
	cwd: string;
	mode: AppMode;
	settingsManager: SettingsManager;
	hasUI: boolean;
}): ProjectTrustContext {
	return {
		cwd: options.cwd,
		mode: options.mode === "interactive" ? "tui" : options.mode,
		hasUI: options.hasUI,
		ui: {
			select: async (title, selectOptions) => {
				if (!options.hasUI) {
					return undefined;
				}
				if (options.mode !== "interactive") {
					return undefined;
				}
				return showStartupSelector(
					options.settingsManager,
					title,
					selectOptions.map((option) => ({ label: option, value: option })),
				);
			},
			confirm: async (title, message) => {
				if (!options.hasUI) {
					return false;
				}
				if (options.mode !== "interactive") {
					return false;
				}
				return (
					(await showStartupSelector(options.settingsManager, `${title}\n${message}`, [
						{ label: "Yes", value: true },
						{ label: "No", value: false },
					])) ?? false
				);
			},
			input: async (title, placeholder) => {
				if (!options.hasUI) {
					return undefined;
				}
				if (options.mode !== "interactive") {
					return undefined;
				}
				return showStartupInput(options.settingsManager, title, placeholder);
			},
			notify: (message, type = "info") => {
				if (options.mode !== "interactive") {
					const color = type === "error" ? chalk.red : type === "warning" ? chalk.yellow : chalk.cyan;
					console.error(color(message));
				}
			},
		},
	};
}
