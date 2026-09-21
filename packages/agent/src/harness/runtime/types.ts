/**
 * Process-local runtime contracts for harness configuration, lane state, and drive ownership.
 *
 * 进程内 runtime 合同。配置、lane 投影、命令决策和 Drive 所有权；不写 Session。
 */

import type { RetryPolicy } from "@earendil-works/pi-ai";
import type { QueueMode } from "../../types.ts";
import type { AgentHarnessOptions, DriveOptions, DriveOutcome, HarnessEvent, Resources } from "../agent-harness.ts";
import type { CompactionSettings } from "../compaction/compaction.ts";
import { type Context, withoutAbortSignal } from "../context.ts";
import { createGate, type Gate, type GateControl } from "../execution/effect-gate.ts";
import type {
	CommitResult,
	InboxItem,
	LaneConfiguration,
	Operation,
	OperationResultRecord,
	OperationState,
	Write,
} from "../session/types.ts";
import type { AgentHarnessStreamOptions, AgentHarnessTool } from "../types.ts";

/**
 * Thrown until a later AgentHarness slice lands.
 *
 * 后续 slice 还没落地时抛。调用方不能当成功。
 */
export class SliceNotImplemented extends Error {
	constructor(operation: string) {
		super(`${operation} is not implemented until its later AgentHarness slice`);
		this.name = "SliceNotImplemented";
	}
}

/**
 * Current process-local harness configuration.
 *
 * 本进程 harness 配置。lane 不各自持一份；改配置立刻生效，不写 Session。
 */
export interface Config<TContext extends object | undefined> {
	readonly tools: AgentHarnessTool<TContext>[];
	readonly resources: Resources;
	readonly streamOptions: AgentHarnessStreamOptions;
	readonly retryPolicy: RetryPolicy;
	readonly compaction: CompactionSettings;
	readonly steeringMode: QueueMode;
	readonly followUpMode: QueueMode;
	readonly toolExecution: "sequential" | "parallel";
	readonly toolContext: AgentHarnessOptions<TContext>["toolContext"];
	readonly systemPrompt: AgentHarnessOptions<TContext>["systemPrompt"];
	readonly toProviderMessages: NonNullable<AgentHarnessOptions<TContext>["toProviderMessages"]>;
	readonly entryProjectors: Readonly<NonNullable<AgentHarnessOptions<TContext>["entryProjectors"]>>;
}

/**
 * The current durable state owned by one lane.
 *
 * 一条 lane 的权威内存投影。和 Session 标量成对；改状态用替换，不原地改。
 */
export interface LaneState {
	readonly tipId: string | null;
	readonly configuration: LaneConfiguration;
	readonly inbox: InboxItem[];
	readonly lastOperationId: string | null;
	readonly operation: Operation | null;
}

type Synchronous<TResult> = TResult extends PromiseLike<unknown> ? never : TResult;

interface CommitDecision<TResult> {
	kind: "commit";
	writes: Write[];
	materialize(commit: CommitResult): Synchronous<TResult>;
	events?(commit: CommitResult): HarnessEvent[];
}

/**
 * One effect-free decision made on a lane's serialized mutation line.
 *
 * 无副作用的 lane 决策。commit / return / reject 三选一；materialize 必须同步。
 */
export type LaneCommand<TResult> =
	| (CommitDecision<TResult> & { next: LaneState })
	| { kind: "return"; result: TResult }
	| { kind: "reject"; error: Error };

/**
 * Outcome of a forward-progress operation command.
 *
 * 前向推进命令的结果。cancel_requested 表示没跑 planner；result 才带值。
 */
export type ContinueOperationResult<TResult> = { kind: "cancel_requested" } | { kind: "result"; value: TResult };

/** A durable operation transition. The Lane pairs the state write with projection publication. */
type LanePatch = Partial<Pick<LaneState, "tipId" | "configuration" | "inbox">>;

interface FinishDecision<TResult> {
	kind: "finish";
	writes: Write[];
	record: OperationResultRecord;
	lane?: LanePatch;
	materialize(commit: CommitResult): Synchronous<TResult>;
	events?(commit: CommitResult): HarnessEvent[];
}

/**
 * Durable operation command: persist a state transition, finish the operation, or return without writing.
 *
 * 操作状态机的一步。commit 更新 state，finish 落结果并清空 current；Lane 配对写投影。
 */
export type OperationCommand<TResult> =
	| (CommitDecision<TResult> & { operationState: OperationState; lane?: LanePatch })
	| FinishDecision<TResult>
	| { kind: "return"; result: TResult };

/**
 * One installed process-local drive pass.
 *
 * 进程内一轮 drive 的所有权。同一 operation 同时只装一个；关 gate 会拒绝 completion。
 */
export class Drive {
	readonly operationId: string;
	readonly completion: Promise<DriveOutcome>;
	readonly gate: Gate;
	readonly context: Context;
	readonly waitForRetry: boolean;
	readonly closeSignal: AbortSignal;
	deferredPermits: number;

	private readonly control: GateControl;
	private readonly closeController: AbortController;
	private readonly resolveCompletion: (outcome: DriveOutcome) => void;
	private readonly rejectCompletion: (error: unknown) => void;

	constructor(options: DriveOptions, context: Context) {
		this.operationId = options.operationId;
		this.context = withoutAbortSignal(context);
		this.waitForRetry = options.waitForRetry ?? false;
		this.deferredPermits = options.pollDeferred === true ? 1 : 0;
		let resolveCompletion!: (outcome: DriveOutcome) => void;
		let rejectCompletion!: (error: unknown) => void;
		this.completion = new Promise<DriveOutcome>((resolve, reject) => {
			resolveCompletion = resolve;
			rejectCompletion = reject;
		});
		this.resolveCompletion = resolveCompletion;
		this.rejectCompletion = rejectCompletion;
		void this.completion.catch(() => {});
		const { gate, control } = createGate();
		this.gate = gate;
		this.control = control;
		this.closeController = new AbortController();
		this.closeSignal = this.closeController.signal;
	}

	settle(outcome: DriveOutcome): void {
		this.resolveCompletion(outcome);
	}

	fail(error: unknown): void {
		this.rejectCompletion(error);
	}

	beginAbort(cancellation: Promise<void>): void {
		this.control.beginAbort(cancellation);
	}

	signalAbort(): void {
		this.control.signalAbort();
	}

	closeGate(error: Error): void {
		this.control.close(error);
		if (!this.closeSignal.aborted) this.closeController.abort(error);
		this.rejectCompletion(error);
	}
}

/**
 * Exit of one durable drive procedure.
 *
 * 单步 durable procedure 的出口。continue 必须已推进 state，否则 drive 当 invariant 故障。
 */
export type ProcedureResult =
	| { kind: "continue" }
	| { kind: "waiting"; outcome: DriveOutcome }
	| { kind: "settled"; outcome: OperationResultRecord };
