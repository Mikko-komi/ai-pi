/**
 * Chord context helpers plus the telemetry parent key used by the harness.
 *
 * 把 Chord 的 Context 接到 harness。未挂遥测时退回共享 no-op，不新建空实现。
 */

import type { Context, ContextKey } from "@earendil-works/chord";
import {
	awaitWithContext,
	BACKGROUND_CONTEXT,
	createContextKey,
	TODO_CONTEXT,
	withAbortSignal,
	withCancel,
	withContextValue,
	withoutAbortSignal,
} from "@earendil-works/chord/context";
import { NOOP_TELEMETRY_CONTEXT, type TelemetryContext } from "@earendil-works/pi-telemetry";

export {
	awaitWithContext,
	BACKGROUND_CONTEXT,
	type Context,
	type ContextKey,
	createContextKey,
	TODO_CONTEXT,
	withAbortSignal,
	withCancel,
	withContextValue,
	withoutAbortSignal,
};

const TELEMETRY_CONTEXT_KEY = createContextKey<TelemetryContext>("pi.telemetryContext");

/**
 * Return the telemetry parent attached to a context, or the shared no-op parent.
 *
 * 取出 context 上的遥测父级；没有就用共享 no-op。
 */
export function getTelemetryContext(context: Context): TelemetryContext {
	return context.value(TELEMETRY_CONTEXT_KEY) ?? NOOP_TELEMETRY_CONTEXT;
}

/**
 * Derive a context whose telemetry children use the supplied parent or active span.
 *
 * 给 context 挂上遥测父级，后续子 span 都挂在它下面。
 */
export function withTelemetryContext(telemetryContext: TelemetryContext, context: Context): Context {
	return withContextValue(TELEMETRY_CONTEXT_KEY, telemetryContext, context);
}
