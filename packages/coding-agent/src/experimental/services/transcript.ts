/**
 * Chord service contract for replicated main-lane transcript state.
 *
 * 主 lane 转录合同。只复制 snapshot 与最近 event；hydration 不重放 event。
 */

import { defineService, type ReplicatedState } from "@earendil-works/chord";
import type { LaneTranscriptSnapshot, LaneWatchEvent } from "@earendil-works/pi-agent-core";

/**
 * Latest main-lane snapshot plus the source event that produced it.
 *
 * 最新 snapshot 与来源 event。event 给人看副作用，hydration 不重放。
 */
export interface TranscriptState {
	snapshot: LaneTranscriptSnapshot | null;
	/** The source event is retained for presentation side effects; hydration does not replay it. */
	event: LaneWatchEvent | null;
}

/**
 * Coherent main-lane state replicated through Chord's operation stream.
 *
 * 通过 Chord 操作流复制的主 lane 状态。只有 state，没有命令。
 */
export interface Transcript {
	readonly state: ReplicatedState<TranscriptState>;
}

/**
 * Chord service token for Transcript.
 *
 * 服务令牌。id 固定 `pi.transcript`。
 */
export const Transcript = defineService<Transcript>("pi.transcript");
