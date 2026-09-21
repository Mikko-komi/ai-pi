/**
 * Chord service contract for model catalog, selection, and thinking level.
 *
 * 展示侧模型合同。catalog/configuration/refresh 走复制态；选模型必须用 catalog 里的 ref。
 */

import { type Context, defineService, type ReplicatedState } from "@earendil-works/chord";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

/**
 * Provider plus model id, without catalog metadata.
 *
 * 模型引用。只有 provider/modelId，不是完整 Model。
 */
export interface ModelRef {
	provider: string;
	modelId: string;
}

/**
 * Catalog entry shown to presentations.
 *
 * 目录条目。在 ModelRef 上加 name/reasoning。
 */
export interface ModelSummary extends ModelRef {
	name: string;
	reasoning: boolean;
}

/**
 * Replicated models snapshot: catalog, current selection, and refresh status.
 *
 * 复制的模型状态。catalog.revision 单调增；只有 warning 才带 errors。
 */
export interface ModelsState {
	catalog: {
		revision: number;
		availableModels: ModelSummary[];
	};
	configuration: {
		model: ModelRef | null;
		thinkingLevel: ThinkingLevel;
	};
	refresh: { status: "idle" | "refreshing" | "done" } | { status: "warning"; errors: Record<string, string> };
}

/**
 * Presentation models service: read state and change selection or thinking.
 *
 * 展示侧模型服务。select 必须能在 runtime 里解析到模型，否则抛。
 */
export interface Models {
	readonly state: ReplicatedState<ModelsState>;
	cycleThinking(context: Context): Promise<void>;
	getThinkingLevels(context: Context): Promise<ThinkingLevel[]>;
	refresh(context: Context): Promise<void>;
	select(model: ModelRef, context: Context): Promise<void>;
	selectThinking(level: ThinkingLevel, context: Context): Promise<void>;
}

/**
 * Chord service token for Models.
 *
 * 服务令牌。id 固定 `pi.models`。
 */
export const Models = defineService<Models>("pi.models");
