/**
 * Typed reads of the generated static image-model catalog.
 *
 * 生成目录的类型化读取。只覆盖内建静态图像模型。
 */

import { IMAGE_MODELS } from "./image-models.generated.ts";
import type { ImagesApi, ImagesModel, KnownImagesProvider } from "./types.ts";

const imageModelRegistry: Map<string, Map<string, ImagesModel<ImagesApi>>> = new Map();

for (const [provider, models] of Object.entries(IMAGE_MODELS)) {
	const providerModels = new Map<string, ImagesModel<ImagesApi>>();
	for (const [id, model] of Object.entries(models)) {
		providerModels.set(id, model as ImagesModel<ImagesApi>);
	}
	imageModelRegistry.set(provider, providerModels);
}

type ImageModelApi<
	TProvider extends KnownImagesProvider,
	TModelId extends keyof (typeof IMAGE_MODELS)[TProvider],
> = (typeof IMAGE_MODELS)[TProvider][TModelId] extends { api: infer TApi }
	? TApi extends ImagesApi
		? TApi
		: never
	: never;

/**
 * Typed lookup of one generated image model.
 *
 * 按 provider + id 取生成目录里的图像模型。
 */
export function getImageModel<
	TProvider extends KnownImagesProvider,
	TModelId extends keyof (typeof IMAGE_MODELS)[TProvider],
>(provider: TProvider, modelId: TModelId): ImagesModel<ImageModelApi<TProvider, TModelId>> {
	const providerModels = imageModelRegistry.get(provider);
	return providerModels?.get(modelId as string) as ImagesModel<ImageModelApi<TProvider, TModelId>>;
}

/**
 * Provider ids present in the generated image catalog.
 *
 * 生成图像目录里出现过的 provider id。
 */
export function getImageProviders(): KnownImagesProvider[] {
	return Array.from(imageModelRegistry.keys()) as KnownImagesProvider[];
}

/**
 * All generated image models for one provider.
 *
 * 某个 provider 在生成目录里的全部图像模型。
 */
export function getImageModels<TProvider extends KnownImagesProvider>(
	provider: TProvider,
): ImagesModel<ImageModelApi<TProvider, keyof (typeof IMAGE_MODELS)[TProvider]>>[] {
	const models = imageModelRegistry.get(provider);
	return models
		? (Array.from(models.values()) as ImagesModel<ImageModelApi<TProvider, keyof (typeof IMAGE_MODELS)[TProvider]>>[])
		: [];
}
