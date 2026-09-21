/**
 * Operation-local AbortSignal helpers for public APIs.
 *
 * 给可选 signal 的公共 API 用。缺则造本地 signal；race 时 abort 仍继续观察被弃 promise。
 */

function abortReason(signal: AbortSignal): unknown {
	if (signal.reason !== undefined) return signal.reason;
	const error = new Error("The operation was aborted");
	error.name = "AbortError";
	return error;
}

/**
 * Normalize an optional public signal without imposing a deadline.
 *
 * 调用方没给 signal 就新建 AbortController。返回值一定存在，不设截止时间。
 */
export function operationSignal(signal?: AbortSignal): AbortSignal {
	return signal ?? new AbortController().signal;
}

/**
 * Stop waiting on abort while observing the abandoned operation through settlement.
 *
 * signal 先 abort 则拒掉这次等待，但被弃 promise 的后续拒绝必须被接住。缺 signal 则原样返回。
 */
export function raceWithAbortSignal<T>(operation: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
	if (!signal) return operation;
	if (signal.aborted) {
		void operation.catch(() => {});
		return Promise.reject(abortReason(signal));
	}

	return new Promise<T>((resolve, reject) => {
		let settled = false;
		const cleanup = () => signal.removeEventListener("abort", onAbort);
		const onAbort = () => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(abortReason(signal));
		};

		signal.addEventListener("abort", onAbort, { once: true });
		void operation.then(
			(value) => {
				if (settled) return;
				settled = true;
				cleanup();
				resolve(value);
			},
			(error: unknown) => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(error);
			},
		);
		if (signal.aborted) onAbort();
	});
}
