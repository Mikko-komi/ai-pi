/**
 * Extension system types.
 *
 * Extensions are TypeScript modules that can:
 * - Subscribe to agent lifecycle events
 * - Register LLM-callable tools
 * - Register commands, keyboard shortcuts, and CLI flags
 * - Interact with the user via UI primitives
 *
 * 扩展系统的对外类型。扩展通过事件、工具、命令、快捷键和 UI 原语接入；这里只定义契约，不跑生命周期。
 */

import type {
	AgentMessage,
	AgentToolResult,
	AgentToolUpdateCallback,
	ThinkingLevel,
	ToolExecutionMode,
} from "@earendil-works/pi-agent-core";
import type {
	Api,
	AssistantMessageEvent,
	AssistantMessageEventStream,
	ConstrainedSamplingConfig,
	Context,
	ImageContent,
	Model,
	OAuthCredentials,
	OAuthLoginCallbacks,
	Provider,
	ProviderHeaders,
	RefreshModelsContext,
	SimpleStreamOptions,
	TextContent,
	ToolResultMessage,
	Usage,
} from "@earendil-works/pi-ai";
import type {
	AutocompleteItem,
	AutocompleteProvider,
	Component,
	EditorComponent,
	EditorTheme,
	KeyId,
	OverlayHandle,
	OverlayOptions,
	TUI,
} from "@earendil-works/pi-tui";
import type { Static, TSchema } from "typebox";
import type { Theme } from "../../modes/interactive/theme/theme.ts";
import type { BashResult } from "../bash-executor.ts";
import type { CompactionPreparation, CompactionResult } from "../compaction/index.ts";
import type { EventBus } from "../event-bus.ts";
import type { ExecOptions, ExecResult } from "../exec.ts";
import type { ReadonlyFooterDataProvider } from "../footer-data-provider.ts";
import type { KeybindingsManager } from "../keybindings.ts";
import type { CustomMessage } from "../messages.ts";
import type { ModelRegistry } from "../model-registry.ts";
import type { ScopedModel } from "../model-resolver.ts";
import type {
	BranchSummaryEntry,
	CompactionEntry,
	CustomEntry,
	ReadonlySessionManager,
	SessionEntry,
	SessionManager,
} from "../session-manager.ts";
import type { SlashCommandInfo } from "../slash-commands.ts";
import type { SourceInfo } from "../source-info.ts";
import type { BuildSystemPromptOptions } from "../system-prompt.ts";
import type { BashOperations } from "../tools/bash.ts";
import type { EditToolDetails } from "../tools/edit.ts";
import type {
	BashToolDetails,
	BashToolInput,
	EditToolInput,
	FindToolDetails,
	FindToolInput,
	GrepToolDetails,
	GrepToolInput,
	LsToolDetails,
	LsToolInput,
	PowerShellToolDetails,
	PowerShellToolInput,
	ReadToolDetails,
	ReadToolInput,
	WriteToolInput,
} from "../tools/index.ts";

export type { ExecOptions, ExecResult } from "../exec.ts";
export type { BuildSystemPromptOptions } from "../system-prompt.ts";
export type { AgentToolResult, AgentToolUpdateCallback, ToolExecutionMode };
export type { AppKeybinding, KeybindingsManager } from "../keybindings.ts";

// ============================================================================
// UI Context
// ============================================================================

/**
 * Options for extension UI dialogs.
 *
 * 扩展对话框选项。`signal` / `timeout` 都能关掉对话框。
 */
export interface ExtensionUIDialogOptions {
	/** AbortSignal to programmatically dismiss the dialog. */
	signal?: AbortSignal;
	/** Timeout in milliseconds. Dialog auto-dismisses with live countdown display. */
	timeout?: number;
}

/**
 * Placement for extension widgets.
 *
 * 小部件相对编辑器的位置。只有上下两档。
 */
export type WidgetPlacement = "aboveEditor" | "belowEditor";

/**
 * Options for extension widgets.
 *
 * 小部件选项。缺省挂在编辑器上方。
 */
export interface ExtensionWidgetOptions {
	/** Where the widget is rendered. Defaults to "aboveEditor". */
	placement?: WidgetPlacement;
}

/**
 * Raw terminal input listener for extensions.
 *
 * 原始终端输入回调。返回 `consume` 表示吃掉这次输入。
 */
export type TerminalInputHandler = (data: string) => { consume?: boolean; data?: string } | undefined;

/**
 * Working indicator configuration for the interactive streaming loader.
 *
 * 流式加载指示器。空 `frames` 会整行藏起来。
 */
export interface WorkingIndicatorOptions {
	/** Animation frames. Use an empty array to hide the indicator entirely. Custom frames are rendered verbatim. */
	frames?: string[];
	/** Frame interval in milliseconds for animated indicators. */
	intervalMs?: number;
}

/**
 * Wrap the current autocomplete provider with additional behavior.
 *
 * 包装现有补全器。必须再交出一个 AutocompleteProvider。
 */
export type AutocompleteProviderFactory = (current: AutocompleteProvider) => AutocompleteProvider;

/**
 * Custom editor factory for `setEditorComponent`.
 *
 * 自定义编辑器工厂。传 `undefined` 表示回到内置编辑器。
 */
export type EditorFactory = (tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) => EditorComponent;

/**
 * UI context for extensions to request interactive UI.
 * Each mode (interactive, RPC, print) provides its own implementation.
 *
 * 扩展要交互 UI 时走这里。各模式自己实现；没有 UI 的模式给 no-op。
 */
export interface ExtensionUIContext {
	/** Show a selector and return the user's choice. */
	select(title: string, options: string[], opts?: ExtensionUIDialogOptions): Promise<string | undefined>;

	/** Show a confirmation dialog. */
	confirm(title: string, message: string, opts?: ExtensionUIDialogOptions): Promise<boolean>;

	/** Show a text input dialog. */
	input(title: string, placeholder?: string, opts?: ExtensionUIDialogOptions): Promise<string | undefined>;

	/** Show a notification to the user. */
	notify(message: string, type?: "info" | "warning" | "error"): void;

	/** Listen to raw terminal input (interactive mode only). Returns an unsubscribe function. */
	onTerminalInput(handler: TerminalInputHandler): () => void;

	/** Set status text in the footer/status bar. Pass undefined to clear. */
	setStatus(key: string, text: string | undefined): void;

	/** Set the working/loading message shown during streaming. Call with no argument to restore default. */
	setWorkingMessage(message?: string): void;

	/** Show or hide the built-in interactive working loader row during streaming. */
	setWorkingVisible(visible: boolean): void;

	/**
	 * Configure the interactive working indicator shown during streaming.
	 *
	 * - Omit the argument to restore the default animated spinner.
	 * - Use `frames: ["●"]` for a static indicator.
	 * - Use `frames: []` to hide the indicator entirely.
	 * - Custom frames are rendered as provided, so extensions must add their own colors.
	 */
	setWorkingIndicator(options?: WorkingIndicatorOptions): void;

	/** Set the label shown for hidden thinking blocks. Call with no argument to restore default. */
	setHiddenThinkingLabel(label?: string): void;

	/** Set a widget to display above or below the editor. Accepts string array or component factory. */
	setWidget(key: string, content: string[] | undefined, options?: ExtensionWidgetOptions): void;
	setWidget(
		key: string,
		content: ((tui: TUI, theme: Theme) => Component & { dispose?(): void }) | undefined,
		options?: ExtensionWidgetOptions,
	): void;

	/** Set a custom footer component, or undefined to restore the built-in footer.
	 *
	 * The factory receives a FooterDataProvider for data not otherwise accessible:
	 * git branch and extension statuses from setStatus(). Context usage is on
	 * ctx.getContextUsage(), token stats on ctx.sessionManager.getEntries(), model info on ctx.model.
	 */
	setFooter(
		factory:
			| ((tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => Component & { dispose?(): void })
			| undefined,
	): void;

	/** Set a custom header component (shown at startup, above chat), or undefined to restore the built-in header. */
	setHeader(factory: ((tui: TUI, theme: Theme) => Component & { dispose?(): void }) | undefined): void;

	/** Set the terminal window/tab title. */
	setTitle(title: string): void;

	/** Show a custom component with keyboard focus. */
	custom<T>(
		factory: (
			tui: TUI,
			theme: Theme,
			keybindings: KeybindingsManager,
			done: (result: T) => void,
		) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,
		options?: {
			overlay?: boolean;
			/** Overlay positioning/sizing options. Can be static or a function for dynamic updates. */
			overlayOptions?: OverlayOptions | (() => OverlayOptions);
			/** Called with the overlay handle after the overlay is shown. Use to control visibility. */
			onHandle?: (handle: OverlayHandle) => void;
		},
	): Promise<T>;

	/** Paste text into the editor, triggering paste handling (collapse for large content). */
	pasteToEditor(text: string): void;

	/** Set the text in the core input editor. */
	setEditorText(text: string): void;

	/** Get the current text from the core input editor. */
	getEditorText(): string;

	/** Show a multi-line editor for text editing. */
	editor(title: string, prefill?: string): Promise<string | undefined>;

	/** Stack additional autocomplete behavior on top of the built-in provider. */
	addAutocompleteProvider(factory: AutocompleteProviderFactory): void;

	/**
	 * Set a custom editor component via factory function.
	 * Pass undefined to restore the default editor.
	 *
	 * The factory receives:
	 * - `theme`: EditorTheme for styling borders and autocomplete
	 * - `keybindings`: KeybindingsManager for app-level keybindings
	 *
	 * For full app keybinding support (escape, ctrl+d, model switching, etc.),
	 * extend `CustomEditor` from `@earendil-works/pi-coding-agent` and call
	 * `super.handleInput(data)` for keys you don't handle.
	 *
	 * @example
	 * ```ts
	 * import { CustomEditor } from "@earendil-works/pi-coding-agent";
	 *
	 * class VimEditor extends CustomEditor {
	 *   private mode: "normal" | "insert" = "insert";
	 *
	 *   handleInput(data: string): void {
	 *     if (this.mode === "normal") {
	 *       // Handle vim normal mode keys...
	 *       if (data === "i") { this.mode = "insert"; return; }
	 *     }
	 *     super.handleInput(data);  // App keybindings + text editing
	 *   }
	 * }
	 *
	 * ctx.ui.setEditorComponent((tui, theme, keybindings) =>
	 *   new VimEditor(tui, theme, keybindings)
	 * );
	 * ```
	 */
	setEditorComponent(factory: EditorFactory | undefined): void;

	/** Get the currently configured custom editor factory, or undefined when using the default editor. */
	getEditorComponent(): EditorFactory | undefined;

	/** Get the current theme for styling. */
	readonly theme: Theme;

	/** Get all available themes with their names and file paths. */
	getAllThemes(): { name: string; path: string | undefined }[];

	/** Load a theme by name without switching to it. Returns undefined if not found. */
	getTheme(name: string): Theme | undefined;

	/** Set the current theme by name or Theme object. */
	setTheme(theme: string | Theme): { success: boolean; error?: string };

	/** Get current tool output expansion state. */
	getToolsExpanded(): boolean;

	/** Set tool output expansion state. */
	setToolsExpanded(expanded: boolean): void;
}

// ============================================================================
// Extension Context
// ============================================================================

/**
 * Token usage for the active model.
 *
 * 当前模型的上下文用量。刚 compaction 完时 `tokens` 可能是 null。
 */
export interface ContextUsage {
	/** Estimated context tokens, or null if unknown (e.g. right after compaction, before next LLM response). */
	tokens: number | null;
	contextWindow: number;
	/** Context usage as percentage of context window, or null if tokens is unknown. */
	percent: number | null;
}

/**
 * Options for triggering compaction from an extension.
 *
 * 扩展触发 compaction 的选项。不阻塞；完成/失败走回调。
 */
export interface CompactOptions {
	customInstructions?: string;
	onComplete?: (result: CompactionResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Context passed to extension event handlers.
 *
 * 运行模式。`tui` 才能用终端专用 UI。
 */
export type ExtensionMode = "tui" | "rpc" | "json" | "print";

/**
 * Context passed to extension event handlers and tools.
 *
 * 事件/工具里的 ctx。只读会话；切会话后旧 ctx 会失效。
 */
export interface ExtensionContext {
	/** UI methods for user interaction */
	ui: ExtensionUIContext;
	/** Current run mode. Use "tui" to guard terminal-only UI such as custom components. */
	mode: ExtensionMode;
	/** Whether dialog-capable UI is available (true in TUI and RPC modes) */
	hasUI: boolean;
	/** Current working directory */
	cwd: string;
	/** Session manager (read-only) */
	sessionManager: ReadonlySessionManager;
	/** Model registry for API key resolution */
	modelRegistry: ModelRegistry;
	/** Current model (may be undefined) */
	model: Model<any> | undefined;
	/** Models scoped to this session (resolved from `--models` /
	 *  `enabledModels` settings against the available catalogue). Same set
	 *  the `/scoped-models` command shows. Empty when no scoping is
	 *  configured (all available models are usable). Read-only snapshot. */
	scopedModels: readonly ScopedModel[];
	/** Current thinking level, when provided by the session runtime. */
	thinkingLevel?: ThinkingLevel;
	/** Whether the agent is idle (not streaming) */
	isIdle(): boolean;
	/** Whether project-local trust is active for this context. */
	isProjectTrusted(): boolean;
	/** The current abort signal, or undefined when the agent is not streaming. */
	signal: AbortSignal | undefined;
	/** Abort the current agent operation */
	abort(): void;
	/** Whether there are queued messages waiting */
	hasPendingMessages(): boolean;
	/** Gracefully shutdown pi and exit. Available in all contexts. */
	shutdown(): void;
	/** Get current context usage for the active model. */
	getContextUsage(): ContextUsage | undefined;
	/** Trigger compaction without awaiting completion. */
	compact(options?: CompactOptions): void;
	/** Get the current effective system prompt. */
	getSystemPrompt(): string;
}

/**
 * Extended context for command handlers.
 * Includes session control methods only safe in user-initiated commands.
 *
 * 命令处理器的 ctx。比事件 ctx 多会话控制；只在用户发起的命令里安全。
 */
export interface ExtensionCommandContext extends ExtensionContext {
	/** Get the current base system-prompt construction options. */
	getSystemPromptOptions(): BuildSystemPromptOptions;

	/** Wait for the agent to finish streaming */
	waitForIdle(): Promise<void>;

	/** Start a new session, optionally with initialization. */
	newSession(options?: {
		parentSession?: string;
		setup?: (sessionManager: SessionManager) => Promise<void>;
		withSession?: (ctx: ReplacedSessionContext) => Promise<void>;
	}): Promise<{ cancelled: boolean }>;

	/** Fork from a specific entry, creating a new session file. */
	fork(
		entryId: string,
		options?: { position?: "before" | "at"; withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	): Promise<{ cancelled: boolean }>;

	/** Navigate to a different point in the session tree. */
	navigateTree(
		targetId: string,
		options?: { summarize?: boolean; customInstructions?: string; replaceInstructions?: boolean; label?: string },
	): Promise<{ cancelled: boolean }>;

	/** Switch to a different session file. */
	switchSession(
		sessionPath: string,
		options?: { withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	): Promise<{ cancelled: boolean }>;

	/** Reload extensions, skills, prompts, themes, and context files. */
	reload(): Promise<void>;
}

/**
 * Fresh command-capable context bound to the replacement session after a session switch.
 *
 * This is passed to `withSession()` callbacks on `newSession()`, `fork()`, and `switchSession()`.
 *
 * 切会话后绑在新会话上的命令 ctx。`withSession` 必须用这个，不能继续用旧 ctx。
 */
export interface ReplacedSessionContext extends ExtensionCommandContext {
	sendMessage<T = unknown>(
		message: Pick<CustomMessage<T>, "customType" | "content" | "display" | "details">,
		options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" },
	): Promise<void>;

	sendUserMessage(
		content: string | (TextContent | ImageContent)[],
		options?: { deliverAs?: "steer" | "followUp"; expandPromptTemplates?: boolean },
	): Promise<void>;
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Rendering options for tool results
 *
 * 工具结果渲染选项。`isPartial` 表示还在流。
 */
export interface ToolRenderResultOptions {
	/** Whether the result view is expanded */
	expanded: boolean;
	/** Whether this is a partial/streaming result */
	isPartial: boolean;
}

/**
 * Context passed to tool renderers.
 *
 * 工具行渲染上下文。同一次 toolCallId 的 call/result 共用 `args` 和 `state`。
 */
export interface ToolRenderContext<TState = any, TArgs = any> {
	/** Current tool call arguments. Shared across call/result renders for the same tool call. */
	args: TArgs;
	/** Unique id for this tool execution. Stable across call/result renders for the same tool call. */
	toolCallId: string;
	/** Invalidate just this tool execution component for redraw. */
	invalidate: () => void;
	/** Previously returned component for this render slot, if any. */
	lastComponent: Component | undefined;
	/** Shared renderer state for this tool row. Initialized by tool-execution.ts. */
	state: TState;
	/** Working directory for this tool execution. */
	cwd: string;
	/** Whether the tool execution has started. */
	executionStarted: boolean;
	/** Whether the tool call arguments are complete. */
	argsComplete: boolean;
	/** Whether the tool result is partial/streaming. */
	isPartial: boolean;
	/** Whether the result view is expanded. */
	expanded: boolean;
	/** Whether inline images are currently shown in the TUI. */
	showImages: boolean;
	/** Whether the current result is an error. */
	isError: boolean;
}

/**
 * Tool definition for registerTool().
 *
 * registerTool() 的定义。`execute` 是必须的；渲染和 prompt 片段可选。
 */
export interface ToolDefinition<TParams extends TSchema = TSchema, TDetails = unknown, TState = any> {
	/** Tool name (used in LLM tool calls) */
	name: string;
	/** Human-readable label for UI */
	label: string;
	/** Description for LLM */
	description: string;
	/** Optional one-line snippet for the Available tools section in the default system prompt. Custom tools are omitted from that section when this is not provided. */
	promptSnippet?: string;
	/** Optional guideline bullets appended to the default system prompt Guidelines section when this tool is active. */
	promptGuidelines?: string[];
	/** Parameter schema (TypeBox) */
	parameters: TParams;
	/** Optional provider-side constrained sampling request for this tool. Set false to explicitly disable it, equivalent to leaving it undefined. */
	constrainedSampling?: false | ConstrainedSamplingConfig;
	/** Controls whether ToolExecutionComponent renders the standard colored shell or the tool renders its own framing. */
	renderShell?: "default" | "self";

	/** Optional compatibility shim to prepare raw tool call arguments before schema validation. Must return an object conforming to TParams. */
	prepareArguments?: (args: unknown) => Static<TParams>;

	/**
	 * Per-tool execution mode override.
	 * - "sequential": this tool must execute one at a time with other tool calls.
	 * - "parallel": this tool can execute concurrently with other tool calls.
	 *
	 * If omitted, the default execution mode applies.
	 */
	executionMode?: ToolExecutionMode;

	/** Execute the tool. */
	execute(
		toolCallId: string,
		params: Static<TParams>,
		signal: AbortSignal | undefined,
		onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
		ctx: ExtensionContext,
	): Promise<AgentToolResult<TDetails>>;

	/** Custom rendering for tool call display */
	renderCall?: (args: Static<TParams>, theme: Theme, context: ToolRenderContext<TState, Static<TParams>>) => Component;

	/** Custom rendering for tool result display */
	renderResult?: (
		result: AgentToolResult<TDetails>,
		options: ToolRenderResultOptions,
		theme: Theme,
		context: ToolRenderContext<TState, Static<TParams>>,
	) => Component;
}

type AnyToolDefinition = ToolDefinition<any, any, any>;

/**
 * Preserve parameter inference for standalone tool definitions.
 *
 * Use this when assigning a tool to a variable or passing it through arrays such
 * as `customTools`, where contextual typing would otherwise widen params to
 * `unknown`.
 *
 * 保住独立工具变量的参数推断。直接丢进数组时否则会宽成 unknown。
 */
export function defineTool<TParams extends TSchema, TDetails = unknown, TState = any>(
	tool: ToolDefinition<TParams, TDetails, TState>,
): ToolDefinition<TParams, TDetails, TState> & AnyToolDefinition {
	return tool as ToolDefinition<TParams, TDetails, TState> & AnyToolDefinition;
}

// ============================================================================
// Startup/Resource Events
// ============================================================================

/**
 * Project-trust prompt event.
 *
 * 项目信任询问。扩展可以代答，避免内置对话框。
 */
export interface ProjectTrustEvent {
	type: "project_trust";
	cwd: string;
}

/**
 * Trust decision from a project_trust handler.
 *
 * 信任决定。`undecided` 让下一个 handler 继续。
 */
export type ProjectTrustEventDecision = "yes" | "no" | "undecided";

/**
 * Result of a project_trust handler.
 *
 * 信任结果。`remember` 表示写入持久设置。
 */
export interface ProjectTrustEventResult {
	trusted: ProjectTrustEventDecision;
	remember?: boolean;
}

/**
 * Context for project_trust handlers.
 *
 * 信任询问时的精简 ctx。UI 只有对话框四件套。
 */
export interface ProjectTrustContext {
	cwd: string;
	mode: ExtensionMode;
	hasUI: boolean;
	ui: Pick<ExtensionUIContext, "select" | "confirm" | "input" | "notify">;
}

/**
 * Handler for project_trust.
 *
 * 信任询问回调。第一个给出 yes/no 的胜出。
 */
export type ProjectTrustHandler = (
	event: ProjectTrustEvent,
	ctx: ProjectTrustContext,
) => Promise<ProjectTrustEventResult> | ProjectTrustEventResult;

/**
 * Fired after session_start to allow extensions to provide additional resource paths.
 *
 * session_start 之后让扩展补资源路径。startup 和 reload 都会发。
 */
export interface ResourcesDiscoverEvent {
	type: "resources_discover";
	cwd: string;
	reason: "startup" | "reload";
}

/**
 * Result from resources_discover event handler
 *
 * 额外 skill / prompt / theme 路径。runner 会带上 extensionPath。
 */
export interface ResourcesDiscoverResult {
	skillPaths?: string[];
	promptPaths?: string[];
	themePaths?: string[];
}

// ============================================================================
// Session Events
// ============================================================================

/**
 * Fired when a session is started, loaded, or reloaded
 *
 * 会话启动、加载或 reload。`previousSessionFile` 只在切会话时有。
 */
export interface SessionStartEvent {
	type: "session_start";
	/** Why this session start happened. */
	reason: "startup" | "reload" | "new" | "resume" | "fork";
	/** Previously active session file. Present for "new", "resume", and "fork". */
	previousSessionFile?: string;
}

/**
 * Fired when the current session metadata changes.
 *
 * 会话元数据变了。`name` 为 undefined 表示清掉显示名。
 */
export interface SessionInfoChangedEvent {
	type: "session_info_changed";
	/** Current normalized session name. Undefined when the name is cleared. */
	name: string | undefined;
}

/**
 * Fired before switching to another session (can be cancelled)
 *
 * 切会话前。handler 可以 cancel。
 */
export interface SessionBeforeSwitchEvent {
	type: "session_before_switch";
	reason: "new" | "resume";
	targetSessionFile?: string;
}

/**
 * Fired before forking a session (can be cancelled)
 *
 * fork 前。handler 可以 cancel 或跳过对话恢复。
 */
export interface SessionBeforeForkEvent {
	type: "session_before_fork";
	entryId: string;
	position: "before" | "at";
}

/**
 * Fired before context compaction (can be cancelled or customized)
 *
 * compaction 前。可以 cancel，或直接给 compaction 结果。
 */
export interface SessionBeforeCompactEvent {
	type: "session_before_compact";
	preparation: CompactionPreparation;
	branchEntries: SessionEntry[];
	customInstructions?: string;
	/** What triggered the compaction: manual /compact, the context threshold, or context overflow recovery */
	reason: "manual" | "threshold" | "overflow";
	/** True when the aborted turn is retried after this compaction (overflow recovery) */
	willRetry: boolean;
	signal: AbortSignal;
}

/**
 * Fired after context compaction succeeds
 *
 * compaction 成功后。`fromExtension` 表示内容来自扩展。
 */
export interface SessionCompactEvent {
	type: "session_compact";
	compactionEntry: CompactionEntry;
	fromExtension: boolean;
	/** What triggered the compaction: manual /compact, the context threshold, or context overflow recovery */
	reason: "manual" | "threshold" | "overflow";
	/** True when the aborted turn is retried after this compaction (overflow recovery) */
	willRetry: boolean;
}

/**
 * Fired after context compaction fails or is aborted
 *
 * compaction 失败或中止。`aborted` 和 `errorMessage` 互斥语义。
 */
export interface SessionCompactFailedEvent {
	type: "session_compact_failed";
	/** What triggered the compaction: manual /compact, the context threshold, or context overflow recovery */
	reason: "manual" | "threshold" | "overflow";
	/** Error text when compaction failed for a non-abort reason. */
	errorMessage?: string;
	/** True when compaction was cancelled or aborted. */
	aborted: boolean;
	/** True when the aborted turn would have been retried after this compaction (overflow recovery) */
	willRetry: boolean;
	/** True when the failing compaction content came from a session_before_compact handler. */
	fromExtension: boolean;
}

/**
 * Fired before an extension runtime is torn down due to quit, reload, or session replacement.
 *
 * 扩展运行时要拆掉。quit / reload / 换会话都会发。
 */
export interface SessionShutdownEvent {
	type: "session_shutdown";
	reason: "quit" | "reload" | "new" | "resume" | "fork";
	/** Destination session file when shutting down due to session replacement. */
	targetSessionFile?: string;
}

/**
 * Preparation data for tree navigation
 *
 * 树导航的准备数据。`replaceInstructions` 为真时自定义说明替换默认 prompt。
 */
export interface TreePreparation {
	targetId: string;
	oldLeafId: string | null;
	commonAncestorId: string | null;
	entriesToSummarize: SessionEntry[];
	userWantsSummary: boolean;
	/** Custom instructions for summarization */
	customInstructions?: string;
	/** If true, customInstructions replaces the default prompt instead of being appended */
	replaceInstructions?: boolean;
	/** Label to attach to the branch summary entry */
	label?: string;
}

/**
 * Fired before navigating in the session tree (can be cancelled)
 *
 * 树导航前。可以 cancel 或自己给 summary。
 */
export interface SessionBeforeTreeEvent {
	type: "session_before_tree";
	preparation: TreePreparation;
	signal: AbortSignal;
}

/**
 * Fired after navigating in the session tree
 *
 * 树导航完成后。`fromExtension` 表示是扩展发起的。
 */
export interface SessionTreeEvent {
	type: "session_tree";
	newLeafId: string | null;
	oldLeafId: string | null;
	summaryEntry?: BranchSummaryEntry;
	fromExtension?: boolean;
}

/**
 * Union of session lifecycle events.
 *
 * 会话生命周期事件联合。before_* 可取消。
 */
export type SessionEvent =
	| SessionStartEvent
	| SessionInfoChangedEvent
	| SessionBeforeSwitchEvent
	| SessionBeforeForkEvent
	| SessionBeforeCompactEvent
	| SessionCompactEvent
	| SessionCompactFailedEvent
	| SessionShutdownEvent
	| SessionBeforeTreeEvent
	| SessionTreeEvent;

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Fired before each LLM call. Can modify messages.
 *
 * 每次 LLM 调用前。可以改 messages。
 */
export interface ContextEvent {
	type: "context";
	messages: AgentMessage[];
}

/**
 * Fired before a provider request is sent. Can replace the payload.
 *
 * provider 请求发出前。返回值整份替换 payload。
 */
export interface BeforeProviderRequestEvent {
	type: "before_provider_request";
	payload: unknown;
}

/**
 * Fired after request headers are assembled, before the provider HTTP call.
 * Handlers mutate `headers` in place (e.g. to inject tracing/session headers);
 * the return value is ignored. A `null` value deletes that header.
 *
 * 请求头发齐后、HTTP 发出前。就地改 `headers`；`null` 删键。
 */
export interface BeforeProviderHeadersEvent {
	type: "before_provider_headers";
	headers: ProviderHeaders;
}

/**
 * Fired after a provider response is received and before the response stream is consumed.
 *
 * 收到 provider 响应、消费 body 之前。只读状态码和头。
 */
export interface AfterProviderResponseEvent {
	type: "after_provider_response";
	status: number;
	headers: Record<string, string>;
}

/**
 * Fired after user submits prompt but before agent loop.
 *
 * 用户提交后、agent 循环前。能改 system prompt，也能塞自定义消息。
 */
export interface BeforeAgentStartEvent {
	type: "before_agent_start";
	/** The raw user prompt text (after expansion). */
	prompt: string;
	/** Images attached to the user prompt, if any. */
	images?: ImageContent[];
	/** The fully assembled system prompt string. */
	systemPrompt: string;
	/** Structured options used to build the system prompt. Extensions can inspect this to understand what Pi loaded without re-discovering resources. */
	systemPromptOptions: BuildSystemPromptOptions;
}

/**
 * Fired when an agent loop starts
 *
 * agent 循环开始。无载荷。
 */
export interface AgentStartEvent {
	type: "agent_start";
}

/**
 * Fired when an agent loop ends
 *
 * agent 循环结束。带着本轮消息。
 */
export interface AgentEndEvent {
	type: "agent_end";
	messages: AgentMessage[];
}

/**
 * Fired after an agent run has fully settled and no automatic retry, compaction, or queued continuation will run.
 *
 * 本轮彻底落地：不会再自动 retry、compaction 或排队续跑。
 */
export interface AgentSettledEvent {
	type: "agent_settled";
}

/**
 * Kind of blocking extension UI prompt.
 *
 * 阻塞式扩展 UI 的种类。和 ui_prompt_* 事件对应。
 */
export type UIPromptKind = "select" | "confirm" | "input" | "editor" | "custom";

/**
 * Fired when Pi starts waiting on a blocking user-facing extension UI prompt.
 *
 * 开始等用户在扩展 UI 上点选。嵌套 prompt 只报最外层。
 */
export interface UIPromptStartEvent {
	type: "ui_prompt_start";
	reason: "ui_prompt";
	kind: UIPromptKind;
	title?: string;
}

/**
 * Fired when Pi is no longer waiting on a blocking user-facing extension UI prompt.
 *
 * 不再等扩展 UI。和 start 成对。
 */
export interface UIPromptEndEvent {
	type: "ui_prompt_end";
	reason: "ui_prompt";
	kind: UIPromptKind;
	title?: string;
}

/**
 * Fired at the start of each turn
 *
 * 一轮开始。`turnIndex` 从 0 计。
 */
export interface TurnStartEvent {
	type: "turn_start";
	turnIndex: number;
	timestamp: number;
}

/**
 * Fired at the end of each turn
 *
 * 一轮结束。带着助手消息和本轮工具结果。
 */
export interface TurnEndEvent {
	type: "turn_end";
	turnIndex: number;
	message: AgentMessage;
	toolResults: ToolResultMessage[];
}

/**
 * Fired when a message starts (user, assistant, or toolResult)
 *
 * 一条消息开始（user / assistant / toolResult）。
 */
export interface MessageStartEvent {
	type: "message_start";
	message: AgentMessage;
}

/**
 * Fired during assistant message streaming with token-by-token updates
 *
 * 助手消息流式增量。带着底层 assistant 事件。
 */
export interface MessageUpdateEvent {
	type: "message_update";
	message: AgentMessage;
	assistantMessageEvent: AssistantMessageEvent;
}

/**
 * Fired when a message ends
 *
 * 一条消息结束。handler 可以换消息，但不能改 role。
 */
export interface MessageEndEvent {
	type: "message_end";
	message: AgentMessage;
}

/**
 * Fired when a tool starts executing
 *
 * 工具开始执行。`args` 是当时的入参快照。
 */
export interface ToolExecutionStartEvent {
	type: "tool_execution_start";
	toolCallId: string;
	toolName: string;
	args: any;
}

/**
 * Fired during tool execution with partial/streaming output
 *
 * 工具执行中的部分输出。`partialResult` 形态由工具自定。
 */
export interface ToolExecutionUpdateEvent {
	type: "tool_execution_update";
	toolCallId: string;
	toolName: string;
	args: any;
	partialResult: any;
}

/**
 * Fired when a tool finishes executing
 *
 * 工具执行结束。`isError` 为真时 `result` 仍可能有内容。
 */
export interface ToolExecutionEndEvent {
	type: "tool_execution_end";
	toolCallId: string;
	toolName: string;
	result: any;
	isError: boolean;
}

// ============================================================================
// Model Events
// ============================================================================

/**
 * How the current model was chosen.
 *
 * 模型是怎么被选上的。`restore` 来自会话恢复。
 */
export type ModelSelectSource = "set" | "cycle" | "restore";

/**
 * Fired when a new model is selected
 *
 * 选了新模型。`previousModel` 在首次选择时可能空。
 */
export interface ModelSelectEvent {
	type: "model_select";
	model: Model<any>;
	previousModel: Model<any> | undefined;
	source: ModelSelectSource;
}

/**
 * Fired when a new thinking level is selected
 *
 * 选了新思考级别。会按模型能力夹紧后再发。
 */
export interface ThinkingLevelSelectEvent {
	type: "thinking_level_select";
	level: ThinkingLevel;
	previousLevel: ThinkingLevel;
}

// ============================================================================
// User Bash Events
// ============================================================================

/**
 * Fired when user executes a bash command via ! or !! prefix
 *
 * 用户用 ! / !! 跑 bash。!! 不进 LLM 上下文。
 */
export interface UserBashEvent {
	type: "user_bash";
	/** The command to execute */
	command: string;
	/** True if !! prefix was used (excluded from LLM context) */
	excludeFromContext: boolean;
	/** Current working directory */
	cwd: string;
}

// ============================================================================
// Input Events
// ============================================================================

/**
 * Source of user input
 *
 * 用户输入从哪来。extension 走 sendUserMessage。
 */
export type InputSource = "interactive" | "rpc" | "extension";

/**
 * Fired when user input is received, before agent processing
 *
 * 用户输入到达、agent 处理前。可以 transform 或 handled。
 */
export interface InputEvent {
	type: "input";
	/** The input text */
	text: string;
	/** Attached images, if any */
	images?: ImageContent[];
	/** Where the input came from */
	source: InputSource;
	/** How the input will be delivered during streaming, or undefined when idle */
	streamingBehavior?: "steer" | "followUp";
}

/**
 * Result from input event handler
 *
 * input handler 的结果。`handled` 会短路后续 handler。
 */
export type InputEventResult =
	| { action: "continue" }
	| { action: "transform"; text: string; images?: ImageContent[] }
	| { action: "handled" };

// ============================================================================
// Tool Events
// ============================================================================

interface ToolCallEventBase {
	type: "tool_call";
	toolCallId: string;
}

/**
 * Built-in bash tool_call payload.
 *
 * bash 工具调用。`input` 可就地改，改完不重验。
 */
export interface BashToolCallEvent extends ToolCallEventBase {
	toolName: "bash";
	input: BashToolInput;
}

/**
 * Built-in PowerShell tool_call payload.
 *
 * PowerShell 工具调用。同样就地改 input，不重验。
 */
export interface PowerShellToolCallEvent extends ToolCallEventBase {
	toolName: "powershell";
	input: PowerShellToolInput;
}

/**
 * Built-in read tool_call payload.
 *
 * read 工具调用。就地改 input，不重验。
 */
export interface ReadToolCallEvent extends ToolCallEventBase {
	toolName: "read";
	input: ReadToolInput;
}

/**
 * Built-in edit tool_call payload.
 *
 * edit 工具调用。就地改 input，不重验。
 */
export interface EditToolCallEvent extends ToolCallEventBase {
	toolName: "edit";
	input: EditToolInput;
}

/**
 * Built-in write tool_call payload.
 *
 * write 工具调用。就地改 input，不重验。
 */
export interface WriteToolCallEvent extends ToolCallEventBase {
	toolName: "write";
	input: WriteToolInput;
}

/**
 * Built-in grep tool_call payload.
 *
 * grep 工具调用。就地改 input，不重验。
 */
export interface GrepToolCallEvent extends ToolCallEventBase {
	toolName: "grep";
	input: GrepToolInput;
}

/**
 * Built-in find tool_call payload.
 *
 * find 工具调用。就地改 input，不重验。
 */
export interface FindToolCallEvent extends ToolCallEventBase {
	toolName: "find";
	input: FindToolInput;
}

/**
 * Built-in ls tool_call payload.
 *
 * ls 工具调用。就地改 input，不重验。
 */
export interface LsToolCallEvent extends ToolCallEventBase {
	toolName: "ls";
	input: LsToolInput;
}

/**
 * Extension-registered tool_call payload.
 *
 * 扩展自定义工具调用。`toolName` 是 string，会挡住字面量收窄。
 */
export interface CustomToolCallEvent extends ToolCallEventBase {
	toolName: string;
	input: Record<string, unknown>;
}

/**
 * Fired before a tool executes. Can block.
 *
 * `event.input` is mutable. Mutate it in place to patch tool arguments before execution.
 * Later `tool_call` handlers see earlier mutations. No re-validation is performed after mutation.
 *
 * 工具执行前。就地改 input；`block` 才能拦住。
 */
export type ToolCallEvent =
	| BashToolCallEvent
	| PowerShellToolCallEvent
	| ReadToolCallEvent
	| EditToolCallEvent
	| WriteToolCallEvent
	| GrepToolCallEvent
	| FindToolCallEvent
	| LsToolCallEvent
	| CustomToolCallEvent;

interface ToolResultEventBase {
	type: "tool_result";
	toolCallId: string;
	input: Record<string, unknown>;
	content: (TextContent | ImageContent)[];
	isError: boolean;
	/** Usage from the tool execution itself, if available. */
	usage?: Usage;
}

/**
 * Built-in bash tool_result payload.
 *
 * bash 执行结果。`details` 可能空。
 */
export interface BashToolResultEvent extends ToolResultEventBase {
	toolName: "bash";
	details: BashToolDetails | undefined;
}

/**
 * Built-in PowerShell tool_result payload.
 *
 * PowerShell 执行结果。`details` 可能空。
 */
export interface PowerShellToolResultEvent extends ToolResultEventBase {
	toolName: "powershell";
	details: PowerShellToolDetails | undefined;
}

/**
 * Built-in read tool_result payload.
 *
 * read 执行结果。`details` 可能空。
 */
export interface ReadToolResultEvent extends ToolResultEventBase {
	toolName: "read";
	details: ReadToolDetails | undefined;
}

/**
 * Built-in edit tool_result payload.
 *
 * edit 执行结果。`details` 可能空。
 */
export interface EditToolResultEvent extends ToolResultEventBase {
	toolName: "edit";
	details: EditToolDetails | undefined;
}

/**
 * Built-in write tool_result payload.
 *
 * write 执行结果。没有 details。
 */
export interface WriteToolResultEvent extends ToolResultEventBase {
	toolName: "write";
	details: undefined;
}

/**
 * Built-in grep tool_result payload.
 *
 * grep 执行结果。`details` 可能空。
 */
export interface GrepToolResultEvent extends ToolResultEventBase {
	toolName: "grep";
	details: GrepToolDetails | undefined;
}

/**
 * Built-in find tool_result payload.
 *
 * find 执行结果。`details` 可能空。
 */
export interface FindToolResultEvent extends ToolResultEventBase {
	toolName: "find";
	details: FindToolDetails | undefined;
}

/**
 * Built-in ls tool_result payload.
 *
 * ls 执行结果。`details` 可能空。
 */
export interface LsToolResultEvent extends ToolResultEventBase {
	toolName: "ls";
	details: LsToolDetails | undefined;
}

/**
 * Extension-registered tool_result payload.
 *
 * 自定义工具执行结果。`details` 形态由工具自定。
 */
export interface CustomToolResultEvent extends ToolResultEventBase {
	toolName: string;
	details: unknown;
}

/**
 * Fired after a tool executes. Can modify result.
 *
 * 工具执行后。可以改 content / details / isError。
 */
export type ToolResultEvent =
	| BashToolResultEvent
	| PowerShellToolResultEvent
	| ReadToolResultEvent
	| EditToolResultEvent
	| WriteToolResultEvent
	| GrepToolResultEvent
	| FindToolResultEvent
	| LsToolResultEvent
	| CustomToolResultEvent;

/**
 * Narrow a tool result to bash.
 *
 * 收窄成 bash 结果。只看 `toolName`。
 */
export function isBashToolResult(e: ToolResultEvent): e is BashToolResultEvent {
	return e.toolName === "bash";
}
/**
 * Narrow a tool result to PowerShell.
 *
 * 收窄成 PowerShell 结果。只看 `toolName`。
 */
export function isPowerShellToolResult(e: ToolResultEvent): e is PowerShellToolResultEvent {
	return e.toolName === "powershell";
}
/**
 * Narrow a tool result to read.
 *
 * 收窄成 read 结果。只看 `toolName`。
 */
export function isReadToolResult(e: ToolResultEvent): e is ReadToolResultEvent {
	return e.toolName === "read";
}
/**
 * Narrow a tool result to edit.
 *
 * 收窄成 edit 结果。只看 `toolName`。
 */
export function isEditToolResult(e: ToolResultEvent): e is EditToolResultEvent {
	return e.toolName === "edit";
}
/**
 * Narrow a tool result to write.
 *
 * 收窄成 write 结果。只看 `toolName`。
 */
export function isWriteToolResult(e: ToolResultEvent): e is WriteToolResultEvent {
	return e.toolName === "write";
}
/**
 * Narrow a tool result to grep.
 *
 * 收窄成 grep 结果。只看 `toolName`。
 */
export function isGrepToolResult(e: ToolResultEvent): e is GrepToolResultEvent {
	return e.toolName === "grep";
}
/**
 * Narrow a tool result to find.
 *
 * 收窄成 find 结果。只看 `toolName`。
 */
export function isFindToolResult(e: ToolResultEvent): e is FindToolResultEvent {
	return e.toolName === "find";
}
/**
 * Narrow a tool result to ls.
 *
 * 收窄成 ls 结果。只看 `toolName`。
 */
export function isLsToolResult(e: ToolResultEvent): e is LsToolResultEvent {
	return e.toolName === "ls";
}

/**
 * Type guard for narrowing ToolCallEvent by tool name.
 *
 * Built-in tools narrow automatically (no type params needed):
 * ```ts
 * if (isToolCallEventType("bash", event)) {
 *   event.input.command;  // string
 * }
 * ```
 *
 * Custom tools require explicit type parameters:
 * ```ts
 * if (isToolCallEventType<"my_tool", MyToolInput>("my_tool", event)) {
 *   event.input.action;  // typed
 * }
 * ```
 *
 * Note: Direct narrowing via `event.toolName === "bash"` doesn't work because
 * CustomToolCallEvent.toolName is `string` which overlaps with all literals.
 *
 * 按工具名收窄 ToolCallEvent。内置不用类型参数；自定义必须显式给。
 */
export function isToolCallEventType(toolName: "bash", event: ToolCallEvent): event is BashToolCallEvent;
export function isToolCallEventType(toolName: "powershell", event: ToolCallEvent): event is PowerShellToolCallEvent;
export function isToolCallEventType(toolName: "read", event: ToolCallEvent): event is ReadToolCallEvent;
export function isToolCallEventType(toolName: "edit", event: ToolCallEvent): event is EditToolCallEvent;
export function isToolCallEventType(toolName: "write", event: ToolCallEvent): event is WriteToolCallEvent;
export function isToolCallEventType(toolName: "grep", event: ToolCallEvent): event is GrepToolCallEvent;
export function isToolCallEventType(toolName: "find", event: ToolCallEvent): event is FindToolCallEvent;
export function isToolCallEventType(toolName: "ls", event: ToolCallEvent): event is LsToolCallEvent;
export function isToolCallEventType<TName extends string, TInput extends Record<string, unknown>>(
	toolName: TName,
	event: ToolCallEvent,
): event is ToolCallEvent & { toolName: TName; input: TInput };
export function isToolCallEventType(toolName: string, event: ToolCallEvent): boolean {
	return event.toolName === toolName;
}

/**
 * Union of all event types
 *
 * 扩展能订的全部事件。专用 emitXxx 的事件不走通用 emit。
 */
export type ExtensionEvent =
	| ProjectTrustEvent
	| ResourcesDiscoverEvent
	| SessionEvent
	| ContextEvent
	| BeforeProviderRequestEvent
	| BeforeProviderHeadersEvent
	| AfterProviderResponseEvent
	| BeforeAgentStartEvent
	| AgentStartEvent
	| AgentEndEvent
	| AgentSettledEvent
	| UIPromptStartEvent
	| UIPromptEndEvent
	| TurnStartEvent
	| TurnEndEvent
	| MessageStartEvent
	| MessageUpdateEvent
	| MessageEndEvent
	| ToolExecutionStartEvent
	| ToolExecutionUpdateEvent
	| ToolExecutionEndEvent
	| ModelSelectEvent
	| ThinkingLevelSelectEvent
	| UserBashEvent
	| InputEvent
	| ToolCallEvent
	| ToolResultEvent;

// ============================================================================
// Event Results
// ============================================================================

/**
 * Optional replacement messages from a context handler.
 *
 * context handler 的返回。给了 `messages` 就整份换掉。
 */
export interface ContextEventResult {
	messages?: AgentMessage[];
}

/**
 * Replacement payload from before_provider_request.
 *
 * before_provider_request 的返回。非 undefined 就当新 payload。
 */
export type BeforeProviderRequestEventResult = unknown;

/**
 * Block / terminate hint from a tool_call handler.
 *
 * tool_call handler 的返回。拦工具用 `block`，改参要改 event.input。
 */
export interface ToolCallEventResult {
	/** Block tool execution. To modify arguments, mutate `event.input` in place instead. */
	block?: boolean;
	reason?: string;
	/**
	 * Hint that the agent should stop after the current tool batch when this call is blocked.
	 * Early termination only happens when every finalized tool result in the batch sets this to true.
	 */
	terminate?: boolean;
}

/**
 * Result from user_bash event handler
 *
 * user_bash 的返回。给 `result` 表示扩展自己跑完了。
 */
export interface UserBashEventResult {
	/** Custom operations to use for execution */
	operations?: BashOperations;
	/** Full replacement: extension handled execution, use this result */
	result?: BashResult;
}

/**
 * Patch applied after a tool_result handler.
 *
 * tool_result 的补丁。只覆盖给了的字段。
 */
export interface ToolResultEventResult {
	content?: (TextContent | ImageContent)[];
	details?: unknown;
	isError?: boolean;
	usage?: Usage;
}

/**
 * Replacement message from a message_end handler.
 *
 * message_end 的返回。替换消息必须保持原 role。
 */
export interface MessageEndEventResult {
	/** Replace the finalized message. The replacement must keep the original message role. */
	message?: AgentMessage;
}

/**
 * Optional custom message or system-prompt replacement before the agent loop.
 *
 * before_agent_start 的返回。多个 systemPrompt 会串起来。
 */
export interface BeforeAgentStartEventResult {
	message?: Pick<CustomMessage, "customType" | "content" | "display" | "details">;
	/** Replace the system prompt for this turn. If multiple extensions return this, they are chained. */
	systemPrompt?: string;
}

/**
 * Cancel flag for session_before_switch.
 *
 * 切会话前的结果。`cancel` 中止切换。
 */
export interface SessionBeforeSwitchResult {
	cancel?: boolean;
}

/**
 * Cancel / restore flags for session_before_fork.
 *
 * fork 前的结果。`skipConversationRestore` 只建空会话。
 */
export interface SessionBeforeForkResult {
	cancel?: boolean;
	skipConversationRestore?: boolean;
}

/**
 * Cancel or supply compaction output before built-in compaction.
 *
 * compaction 前的结果。给 `compaction` 就跳过内置压缩。
 */
export interface SessionBeforeCompactResult {
	cancel?: boolean;
	compaction?: CompactionResult;
}

/**
 * Cancel or override tree-navigation summarization.
 *
 * 树导航前的结果。给 `summary` 就不再自动摘要。
 */
export interface SessionBeforeTreeResult {
	cancel?: boolean;
	summary?: {
		summary: string;
		details?: unknown;
		usage?: Usage;
	};
	/** Override custom instructions for summarization */
	customInstructions?: string;
	/** Override whether customInstructions replaces the default prompt */
	replaceInstructions?: boolean;
	/** Override label to attach to the branch summary entry */
	label?: string;
}

// ============================================================================
// Message and Entry Rendering
// ============================================================================

/**
 * Options for custom message renderers.
 *
 * 自定义消息渲染选项。`outputPad` 来自设置。
 */
export interface MessageRenderOptions {
	expanded: boolean;
	/** Horizontal padding configured by the outputPad setting. */
	outputPad: number;
}

/**
 * Context given to a Markdown transformer.
 *
 * Markdown 变换时的上下文。流式中宽度可能还在变。
 */
export interface MarkdownTransformContext {
	messageType: "user" | "assistant" | "assistant-thinking";
	isStreaming: boolean;
	availableWidth: number;
}

/**
 * Transform user/assistant Markdown before Pi renders it.
 *
 * 渲染前改 user/assistant Markdown。按注册顺序串。
 */
export type MarkdownTransformer = (markdown: string, context: MarkdownTransformContext) => string;

/**
 * Options for custom session-entry renderers.
 *
 * 自定义 session entry 的渲染选项。
 */
export interface EntryRenderOptions {
	expanded: boolean;
}

/**
 * Renderer for a CustomMessage in the transcript.
 *
 * CustomMessage 的渲染器。返回 undefined 就回落到默认。
 */
export type MessageRenderer<T = unknown> = (
	message: CustomMessage<T>,
	options: MessageRenderOptions,
	theme: Theme,
) => Component | undefined;

/**
 * Renderer for a CustomEntry that is not sent to the LLM.
 *
 * CustomEntry 的渲染器。这类 entry 不进 LLM 上下文。
 */
export type EntryRenderer<T = unknown> = (
	entry: CustomEntry<T>,
	options: EntryRenderOptions,
	theme: Theme,
) => Component | undefined;

// ============================================================================
// Command Registration
// ============================================================================

/**
 * Command registered by an extension.
 *
 * 扩展注册的命令。`name` 是注册名，冲突时 runner 会加后缀。
 */
export interface RegisteredCommand {
	name: string;
	sourceInfo: SourceInfo;
	description?: string;
	getArgumentCompletions?: (argumentPrefix: string) => AutocompleteItem[] | null | Promise<AutocompleteItem[] | null>;
	handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
}

/**
 * Registered command plus the name users actually invoke.
 *
 * 带调用名的命令。`invocationName` 才是用户打的那个。
 */
export interface ResolvedCommand extends RegisteredCommand {
	invocationName: string;
}

// ============================================================================
// Extension API
// ============================================================================

/**
 * Handler function type for events
 *
 * 事件处理函数。允许 void；有结果的事件才看返回值。
 */
// biome-ignore lint/suspicious/noConfusingVoidType: void allows bare return statements
export type ExtensionHandler<E, R = undefined> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

/**
 * ExtensionAPI passed to extension factory functions.
 *
 * 工厂函数拿到的 pi。注册写进本扩展；动作委托共享 runtime。
 */
export interface ExtensionAPI {
	// =========================================================================
	// Event Subscription
	// =========================================================================

	on(event: "project_trust", handler: ProjectTrustHandler): void;
	on(event: "resources_discover", handler: ExtensionHandler<ResourcesDiscoverEvent, ResourcesDiscoverResult>): void;
	on(event: "session_start", handler: ExtensionHandler<SessionStartEvent>): void;
	on(event: "session_info_changed", handler: ExtensionHandler<SessionInfoChangedEvent>): void;
	on(
		event: "session_before_switch",
		handler: ExtensionHandler<SessionBeforeSwitchEvent, SessionBeforeSwitchResult>,
	): void;
	on(event: "session_before_fork", handler: ExtensionHandler<SessionBeforeForkEvent, SessionBeforeForkResult>): void;
	on(
		event: "session_before_compact",
		handler: ExtensionHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>,
	): void;
	on(event: "session_compact", handler: ExtensionHandler<SessionCompactEvent>): void;
	on(event: "session_compact_failed", handler: ExtensionHandler<SessionCompactFailedEvent>): void;
	on(event: "session_shutdown", handler: ExtensionHandler<SessionShutdownEvent>): void;
	on(event: "session_before_tree", handler: ExtensionHandler<SessionBeforeTreeEvent, SessionBeforeTreeResult>): void;
	on(event: "session_tree", handler: ExtensionHandler<SessionTreeEvent>): void;
	on(event: "context", handler: ExtensionHandler<ContextEvent, ContextEventResult>): void;
	on(
		event: "before_provider_request",
		handler: ExtensionHandler<BeforeProviderRequestEvent, BeforeProviderRequestEventResult>,
	): void;
	on(event: "before_provider_headers", handler: ExtensionHandler<BeforeProviderHeadersEvent>): void;
	on(event: "after_provider_response", handler: ExtensionHandler<AfterProviderResponseEvent>): void;
	on(event: "before_agent_start", handler: ExtensionHandler<BeforeAgentStartEvent, BeforeAgentStartEventResult>): void;
	on(event: "agent_start", handler: ExtensionHandler<AgentStartEvent>): void;
	on(event: "agent_end", handler: ExtensionHandler<AgentEndEvent>): void;
	on(event: "agent_settled", handler: ExtensionHandler<AgentSettledEvent>): void;
	on(event: "ui_prompt_start", handler: ExtensionHandler<UIPromptStartEvent>): void;
	on(event: "ui_prompt_end", handler: ExtensionHandler<UIPromptEndEvent>): void;
	on(event: "turn_start", handler: ExtensionHandler<TurnStartEvent>): void;
	on(event: "turn_end", handler: ExtensionHandler<TurnEndEvent>): void;
	on(event: "message_start", handler: ExtensionHandler<MessageStartEvent>): void;
	on(event: "message_update", handler: ExtensionHandler<MessageUpdateEvent>): void;
	on(event: "message_end", handler: ExtensionHandler<MessageEndEvent, MessageEndEventResult>): void;
	on(event: "tool_execution_start", handler: ExtensionHandler<ToolExecutionStartEvent>): void;
	on(event: "tool_execution_update", handler: ExtensionHandler<ToolExecutionUpdateEvent>): void;
	on(event: "tool_execution_end", handler: ExtensionHandler<ToolExecutionEndEvent>): void;
	on(event: "model_select", handler: ExtensionHandler<ModelSelectEvent>): void;
	on(event: "thinking_level_select", handler: ExtensionHandler<ThinkingLevelSelectEvent>): void;
	on(event: "tool_call", handler: ExtensionHandler<ToolCallEvent, ToolCallEventResult>): void;
	on(event: "tool_result", handler: ExtensionHandler<ToolResultEvent, ToolResultEventResult>): void;
	on(event: "user_bash", handler: ExtensionHandler<UserBashEvent, UserBashEventResult>): void;
	on(event: "input", handler: ExtensionHandler<InputEvent, InputEventResult>): void;

	// =========================================================================
	// Tool Registration
	// =========================================================================

	/** Register a tool that the LLM can call. */
	registerTool<TParams extends TSchema = TSchema, TDetails = unknown, TState = any>(
		tool: ToolDefinition<TParams, TDetails, TState>,
	): void;

	// =========================================================================
	// Command, Shortcut, Flag Registration
	// =========================================================================

	/** Register a custom command. */
	registerCommand(name: string, options: Omit<RegisteredCommand, "name" | "sourceInfo">): void;

	/** Register a keyboard shortcut. */
	registerShortcut(
		shortcut: KeyId,
		options: {
			description?: string;
			handler: (ctx: ExtensionContext) => Promise<void> | void;
		},
	): void;

	/** Register a CLI flag. */
	registerFlag(
		name: string,
		options:
			| {
					description?: string;
					type: "boolean";
					default?: boolean;
			  }
			| {
					description?: string;
					type: "string";
					default?: string;
			  },
	): void;

	/** Get the value of a registered CLI flag. */
	getFlag(name: string): boolean | string | undefined;

	// =========================================================================
	// Message Rendering
	// =========================================================================

	/** Register a custom renderer for CustomMessageEntry. */
	registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;

	/** Register a transformer for user and assistant Markdown before Pi renders it in the interactive transcript. */
	registerMarkdownTransformer(transformer: MarkdownTransformer): void;

	/** Register a custom renderer for CustomEntry. Custom entries do not participate in LLM context. */
	registerEntryRenderer<T = unknown>(customType: string, renderer: EntryRenderer<T>): void;

	// =========================================================================
	// Actions
	// =========================================================================

	/** Send a custom message to the session. */
	sendMessage<T = unknown>(
		message: Pick<CustomMessage<T>, "customType" | "content" | "display" | "details">,
		options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" },
	): void;

	/**
	 * Send a user message to the agent. Always triggers a turn.
	 * When the agent is streaming, use deliverAs to specify how to queue the message.
	 * Set expandPromptTemplates to dispatch extension commands and expand skill commands and prompt templates.
	 */
	sendUserMessage(
		content: string | (TextContent | ImageContent)[],
		options?: { deliverAs?: "steer" | "followUp"; expandPromptTemplates?: boolean },
	): void;

	/** Append a custom entry to the session for state persistence (not sent to LLM). */
	appendEntry<T = unknown>(customType: string, data?: T): void;

	// =========================================================================
	// Session Metadata
	// =========================================================================

	/** Set the session display name (shown in session selector). */
	setSessionName(name: string): void;

	/** Get the current session name, if set. */
	getSessionName(): string | undefined;

	/** Set or clear a label on an entry. Labels are user-defined markers for bookmarking/navigation. */
	setLabel(entryId: string, label: string | undefined): void;

	/** Execute a shell command. */
	exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;

	/** Get the list of currently active tool names. */
	getActiveTools(): string[];

	/** Get all configured tools with parameter schema, prompt guidelines, and source metadata. */
	getAllTools(): ToolInfo[];

	/** Set the active tools by name. */
	setActiveTools(toolNames: string[]): void;

	/** Get available slash commands in the current session. */
	getCommands(): SlashCommandInfo[];

	// =========================================================================
	// Model and Thinking Level
	// =========================================================================

	/**
	 * Set the model for the current session without changing the configured default for new sessions.
	 * Returns false if authentication is not configured for the model's provider.
	 */
	setModel(model: Model<any>): Promise<boolean>;

	/** Get current thinking level. */
	getThinkingLevel(): ThinkingLevel;

	/**
	 * Set the thinking level (clamped to model capabilities) for the current session without changing the configured default
	 * for new sessions.
	 */
	setThinkingLevel(level: ThinkingLevel): void;

	// =========================================================================
	// Provider Registration
	// =========================================================================

	/**
	 * Register or override a model provider.
	 *
	 * If `models` is provided: replaces all existing models for this provider.
	 * If only `baseUrl` is provided: overrides the URL for existing models.
	 * If `oauth` is provided: registers OAuth provider for /login support.
	 * If `streamSimple` is provided: registers a custom API stream handler.
	 *
	 * During initial extension load this call is queued and applied once the
	 * runner has bound its context. After that it takes effect immediately, so
	 * it is safe to call from command handlers or event callbacks without
	 * requiring a `/reload`.
	 *
	 * @example
	 * // Register a new provider with custom models
	 * pi.registerProvider("my-proxy", {
	 *   baseUrl: "https://proxy.example.com",
	 *   apiKey: "$PROXY_API_KEY",
	 *   api: "anthropic-messages",
	 *   models: [
	 *     {
	 *       id: "claude-sonnet-4-20250514",
	 *       name: "Claude 4 Sonnet (proxy)",
	 *       reasoning: false,
	 *       input: ["text", "image"],
	 *       cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	 *       contextWindow: 200000,
	 *       maxTokens: 16384
	 *     }
	 *   ]
	 * });
	 *
	 * @example
	 * // Override baseUrl for an existing provider
	 * pi.registerProvider("anthropic", {
	 *   baseUrl: "https://proxy.example.com"
	 * });
	 *
	 * @example
	 * // Register provider with OAuth support
	 * pi.registerProvider("corporate-ai", {
	 *   baseUrl: "https://ai.corp.com",
	 *   api: "openai-responses",
	 *   models: [...],
	 *   oauth: {
	 *     name: "Corporate AI (SSO)",
	 *     async login(callbacks) { ... },
	 *     async refreshToken(credentials) { ... },
	 *     getApiKey(credentials) { return credentials.access; }
	 *   }
	 * });
	 */
	registerProvider(provider: Provider): void;
	registerProvider(name: string, config: ProviderConfig): void;

	/**
	 * Unregister a previously registered provider.
	 *
	 * Removes all models belonging to the named provider and restores any
	 * built-in models that were overridden by it. Has no effect if the provider
	 * is not currently registered.
	 *
	 * Like `registerProvider`, this takes effect immediately when called after
	 * the initial load phase.
	 *
	 * @example
	 * pi.unregisterProvider("my-proxy");
	 */
	unregisterProvider(name: string): void;

	/** Shared event bus for extension communication. */
	events: EventBus;
}

// ============================================================================
// Provider Registration Types
// ============================================================================

/**
 * Configuration for registering a provider via pi.registerProvider().
 *
 * registerProvider 的配置。给 models 会换掉该 provider 已有模型。
 */
export interface ProviderConfig {
	/** Display name for the provider in UI. */
	name?: string;
	/** Base URL for the API endpoint. Required when defining models. */
	baseUrl?: string;
	/** API key literal, env interpolation ($ENV_VAR or ${ENV_VAR}), or leading !command. Required when defining models (unless oauth provided). */
	apiKey?: string;
	/** API type. Required at provider or model level when defining models. */
	api?: Api;
	/**
	 * Optional streamSimple handler for custom APIs.
	 * Implementations must invoke `options.onPayload` before sending the provider request and use any
	 * returned replacement payload. They must invoke `options.onResponse` after receiving the response
	 * and before consuming its body, matching built-in providers.
	 */
	streamSimple?: (model: Model<Api>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream;
	/** Custom headers to include in requests. */
	headers?: Record<string, string>;
	/** If true, adds Authorization: Bearer header with the resolved API key. */
	authHeader?: boolean;
	/** Models to register. If provided, replaces all existing models for this provider. */
	models?: ProviderModelConfig[];
	/**
	 * Refresh this provider's model list. The returned list replaces extension-provided models.
	 * Use context.publish({ persist: entry }) when the catalog should persist across sessions.
	 */
	refreshModels?(context: RefreshModelsContext): Promise<ProviderModelConfig[]>;
	/** OAuth provider for /login support. The `id` is set automatically from the provider name. */
	oauth?: {
		/** Display name for the provider in login UI. */
		name: string;
		/** Whether access through this auth method is backed by a provider subscription. */
		isSubscription?: boolean;
		/** @deprecated Retained for source compatibility; canonical auth flows ignore it. */
		usesCallbackServer?: boolean;
		/** Run the login flow, return credentials to persist. */
		login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials>;
		/** Refresh expired credentials, return updated credentials to persist. */
		refreshToken(credentials: OAuthCredentials, signal: AbortSignal): Promise<OAuthCredentials>;
		/** Convert credentials to API key string for the provider. */
		getApiKey(credentials: OAuthCredentials): string;
		/** Legacy synchronous credential-dependent model projection. */
		modifyModels?(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[];
	};
}

/**
 * Configuration for a model within a provider.
 *
 * provider 里的一条模型。`reasoning` 决定能不能开 thinking。
 */
export interface ProviderModelConfig {
	/** Model ID (e.g., "claude-sonnet-4-20250514"). */
	id: string;
	/** Display name (e.g., "Claude 4 Sonnet"). */
	name: string;
	/** API type override for this model. */
	api?: Api;
	/** API endpoint URL override for this model. */
	baseUrl?: string;
	/** Whether the model supports extended thinking. */
	reasoning: boolean;
	/** Maps pi thinking levels to provider/model-specific values; null marks a level unsupported. */
	thinkingLevelMap?: Model<Api>["thinkingLevelMap"];
	/** Supported input types. */
	input: ("text" | "image")[];
	/** Per-million-token cost rates and optional request-wide input pricing tiers. */
	cost: Model<Api>["cost"];
	/** Maximum context window size in tokens. */
	contextWindow: number;
	/** Maximum output tokens. */
	maxTokens: number;
	/** Custom headers for this model. */
	headers?: Record<string, string>;
	/** OpenAI compatibility settings. */
	compat?: Model<Api>["compat"];
}

/**
 * Extension factory function type. Supports both sync and async initialization.
 *
 * 扩展工厂。同步异步都行；抛错则这次加载作废。
 */
export type ExtensionFactory = (pi: ExtensionAPI) => void | Promise<void>;

/**
 * Inline factory or named factory object used by the SDK.
 *
 * 内联扩展。对象形态才能在启动列表里显示名字。
 */
export type InlineExtension =
	| ExtensionFactory
	| {
			/** Display name shown as `<inline:name>` in the startup Extensions list. */
			name: string;
			factory: ExtensionFactory;
			/** Omit this extension from the startup Extensions list. */
			hidden?: boolean;
	  };

// ============================================================================
// Loaded Extension Types
// ============================================================================

/**
 * Tool definition plus the extension that registered it.
 *
 * 已注册工具加上来源。同名时先注册的赢。
 */
export interface RegisteredTool {
	definition: ToolDefinition;
	sourceInfo: SourceInfo;
}

/**
 * CLI flag registered by an extension.
 *
 * 扩展注册的 CLI flag。默认值只在还没人设过时写入。
 */
export interface ExtensionFlag {
	name: string;
	description?: string;
	type: "boolean" | "string";
	default?: boolean | string;
	extensionPath: string;
}

/**
 * Keyboard shortcut registered by an extension.
 *
 * 扩展快捷键。和内置保留键冲突会被丢掉。
 */
export interface ExtensionShortcut {
	shortcut: KeyId;
	description?: string;
	handler: (ctx: ExtensionContext) => Promise<void> | void;
	extensionPath: string;
}

type HandlerFn = (...args: unknown[]) => Promise<unknown>;

/**
 * Runtime implementation of `pi.sendMessage`.
 *
 * pi.sendMessage 的实现。加载期是会 throw 的桩。
 */
export type SendMessageHandler = <T = unknown>(
	message: Pick<CustomMessage<T>, "customType" | "content" | "display" | "details">,
	options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" },
) => void;

/**
 * Runtime implementation of `pi.sendUserMessage`.
 *
 * pi.sendUserMessage 的实现。总会触发一轮。
 */
export type SendUserMessageHandler = (
	content: string | (TextContent | ImageContent)[],
	options?: { deliverAs?: "steer" | "followUp"; expandPromptTemplates?: boolean },
) => void;

/**
 * Runtime implementation of `pi.appendEntry`.
 *
 * pi.appendEntry 的实现。只写会话，不送模型。
 */
export type AppendEntryHandler = <T = unknown>(customType: string, data?: T) => void;

/**
 * Runtime implementation of `pi.setSessionName`.
 *
 * pi.setSessionName 的实现。只改显示名。
 */
export type SetSessionNameHandler = (name: string) => void;

/**
 * Runtime implementation of `pi.getSessionName`.
 *
 * pi.getSessionName 的实现。没设过就 undefined。
 */
export type GetSessionNameHandler = () => string | undefined;

/**
 * Runtime implementation of `pi.getActiveTools`.
 *
 * 当前启用的工具名。
 */
export type GetActiveToolsHandler = () => string[];

/**
 * Tool info with name, description, parameter schema, prompt guidelines, and source metadata.
 *
 * 工具对外摘要。带 schema、guideline 和来源。
 */
export type ToolInfo = Pick<ToolDefinition, "name" | "description" | "parameters" | "promptGuidelines"> & {
	sourceInfo: SourceInfo;
};

/**
 * Runtime implementation of `pi.getAllTools`.
 *
 * 全部已配置工具的摘要。
 */
export type GetAllToolsHandler = () => ToolInfo[];

/**
 * Runtime implementation of `pi.getCommands`.
 *
 * 当前会话能用的斜杠命令。
 */
export type GetCommandsHandler = () => SlashCommandInfo[];

/**
 * Runtime implementation of `pi.setActiveTools`.
 *
 * 按名字设启用工具。
 */
export type SetActiveToolsHandler = (toolNames: string[]) => void;

/**
 * Runtime callback after the registered tool set changes.
 *
 * 工具集合变了后刷新。加载期是空操作。
 */
export type RefreshToolsHandler = () => void;

/**
 * Runtime implementation of `pi.setModel`.
 *
 * 只改本会话模型。provider 没配认证就返回 false。
 */
export type SetModelHandler = (model: Model<any>) => Promise<boolean>;

/**
 * Runtime implementation of `pi.getThinkingLevel`.
 *
 * 读当前思考级别。
 */
export type GetThinkingLevelHandler = () => ThinkingLevel;

/**
 * Runtime implementation of `pi.setThinkingLevel`.
 *
 * 只改本会话思考级别，并按模型能力夹紧。
 */
export type SetThinkingLevelHandler = (level: ThinkingLevel) => void;

/**
 * Runtime implementation of `pi.setLabel`.
 *
 * 给某条 entry 打/清标签。
 */
export type SetLabelHandler = (entryId: string, label: string | undefined) => void;

/**
 * Shared state created by loader, used during registration and runtime.
 * Contains flag values (defaults set during registration, CLI values set after).
 *
 * loader 建的共享状态。flag 和排队的 provider 注册都在这。
 */
export interface ExtensionRuntimeState {
	flagValues: Map<string, boolean | string>;
	/** Legacy provider-config registrations queued during extension loading, processed when runner binds. */
	pendingProviderRegistrations: Array<{ name: string; config: ProviderConfig; extensionPath: string }>;
	/** Native pi-ai provider registrations queued during extension loading, processed when runner binds. */
	pendingNativeProviderRegistrations: Array<{ provider: Provider; extensionPath: string }>;
	/** Throws when this extension instance is stale after runtime replacement. */
	assertActive: () => void;
	/** Marks this extension instance as stale after runtime replacement or reload. */
	invalidate: (message?: string) => void;
	/** Retain an event-bus subscription until this runtime is invalidated. */
	trackEventBusSubscription: (unsubscribe: () => void) => () => void;
	/**
	 * Register or unregister a provider.
	 *
	 * Before bindCore(): queues registrations / removes from queue.
	 * After bindCore(): calls ModelRegistry directly for immediate effect.
	 */
	registerProvider: (name: string, config: ProviderConfig, extensionPath?: string) => void;
	registerNativeProvider: (provider: Provider, extensionPath?: string) => void;
	unregisterProvider: (name: string, extensionPath?: string) => void;
}

/**
 * Action implementations for pi.* API methods.
 * Provided to runner.initialize(), copied into the shared runtime.
 *
 * pi.* 动作实现。loader 先塞 throw 桩，runner.bindCore 再换真货。
 */
export interface ExtensionActions {
	sendMessage: SendMessageHandler;
	sendUserMessage: SendUserMessageHandler;
	appendEntry: AppendEntryHandler;
	setSessionName: SetSessionNameHandler;
	getSessionName: GetSessionNameHandler;
	setLabel: SetLabelHandler;
	getActiveTools: GetActiveToolsHandler;
	getAllTools: GetAllToolsHandler;
	setActiveTools: SetActiveToolsHandler;
	refreshTools: RefreshToolsHandler;
	getCommands: GetCommandsHandler;
	setModel: SetModelHandler;
	getThinkingLevel: GetThinkingLevelHandler;
	setThinkingLevel: SetThinkingLevelHandler;
}

/**
 * Actions for ExtensionContext (ctx.* in event handlers).
 * Required by all modes.
 *
 * 事件 ctx 的动作。所有模式都要给。
 */
export interface ExtensionContextActions {
	getModel: () => Model<any> | undefined;
	getScopedModels: () => readonly ScopedModel[];
	isIdle: () => boolean;
	isProjectTrusted: () => boolean;
	getSignal: () => AbortSignal | undefined;
	abort: () => void;
	hasPendingMessages: () => boolean;
	shutdown: () => void;
	getContextUsage: () => ContextUsage | undefined;
	compact: (options?: CompactOptions) => void;
	getSystemPrompt: () => string;
	getSystemPromptOptions?: () => BuildSystemPromptOptions;
}

/**
 * Actions for ExtensionCommandContext (ctx.* in command handlers).
 * Only needed for interactive mode where extension commands are invokable.
 *
 * 命令 ctx 的会话控制。只有能调扩展命令的模式才需要。
 */
export interface ExtensionCommandContextActions {
	waitForIdle: () => Promise<void>;
	newSession: (options?: {
		parentSession?: string;
		setup?: (sessionManager: SessionManager) => Promise<void>;
		withSession?: (ctx: ReplacedSessionContext) => Promise<void>;
	}) => Promise<{ cancelled: boolean }>;
	fork: (
		entryId: string,
		options?: { position?: "before" | "at"; withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	) => Promise<{ cancelled: boolean }>;
	navigateTree: (
		targetId: string,
		options?: { summarize?: boolean; customInstructions?: string; replaceInstructions?: boolean; label?: string },
	) => Promise<{ cancelled: boolean }>;
	switchSession: (
		sessionPath: string,
		options?: { withSession?: (ctx: ReplacedSessionContext) => Promise<void> },
	) => Promise<{ cancelled: boolean }>;
	reload: () => Promise<void>;
}

/**
 * Full runtime = state + actions.
 * Created by loader with throwing action stubs, completed by runner.initialize().
 *
 * 状态加动作。bindCore 之前动作还是桩。
 */
export interface ExtensionRuntime extends ExtensionRuntimeState, ExtensionActions {}

/**
 * Loaded extension with all registered items.
 *
 * 一个已加载扩展及其全部注册项。
 */
export interface Extension {
	path: string;
	resolvedPath: string;
	hidden?: boolean;
	sourceInfo: SourceInfo;
	handlers: Map<string, HandlerFn[]>;
	tools: Map<string, RegisteredTool>;
	messageRenderers: Map<string, MessageRenderer>;
	markdownTransformer?: MarkdownTransformer;
	entryRenderers?: Map<string, EntryRenderer>;
	commands: Map<string, RegisteredCommand>;
	flags: Map<string, ExtensionFlag>;
	shortcuts: Map<KeyId, ExtensionShortcut>;
}

/**
 * Result of loading extensions.
 *
 * 加载结果。`runtime` 在 runner 绑定前动作会 throw。
 */
export interface LoadExtensionsResult {
	extensions: Extension[];
	errors: Array<{ path: string; error: string }>;
	/** Shared runtime - actions are throwing stubs until runner.initialize() */
	runtime: ExtensionRuntime;
}

// ============================================================================
// Extension Error
// ============================================================================

/**
 * Error thrown by an extension handler, recorded for diagnostics.
 *
 * 扩展 handler 抛错后的记录。给诊断，不中断其它扩展。
 */
export interface ExtensionError {
	extensionPath: string;
	event: string;
	error: string;
	stack?: string;
}
