/**
 * Built-in Kimi For Coding provider factory.
 *
 * Kimi For Coding 内建 Provider 工厂。apiKey 与订阅 OAuth 并列；流交给 anthropic-messages。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadKimiCodingOAuth } from "../auth/oauth/load.ts";
import { createProvider, type Provider } from "../models.ts";
import { KIMI_CODING_MODELS } from "./kimi-coding.models.ts";

/**
 * Construct the built-in Kimi For Coding provider.
 *
 * 构造 Kimi For Coding Provider。环境 key 与 Kimi Code 订阅 OAuth 二选一即可。
 */
export function kimiCodingProvider(): Provider<"anthropic-messages"> {
	return createProvider({
		id: "kimi-coding",
		name: "Kimi For Coding",
		baseUrl: "https://api.kimi.com/coding",
		auth: {
			apiKey: envApiKeyAuth("Kimi API key", ["KIMI_API_KEY"]),
			oauth: lazyOAuth({
				name: "Kimi Code (subscription)",
				isSubscription: true,
				loginLabel: "Sign in with Kimi Code",
				load: loadKimiCodingOAuth,
			}),
		},
		models: Object.values(KIMI_CODING_MODELS),
		api: anthropicMessagesApi(),
	});
}
