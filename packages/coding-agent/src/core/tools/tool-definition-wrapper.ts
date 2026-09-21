/**
 * Convert ToolDefinition to AgentTool and back.
 *
 * ToolDefinition 和 AgentTool 的互转。定义优先；纯 AgentTool 补成最小定义。
 */

import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { ExtensionContext, ToolDefinition } from "../extensions/types.ts";

/**
 * Wrap a ToolDefinition into an AgentTool for the core runtime.
 *
 * 单条定义收成 AgentTool。execute 缺 ctx 时用 ctxFactory。
 */
export function wrapToolDefinition<TDetails = unknown>(
	definition: ToolDefinition<any, TDetails>,
	ctxFactory?: () => ExtensionContext,
): AgentTool<any, TDetails> {
	return {
		name: definition.name,
		label: definition.label,
		description: definition.description,
		parameters: definition.parameters,
		constrainedSampling: definition.constrainedSampling,
		prepareArguments: definition.prepareArguments,
		executionMode: definition.executionMode,
		execute: (toolCallId, params, signal, onUpdate, ctx?: ExtensionContext) =>
			definition.execute(toolCallId, params, signal, onUpdate, ctx ?? (ctxFactory?.() as ExtensionContext)),
	};
}

/**
 * Wrap multiple ToolDefinitions into AgentTools for the core runtime.
 *
 * 批量包装。每条各自走 wrapToolDefinition。
 */
export function wrapToolDefinitions(
	definitions: ToolDefinition<any, any>[],
	ctxFactory?: () => ExtensionContext,
): AgentTool<any>[] {
	return definitions.map((definition) => wrapToolDefinition(definition, ctxFactory));
}

/**
 * Synthesize a minimal ToolDefinition from an AgentTool.
 *
 * This keeps AgentSession's internal registry definition-first even when a caller
 * provides plain AgentTool overrides that do not include prompt metadata or renderers.
 *
 * 从 AgentTool 补最小定义。没有 prompt / 渲染元数据。
 */
export function createToolDefinitionFromAgentTool(tool: AgentTool<any>): ToolDefinition<any, unknown> {
	return {
		name: tool.name,
		label: tool.label,
		description: tool.description,
		parameters: tool.parameters as any,
		constrainedSampling: tool.constrainedSampling,
		prepareArguments: tool.prepareArguments,
		executionMode: tool.executionMode,
		execute: async (toolCallId, params, signal, onUpdate) => tool.execute(toolCallId, params, signal, onUpdate),
	};
}
