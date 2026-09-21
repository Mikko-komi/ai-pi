/**
 * One-line horizontal rule that stretches to the viewport width.
 *
 * 随宽度伸缩的横线。jiti 加载的扩展必须传入着色函数，全局 theme 可能是 undefined。
 */

import type { Component } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";

/**
 * Dynamic border component that adjusts to viewport width.
 *
 * Note: When used from extensions loaded via jiti, the global `theme` may be undefined
 * because jiti creates a separate module cache. Always pass an explicit color
 * function when using DynamicBorder in components exported for extension use.
 *
 * 画一行 `─`。默认用 `theme.fg("border")`；扩展场景务必显式传 color。
 */
export class DynamicBorder implements Component {
	private color: (str: string) => string;

	constructor(color: (str: string) => string = (str) => theme.fg("border", str)) {
		this.color = color;
	}

	invalidate(): void {
		// No cached state to invalidate currently
	}

	render(width: number): string[] {
		return [this.color("─".repeat(Math.max(1, width)))];
	}
}
