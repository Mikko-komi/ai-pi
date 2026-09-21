/**
 * Fixture and case contracts for telemetry adapter conformance.
 *
 * 符合性夹具合同。每个用例拿一份隔离的 adapter 实例。
 */

import type { TelemetryContext } from "../index.ts";
import type { RecordedTelemetrySpan } from "../memory.ts";

/**
 * A fresh adapter instance and normalized snapshot reader owned by one conformance case.
 *
 * 一个用例独占的适配器加快照读取。用完必须 dispose。
 */
export interface TelemetryAdapterFixture extends AsyncDisposable {
	readonly context: TelemetryContext;
	getSpans(): Promise<readonly RecordedTelemetrySpan[]>;
}

/**
 * Creates an isolated adapter fixture for one conformance case.
 *
 * 给单个符合性用例造隔离夹具。每次调用新实例。
 */
export type TelemetryAdapterFixtureFactory = () => Promise<TelemetryAdapterFixture>;

/**
 * A runner-independent conformance case that can be registered with any test framework.
 *
 * 与测试框架无关的用例。group/name 只分类；run 自己管夹具生命周期。
 */
export interface TelemetryAdapterConformanceCase {
	readonly group: string;
	readonly name: string;
	run(): Promise<void>;
}
