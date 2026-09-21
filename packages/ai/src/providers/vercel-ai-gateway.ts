/**
 * Built-in Vercel AI Gateway provider factory.
 *
 * Vercel AI Gateway 内建 Provider 工厂。挂静态目录与 anthropic-messages；每次调用新造实例。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { VERCEL_AI_GATEWAY_MODELS } from "./vercel-ai-gateway.models.ts";

/**
 * Construct the built-in Vercel AI Gateway provider.
 *
 * 构造 Vercel AI Gateway Provider。鉴权走环境 apiKey；流交给 anthropic-messages。
 */
export function vercelAIGatewayProvider(): Provider<"anthropic-messages"> {
	return createProvider({
		id: "vercel-ai-gateway",
		name: "Vercel AI Gateway",
		baseUrl: "https://ai-gateway.vercel.sh",
		auth: { apiKey: envApiKeyAuth("Vercel AI Gateway API key", ["AI_GATEWAY_API_KEY"]) },
		models: Object.values(VERCEL_AI_GATEWAY_MODELS),
		api: anthropicMessagesApi(),
	});
}
