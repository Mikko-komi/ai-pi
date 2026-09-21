/**
 * Best-effort native modifier-key queries for terminals that omit modifiers.
 *
 * 问原生层修饰键是否按下。没有 helper 或调用失败当没按。
 */

import { getNativePlatformHelper, type ModifierKey } from "./native-platform.ts";

export type { ModifierKey } from "./native-platform.ts";

/**
 * Query whether a native modifier is currently pressed.
 *
 * 当前是否按下该修饰键。不可用一律 false，不抛给调用方。
 */
export function isNativeModifierPressed(key: ModifierKey): boolean {
	const helper = getNativePlatformHelper();
	if (!helper?.isModifierPressed) return false;
	try {
		return helper.isModifierPressed(key) === true;
	} catch {
		return false;
	}
}
