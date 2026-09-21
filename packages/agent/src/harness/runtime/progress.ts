/**
 * Persist streaming assistant frames and tool snapshots through process-local progress channels.
 *
 * 把流式帧和工具快照落到 pending 地址。seal 后不再写；drain 等最后一次提交。
 */

import type { AssistantMessageFrame } from "@earendil-works/pi-ai";
import type { AgentToolResult } from "../../types.ts";
import type { Context } from "../context.ts";
import type { SessionReader, Write } from "../session/types.ts";
import { appendList, pendingAssistantFrames, pendingToolOutput, setValue } from "../session/values.ts";
import type { Lane } from "./lane.ts";
import type { Drive, LaneState } from "./types.ts";

/**
 * Fire-and-forget writer that commits progress items while the drive still owns the target.
 *
 * 进度通道。write 在 seal 后丢弃；通道不再拥有目标则不提交。
 */
export interface ProgressChannel<T> {
	write(item: T): void;
	seal(): void;
	drain(): Promise<void>;
}

/**
 * Read all persisted assistant frames for one response entry, oldest first.
 *
 * 读一条响应的全部 assistant 帧。升序分页，直到一页不满。
 */
export async function readAssistantFrames(
	reader: SessionReader,
	operationId: string,
	responseEntryId: string,
	context: Context,
): Promise<AssistantMessageFrame[]> {
	const frames: AssistantMessageFrame[] = [];
	let cursor: { seq: number } | undefined;
	for (;;) {
		const page = await reader.readList(
			pendingAssistantFrames(operationId, responseEntryId),
			{ order: "asc", limit: 1_000, ...(cursor === undefined ? {} : { cursor }) },
			context,
		);
		frames.push(...page.map(({ value }) => value));
		if (page.length < 1_000) return frames;
		cursor = { seq: page[page.length - 1]!.seq };
	}
}

function openProgress<TContext extends object | undefined, T>(
	lane: Lane<TContext>,
	drive: Drive,
	commitWrite: (item: T) => Write,
	stillOwns: (state: LaneState) => boolean,
): ProgressChannel<T> {
	let sealed = false;
	let latest: Promise<void> = Promise.resolve();
	return {
		write(item) {
			if (sealed) return;
			const write = lane
				.command((projection) => {
					if (!stillOwns(projection)) return { kind: "return", result: undefined };
					return {
						kind: "commit",
						writes: [commitWrite(item)],
						next: projection,
						materialize: () => undefined,
					};
				}, drive.context)
				.then(() => undefined);
			latest = write;
			void write.catch(() => {});
		},
		seal() {
			sealed = true;
		},
		async drain() {
			await latest;
		},
	};
}

/**
 * Open a channel that appends assistant frames while the effect-pending response still matches.
 *
 * 打开帧进度通道。只有 effect_pending 且 responseEntryId 对得上才提交。
 */
export function openFrameProgress<TContext extends object | undefined>(
	lane: Lane<TContext>,
	drive: Drive,
	responseEntryId: string,
): ProgressChannel<AssistantMessageFrame> {
	const address = pendingAssistantFrames(drive.operationId, responseEntryId);
	return openProgress(
		lane,
		drive,
		(frame) => appendList(address, frame),
		(state) => {
			const run = state.operation?.state;
			if (run === undefined) return false;
			return (
				(run.at === "assistant.effect_pending" || run.at === "deferred.effect_pending") &&
				run.responseEntryId === responseEntryId
			);
		},
	);
}

/**
 * Open a channel that snapshots tool output while that call is effect-pending.
 *
 * 打开工具进度通道。只有对应 call 仍是 effect_pending 才覆盖快照。
 */
export function openToolProgress<TContext extends object | undefined>(
	lane: Lane<TContext>,
	drive: Drive,
	turnId: string,
	sourceIndex: number,
	invocationId: string,
): ProgressChannel<AgentToolResult<unknown>> {
	const address = pendingToolOutput(drive.operationId, invocationId);
	return openProgress(
		lane,
		drive,
		(snapshot) => setValue(address, snapshot),
		(state) => {
			const operation = state.operation;
			if (operation?.state.at !== "tools") return false;
			const batch = operation.state.batch;
			return (
				batch.turnId === turnId &&
				batch.calls.some(
					(call) =>
						call.sourceIndex === sourceIndex &&
						call.resultEntryId === invocationId &&
						call.status === "effect_pending",
				)
			);
		},
	);
}
