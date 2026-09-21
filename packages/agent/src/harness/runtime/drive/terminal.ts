/**
 * Terminal cleanup writes and immutable operation result records.
 *
 * 终态事务的操作后缀删除，以及一次终态决策的不可变观察记录。
 */

import type { Context } from "../../context.ts";
import { SessionInvariantError } from "../../session/session.ts";
import type {
	OperationError,
	OperationMeta,
	OperationResultRecord,
	OperationState,
	SessionReader,
	TerminalStatus,
	Write,
} from "../../session/types.ts";
import {
	deleteList,
	deleteValue,
	operationMeta,
	operationPreparationPrefix,
	operationState as operationStateValue,
	operationToolArgsPrefix,
	operationToolMemoPrefix,
	pendingAssistantFrames,
	pendingEntry,
	pendingToolOutputPrefix,
} from "../../session/values.ts";

/**
 * Build the mechanical operation-owned suffix used by an owning procedure's terminal transaction.
 *
 * 终态事务要删的操作后缀。含 meta/state/args/memos/preps、pending 输出、帧和暂存工具结果。
 */
export async function operationCleanupWrites(
	reader: SessionReader,
	operationId: string,
	state: OperationState,
	context: Context,
): Promise<Write[]> {
	const [toolArguments, toolMemos, preparations, toolOutputs] = await Promise.all([
		reader.scanValues(operationToolArgsPrefix(operationId), context),
		reader.scanValues(operationToolMemoPrefix(operationId), context),
		reader.scanValues(operationPreparationPrefix(operationId), context),
		reader.scanValues(pendingToolOutputPrefix(operationId), context),
	]);

	const pendingIds = new Set<string>();
	if (state.at === "tools") {
		for (const call of state.batch.calls) {
			if (call.status === "outcome_ready") pendingIds.add(call.resultEntryId);
		}
	}
	let frameDelete: Write | undefined;
	if (state.at === "assistant.effect_pending" || state.at === "deferred.effect_pending") {
		frameDelete = deleteList(pendingAssistantFrames(operationId, state.responseEntryId));
	}

	return [
		deleteValue(operationMeta(operationId)),
		deleteValue(operationStateValue(operationId)),
		...toolArguments.map(({ address }) => deleteValue(address)),
		...toolMemos.map(({ address }) => deleteValue(address)),
		...preparations.map(({ address }) => deleteValue(address)),
		...toolOutputs.map(({ address }) => deleteValue(address)),
		...(frameDelete === undefined ? [] : [frameDelete]),
		...[...pendingIds].map((id) => deleteValue(pendingEntry(id))),
	];
}

/**
 * Construct the immutable observation record for one terminal decision.
 *
 * 一次终态决策的不可变观察记录。只有 failed 能带 error。
 */
export function operationResultRecord(
	meta: OperationMeta,
	status: TerminalStatus,
	tipId: string | null,
	error?: OperationError,
): OperationResultRecord {
	if ((status === "failed") !== (error !== undefined)) {
		throw new SessionInvariantError("Only a failed operation result may carry an error");
	}
	return {
		operationId: meta.operationId,
		kind: meta.intent.kind,
		status,
		...(error === undefined ? {} : { error }),
		fromTipId: meta.sourceTipId,
		tipId,
		startedAt: meta.startedAt,
		endedAt: Date.now(),
	};
}
