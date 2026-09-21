/**
 * Built-in Moonshot AI (global) provider factory.
 *
 * Moonshot AI 国际站内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { MOONSHOTAI_MODELS } from "./moonshotai.models.ts";

/**
 * Construct the built-in Moonshot AI global provider.
 *
 * 构造 Moonshot AI 国际站 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function moonshotaiProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "moonshotai",
		name: "Moonshot AI",
		baseUrl: "https://api.moonshot.ai/v1",
		auth: { apiKey: envApiKeyAuth("Moonshot AI API key", ["MOONSHOT_API_KEY"]) },
		models: Object.values(MOONSHOTAI_MODELS),
		api: openAICompletionsApi(),
	});
}
