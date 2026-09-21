/**
 * {@link Loader} that aborts an attached {@link AbortSignal} on cancel.
 *
 * Escape（`tui.select.cancel`）abort 一次。调用方用 `signal` 取消异步活。
 */

import { getKeybindings } from "../keybindings.ts";
import { Loader } from "./loader.ts";

/**
 * Loader that can be cancelled with Escape.
 * Extends Loader with an AbortSignal for cancelling async operations.
 *
 * @example
 * const loader = new CancellableLoader(tui, cyan, dim, "Working...");
 * loader.onAbort = () => done(null);
 * doWork(loader.signal).then(done);
 *
 * 可取消 Loader。Escape 触发 abort 与 `onAbort`；`dispose` 只停动画。
 */
export class CancellableLoader extends Loader {
	private abortController = new AbortController();

	/** Called when user presses Escape */
	onAbort?: () => void;

	/** AbortSignal that is aborted when user presses Escape */
	get signal(): AbortSignal {
		return this.abortController.signal;
	}

	/** Whether the loader was aborted */
	get aborted(): boolean {
		return this.abortController.signal.aborted;
	}

	handleInput(data: string): void {
		const kb = getKeybindings();
		if (kb.matches(data, "tui.select.cancel")) {
			this.abortController.abort();
			this.onAbort?.();
		}
	}

	dispose(): void {
		this.stop();
	}
}
