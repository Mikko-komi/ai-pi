/**
 * Split current tools into immediately available and transcript-deferred sets.
 *
 * 按 transcript 里尚未用过的 addedToolNames 把工具拆成立即和延迟。关开关则全部立即。
 */

import type { Context, Tool } from "../types.ts";

type ToolNameNormalizer = (name: string) => string;

const identityToolName: ToolNameNormalizer = (name) => name;

/**
 * Split current tools into prefix and transcript-loaded definitions.
 *
 * 先按规范化名去重。enabled 为假则全部进 immediate。deferred 只收 transcript 里 added 且还没用过的名。
 */
export function splitDeferredTools(
	context: Context,
	enabled: boolean,
	normalizeName: ToolNameNormalizer = identityToolName,
): { immediate: Tool[]; deferred: Map<string, Tool> } {
	const uniqueTools = new Map<string, Tool>();
	for (const tool of context.tools ?? []) uniqueTools.set(normalizeName(tool.name), tool);
	if (!enabled) return { immediate: [...uniqueTools.values()], deferred: new Map() };

	const deferredNames = new Set<string>();
	const usedNames = new Set<string>();
	for (const message of context.messages) {
		if (message.role === "assistant") {
			for (const block of message.content) {
				if (block.type === "toolCall") usedNames.add(normalizeName(block.name));
			}
		} else if (message.role === "toolResult") {
			for (const name of message.addedToolNames ?? []) {
				const normalizedName = normalizeName(name);
				if (!usedNames.has(normalizedName)) deferredNames.add(normalizedName);
			}
		}
	}

	const immediate: Tool[] = [];
	const deferred = new Map<string, Tool>();
	for (const [name, tool] of uniqueTools) {
		if (deferredNames.has(name)) deferred.set(name, tool);
		else immediate.push(tool);
	}
	return { immediate, deferred };
}
