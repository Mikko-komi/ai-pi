/**
 * Retry deadline arithmetic and abortable waits.
 *
 * 算重试最早时刻，并等到该时刻或 abort。溢出夹到安全整数；定时器切片避免 32 位溢出。
 */

import { type RetryPolicy, retryDelayMs } from "@earendil-works/pi-ai";

/**
 * Earliest retry timestamp from policy, attempt, and now.
 *
 * 策略+attempt → 最早重试时刻。加法溢出夹到 MAX_SAFE_INTEGER。
 */
export function retryNotBefore(
	policy: Pick<RetryPolicy, "baseDelayMs" | "maxAgentDelayMs">,
	attempt: number,
	now = Date.now(),
): number {
	const sum = now + retryDelayMs(policy, attempt);
	return Number.isSafeInteger(sum) ? sum : Number.MAX_SAFE_INTEGER;
}

/**
 * Wait until notBefore or reject when the abort signal fires.
 *
 * 等到 notBefore 或 abort。定时器按剩余时间切片，避免一次 setTimeout 溢出。
 */
export function waitUntil(notBefore: number, signal: AbortSignal): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const cleanup = () => {
			if (timer !== undefined) clearTimeout(timer);
			signal.removeEventListener("abort", onAbort);
		};
		const onAbort = () => {
			cleanup();
			reject(signal.reason);
		};
		const check = () => {
			const remaining = notBefore - Date.now();
			if (remaining <= 0) {
				cleanup();
				resolve();
				return;
			}
			timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		if (signal.aborted) onAbort();
		else check();
	});
}
