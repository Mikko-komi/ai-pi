/**
 * Public testing entry: adapter conformance cases and fixture types.
 *
 * 测试入口。再导出符合性用例工厂和夹具类型，本文件不定义符号。
 */

export { createTelemetryAdapterConformance } from "./conformance.ts";
export type {
	TelemetryAdapterConformanceCase,
	TelemetryAdapterFixture,
	TelemetryAdapterFixtureFactory,
} from "./types.ts";
