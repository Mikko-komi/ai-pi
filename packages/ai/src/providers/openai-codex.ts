/**
 * Built-in OpenAI Codex provider factory.
 *
 * OpenAI Codex 内建 Provider 工厂。只挂 ChatGPT 订阅 OAuth，无 apiKey。
 */

import { openAICodexResponsesApi } from "../api/openai-codex-responses.lazy.ts";
import { lazyOAuth } from "../auth/helpers.ts";
import { loadOpenAICodexOAuth } from "../auth/oauth/load.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENAI_CODEX_MODELS } from "./openai-codex.models.ts";

/**
 * Construct the built-in OpenAI Codex provider.
 *
 * 构造 OpenAI Codex Provider。鉴权仅 OAuth；流交给 openai-codex-responses。
 */
export function openaiCodexProvider(): Provider<"openai-codex-responses"> {
	return createProvider({
		id: "openai-codex",
		name: "OpenAI Codex",
		baseUrl: "https://chatgpt.com/backend-api",
		auth: {
			oauth: lazyOAuth({
				name: "OpenAI (ChatGPT Plus/Pro)",
				isSubscription: true,
				load: loadOpenAICodexOAuth,
			}),
		},
		models: Object.values(OPENAI_CODEX_MODELS),
		api: openAICodexResponsesApi(),
	});
}
