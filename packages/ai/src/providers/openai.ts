/**
 * Built-in OpenAI provider factory.
 *
 * OpenAI 内建 Provider 工厂。挂静态目录与 openai-responses；每次调用新造实例。
 */

import { openAIResponsesApi } from "../api/openai-responses.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENAI_MODELS } from "./openai.models.ts";

/**
 * Construct the built-in OpenAI provider.
 *
 * 构造 OpenAI 内建 Provider。鉴权走环境 apiKey；流交给 openai-responses。
 */
export function openaiProvider(): Provider<"openai-responses"> {
	return createProvider({
		id: "openai",
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		auth: { apiKey: envApiKeyAuth("OpenAI API key", ["OPENAI_API_KEY"]) },
		models: Object.values(OPENAI_MODELS),
		api: openAIResponsesApi(),
	});
}
