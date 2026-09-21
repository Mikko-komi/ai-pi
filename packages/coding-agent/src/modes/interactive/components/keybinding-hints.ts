/**
 * Utilities for formatting keybinding hints in the UI.
 *
 * 快捷键提示文案。macOS 把 `alt` 显示成 `option`。
 */

import { getKeybindings, type Keybinding, type KeyId } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";

/**
 * Display tweaks for raw key text.
 *
 * 按键文本选项。`capitalize` 只大写每段首字母。
 */
export interface KeyTextFormatOptions {
	capitalize?: boolean;
}

function formatKeyPart(part: string, options: KeyTextFormatOptions): string {
	const displayPart = process.platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part;
	return options.capitalize ? displayPart.charAt(0).toUpperCase() + displayPart.slice(1) : displayPart;
}

/**
 * Turn a `mod+key/alt` chord string into display text.
 *
 * 把 `ctrl+p/alt+p` 收成可读文本。斜杠是备选，加号是组合键。
 */
export function formatKeyText(key: string, options: KeyTextFormatOptions = {}): string {
	return key
		.split("/")
		.map((k) =>
			k
				.split("+")
				.map((part) => formatKeyPart(part, options))
				.join("+"),
		)
		.join("/");
}

function formatKeys(keys: KeyId[], options: KeyTextFormatOptions = {}): string {
	if (keys.length === 0) return "";
	return formatKeyText(keys.join("/"), options);
}

/**
 * Bound keys for a keybinding id, in lowercase display form.
 *
 * 某绑定当前生效的按键。未绑定时返回空串。
 */
export function keyText(keybinding: Keybinding): string {
	return formatKeys(getKeybindings().getKeys(keybinding));
}

/**
 * Bound keys with each segment capitalized.
 *
 * 同 {@link keyText}，但每段首字母大写，给标题式提示用。
 */
export function keyDisplayText(keybinding: Keybinding): string {
	return formatKeys(getKeybindings().getKeys(keybinding), { capitalize: true });
}

/**
 * Dim key plus muted description, using the live keybinding map.
 *
 * 绑定 id 对应的 `按键 说明`。颜色走 dim/muted。
 */
export function keyHint(keybinding: Keybinding, description: string): string {
	return theme.fg("dim", keyText(keybinding)) + theme.fg("muted", ` ${description}`);
}

/**
 * Dim key plus muted description for a raw chord string.
 *
 * 不查绑定表，直接格式化字面按键，给 ↑↓ 这类固定提示用。
 */
export function rawKeyHint(key: string, description: string): string {
	return theme.fg("dim", formatKeyText(key)) + theme.fg("muted", ` ${description}`);
}
