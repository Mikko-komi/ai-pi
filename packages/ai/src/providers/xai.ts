/**
 * Built-in xAI provider factory.
 *
 * xAI 内建 Provider 工厂。apiKey 与订阅 OAuth 并列；流交给 openai-responses。
 */

import { openAIResponsesApi } from "../api/openai-responses.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadXaiOAuth } from "../auth/oauth/load.ts";
import { createProvider, type Provider } from "../models.ts";
import { XAI_MODELS } from "./xai.models.ts";

/**
 * Construct the built-in xAI provider.
 *
 * 构造 xAI 内建 Provider。环境 key 与 SuperGrok/X Premium OAuth 二选一即可。
 */
export function xaiProvider(): Provider<"openai-responses"> {
	return createProvider({
		id: "xai",
		name: "xAI",
		baseUrl: "https://api.x.ai/v1",
		auth: {
			apiKey: envApiKeyAuth("xAI API key", ["XAI_API_KEY"]),
			oauth: lazyOAuth({
				name: "xAI (Grok/X subscription)",
				isSubscription: true,
				loginLabel: "Sign in with SuperGrok or X Premium",
				load: loadXaiOAuth,
			}),
		},
		models: Object.values(XAI_MODELS),
		api: openAIResponsesApi(),
	});
}
