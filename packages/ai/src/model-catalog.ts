/**
 * Flatten grouped static model tables into a typed catalog.
 *
 * 把按 API 分组的静态表摊平成分类型目录。给生成目录用。
 */

import type { Api, Model, ProviderId } from "./types.ts";

/**
 * Nested catalog tables: API group → model id → model fields.
 *
 * 嵌套目录表：API 组 → 模型 id → 字段。
 */
export type ModelGroups = Record<string, Record<string, object>>;

type ModelId<TGroups extends ModelGroups> = {
	[TApi in keyof TGroups]: keyof TGroups[TApi];
}[keyof TGroups] &
	string;

type ModelApi<TGroups extends ModelGroups, TModelId extends ModelId<TGroups>> = {
	[TApi in keyof TGroups]: TModelId extends keyof TGroups[TApi] ? TApi : never;
}[keyof TGroups] &
	Api;

/**
 * Flattened catalog: model id → Model tagged with provider and API.
 *
 * 摊平后的目录。每个 id 带上 provider 与对应 API。
 */
export type ModelCatalog<TGroups extends ModelGroups, TProvider extends ProviderId> = {
	[TModelId in ModelId<TGroups>]: Model<ModelApi<TGroups, TModelId>> & {
		id: TModelId;
		provider: TProvider;
	};
};

/**
 * Merge API groups into one catalog. Later groups overwrite same ids.
 *
 * 合并 API 组。同 id 后者覆盖；`_provider` 只用于类型。
 */
export function flattenModelCatalog<const TProvider extends ProviderId, const TGroups extends ModelGroups>(
	_provider: TProvider,
	groups: TGroups,
): ModelCatalog<TGroups, TProvider> {
	return Object.assign({}, ...Object.values(groups)) as ModelCatalog<TGroups, TProvider>;
}
