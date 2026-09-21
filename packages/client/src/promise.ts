/**
 * Promise.withResolvers polyfill for the repository TypeScript lib baseline.
 *
 * 可外解 Promise。基线升到 ES2024 后应删，改用语言自带。
 */

/**
 * Promise plus its resolve/reject functions, exposed for handshake waits.
 *
 * 外露 resolve/reject。只应结算一次。
 */
export interface PromiseResolvers<T> {
	promise: Promise<T>;
	resolve(value: T | PromiseLike<T>): void;
	reject(reason?: unknown): void;
}

/**
 * Remove in favor of `Promise.withResolvers()` when the repository's TypeScript lib baseline moves to ES2024.
 *
 * 造可外解 Promise。基线升到 ES2024 后应删，改用语言自带。
 */
export function createPromiseResolvers<T>(): PromiseResolvers<T> {
	let resolve!: PromiseResolvers<T>["resolve"];
	let reject!: PromiseResolvers<T>["reject"];
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}
