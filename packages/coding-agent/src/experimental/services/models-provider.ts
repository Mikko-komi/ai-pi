/**
 * Worker-side Models service implementation and Chord facet.
 *
 * worker 侧模型服务。用 lane + ModelRuntime 灌复制态；facet 在 activate 时才写首份 catalog。
 */

import { type Context, defineFacet, type Facet, type MutableReplicatedState } from "@earendil-works/chord";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { AgentLane, ThinkingLevel } from "@earendil-works/pi-agent-core";
import { getSupportedThinkingLevels } from "@earendil-works/pi-ai";
import type { ModelRuntime } from "../../core/model-runtime.ts";
import type { SettingsManager } from "../../core/settings-manager.ts";
import { Models, type Models as ModelsService, type ModelsState } from "./models.ts";

/**
 * Models service plus the activate hook that seeds replicated state.
 *
 * 服务实例加 activate。activate 才写首份 catalog/configuration。
 */
export interface ModelsServiceRuntime {
	readonly service: ModelsService;
	activate(context: Context): Promise<void>;
}

/**
 * Implement Models against one AgentLane and optional ModelRuntime.
 *
 * 用 lane + ModelRuntime 实现 Models。未知模型 select 抛错；没有 runtime 时 refresh 仍更新本地 catalog。
 */
export function createModelsService(
	lane: AgentLane,
	modelRuntime: ModelRuntime | undefined,
	settingsManager: SettingsManager | undefined,
	createState: (initial: ModelsState) => MutableReplicatedState<ModelsState>,
): ModelsServiceRuntime {
	let catalogRevision = 0;
	const state = createState({
		catalog: { revision: 0, availableModels: [] },
		configuration: { model: null, thinkingLevel: "off" },
		refresh: { status: "idle" },
	});
	const readConfiguration = async (context: Context): Promise<ModelsState["configuration"]> => {
		const [selected, thinkingLevel] = await Promise.all([lane.getModel(context), lane.getThinkingLevel(context)]);
		return {
			model: selected === undefined ? null : { provider: selected.provider, modelId: selected.id },
			thinkingLevel,
		};
	};
	const readThinkingLevels = async (context: Context): Promise<ThinkingLevel[]> => {
		const selected = await lane.getModel(context);
		return selected === undefined ? ["off"] : getSupportedThinkingLevels(selected);
	};
	const readCatalog = async (context: Context): Promise<ModelsState["catalog"]> => {
		const selected = await lane.getModel(context);
		const available = modelRuntime?.getAvailableSnapshot() ?? [];
		const catalog =
			selected === undefined || includesModel(available, selected) ? available : [...available, selected];
		catalogRevision += 1;
		return {
			revision: catalogRevision,
			availableModels: catalog.map((model) => ({
				provider: model.provider,
				modelId: model.id,
				name: model.name,
				reasoning: model.reasoning,
			})),
		};
	};
	const service: ModelsService = {
		state,
		async cycleThinking(context) {
			const levels = await readThinkingLevels(context);
			const current = await lane.getThinkingLevel(context);
			const index = levels.indexOf(current);
			const next = levels[(index + 1) % levels.length] ?? "off";
			await lane.setThinkingLevel(next, context);
			state.state.configuration = await readConfiguration(context);
			state.publish(context);
		},
		async getThinkingLevels(context) {
			return [...(await readThinkingLevels(context))];
		},
		async refresh(context) {
			state.state.refresh = { status: "refreshing" };
			state.publish(context);
			const refresh = modelRuntime?.refresh({ signal: context.abortSignal });
			if (refresh === undefined) {
				const [catalog, configuration] = await Promise.all([readCatalog(context), readConfiguration(context)]);
				state.state.catalog = catalog;
				state.state.configuration = configuration;
				state.state.refresh = { status: "done" };
				state.publish(context);
				return;
			}
			const result = await refresh;
			const errors = Object.fromEntries([...result.errors].map(([id, error]) => [id, error.message]));
			const [catalog, configuration] = await Promise.all([readCatalog(context), readConfiguration(context)]);
			state.state.catalog = catalog;
			state.state.configuration = configuration;
			state.state.refresh = Object.keys(errors).length === 0 ? { status: "done" } : { status: "warning", errors };
			state.publish(context);
		},
		async select(model, context) {
			const selected = modelRuntime?.getModel(model.provider, model.modelId);
			if (selected === undefined) throw new Error(`Unknown model: ${model.provider}/${model.modelId}`);
			await lane.setModel({ provider: selected.provider, modelId: selected.id }, context);
			settingsManager?.setDefaultModelAndProvider(selected.provider, selected.id);
			await settingsManager?.flush();
			state.state.configuration = await readConfiguration(context);
			state.publish(context);
		},
		async selectThinking(level, context) {
			const levels = await readThinkingLevels(context);
			if (!levels.includes(level)) {
				throw new Error(`Thinking level ${level} is unavailable; choose one of: ${levels.join(", ")}`);
			}
			await lane.setThinkingLevel(level, context);
			state.state.configuration = await readConfiguration(context);
			state.publish(context);
		},
	};
	return {
		service,
		async activate(context) {
			const [catalog, configuration] = await Promise.all([readCatalog(context), readConfiguration(context)]);
			state.state.catalog = catalog;
			state.state.configuration = configuration;
			state.state.refresh = { status: "idle" };
			state.publish(context);
		},
	};
}

/**
 * Provide Models from a Session worker facet host.
 *
 * 把 Models 挂到 facet host。activate 时才灌 state。
 */
export function createModelsServiceFacet(options: {
	readonly lane: AgentLane;
	readonly modelRuntime: ModelRuntime | undefined;
	readonly settingsManager?: SettingsManager;
}): Facet {
	return defineFacet({
		id: "@pi/models",
		setup(env) {
			const runtime = createModelsService(
				options.lane,
				options.modelRuntime,
				options.settingsManager,
				env.replicatedState,
			);
			env.provide(Models, runtime.service);
			env.onActivate(() => runtime.activate(BACKGROUND_CONTEXT));
		},
	});
}

function includesModel(
	models: readonly { readonly provider: string; readonly id: string }[],
	selected: { readonly provider: string; readonly id: string },
): boolean {
	return models.some((model) => model.provider === selected.provider && model.id === selected.id);
}
