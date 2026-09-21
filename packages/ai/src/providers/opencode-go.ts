/**
 * Built-in OpenCode Go provider factory.
 *
 * OpenCode Go 内建 Provider 工厂。三套 API 共用环境 key；每条流先打上会话路由头。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { openAIResponsesApi } from "../api/openai-responses.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { OPENCODE_GO_MODELS } from "./opencode-go.models.ts";
import { withOpenCodeSessionHeader } from "./opencode-headers.ts";

/**
 * Construct the built-in OpenCode Go provider.
 *
 * 构造 OpenCode Go Provider。与 Zen 共用 OPENCODE_API_KEY；无 google-generative-ai。
 */
export function opencodeGoProvider(): Provider<"anthropic-messages" | "openai-completions" | "openai-responses"> {
	return createProvider<"anthropic-messages" | "openai-completions" | "openai-responses">({
		id: "opencode-go",
		name: "OpenCode Go",
		auth: { apiKey: envApiKeyAuth("OpenCode API key", ["OPENCODE_API_KEY"]) },
		models: Object.values(OPENCODE_GO_MODELS),
		api: {
			"anthropic-messages": withOpenCodeSessionHeader(anthropicMessagesApi()),
			"openai-completions": withOpenCodeSessionHeader(openAICompletionsApi()),
			"openai-responses": withOpenCodeSessionHeader(openAIResponsesApi()),
		},
	});
}
