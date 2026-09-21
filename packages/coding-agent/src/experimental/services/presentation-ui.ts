/**
 * Process-local UI capabilities for presentation facets.
 *
 * 展示 facet 用的进程本地 UI。不跨进程；select 取消返回 undefined。
 */

import { type Context, defineService } from "@earendil-works/chord";

/**
 * One selectable row for PresentationUI.select.
 *
 * 选择列表一项。value 是提交值，label 给人看。
 */
export interface PresentationSelectItem {
	readonly value: string;
	readonly label: string;
	readonly description?: string;
}

/**
 * Narrow process-local UI capabilities available to presentation facets.
 *
 * 进程本地 UI 能力。local 服务，不走远端；showStatus 无返回。
 */
export interface PresentationUI {
	select(
		title: string,
		items: readonly PresentationSelectItem[],
		selectedValue: string | undefined,
		context: Context,
	): Promise<string | undefined>;
	showStatus(message: string, context: Context): void;
}

/**
 * Chord service token for PresentationUI.
 *
 * 本地服务令牌。id 固定 `pi.local.presentation-ui`。
 */
export const PresentationUI = defineService<PresentationUI>("pi.local.presentation-ui", { local: true });
