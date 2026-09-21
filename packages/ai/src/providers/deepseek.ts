/**
 * Built-in DeepSeek provider factory.
 *
 * DeepSeek 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { DEEPSEEK_MODELS } from "./deepseek.models.ts";

/**
 * Construct the built-in DeepSeek provider.
 *
 * 构造 DeepSeek 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function deepseekProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "deepseek",
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com",
		auth: { apiKey: envApiKeyAuth("DeepSeek API key", ["DEEPSEEK_API_KEY"]) },
		models: Object.values(DEEPSEEK_MODELS),
		api: openAICompletionsApi(),
	});
}
