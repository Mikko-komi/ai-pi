/**
 * Built-in Xiaomi Token Plan CN provider factory.
 *
 * 小米 Token Plan 国内站内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { XIAOMI_TOKEN_PLAN_CN_MODELS } from "./xiaomi-token-plan-cn.models.ts";

/**
 * Construct the built-in Xiaomi Token Plan CN provider.
 *
 * 构造小米 Token Plan 国内站 Provider。鉴权走独立环境 key；流交给 openai-completions。
 */
export function xiaomiTokenPlanCnProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "xiaomi-token-plan-cn",
		name: "Xiaomi Token Plan CN",
		baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
		auth: { apiKey: envApiKeyAuth("Xiaomi Token Plan CN API key", ["XIAOMI_TOKEN_PLAN_CN_API_KEY"]) },
		models: Object.values(XIAOMI_TOKEN_PLAN_CN_MODELS),
		api: openAICompletionsApi(),
	});
}
