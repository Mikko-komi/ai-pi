/**
 * Built-in Cerebras provider factory.
 *
 * Cerebras 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { CEREBRAS_MODELS } from "./cerebras.models.ts";

/**
 * Construct the built-in Cerebras provider.
 *
 * 构造 Cerebras 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function cerebrasProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "cerebras",
		name: "Cerebras",
		baseUrl: "https://api.cerebras.ai/v1",
		auth: { apiKey: envApiKeyAuth("Cerebras API key", ["CEREBRAS_API_KEY"]) },
		models: Object.values(CEREBRAS_MODELS),
		api: openAICompletionsApi(),
	});
}
