/**
 * Built-in Moonshot AI CN provider factory.
 *
 * Moonshot AI 国内站内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { MOONSHOTAI_CN_MODELS } from "./moonshotai-cn.models.ts";

/**
 * Construct the built-in Moonshot AI CN provider.
 *
 * 构造 Moonshot AI 国内站 Provider。鉴权走同一环境 key；endpoint 指向 api.moonshot.cn。
 */
export function moonshotaiCnProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "moonshotai-cn",
		name: "Moonshot AI CN",
		baseUrl: "https://api.moonshot.cn/v1",
		auth: { apiKey: envApiKeyAuth("Moonshot AI API key", ["MOONSHOT_API_KEY"]) },
		models: Object.values(MOONSHOTAI_CN_MODELS),
		api: openAICompletionsApi(),
	});
}
