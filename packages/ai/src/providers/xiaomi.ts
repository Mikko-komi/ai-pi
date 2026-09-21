/**
 * Built-in Xiaomi provider factory.
 *
 * Xiaomi 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { XIAOMI_MODELS } from "./xiaomi.models.ts";

/**
 * Construct the built-in Xiaomi provider.
 *
 * 构造 Xiaomi 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function xiaomiProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "xiaomi",
		name: "Xiaomi",
		baseUrl: "https://api.xiaomimimo.com/v1",
		auth: { apiKey: envApiKeyAuth("Xiaomi API key", ["XIAOMI_API_KEY"]) },
		models: Object.values(XIAOMI_MODELS),
		api: openAICompletionsApi(),
	});
}
