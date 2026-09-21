/**
 * Working, retry, compaction, and idle status lines for the TUI.
 *
 * 交互态状态行。kind 区分工作/重试/压缩/分支摘要；空闲占两行空白。
 */

import { type Component, Loader, type TUI, truncateToWidth } from "@earendil-works/pi-tui";
import type { WorkingIndicatorOptions } from "../../../core/extensions/index.ts";
import { theme } from "../theme/theme.ts";
import { CountdownTimer } from "./countdown-timer.ts";
import { keyText } from "./keybinding-hints.ts";

/**
 * Which busy status the footer or editor border is showing.
 *
 * 忙碌状态种类。决定颜色和文案，不决定动画实现。
 */
export type StatusIndicatorKind = "working" | "retry" | "compaction" | "branchSummary";

/**
 * Spinner plus message, tagged with a {@link StatusIndicatorKind}.
 *
 * 带 kind 的 Loader。`renderInBorder` 去掉左右空格再按宽度截断。
 */
export class StatusIndicator extends Loader {
	readonly kind: StatusIndicatorKind;

	constructor(
		kind: StatusIndicatorKind,
		ui: TUI,
		spinnerColorFn: (str: string) => string,
		messageColorFn: (str: string) => string,
		message: string,
		indicator?: WorkingIndicatorOptions,
	) {
		super(ui, spinnerColorFn, messageColorFn, message, indicator);
		this.kind = kind;
	}

	renderInBorder(width: number): string {
		const line = super.render(width + 2)[1] ?? "";
		return truncateToWidth(line.startsWith(" ") ? line.slice(1).trimEnd() : line.trimEnd(), width, "");
	}

	renderSpinnerInBorder(width: number): string {
		return truncateToWidth(this.getRenderedIndicator(), width, "");
	}

	dispose(): void {
		this.stop();
	}
}

/**
 * Accent-colored spinner while the agent is working.
 *
 * 正在工作的状态。默认用 accent/muted；可传入统一着色函数。
 */
export class WorkingStatusIndicator extends StatusIndicator {
	constructor(ui: TUI, message: string, indicator?: WorkingIndicatorOptions, colorFn?: (text: string) => string) {
		super(
			"working",
			ui,
			colorFn ?? ((text) => theme.fg("accent", text)),
			colorFn ?? ((text) => theme.fg("muted", text)),
			message,
			indicator,
		);
	}
}

/**
 * Warning-colored retry countdown with cancel hint.
 *
 * 重试倒计时。秒数写进 message；到期停表，dispose 会清 CountdownTimer。
 */
export class RetryStatusIndicator extends StatusIndicator {
	private countdown: CountdownTimer | undefined;

	constructor(ui: TUI, attempt: number, maxAttempts: number, delayMs: number) {
		const retryMessage = (seconds: number) =>
			`Retrying (${attempt}/${maxAttempts}) in ${seconds}s... (${keyText("app.interrupt")} to cancel)`;
		super(
			"retry",
			ui,
			(spinner) => theme.fg("warning", spinner),
			(text) => theme.fg("muted", text),
			retryMessage(Math.ceil(delayMs / 1000)),
		);
		this.countdown = new CountdownTimer(
			delayMs,
			ui,
			(seconds) => {
				this.setMessage(retryMessage(seconds));
			},
			() => {
				this.countdown = undefined;
			},
		);
	}

	override dispose(): void {
		this.countdown?.dispose();
		this.countdown = undefined;
		super.dispose();
	}
}

/**
 * Why compaction started: user, threshold, or overflow.
 *
 * 压缩触发原因。overflow 文案会多一句 context overflow。
 */
export type CompactionStatusReason = "manual" | "threshold" | "overflow";

/**
 * Compaction spinner; label depends on {@link CompactionStatusReason}.
 *
 * 上下文压缩中。manual 写 Compacting，其余写 Auto-compacting。
 */
export class CompactionStatusIndicator extends StatusIndicator {
	constructor(ui: TUI, reason: CompactionStatusReason) {
		const cancelHint = `(${keyText("app.interrupt")} to cancel)`;
		const label =
			reason === "manual"
				? `Compacting context... ${cancelHint}`
				: `${reason === "overflow" ? "Context overflow detected, " : ""}Auto-compacting... ${cancelHint}`;
		super(
			"compaction",
			ui,
			(spinner) => theme.fg("accent", spinner),
			(text) => theme.fg("muted", text),
			label,
		);
	}
}

/**
 * Spinner shown while a branch is being summarized.
 *
 * 分支摘要进行中。文案固定，带中断快捷键提示。
 */
export class BranchSummaryStatusIndicator extends StatusIndicator {
	constructor(ui: TUI) {
		super(
			"branchSummary",
			ui,
			(spinner) => theme.fg("accent", spinner),
			(text) => theme.fg("muted", text),
			`Summarizing branch... (${keyText("app.interrupt")} to cancel)`,
		);
	}
}

/**
 * Two blank lines used when no status spinner is active.
 *
 * 空闲占位。永远两行空格，宽度跟终端走，不缓存。
 */
export class IdleStatus implements Component {
	invalidate(): void {
		// No cached state to invalidate.
	}

	render(width: number): string[] {
		const emptyLine = " ".repeat(width);
		return [emptyLine, emptyLine];
	}
}
