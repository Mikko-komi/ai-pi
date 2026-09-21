/**
 * Project a session path into model-visible context messages.
 *
 * 把一条路径收成模型上下文。最近一次 compaction 截断更早历史；custom 条目必须有 projector 才进模型。
 */

import type { AgentMessage } from "../../types.ts";
import type { Context } from "../context.ts";
import { createBranchSummaryMessage, createCompactionSummaryMessage } from "../messages.ts";
import type { CompactionEntry, Entry, EntryProjector } from "./types.ts";

/**
 * Projectors keyed by custom entry type.
 *
 * 按 customType 投影自定义条目。
 */
export interface SessionContextBuildOptions {
	entryProjectors?: Readonly<Record<string, EntryProjector>>;
}

/**
 * Truncate a path at the newest compaction. No compaction keeps the whole path.
 *
 * 从最近 compaction 截断路径。没有 compaction 就整条路径。
 */
export function buildContextEntries(pathEntries: readonly Entry[]): Entry[] {
	let compaction: CompactionEntry | undefined;
	let compactionIndex = -1;
	for (let index = pathEntries.length - 1; index >= 0; index--) {
		const entry = pathEntries[index];
		if (entry?.type === "compaction") {
			compaction = entry;
			compactionIndex = index;
			break;
		}
	}
	return compaction === undefined ? [...pathEntries] : [compaction, ...pathEntries.slice(compactionIndex + 1)];
}

function isContextMessage(message: AgentMessage): boolean {
	return (
		message.role !== "assistant" ||
		(message.stopReason !== "error" && message.stopReason !== "aborted" && message.stopReason !== "deferred")
	);
}

/**
 * Project one entry into model messages. Error/aborted/deferred assistants are dropped.
 *
 * 单条 Entry 收成模型消息。error/aborted/deferred assistant 丢掉。
 */
export function sessionEntryToContextMessages(entry: Entry): AgentMessage[] {
	switch (entry.type) {
		case "message":
			return isContextMessage(entry.message) ? [entry.message] : [];
		case "compaction":
			return [
				createCompactionSummaryMessage(entry.summary, entry.tokensBefore, entry.timestamp),
				...entry.retainedTail.filter(isContextMessage),
			];
		case "branch_summary":
			return entry.summary ? [createBranchSummaryMessage(entry.summary, entry.fromId, entry.timestamp)] : [];
		case "custom":
			return [];
	}
}

/**
 * Path entries to model messages. Custom entries without a projector are skipped.
 *
 * 路径 → 模型消息。custom 没有 projector 就跳过。
 */
export async function buildSessionContext(
	pathEntries: readonly Entry[],
	options: SessionContextBuildOptions | undefined,
	context: Context,
): Promise<AgentMessage[]> {
	options ??= {};
	const entries = buildContextEntries(pathEntries);
	const messages: AgentMessage[] = [];
	for (const entry of entries) {
		if (entry.type !== "custom") {
			messages.push(...sessionEntryToContextMessages(entry));
			continue;
		}
		const projector = options.entryProjectors?.[entry.customType];
		if (projector !== undefined) messages.push(...((await projector(entry, context)) ?? []));
	}
	return messages;
}
