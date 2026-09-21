/**
 * Go-like context helpers: keys, values, cancellation, and promise waiters.
 *
 * 调用范围 Context。必须显式传递；取消只影响派生 waiter，不取消底层 promise。
 */

import type { Context, ContextKey } from "../types.ts";

const ABORT_SIGNAL_CONTEXT_KEY: ContextKey<AbortSignal | undefined> = Object.freeze({
	token: Symbol("chord.abortSignal"),
});

abstract class BaseContext implements Context {
	abstract value<T>(key: ContextKey<T>): T | undefined;
	abstract toString(): string;

	get abortSignal(): AbortSignal | undefined {
		return this.value(ABORT_SIGNAL_CONTEXT_KEY);
	}
}

class EmptyContext extends BaseContext {
	readonly #name: string;

	constructor(name: string) {
		super();
		this.#name = name;
	}

	value<T>(_key: ContextKey<T>): T | undefined {
		return undefined;
	}

	toString(): string {
		return this.#name;
	}
}

class ContextValue<T> extends BaseContext {
	readonly #parent: Context;
	readonly #key: ContextKey<T>;
	readonly #value: T;

	constructor(parent: Context, key: ContextKey<T>, value: T) {
		super();
		this.#parent = parent;
		this.#key = key;
		this.#value = value;
	}

	value<Value>(key: ContextKey<Value>): Value | undefined {
		if (key.token === this.#key.token) return this.#value as unknown as Value;
		return this.#parent.value(key);
	}

	toString(): string {
		return `${this.#parent}.WithValue(${this.#key.token.description ?? "anonymous"})`;
	}
}

/**
 * Empty root context with no values and no cancellation.
 *
 * 空根上下文。无值、无 abort；后台任务和合成投递用它。
 */
export const BACKGROUND_CONTEXT: Context = new EmptyContext("[Context BACKGROUND_CONTEXT]");

/**
 * Empty placeholder context for unfinished call sites.
 *
 * 占位空上下文。语义与 BACKGROUND 相同，只是名字标明调用点还没选对 Context。
 */
export const TODO_CONTEXT: Context = new EmptyContext("[Context TODO_CONTEXT]");

/**
 * Create a typed context key with a unique symbol token.
 *
 * 新建带唯一 symbol 的 ContextKey。description 只进 toString，不参与比较。
 */
export function createContextKey<T>(description: string): ContextKey<T> {
	return Object.freeze({ token: Symbol(description) });
}

/**
 * Derive a context containing one additional or replaced value.
 *
 * 派生一层值。同 token 覆盖父值；父 Context 本身不变。
 */
export function withContextValue<T>(key: ContextKey<T>, value: T, parent: Context): Context {
	return new ContextValue(parent, key, value);
}

/**
 * Derive a context cancelled by either the parent signal or the supplied signal.
 * The parent context remains unchanged.
 *
 * 合并取消。父 Context 不变；任一信号 abort 即取消派生上下文。
 */
export function withAbortSignal(signal: AbortSignal, context: Context): Context {
	const parentSignal = context.abortSignal;
	const combined = parentSignal === undefined ? signal : AbortSignal.any([parentSignal, signal]);
	return withContextValue(ABORT_SIGNAL_CONTEXT_KEY, combined, context);
}

/**
 * Derive a context retaining all values except caller cancellation. Intended for mandatory cleanup only.
 *
 * 去掉取消信号，其它值保留。只给必须跑完的清理用，不能当普通调用上下文。
 */
export function withoutAbortSignal(context: Context): Context {
	return withContextValue(ABORT_SIGNAL_CONTEXT_KEY, undefined, context);
}

/**
 * Derive an independently cancellable child context.
 *
 * 独立可取消的子上下文。`cancel` 只 abort 这个孩子，不动父信号。
 */
export function withCancel(context: Context): {
	readonly context: Context;
	readonly cancel: (reason?: unknown) => void;
} {
	const controller = new AbortController();
	return {
		context: withAbortSignal(controller.signal, context),
		cancel: (reason?: unknown) => controller.abort(reason),
	};
}

/**
 * Observe a promise until it settles or the invocation is cancelled.
 * Cancellation rejects only this waiter; it does not cancel the underlying promise.
 *
 * 等到 promise 结束或 Context 取消。取消只拒这次等待，底层 promise 继续跑。
 */
export function awaitWithContext<T>(promise: Promise<T>, context: Context): Promise<T> {
	const signal = context.abortSignal;
	if (signal === undefined) return promise;
	if (signal.aborted) return Promise.reject(abortError(signal));
	return new Promise<T>((resolve, reject) => {
		const onAbort = (): void => reject(abortError(signal));
		signal.addEventListener("abort", onAbort, { once: true });
		void promise.then(
			(value) => {
				signal.removeEventListener("abort", onAbort);
				resolve(value);
			},
			(error: unknown) => {
				signal.removeEventListener("abort", onAbort);
				reject(error);
			},
		);
	});
}

function abortError(signal: AbortSignal): Error {
	const reason: unknown = signal.reason;
	return reason instanceof Error ? reason : new DOMException("The operation was aborted", "AbortError");
}
