/**
 * Lazy loader for the OpenRouter image-generation provider.
 *
 * 第一次 generateImages 才 import 实现。不走 lazyApi，因为这是图像合同。
 */

import type { ImagesModel, ProviderImages } from "../types.ts";

/**
 * ProviderImages factory that loads openrouter-images on first generate.
 *
 * 动态 import 后把 model 收成 openrouter-images。
 */
export const openrouterImagesApi = (): ProviderImages => ({
	generateImages: async (model, context, options) =>
		(await import("./openrouter-images.ts")).generateImages(
			model as ImagesModel<"openrouter-images">,
			context,
			options,
		),
});
