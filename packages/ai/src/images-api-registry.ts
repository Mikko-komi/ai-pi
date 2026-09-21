/**
 * Registry of image-generation API implementations keyed by `ImagesApi`.
 *
 * 按 `ImagesApi` 注册图像生成实现。后注册覆盖同 api。
 */

import type { AssistantImages, ImagesApi, ImagesContext, ImagesFunction, ImagesModel, ImagesOptions } from "./types.ts";

/**
 * Untyped image-generation function stored in the registry.
 *
 * 注册表里存的无类型生成函数。调用前要核对 `model.api`。
 */
export type ImagesApiFunction = (
	model: ImagesModel<ImagesApi>,
	context: ImagesContext,
	options?: ImagesOptions,
) => Promise<AssistantImages>;

/**
 * Typed image API implementation registered under `api`.
 *
 * 挂在某个 `ImagesApi` 上的类型化实现。
 */
export interface ImagesApiProvider<TApi extends ImagesApi = ImagesApi, TOptions extends ImagesOptions = ImagesOptions> {
	api: TApi;
	generateImages: ImagesFunction<TApi, TOptions>;
}

interface ImagesApiProviderInternal {
	api: ImagesApi;
	generateImages: ImagesApiFunction;
}

type RegisteredImagesApiProvider = {
	provider: ImagesApiProviderInternal;
	sourceId?: string;
};

const imagesApiProviderRegistry = new Map<string, RegisteredImagesApiProvider>();

function wrapGenerateImages<TApi extends ImagesApi, TOptions extends ImagesOptions>(
	api: TApi,
	generateImages: ImagesFunction<TApi, TOptions>,
): ImagesApiFunction {
	return (model, context, options) => {
		if (model.api !== api) {
			throw new Error(`Mismatched api: ${model.api} expected ${api}`);
		}
		return generateImages(model as ImagesModel<TApi>, context, options as TOptions);
	};
}

/**
 * Register or replace the implementation for an image API.
 *
 * 注册或覆盖某个图像 api 的实现。`sourceId` 供卸载追踪。
 */
export function registerImagesApiProvider<TApi extends ImagesApi, TOptions extends ImagesOptions>(
	provider: ImagesApiProvider<TApi, TOptions>,
	sourceId?: string,
): void {
	imagesApiProviderRegistry.set(provider.api, {
		provider: {
			api: provider.api,
			generateImages: wrapGenerateImages(provider.api, provider.generateImages),
		},
		sourceId,
	});
}

/**
 * Look up the registered implementation for an image API.
 *
 * 按 api 取已注册实现。没有则 undefined。
 */
export function getImagesApiProvider(api: ImagesApi): ImagesApiProviderInternal | undefined {
	return imagesApiProviderRegistry.get(api)?.provider;
}
