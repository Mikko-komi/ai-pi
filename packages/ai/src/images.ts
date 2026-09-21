/**
 * Dispatch image generation through the registered Images API provider.
 *
 * 按 `model.api` 分发图像生成。未注册的 api 抛错。
 */

import "./providers/images/register-builtins.ts";

import { getImagesApiProvider } from "./images-api-registry.ts";
import type { AssistantImages, ImagesApi, ImagesContext, ImagesModel, ProviderImagesOptions } from "./types.ts";

function resolveImagesApiProvider(api: ImagesApi) {
	const provider = getImagesApiProvider(api);
	if (!provider) {
		throw new Error(`No API provider registered for api: ${api}`);
	}
	return provider;
}

/**
 * Generate images via the registered API implementation for `model.api`.
 *
 * 按 `model.api` 找实现并生成。没有注册则抛。
 */
export async function generateImages<TApi extends ImagesApi>(
	model: ImagesModel<TApi>,
	context: ImagesContext,
	options?: ProviderImagesOptions,
): Promise<AssistantImages> {
	const provider = resolveImagesApiProvider(model.api);
	return provider.generateImages(model, context, options);
}
