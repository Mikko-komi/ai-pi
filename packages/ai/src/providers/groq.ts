/**
 * Built-in Groq provider factory.
 *
 * Groq 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { GROQ_MODELS } from "./groq.models.ts";

/**
 * Construct the built-in Groq provider.
 *
 * 构造 Groq 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function groqProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "groq",
		name: "Groq",
		baseUrl: "https://api.groq.com/openai/v1",
		auth: { apiKey: envApiKeyAuth("Groq API key", ["GROQ_API_KEY"]) },
		models: Object.values(GROQ_MODELS),
		api: openAICompletionsApi(),
	});
}
