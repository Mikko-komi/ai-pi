/**
 * Shared no-op telemetry context for callers that omit a real adapter.
 *
 * 无操作上下文。callback 仍会跑；写事件/属性/状态全丢掉。
 */

import type { SpanOptions, TelemetryContext, TelemetrySpan } from "./index.ts";

function startNoopSpan<T>(_options: SpanOptions, callback: (span: TelemetrySpan) => T | Promise<T>): Promise<T> {
	try {
		return Promise.resolve(callback(noopTelemetrySpan));
	} catch (error) {
		return Promise.reject(error);
	}
}

const noopTelemetrySpan: TelemetrySpan = {
	startSpan: startNoopSpan,
	addEvent: () => {},
	setAttributes: () => {},
	setStatus: () => {},
};
Object.freeze(noopTelemetrySpan);

/**
 * Shared telemetry context used when an application does not provide one.
 *
 * 应用没注入适配器时用的共享实例。span 对象已 freeze。
 */
export const NOOP_TELEMETRY_CONTEXT: TelemetryContext = noopTelemetrySpan;
