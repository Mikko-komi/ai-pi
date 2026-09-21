/**
 * Built-in OpenRouter image provider factory.
 *
 * OpenRouter 图像 Provider 工厂。鉴权与聊天 OpenRouter 共用；走 openrouter-images API。
 */

import { openrouterImagesApi } from "../api/openrouter-images.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadOpenRouterOAuth } from "../auth/oauth/load.ts";
import { IMAGE_MODELS } from "../image-models.generated.ts";
import { createImagesProvider, type ImagesProvider } from "../images-models.ts";

/**
 * Construct the built-in OpenRouter image provider.
 *
 * 构造 OpenRouter 图像 Provider。apiKey 与 OAuth 并列；目录来自生成图像表。
 */
export function openrouterImagesProvider(): ImagesProvider {
	return createImagesProvider({
		id: "openrouter",
		name: "OpenRouter",
		auth: {
			apiKey: envApiKeyAuth("OpenRouter API key", ["OPENROUTER_API_KEY"]),
			oauth: lazyOAuth({
				name: "OpenRouter OAuth",
				loginLabel: "Sign in with OpenRouter",
				load: loadOpenRouterOAuth,
			}),
		},
		models: Object.values(IMAGE_MODELS.openrouter),
		api: openrouterImagesApi(),
	});
}
