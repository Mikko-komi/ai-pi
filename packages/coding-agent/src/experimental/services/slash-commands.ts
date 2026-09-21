/**
 * Process-local slash command contributions and registry contract.
 *
 * 进程本地斜杠命令合同。注册表不跨进程；replace 叠同名代，等上一代卸完。
 */

import { type Context, defineService } from "@earendil-works/chord";
import type { AgentOperationResponse, AgentQueueResponse } from "./agent-controller.ts";

/**
 * One argument-completion row for a slash command.
 *
 * 参数补全一项。value 写入输入。
 */
export interface SlashCommandCompletion {
	readonly value: string;
	readonly label: string;
	readonly description?: string;
}

/**
 * Value returned by a slash command run.
 *
 * 命令 run 的返回。undefined 表示没有 controller 操作。
 */
export type SlashCommandRunResult = AgentOperationResponse | AgentQueueResponse | undefined;

/**
 * One slash command contributed to the local registry.
 *
 * 一条斜杠命令。name 必须是小写字母数字，后续只能再含 `:` 或 `-`。
 */
export interface SlashCommandContribution {
	readonly name: string;
	readonly description?: string;
	readonly argumentHint?: string;
	getArgumentCompletions?(
		argumentPrefix: string,
	): readonly SlashCommandCompletion[] | null | Promise<readonly SlashCommandCompletion[] | null>;
	run(args: string, context: Context): SlashCommandRunResult | Promise<SlashCommandRunResult>;
}

/**
 * Local registry of slash commands for presentation facets.
 *
 * 本地注册表。register 遇同名抛；replace 叠代，unsubscribe 才露出下一层。
 */
export interface SlashCommands {
	register(command: SlashCommandContribution): () => void;
	/** Stage a same-name replacement while the previous facet generation retires. */
	replace(command: SlashCommandContribution): () => void;
	list(): readonly SlashCommandContribution[];
	subscribe(listener: (commands: readonly SlashCommandContribution[]) => void): () => void;
}

/**
 * Chord service token for SlashCommands.
 *
 * 本地服务令牌。id 固定 `pi.local.slash-commands`。
 */
export const SlashCommands = defineService<SlashCommands>("pi.local.slash-commands", { local: true });
