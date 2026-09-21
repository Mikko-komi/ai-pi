/**
 * Built-in Ant Ling provider factory.
 *
 * Ant Ling 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { ANT_LING_MODELS } from "./ant-ling.models.ts";

/**
 * Construct the built-in Ant Ling provider.
 *
 * 构造 Ant Ling 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function antLingProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "ant-ling",
		name: "Ant Ling",
		baseUrl: "https://api.ant-ling.com/v1",
		auth: { apiKey: envApiKeyAuth("Ant Ling API key", ["ANT_LING_API_KEY"]) },
		models: Object.values(ANT_LING_MODELS),
		api: openAICompletionsApi(),
	});
}
