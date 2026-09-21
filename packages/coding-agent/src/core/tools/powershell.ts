/**
 * PowerShell tool: same shell pipeline as bash, with UTF-8 output prefix.
 *
 * PowerShell 工具。复用 bash 的 spawn / 截断；每条命令前加 UTF-8 输出前缀。
 */

import { getPowerShellConfig } from "../../utils/shell.ts";
import {
	type BashOperations,
	type BashSpawnContext,
	type BashSpawnHook,
	type BashToolDetails,
	type BashToolInput,
	type BashToolOptions,
	type createBashTool,
	createLocalShellOperations,
	createShellToolDefinition,
	type ShellToolConfig,
} from "./bash.ts";
import { wrapToolDefinition } from "./tool-definition-wrapper.ts";

const UTF8_OUTPUT_PREFIX = "try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n";

/**
 * System-prompt snippet and guidelines for the PowerShell tool.
 *
 * PowerShell 写进系统提示的片段。guidelines 依赖是否暴露 PI_* 环境变量。
 */
export const powershellToolSystemPromptContribution = {
	snippet: "Execute PowerShell commands",
	guidelines: ["You can inspect PI_* environment variables for current model and session details."],
} as const;

/**
 * Pluggable operations for the PowerShell tool.
 *
 * PowerShell 执行口。形状和 BashOperations 相同。
 */
export type PowerShellOperations = BashOperations;

/**
 * Command, cwd, and env just before PowerShell spawn.
 *
 * PowerShell spawn 前上下文。就是 BashSpawnContext。
 */
export type PowerShellSpawnContext = BashSpawnContext;

/**
 * Hook that may rewrite PowerShell spawn context.
 *
 * PowerShell spawn 前钩子。就是 BashSpawnHook。
 */
export type PowerShellSpawnHook = BashSpawnHook;

/**
 * Extra result metadata when PowerShell output is truncated.
 *
 * 截断附加信息。就是 BashToolDetails。
 */
export type PowerShellToolDetails = BashToolDetails;

/**
 * Arguments the model sends to the PowerShell tool.
 *
 * PowerShell 调用参数。就是 BashToolInput。
 */
export type PowerShellToolInput = BashToolInput;

/**
 * Options for creating the PowerShell tool.
 *
 * PowerShell 工厂选项。不接受 commandPrefix / shellPath，默认走本地 PowerShell。
 */
export interface PowerShellToolOptions
	extends Pick<BashToolOptions, "operations" | "exposeSessionEnvironment" | "spawnHook"> {}

/**
 * Create PowerShell operations using the local shell backend.
 *
 * 本地 PowerShell 后端。每条命令前强制 UTF-8 输出编码。
 */
export function createLocalPowerShellOperations(): PowerShellOperations {
	const operations = createLocalShellOperations("PowerShell", getPowerShellConfig);
	return {
		exec: (command, cwd, options) => operations.exec(`${UTF8_OUTPUT_PREFIX}${command}`, cwd, options),
	};
}

const powershellToolConfig: ShellToolConfig = {
	name: "powershell",
	label: "powershell",
	shellName: "PowerShell",
	prompt: "PS>",
	promptSnippet: powershellToolSystemPromptContribution.snippet,
	promptGuidelines: powershellToolSystemPromptContribution.guidelines,
	tempFilePrefix: "pi-powershell",
};

/**
 * Create the built-in PowerShell ToolDefinition.
 *
 * 内置 PowerShell 定义。缺 operations 时走本地 PowerShell。
 */
export function createPowerShellToolDefinition(
	cwd: string,
	options?: PowerShellToolOptions,
): ReturnType<typeof createShellToolDefinition> {
	return createShellToolDefinition(cwd, powershellToolConfig, {
		...options,
		operations: options?.operations ?? createLocalPowerShellOperations(),
	});
}

/**
 * Create the built-in PowerShell AgentTool.
 *
 * 内置 PowerShell 运行时工具。把 prompt 元数据挂到 wrap 后的实例上。
 */
export function createPowerShellTool(cwd: string, options?: PowerShellToolOptions): ReturnType<typeof createBashTool> {
	const definition = createPowerShellToolDefinition(cwd, options);
	const tool = wrapToolDefinition(definition);
	Object.assign(tool, {
		promptSnippet: definition.promptSnippet,
		promptGuidelines: definition.promptGuidelines,
	});
	return tool;
}
