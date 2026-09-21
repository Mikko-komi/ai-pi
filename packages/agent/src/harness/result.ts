/**
 * Tagged operation errors and a Result helper used by AgentHarness APIs.
 *
 * AgentHarness API 的带 tag 错误。和 `types.ts` 里文件系统 `Result` 是两套：这里描述 lane / 操作冲突。
 */

/**
 * Success-or-tagged-error outcome used by AgentHarness APIs.
 *
 * 成功或带 tag 失败。和 `types.ts` 的文件系统 Result 不是同一套。
 */
export type Result<TValue, TError> = { ok: true; value: TValue } | { ok: false; error: TError };

/**
 * Construct and narrow {@link Result} values.
 *
 * `Result` 值的构造和收窄。
 */
export const Result = {
	ok<TValue>(value: TValue): Result<TValue, never> {
		return { ok: true, value };
	},
	err<TError>(error: TError): Result<never, TError> {
		return { ok: false, error };
	},
	isOk<TValue, TError>(result: Result<TValue, TError>): result is { ok: true; value: TValue } {
		return result.ok;
	},
	isErr<TValue, TError>(result: Result<TValue, TError>): result is { ok: false; error: TError } {
		return !result.ok;
	},
};

/**
 * Error instance that carries a stable `_tag` and JSON-serializable extras.
 *
 * 带稳定 `_tag` 的错误实例，可 JSON 序列化。
 */
export interface TaggedErrorValue<Tag extends string> extends Error {
	readonly _tag: Tag;
	toJSON(): { _tag: Tag; message: string } & Record<string, unknown>;
}

/**
 * Constructor plus `is()` guard for one tagged error class.
 *
 * 某个 tag 的构造器和 `is()` 守卫。
 */
export interface TaggedErrorFactory<Tag extends string> {
	new <Props extends { message: string }>(props: Props): TaggedErrorValue<Tag> & Readonly<Props>;
	is(value: unknown): value is TaggedErrorValue<Tag>;
}

/**
 * Factory for a tagged Error subclass used as a Result error.
 *
 * 生成带 tag 的 Error 子类，给 Result 的失败臂用。
 */
export function TaggedError<Tag extends string>(tag: Tag): TaggedErrorFactory<Tag> {
	class TaggedErrorClass extends Error {
		readonly _tag = tag;

		constructor(props: { message: string } & Record<string, unknown>) {
			super(props.message);
			this.name = tag;
			Object.assign(this, props);
		}

		toJSON(): { _tag: Tag; message: string } & Record<string, unknown> {
			const payload: Record<string, unknown> = {};
			for (const key of Object.keys(this)) {
				if (key !== "_tag") payload[key] = (this as unknown as Record<string, unknown>)[key];
			}
			return { _tag: tag, message: this.message, ...payload };
		}

		static is(value: unknown): value is TaggedErrorValue<Tag> {
			return value instanceof TaggedErrorClass;
		}
	}
	return TaggedErrorClass as unknown as TaggedErrorFactory<Tag>;
}

/**
 * Lane already has a run, compaction, or navigation in flight.
 *
 * 该 lane 已有 run / 压缩 / 导航在飞。
 */
export class LaneBusy extends TaggedError("LaneBusy")<{
	lane: string;
	operationId: string;
	operationKind: "run" | "compaction" | "navigation";
	message: string;
}> {}
/**
 * Drive/abort targeted an operation that is not the lane's current one.
 *
 * drive/abort 对准的不是这条 lane 当前的操作。
 */
export class OperationMismatch extends TaggedError("OperationMismatch")<{
	lane: string;
	expectedOperationId: string;
	currentOperationId?: string;
	lastOperationId?: string;
	message: string;
}> {}
/** 这条 lane 没有正在跑的 run。 */
export class NoActiveRun extends TaggedError("NoActiveRun")<{ lane: string; message: string }> {}
/** 没有可中止或检查的当前操作。 */
export class NoActiveOperation extends TaggedError("NoActiveOperation")<{ lane: string; message: string }> {}
/** 要求 resume，但这条 lane 没有挂起的东西。 */
export class NothingToResume extends TaggedError("NothingToResume")<{ lane: string; message: string }> {}
/** 要求压缩，但没有可压缩的历史。 */
export class NothingToCompact extends TaggedError("NothingToCompact")<{ lane: string; message: string }> {}
/** 入队/prompt 的负载不是这条 lane 能收的 AgentMessage。 */
export class InvalidMessage extends TaggedError("InvalidMessage")<{
	lane: string;
	reason: string;
	message: string;
}> {}
/** 导航目标不存在，或从当前 leaf 到不了。 */
export class InvalidNavigation extends TaggedError("InvalidNavigation")<{
	lane: string;
	reason: string;
	message: string;
}> {}
/** 当前 resources 里没有这个 skill。 */
export class UnknownSkill extends TaggedError("UnknownSkill")<{ name: string; message: string }> {}
/** 当前 resources 里没有这个模板。 */
export class UnknownTemplate extends TaggedError("UnknownTemplate")<{ name: string; message: string }> {}
/** 导航或标签的目标 id 不存在。 */
export class UnknownTarget extends TaggedError("UnknownTarget")<{ targetId: string; message: string }> {}
/** lane 名为空或非法。 */
export class InvalidLane extends TaggedError("InvalidLane")<{
	lane: string;
	reason: string;
	message: string;
}> {}
/** 调用完成前 harness 或 lane 已经关掉。 */
export class Closed extends TaggedError("Closed")<{ message: string }> {}

/**
 * Unexpected harness failure that is not a tagged domain error.
 *
 * 未预期的 harness 故障，不是带 tag 的领域错误。
 */
export class HarnessFault extends Error {
	readonly cause: unknown;

	constructor(message: string, cause: unknown) {
		super(message);
		this.name = "HarnessFault";
		this.cause = cause;
	}
}

/**
 * The harness closed while an operation was still running.
 *
 * 操作还在跑时 harness 被关掉。
 */
export class HarnessClosed extends Error {
	constructor() {
		super("AgentHarness was closed while the operation was active");
		this.name = "HarnessClosed";
	}
}

/**
 * Exhaustive map from a tagged error's `_tag` to a handler.
 *
 * 按 `_tag` 穷尽处理带 tag 错误。
 */
export type ErrorMatchers<TError extends TaggedErrorValue<string>, TValue> = {
	[Tag in TError["_tag"]]: (error: Extract<TError, { _tag: Tag }>) => TValue;
};

/**
 * Dispatch on a tagged error using {@link ErrorMatchers}.
 *
 * 按 tag 分发错误。缺分支在类型上过不去。
 */
export function matchError<TError extends TaggedErrorValue<string>, TValue>(
	error: TError,
	matchers: ErrorMatchers<TError, TValue>,
): TValue {
	const matcher = (matchers as unknown as Record<string, (value: TError) => TValue>)[error._tag];
	return matcher(error);
}
