/**
 * Built-in NVIDIA provider factory.
 *
 * NVIDIA 内建 Provider 工厂。挂静态目录与 openai-completions；每次调用新造实例。
 */

import { openAICompletionsApi } from "../api/openai-completions.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { NVIDIA_MODELS } from "./nvidia.models.ts";

/**
 * Construct the built-in NVIDIA provider.
 *
 * 构造 NVIDIA 内建 Provider。鉴权走环境 apiKey；流交给 openai-completions。
 */
export function nvidiaProvider(): Provider<"openai-completions"> {
	return createProvider({
		id: "nvidia",
		name: "NVIDIA",
		baseUrl: "https://integrate.api.nvidia.com/v1",
		auth: { apiKey: envApiKeyAuth("NVIDIA API key", ["NVIDIA_API_KEY"]) },
		models: Object.values(NVIDIA_MODELS),
		api: openAICompletionsApi(),
	});
}
