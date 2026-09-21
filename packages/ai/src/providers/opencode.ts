/**
 * Built-in OpenCode Zen provider factory.
 *
 * OpenCode Zen 内建 Provider 工厂。四套 API 共用环境 key；每条流先打上会话路由头。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { googleGenerativeAIApi } from "../api/google-generative-ai.lazy.ts";
import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { openAIResponsesApi } from "../api/openai-responses.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENCODE_MODELS } from "./opencode.models.ts";
import { withOpenCodeSessionHeader } from "./opencode-headers.ts";

/**
 * Construct the built-in OpenCode Zen provider.
 *
 * 构造 OpenCode Zen Provider。鉴权走环境 apiKey；sessionId 写入 x-opencode-session。
 */
export function opencodeProvider(): Provider<
	"anthropic-messages" | "google-generative-ai" | "openai-completions" | "openai-responses"
> {
	return createProvider({
		id: "opencode",
		name: "OpenCode Zen",
		auth: { apiKey: envApiKeyAuth("OpenCode API key", ["OPENCODE_API_KEY"]) },
		models: Object.values(OPENCODE_MODELS),
		api: {
			"anthropic-messages": withOpenCodeSessionHeader(anthropicMessagesApi()),
			"google-generative-ai": withOpenCodeSessionHeader(googleGenerativeAIApi()),
			"openai-completions": withOpenCodeSessionHeader(openAICompletionsApi()),
			"openai-responses": withOpenCodeSessionHeader(openAIResponsesApi()),
		},
	});
}
