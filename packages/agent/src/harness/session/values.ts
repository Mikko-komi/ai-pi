/**
 * Typed stored-value addresses and write constructors for session state.
 *
 * 会话标量/列表的地址与写构造。namespace/key 不能含 NUL；`pi.*` 是保留命名空间。
 */

import type { AssistantMessageFrame } from "@earendil-works/pi-ai";
import type { AgentToolResult } from "../../types.ts";
import type {
	DurableStructuralPreparation,
	JsonValue,
	LaneConfiguration,
	LaneState,
	OperationMeta,
	OperationResultRecord,
	OperationState,
	PendingEntry,
} from "./types.ts";

declare const storedValueType: unique symbol;

/**
 * Namespace, key, and kind shared by every stored address.
 *
 * 地址的公共字段。namespace 非空；namespace/key 都不能含 NUL。
 */
export interface StoredAddressBase {
	readonly namespace: string;
	readonly key: string;
	readonly kind: "value" | "list";
}

/**
 * Typed address of one scalar stored value.
 *
 * 标量地址。`kind` 必须是 `"value"`。
 */
export interface Value<T> extends StoredAddressBase {
	readonly kind: "value";
	readonly [storedValueType]?: (value: T) => T;
}

/**
 * Typed address of one append-only stored list.
 *
 * 列表地址。`kind` 必须是 `"list"`。
 */
export interface ValueList<T> extends StoredAddressBase {
	readonly kind: "list";
	readonly [storedValueType]?: (value: T) => T;
}

/**
 * Scalar row read back from storage, including the write sequence.
 *
 * 读出的标量行。`seq` 是写入时的序号。
 */
export interface StoredValue<T> {
	address: Value<T>;
	value: T;
	seq: number;
}

/**
 * One element of a stored list.
 *
 * 列表里的一个元素。`seq` 是追加时的序号。
 */
export interface ListElement<T> {
	seq: number;
	value: T;
}

/**
 * Exclusive sequence cursor for list pagination.
 *
 * 列表分页游标。按 `seq` 开区间。
 */
export interface ListCursor {
	seq: number;
}

/**
 * Caller options for reading a list. Limit is resolved later.
 *
 * 列表读取选项。`limit` 要经 {@link resolveListReadOptions} 夹紧。
 */
export interface ListReadOptions {
	cursor?: ListCursor;
	order?: "asc" | "desc";
	limit?: number;
}

/**
 * List read options after defaults and limit clamping.
 *
 * 已展开的列表读取选项。`limit` 在 1..10000。
 */
export interface ResolvedListReadOptions {
	cursor?: ListCursor;
	order: "asc" | "desc";
	limit: number;
}

/**
 * Transaction write that sets one scalar.
 *
 * 一次标量写入。
 */
export interface ValueSetWrite {
	kind: "value";
	op: "set";
	namespace: string;
	key: string;
	value: unknown;
}

/**
 * Transaction write that deletes one scalar.
 *
 * 一次标量删除。
 */
export interface ValueDeleteWrite {
	kind: "value";
	op: "delete";
	namespace: string;
	key: string;
}

/**
 * Transaction write that appends one list element.
 *
 * 一次列表追加。
 */
export interface ListAppendWrite {
	kind: "list";
	op: "append";
	namespace: string;
	key: string;
	value: unknown;
}

/**
 * Transaction write that deletes an entire list.
 *
 * 一次整表删除。
 */
export interface ListDeleteWrite {
	kind: "list";
	op: "delete";
	namespace: string;
	key: string;
}

/**
 * Scalar write: set or delete.
 *
 * 标量写。`set` / `delete` 互斥。
 */
export type ValueWrite = ValueSetWrite | ValueDeleteWrite;
/**
 * List write: append or delete.
 *
 * 列表写。`append` / `delete` 互斥。
 */
export type ListWrite = ListAppendWrite | ListDeleteWrite;

function validateAddress(namespace: string, key: string): void {
	if (namespace.length === 0) throw new TypeError("Value namespace must not be empty");
	if (namespace.includes("\u0000")) throw new TypeError("Value namespace must not contain \\u0000");
	if (key.includes("\u0000")) throw new TypeError("Value key must not contain \\u0000");
}

/**
 * Construct a scalar address. Namespace must be non-empty and NUL-free.
 *
 * 构造标量地址。namespace 非空且不能含 NUL。
 */
export function value<T>(namespace: string, key = ""): Value<T> {
	validateAddress(namespace, key);
	return Object.freeze({ namespace, key, kind: "value" }) as Value<T>;
}

/**
 * Construct a list address. Constraints match {@link value}.
 *
 * 构造列表地址。约束同 {@link value}。
 */
export function list<T>(namespace: string, key = ""): ValueList<T> {
	validateAddress(namespace, key);
	return Object.freeze({ namespace, key, kind: "list" }) as ValueList<T>;
}

/**
 * Construct a scalar set write from an address.
 *
 * 构造一次标量写入。
 */
export function setValue<T>(address: Value<T>, next: NoInfer<T>): ValueSetWrite {
	return {
		kind: "value",
		op: "set",
		namespace: address.namespace,
		key: address.key,
		value: next,
	};
}

/**
 * Construct a scalar delete write from an address.
 *
 * 构造一次标量删除。
 */
export function deleteValue<T>(address: Value<T>): ValueDeleteWrite {
	return {
		kind: "value",
		op: "delete",
		namespace: address.namespace,
		key: address.key,
	};
}

/**
 * Construct a list-append write from an address.
 *
 * 构造一次列表追加。
 */
export function appendList<T>(address: ValueList<T>, element: NoInfer<T>): ListAppendWrite {
	return {
		kind: "list",
		op: "append",
		namespace: address.namespace,
		key: address.key,
		value: element,
	};
}

/**
 * Construct a whole-list delete write from an address.
 *
 * 构造一次整表删除。
 */
export function deleteList<T>(address: ValueList<T>): ListDeleteWrite {
	return {
		kind: "list",
		op: "delete",
		namespace: address.namespace,
		key: address.key,
	};
}

/**
 * Apply list-read defaults and clamp `limit` to 1..10000.
 *
 * 展开列表读取选项。`limit` 夹到 1..10000。
 */
export function resolveListReadOptions(options: ListReadOptions = {}): ResolvedListReadOptions {
	const requestedLimit = options.limit ?? 1_000;
	if (!Number.isSafeInteger(requestedLimit) || requestedLimit <= 0) {
		throw new TypeError("List read limit must be a positive safe integer");
	}
	return {
		...(options.cursor === undefined ? {} : { cursor: options.cursor }),
		order: options.order ?? "asc",
		limit: Math.min(requestedLimit, 10_000),
	};
}

/**
 * Address of a branch tip. Value is the tip id or `null` for an empty branch.
 *
 * `pi.branch.tip` 地址。value 是 tip id 或 null（空分支）。
 */
export const branchTip = (branch: string) => value<string | null>("pi.branch.tip", branch);
/**
 * Prefix that scans every stored branch tip.
 *
 * 扫全部 branch tip 的前缀地址。
 */
export const branchTipInventoryPrefix = () => value<string | null>("pi.branch.tip");
/**
 * Address of one lane's configuration. Must pair with {@link laneState}.
 *
 * `pi.lane.config` 地址。必须和 {@link laneState} 成对。
 */
export const laneConfig = (lane: string) => value<LaneConfiguration>("pi.lane.config", lane);
/**
 * Address of one lane's runtime pointers. Must pair with {@link laneConfig}.
 *
 * `pi.lane.state` 地址。必须和 {@link laneConfig} 成对。
 */
export const laneState = (lane: string) => value<LaneState>("pi.lane.state", lane);
/**
 * Address of a terminal operation observation record.
 *
 * 终态观察记录地址。
 */
export const operationResult = (operationId: string) => value<OperationResultRecord>("pi.result", operationId);

/**
 * Address of an operation's immutable meta.
 *
 * 操作不可变 meta 地址。
 */
export const operationMeta = (operationId: string) => value<OperationMeta>("pi.op.meta", operationId);
/**
 * Address of an operation's current dispatcher leaf.
 *
 * 操作当前叶子地址。
 */
export const operationState = (operationId: string) => value<OperationState>("pi.op.state", operationId);
/**
 * Address of one tool-call argument snapshot.
 *
 * 某次工具调用参数地址。
 */
export const operationToolArgs = (operationId: string, stepId: string, sourceIndex: number) =>
	value<Record<string, JsonValue>>("pi.op.tool_args", `${operationId}:${stepId}:${sourceIndex}`);
/**
 * Address of one tool-call memo.
 *
 * 某次工具 memo 地址。
 */
export const operationToolMemo = (operationId: string, invocationId: string, name: string) =>
	value<JsonValue>("pi.op.tool_memo", `${operationId}:${invocationId}:${name}`);
/**
 * Address of one compaction or branch-summary preparation.
 *
 * 压缩/分支摘要预备地址。
 */
export const operationPreparation = (operationId: string, taskId: string) =>
	value<DurableStructuralPreparation>("pi.op.preparation", `${operationId}:${taskId}`);

/**
 * Prefix that scans tool-arg snapshots for one operation or step.
 *
 * 扫某操作工具参数的前缀。
 */
export const operationToolArgsPrefix = (operationId: string, stepId?: string) =>
	value<Record<string, JsonValue>>(
		"pi.op.tool_args",
		stepId === undefined ? `${operationId}:` : `${operationId}:${stepId}:`,
	);
/**
 * Prefix that scans tool memos for one operation or invocation.
 *
 * 扫某操作 memo 的前缀。
 */
export const operationToolMemoPrefix = (operationId: string, invocationId?: string) =>
	value<JsonValue>(
		"pi.op.tool_memo",
		invocationId === undefined ? `${operationId}:` : `${operationId}:${invocationId}:`,
	);
/**
 * Prefix that scans preparations for one operation.
 *
 * 扫某操作预备的前缀。
 */
export const operationPreparationPrefix = (operationId: string) =>
	value<DurableStructuralPreparation>("pi.op.preparation", `${operationId}:`);

/**
 * Address of an uncommitted entry payload.
 *
 * 未提交条目地址。
 */
export const pendingEntry = (entryId: string) => value<PendingEntry>("pi.pending.entry", entryId);
/**
 * Address of an uncommitted tool output.
 *
 * 未提交工具输出地址。
 */
export const pendingToolOutput = (operationId: string, invocationId: string) =>
	value<AgentToolResult<unknown>>("pi.pending.tool_output", `${operationId}:${invocationId}`);
/**
 * List address of uncommitted assistant frames for one response.
 *
 * 未提交 assistant 帧列表。
 */
export const pendingAssistantFrames = (operationId: string, responseEntryId: string) =>
	list<AssistantMessageFrame>("pi.pending.assistant_frame", `${operationId}:${responseEntryId}`);
/**
 * Prefix that scans uncommitted tool outputs for one operation.
 *
 * 扫某操作未提交工具输出的前缀。
 */
export const pendingToolOutputPrefix = (operationId: string) =>
	value<AgentToolResult<unknown>>("pi.pending.tool_output", `${operationId}:`);

/**
 * Address of the session display name.
 *
 * 会话显示名地址。
 */
export const sessionName = value<string>("pi.session.name");
/**
 * Address of a label attached to one entry id.
 *
 * 某条目标签地址。
 */
export const entryLabel = (entryId: string) => value<string>("pi.entry.label", entryId);
