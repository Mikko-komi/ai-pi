/**
 * Built-in Fireworks provider factory.
 *
 * Fireworks 内建 Provider 工厂。同一 apiKey 下挂 anthropic-messages 与 openai-completions。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { FIREWORKS_MODELS } from "./fireworks.models.ts";

/**
 * Construct the built-in Fireworks provider.
 *
 * 构造 Fireworks 内建 Provider。鉴权走环境 apiKey；按模型 api 分发到两套流。
 */
export function fireworksProvider(): Provider<"anthropic-messages" | "openai-completions"> {
	return createProvider({
		id: "fireworks",
		name: "Fireworks",
		baseUrl: "https://api.fireworks.ai/inference",
		auth: { apiKey: envApiKeyAuth("Fireworks API key", ["FIREWORKS_API_KEY"]) },
		models: Object.values(FIREWORKS_MODELS),
		api: {
			"anthropic-messages": anthropicMessagesApi(),
			"openai-completions": openAICompletionsApi(),
		},
	});
}
