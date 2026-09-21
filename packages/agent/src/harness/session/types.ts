/**
 * Durable session tree, operations, storage, and repository contracts.
 *
 * 会话树、操作状态和存储合同。这里的 Session 是 harness 持久化会话，不是 coding-agent 的 AgentSession。
 */

import type { JsonValue } from "@earendil-works/chord";
import type { AssistantMessage, StopReason, Usage } from "@earendil-works/pi-ai";
import type { AgentMessage, QueueMode, ThinkingLevel } from "../../types.ts";
import type { BranchPreparation } from "../compaction/branch-summarization.ts";
import type { CompactionPreparation, CompactionSettings } from "../compaction/compaction.ts";
import type { Context } from "../context.ts";
import type { AgentHarnessStreamOptions } from "../types.ts";
import type { ListElement, ListReadOptions, ListWrite, StoredValue, Value, ValueList, ValueWrite } from "./values.ts";

export type { JsonValue } from "@earendil-works/chord";

/**
 * Assistant message that has left the pending generation state.
 *
 * 已落定的 assistant 消息。`stopReason` 不能再是 pending。
 */
export type SettledAssistantMessage = AssistantMessage & {
	stopReason: Exclude<StopReason, "pending">;
};

/**
 * Kind of a durable session-tree node.
 *
 * 会话树节点种类。custom 必须再带 `customType`。
 */
export type EntryType = "message" | "compaction" | "branch_summary" | "custom";

/**
 * Identity fields shared by every persisted entry.
 *
 * 所有 Entry 的公共身份。`parentId` 为 null 表示根。
 */
export interface EntryBase {
	id: string;
	parentId: string | null;
	seq: number;
	timestamp: number;
	type: EntryType;
	customType?: string;
}

/**
 * Tree node that stores one {@link AgentMessage}.
 *
 * 树上的一条 AgentMessage。pending assistant 不能进树。
 */
export interface MessageEntry extends EntryBase {
	type: "message";
	message: AgentMessage;
	terminate?: true;
}

/**
 * Tree node that replaces earlier history with a compaction summary.
 *
 * 压缩节点。`retainedTail` 是压缩后仍保留的尾巴，不是被摘要掉的部分。
 */
export interface CompactionEntry extends EntryBase {
	type: "compaction";
	summary: string;
	retainedTail: AgentMessage[];
	tokensBefore: number;
	details?: JsonValue;
	usage?: Usage;
	fromHook: boolean;
}

/**
 * Tree node inserted when returning from another branch.
 *
 * 从另一分支回来时插入的摘要。`fromId` 指向离开的那个节点。
 */
export interface BranchSummaryEntry extends EntryBase {
	type: "branch_summary";
	fromId: string | null;
	summary: string;
	details?: JsonValue;
	usage?: Usage;
	fromHook: boolean;
}

/**
 * Application-defined tree node.
 *
 * 应用自定义节点。要进模型必须经 {@link EntryProjector}。
 */
export interface CustomEntry extends EntryBase {
	type: "custom";
	customType: string;
	data?: JsonValue;
}

/**
 * Convert an application-defined custom entry into model context.
 *
 * 把 custom 条目投影成模型消息。返回 undefined 等于不进上下文。
 */
export type EntryProjector = (
	entry: CustomEntry,
	context: Context,
) => AgentMessage[] | undefined | Promise<AgentMessage[] | undefined>;

/**
 * One persisted node on the session tree.
 *
 * 会话树上的一种节点。四种 `type` 互斥。
 */
export type Entry = MessageEntry | CompactionEntry | BranchSummaryEntry | CustomEntry;

/**
 * Entry supplied to a transaction before storage assigns sequence and timestamp.
 *
 * 提交前的条目。`seq` / `timestamp` 由存储分配，调用方不能填。
 */
export type NewEntry<TEntry extends Entry = Entry> = TEntry extends Entry ? Omit<TEntry, "seq" | "timestamp"> : never;

/**
 * Model, thinking, and tool names bound to one AgentLane.
 *
 * lane 的模型/思考/工具配置。必须和 {@link LaneState} 成对出现。
 */
export interface LaneConfiguration {
	model: { provider: string; modelId: string };
	thinkingLevel: ThinkingLevel;
	activeToolNames: string[];
}

/**
 * Immutable identity of one in-flight operation.
 *
 * 一次操作的不可变身份。`intent` 决定这次是 run / 压缩 / 导航。
 */
export interface OperationMeta {
	operationId: string;
	lane: string;
	sourceTipId: string | null;
	startedAt: number;
	intent:
		| { kind: "run"; promptEntryIds: string[] }
		| { kind: "compaction"; customInstructions?: string }
		| {
				kind: "navigation";
				targetId: string | null;
				summarize: boolean;
				label?: string;
				customInstructions?: string;
		  };
}

/**
 * Cancellation channel carried beside operation state.
 *
 * 取消通道。和 {@link OperationState} 正交，不进 `at` 判别。
 */
export type Control =
	| { status: "running" }
	| {
			status: "cancel_requested";
			requestedAt: number;
	  };

/**
 * Stable failure recorded on a terminal operation.
 *
 * 操作失败的稳定码。`details` 必须能 JSON 序列化。
 */
export interface OperationError {
	code: string;
	message: string;
	details?: JsonValue;
}

/**
 * Terminal outcomes for an operation. Running is not a member.
 *
 * 操作终态。只有这四种，没有 running。
 */
export type TerminalStatus = "completed" | "declined" | "aborted" | "failed";

/**
 * Immutable lane-lived observation record written by one terminal transaction.
 *
 * 一次终态事务写下的观察记录。对 lane 只追加，不改历史。
 */
export interface OperationResultRecord {
	operationId: string;
	kind: OperationMeta["intent"]["kind"];
	status: TerminalStatus;
	error?: OperationError;
	fromTipId: string | null;
	tipId: string | null;
	startedAt: number;
	endedAt: number;
}

/**
 * How a checkpoint should continue after restore.
 *
 * checkpoint 之后怎么接着跑。`overflowRecoveryUsed` 只记是否已用过溢出恢复。
 */
export type Continuation =
	| { kind: "need_assistant"; overflowRecoveryUsed: boolean }
	| { kind: "may_finish"; includeFinalAssistant: boolean };

/**
 * Checkpoint payload; the flat leaf literal replaces the old nested phase tag.
 *
 * 可恢复检查点。扁平叶子，不再套旧的 phase 标签。
 */
export interface CheckpointData {
	continuation: Continuation;
	triggerEntryId: string;
}

/**
 * Kind of a queued inbox item.
 *
 * inbox 项种类。`write` 是会话写，不是模型输出。
 */
export type InboxItemKind = "steer" | "followUp" | "nextRun" | "write";

/**
 * One queued item pointing at an already persisted entry.
 *
 * 排队项。`entryId` 指向已持久化的条目。
 */
export interface InboxItem {
	entryId: string;
	kind: InboxItemKind;
}

/**
 * Retry policy with concrete numeric bounds.
 *
 * 已展开的重试策略。次数和延迟都是具体数字。
 */
export interface NormalizedRetryPolicy {
	maxAttempts: number;
	baseDelayMs: number;
	maxAgentDelayMs: number;
}

/**
 * Fixed request context for one assistant generation.
 *
 * 一次模型生成的固定上下文。`stepId` 在整次操作内稳定。
 */
export interface GenerationContext {
	stepId: string;
	triggerEntryId: string;
	configuration: LaneConfiguration;
	streamOptions: AgentHarnessStreamOptions;
	retryPolicy: NormalizedRetryPolicy;
	overflowRecoveryUsed: boolean;
}

interface ToolCallSource {
	/** Zero-based index in the assistant message's complete content array, not a filtered tool-call ordinal. */
	sourceIndex: number;
	resultEntryId: string;
}

/**
 * One tool call inside a batch. Status is a nested machine, not `Operation.at`.
 *
 * 批里的一次工具调用。`status` 是子状态机，不占用 `Operation.at`。
 */
export type ToolCall = ToolCallSource &
	(
		| { status: "planned" }
		| { status: "effect_pending"; replay: "never" | "safe" }
		| { status: "outcome_ready"; terminate: boolean }
		| { status: "completed"; terminate: boolean }
	);

/**
 * Tool calls spawned by one assistant message.
 *
 * 一条 assistant 消息触发的工具批。`calls` 顺序跟原文。
 */
export interface ToolBatch {
	assistantEntryId: string;
	configuration: LaneConfiguration;
	turnId: string;
	calls: ToolCall[];
}

/**
 * Request context for summary generation, separate from {@link GenerationContext}.
 *
 * 摘要生成用的请求上下文。和 {@link GenerationContext} 分开。
 */
export interface SummaryContext {
	resultEntryId: string;
	configuration: LaneConfiguration;
	streamOptions: AgentHarnessStreamOptions;
	retryPolicy: NormalizedRetryPolicy;
}

/*
 * Durable operation state is one flat union with one family-neutral discriminator
 * per dispatcher leaf. ToolBatch/ToolCall remain the nested child collection state
 * machine, and cancellation stays orthogonal via Control.
 */

/**
 * Operation that carries a cancellation channel.
 *
 * 带取消通道的操作。所有叶子都带。
 */
export interface Cancellable {
	control: Control;
}

/**
 * Compaction, queue, and tool-parallelism settings for one run.
 *
 * 这次 run 的压缩/排队/工具并行设置。挂在每个叶子上。
 */
export interface RunSettings {
	compaction: CompactionSettings;
	steeringMode: QueueMode;
	followUpMode: QueueMode;
	toolExecution: "sequential" | "parallel";
}

/**
 * Uniform scope carried by every operation leaf.
 *
 * 每个操作叶子都带的统一范围。构造后继时只拷这一块。
 */
export interface OperationScope extends Cancellable {
	settings: RunSettings;
	latestAssistantEntryId: string | null;
}

/**
 * Shared backoff data for every retry-wait leaf.
 *
 * 重试等待叶子的共享退避。`notBefore` 之前不能再发。
 */
export interface RetryWait {
	nextAttempt: number;
	notBefore: number;
	errorMessage: string;
}

/**
 * Fields shared by assistant-generation leaves.
 *
 * assistant 生成叶子的共享字段。
 */
export interface AssistantGenerationScope {
	generationContext: GenerationContext;
}

/**
 * Action taken after a summary task finishes.
 *
 * 摘要完成后的边界动作。决定 resume、结束还是提交导航。
 */
export type ResultBoundary =
	| { kind: "resume_checkpoint"; resumeAfter: CheckpointData }
	| { kind: "finish" }
	| { kind: "commit_navigation"; targetId: string; label?: string };

/**
 * One summary job and the boundary that follows it.
 *
 * 一次摘要任务。`boundary` 决定摘要写完后怎么走。
 */
export interface SummaryTask {
	taskId: string;
	reason?: "manual" | "threshold" | "overflow";
	customInstructions?: string;
	boundary: ResultBoundary;
}

/**
 * Fields shared by summary-generation leaves.
 *
 * 摘要生成叶子的共享字段。
 */
export interface SummaryGenerationScope {
	task: SummaryTask;
	summaryContext: SummaryContext;
}

/**
 * Summary leaf ready to send a request. Attempts start at 1.
 *
 * 摘要准备发请求。`nextAttempt` 从 1 起。
 */
export interface SummaryGenerationReady extends SummaryGenerationScope {
	nextAttempt: number;
}

/**
 * Summary request has been sent and is awaiting its effect.
 *
 * 摘要请求已发出，等效果。
 */
export interface SummaryGenerationEffectPending extends SummaryGenerationScope {
	attempt: number;
	request?: { index: number; usageId: string };
	usageIds: string[];
}

/**
 * Summary generation waiting out backoff.
 *
 * 摘要在退避。
 */
export interface SummaryGenerationRetryWait extends SummaryGenerationScope, RetryWait {}

/**
 * Fields shared by deferred-tool leaves.
 *
 * 挂起/恢复工具的共享字段。`poll` 是第几次轮询。
 */
export interface DeferredScope extends OperationScope {
	stepId: string;
	sourceEntryId: string;
	poll: number;
	configuration: LaneConfiguration;
	streamOptions: AgentHarnessStreamOptions;
}

/**
 * Operation that has been created but has not entered a dispatcher leaf yet.
 *
 * 操作刚开始，还没进具体叶子。
 */
export interface StartingOperation extends OperationScope {
	at: "starting";
}

/**
 * Operation parked at a restore checkpoint.
 *
 * 停在检查点，等 resume。
 */
export interface CheckpointOperation extends OperationScope, CheckpointData {
	at: "checkpoint";
}

/**
 * Ready to send an assistant generation request.
 *
 * 准备发 assistant 请求。
 */
export interface AssistantReadyOperation extends OperationScope, AssistantGenerationScope {
	at: "assistant.ready";
	nextAttempt: number;
}

/**
 * Assistant request has been sent and is awaiting its effect.
 *
 * assistant 请求已发出。
 */
export interface AssistantEffectPendingOperation extends OperationScope, AssistantGenerationScope {
	at: "assistant.effect_pending";
	attempt: number;
	responseEntryId: string;
	usageId: string;
	intendedOutputLimit: number;
	contextWindow: number;
}

/**
 * Assistant generation waiting out backoff.
 *
 * assistant 在退避。
 */
export interface AssistantRetryWaitOperation extends OperationScope, AssistantGenerationScope, RetryWait {
	at: "assistant.retry_wait";
}

/**
 * Executing the tool batch of the latest assistant message.
 *
 * 正在跑工具批。
 */
export interface ToolsOperation extends OperationScope {
	at: "tools";
	batch: ToolBatch;
}

/**
 * Waiting on an external deferred handle.
 *
 * 等外部 deferred 句柄。
 */
export interface DeferredSuspendedOperation extends DeferredScope {
	at: "deferred.suspended";
}

/**
 * Deferred restore request has been sent.
 *
 * deferred 恢复请求已发出。
 */
export interface DeferredEffectPendingOperation extends DeferredScope {
	at: "deferred.effect_pending";
	responseEntryId: string;
	usageId: string;
}

/**
 * Deciding whether a summary should run.
 *
 * 在决定要不要摘要。
 */
export interface SummaryDecidingOperation extends OperationScope {
	at: "summary.deciding";
	task: SummaryTask;
}

/**
 * Summary leaf ready to send.
 *
 * 摘要准备发。
 */
export interface SummaryReadyOperation extends OperationScope, SummaryGenerationReady {
	at: "summary.ready";
}

/**
 * Summary request has been sent.
 *
 * 摘要请求已发出。
 */
export interface SummaryEffectPendingOperation extends OperationScope, SummaryGenerationEffectPending {
	at: "summary.effect_pending";
}

/**
 * Summary generation waiting out backoff.
 *
 * 摘要在退避。
 */
export interface SummaryRetryWaitOperation extends OperationScope, SummaryGenerationRetryWait {
	at: "summary.retry_wait";
}

/**
 * Navigation is ready to commit a new tip.
 *
 * 导航已准备提交。未摘要时可指向根 (`null`)。
 */
export interface NavigationReadyToCommitOperation extends OperationScope {
	at: "navigation.ready_to_commit";
	/** Unsummarized navigation may target the branch root (null). */
	targetId: string | null;
	label?: string;
}

/**
 * Flat durable operation state: exactly 13 family-neutral dispatcher leaves.
 *
 * 扁平持久操作状态。正好 13 个叶子，用 `at` 判别。
 */
export type OperationState =
	| StartingOperation
	| CheckpointOperation
	| AssistantReadyOperation
	| AssistantEffectPendingOperation
	| AssistantRetryWaitOperation
	| ToolsOperation
	| DeferredSuspendedOperation
	| DeferredEffectPendingOperation
	| SummaryDecidingOperation
	| SummaryReadyOperation
	| SummaryEffectPendingOperation
	| SummaryRetryWaitOperation
	| NavigationReadyToCommitOperation;

/**
 * Discriminator literals of {@link OperationState}.
 *
 * 叶子判别字面量。和 {@link OperationState} 同步。
 */
export type OperationAt = OperationState["at"];

/**
 * Copy only the uniform operation scope when constructing a successor leaf.
 *
 * 只拷统一 scope。后继叶子不要把上一代特有字段带过去。
 */
export function operationScopeOf(state: OperationState): OperationScope {
	return {
		control: state.control,
		settings: state.settings,
		latestAssistantEntryId: state.latestAssistantEntryId,
	};
}

/**
 * One operation: immutable meta plus the current dispatcher leaf.
 *
 * 一次操作：不可变 meta + 当前叶子。
 */
export type Operation = { meta: OperationMeta; state: OperationState };

/**
 * Runtime pointers for one lane. Inbox is pending work, not history.
 *
 * lane 的运行时指针。`inbox` 是待处理项，不是历史。
 */
export interface LaneState {
	currentOperationId: string | null;
	lastOperationId: string | null;
	inbox: InboxItem[];
}

/**
 * Entry payload that has not been committed yet.
 *
 * 还没提交的条目负载。pending assistant 不能当 message 持久化。
 */
export type PendingEntry =
	| { type: "message"; payload: AgentMessage }
	| { type: "custom"; customType: string; payload?: JsonValue };

/**
 * Files touched while preparing compaction or branch summary.
 *
 * 压缩/分支摘要看到的文件读写集合。
 */
export interface DurableFileOperations {
	read: string[];
	written: string[];
	edited: string[];
}

/**
 * Durable preparation for compaction or branch summary.
 *
 * 压缩或分支摘要的持久预备。按 `kind` 分。
 */
export type DurableStructuralPreparation =
	| {
			kind: "compaction";
			messagesToSummarize: CompactionPreparation["messagesToSummarize"];
			turnPrefixMessages: CompactionPreparation["turnPrefixMessages"];
			retainedTail: CompactionPreparation["retainedTail"];
			isSplitTurn: boolean;
			tokensBefore: number;
			previousSummary?: string;
			fileOps: DurableFileOperations;
			settings: CompactionSettings;
	  }
	| {
			kind: "branch_summary";
			messages: BranchPreparation["messages"];
			fileOps: DurableFileOperations;
			totalTokens: number;
	  };

/**
 * One persisted usage row. `adjustment` marks import/correction, not a model turn.
 *
 * 一行用量。`adjustment` 表示导入/校正，不是模型当轮。
 */
export interface UsageRow {
	id: string;
	seq: number;
	usage: Usage;
	entryId?: string;
	adjustment: boolean;
	details?: JsonValue;
}

/**
 * Transaction write that inserts one {@link Entry}.
 *
 * 事务里插入一条 Entry。
 */
export interface EntryWrite {
	kind: "entry";
	entry: NewEntry;
}

/**
 * Transaction write that inserts one {@link UsageRow}.
 *
 * 事务里插入一行 Usage。
 */
export interface UsageWrite {
	kind: "usage";
	row: Omit<UsageRow, "seq">;
}

/**
 * One write inside a storage transaction.
 *
 * 一次事务里的一种写。entry / usage / value / list 互斥。
 */
export type Write = EntryWrite | UsageWrite | ValueWrite | ListWrite;

/**
 * Result of one commit, including totals immediately after apply.
 *
 * 一次 commit 的序号和提交后统计。`stats` 是提交后立刻的总量。
 */
export interface CommitResult {
	firstSeq: number;
	seqs: number[];
	timestamp: number;
	/** Session totals immediately after this commit was applied. */
	stats: SessionStats;
}

/**
 * Tree identity of an entry without its payload.
 *
 * 条目的树结构，不带正文。
 */
export interface EntryStructure {
	id: string;
	parentId: string | null;
	seq: number;
	timestamp: number;
	type: EntryType;
	customType?: string;
}

/**
 * Pagination cursor keyed by storage sequence, not entry id.
 *
 * 分页游标。按 `seq`，不是按 id。
 */
export interface EntryCursor {
	seq: number;
}

/**
 * Walk a parent chain from an entry. `start` defaults to the Branch tip.
 *
 * 从某节点沿父链扫描。`start` 缺省时由 Branch 用当前 tip。
 */
export interface BranchScan {
	start?: string;
	stopAtType?: EntryType;
	stopAtId?: string;
	type?: EntryType;
	customType?: string;
	order?: "newestFirst" | "oldestFirst";
	limit?: number;
	cursor?: EntryCursor;
}

/**
 * {@link BranchScan} for Storage. `start` must be explicit.
 *
 * Storage 扫描。`start` 必须显式给出。
 */
export type StorageBranchScan = BranchScan & { start: string };

/**
 * Scan entries by global sequence, not along a branch.
 *
 * 按全局 seq 扫条目。不是沿分支。
 */
export interface EntryScan {
	type?: EntryType;
	customType?: string;
	fromSeq?: number;
	toSeq?: number;
	order?: "asc" | "desc";
	limit?: number;
}

/**
 * Scan usage rows by sequence.
 *
 * 按 seq 扫用量行。
 */
export interface UsageScan {
	fromSeq?: number;
	toSeq?: number;
	order?: "asc" | "desc";
	limit?: number;
}

/**
 * Session totals. `messageCount` counts message entries only.
 *
 * 会话总量。`messageCount` 只计 message 条目。
 */
export interface SessionStats {
	messageCount: number;
	usage: Usage;
}

/**
 * Persistence backend for one Session. Failures may throw.
 *
 * 持久化后端。失败可 throw；harness 的 FileSystem `Result` 是另一套。
 */
export interface Storage {
	commit(writes: Write[], context: Context): Promise<CommitResult>;
	getEntries(ids: string[], context: Context): Promise<Map<string, Entry>>;
	getValue<T>(address: Value<T>, context: Context): Promise<StoredValue<T> | undefined>;
	scanValues<T>(prefix: Value<T>, context: Context): Promise<StoredValue<T>[]>;
	readList<T>(
		address: ValueList<T>,
		options: ListReadOptions | undefined,
		context: Context,
	): Promise<ListElement<T>[]>;
	scanBranch(query: StorageBranchScan, context: Context): Promise<Entry[]>;
	scanBranchStructure(query: StorageBranchScan, context: Context): Promise<EntryStructure[]>;
	scanEntries(query: EntryScan, context: Context): Promise<Entry[]>;
	scanUsage(query: UsageScan, context: Context): Promise<UsageRow[]>;
	getStats(context: Context): Promise<SessionStats>;
	close(context: Context): Promise<void>;
}

/**
 * Identity of a session. `storageVersion` is logical, not the JSONL line format.
 *
 * 会话身份。`storageVersion` 是逻辑版本，不是 JSONL 行格式。
 */
export interface SessionMetadata {
	id: string;
	createdAt: number;
	storageVersion: number;
	cwd?: string;
	parentSessionId?: string;
	legacyParentSessionPath?: string;
}

/**
 * Generator for entry ids. Implementations may be injected; default is uuidv7.
 *
 * 生成条目 id。可注入，默认 uuidv7。
 */
export interface IdGenerator {
	next(timestampMs?: number): string;
}

/**
 * Session-side entry query by sequence. Cursor is an exclusive bound.
 *
 * Session 侧按 seq 查条目。`cursor` 是开区间。
 */
export interface EntryQuery {
	type?: EntryType;
	customType?: string;
	order?: "asc" | "desc";
	limit?: number;
	cursor?: EntryCursor;
}

/**
 * Read-only session capability. `scanBranch` requires an explicit start.
 *
 * 只读能力。`scanBranch` 必须显式 `start`。
 */
export interface SessionReader {
	getEntries(ids: string[], context: Context): Promise<Map<string, Entry>>;
	getStats(context: Context): Promise<SessionStats>;
	getValue<T>(address: Value<T>, context: Context): Promise<StoredValue<T> | undefined>;
	scanValues<T>(prefix: Value<T>, context: Context): Promise<StoredValue<T>[]>;
	readList<T>(
		address: ValueList<T>,
		options: ListReadOptions | undefined,
		context: Context,
	): Promise<ListElement<T>[]>;
	/** Scan a branch from an explicit entry while this reader capability remains valid. */
	scanBranch(query: StorageBranchScan, context: Context): Promise<Entry[]>;
}

/**
 * Exclusive keyless mutation barrier for one Session.
 *
 * 独占无键写屏障。一次能力最多 `commit` 一次。
 */
export interface SessionMutation extends SessionReader {
	/** Exactly zero or one commit attempt. A second attempt rejects. */
	commit(writes: Write[], context: Context): Promise<CommitResult>;
	/** Wait for any commit attempt, invalidate the capability, and release the barrier. */
	end(context: Context): Promise<void>;
}

/**
 * Callback-scoped mutation capability without authority to release its Session barrier.
 *
 * 回调里的写能力。没有 `end`，不能自己释放屏障。
 */
export type SessionMutator = Omit<SessionMutation, "end">;

/**
 * Exclusive mutation callback. Nested public writers deadlock if awaited.
 *
 * 独占回调。里面再 await 公开 writer 会死锁。
 */
export type SessionMutationCallback<T> = (mutator: SessionMutator, context: Context) => T | Promise<T>;

/**
 * Named branch. The object exists only while its tip value is stored.
 *
 * 命名分支。tip 存在才拿得到对象。
 */
export interface Branch {
	readonly name: string;
	getTipId(context: Context): Promise<string | null>;
	findEntries(query: BranchScan | undefined, context: Context): Promise<Entry[]>;
	findEntry(query: BranchScan | undefined, context: Context): Promise<Entry | undefined>;
	appendMessage(message: AgentMessage, context: Context): Promise<string>;
	appendCustomEntry(customType: string, data: JsonValue | undefined, context: Context): Promise<string>;
}

/**
 * Open session. Writers must go through `mutate` / `beginMutation`.
 *
 * 打开的会话。写必须走 `mutate` / `beginMutation`。
 */
export interface Session<TMetadata extends SessionMetadata = SessionMetadata> extends SessionReader {
	readonly metadata: TMetadata;
	readonly idGenerator: IdGenerator;
	getEntry(id: string, context: Context): Promise<Entry | undefined>;
	getStats(context: Context): Promise<SessionStats>;
	getName(context: Context): Promise<string | undefined>;
	getLabel(targetId: string, context: Context): Promise<string | undefined>;
	findEntries(query: EntryQuery | undefined, context: Context): Promise<Entry[]>;
	findEntry(query: EntryQuery | undefined, context: Context): Promise<Entry | undefined>;
	branch(name: string, context: Context): Promise<Branch | undefined>;
	createBranch(name: string, at: string | null, context: Context): Promise<Branch>;
	beginMutation(context: Context): Promise<SessionMutation>;
	/**
	 * Trusted exclusive callback over the Session mutation line. Calling a public Session writer from
	 * this callback queues it behind the callback; awaiting that nested writer therefore deadlocks.
	 * Use the supplied mutator for the callback's sole commit.
	 */
	mutate<T>(mutation: SessionMutationCallback<T>, context: Context): Promise<T>;
	setValue<T>(address: Value<T>, next: NoInfer<T>, context: Context): Promise<void>;
	deleteValue<T>(address: Value<T>, context: Context): Promise<void>;
	appendList<T>(address: ValueList<T>, element: NoInfer<T>, context: Context): Promise<void>;
	deleteList<T>(address: ValueList<T>, context: Context): Promise<void>;
	setName(name: string | undefined, context: Context): Promise<void>;
	setLabel(targetId: string, label: string | undefined, context: Context): Promise<void>;
	close(context: Context): Promise<void>;
}

/**
 * Options for creating a session. Repositories mint `id` when omitted.
 *
 * 创建选项。`id` 缺省由仓库生成。
 */
export interface SessionCreateOptions {
	id?: string;
	parentSessionId?: string;
}

/**
 * Fork scope. Branch copies one configured AgentLane; tree copies the tree without ops/usage.
 *
 * fork 范围。`branch` 只拷一条配置好的 AgentLane；`tree` 拷整棵树但不拷操作/usage。
 */
export type ForkOptions =
	| {
			/**
			 * Copy one path from a complete configured source AgentLane under the same
			 * Branch name, with copied configuration and fresh idle lane state.
			 */
			scope: "branch";
			/** Source Branch to copy. */
			branch: string;
			/** Entry on the source Branch's current tip ancestry. Defaults to the current tip. */
			entryId?: string;
			/**
			 * Whether the fork includes the selected entry or stops at its parent.
			 * Defaults to including the selected entry.
			 */
			position?: "before" | "at";
			/** Optional destination session id. */
			id?: string;
	  }
	| {
			/**
			 * Copy the whole conversation tree and every Branch tip. Each configured
			 * AgentLane copies configuration plus fresh idle state; data-only Branches
			 * remain data-only. Operation/pending/result/usage state is excluded.
			 */
			scope: "tree";
			/** Optional destination session id. */
			id?: string;
	  };

/**
 * Session factory and catalog. Concrete repos admit at most one open handle per id.
 *
 * 会话仓库。同一 metadata 同时只能 open 一次。
 */
export interface SessionRepo<
	TMetadata extends SessionMetadata = SessionMetadata,
	TCreateOptions extends { id?: string; parentSessionId?: string } = SessionCreateOptions,
	TListOptions = void,
> {
	create(options: TCreateOptions, context: Context): Promise<Session<TMetadata>>;
	open(metadata: TMetadata, context: Context): Promise<Session<TMetadata>>;
	list(options: TListOptions | undefined, context: Context): Promise<TMetadata[]>;
	delete(metadata: TMetadata, context: Context): Promise<void>;
	fork(source: TMetadata, options: ForkOptions, context: Context): Promise<Session<TMetadata>>;
}
