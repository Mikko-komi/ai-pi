/**
 * Built-in OpenRouter provider factory.
 *
 * OpenRouter 内建 Provider 工厂。apiKey 与 OAuth 并列；按模型 api 分发到两套流。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadOpenRouterOAuth } from "../auth/oauth/load.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENROUTER_MODELS } from "./openrouter.models.ts";

/**
 * Construct the built-in OpenRouter provider.
 *
 * 构造 OpenRouter 内建 Provider。环境 key 与 OAuth 换来的长期 key 二选一即可。
 */
export function openrouterProvider(): Provider<"anthropic-messages" | "openai-completions"> {
	return createProvider({
		id: "openrouter",
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		auth: {
			apiKey: envApiKeyAuth("OpenRouter API key", ["OPENROUTER_API_KEY"]),
			oauth: lazyOAuth({
				name: "OpenRouter OAuth",
				loginLabel: "Sign in with OpenRouter",
				load: loadOpenRouterOAuth,
			}),
		},
		models: Object.values(OPENROUTER_MODELS),
		api: {
			"anthropic-messages": anthropicMessagesApi(),
			"openai-completions": openAICompletionsApi(),
		},
	});
}
