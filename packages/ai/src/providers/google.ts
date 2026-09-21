/**
 * Built-in Google Gemini provider factory.
 *
 * Google Gemini 内建 Provider 工厂。挂静态目录与 google-generative-ai；每次调用新造实例。
 */

import { googleGenerativeAIApi } from "../api/google-generative-ai.lazy.ts";
import { envApiKeyAuth } from "../auth/helpers.ts";
import { createProvider, type Provider } from "../models.ts";
import { GOOGLE_MODELS } from "./google.models.ts";

/**
 * Construct the built-in Google Gemini provider.
 *
 * 构造 Google Gemini 内建 Provider。鉴权走环境 apiKey；流交给 google-generative-ai。
 */
export function googleProvider(): Provider<"google-generative-ai"> {
	return createProvider({
		id: "google",
		name: "Google",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta",
		auth: { apiKey: envApiKeyAuth("Gemini API key", ["GEMINI_API_KEY"]) },
		models: Object.values(GOOGLE_MODELS),
		api: googleGenerativeAIApi(),
	});
}
