/**
 * Built-in tool renderers, without the tools themselves.
 *
 * A presentation displays tool calls and results; it does not execute them and does not need their
 * typebox parameter schemas. Importing this instead of `core/tools/index.ts` keeps ~17 MB of module
 * graph out of a process that only renders.
 *
 * 内置工具的展示入口。只渲染不执行，避免拉进工具实现和 schema。
 */

import type { ToolDefinition } from "../../extensions/types.ts";
import type { ToolName } from "../index.ts";
import { createShellRenderers } from "./bash.ts";
import { editRenderers } from "./edit.ts";
import { findRenderers } from "./find.ts";
import { grepRenderers } from "./grep.ts";
import { lsRenderers } from "./ls.ts";
import { readRenderers } from "./read.ts";
import { writeRenderers } from "./write.ts";

/**
 * Call/result presentation hooks taken from a tool definition.
 *
 * 工具定义里只抽渲染。没有 schema，也不能执行。
 */
export type ToolRenderers = Pick<ToolDefinition<any, any>, "renderCall" | "renderResult">;

export {
	createShellRenderers,
	editRenderers,
	findRenderers,
	grepRenderers,
	lsRenderers,
	readRenderers,
	writeRenderers,
};

/**
 * Renderers for every built-in tool, keyed by tool name.
 *
 * 按工具名给出全部内置渲染器。bash/powershell 只换提示符。
 */
export function createAllToolRenderers(): Record<ToolName, ToolRenderers> {
	return {
		read: readRenderers,
		bash: createShellRenderers("$"),
		powershell: createShellRenderers("PS>"),
		edit: editRenderers,
		write: writeRenderers,
		grep: grepRenderers,
		find: findRenderers,
		ls: lsRenderers,
	};
}

/**
 * Merge built-in renderers into a tool definition that does not supply its own.
 *
 * `ToolExecutionComponent` used to do this lookup itself, which forced every presentation to import
 * the tool implementations. Callers do it now, so a process that renders can import renderers alone.
 *
 * 定义缺渲染器时补内置。没有定义就返回内置；两边都没有则 undefined。
 */
export function withBuiltInRenderers<TDefinition extends ToolRenderers>(
	toolName: string,
	definition: TDefinition | undefined,
): TDefinition | ToolRenderers | undefined {
	const builtIn = createAllToolRenderers()[toolName as ToolName];
	if (!definition) return builtIn;
	if (!builtIn) return definition;
	return {
		...definition,
		renderCall: definition.renderCall ?? builtIn.renderCall,
		renderResult: definition.renderResult ?? builtIn.renderResult,
	};
}
