/**
 * Built-in Mistral provider factory.
 *
 * Mistral 内建 Provider 工厂。挂静态目录与 mistral-conversations；每次调用新造实例。
 */

import { mistralConversationsApi } from "../api/mistral-conversations.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { MISTRAL_MODELS } from "./mistral.models.ts";

/**
 * Construct the built-in Mistral provider.
 *
 * 构造 Mistral 内建 Provider。鉴权走环境 apiKey；流交给 mistral-conversations。
 */
export function mistralProvider(): Provider<"mistral-conversations"> {
	return createProvider({
		id: "mistral",
		name: "Mistral",
		baseUrl: "https://api.mistral.ai",
		auth: { apiKey: envApiKeyAuth("Mistral API key", ["MISTRAL_API_KEY"]) },
		models: Object.values(MISTRAL_MODELS),
		api: mistralConversationsApi(),
	});
}
