/**
 * Built-in Azure OpenAI Responses provider factory.
 *
 * Azure OpenAI Responses 内建 Provider 工厂。无默认 baseUrl，由目录条目自带。
 */

import { azureOpenAIResponsesApi } from "../api/azure-openai-responses.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { AZURE_OPENAI_RESPONSES_MODELS } from "./azure-openai-responses.models.ts";

/**
 * Construct the built-in Azure OpenAI Responses provider.
 *
 * 构造 Azure OpenAI Responses Provider。鉴权走环境 apiKey；endpoint 在模型条目上。
 */
export function azureOpenAIResponsesProvider(): Provider<"azure-openai-responses"> {
	return createProvider({
		id: "azure-openai-responses",
		name: "Azure OpenAI",
		auth: { apiKey: envApiKeyAuth("Azure OpenAI API key", ["AZURE_OPENAI_API_KEY"]) },
		models: Object.values(AZURE_OPENAI_RESPONSES_MODELS),
		api: azureOpenAIResponsesApi(),
	});
}
