/**
 * Built-in MiniMax (global) provider factory.
 *
 * MiniMax 国际站内建 Provider 工厂。挂静态目录与 anthropic-messages；每次调用新造实例。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { MINIMAX_MODELS } from "./minimax.models.ts";

/**
 * Construct the built-in MiniMax global provider.
 *
 * 构造 MiniMax 国际站 Provider。鉴权走环境 apiKey；流交给 anthropic-messages。
 */
export function minimaxProvider(): Provider<"anthropic-messages"> {
	return createProvider({
		id: "minimax",
		name: "MiniMax",
		baseUrl: "https://api.minimax.io/anthropic",
		auth: { apiKey: envApiKeyAuth("MiniMax API key", ["MINIMAX_API_KEY"]) },
		models: Object.values(MINIMAX_MODELS),
		api: anthropicMessagesApi(),
	});
}
