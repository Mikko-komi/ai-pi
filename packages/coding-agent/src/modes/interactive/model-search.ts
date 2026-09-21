/**
 * Model fields used by interactive fuzzy search.
 *
 * 交互选择器模糊搜索用的模型字段。`name` 只作附加词，不参与 id 前缀排序。
 */

/**
 * One searchable model row.
 *
 * 一行可搜模型。至少要有 id 和 provider。
 */
export interface ModelSearchItem {
	id: string;
	provider: string;
	name?: string;
}

/**
 * Haystack for general model search, including a leading bare model id.
 *
 * 通用搜索文本。裸 id 放最前，方便精确 id 查询排到前面。
 */
export function getModelSearchText(item: ModelSearchItem): string {
	const { id, provider } = item;
	const name = item.name ? ` ${item.name}` : "";
	return `${id} ${provider} ${provider}/${id} ${provider} ${id}${name}`;
}

/**
 * The /model selector search should rank exact provider-prefixed queries before proxy-provider IDs
 * like openrouter/openai/gpt-5, so keep the bare model ID out of the leading position.
 *
 * `/model` 选择器的搜索文本。裸 id 不放最前，避免代理商路径压过 `provider/id`。
 */
export function getModelSelectorSearchText(item: ModelSearchItem): string {
	const { id, provider } = item;
	const name = item.name ? ` ${item.name}` : "";
	return `${provider} ${provider}/${id} ${provider} ${id}${name}`;
}
