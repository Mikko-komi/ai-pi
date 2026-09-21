/**
 * Abortable timeout that rejects with the signal reason.
 *
 * 可 abort 的睡眠。signal 已 abort 立刻拒；超时后卸监听。
 */

/**
 * Wait `ms` milliseconds or reject with `signal.reason`.
 *
 * throwIfAborted 在进定时器前。abort 用 signal.reason 拒绝。
 */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		signal.throwIfAborted();
		const onAbort = () => {
			clearTimeout(timeout);
			reject(signal.reason);
		};
		const timeout = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
