/**
 * Built-in Cloudflare AI Gateway provider factory.
 *
 * Cloudflare AI Gateway 内建 Provider 工厂。三套 API 写死挂上，避免目录缺 completions 时类型收窄。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { openAIResponsesApi } from "../api/openai-responses.lazy.ts";
import { createProvider, type Provider } from "../models.ts";
import { CLOUDFLARE_AI_GATEWAY_MODELS } from "./cloudflare-ai-gateway.models.ts";
import { cloudflareAIGatewayAuth } from "./cloudflare-auth.ts";
import { cloudflareStreams } from "./cloudflare-stream.ts";

type CloudflareAIGatewayApi = "anthropic-messages" | "openai-completions" | "openai-responses";

/**
 * Construct the built-in Cloudflare AI Gateway provider.
 *
 * 构造 Cloudflare AI Gateway Provider。鉴权还要 gateway id；请求头走 cf-aig-authorization。
 */
export function cloudflareAIGatewayProvider(): Provider<CloudflareAIGatewayApi> {
	// The api map is pinned to all three APIs: models.dev's gateway catalog drops and
	// restores `workers-ai/*` (openai-completions) entries over time, and inference from
	// `models` alone would otherwise reject the openai-completions entry whenever the
	// generated catalog happens to contain none.
	return createProvider<CloudflareAIGatewayApi>({
		id: "cloudflare-ai-gateway",
		name: "Cloudflare AI Gateway",
		auth: { apiKey: cloudflareAIGatewayAuth() },
		models: Object.values(CLOUDFLARE_AI_GATEWAY_MODELS),
		api: {
			"anthropic-messages": cloudflareStreams(anthropicMessagesApi()),
			"openai-completions": cloudflareStreams(openAICompletionsApi()),
			"openai-responses": cloudflareStreams(openAIResponsesApi()),
		},
	});
}
