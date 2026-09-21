/**
 * Built-in Z.AI provider factory.
 *
 * Z.AI 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { ZAI_MODELS } from "./zai.models.ts";

/**
 * Construct the built-in Z.AI provider.
 *
 * 构造 Z.AI 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function zaiProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "zai",
		name: "Z.AI",
		baseUrl: "https://api.z.ai/api/coding/paas/v4",
		auth: { apiKey: envApiKeyAuth("Z.AI API key", ["ZAI_API_KEY"]) },
		models: Object.values(ZAI_MODELS),
		api: openAICompletionsApi(),
	});
}
