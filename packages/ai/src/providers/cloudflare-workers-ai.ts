/**
 * Built-in Cloudflare Workers AI provider factory.
 *
 * Cloudflare Workers AI 内建 Provider 工厂。鉴权要 apiKey+account；流前展开 endpoint 占位符。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { createProvider, type Provider } from "../models.ts";
import { cloudflareWorkersAIAuth } from "./cloudflare-auth.ts";
import { cloudflareStreams } from "./cloudflare-stream.ts";
import { CLOUDFLARE_WORKERS_AI_MODELS } from "./cloudflare-workers-ai.models.ts";

/**
 * Construct the built-in Cloudflare Workers AI provider.
 *
 * 构造 Cloudflare Workers AI Provider。baseUrl 占位符由 resolved env 在派发前替换。
 */
export function cloudflareWorkersAIProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "cloudflare-workers-ai",
		name: "Cloudflare Workers AI",
		auth: { apiKey: cloudflareWorkersAIAuth() },
		models: Object.values(CLOUDFLARE_WORKERS_AI_MODELS),
		api: cloudflareStreams(openAICompletionsApi()),
	});
}
