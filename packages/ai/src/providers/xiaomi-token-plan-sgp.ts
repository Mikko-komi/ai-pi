/**
 * Built-in Xiaomi Token Plan SGP provider factory.
 *
 * 小米 Token Plan 新加坡内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { XIAOMI_TOKEN_PLAN_SGP_MODELS } from "./xiaomi-token-plan-sgp.models.ts";

/**
 * Construct the built-in Xiaomi Token Plan SGP provider.
 *
 * 构造小米 Token Plan 新加坡 Provider。鉴权走独立环境 key；流交给 openai-completions。
 */
export function xiaomiTokenPlanSgpProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "xiaomi-token-plan-sgp",
		name: "Xiaomi Token Plan SGP",
		baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
		auth: { apiKey: envApiKeyAuth("Xiaomi Token Plan SGP API key", ["XIAOMI_TOKEN_PLAN_SGP_API_KEY"]) },
		models: Object.values(XIAOMI_TOKEN_PLAN_SGP_MODELS),
		api: openAICompletionsApi(),
	});
}
