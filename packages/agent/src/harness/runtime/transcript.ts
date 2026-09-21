/**
 * Chain new entries, emit lifecycle events, and read bounded context or queued payloads.
 *
 * 转录辅助。串 parent、发生命周期事件、读压缩边界内的上下文和 inbox 载荷。
 */

import type { AgentMessage } from "../../types.ts";
import type { HarnessEvent, LaneQueuedItem } from "../agent-harness.ts";
import type { Context } from "../context.ts";
import { materializeCommittedEntry } from "../session/commit.ts";
import { buildSessionContext } from "../session/context.ts";
import { SessionInvariantError } from "../session/session.ts";
import type { CommitResult, Entry, InboxItem, NewEntry, OperationState, SessionReader } from "../session/types.ts";
import { pendingEntry } from "../session/values.ts";
import type { Lane } from "./lane.ts";
import type { ContinueOperationResult, Drive } from "./types.ts";

/**
 * Assign parentId so items form a linear chain from the given parent.
 *
 * 按顺序串成链。第一项挂 parentId，后面每项挂前一项 id。
 */
export function chainEntries<T extends { id: string }>(
	parentId: string | null,
	items: readonly T[],
): Array<T & { parentId: string | null }> {
	return items.map((item) => {
		const entry = { ...item, parentId };
		parentId = item.id;
		return entry;
	});
}

/**
 * Events for one committed entry: messages emit start+end+added, others only added.
 *
 * 一条已提交条目的生命周期事件。message 发 start/end/added，其余只发 added。
 */
export function entryLifecycleEvents(entry: Entry, lane: string, runId?: string): HarnessEvent[] {
	const operation = runId === undefined ? {} : { runId };
	return entry.type === "message"
		? [
				{ type: "message_start", lane, ...operation, message: entry.message },
				{ type: "message_end", lane, ...operation, message: entry.message, entryId: entry.id },
				{ type: "entry_added", lane, entry },
			]
		: [{ type: "entry_added", lane, entry }];
}

/**
 * Materialize committed entries then emit their lifecycle events.
 *
 * 用 commit 的 seq/timestamp 物化条目再发事件。firstWriteIndex 对齐 writes 里的条目起点。
 */
export function committedEntryEvents(
	entries: readonly NewEntry[],
	commit: CommitResult,
	lane: string,
	runId?: string,
	firstWriteIndex = 0,
): HarnessEvent[] {
	return entries.flatMap((entry, index) =>
		entryLifecycleEvents(
			materializeCommittedEntry(entry, commit.seqs[firstWriteIndex + index]!, commit.timestamp),
			lane,
			runId,
		),
	);
}

/**
 * Read the current branch from tip back to the last compaction.
 *
 * 读 tip 到最近 compaction 的条目。必须仍持有当前操作，否则 cancel_requested。
 */
export function readBoundedEntries<TContext extends object | undefined, TState extends OperationState>(
	lane: Lane<TContext>,
	drive: Drive,
	capability: TState,
): Promise<ContinueOperationResult<Entry[]>> {
	return lane.continueOperation(
		capability,
		async (state, _current, _meta, reader) => {
			if (state.tipId === null) throw new SessionInvariantError("Run operation has no Branch tip");
			const entries = await reader.scanBranch(
				{ start: state.tipId, stopAtType: "compaction", order: "newestFirst" },
				drive.context,
			);
			return { kind: "return", result: entries.reverse() };
		},
		drive.context,
	);
}

/**
 * Project bounded entries into model messages via entry projectors.
 *
 * 把边界内条目投影成模型消息。取消则原样返回，不投影。
 */
export async function readBoundedContext<TContext extends object | undefined, TState extends OperationState>(
	lane: Lane<TContext>,
	drive: Drive,
	capability: TState,
): Promise<ContinueOperationResult<AgentMessage[]>> {
	const entries = await readBoundedEntries(lane, drive, capability);
	if (entries.kind === "cancel_requested") return entries;
	return {
		kind: "result",
		value: await buildSessionContext(
			entries.value,
			{ entryProjectors: lane.readConfig().entryProjectors },
			drive.context,
		),
	};
}

/**
 * Resolve inbox items to queued payloads for events and snapshots.
 *
 * 把 inbox 解析成队列载荷。缺 payload 抛；非 write 必须是 message。
 */
export function readLaneQueues(
	reader: SessionReader,
	inbox: readonly InboxItem[],
	context: Context,
): Promise<LaneQueuedItem[]> {
	return Promise.all(
		inbox.map(async (item): Promise<LaneQueuedItem> => {
			const stored = await reader.getValue(pendingEntry(item.entryId), context);
			if (stored === undefined) {
				throw new SessionInvariantError(`Pending ${item.kind} entry ${item.entryId} is missing its payload`);
			}
			if (stored.value.type === "message") {
				return { entryId: item.entryId, kind: item.kind, type: "message", message: stored.value.payload };
			}
			if (item.kind !== "write") {
				throw new SessionInvariantError(`Pending ${item.kind} entry ${item.entryId} is not a message`);
			}
			return {
				entryId: item.entryId,
				kind: "write",
				type: "custom",
				customType: stored.value.customType,
				...(stored.value.payload === undefined ? {} : { data: stored.value.payload }),
			};
		}),
	);
}

/**
 * Load pending message payloads for the given entry ids.
 *
 * 按 id 读 pending message。缺或非 message 立刻抛。
 */
export function readPendingMessages(
	reader: SessionReader,
	ids: readonly string[],
	description: string,
	context: Context,
): Promise<Array<{ entryId: string; message: AgentMessage }>> {
	return Promise.all(
		ids.map(async (entryId) => {
			const value = await reader.getValue(pendingEntry(entryId), context);
			if (value?.value.type !== "message") {
				throw new SessionInvariantError(`${description} ${entryId} is missing its message payload`);
			}
			return { entryId, message: value.value.payload };
		}),
	);
}
