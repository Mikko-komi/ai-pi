/**
 * Commit write materialization and intra-transaction validation.
 *
 * 把未提交 Write 收成带 seq 的 CommittedWrite。校验只看本事务内的 id/parent，不碰磁盘。
 */

import type { CommitResult, Entry, EntryWrite, NewEntry, UsageRow, UsageWrite, Write } from "./types.ts";

/**
 * Entry write after storage assigned `seq` and `timestamp`.
 *
 * 已分配 seq/timestamp 的条目写。
 */
export type CommittedEntryWrite = Entry & { kind: "entry" };
/**
 * Usage write after storage assigned `seq`.
 *
 * 已分配 seq 的用量写。
 */
export type CommittedUsageWrite = UsageRow & { kind: "usage" };
/**
 * Scalar set write after storage assigned `seq`.
 *
 * 已分配 seq 的标量写入。
 */
export interface CommittedValueSetWrite {
	kind: "value";
	op: "set";
	seq: number;
	namespace: string;
	key: string;
	value: unknown;
}
/**
 * Scalar delete write after storage assigned `seq`.
 *
 * 已分配 seq 的标量删除。
 */
export interface CommittedValueDeleteWrite {
	kind: "value";
	op: "delete";
	seq: number;
	namespace: string;
	key: string;
}
/**
 * List-append write after storage assigned `seq`.
 *
 * 已分配 seq 的列表追加。
 */
export interface CommittedListAppendWrite {
	kind: "list";
	op: "append";
	seq: number;
	namespace: string;
	key: string;
	value: unknown;
}
/**
 * Whole-list delete write after storage assigned `seq`.
 *
 * 已分配 seq 的整表删除。
 */
export interface CommittedListDeleteWrite {
	kind: "list";
	op: "delete";
	seq: number;
	namespace: string;
	key: string;
}
/**
 * One materialized write. Sequences are strictly increasing inside a transaction.
 *
 * 一次已物化的写。`seq` 在事务内严格递增。
 */
export type CommittedWrite =
	| CommittedEntryWrite
	| CommittedUsageWrite
	| CommittedValueSetWrite
	| CommittedValueDeleteWrite
	| CommittedListAppendWrite
	| CommittedListDeleteWrite;

/**
 * Numbered transaction that has not been applied yet. `result` has no stats.
 *
 * 已编号但未应用的事务。`result` 还没有 stats。
 */
export interface PreparedCommit {
	writes: CommittedWrite[];
	result: Omit<CommitResult, "stats">;
}

/**
 * Existing-id probes used while validating a prepared transaction.
 *
 * 校验时问“这个 id 已经在库里吗”。
 */
export interface CommitValidationState {
	hasEntryOrUsageId(id: string): boolean;
	hasEntryId(id: string): boolean;
}

/**
 * Wrap a {@link NewEntry} as an {@link EntryWrite}.
 *
 * 构造一条 EntryWrite。
 */
export function insertEntry(entry: NewEntry): EntryWrite {
	return { kind: "entry", entry };
}

/**
 * Wrap a usage row as a {@link UsageWrite}.
 *
 * 构造一条 UsageWrite。
 */
export function insertUsage(row: Omit<UsageRow, "seq">): UsageWrite {
	return { kind: "usage", row };
}

/**
 * Assign `seq` and `timestamp` to one {@link Write}.
 *
 * 给一条 Write 分配 seq/timestamp。
 */
export function commitWrite(write: Write, seq: number, timestamp: number): CommittedWrite {
	switch (write.kind) {
		case "entry":
			return { kind: "entry", ...write.entry, seq, timestamp };
		case "usage":
			return { kind: "usage", ...write.row, seq };
		case "value":
			return write.op === "set"
				? { kind: "value", op: "set", seq, namespace: write.namespace, key: write.key, value: write.value }
				: { kind: "value", op: "delete", seq, namespace: write.namespace, key: write.key };
		case "list":
			return write.op === "append"
				? { kind: "list", op: "append", seq, namespace: write.namespace, key: write.key, value: write.value }
				: { kind: "list", op: "delete", seq, namespace: write.namespace, key: write.key };
	}
}

/**
 * Fill `seq` and `timestamp` on a {@link NewEntry}.
 *
 * 给 NewEntry 补 seq/timestamp。
 */
export function materializeCommittedEntry(entry: NewEntry, seq: number, timestamp: number): Entry {
	return { ...entry, seq, timestamp };
}

/**
 * Number an entire write batch from `firstSeq`.
 *
 * 按 firstSeq 连续编号整批写。
 */
export function prepareStorageCommit(writes: Write[], firstSeq: number, timestamp: number): PreparedCommit {
	const committedWrites = writes.map((write, index) => commitWrite(write, firstSeq + index, timestamp));
	return {
		writes: committedWrites,
		result: { firstSeq, seqs: committedWrites.map((write) => write.seq), timestamp },
	};
}

/**
 * Check increasing seq, unique ids, and that parents already exist.
 *
 * 检查 seq 递增、id 不重复、parent 已存在。
 */
export function validateCommittedWrites(
	writes: readonly CommittedWrite[],
	firstSeq: number,
	state: CommitValidationState,
): void {
	let previousSeq = firstSeq - 1;
	const transactionIds = new Set<string>();
	const transactionEntryIds = new Set<string>();
	for (const write of writes) {
		if (write.seq <= previousSeq) throw new Error(`Non-monotonic storage sequence: ${write.seq}`);
		previousSeq = write.seq;
		if (write.kind !== "entry" && write.kind !== "usage") continue;
		if (state.hasEntryOrUsageId(write.id) || transactionIds.has(write.id)) {
			throw new Error(`Duplicate entry or usage id: ${write.id}`);
		}
		if (
			write.kind === "entry" &&
			write.parentId !== null &&
			!state.hasEntryId(write.parentId) &&
			!transactionEntryIds.has(write.parentId)
		) {
			throw new Error(`Missing parent entry: ${write.parentId}`);
		}
		transactionIds.add(write.id);
		if (write.kind === "entry") transactionEntryIds.add(write.id);
	}
}
