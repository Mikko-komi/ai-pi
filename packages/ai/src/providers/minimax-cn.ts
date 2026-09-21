/**
 * Built-in MiniMax CN provider factory.
 *
 * MiniMax 国内站内建 Provider 工厂。挂静态目录与 anthropic-messages；每次调用新造实例。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { MINIMAX_CN_MODELS } from "./minimax-cn.models.ts";

/**
 * Construct the built-in MiniMax CN provider.
 *
 * 构造 MiniMax 国内站 Provider。鉴权走独立环境 key；流交给 anthropic-messages。
 */
export function minimaxCnProvider(): Provider<"anthropic-messages"> {
	return createProvider({
		id: "minimax-cn",
		name: "MiniMax CN",
		baseUrl: "https://api.minimaxi.com/anthropic",
		auth: { apiKey: envApiKeyAuth("MiniMax CN API key", ["MINIMAX_CN_API_KEY"]) },
		models: Object.values(MINIMAX_CN_MODELS),
		api: anthropicMessagesApi(),
	});
}
