/**
 * Cartesian eval table: baseline and candidates × repetitions.
 *
 * 展开 baseline/candidate 与 repetition 的笛卡尔表。每行 harness 会写入迭代 artifact。
 */

import { createHash } from "node:crypto";
import {
	attachHarnessRunToError,
	getHarnessRunFromError,
	type Harness,
	type HarnessRun,
	type JsonValue,
} from "vitest-evals/harness";

/**
 * Artifact key for the current eval-table iteration identity.
 *
 * 表迭代身份的 artifact 键。reporter 靠它把 run 对齐到对照分组。
 */
export const EVAL_HARNESS_ITERATION_ARTIFACT = "vitestEvalsHarnessIteration";

/**
 * Identity of one harness iteration inside an eval table.
 *
 * 一次表迭代的身份。`schemaVersion` 固定为 1；`groupKey` 由输入和 repetition 派生。
 */
export type EvalHarnessIterationArtifact = {
	schemaVersion: 1;
	evalSet: string;
	groupKey: string;
	harness: string;
	baseline: string;
	candidates: string[];
	repetition: number;
};

/**
 * One table cell: a harness wrapper plus its display name and repetition.
 *
 * 表的一行。`harness` 已包上迭代 artifact，不是原始 harness。
 */
export type EvalHarnessTableRow<TInput, TOutput extends JsonValue | undefined> = {
	harness: Harness<TInput, TOutput>;
	name: string;
	repetition: number;
};

/**
 * Two-harness table: one baseline and one candidate.
 *
 * 单 candidate 的表选项。`repetitions` 缺省走环境变量或 1。
 */
export type EvalHarnessTablePairOptions<TInput, TOutput extends JsonValue | undefined> = {
	baseline: Harness<TInput, TOutput>;
	candidate: Harness<TInput, TOutput>;
	repetitions?: number;
};

/**
 * Multi-candidate table against one shared baseline.
 *
 * 多 candidate 的表选项。名字必须在整个 evalSet 内唯一。
 */
export type EvalHarnessTableCandidatesOptions<TInput, TOutput extends JsonValue | undefined> = {
	baseline: Harness<TInput, TOutput>;
	candidates: readonly Harness<TInput, TOutput>[];
	repetitions?: number;
};

/**
 * Eval table options: a single candidate or a candidate list.
 *
 * 表选项联合。`candidate` 与 `candidates` 二选一，由调用签名区分。
 */
export type EvalHarnessTableOptions<TInput, TOutput extends JsonValue | undefined> =
	| EvalHarnessTablePairOptions<TInput, TOutput>
	| EvalHarnessTableCandidatesOptions<TInput, TOutput>;

type EvalHarnessIterationPlan = Omit<EvalHarnessIterationArtifact, "groupKey">;

/**
 * Narrow a JSON artifact to an iteration identity, or return undefined.
 *
 * 收窄迭代 artifact。字段不对返回 undefined，不抛。
 */
export function parseEvalHarnessIterationArtifact(
	value: JsonValue | undefined,
): EvalHarnessIterationArtifact | undefined {
	if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined;
	const { schemaVersion, evalSet, groupKey, harness, baseline, candidates, repetition } = value;
	if (
		schemaVersion !== 1 ||
		typeof evalSet !== "string" ||
		typeof groupKey !== "string" ||
		typeof harness !== "string" ||
		typeof baseline !== "string" ||
		!Array.isArray(candidates) ||
		!candidates.every((name): name is string => typeof name === "string") ||
		typeof repetition !== "number"
	) {
		return undefined;
	}
	return { schemaVersion, evalSet, groupKey, harness, baseline, candidates, repetition };
}

function canonicalizeJson(value: unknown, ancestors: WeakSet<object>): JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new TypeError("Eval input must contain only finite numbers.");
		return value;
	}
	if (typeof value !== "object") throw new TypeError("Eval input must be JSON-serializable.");
	if (ancestors.has(value)) throw new TypeError("Eval input must not contain circular references.");

	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			const result: JsonValue[] = [];
			for (let index = 0; index < value.length; index += 1) {
				if (!Object.hasOwn(value, index)) throw new TypeError("Eval input arrays must not be sparse.");
				result.push(canonicalizeJson(value[index], ancestors));
			}
			return result;
		}
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) {
			throw new TypeError("Eval input must contain only plain objects and arrays.");
		}
		const entries: Array<[string, unknown]> = Object.entries(value);
		return Object.fromEntries(
			entries
				.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
				.map(([key, item]): [string, JsonValue] => [key, canonicalizeJson(item, ancestors)]),
		);
	} finally {
		ancestors.delete(value);
	}
}

function deriveInputKey(input: unknown): string {
	if (typeof input === "object" && input !== null && !Array.isArray(input) && "id" in input) {
		const id = input.id;
		if (typeof id === "string" && id.trim()) return id.trim();
	}
	const canonicalInput = JSON.stringify(canonicalizeJson(input, new WeakSet()));
	if (canonicalInput === undefined) throw new TypeError("Eval input must be JSON-serializable.");
	return createHash("sha256").update(canonicalInput).digest("hex");
}

/**
 * Stable group key for one input plus repetition.
 *
 * 输入和 repetition 的分组键。对象优先用非空 `id`，否则对规范化 JSON 做哈希。
 */
export function deriveEvalGroupKey(input: unknown, repetition: number): string {
	return JSON.stringify([deriveInputKey(input), repetition]);
}

/**
 * Resolve a positive integer repetition count from options or the environment.
 *
 * 解析重复次数。显式值优先，否则 `PI_EVAL_REPETITIONS`，再否则 1；非正整数抛。
 */
export function resolveEvalRepetitions(
	explicit: number | undefined,
	environmentValue: string | undefined = process.env.PI_EVAL_REPETITIONS,
): number {
	const repetitions = explicit ?? (environmentValue === undefined ? 1 : Number(environmentValue));
	if (!Number.isSafeInteger(repetitions) || repetitions < 1) {
		throw new TypeError("repetitions must be a positive integer.");
	}
	return repetitions;
}

function validateOptions<TInput, TOutput extends JsonValue | undefined>(
	evalSet: string,
	baseline: Harness<TInput, TOutput>,
	candidates: readonly Harness<TInput, TOutput>[],
	repetitions: number,
): void {
	if (!evalSet.trim()) throw new TypeError("evalSet must not be empty.");
	if (candidates.length === 0) throw new TypeError("At least one candidate harness is required.");
	const harnesses = [baseline, ...candidates];
	const names = new Set(harnesses.map((harness) => harness.name));
	if (names.size !== harnesses.length) throw new TypeError("Harness names must be unique within an eval set.");
	if (!Number.isSafeInteger(repetitions) || repetitions < 1) {
		throw new TypeError("repetitions must be a positive integer.");
	}
}

function withIterationArtifact<TInput, TOutput extends JsonValue | undefined>(
	harness: Harness<TInput, TOutput>,
	plan: EvalHarnessIterationPlan,
): Harness<TInput, TOutput> {
	return {
		name: harness.name,
		async run(input, context) {
			const groupKey = deriveEvalGroupKey(input, plan.repetition);
			const artifact: EvalHarnessIterationArtifact = { ...plan, groupKey };
			context.setArtifact(EVAL_HARNESS_ITERATION_ARTIFACT, artifact);
			const attachIterationArtifact = <TRun extends HarnessRun>(run: TRun): TRun => {
				run.artifacts = { ...context.artifacts, ...run.artifacts, [EVAL_HARNESS_ITERATION_ARTIFACT]: artifact };
				return run;
			};
			try {
				return attachIterationArtifact(await harness.run(input, context));
			} catch (error) {
				const partialRun = getHarnessRunFromError(error);
				if (partialRun) {
					throw attachHarnessRunToError(error, attachIterationArtifact(partialRun));
				}
				throw error;
			}
		},
	};
}

/**
 * Expand baseline and candidates into per-repetition harness rows.
 *
 * 展开对照表。空 evalSet、无 candidate、重名或非法 repetitions 都抛。
 */
export function evalHarnessTable<TInput, TOutput extends JsonValue | undefined>(
	evalSet: string,
	options: EvalHarnessTablePairOptions<TInput, TOutput>,
): EvalHarnessTableRow<TInput, TOutput>[];
export function evalHarnessTable<TInput, TOutput extends JsonValue | undefined>(
	evalSet: string,
	options: EvalHarnessTableCandidatesOptions<TInput, TOutput>,
): EvalHarnessTableRow<TInput, TOutput>[];
export function evalHarnessTable<TInput, TOutput extends JsonValue | undefined>(
	evalSet: string,
	options: EvalHarnessTableOptions<TInput, TOutput>,
): EvalHarnessTableRow<TInput, TOutput>[] {
	const repetitions = resolveEvalRepetitions(options.repetitions);
	const candidates = "candidate" in options ? [options.candidate] : options.candidates;
	validateOptions(evalSet, options.baseline, candidates, repetitions);

	const rows: EvalHarnessTableRow<TInput, TOutput>[] = [];
	const harnesses = [options.baseline, ...candidates];
	for (let repetition = 1; repetition <= repetitions; repetition += 1) {
		for (const harness of harnesses) {
			const plan: EvalHarnessIterationPlan = {
				schemaVersion: 1,
				evalSet,
				harness: harness.name,
				baseline: options.baseline.name,
				candidates: candidates.map(({ name }) => name),
				repetition,
			};
			rows.push({
				harness: withIterationArtifact(harness, plan),
				name: harness.name,
				repetition,
			});
		}
	}
	return rows;
}
