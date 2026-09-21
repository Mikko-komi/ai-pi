/**
 * Weak-map hook from a replicated-state object to its publish/subscribe internals.
 *
 * 复制状态的内部句柄。只给 provider 发现可远端暴露的 state；不是公共合同。
 */

import type { Op } from "../delta/index.ts";
import type { Context } from "../types.ts";

/**
 * Publisher-side internals: sequence, current value, flush, and op listeners.
 *
 * 生产者内部面。`publish` 冲出一批已解码 Op；监听者看到的是 ops 不是完整值。
 */
export interface ReplicatedStateInternals {
	readonly sequence: number;
	readonly value: unknown;
	publish(context: Context): void;
	subscribe(listener: (ops: readonly Op[], sequence: number, context: Context) => void): () => void;
}

const sources = new WeakMap<object, ReplicatedStateInternals>();

/**
 * Associate one object identity with its replicated-state internals.
 *
 * 按对象身份登记 internals。同一对象重复登记会覆盖。
 */
export function registerReplicatedStateInternals(value: object, internals: ReplicatedStateInternals): void {
	sources.set(value, internals);
}

/**
 * Look up internals for a candidate service member. Non-objects yield undefined.
 *
 * 按对象身份取 internals。非对象或未登记返回 undefined。
 */
export function getReplicatedStateInternals(value: unknown): ReplicatedStateInternals | undefined {
	if (typeof value !== "object" || value === null) return undefined;
	return sources.get(value);
}
