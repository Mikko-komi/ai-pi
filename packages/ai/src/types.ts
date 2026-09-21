/**
 * Shared provider, stream, message, and model contracts for `@earendil-works/pi-ai`.
 *
 * pi-ai 的统一合同：API / Provider 身份、请求选项、消息块、流协议和 Model。自定义 API 用 branded string，不进 KnownApi。
 */

import type { TelemetryContext } from "@earendil-works/pi-telemetry";
import type { AnthropicOptions } from "./api/anthropic-messages.ts";
import type { AzureOpenAIResponsesOptions } from "./api/azure-openai-responses.ts";
import type { BedrockOptions } from "./api/bedrock-converse-stream.ts";
import type { GoogleOptions } from "./api/google-generative-ai.ts";
import type { GoogleVertexOptions } from "./api/google-vertex.ts";
import type { MistralOptions } from "./api/mistral-conversations.ts";
import type { OpenAICodexResponsesOptions } from "./api/openai-codex-responses.ts";
import type { OpenAICompletionsOptions } from "./api/openai-completions.ts";
import type { OpenAIResponsesOptions } from "./api/openai-responses.ts";
import type { PiMessagesOptions } from "./api/pi-messages.ts";
import type { AssistantMessageDiagnostic } from "./utils/diagnostics.ts";
import type { AssistantMessageEventStream } from "./utils/event-stream.ts";

export type { AssistantMessageEventStream } from "./utils/event-stream.ts";

/**
 * First-party stream API identifiers implemented under `src/api/`.
 *
 * 仓库内实现的流式 API id 闭集。新适配器要进这里；自定义字符串走 {@link Api}。
 */
export type KnownApi =
	| "openai-completions"
	| "mistral-conversations"
	| "openai-responses"
	| "azure-openai-responses"
	| "openai-codex-responses"
	| "anthropic-messages"
	| "bedrock-converse-stream"
	| "google-generative-ai"
	| "google-vertex"
	| "pi-messages";

/**
 * Stream API id: a known implementation or a branded custom string.
 *
 * 流式 API 身份。`string & {}` 接住自定义 id，且不把 `KnownApi` 展成普通 string。
 */
export type Api = KnownApi | (string & {});

/**
 * First-party image-generation API identifiers.
 *
 * 仓库内实现的生图 API id 闭集。
 */
export type KnownImagesApi = "openrouter-images";

/**
 * Image-generation API id: known or branded custom.
 *
 * 生图 API 身份。自定义字符串同样用 branded string，不稀释闭集。
 */
export type ImagesApi = KnownImagesApi | (string & {});

/**
 * Catalog provider identifiers shipped with pi-ai.
 *
 * 内置目录里的 provider id。和 {@link KnownApi} 不是一回事：一个 provider 可以挂不同 API。
 */
export type KnownProvider =
	| "amazon-bedrock"
	| "ant-ling"
	| "anthropic"
	| "google"
	| "google-vertex"
	| "openai"
	| "azure-openai-responses"
	| "openai-codex"
	| "radius"
	| "nvidia"
	| "deepseek"
	| "github-copilot"
	| "xai"
	| "groq"
	| "cerebras"
	| "openrouter"
	| "vercel-ai-gateway"
	| "zai"
	| "zai-coding-cn"
	| "mistral"
	| "minimax"
	| "minimax-cn"
	| "moonshotai"
	| "moonshotai-cn"
	| "huggingface"
	| "fireworks"
	| "together"
	| "baseten"
	| "opencode"
	| "opencode-go"
	| "kimi-coding"
	| "cloudflare-workers-ai"
	| "cloudflare-ai-gateway"
	| "qwen-token-plan"
	| "qwen-token-plan-cn"
	| "qwen-token-plan-individual"
	| "xiaomi"
	| "xiaomi-token-plan-cn"
	| "xiaomi-token-plan-ams"
	| "xiaomi-token-plan-sgp";
/**
 * Provider identity: a catalog id or any custom string.
 *
 * Provider 身份。这里是普通 `string` 联合，自定义 id 不必 branded。
 */
export type ProviderId = KnownProvider | string;

/**
 * Catalog provider identifiers that expose image generation.
 *
 * 带生图能力的内置 provider 闭集。
 */
export type KnownImagesProvider = "openrouter";

/**
 * Image-generation provider identity.
 *
 * 生图 provider 身份。自定义同样走普通 string。
 */
export type ImagesProviderId = KnownImagesProvider | string;

/**
 * Provider-neutral tool-use switch for simple requests.
 *
 * 简单请求的工具开关。省略时由适配器按各家默认处理，不是自动当 `auto`。
 */
export type ToolChoice = "auto" | "none";
/**
 * User-facing reasoning intensity sent through `streamSimple`.
 *
 * 用户侧思考强度。不含 `off`；关掉思考用 {@link ModelThinkingLevel}。
 */
export type ThinkingLevel = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
/**
 * Thinking intensity including the explicit off state.
 *
 * 模型侧思考档位。`off` 表示关掉；`thinkingLevelMap` 的 key 用这一档。
 */
export type ModelThinkingLevel = "off" | ThinkingLevel;
/**
 * Map from pi thinking levels to provider-native values.
 *
 * pi 档位到上游取值。缺 key 用 provider 默认；`null` 表示该档不受理。`xhigh` / `max` 必须显式给出非 null 才启用。
 */
export type ThinkingLevelMap = Partial<Record<ModelThinkingLevel, string | null>>;
/**
 * Literal or pi-controlled placeholder for chat-template thinking kwargs.
 *
 * 模板参数值。`$var` 由 pi 填 thinking 开关 / 档位 / 预算；`omitWhenOff` 为真时关思考就整键不发。
 */
export type ChatTemplateKwargValue =
	| string
	| number
	| boolean
	| null
	| {
			$var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
			omitWhenOff?: boolean;
	  };

/**
 * Top-level request field used to cap reasoning tokens on OpenAI-compatible servers.
 *
 * 兼容端点上封 reasoning token 的字段名。按上游服务器选，不按模型；不设则不发预算。
 */
export type ThinkingTokenBudgetField = "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens";

/**
 * Token budgets for each thinking level (token-based providers only)
 *
 * 按档位封 thinking token。只对按 token 计预算的提供商有意义。
 */
export interface ThinkingBudgets {
	minimal?: number;
	low?: number;
	medium?: number;
	high?: number;
}

// Base options all providers share
/**
 * Prompt-cache retention preference mapped by each provider.
 *
 * 提示缓存保留偏好。提供商映射到自家取值；默认 `short`，不支持的忽略。
 */
export type CacheRetention = "none" | "short" | "long";

/**
 * Preferred stream transport for multi-transport providers.
 *
 * 多通道提供商的传输偏好。不支持的提供商直接忽略，不会报错。
 */
export type Transport = "sse" | "websocket" | "websocket-cached" | "auto";

/**
 * Provider-scoped environment overrides. Values take precedence over process.env.
 *
 * 提供商范围的环境覆盖。只覆盖该次请求用到的配置，优先于 `process.env`。
 */
export type ProviderEnv = Record<string, string>;
/**
 * Extra or suppressing HTTP headers for a provider request.
 *
 * 请求头覆盖。`null` 压掉同名默认头；Bedrock 上保留头会被静默丢掉以保住签名。
 */
export type ProviderHeaders = Record<string, string | null>;
/**
 * Injectable `fetch` implementation for provider HTTP.
 *
 * 可注入的 HTTP `fetch`。WebSocket 通道不用它；适配器也可以拒绝自定义实现。
 */
export type FetchFunction = typeof globalThis.fetch;
/**
 * Header encoding for session-affinity / cache-routing ids.
 *
 * 会话亲和头格式。只决定头怎么写，不管 body 里的 `prompt_cache_key`。
 */
export type SessionAffinityFormat = "openai" | "openai-nosession" | "openrouter";

/**
 * Status and headers snapshot of a completed HTTP provider response.
 *
 * HTTP 响应快照。给 `onResponse` 看，不带 body。
 */
export interface ProviderResponse {
	status: number;
	headers: Record<string, string>;
}

/**
 * Authentication, HTTP transport, and lifecycle callbacks shared by provider requests.
 *
 * 所有提供商请求共享的鉴权、传输和生命周期钩子。不含采样或 cache 这类流选项。
 */
export interface ProviderRequestOptions<TModel = Model<Api>> {
	signal?: AbortSignal;
	/** Explicit parent context for telemetry produced by this logical request. */
	telemetryContext?: TelemetryContext;
	apiKey?: string;
	/**
	 * Optional fetch implementation for provider HTTP requests.
	 * Defaults to `globalThis.fetch`. Provider adapters that cannot inject a custom implementation may reject it.
	 * This does not affect WebSocket transports.
	 */
	fetch?: FetchFunction;
	/**
	 * Provider-scoped environment values. These take precedence over process.env for
	 * provider configuration such as regional settings, endpoint placeholders, and
	 * proxy variables.
	 */
	env?: ProviderEnv;
	/**
	 * Optional callback for inspecting or replacing provider payloads before sending.
	 * Return undefined to keep the payload unchanged.
	 */
	onPayload?: (payload: unknown, model: TModel) => unknown | undefined | Promise<unknown | undefined>;
	/**
	 * Optional callback invoked after an HTTP response is received.
	 */
	onResponse?: (response: ProviderResponse, model: TModel) => void | Promise<void>;
	/**
	 * Optional custom HTTP headers to include in API requests.
	 * Merged with provider defaults; caller values override default headers.
	 * On AWS Bedrock these are injected via a Smithy `build`-step middleware so
	 * they are covered by SigV4 signing; reserved headers (`x-amz-*`,
	 * `authorization`, `host`) are silently ignored to preserve SigV4 / bearer auth.
	 * A null value suppresses a provider/API default header with the same name.
	 */
	headers?: ProviderHeaders;
	/**
	 * HTTP request timeout in milliseconds for providers/SDKs that support it.
	 * For example, OpenAI and Anthropic SDK clients default to 10 minutes.
	 */
	timeoutMs?: number;
	/**
	 * Maximum retry attempts for providers/SDKs that support client-side retries.
	 * For example, OpenAI and Anthropic SDK clients default to 2.
	 */
	maxRetries?: number;
	/**
	 * Maximum delay in milliseconds to wait for a retry when the server requests a long wait.
	 * If the server's requested delay exceeds this value, the request fails immediately
	 * with an error containing the requested delay, allowing higher-level retry logic
	 * to handle it with user visibility.
	 * Default: 60000 (60 seconds). Set to 0 to disable the cap.
	 */
	maxRetryDelayMs?: number;
}

/**
 * Streaming-request options on top of {@link ProviderRequestOptions}.
 *
 * 流式请求选项。`samplingParams` 只被 OpenAI 兼容适配器吃掉；别的 API 忽略。
 */
export interface StreamOptions extends ProviderRequestOptions<Model<Api>> {
	/**
	 * Optional callback invoked after an HTTP response is received and before
	 * its body stream is consumed.
	 */
	onResponse?: (response: ProviderResponse, model: Model<Api>) => void | Promise<void>;
	temperature?: number;
	/**
	 * Arbitrary sampling parameters merged into the request body as-is, after the named request
	 * fields, so keys here override them. Lets custom OpenAI-compatible servers (llama.cpp, vLLM,
	 * SGLang, ...) receive parameters pi does not model, e.g. `top_p`, `top_k`, `min_p`,
	 * `repetition_penalty`. Merged over `Model.samplingParams` per key. Only applied by
	 * OpenAI-compatible adapters (completions, responses, Azure responses); other APIs ignore it.
	 */
	samplingParams?: Record<string, unknown>;
	maxTokens?: number;
	/**
	 * Preferred transport for providers that support multiple transports.
	 * Providers that do not support this option ignore it.
	 */
	transport?: Transport;
	/**
	 * Prompt cache retention preference. Providers map this to their supported values.
	 * Default: "short".
	 */
	cacheRetention?: CacheRetention;
	/**
	 * Optional session identifier for providers that support session-based caching.
	 * Providers can use this to enable prompt caching, request routing, or other
	 * session-aware features. Ignored by providers that don't support it.
	 */
	sessionId?: string;
	/**
	 * WebSocket connect timeout in milliseconds for providers that support
	 * WebSocket transports. This covers the connection/open handshake only;
	 * stream idleness after connection uses timeoutMs.
	 */
	websocketConnectTimeoutMs?: number;
	/**
	 * Optional metadata to include in API requests.
	 * Providers extract the fields they understand and ignore the rest.
	 * For example, Anthropic uses `user_id` for abuse tracking and rate limiting.
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Stream options plus open extra keys for custom or passthrough APIs.
 *
 * 流选项加开放字段。给自定义 API 或工厂透传用，已知 API 应走 {@link ApiStreamOptions}。
 */
export type ProviderStreamOptions = StreamOptions & Record<string, unknown>;

/**
 * Options for polling a deferred provider handle.
 *
 * 拉取延迟响应的选项。`wait` 为 0 只查一次状态，不长轮询。
 */
export interface DeferredFetchOptions extends ProviderRequestOptions<Model<Api>> {
	/**
	 * Maximum provider long-poll duration in milliseconds.
	 * Defaults to 0, which performs one status check.
	 */
	wait?: number;
}

/**
 * Request options for best-effort deferred-response cancellation.
 *
 * 尽力取消延迟响应。失败不保证上游已经停。
 */
export type DeferredCancelOptions = ProviderRequestOptions<Model<Api>>;

/**
 * Maps known APIs to their full provider-specific stream option types.
 * Type-only imports from API implementation modules are erased at emit, so
 * this is tree-shake safe.
 *
 * 已知 API 到具体选项类型的映射。只存在于类型层，不影响打包。
 */
export interface ApiOptionsMap {
	"anthropic-messages": AnthropicOptions;
	"openai-completions": OpenAICompletionsOptions;
	"openai-responses": OpenAIResponsesOptions;
	"openai-codex-responses": OpenAICodexResponsesOptions;
	"azure-openai-responses": AzureOpenAIResponsesOptions;
	"google-generative-ai": GoogleOptions;
	"google-vertex": GoogleVertexOptions;
	"mistral-conversations": MistralOptions;
	"bedrock-converse-stream": BedrockOptions;
	"pi-messages": PiMessagesOptions;
}

/**
 * Full stream options for an API. Known APIs resolve to their concrete option
 * type; custom API strings fall back to the generic shape.
 *
 * 按 API 解析后的流选项。已知 API 拿到具体类型；自定义字符串退回通用形状。
 */
export type ApiStreamOptions<TApi extends Api> = TApi extends keyof ApiOptionsMap
	? ApiOptionsMap[TApi]
	: StreamOptions & Record<string, unknown>;

/**
 * The uniform stream contract of an API implementation module: every module
 * under `src/api/` exports `stream` and `streamSimple`; capable modules may also
 * export deferred-response methods. Lazy wrappers (`lazyApi()`) and provider
 * factories pass these around as values. This is the untyped dispatch shape;
 * per-API option typing lives on the implementation modules themselves and on
 * `Provider.stream()` via `ApiStreamOptions`.
 *
 * API 模块的统一值合同。`stream` / `streamSimple` 必有；延迟响应对应方法可选。
 */
export interface ProviderStreams {
	stream(model: Model<Api>, context: Context, options?: StreamOptions): AssistantMessageEventStream;
	streamSimple(model: Model<Api>, context: Context, options?: SimpleStreamOptions): AssistantMessageEventStream;
	fetchDeferred?(
		model: Model<Api>,
		handle: DeferredHandle,
		options?: DeferredFetchOptions,
	): AssistantMessageEventStream;
	cancelDeferred?(model: Model<Api>, handle: DeferredHandle, options?: DeferredCancelOptions): Promise<void>;
}

/**
 * The uniform contract of an image-generation API implementation module:
 * every image API module under `src/api/` exports exactly `generateImages`,
 * so the module itself satisfies this interface. Lazy wrappers and image
 * provider factories pass these around as values.
 *
 * 生图 API 模块的统一值合同。模块本身就得满足，只暴露 `generateImages`。
 */
export interface ProviderImages {
	generateImages(
		model: ImagesModel<ImagesApi>,
		context: ImagesContext,
		options?: ImagesOptions,
	): Promise<AssistantImages>;
}

/**
 * Request options for image generation.
 *
 * 生图请求选项。在共享请求选项上只加 metadata。
 */
export interface ImagesOptions extends ProviderRequestOptions<ImagesModel<ImagesApi>> {
	/**
	 * Optional metadata to include in API requests.
	 * Providers extract the fields they understand and ignore the rest.
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Image options plus open extra keys for custom image APIs.
 *
 * 生图选项加开放字段。给自定义生图 API 透传。
 */
export type ProviderImagesOptions = ImagesOptions & Record<string, unknown>;

/**
 * One Anthropic server-side fallback target with local pricing.
 *
 * Anthropic `fallbacks` 里的一个目标。本地要带定价，才能给回落响应算 cost。
 */
export interface AnthropicAllowedFallbackModel {
	provider: ProviderId;
	model: string;
	cost: ModelCost;
}

// Unified options with reasoning passed to streamSimple() and completeSimple()
/**
 * Provider-neutral options for `streamSimple` / `completeSimple`.
 *
 * 简单流的中性选项。`reasoning` 是 pi 档位，由适配器映射到各家字段。
 */
export interface SimpleStreamOptions extends StreamOptions {
	/** Provider-neutral tool selection for simple requests. When omitted, adapters use provider-specific behavior. */
	toolChoice?: ToolChoice;
	reasoning?: ThinkingLevel;
	/** Ask a capable provider to return a durable handle and continue the request asynchronously. */
	deferred?: boolean | { window?: "15m" | "1h" | "24h" };
	/** Custom token budgets for thinking levels (token-based providers only) */
	thinkingBudgets?: ThinkingBudgets;
}

/**
 * Generic StreamFunction with typed options.
 *
 * Contract:
 * - Must return an AssistantMessageEventStream.
 * - Direct streamSimple() calls may throw synchronously when request auth is
 *   missing. Once a stream is returned, request/model/runtime failures should
 *   be encoded in that stream.
 * - Error termination must produce an AssistantMessage with stopReason
 *   "error" or "aborted" and errorMessage, emitted via the stream protocol.
 *
 * 带类型选项的流函数。返回流之后失败必须写进流；缺鉴权的 `streamSimple` 可以直接同步抛。
 */
export type StreamFunction<TApi extends Api = Api, TOptions extends StreamOptions = StreamOptions> = (
	model: Model<TApi>,
	context: Context,
	options?: TOptions,
) => AssistantMessageEventStream;

/**
 * Typed image-generation function for an image API module.
 *
 * 生图函数合同。返回已完成的 {@link AssistantImages}，不是事件流。
 */
export type ImagesFunction<TApi extends ImagesApi = ImagesApi, TOptions extends ImagesOptions = ImagesOptions> = (
	model: ImagesModel<TApi>,
	context: ImagesContext,
	options?: TOptions,
) => Promise<AssistantImages>;

/**
 * Versioned replay signature for a text content block.
 *
 * 文本块的版本化签名。`v` 必须是 1；旧数据可能仍是裸 id 字符串。
 */
export interface TextSignatureV1 {
	v: 1;
	id: string;
	phase?: "commentary" | "final_answer";
}

/**
 * Visible text block in a message.
 *
 * 可见文本块。`textSignature` 只为重放，调用方不当作用户可见内容。
 */
export interface TextContent {
	type: "text";
	text: string;
	textSignature?: string; // e.g., for OpenAI responses, message metadata (legacy id string or TextSignatureV1 JSON)
}

/**
 * Reasoning / thinking block, including redacted payloads.
 *
 * 思考块。`redacted` 时正文不可见，不透明载荷放在 `thinkingSignature` 里以便续轮。
 */
export interface ThinkingContent {
	type: "thinking";
	thinking: string;
	thinkingSignature?: string; // Provider-specific opaque or serialized reasoning replay data
	/** When true, the thinking content was redacted by safety filters. The opaque
	 *  encrypted payload is stored in `thinkingSignature` so it can be passed back
	 *  to the API for multi-turn continuity. */
	redacted?: boolean;
}

/**
 * Inline image part: base64 payload plus MIME type.
 *
 * 内联图片。`data` 是 base64，不是 URL。
 */
export interface ImageContent {
	type: "image";
	data: string; // base64 encoded image data
	mimeType: string; // e.g., "image/jpeg", "image/png"
}

/**
 * Model-emitted tool invocation block.
 *
 * 模型发出的工具调用。`arguments` 已是对象；`thoughtSignature` 仅 Google 重放思考上下文。
 */
export interface ToolCall {
	type: "toolCall";
	id: string;
	name: string;
	arguments: Record<string, any>;
	thoughtSignature?: string; // Google-specific: opaque signature for reusing thought context
	/** OpenAI Responses namespace for calls to dynamically loaded or namespaced tools. */
	namespace?: string;
}

/**
 * Token and cost accounting for one model turn.
 *
 * 一轮的 token 与费用。`reasoning` 若有则已含在 `output` 里；缺字段表示上游没拆这一项。
 */
export interface Usage {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	/** Subset of `cacheWrite` written with 1h retention. Only Anthropic reports this split. */
	cacheWrite1h?: number;
	/**
	 * Reasoning/thinking tokens, when the provider reports them. This is a subset of
	 * `output`: `output` already includes these tokens. Set to a number (possibly 0) by
	 * providers that expose a reasoning breakdown; left undefined by providers that don't.
	 */
	reasoning?: number;
	totalTokens: number;
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		total: number;
	};
}

/**
 * Why an assistant turn ended or is still open.
 *
 * 一轮结束原因。`pending` 表示还没关账；`deferred` 表示先拿 handle，不是最终文本。
 */
export type StopReason = "pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred";

/**
 * JSON-serializable value tree.
 *
 * 可 JSON 序列化的树。用来扛延迟 handle 的 `data`，不是任意 JS 值。
 */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Provider token for polling or cancelling an async response.
 *
 * 延迟响应的上游凭证。`id` 加上 `data` 才能重建最终 assistant 消息。
 */
export interface DeferredHandle {
	provider: string;
	modelId: string;
	api: string;
	/** Provider token, such as a response id or batch id plus row id. */
	id: string;
	expiresAt?: number;
	pollAfterMs?: number;
	/** Provider conversion data required to reconstruct the final assistant message. */
	data?: JsonValue;
}

/**
 * User turn: plain text or mixed text/image parts.
 *
 * 用户轮。`timestamp` 是毫秒 Unix 时间。
 */
export interface UserMessage {
	role: "user";
	content: string | (TextContent | ImageContent)[];
	timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Model turn: content blocks, usage, and a terminal or pending stop reason.
 *
 * 模型轮。流式过程中 `stopReason` 先是 `pending`；关账后不能再 pending。
 */
export interface AssistantMessage {
	role: "assistant";
	content: (TextContent | ThinkingContent | ToolCall)[];
	api: Api;
	provider: ProviderId;
	model: string;
	responseModel?: string; // Concrete `chunk.model` when different from the requested `model` (e.g. OpenRouter `auto` -> `anthropic/...`)
	responseId?: string; // Provider-specific response/message identifier when the upstream API exposes one
	/** Exact provider-native effort level used for this response. Absent for legacy or unmanaged responses. */
	providerThinkingLevel?: string;
	diagnostics?: AssistantMessageDiagnostic[]; // Redacted provider/runtime diagnostics for failures and recoveries.
	usage: Usage;
	stopReason: StopReason;
	deferred?: DeferredHandle;
	errorMessage?: string;
	rawStopReason?: string;
	/**
	 * Provider indication of whether the model explicitly ended its turn.
	 * Preserved for debugging and does not currently affect agent control flow.
	 */
	endTurn?: boolean;
	timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Tool execution result bound to one assistant tool call.
 *
 * 一次工具执行结果。必须对上 `toolCallId`；`addedToolNames` 只给原生延迟装工具的提供商。
 */
export interface ToolResultMessage<TDetails = any> {
	role: "toolResult";
	toolCallId: string;
	toolName: string;
	content: (TextContent | ImageContent)[]; // Supports text and images
	details?: TDetails;
	/** Usage from the tool execution itself, if available. Not part of main LLM context accounting. */
	usage?: Usage;
	/**
	 * Names from `Context.tools` that became available after this result.
	 * Providers with native deferred tool loading use this as the load point;
	 * other providers ignore it and use `Context.tools` normally.
	 */
	addedToolNames?: string[];
	isError: boolean;
	timestamp: number; // Unix timestamp in milliseconds
}

/**
 * One conversation turn stored in {@link Context}.
 *
 * 上下文里的一条消息。三种 `role` 互斥。
 */
export type Message = UserMessage | AssistantMessage | ToolResultMessage;

/**
 * Allowed content block on an image-generation prompt.
 *
 * 生图输入块。只能是文本或图片，没有 thinking / toolCall。
 */
export type ImagesInputContent = TextContent | ImageContent;
/**
 * Allowed content block on an image-generation result.
 *
 * 生图输出块。和输入一样只允许文本或图片。
 */
export type ImagesOutputContent = TextContent | ImageContent;

/**
 * Prompt payload for image generation.
 *
 * 生图上下文。只有 `input`，没有 system / tools / 多轮 messages。
 */
export interface ImagesContext {
	input: ImagesInputContent[];
}

/**
 * Terminal reason for an image-generation call.
 *
 * 生图结束原因。没有 `pending` / `toolUse` / `deferred`。
 */
export type ImagesStopReason = "stop" | "error" | "aborted";

/**
 * Completed image-generation result.
 *
 * 一次生图的落定结果。失败时 `stopReason` 为 error / aborted，并带 `errorMessage`。
 */
export interface AssistantImages {
	api: ImagesApi;
	provider: ImagesProviderId;
	model: string;
	output: ImagesOutputContent[];
	responseId?: string;
	usage?: Usage;
	stopReason: ImagesStopReason;
	errorMessage?: string;
	timestamp: number; // Unix timestamp in milliseconds
}

import type { TSchema } from "typebox";

/**
 * OpenAI grammar variants for constrained sampling.
 *
 * OpenAI 自定义工具的语法编码。不支持时退回普通 function tool。
 */
export type GrammarFormat = "openai_lark" | "openai_regex";

/**
 * Partial map of grammar format to source string.
 *
 * 同一种约束语言的各家编码。缺的格式就当这个工具没有那种语法。
 */
export type GrammarVariants = Partial<Record<GrammarFormat, string>>;

/**
 * Optional provider-side constrained sampling configs for a tool.
 *
 * The `json_schema` value roughly maps to the concept of `strict` in APIs which is
 * implemented as json-schema constrained sampling by APIs. Grammar variants let
 * callers provide provider-specific encodings of the same intended language.
 *
 * 工具的服务端约束采样。`json_schema` 对应各家 `strict`；`grammar` 要自带 variants。
 */
export type ConstrainedSamplingConfig =
	| {
			type: "json_schema";
			strict: "prefer" | "require";
	  }
	| {
			type: "grammar";
			variants: GrammarVariants;
	  };

/**
 * Schema-bearing tool definition offered to the model.
 *
 * 给模型看的工具定义。`parameters` 是 TypeBox schema；`constrainedSampling: false` 明确关掉约束。
 */
export interface Tool<TParameters extends TSchema = TSchema> {
	name: string;
	description: string;
	parameters: TParameters;
	constrainedSampling?: false | ConstrainedSamplingConfig;
}

/**
 * Prompt the provider receives: system, messages, and optional tools.
 *
 * 送给模型的上下文。`tools` 缺省表示本轮不声明工具，不是沿用上一轮。
 */
export interface Context {
	systemPrompt?: string;
	messages: Message[];
	tools?: Tool[];
}

/**
 * Event protocol for AssistantMessageEventStream.
 *
 * Successful streams emit `start` before partial updates and terminate with
 * `done`. A stream may terminate directly with `error` when request setup fails
 * before generation starts; after `start`, failures also terminate with `error`.
 * Direct `streamSimple()` calls throw synchronously when request auth is missing.
 * Updates and `done` must never appear before `start`.
 *
 * `partial` is the shared live response-so-far helper, not an event-time
 * snapshot. Text and thinking blocks are empty when their `*_start` event is
 * emitted and grow only through their corresponding `*_delta` events until the
 * authoritative `*_end`. Redacted thinking may be complete at start and emit no
 * deltas. Tool-call arguments at `toolcall_start` are provider-specific;
 * `toolcall_delta` carries subsequent JSON updates.
 *
 * 助手流事件。`start` 之前不能有增量；`partial` 是正在长的那条消息，不是当时切片。
 */
export type AssistantMessageEvent =
	| { type: "start"; partial: AssistantMessage }
	| { type: "text_start"; contentIndex: number; partial: AssistantMessage }
	| { type: "text_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
	| { type: "text_end"; contentIndex: number; content: string; partial: AssistantMessage }
	| { type: "thinking_start"; contentIndex: number; partial: AssistantMessage }
	| { type: "thinking_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
	| { type: "thinking_end"; contentIndex: number; content: string; partial: AssistantMessage }
	| { type: "toolcall_start"; contentIndex: number; partial: AssistantMessage }
	| { type: "toolcall_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
	| { type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }
	| {
			type: "done";
			reason: Extract<StopReason, "stop" | "length" | "toolUse" | "deferred">;
			message: AssistantMessage;
	  }
	| { type: "error"; reason: Extract<StopReason, "aborted" | "error">; error: AssistantMessage };

/**
 * Compatibility settings for OpenAI-compatible completions APIs.
 * Use this to override URL-based auto-detection for custom providers.
 *
 * OpenAI 兼容 Completions 的能力覆盖。用来盖掉按 URL 猜的结果；未设字段保持自动探测。
 */
export interface OpenAICompletionsCompat {
	/** Whether the provider supports the `store` field. Default: auto-detected from URL. */
	supportsStore?: boolean;
	/** Whether the provider supports the `developer` role (vs `system`). Default: auto-detected from URL. */
	supportsDeveloperRole?: boolean;
	/** Whether the provider supports `reasoning_effort`. Default: auto-detected from URL. */
	supportsReasoningEffort?: boolean;
	/** Whether the provider supports `stream_options: { include_usage: true }` for token usage in streaming responses. Default: true. */
	supportsUsageInStreaming?: boolean;
	/** Whether streamed responses include `finish_reason`. When false, pi infers `stop` or `toolUse` when the stream ends. Default: true. */
	supportsFinishReason?: boolean;
	/** Which field to use for max tokens. Default: auto-detected from URL. */
	maxTokensField?: "max_completion_tokens" | "max_tokens";
	/** Whether tool results require the `name` field. Default: auto-detected from URL. */
	requiresToolResultName?: boolean;
	/** Whether a user message after tool results requires an assistant message in between. Default: auto-detected from URL. */
	requiresAssistantAfterToolResult?: boolean;
	/** Whether thinking blocks must be converted to text blocks with <thinking> delimiters. Default: auto-detected from URL. */
	requiresThinkingAsText?: boolean;
	/** Whether all replayed assistant messages must include an empty reasoning_content field when reasoning is enabled. Default: auto-detected from URL. */
	requiresReasoningContentOnAssistantMessages?: boolean;
	/** Format for reasoning/thinking parameter. "openai" uses reasoning_effort, "openrouter" uses reasoning: { effort }, "deepseek" uses thinking: { type } plus reasoning_effort when supported, "together" uses reasoning: { enabled } plus reasoning_effort when supported, "baseten" uses configurable chat_template_args plus reasoning_effort when supported, "zai" uses thinking: { type }, "qwen" uses top-level enable_thinking: boolean, "qwen-chat-template" uses chat_template_kwargs.enable_thinking and preserve_thinking, "chat-template" uses configurable chat_template_kwargs, "string-thinking" uses top-level thinking: string, and "ant-ling" uses reasoning: { effort } only when the mapped effort is non-null. Default: "openai". */
	thinkingFormat?:
		| "openai"
		| "openrouter"
		| "deepseek"
		| "together"
		| "baseten"
		| "zai"
		| "qwen"
		| "chat-template"
		| "qwen-chat-template"
		| "string-thinking"
		| "ant-ling";
	/** Kwargs to send as `chat_template_kwargs` when `thinkingFormat` is `chat-template`. Use `{ "$var": "thinking.enabled" }`, `{ "$var": "thinking.effort" }`, or `{ "$var": "thinking.budget" }` for pi-controlled thinking values. */
	chatTemplateKwargs?: Record<string, ChatTemplateKwargValue>;
	/** Arguments to send as `chat_template_args` when `thinkingFormat` is `baseten`. Use `{ "$var": "thinking.enabled" }`, `{ "$var": "thinking.effort" }`, or `{ "$var": "thinking.budget" }` for pi-controlled thinking values. */
	chatTemplateArgs?: Record<string, ChatTemplateKwargValue>;
	/** OpenRouter-compatible routing preferences sent as the `provider` request field. */
	openRouterRouting?: OpenRouterRouting;
	/** Vercel AI Gateway routing preferences. Only used when baseUrl points to Vercel AI Gateway. */
	vercelGatewayRouting?: VercelGatewayRouting;
	/** Whether z.ai supports top-level `tool_stream: true` for streaming tool call deltas. Default: false. */
	zaiToolStream?: boolean;
	/**
	 * Top-level request field used to cap reasoning tokens from `thinkingBudgets`.
	 * Reasoning and the answer share `max_tokens` on these endpoints, so without a budget a
	 * reasoning-heavy turn can consume the whole response and emit no answer.
	 * `"thinking_token_budget"` is vLLM, `"thinking_budget"` is Qwen/DashScope/SGLang,
	 * `"thinking_budget_tokens"` is llama.cpp. Off by default; not set on the generated catalog.
	 */
	thinkingTokenBudgetField?: ThinkingTokenBudgetField;
	/** Alias for `thinkingTokenBudgetField: "thinking_token_budget"` (vLLM). Prefer `thinkingTokenBudgetField`. Default: false. */
	supportsThinkingTokenBudget?: boolean;
	/** Whether the provider supports OpenAI custom tools with Lark/regex grammar formats. When false, grammar-constrained tools fall back to normal function tools. Default: false; the generated model catalog enables it for capable models. */
	supportsOpenAIGrammarTools?: boolean;
	/** Whether the provider supports the `strict` field in tool definitions. Default: true. */
	supportsStrictMode?: boolean;
	/** Cache control convention for prompt caching. "anthropic" applies Anthropic-style `cache_control` markers to the system prompt, last tool definition, and last user, assistant, or tool-result text content. */
	cacheControlFormat?: "anthropic";
	/** Whether to send session-affinity data from `options.sessionId`. Default: true for OpenRouter endpoints, false otherwise. */
	sendSessionAffinityHeaders?: boolean;
	/** Provider-specific deferred tool serialization mode. */
	deferredToolsMode?: "kimi";
	/** Session-affinity header format: `openai` sends `session_id`, `x-client-request-id`, and `x-session-affinity`; `openai-nosession` sends `x-client-request-id` and `x-session-affinity`; `openrouter` sends `x-session-id`. Does not affect the `prompt_cache_key` body param, which is governed by cache retention. Default: auto-detected. */
	sessionAffinityFormat?: SessionAffinityFormat;
	/** Whether the provider supports long prompt cache retention (`prompt_cache_retention: "24h"` or Anthropic-style `cache_control.ttl: "1h"`, depending on format). Default: true. */
	supportsLongCacheRetention?: boolean;
	/**
	 * vLLM scheduler priority sent as the top-level `priority` request field (lower values are
	 * handled earlier; server default 0). Only meaningful when vLLM runs with
	 * `--scheduling-policy priority`; useful for keeping background/batch work from stalling
	 * interactive sessions. Off by default; not set on the generated catalog.
	 */
	vllmPriority?: number;
}

/**
 * Compatibility settings for OpenAI Responses APIs.
 *
 * OpenAI Responses 兼容开关。默认按 API 惯例，不按 URL 猜。
 */
export interface OpenAIResponsesCompat {
	/** Whether the provider supports the `developer` role (vs `system`). Default: true. */
	supportsDeveloperRole?: boolean;
	/** Session-affinity header format: `openai` sends `session_id` and `x-client-request-id`; `openai-nosession` sends `x-client-request-id`; `openrouter` sends `x-session-id`. Does not affect the `prompt_cache_key` body param, which is governed by cache retention. Default: auto-detected. */
	sessionAffinityFormat?: SessionAffinityFormat;
	/** Whether the provider supports long prompt cache retention. This uses `prompt_cache_options.ttl: "30m"` on GPT-5.6+ and `prompt_cache_retention: "24h"` on earlier models. Default: true. */
	supportsLongCacheRetention?: boolean;
	/** Whether the provider supports strict JSON-schema function tools. Defaults are API-specific; generated OpenAI models enable it explicitly. */
	supportsStrictMode?: boolean;
	/** Whether to emit OpenAI custom tools with Lark/regex grammar formats. When false, grammar-constrained tools fall back to normal function tools. Default: false; the generated model catalog enables it for capable models. */
	supportsOpenAIGrammarTools?: boolean;
	/** Whether the model supports message-anchored `additional_tools` input items. Default: false. */
	supportsAdditionalTools?: boolean;
	/** Whether the model supports client-executed tool search for deferred tools. Default: false. */
	supportsToolSearch?: boolean;
	/** Whether the model accepts `prompt_cache_options` (OpenAI GPT-5.6+ prompt caching). Older OpenAI models reject the parameter. Default: false. */
	supportsExplicitPromptCacheMode?: boolean;
	/** Whether the provider accepts the `max_output_tokens` parameter. Some Codex-protocol gateways reject it. Default: true. */
	supportsMaxOutputTokens?: boolean;
}

/**
 * Compatibility settings for Anthropic Messages-compatible APIs.
 *
 * Anthropic Messages 兼容开关。缺省按官方 Anthropic；兼容网关按实际上游能力改。
 */
export interface AnthropicMessagesCompat {
	/**
	 * Whether the provider accepts per-tool `eager_input_streaming`.
	 * When false, the Anthropic provider omits `tools[].eager_input_streaming`
	 * and sends the legacy `fine-grained-tool-streaming-2025-05-14` beta header
	 * for tool-enabled requests.
	 * Default: true.
	 */
	supportsEagerToolInputStreaming?: boolean;
	/** Whether the provider supports Anthropic long cache retention (`cache_control.ttl: "1h"`). Default: true. */
	supportsLongCacheRetention?: boolean;
	/**
	 * Whether to send the `x-session-affinity` header from `options.sessionId`
	 * when caching is enabled. Required for providers like Fireworks that use
	 * session affinity for prompt cache routing (requests to the same replica
	 * maximize cache hits).
	 * Default: false.
	 */
	sendSessionAffinityHeaders?: boolean;
	/** Session-affinity format. `"openrouter"` sends `x-session-id`; when unset, sends `x-session-affinity`. */
	sessionAffinityFormat?: "openrouter";
	/**
	 * Whether the provider supports Anthropic-style `cache_control` markers on
	 * tool definitions. When false, `cache_control` is omitted from tool params.
	 * Some Anthropic-compatible providers (e.g., Fireworks) do not support this
	 * field on tools and may reject or ignore it.
	 * Default: true.
	 */
	supportsCacheControlOnTools?: boolean;
	/**
	 * Whether the model accepts the Anthropic `temperature` request field.
	 * Claude Opus 4.7+ rejects non-default temperature values.
	 * Default: true.
	 */
	supportsTemperature?: boolean;
	/**
	 * Whether to force adaptive thinking (`thinking.type: "adaptive"` plus
	 * `output_config.effort`) regardless of the model id. Built-in models that
	 * require adaptive thinking set this in generated metadata. Custom
	 * Anthropic-compatible providers can set this to `true` for any model whose
	 * upstream requires the adaptive format. Set to `false` to
	 * opt out on overridden built-in models.
	 * Default: false.
	 */
	forceAdaptiveThinking?: boolean;
	/** Whether to replay empty thinking signatures as `signature: ""` instead of converting thinking to text. Default: false. */
	allowEmptySignature?: boolean;
	/** Whether the provider supports Anthropic strict tool schemas. Default: false; generated Anthropic models enable it explicitly. */
	supportsStrictTools?: boolean;
	/** Whether the exact model transport supports effort-only system messages and thinking binding controls. Default: false. */
	supportsMidConvoEffort?: boolean;
	/**
	 * Models Anthropic accepts in `fallbacks` for server-side refusal fallback,
	 * with local pricing metadata for returned fallback responses. When absent or
	 * empty, callers must omit `fallbacks`; Anthropic rejects the field for models
	 * with no permitted fallback targets.
	 */
	allowedFallbackModels?: AnthropicAllowedFallbackModel[];
	/**
	 * Whether the provider supports deferred tools loaded by `tool_reference`
	 * blocks in tool results. Default: true for first-party Anthropic models
	 * except Haiku and models older than Claude 4.5; false for other providers.
	 */
	supportsToolReferences?: boolean;
}

/**
 * Compatibility settings for Amazon Bedrock models.
 *
 * Bedrock 模型兼容开关。目前只声明是否支持严格工具 schema。
 */
export interface BedrockCompat {
	/** Whether the model supports Bedrock strict tool schemas. Default: false. */
	supportsStrictMode?: boolean;
}

/**
 * OpenRouter provider routing preferences.
 * Controls which upstream providers OpenRouter routes requests to.
 * Sent as the `provider` field in the OpenRouter API request body.
 * @see https://openrouter.ai/docs/guides/routing/provider-selection
 *
 * OpenRouter 的上游路由偏好。作为请求体里的 `provider` 字段发出。
 */
export interface OpenRouterRouting {
	/** Whether to allow backup providers to serve requests. Default: true. */
	allow_fallbacks?: boolean;
	/** Whether to filter providers to only those that support all parameters in the request. Default: false. */
	require_parameters?: boolean;
	/** Data collection setting. "allow" (default): allow providers that may store/train on data. "deny": only use providers that don't collect user data. */
	data_collection?: "deny" | "allow";
	/** Whether to restrict routing to only ZDR (Zero Data Retention) endpoints. */
	zdr?: boolean;
	/** Whether to restrict routing to only models that allow text distillation. */
	enforce_distillable_text?: boolean;
	/** An ordered list of provider names/slugs to try in sequence, falling back to the next if unavailable. */
	order?: string[];
	/** List of provider names/slugs to exclusively allow for this request. */
	only?: string[];
	/** List of provider names/slugs to skip for this request. */
	ignore?: string[];
	/** A list of quantization levels to filter providers by (e.g., ["fp16", "bf16", "fp8", "fp6", "int8", "int4", "fp4", "fp32"]). */
	quantizations?: string[];
	/** Sorting strategy. Can be a string (e.g., "price", "throughput", "latency") or an object with `by` and `partition`. */
	sort?:
		| string
		| {
				/** The sorting metric: "price", "throughput", "latency". */
				by?: string;
				/** Partitioning strategy: "model" (default) or "none". */
				partition?: string | null;
		  };
	/** Maximum price per million tokens (USD). */
	max_price?: {
		/** Price per million prompt tokens. */
		prompt?: number | string;
		/** Price per million completion tokens. */
		completion?: number | string;
		/** Price per image. */
		image?: number | string;
		/** Price per audio unit. */
		audio?: number | string;
		/** Price per request. */
		request?: number | string;
	};
	/** Preferred minimum throughput (tokens/second). Can be a number (applies to p50) or an object with percentile-specific cutoffs. */
	preferred_min_throughput?:
		| number
		| {
				/** Minimum tokens/second at the 50th percentile. */
				p50?: number;
				/** Minimum tokens/second at the 75th percentile. */
				p75?: number;
				/** Minimum tokens/second at the 90th percentile. */
				p90?: number;
				/** Minimum tokens/second at the 99th percentile. */
				p99?: number;
		  };
	/** Preferred maximum latency (seconds). Can be a number (applies to p50) or an object with percentile-specific cutoffs. */
	preferred_max_latency?:
		| number
		| {
				/** Maximum latency in seconds at the 50th percentile. */
				p50?: number;
				/** Maximum latency in seconds at the 75th percentile. */
				p75?: number;
				/** Maximum latency in seconds at the 90th percentile. */
				p90?: number;
				/** Maximum latency in seconds at the 99th percentile. */
				p99?: number;
		  };
}

/**
 * Vercel AI Gateway routing preferences.
 * Controls which upstream providers the gateway routes requests to.
 * @see https://vercel.com/docs/ai-gateway/models-and-providers/provider-options
 *
 * Vercel AI Gateway 的上游路由偏好。只在 baseUrl 指向该网关时生效。
 */
export interface VercelGatewayRouting {
	/** List of provider slugs to exclusively use for this request (e.g., ["bedrock", "anthropic"]). */
	only?: string[];
	/** List of provider slugs to try in order (e.g., ["anthropic", "openai"]). */
	order?: string[];
}

/**
 * Per-million-token prices for one model.
 *
 * 百万 token 单价。单位是美元。
 */
export interface ModelCostRates {
	input: number; // $/million tokens
	output: number; // $/million tokens
	cacheRead: number; // $/million tokens
	cacheWrite: number; // $/million tokens
}

/**
 * Cost rates that apply once input usage crosses a threshold.
 *
 * 按输入 token 门槛切换的单价。匹配时整单用这一档，不是分段计价。
 */
export interface ModelCostTier extends ModelCostRates {
	/** Use this tier for requests whose total input usage exceeds this token count. */
	inputTokensAbove: number;
}

/**
 * Model pricing: base rates plus optional request-wide tiers.
 *
 * 模型定价。有 tiers 时取「输入超过门槛」里最高的那一档套整单。
 */
export interface ModelCost extends ModelCostRates {
	/** Request-wide pricing tiers. The highest matching input threshold applies to the full request. */
	tiers?: ModelCostTier[];
}

// Model interface for the unified model system
/**
 * Unified model identity, capabilities, pricing, and API-specific compat.
 *
 * 统一模型描述。`api` 决定走哪套适配器和 `compat` 形状；`id` 是提供商侧模型名。
 */
export interface Model<TApi extends Api> {
	id: string;
	name: string;
	api: TApi;
	provider: ProviderId;
	baseUrl: string;
	reasoning: boolean;
	/**
	 * Maps pi thinking levels to provider/model-specific values.
	 * Missing keys use provider defaults. null marks a level as unsupported.
	 */
	thinkingLevelMap?: ThinkingLevelMap;
	input: ("text" | "image")[];
	cost: ModelCost;
	contextWindow: number;
	maxTokens: number;
	/** Default sampling parameters for this model. See {@link StreamOptions.samplingParams}; per-request keys override these. */
	samplingParams?: Record<string, unknown>;
	headers?: Record<string, string>;
	/** Compatibility overrides for OpenAI-compatible APIs. If not set, auto-detected from baseUrl. */
	compat?: TApi extends "openai-completions"
		? OpenAICompletionsCompat
		: TApi extends "openai-responses" | "azure-openai-responses" | "openai-codex-responses"
			? OpenAIResponsesCompat
			: TApi extends "anthropic-messages"
				? AnthropicMessagesCompat
				: TApi extends "bedrock-converse-stream"
					? BedrockCompat
					: never;
}

/**
 * Image-generation model: chat Model minus reasoning and token-window fields.
 *
 * 生图模型。去掉 reasoning / contextWindow / maxTokens / compat，另加 `output` 模态。
 */
export interface ImagesModel<TApi extends ImagesApi>
	extends Omit<Model<Api>, "api" | "provider" | "reasoning" | "contextWindow" | "maxTokens" | "compat"> {
	api: TApi;
	provider: ImagesProviderId;
	output: ("text" | "image")[];
}
