/**
 * Abortable timeout helper.
 *
 * 可 abort 的睡眠。已 abort 立刻拒；超时后清定时器。
 */

/**
 * Sleep helper that respects abort signal.
 *
 * 无 signal 就纯 sleep。abort 拒绝 Error("Aborted")，不是 signal.reason。
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error("Aborted"));
			return;
		}

		const timeout = setTimeout(resolve, ms);

		signal?.addEventListener("abort", () => {
			clearTimeout(timeout);
			reject(new Error("Aborted"));
		});
	});
}
