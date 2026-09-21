/**
 * Central timing instrumentation for startup profiling.
 * Enable with PI_TIMING=1 environment variable.
 *
 * 启动耗时探测。只有 `PI_TIMING=1` 才记账，其它值当关。
 */

const ENABLED = process.env.PI_TIMING === "1";
interface TimingNamespace {
	timings: Array<{ label: string; ms: number }>;
	lastTime: number;
}

type TimingLabel = "main" | "extensions";

const timingNamespaces = new Map<TimingLabel, TimingNamespace>();

/**
 * Start a timing namespace at now.
 *
 * 把某个命名空间的计时清零并从现在开始。未启用时是空操作。
 */
export function resetTimings(namespace: TimingLabel = "main"): void {
	if (!ENABLED) return;
	timingNamespaces.set(namespace, { timings: [], lastTime: Date.now() });
}

/**
 * Record elapsed milliseconds since the previous mark in a namespace.
 *
 * 记下距上一刻度的毫秒数。命名空间不存在会先 reset。
 */
export function time(label: string, namespace: TimingLabel = "main"): void {
	if (!ENABLED) return;
	const now = Date.now();

	if (!timingNamespaces.has(namespace)) {
		resetTimings(namespace);
	}

	const timingNamespace = timingNamespaces.get(namespace)!;
	timingNamespace.timings.push({ label, ms: now - timingNamespace.lastTime });
	timingNamespace.lastTime = now;
}

function printTimingGroup(title: string, timings: TimingNamespace["timings"]): void {
	const printableTimings = timings.filter((timing) => timing.ms >= 0);
	if (printableTimings.length === 0) return;
	console.error(`\n--- ${title} ---`);
	for (const t of printableTimings) {
		console.error(`  ${t.label}: ${t.ms}ms`);
	}
	console.error(`  TOTAL: ${printableTimings.reduce((a, b) => a + b.ms, 0)}ms`);
	console.error(`${"-".repeat(title.length + 8)}\n`);
}

/**
 * Print accumulated startup timings to stderr.
 *
 * 把各命名空间的启动耗时打到 stderr。未启用时是空操作。
 */
export function printTimings(): void {
	if (!ENABLED) return;
	for (const [namespace, timingNamespace] of timingNamespaces) {
		printTimingGroup(`Startup Timings: ${namespace}`, timingNamespace.timings);
	}
}
