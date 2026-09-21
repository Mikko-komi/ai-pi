/**
 * Built-in Xiaomi Token Plan AMS provider factory.
 *
 * 小米 Token Plan 阿姆斯特丹内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { XIAOMI_TOKEN_PLAN_AMS_MODELS } from "./xiaomi-token-plan-ams.models.ts";

/**
 * Construct the built-in Xiaomi Token Plan AMS provider.
 *
 * 构造小米 Token Plan 阿姆斯特丹 Provider。鉴权走独立环境 key；流交给 openai-completions。
 */
export function xiaomiTokenPlanAmsProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "xiaomi-token-plan-ams",
		name: "Xiaomi Token Plan AMS",
		baseUrl: "https://token-plan-ams.xiaomimimo.com/v1",
		auth: { apiKey: envApiKeyAuth("Xiaomi Token Plan AMS API key", ["XIAOMI_TOKEN_PLAN_AMS_API_KEY"]) },
		models: Object.values(XIAOMI_TOKEN_PLAN_AMS_MODELS),
		api: openAICompletionsApi(),
	});
}
