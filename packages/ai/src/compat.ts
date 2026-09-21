/**
 * Temporary compatibility entrypoint preserving the old global pi-ai API
 * surface: api-dispatch `stream()`/`complete()` with env API key injection,
 * the api-registry, generated catalog reads (`getModel`/`getModels`/
 * `getProviders`), per-API lazy stream wrappers, and image generation.
 *
 * Existing apps switch imports from "@earendil-works/pi-ai" to
 * "@earendil-works/pi-ai/compat" unchanged; new code uses `createModels()`
 * and the provider factories. This module is deleted with the coding-agent
 * ModelManager migration.
 *
 * 旧全局 pi-ai API 的临时兼容入口。新代码用 `createModels()`；本模块随 ModelManager 迁移删除。
 */

export * from "./api/anthropic-messages.lazy.ts";
export * from "./api/azure-openai-responses.lazy.ts";
export * from "./api/bedrock-converse-stream.lazy.ts";
export * from "./api/google-generative-ai.lazy.ts";
export * from "./api/google-vertex.lazy.ts";
export * from "./api/mistral-conversations.lazy.ts";
export * from "./api/openai-codex-responses.lazy.ts";
export * from "./api/openai-completions.lazy.ts";
export * from "./api/openai-responses.lazy.ts";
export * from "./api/pi-messages.lazy.ts";
export * from "./env-api-keys.ts";
export * from "./image-models.ts";
export * from "./images.ts";
export * from "./images-api-registry.ts";
export * from "./index.ts";
export * from "./legacy-api-aliases.ts";
export * from "./providers/images/register-builtins.ts";

import { anthropicMessagesApi } from "./api/anthropic-messages.lazy.ts";
import { azureOpenAIResponsesApi } from "./api/azure-openai-responses.lazy.ts";
import { bedrockConverseStreamApi } from "./api/bedrock-converse-stream.lazy.ts";
import { googleGenerativeAIApi } from "./api/google-generative-ai.lazy.ts";
import { googleVertexApi } from "./api/google-vertex.lazy.ts";
import { mistralConversationsApi } from "./api/mistral-conversations.lazy.ts";
import { openAICodexResponsesApi } from "./api/openai-codex-responses.lazy.ts";
import { openAICompletionsApi } from "./api/openai-completions.lazy.ts";
import { openAIResponsesApi } from "./api/openai-responses.lazy.ts";
import { piMessagesApi } from "./api/pi-messages.lazy.ts";
import { getEnvApiKey } from "./env-api-keys.ts";
import type { ModelsApiStreamOptions } from "./models.ts";
import { builtinModels, getBuiltinModel, getBuiltinModels, getBuiltinProviders } from "./providers/all.ts";

export type { BuiltinProvider } from "./providers/all.ts";

import { createFauxCore, type FauxProviderRegistration, type RegisterFauxProviderOptions } from "./providers/faux.ts";
import type {
	Api,
	ApiStreamOptions,
	AssistantMessage,
	AssistantMessageEventStream,
	Context,
	Model,
	ProviderStreamOptions,
	ProviderStreams,
	SimpleStreamOptions,
	StreamFunction,
	StreamOptions,
} from "./types.ts";

/**
 * @deprecated Static catalog read. Use `getBuiltinModel` from "@earendil-works/pi-ai/providers/all" or `Models.getModel()`.
 *
 * 旧全局目录读取。新代码用 `getBuiltinModel` 或 `Models.getModel()`。
 */
export const getModel = getBuiltinModel;

/**
 * @deprecated Static catalog read. Use `getBuiltinModels` from "@earendil-works/pi-ai/providers/all" or `Models.getModels()`.
 *
 * 旧全局目录列表。新代码用 `getBuiltinModels` 或 `Models.getModels()`。
 */
export const getModels = getBuiltinModels;

/**
 * @deprecated Static catalog read. Use `getBuiltinProviders` from "@earendil-works/pi-ai/providers/all" or `Models.getProviders()`.
 *
 * 旧全局 Provider 列表。新代码用 `getBuiltinProviders` 或 `Models.getProviders()`。
 */
export const getProviders = getBuiltinProviders;

/**
 * Untyped stream function stored in the compat api-registry.
 *
 * compat 注册表里的无类型 stream。调用前要核对 `model.api`。
 */
export type ApiStreamFunction = (
	model: Model<Api>,
	context: Context,
	options?: StreamOptions,
) => AssistantMessageEventStream;

/**
 * Untyped simple-stream function stored in the compat api-registry.
 *
 * compat 注册表里的无类型 streamSimple。
 */
export type ApiStreamSimpleFunction = (
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
) => AssistantMessageEventStream;

/**
 * Typed API implementation registered under `api` for compat dispatch.
 *
 * 挂在某个 `Api` 上的类型化实现，给旧 `stream()` 分发用。
 */
export interface ApiProvider<TApi extends Api = Api, TOptions extends StreamOptions = StreamOptions> {
	api: TApi;
	stream: StreamFunction<TApi, TOptions>;
	streamSimple: StreamFunction<TApi, SimpleStreamOptions>;
}

interface ApiProviderInternal {
	api: Api;
	stream: ApiStreamFunction;
	streamSimple: ApiStreamSimpleFunction;
}

type RegisteredApiProvider = {
	provider: ApiProviderInternal;
	sourceId?: string;
};

const apiProviderRegistry = new Map<string, RegisteredApiProvider>();

function wrapStream<TApi extends Api, TOptions extends StreamOptions>(
	api: TApi,
	stream: StreamFunction<TApi, TOptions>,
): ApiStreamFunction {
	return (model, context, options) => {
		if (model.api !== api) {
			throw new Error(`Mismatched api: ${model.api} expected ${api}`);
		}
		return stream(model as Model<TApi>, context, options as TOptions);
	};
}

function wrapStreamSimple<TApi extends Api>(
	api: TApi,
	streamSimple: StreamFunction<TApi, SimpleStreamOptions>,
): ApiStreamSimpleFunction {
	return (model, context, options) => {
		if (model.api !== api) {
			throw new Error(`Mismatched api: ${model.api} expected ${api}`);
		}
		return streamSimple(model as Model<TApi>, context, options);
	};
}

/**
 * Register or replace the stream implementation for an API.
 *
 * 注册或覆盖某个 api 的流实现。`sourceId` 供批量卸载。
 */
export function registerApiProvider<TApi extends Api, TOptions extends StreamOptions>(
	provider: ApiProvider<TApi, TOptions>,
	sourceId?: string,
): void {
	apiProviderRegistry.set(provider.api, {
		provider: {
			api: provider.api,
			stream: wrapStream(provider.api, provider.stream),
			streamSimple: wrapStreamSimple(provider.api, provider.streamSimple),
		},
		sourceId,
	});
}

/**
 * Look up the registered stream implementation for an API.
 *
 * 按 api 取已注册流实现。没有则 undefined。
 */
export function getApiProvider(api: Api): ApiProviderInternal | undefined {
	return apiProviderRegistry.get(api)?.provider;
}

/**
 * All registered stream implementations.
 *
 * 当前注册表里的全部流实现。
 */
export function getApiProviders(): ApiProviderInternal[] {
	return Array.from(apiProviderRegistry.values(), (entry) => entry.provider);
}

/**
 * Remove registry entries that were registered with `sourceId`.
 *
 * 按 `sourceId` 卸掉一批实现。内建项通常没有 sourceId。
 */
export function unregisterApiProviders(sourceId: string): void {
	for (const [api, entry] of apiProviderRegistry.entries()) {
		if (entry.sourceId === sourceId) {
			apiProviderRegistry.delete(api);
		}
	}
}

function clearApiProviders(): void {
	apiProviderRegistry.clear();
}

/**
 * Register a faux API provider into the compat registry for tests.
 *
 * 把 faux 实现挂进 compat 注册表。`unregister()` 按 sourceId 卸掉。
 */
export function registerFauxProvider(options: RegisterFauxProviderOptions = {}): FauxProviderRegistration {
	const core = createFauxCore(options);
	const sourceId = `faux-provider-${Math.random().toString(36).slice(2, 10)}`;
	registerApiProvider({ api: core.api, stream: core.stream, streamSimple: core.streamSimple }, sourceId);
	return {
		api: core.api,
		models: core.models,
		getModel: core.getModel,
		state: core.state,
		setResponses: core.setResponses,
		appendResponses: core.appendResponses,
		getPendingResponseCount: core.getPendingResponseCount,
		unregister() {
			unregisterApiProviders(sourceId);
		},
	};
}

const BUILTIN_APIS: [Api, ProviderStreams][] = [
	["anthropic-messages", anthropicMessagesApi()],
	["openai-completions", openAICompletionsApi()],
	["openai-responses", openAIResponsesApi()],
	["openai-codex-responses", openAICodexResponsesApi()],
	["azure-openai-responses", azureOpenAIResponsesApi()],
	["google-generative-ai", googleGenerativeAIApi()],
	["google-vertex", googleVertexApi()],
	["mistral-conversations", mistralConversationsApi()],
	["bedrock-converse-stream", bedrockConverseStreamApi()],
	["pi-messages", piMessagesApi()],
];

const builtinApiProviderInstances = new Map<Api, ReturnType<typeof getApiProvider>>();

/**
 * Registers the builtin API implementations into the api-registry without
 * clobbering existing entries: compat may load after a test or extension has
 * already registered an override for a builtin api id.
 *
 * 把内建 API 实现写入注册表。已有同 id 条目不覆盖。
 */
export function registerBuiltInApiProviders(): void {
	for (const [api, streams] of BUILTIN_APIS) {
		if (!getApiProvider(api)) {
			registerApiProvider({ api, stream: streams.stream, streamSimple: streams.streamSimple });
		}
		builtinApiProviderInstances.set(api, getApiProvider(api));
	}
}

/**
 * Clear the api-registry and re-register builtin implementations.
 *
 * 清空注册表再装回内建实现。测试复位用。
 */
export function resetApiProviders(): void {
	clearApiProviders();
	builtinApiProviderInstances.clear();
	registerBuiltInApiProviders();
}

registerBuiltInApiProviders();

const compatModels = builtinModels();
const AMBIENT_AUTH_MARKER = "<authenticated>";

function hasExplicitApiKey(apiKey: string | undefined): apiKey is string {
	return typeof apiKey === "string" && apiKey.trim().length > 0;
}

function withEnvApiKey<TOptions extends StreamOptions>(
	model: Model<Api>,
	options: TOptions | undefined,
): TOptions | undefined {
	if (hasExplicitApiKey(options?.apiKey)) return options;
	const apiKey = getEnvApiKey(model.provider, options?.env);
	if (!apiKey || apiKey === AMBIENT_AUTH_MARKER) return options;
	return { ...options, apiKey } as TOptions;
}

function hasResolvedCloudflareAuth(options: StreamOptions | undefined): boolean {
	return hasExplicitApiKey(options?.apiKey) || typeof options?.headers?.["cf-aig-authorization"] === "string";
}

function getBuiltinProviderForModel(model: Model<Api>) {
	if (getApiProvider(model.api) !== builtinApiProviderInstances.get(model.api)) return undefined;
	const provider = compatModels.getProvider(model.provider);
	return provider?.getModels().some((candidate) => candidate.api === model.api) ? provider : undefined;
}

function resolveApiProvider(api: Api) {
	const provider = getApiProvider(api);
	if (!provider) {
		throw new Error(`No API provider registered for api: ${api}`);
	}
	return provider;
}

/**
 * Compat stream: env API-key injection plus api-registry dispatch.
 *
 * 旧全局 stream。无显式 key 时注入环境 key；Cloudflare 环境凭证走 `Models`。
 */
export function stream<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): AssistantMessageEventStream {
	const builtinProvider = getBuiltinProviderForModel(model);
	if (builtinProvider) {
		if (model.provider.startsWith("cloudflare-") && !hasResolvedCloudflareAuth(options)) {
			return compatModels.stream(model, context, options as ModelsApiStreamOptions<TApi> | undefined);
		}
		return builtinProvider.stream(model, context, withEnvApiKey(model, options) as ApiStreamOptions<TApi>);
	}
	const provider = resolveApiProvider(model.api);
	return provider.stream(model, context, withEnvApiKey(model, options) as StreamOptions);
}

/**
 * Compat complete: drain `stream()` to a final assistant message.
 *
 * 旧全局 complete。等 `stream()` 出最终消息。
 */
export async function complete<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): Promise<AssistantMessage> {
	const s = stream(model, context, options);
	return s.result();
}

/**
 * Compat simple-stream with the same env-key and builtin routing as `stream()`.
 *
 * 旧全局 streamSimple。路由与 `stream()` 相同。
 */
export function streamSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const builtinProvider = getBuiltinProviderForModel(model);
	if (builtinProvider) {
		if (model.provider.startsWith("cloudflare-") && !hasResolvedCloudflareAuth(options)) {
			return compatModels.streamSimple(model, context, options);
		}
		return builtinProvider.streamSimple(model, context, withEnvApiKey(model, options));
	}
	const provider = resolveApiProvider(model.api);
	return provider.streamSimple(model, context, withEnvApiKey(model, options));
}

/**
 * Compat simple-complete: drain `streamSimple()` to a final assistant message.
 *
 * 旧全局 completeSimple。等 `streamSimple()` 出最终消息。
 */
export async function completeSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): Promise<AssistantMessage> {
	const s = streamSimple(model, context, options);
	return s.result();
}
