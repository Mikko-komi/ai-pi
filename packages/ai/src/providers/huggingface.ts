/**
 * Built-in Hugging Face provider factory.
 *
 * Hugging Face 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { HUGGINGFACE_MODELS } from "./huggingface.models.ts";

/**
 * Construct the built-in Hugging Face provider.
 *
 * 构造 Hugging Face 内建 Provider。鉴权走环境 token；流交给 openai-completions。
 */
export function huggingfaceProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "huggingface",
		name: "Hugging Face",
		baseUrl: "https://router.huggingface.co/v1",
		auth: { apiKey: envApiKeyAuth("Hugging Face token", ["HF_TOKEN"]) },
		models: Object.values(HUGGINGFACE_MODELS),
		api: openAICompletionsApi(),
	});
}
