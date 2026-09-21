/**
 * Lazy registration of built-in image generation APIs.
 *
 * 内建图像 API 的惰性注册。import 本文件即登记；实现按需动态加载。
 */

import type { generateImages as generateImagesOpenRouterFunction } from "../../api/openrouter-images.ts";
import { registerImagesApiProvider } from "../../images-api-registry.ts";
import type { AssistantImages, ImagesContext, ImagesFunction, ImagesModel, ImagesOptions } from "../../types.ts";

interface OpenRouterImagesProviderModule {
	generateImages: typeof generateImagesOpenRouterFunction;
}

let openRouterImagesProviderModulePromise: Promise<OpenRouterImagesProviderModule> | undefined;

function createLazyLoadErrorImages(model: ImagesModel<"openrouter-images">, error: unknown): AssistantImages {
	return {
		api: model.api,
		provider: model.provider,
		model: model.id,
		output: [],
		stopReason: "error",
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp: Date.now(),
	};
}

function loadOpenRouterImagesProviderModule(): Promise<OpenRouterImagesProviderModule> {
	openRouterImagesProviderModulePromise ||= import("../../api/openrouter-images.ts").then(
		(module) => module as OpenRouterImagesProviderModule,
	);
	return openRouterImagesProviderModulePromise;
}

/**
 * Lazy OpenRouter image generation entry used by the compat registry.
 *
 * OpenRouter 图像生成的惰性入口。加载失败收成 error 图，不抛到调用方。
 */
export const generateImagesOpenRouter: ImagesFunction<"openrouter-images", ImagesOptions> = async (
	model: ImagesModel<"openrouter-images">,
	context: ImagesContext,
	options?: ImagesOptions,
) => {
	try {
		const module = await loadOpenRouterImagesProviderModule();
		return await module.generateImages(model, context, options);
	} catch (error) {
		return createLazyLoadErrorImages(model, error);
	}
};

/**
 * Register built-in image APIs. Called once on module load.
 *
 * 登记内建图像 API。模块加载时已调用一次。
 */
export function registerBuiltInImagesApiProviders(): void {
	registerImagesApiProvider({
		api: "openrouter-images",
		generateImages: generateImagesOpenRouter,
	});
}

registerBuiltInImagesApiProviders();
