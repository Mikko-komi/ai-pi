/**
 * Empty vertical space in a TUI tree.
 *
 * 只占行、不画字。默认一行。
 */

import type { Component } from "../tui.ts";

/**
 * Spacer component that renders empty lines
 *
 * 渲染 `lines` 条空行。无缓存。
 */
export class Spacer implements Component {
	private lines: number;

	constructor(lines: number = 1) {
		this.lines = lines;
	}

	setLines(lines: number): void {
		this.lines = lines;
	}

	invalidate(): void {
		// No cached state to invalidate currently
	}

	render(_width: number): string[] {
		const result: string[] = [];
		for (let i = 0; i < this.lines; i++) {
			result.push("");
		}
		return result;
	}
}
