/**
 * TUI config selector for `pi config` command
 *
 * `pi config` 的资源开关 TUI。关掉选择器才 resolve；强制退出走 `process.exit(0)`。
 */

import { ProcessTerminal, type TUI, TuiMainScreen } from "@earendil-works/pi-tui";
import type { SettingsManager } from "../core/settings-manager.ts";
import { ConfigSelectorComponent, type ScopedResolvedPaths } from "../modes/interactive/components/config-selector.ts";
import { initTheme, stopThemeWatcher } from "../modes/interactive/theme/theme.ts";

/**
 * Inputs for {@link selectConfig}.
 *
 * 打开配置选择器所需的路径和 settings。`writeScope` 决定这次写全局还是项目。
 */
export interface ConfigSelectorOptions {
	resolvedPaths: ScopedResolvedPaths;
	settingsManager: SettingsManager;
	cwd: string;
	agentDir: string;
	writeScope: "global" | "project";
	projectModeAvailable: boolean;
}

/**
 * Show TUI config selector and return when closed
 *
 * 打开配置 TUI 并等到关闭。主题 watcher 在 resolve 或 exit 时停掉。
 */
export async function selectConfig(options: ConfigSelectorOptions): Promise<void> {
	// Initialize theme before showing TUI
	initTheme(options.settingsManager.getTheme(), true);

	return new Promise((resolve) => {
		const ui: TUI = new TuiMainScreen(
			new ProcessTerminal(),
			options.settingsManager.getShowHardwareCursor(),
			options.agentDir,
		);
		ui.setClearOnShrink(options.settingsManager.getClearOnShrink());
		let resolved = false;

		const selector = new ConfigSelectorComponent(
			options.resolvedPaths,
			options.settingsManager,
			options.cwd,
			options.agentDir,
			() => {
				if (!resolved) {
					resolved = true;
					ui.stop();
					stopThemeWatcher();
					resolve();
				}
			},
			() => {
				ui.stop();
				stopThemeWatcher();
				process.exit(0);
			},
			() => ui.requestRender(),
			ui.terminal.rows,
			options.writeScope,
			options.projectModeAvailable,
		);

		ui.addChild(selector);
		ui.setFocus(selector.getResourceList());
		ui.start();
	});
}
