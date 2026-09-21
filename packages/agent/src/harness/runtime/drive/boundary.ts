/**
 * Plan and finish one durable run boundary.
 *
 * 规划并收口一条耐久 run 边界：选出 inbox、必要时开 assistant，否则写终态。
 */

import { DEFAULT_MAX_AGENT_RETRY_DELAY_MS } from "@earendil-works/pi-ai";
import type { HarnessEvent, LaneQueuedItem } from "../../agent-harness.ts";
import { insertEntry } from "../../session/commit.ts";
import { SessionInvariantError } from "../../session/session.ts";
import type {
	AssistantReadyOperation,
	CheckpointOperation,
	CommitResult,
	NewEntry,
	NormalizedRetryPolicy,
	OperationScope,
	SessionReader,
	SummaryDecidingOperation,
	SummaryEffectPendingOperation,
	SummaryReadyOperation,
	Write,
} from "../../session/types.ts";
import { branchTip, deleteValue, pendingEntry, setValue } from "../../session/values.ts";
import type { Lane } from "../lane.ts";
import { committedEntryEvents, entryLifecycleEvents, readBoundedContext, readLaneQueues } from "../transcript.ts";
import type { Drive, LaneState, ProcedureResult } from "../types.ts";
import { operationCleanupWrites, operationResultRecord } from "./terminal.ts";

/**
 * Marker that inbox planning finished and finish mediation still owns the next commit.
 *
 * checkpoint 规划已选出 inbox，但还没走 finish 调解。kind 必须是 finish_pending。
 */
export interface BoundaryFinishPending {
	kind: "finish_pending";
	entryIds: string[];
}

/**
 * Planned but uncommitted inbox materialization for one run boundary.
 *
 * 一条边界的 inbox 物化计划，尚未提交。有 trigger 才表示本轮会开 assistant。
 */
export interface BoundaryPlacement {
	entries: NewEntry[];
	writes: Write[];
	tipId: string | null;
	inbox: LaneState["inbox"];
	triggerEntryId?: string;
	queues?: LaneQueuedItem[];
}

type FinishBoundaryOperation =
	| CheckpointOperation
	| SummaryDecidingOperation
	| SummaryReadyOperation
	| SummaryEffectPendingOperation;

/**
 * Convert the lane retry config into the session NormalizedRetryPolicy.
 *
 * lane 配置收到会话 NormalizedRetryPolicy。关闭重试时 maxAttempts=1；开启时是 maxRetries+1。
 */
export function normalizedRetryPolicy<TContext extends object | undefined>(
	lane: Lane<TContext>,
): NormalizedRetryPolicy {
	const retry = lane.readConfig().retryPolicy;
	return {
		maxAttempts: retry.enabled ? retry.maxRetries + 1 : 1,
		baseDelayMs: retry.baseDelayMs,
		maxAgentDelayMs: retry.maxAgentDelayMs ?? DEFAULT_MAX_AGENT_RETRY_DELAY_MS,
	};
}

/**
 * Build the assistant.ready leaf for the current boundary trigger.
 *
 * 在当前边界构造 assistant.ready。nextAttempt 从 1 起；stepId 新生成。
 */
export function assistantReadyAtBoundary<TContext extends object | undefined>(
	lane: Lane<TContext>,
	state: LaneState,
	scope: OperationScope,
	triggerEntryId: string,
	overflowRecoveryUsed: boolean,
): AssistantReadyOperation {
	const config = lane.readConfig();
	return {
		...scope,
		at: "assistant.ready",
		generationContext: {
			stepId: lane.session.idGenerator.next(),
			triggerEntryId,
			configuration: state.configuration,
			streamOptions: config.streamOptions,
			retryPolicy: normalizedRetryPolicy(lane),
			overflowRecoveryUsed,
		},
		nextAttempt: 1,
	};
}

/**
 * Select and materialize one boundary's lane-owned input without committing it.
 *
 * 选出并物化 inbox，不提交。先 write+steer；无投影 trigger 且允许 follow-up 才补 follow-up。
 */
export async function planBoundaryInbox<TContext extends object | undefined>(
	lane: Lane<TContext>,
	drive: Drive,
	state: LaneState,
	scope: OperationScope,
	reader: SessionReader,
	tipId: string | null,
	followUpWhenNoTrigger: boolean,
): Promise<BoundaryPlacement> {
	const steer = state.inbox.filter((item) => item.kind === "steer");
	const selectedSteer = scope.settings.steeringMode === "all" ? steer : steer.slice(0, 1);
	let selected = state.inbox.filter(
		(item) => item.kind === "write" || selectedSteer.some((candidate) => candidate.entryId === item.entryId),
	);
	const load = (items: typeof selected) =>
		Promise.all(
			items.map(async (item) => {
				const stored = await reader.getValue(pendingEntry(item.entryId), drive.context);
				if (stored === undefined) {
					throw new SessionInvariantError(`Pending ${item.kind} entry ${item.entryId} is missing its payload`);
				}
				if (item.kind !== "write" && stored.value.type !== "message") {
					throw new SessionInvariantError(`Queued ${item.kind} entry ${item.entryId} is not a message`);
				}
				return { item, pending: stored.value };
			}),
		);
	let pending = await load(selected);
	const projects = (value: (typeof pending)[number]["pending"]): boolean =>
		value.type === "message" || lane.readConfig().entryProjectors[value.customType] !== undefined;
	if (followUpWhenNoTrigger && !pending.some(({ pending: value }) => projects(value))) {
		const followUp = state.inbox.filter((item) => item.kind === "followUp");
		const selectedFollowUp = scope.settings.followUpMode === "all" ? followUp : followUp.slice(0, 1);
		selected = [...selected, ...selectedFollowUp].sort((a, b) => state.inbox.indexOf(a) - state.inbox.indexOf(b));
		pending = await load(selected);
	}

	let parentId = tipId;
	let triggerEntryId: string | undefined;
	const entries: NewEntry[] = pending.map(({ item, pending: value }) => {
		const entry: NewEntry =
			value.type === "message"
				? { id: item.entryId, parentId, type: "message", message: value.payload }
				: {
						id: item.entryId,
						parentId,
						type: "custom",
						customType: value.customType,
						...(value.payload === undefined ? {} : { data: value.payload }),
					};
		parentId = item.entryId;
		if (projects(value)) triggerEntryId = item.entryId;
		return entry;
	});
	const selectedIds = new Set(selected.map((item) => item.entryId));
	const inbox = state.inbox.filter((item) => !selectedIds.has(item.entryId));
	const queues = selected.length === 0 ? undefined : await readLaneQueues(reader, inbox, drive.context);
	return {
		entries,
		writes: [
			...entries.map((entry) => insertEntry(entry)),
			...selected.map((item) => deleteValue(pendingEntry(item.entryId))),
			...(entries.length === 0 ? [] : [setValue(branchTip(lane.name), parentId)]),
		],
		tipId: parentId,
		inbox,
		...(triggerEntryId === undefined ? {} : { triggerEntryId }),
		...(queues === undefined ? {} : { queues }),
	};
}

/**
 * Events for one committed inbox placement.
 *
 * 已提交 placement 的事件。先 entry 生命周期，再可选 queue_update。
 */
export function boundaryPlacementEvents(
	placement: BoundaryPlacement,
	commit: CommitResult,
	firstWriteIndex: number,
	lane: string,
	runId: string,
): HarnessEvent[] {
	return [
		...committedEntryEvents(placement.entries, commit, lane, runId, firstWriteIndex),
		...(placement.queues === undefined ? [] : [{ type: "queue_update" as const, lane, queues: placement.queues }]),
	];
}

/**
 * Replan after before_run_end and commit either renewed work or the terminal run result.
 *
 * before_run_end 后再规划。有 trigger 或 hook follow-up 就开 assistant；否则写 completed 并清操作后缀。
 */
export async function finishRunBoundary<TContext extends object | undefined, TState extends FinishBoundaryOperation>(
	lane: Lane<TContext>,
	drive: Drive,
	capability: TState,
	continuation: Extract<CheckpointOperation["continuation"], { kind: "may_finish" }>,
	plannedEntryIds: readonly string[],
	pendingEvents: HarnessEvent[] = [],
): Promise<ProcedureResult> {
	const context = await readBoundedContext(lane, drive, capability);
	if (context.kind === "cancel_requested") return { kind: "continue" };
	const hook = await lane.hooks.runWithGate(
		"before_run_end",
		{ lane: lane.name, runId: drive.operationId, messages: context.value },
		drive.gate,
		drive.context,
	);
	const followUp =
		hook?.followUp === undefined
			? undefined
			: {
					id: lane.session.idGenerator.next(),
					message: { role: "user" as const, content: hook.followUp, timestamp: Date.now() },
				};
	const result = await lane.continueOperation<TState, ProcedureResult>(
		capability,
		async (state, current, meta, reader) => {
			const placement = await planBoundaryInbox(lane, drive, state, current, reader, state.tipId, true);
			if (placement.triggerEntryId !== undefined) {
				return {
					kind: "commit",
					writes: placement.writes,
					operationState: assistantReadyAtBoundary(lane, state, current, placement.triggerEntryId, false),
					lane: { tipId: placement.tipId, inbox: placement.inbox },
					materialize: () => ({ kind: "continue" }) as const,
					events: (commit) => [
						...pendingEvents,
						...boundaryPlacementEvents(placement, commit, 0, lane.name, drive.operationId),
					],
				};
			}
			const hookPlanIsCurrent =
				placement.entries.length === plannedEntryIds.length &&
				placement.entries.every((entry, index) => entry.id === plannedEntryIds[index]);
			if (hookPlanIsCurrent && followUp !== undefined) {
				const entry: NewEntry = {
					id: followUp.id,
					parentId: placement.tipId,
					type: "message",
					message: followUp.message,
				};
				const entryWriteIndex = placement.writes.length;
				return {
					kind: "commit",
					writes: [...placement.writes, insertEntry(entry), setValue(branchTip(lane.name), followUp.id)],
					operationState: assistantReadyAtBoundary(lane, state, current, followUp.id, false),
					lane: { tipId: followUp.id, inbox: placement.inbox },
					materialize: () => ({ kind: "continue" }) as const,
					events: (commit) => [
						...pendingEvents,
						...boundaryPlacementEvents(placement, commit, 0, lane.name, drive.operationId),
						...entryLifecycleEvents(
							{ ...entry, seq: commit.seqs[entryWriteIndex]!, timestamp: commit.timestamp },
							lane.name,
							drive.operationId,
						),
					],
				};
			}
			if (placement.tipId === null) throw new SessionInvariantError("Completed run has no tip");
			if (continuation.includeFinalAssistant && current.latestAssistantEntryId === null) {
				throw new SessionInvariantError("Completed run is missing its final assistant");
			}
			const record = operationResultRecord(meta, "completed", placement.tipId);
			const cleanup = await operationCleanupWrites(reader, drive.operationId, current, drive.context);
			return {
				kind: "finish",
				writes: [...placement.writes, ...cleanup],
				record,
				lane: { tipId: placement.tipId, inbox: placement.inbox },
				materialize: () => ({ kind: "settled", outcome: record }) as const,
				events: (commit) => [
					...pendingEvents,
					...boundaryPlacementEvents(placement, commit, 0, lane.name, drive.operationId),
					{
						type: "run_end",
						lane: lane.name,
						runId: drive.operationId,
						status: "completed",
						fromTipId: meta.sourceTipId,
						tipId: placement.tipId,
						endedAt: record.endedAt,
					},
				],
			};
		},
		drive.context,
	);
	return result.kind === "cancel_requested" ? { kind: "continue" } : result.value;
}
