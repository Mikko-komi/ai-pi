/**
 * Public AgentHarness facade: lanes, operations, hooks, and events.
 *
 * 按 lane 驱动持久化会话的门面。和旧的 `Agent` 循环并列；I/O 仍在宿主。
 */

import type { JsonRepresentation } from "@earendil-works/chord";
import type {
	Api,
	AssistantMessage,
	AssistantMessageEvent,
	AssistantMessageFrame,
	DeferredHandle,
	ImageContent,
	Message,
	Model,
	Models,
	RetryPolicy,
	ToolResultMessage,
	Usage,
} from "@earendil-works/pi-ai";
import type { AgentMessage, AgentToolResult, QueueMode, ThinkingLevel } from "../types.ts";
import type { BranchPreparation, BranchSummaryResult } from "./compaction/branch-summarization.ts";
import type { CompactionPreparation, CompactionSettings, CompactResult } from "./compaction/compaction.ts";
import type { Context } from "./context.ts";
import type {
	Closed,
	InvalidMessage,
	InvalidNavigation,
	LaneBusy,
	NoActiveOperation,
	NothingToCompact,
	NothingToResume,
	OperationMismatch,
	Result,
	UnknownSkill,
	UnknownTarget,
	UnknownTemplate,
} from "./result.ts";

export {
	Closed,
	HarnessClosed,
	HarnessFault,
	InvalidLane,
	InvalidMessage,
	InvalidNavigation,
	LaneBusy,
	NoActiveOperation,
	NoActiveRun,
	NothingToCompact,
	NothingToResume,
	OperationMismatch,
	UnknownSkill,
	UnknownTarget,
	UnknownTemplate,
} from "./result.ts";
export { SliceNotImplemented } from "./runtime/types.ts";

import { createAgentHarness } from "./runtime/harness.ts";
import type {
	BranchScan,
	Entry,
	EntryProjector,
	JsonValue,
	LaneConfiguration,
	OperationError,
	OperationResultRecord,
	Session,
	SessionStats,
	SettledAssistantMessage,
	UsageRow,
} from "./session/types.ts";
import type {
	AgentHarnessResources,
	AgentHarnessStreamOptions,
	AgentHarnessStreamOptionsPatch,
	AgentHarnessTool,
	PromptTemplate,
	Skill,
} from "./types.ts";

/**
 * Convenience-only suspended run observation, constructed when M8 exposes public drive.
 *
 * 挂起的 run 观察值。要等公开 drive 后才有实际构造路径。
 */
export interface SuspendedRun {
	operationId: string;
	status: "suspended";
	deferred: DeferredHandle;
}

/** prompt / skill / template 跑完或挂起后的结果。 */
export type RunResult = Result<
	OperationResultRecord | SuspendedRun,
	LaneBusy | InvalidMessage | UnknownSkill | UnknownTemplate | Closed
>;
/**
 * Result of compacting a lane, optionally followed by an automatic run.
 *
 * 压缩完成后的结果。成功臂可带紧随其后的 run。
 */
export type CompactionResult = Result<
	{ compaction: OperationResultRecord; run?: OperationResultRecord | SuspendedRun },
	LaneBusy | NothingToCompact | Closed
>;
/**
 * Result of navigating a lane to another tree target.
 *
 * 导航到另一树节点后的结果。成功臂可带紧随其后的 run。
 */
export type NavigationResult = Result<
	{ navigation: OperationResultRecord; run?: OperationResultRecord | SuspendedRun },
	LaneBusy | InvalidNavigation | UnknownTarget | Closed
>;
/**
 * Result of resuming a suspended lane operation.
 *
 * 恢复挂起操作后的结果。没有可恢复物时失败。
 */
export type ResumeResult = Result<OperationResultRecord | SuspendedRun, NothingToResume | Closed>;
/**
 * Result of enqueueing a steer, follow-up, or next-run message.
 *
 * 入队 steer / followUp / nextRun 后的结果。成功臂带回 entryId。
 */
export type QueueResult = Result<{ entryId: string }, InvalidMessage | Closed>;
/**
 * Result of cancelling a queued entry before it is consumed.
 *
 * 取消尚未消费的队列项。已消费或找不到也走成功臂上的 kind。
 */
export type CancelQueuedResult = Result<{ kind: "cancelled" | "already_consumed" | "not_found" }, Closed>;
/**
 * Result of aborting the lane's current operation.
 *
 * 中止当前操作后的结果。带回已入队的 steer 和 followUp。
 */
export type AbortResult = Result<
	{ operationId: string; steer: AgentMessage[]; followUp: AgentMessage[] },
	NoActiveOperation | Closed
>;
/**
 * Result of recording a usage row onto the session.
 *
 * 往会话记下一条用量。成功臂带回 usageId。
 */
export type RecordUsageResult = Result<{ usageId: string }, Closed>;

/**
 * Options for tree navigation, including optional branch summarization.
 *
 * 导航选项。summarize 时才做分支摘要。
 */
export interface NavigateOptions {
	summarize?: boolean;
	label?: string;
	customInstructions?: string;
}

/**
 * One admitted unit of work a lane can accept.
 *
 * lane 能受理的一种工作：prompt、skill、模板、压缩或导航。
 */
export type OperationRequest =
	| { kind: "prompt"; operationId?: string; prompt: string; images?: ImageContent[] }
	| { kind: "prompt"; operationId?: string; prompt: AgentMessage | AgentMessage[]; images?: never }
	| { kind: "skill"; operationId?: string; name: string; additionalInstructions?: string }
	| { kind: "prompt_template"; operationId?: string; name: string; args?: string[] }
	| { kind: "compaction"; operationId?: string; customInstructions?: string }
	| { kind: "navigation"; operationId?: string; targetId: string | null; options?: NavigateOptions };

/**
 * Receipt that a lane accepted one operation and assigned it an id.
 *
 * 受理回执。lane 已收下这次操作并分配了 id。
 */
export interface OperationAdmission {
	operationId: string;
	kind: "run" | "compaction" | "navigation";
	startedAt: number;
}

/**
 * Why a lane refused to admit an operation.
 *
 * lane 拒绝受理的原因：忙、非法负载、未知资源或已关闭。
 */
export type OperationAdmissionError =
	| LaneBusy
	| InvalidMessage
	| UnknownSkill
	| UnknownTemplate
	| NothingToCompact
	| InvalidNavigation
	| UnknownTarget
	| Closed;
/**
 * Admission outcome: receipt or a typed refusal.
 *
 * 受理结果。成功是回执，失败是带 tag 拒绝。
 */
export type OperationAdmissionResult = Result<OperationAdmission, OperationAdmissionError>;

/**
 * Identifies which admitted operation to drive, and how to wait.
 *
 * 指定要推进的已受理操作，以及是否等重试 / 挂起。
 */
export interface DriveOptions {
	operationId: string;
	waitForRetry?: boolean;
	pollDeferred?: boolean;
}

/**
 * Provider plus model id used to pin or report a captured model.
 *
 * 提供方 + 模型 id。用来钉死或回报捕获到的模型。
 */
export interface ModelIdentity {
	provider: string;
	modelId: string;
}

/**
 * Lifecycle of an in-flight lane operation.
 *
 * 飞行中操作的生命周期：跑着、打开待 drive、或正在中止。
 */
export type OperationStatus = "running" | "open" | "aborting";

/**
 * Snapshot of the operation currently bound to a lane.
 *
 * 这条 lane 当前绑着的操作。没有操作时调用方看到 null，不是本类型。
 */
export interface CurrentOperationInfo {
	id: string;
	kind: "run" | "compaction" | "navigation";
	startedAt: number;
	status: OperationStatus;
	capturedModel?: ModelIdentity;
}

/**
 * Live execution view of one lane: tip, model, and current operation.
 *
 * 一条 lane 的执行面快照：tip、配置模型和当前操作。
 */
export interface LaneExecutionInfo {
	lane: string;
	tipId: string | null;
	configuredModel: ModelIdentity;
	current: CurrentOperationInfo | null;
	lastOperationId: string | null;
}

/**
 * Successful drive progress: settled, waiting on retry, or deferred.
 *
 * 一次 drive 的成功推进：已结算、等重试、或挂起等 deferred。
 */
export type DriveOutcome =
	| { kind: "settled"; outcome: OperationResultRecord }
	| { kind: "waiting"; operationId: string; reason: "retry"; notBefore: number }
	| { kind: "waiting"; operationId: string; reason: "deferred"; deferred: DeferredHandle };
/**
 * Result of driving an admitted operation to the next wait or settle.
 *
 * 把已受理操作推进到下一个等待点或结算。对错操作则失败。
 */
export type DriveResult = Result<DriveOutcome, OperationMismatch | Closed>;

/**
 * Result of requesting abort for a specific operation id.
 *
 * 对指定操作请求中止。newlyRequested 区分本次才提出还是早已在中止。
 */
export type AbortRequestResult = Result<
	{
		operationId: string;
		newlyRequested: boolean;
		steer: AgentMessage[];
		followUp: AgentMessage[];
	},
	OperationMismatch | Closed
>;

/**
 * Subscription handle that yields a snapshot and later event updates.
 *
 * 观察句柄。先给快照，再靠 listener 收后续事件；unsubscribe 结束订阅。
 */
export interface WatchHandle<T> {
	snapshot: T;
	start(listener: EventListener): void;
	resnapshot(context: Context): Promise<T>;
	unsubscribe(): void;
}

/**
 * Lightweight listing of one named lane and its current operation.
 *
 * 一条命名 lane 的轻量条目：tip 和当前操作。
 */
export interface LaneInfo {
	name: string;
	tipId: string | null;
	operation: CurrentOperationInfo | null;
}

/**
 * Tool call as seen on a lane snapshot: still running or already settled.
 *
 * 快照里的一次工具调用。running 时 result 可选；settled 时必有结果。
 */
export type LaneSnapshotTool =
	| {
			status: "running";
			toolCallId: string;
			toolName: string;
			args: unknown;
			result?: AgentToolResult<unknown>;
	  }
	| {
			status: "settled";
			toolCallId: string;
			toolName: string;
			args: unknown;
			result: AgentToolResult<unknown>;
			isError: boolean;
	  };

/**
 * An operation still open when the harness is (re)attached to a session.
 *
 * 接到会话时仍未关的操作。给恢复路径用。
 */
export interface OpenOperation {
	lane: string;
	operationId: string;
	kind: "run" | "compaction" | "navigation";
	startedAt: number;
	aborting?: true;
}

/**
 * One queued steer, follow-up, next-run, or custom write waiting on a lane.
 *
 * 等在 lane 上的一条队列项：steer / followUp / nextRun 或自定义 write。
 */
export type LaneQueuedItem =
	| {
			entryId: string;
			kind: "steer" | "followUp" | "nextRun" | "write";
			type: "message";
			message: AgentMessage;
	  }
	| { entryId: string; kind: "write"; type: "custom"; customType: string; data?: JsonValue };

/**
 * Full observable state of one lane for watchers and remote transcripts.
 *
 * 一条 lane 的完整可观察状态。给 watch 和远程 transcript 用。
 */
export interface LaneSnapshot {
	lane: string;
	transcript: Entry[];
	tipId: string | null;
	lastResult?: OperationResultRecord;
	configuration: LaneConfiguration;
	stats: SessionStats;
	operation: null | {
		id: string;
		kind: "run" | "compaction" | "navigation";
		startedAt: number;
		fromTipId: string | null;
		status: OperationStatus;
		retry?: { attempt: number; maxAttempts: number; nextAttemptAt: number };
		deferred?: { handle: DeferredHandle; poll: number };
		streamingMessage?: AssistantMessage;
		runningTools: LaneSnapshotTool[];
	};
	queues: LaneQueuedItem[];
	faulted: boolean;
}

/**
 * Session-wide listing of lanes plus a harness fault flag.
 *
 * 整个会话的 lane 列表和故障标记。不含单条 transcript。
 */
export interface SessionSnapshot {
	lanes: LaneInfo[];
	faulted: boolean;
}

/**
 * Discriminated payload for every harness event type, before lane tagging.
 *
 * 每种 harness 事件的判别负载。还没贴 lane / recovery。
 */
export type HarnessEventPayload =
	| { type: "run_start"; runId: string; startedAt: number }
	| { type: "run_resume"; runId: string }
	| { type: "run_suspend"; runId: string; reason: "deferred"; deferred: DeferredHandle; poll: number }
	| { type: "operation_abort"; operationId: string; steer: AgentMessage[]; followUp: AgentMessage[] }
	| ({ type: "run_end"; runId: string; fromTipId: string | null; tipId: string | null; endedAt: number } & (
			| { status: "completed" | "aborted"; error?: never }
			| { status: "failed"; error: OperationError }
	  ))
	| { type: "fault"; code: string; message: string }
	| ({ type: "handler_error"; error: string; stack?: string } & (
			| { kind: "hook"; hook: string }
			| { kind: "event"; event: string }
	  ))
	| { type: "turn_start"; runId: string; turnId: string }
	| {
			type: "turn_end";
			runId: string;
			turnId: string;
			message: AssistantMessage;
			toolResults: ToolResultMessage[];
	  }
	| {
			type: "retry_scheduled";
			runId: string;
			step: string;
			attempt: number;
			maxAttempts: number;
			delayMs: number;
			notBefore: number;
			errorMessage: string;
	  }
	| { type: "retry_start"; runId: string; step: string; attempt: number }
	| {
			type: "retry_end";
			runId: string;
			step: string;
			attempt: number;
			success: boolean;
			finalError?: string;
	  }
	| { type: "message_start"; runId?: string; message: AgentMessage }
	| {
			type: "message_update";
			runId: string;
			message: AgentMessage;
			event: AssistantMessageEvent;
			frame?: AssistantMessageFrame;
	  }
	| { type: "message_end"; runId?: string; message: AgentMessage; entryId?: string }
	| {
			type: "tool_start";
			runId: string;
			turnId: string;
			toolCallId: string;
			toolName: string;
			args: unknown;
	  }
	| {
			type: "tool_update";
			runId: string;
			turnId: string;
			toolCallId: string;
			toolName: string;
			partialResult: AgentToolResult<unknown>;
	  }
	| {
			type: "tool_end";
			runId: string;
			turnId: string;
			toolCallId: string;
			toolName: string;
			result: AgentToolResult<unknown>;
			isError: boolean;
			terminate: boolean;
	  }
	| { type: "entry_added"; entry: Entry }
	| { type: "queue_update"; queues: LaneQueuedItem[] }
	| ({ type: "value_update" } & (
			| { value: "session_name"; name: string | undefined }
			| { value: "entry_label"; targetId: string; label: string | undefined }
	  ))
	| ({ type: "config_update" } & (
			| {
					property: "model";
					value: { provider: string; modelId: string };
					previous: unknown;
			  }
			| { property: "thinkingLevel"; value: ThinkingLevel; previous: ThinkingLevel }
			| { property: "activeTools"; value: string[]; previous: string[] }
			| { property: "tools" | "resources" }
			| {
					property: "streamOptions";
					value: AgentHarnessStreamOptions;
					previous: AgentHarnessStreamOptions;
			  }
			| { property: "retryPolicy"; value: RetryPolicy; previous: RetryPolicy }
			| { property: "compactionSettings"; value: CompactionSettings; previous: CompactionSettings }
			| { property: "steeringMode"; value: QueueMode; previous: QueueMode }
			| { property: "followUpMode"; value: QueueMode; previous: QueueMode }
	  ))
	| {
			type: "compaction_start";
			runId: string;
			reason: "manual" | "threshold" | "overflow";
			startedAt: number;
	  }
	| ({ type: "compaction_end"; runId: string; reason: "manual" | "threshold" | "overflow"; endedAt: number } & (
			| { status: "completed"; entryId: string; error?: never }
			| { status: "declined" | "aborted"; entryId?: never; error?: never }
			| { status: "failed"; entryId?: never; error: OperationError }
	  ))
	| { type: "navigation_start"; runId: string; targetId: string | null; startedAt: number }
	| ({ type: "navigation_end"; runId: string; fromTipId: string | null; tipId: string | null; endedAt: number } & (
			| { status: "completed" | "declined" | "aborted"; error?: never }
			| { status: "failed"; error: OperationError }
	  ))
	| { type: "lane_created"; at: string | null }
	| { type: "usage"; lane: string; row: UsageRow; totals: Usage };

/**
 * Session-scoped or cross-cutting events that are not ordinary lane traffic.
 *
 * 会话级或横切事件：故障、用量、配置、值更新、handler 错误。
 */
export type SpecialEventPayload = Extract<
	HarnessEventPayload,
	{ type: "fault" | "value_update" | "usage" | "config_update" | "handler_error" }
>;
/**
 * Event payloads that always belong to one named lane.
 *
 * 一定属于某条 lane 的事件负载。从总表里去掉 SpecialEventPayload。
 */
export type LaneEventPayload = Exclude<HarnessEventPayload, SpecialEventPayload>;
/**
 * Payload for a config_update event, lane-scoped or global.
 *
 * config_update 负载。属性可能是 lane 级或全局。
 */
export type ConfigEventPayload = Extract<HarnessEventPayload, { type: "config_update" }>;
/**
 * Config updates that are stored per lane: model, thinking, active tools.
 *
 * 按 lane 存的配置变更：模型、思考级别、活动工具。
 */
export type LaneConfigEventPayload = Extract<
	ConfigEventPayload,
	{ property: "model" | "thinkingLevel" | "activeTools" }
>;
/**
 * Config updates that apply to the whole harness, not one lane.
 *
 * 作用在整个 harness 上的配置变更，不是某条 lane。
 */
export type GlobalConfigEventPayload = Exclude<ConfigEventPayload, LaneConfigEventPayload>;
/**
 * Payload when a hook or event listener throws.
 *
 * hook 或事件监听器抛错时的负载。kind 区分来源。
 */
export type HandlerErrorPayload = Extract<HarnessEventPayload, { type: "handler_error" }>;

/**
 * Public event delivered to listeners, with optional lane and recovery flags.
 *
 * 发给监听器的公开事件。lane 事件可贴 recovery；全局事件不带 lane。
 */
export type HarnessEvent =
	| (LaneEventPayload & { lane: string; recovery?: true })
	| (LaneConfigEventPayload & { lane: string; recovery?: true })
	| (Extract<HarnessEventPayload, { type: "fault" | "value_update" }> & {
			lane?: never;
			recovery?: never;
	  })
	| (Extract<HarnessEventPayload, { type: "usage" }> & { recovery?: never })
	| (GlobalConfigEventPayload & { lane?: never; recovery?: never })
	| (HandlerErrorPayload & ({ lane: string; recovery?: true } | { lane?: never; recovery?: never }));

type LaneWatchSourceEvent =
	| Exclude<
			HarnessEvent,
			| { type: "handler_error" | "turn_start" | "turn_end" | "value_update" | "lane_created" | "message_update" }
			| ({ type: "config_update" } & { property: string })
	  >
	| Extract<HarnessEvent, { type: "config_update"; property: "model" | "thinkingLevel" | "activeTools" }>
	| Omit<Extract<HarnessEvent, { type: "message_update" }>, "event">;

/**
 * Strict-JSON snapshot representation published to remote transcript consumers.
 *
 * 发给远程 transcript 消费者的严格 JSON lane 快照。
 */
export type LaneTranscriptSnapshot = JsonRepresentation<LaneSnapshot>;
/**
 * Reducer-relevant strict-JSON Harness events published to remote transcript consumers.
 *
 * 发给远程 transcript 消费者的、reducer 关心的严格 JSON 事件。
 */
export type LaneWatchEvent = JsonRepresentation<LaneWatchSourceEvent>;

/**
 * Discriminator string for {@link HarnessEvent}.
 *
 * {@link HarnessEvent} 的 type 判别字面量。
 */
export type HarnessEventType = HarnessEvent["type"];
/**
 * Async-capable listener invoked with one event and the current context.
 *
 * 事件监听器。可同步或异步；拿到事件和当前 Context。
 */
export type EventListener<TEvent extends HarnessEvent = HarnessEvent> = (
	event: TEvent,
	context: Context,
) => void | Promise<void>;

/**
 * Typed subscription surface for harness events.
 *
 * 按事件 type 订阅。返回的函数取消该监听。
 */
export interface Events {
	on<TType extends HarnessEventType>(
		type: TType,
		listener: EventListener<Extract<HarnessEvent, { type: TType }>>,
	): () => void;
}

/**
 * Skills and prompt templates injected into the harness.
 *
 * 注入 harness 的 skill 和提示模板。
 */
export type Resources = AgentHarnessResources<Skill, PromptTemplate>;

type VoidHookResult = ReturnType<() => void>;

/**
 * Named hook points and the event/result each handler may see or return.
 *
 * 生命周期钩子表。返回 `undefined` 表示不改当前行为。
 */
export interface HookMap {
	before_run: {
		event: { prompt: AgentMessage[]; resources: Resources };
		result: { messages?: AgentMessage[] } | undefined;
	};
	before_drive: {
		event: { operation: "run" | "compaction" | "navigation" };
		result: VoidHookResult;
	};
	before_run_end: {
		event: { runId: string; messages: AgentMessage[] };
		result: { followUp?: string } | undefined;
	};
	transform_context: {
		event: { messages: AgentMessage[]; systemPrompt: string };
		result: { messages?: AgentMessage[]; systemPrompt?: string } | undefined;
	};
	before_request: {
		event: {
			model: Model<Api>;
			step: "assistant" | "deferred" | "compaction" | "branch_summary";
			attempt: number;
			streamOptions: AgentHarnessStreamOptions;
		};
		result: { streamOptions?: AgentHarnessStreamOptionsPatch } | undefined;
	};
	before_payload: {
		event: { model: Model<Api>; payload: unknown };
		result: { payload: unknown } | undefined;
	};
	after_response: {
		event: { status?: number; headers?: Record<string, string>; message: SettledAssistantMessage };
		result: { message?: SettledAssistantMessage } | undefined;
	};
	before_tool: {
		event: { toolCallId: string; toolName: string; args: Record<string, JsonValue> };
		result: { args?: Record<string, JsonValue>; block?: { reason: string; terminate?: boolean } } | undefined;
	};
	after_tool: {
		event: {
			toolCallId: string;
			toolName: string;
			args: Record<string, JsonValue>;
			content: AgentToolResult<unknown>["content"];
			details?: JsonValue;
			isError: boolean;
			usage?: Usage;
		};
		result:
			| {
					content?: AgentToolResult<unknown>["content"];
					details?: JsonValue;
					isError?: boolean;
					usage?: Usage;
					terminate?: boolean;
			  }
			| undefined;
	};
	before_compaction: {
		event: {
			reason: "manual" | "threshold" | "overflow";
			preparation: CompactionPreparation;
			customInstructions?: string;
		};
		result: { decline?: boolean; compaction?: CompactResult } | undefined;
	};
	before_navigation: {
		event: { targetId: string; preparation: BranchPreparation; customInstructions?: string };
		result: { decline?: boolean; summary?: BranchSummaryResult } | undefined;
	};
}

/**
 * Registered hook point name from {@link HookMap}.
 *
 * {@link HookMap} 里已登记的钩子名。
 */
export type HookName = keyof HookMap;
/**
 * Hook event plus the lane and run that invoked it.
 *
 * 某次钩子调用：HookMap 事件再加上 lane 和 runId。
 */
export type HookInvocation<TName extends HookName> = HookMap[TName]["event"] & {
	lane: string;
	runId: string;
};
/**
 * Handler for one named hook; returning undefined leaves behavior unchanged.
 *
 * 某个钩子的处理函数。返回 undefined 表示不改当前行为。
 */
export type HookHandler<TName extends HookName> = (
	event: HookInvocation<TName>,
	context: Context,
) => Promise<HookMap[TName]["result"]> | HookMap[TName]["result"];

/**
 * Typed registration surface for lifecycle hooks.
 *
 * 按钩子名注册。可选 id 便于排查；返回的函数取消该 handler。
 */
export interface Hooks {
	on<TName extends HookName>(name: TName, handler: HookHandler<TName>, options?: { id?: string }): () => void;
}

export type { EntryProjector } from "./session/types.ts";

/**
 * Construction inputs for {@link AgentHarness.create}.
 *
 * 把一个已打开的 {@link Session} 接到 harness。模型、工具和资源都在这里注入。
 */
export interface AgentHarnessOptions<TContext extends object | undefined = object | undefined> {
	session: Session;
	models: Models;
	model: Model<Api>;
	thinkingLevel?: ThinkingLevel;
	activeToolNames?: string[];
	tools?: AgentHarnessTool<TContext>[];
	toolContext?: TContext | ((context: Context) => TContext | Promise<TContext>);
	systemPrompt?: string | ((toolContext: TContext, context: Context) => string | Promise<string>);
	resources?: Resources;
	streamOptions?: AgentHarnessStreamOptions;
	retry?: RetryPolicy;
	compaction?: CompactionSettings;
	steeringMode?: QueueMode;
	followUpMode?: QueueMode;
	toolExecution?: "sequential" | "parallel";
	toProviderMessages?: (messages: AgentMessage[], context: Context) => Message[] | Promise<Message[]>;
	entryProjectors?: Record<string, EntryProjector>;
}

/**
 * One named execution lane on a session tree.
 *
 * 会话树上的一条执行 lane。同时只能飞一个操作；steer/followUp 进队列。
 */
export interface AgentLane {
	readonly name: string;
	getTipId(context: Context): Promise<string | null>;
	findEntries(query: BranchScan | undefined, context: Context): Promise<Entry[]>;
	findEntry(query: BranchScan | undefined, context: Context): Promise<Entry | undefined>;
	appendMessage(message: AgentMessage, context: Context): Promise<string>;
	appendCustomEntry(customType: string, data: JsonValue | undefined, context: Context): Promise<string>;
	getResult(operationId: string, context: Context): Promise<OperationResultRecord | undefined>;
	accept(request: OperationRequest, context: Context): Promise<OperationAdmissionResult>;
	drive(options: DriveOptions, context: Context): Promise<DriveResult>;
	requestAbort(operationId: string, context: Context): Promise<AbortRequestResult>;
	inspectExecution(context: Context): Promise<LaneExecutionInfo>;
	prompt(text: string, images: ImageContent[] | undefined, context: Context): Promise<RunResult>;
	prompt(message: AgentMessage | AgentMessage[], context: Context): Promise<RunResult>;
	skill(name: string, additionalInstructions: string | undefined, context: Context): Promise<RunResult>;
	promptFromTemplate(name: string, args: string[] | undefined, context: Context): Promise<RunResult>;
	compact(options: { customInstructions?: string } | undefined, context: Context): Promise<CompactionResult>;
	navigateTree(
		targetId: string | null,
		options: NavigateOptions | undefined,
		context: Context,
	): Promise<NavigationResult>;
	resume(context: Context): Promise<ResumeResult>;
	abort(context: Context): Promise<AbortResult>;
	steer(message: string | AgentMessage, images: ImageContent[] | undefined, context: Context): Promise<QueueResult>;
	followUp(message: string | AgentMessage, images: ImageContent[] | undefined, context: Context): Promise<QueueResult>;
	nextRun(message: string | AgentMessage, images: ImageContent[] | undefined, context: Context): Promise<QueueResult>;
	cancelQueued(entryId: string, context: Context): Promise<CancelQueuedResult>;
	recordUsage(
		usage: Usage,
		options: { entryId?: string; details?: JsonValue } | undefined,
		context: Context,
	): Promise<RecordUsageResult>;
	waitForIdle(context: Context): Promise<void>;
	runWhenIdle(callback: (context: Context) => void | Promise<void>, context: Context): Promise<void>;
	getModel(context: Context): Promise<Model<Api> | undefined>;
	setModel(model: ModelIdentity, context: Context): Promise<void>;
	getThinkingLevel(context: Context): Promise<ThinkingLevel>;
	setThinkingLevel(level: ThinkingLevel, context: Context): Promise<void>;
	getActiveTools(context: Context): Promise<string[]>;
	setActiveTools(names: string[], context: Context): Promise<void>;
	watch(context: Context): Promise<WatchHandle<LaneSnapshot>>;
}

/**
 * Options for acquiring a named lane, including where to create it.
 *
 * 取用命名 lane 的选项。createAt 指定在哪棵树上创建。
 */
export interface AcquireLaneOptions {
	createAt?: string | null;
}

/**
 * Durable harness bound to one open session.
 *
 * 绑在一个打开 Session 上的门面。用 `lane()` 取执行面；`hooks` / `events` 是只读订阅口。
 */
export interface AgentHarness<TContext extends object | undefined = object | undefined> {
	lane(name: string, context: Context): Promise<AgentLane>;
	lane(name: string, options: AcquireLaneOptions, context: Context): Promise<AgentLane>;
	lanes(context: Context): Promise<LaneInfo[]>;
	getName(context: Context): Promise<string | undefined>;
	setName(name: string | undefined, context: Context): Promise<void>;
	getLabel(targetId: string, context: Context): Promise<string | undefined>;
	setLabel(targetId: string, label: string | undefined, context: Context): Promise<void>;
	getTools(context: Context): Promise<AgentHarnessTool<TContext>[]>;
	setTools(tools: AgentHarnessTool<TContext>[], context: Context): Promise<void>;
	getResources(context: Context): Promise<Resources>;
	setResources(resources: Resources, context: Context): Promise<void>;
	getStreamOptions(context: Context): Promise<AgentHarnessStreamOptions>;
	setStreamOptions(options: AgentHarnessStreamOptions, context: Context): Promise<void>;
	getRetryPolicy(context: Context): Promise<RetryPolicy>;
	setRetryPolicy(policy: RetryPolicy, context: Context): Promise<void>;
	getCompactionSettings(context: Context): Promise<CompactionSettings>;
	setCompactionSettings(settings: CompactionSettings, context: Context): Promise<void>;
	getSteeringMode(context: Context): Promise<QueueMode>;
	setSteeringMode(mode: QueueMode, context: Context): Promise<void>;
	getFollowUpMode(context: Context): Promise<QueueMode>;
	setFollowUpMode(mode: QueueMode, context: Context): Promise<void>;
	watchSession(context: Context): Promise<WatchHandle<SessionSnapshot>>;
	readonly hooks: Hooks;
	readonly events: Events;
	close(context: Context): Promise<void>;
}

/**
 * Async constructor surface for {@link AgentHarness}.
 *
 * 异步构造口。`create` 可能带回已经 open 的操作，供恢复用。
 */
export interface AgentHarnessConstructor {
	create<TContext extends object | undefined = object | undefined>(
		options: AgentHarnessOptions<TContext>,
		context: Context,
	): Promise<{ harness: AgentHarness<TContext>; open: OpenOperation[] }>;
}

/**
 * Runtime constructor for attaching the durable harness to one open session.
 *
 * 运行时构造器。真正实现在 `runtime/harness.ts`。
 */
export const AgentHarness = { create: createAgentHarness } satisfies AgentHarnessConstructor;
