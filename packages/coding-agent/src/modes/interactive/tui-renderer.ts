/**
 * Interactive TUI factory shared by coding-agent presentations.
 *
 * 交互 TUI 组装点。fullscreen 走 AltScreen，regular 走 MainScreen；主题查询走当前全局 theme。
 */

import type { Terminal } from "@earendil-works/pi-tui";
import { ProcessTerminal, type TUI, TuiAltScreen, TuiMainScreen } from "@earendil-works/pi-tui";
import { copyToClipboard } from "../../utils/clipboard.ts";
import { openBrowser } from "../../utils/open-browser.ts";
import { keyDisplayText } from "./components/keybinding-hints.ts";
import { theme } from "./theme/theme.ts";

/**
 * Options for {@link createInteractiveTui}.
 *
 * 建 TUI 的输入。`tuiMode` 决定具体类；缺 terminal 时用 ProcessTerminal。
 */
export interface InteractiveTuiOptions {
	readonly tuiMode: "regular" | "fullscreen";
	readonly showHardwareCursor: boolean;
	readonly logDirectory: string;
	readonly terminal?: Terminal;
	readonly onRightClickPaste?: () => void;
	readonly fullscreenCopyOnSelect?: boolean;
}

/**
 * Composition root shared by coding-agent presentations.
 *
 * 按 `tuiMode` 建具体 TUI。fullscreen 才装搜索样式、点选复制和打开 URL。
 */
export function createInteractiveTui(options: InteractiveTuiOptions & { readonly tuiMode: "fullscreen" }): TuiAltScreen;
export function createInteractiveTui(options: InteractiveTuiOptions & { readonly tuiMode: "regular" }): TuiMainScreen;
export function createInteractiveTui(options: InteractiveTuiOptions): TuiMainScreen | TuiAltScreen;
export function createInteractiveTui(options: InteractiveTuiOptions): TuiMainScreen | TuiAltScreen {
	const terminal = options.terminal ?? new ProcessTerminal();
	if (options.tuiMode === "fullscreen") {
		const styleSearchMatch = (text: string) => theme.bg("searchMatchBg", theme.fg("searchMatchText", text));
		return new TuiAltScreen(terminal, options.showHardwareCursor, options.logDirectory, {
			searchMatchStyle: (text) => theme.underline(styleSearchMatch(text)),
			searchCurrentMatchStyle: (text) => theme.bold(theme.inverse(styleSearchMatch(text))),
			searchNavigationButtonStyle: (text, hovered) => (hovered ? theme.underline(text) : text),
			scrollToEndIndicator: () => {
				const shortcut = keyDisplayText("tui.altScreen.bottom");
				const label = ` ↓ Jump to latest message${shortcut ? ` · ${shortcut}` : ""} `;
				return theme.bg("selectedBg", theme.fg("text", label));
			},
			openUrl: openBrowser,
			onRightClickPaste: options.onRightClickPaste,
			copyOnSelect: options.fullscreenCopyOnSelect,
			copySelection: async (text) => {
				try {
					await copyToClipboard(text);
					return true;
				} catch {
					return false;
				}
			},
		});
	}
	return new TuiMainScreen(terminal, options.showHardwareCursor, options.logDirectory);
}

/**
 * Stable reference for components while InteractiveMode replaces the active renderer.
 *
 * 指向当前 TUI 的稳定代理。方法每次调用都解析最新实例，避免换屏后持有旧对象。
 */
export function createInteractiveTuiReference(getTui: () => TUI): TUI {
	return new Proxy({} as TUI, {
		get: (_target, property) => {
			const tui = getTui();
			const value = Reflect.get(tui, property, tui);
			if (typeof value !== "function") return value;
			let methodTui = tui;
			let method = value;
			return (...args: unknown[]) => {
				const currentTui = getTui();
				if (currentTui !== methodTui) {
					const currentMethod = Reflect.get(currentTui, property, currentTui);
					if (typeof currentMethod !== "function") {
						throw new TypeError(`TUI property ${String(property)} is not callable`);
					}
					methodTui = currentTui;
					method = currentMethod;
				}
				return Reflect.apply(method, methodTui, args);
			};
		},
		set: (_target, property, value) => {
			const tui = getTui();
			return Reflect.set(tui, property, value, tui);
		},
		has: (_target, property) => Reflect.has(getTui(), property),
		getPrototypeOf: () => Reflect.getPrototypeOf(getTui()),
	});
}
