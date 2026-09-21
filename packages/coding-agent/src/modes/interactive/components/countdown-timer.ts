/**
 * Reusable countdown timer for dialog components.
 *
 * 对话框倒计时。每秒 tick 并 requestRender；到 0 先 dispose 再 onExpire。
 */

import type { TUI } from "@earendil-works/pi-tui";

/**
 * One-second ticker that expires a dialog timeout.
 *
 * 秒级倒计时。dispose 清 interval；没有 tui 时仍走回调，只是不刷新画面。
 */
export class CountdownTimer {
	private intervalId: ReturnType<typeof setInterval> | undefined;
	private remainingSeconds: number;
	private tui: TUI | undefined;
	private onTick: (seconds: number) => void;
	private onExpire: () => void;

	constructor(timeoutMs: number, tui: TUI | undefined, onTick: (seconds: number) => void, onExpire: () => void) {
		this.tui = tui;
		this.onTick = onTick;
		this.onExpire = onExpire;
		this.remainingSeconds = Math.ceil(timeoutMs / 1000);
		this.onTick(this.remainingSeconds);

		this.intervalId = setInterval(() => {
			this.remainingSeconds--;
			this.onTick(this.remainingSeconds);
			this.tui?.requestRender();

			if (this.remainingSeconds <= 0) {
				this.dispose();
				this.onExpire();
			}
		}, 1000);
	}

	dispose(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}
}
