/**
 * Merge optional AbortSignals and clean up the listeners used to combine them.
 *
 * 把多个可选 AbortSignal 合成一个。无信号则 cleanup 为空；单信号原样返回；多信号任一 abort 即停，cleanup 必须卸监听。
 */

/**
 * Combined signal plus the cleanup that removes merge listeners.
 *
 * 合成后的 signal 和卸监听的 cleanup。没有活跃源时 signal 可缺。
 */
export interface CombinedAbortSignal {
	signal?: AbortSignal;
	cleanup: () => void;
}

/**
 * Merge undefined-tolerant AbortSignals into one CombinedAbortSignal.
 *
 * 丢掉 undefined。0 个源无 signal；1 个源不包一层；多个源用新 controller，cleanup 卸掉全部监听。
 */
export function combineAbortSignals(signals: readonly (AbortSignal | undefined)[]): CombinedAbortSignal {
	const activeSignals = signals.filter((signal): signal is AbortSignal => signal !== undefined);
	if (activeSignals.length === 0) {
		return { cleanup: () => {} };
	}
	if (activeSignals.length === 1) {
		return { signal: activeSignals[0], cleanup: () => {} };
	}

	const controller = new AbortController();
	const listeners: Array<{ signal: AbortSignal; listener: () => void }> = [];
	const abort = (signal: AbortSignal) => {
		if (!controller.signal.aborted) {
			controller.abort(signal.reason);
		}
	};

	for (const signal of activeSignals) {
		if (signal.aborted) {
			abort(signal);
			break;
		}
		const listener = () => abort(signal);
		signal.addEventListener("abort", listener, { once: true });
		listeners.push({ signal, listener });
	}

	return {
		signal: controller.signal,
		cleanup: () => {
			for (const { signal, listener } of listeners) {
				signal.removeEventListener("abort", listener);
			}
		},
	};
}
