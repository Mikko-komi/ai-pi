/**
 * Experimental CLI root: `experimental server` and `experimental client`.
 *
 * 实验 CLI 根。只挂 server/client；单独 `experimental` 立刻失败。
 */

import { Command } from "./command.ts";
import { type ClientCommandContext, clientCommand } from "./commands/client.ts";
import { type ServerCommandContext, serverCommand } from "./commands/server.ts";

interface ExperimentalCommandGroup {
	readonly command: "experimental";
}

/**
 * Combined context required to execute experimental server and client commands.
 *
 * server/client 动作共享的上下文交叉。两边的 run* 都必须在场。
 */
export type CliContext = ServerCommandContext & ClientCommandContext;

const experimentalCommand = new Command<ExperimentalCommandGroup, CliContext>("experimental").build(() => ({
	ok: false,
	errors: ["Expected experimental command: server or client"],
}));

/**
 * Parsed experimental command tree for server and client subcommands.
 *
 * 实验命令树。根命令本身不能执行，必须选出 server 或 client。
 */
export const cli = experimentalCommand.command(serverCommand).command(clientCommand);
