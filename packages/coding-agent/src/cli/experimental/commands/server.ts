/**
 * Experimental `server` command: host a coding-agent server.
 *
 * 实验 server 子命令。`--provider` 必须搭配 `--model`；leftover argv 一律不支持。
 */

import { isServerId, type ServerId } from "@earendil-works/pi-protocol";
import { Command, stringOption, valueOption } from "../command.ts";
import {
	type AuthInput,
	authTokenFileOption,
	authTokenOption,
	parseAuth,
	unsupportedOptions,
} from "../command-options.ts";

/**
 * Parsed experimental server invocation.
 *
 * server 调用。`--server-id` 必须是小写 UUIDv4。
 */
export interface ServerCommand {
	readonly command: "server";
	readonly auth?: AuthInput;
	readonly provider?: string;
	readonly model?: string;
	readonly pluginPackages?: readonly string[];
	readonly serverId?: ServerId;
	readonly sessionDir?: string;
}

/**
 * Host callback that executes a parsed server command.
 *
 * 执行已解析 server 调用的宿主回调。CLI 只解析，不在这里起服务。
 */
export interface ServerCommandContext {
	runServer(command: ServerCommand): void | Promise<void>;
}

const serverIdOption = valueOption("--server-id", (value) =>
	isServerId(value)
		? { ok: true, value }
		: { ok: false, error: `Invalid --server-id "${value}"; expected a lowercase UUIDv4` },
);
const sessionDirOption = stringOption("--session-dir");
const providerOption = stringOption("--provider");
const modelOption = stringOption("--model");
const pluginPackageOption = stringOption("-e", { repeatable: true });

/**
 * Experimental server command tree with server-id, session, model, and auth options.
 *
 * server 命令定义。有 leftover argv 就失败，不吞未知选项。
 */
export const serverCommand = new Command<ServerCommand, ServerCommandContext>("server")
	.option(serverIdOption)
	.option(sessionDirOption)
	.option(providerOption)
	.option(modelOption)
	.option(pluginPackageOption)
	.option(authTokenOption)
	.option(authTokenFileOption)
	.build((input) => {
		const { auth, errors: authErrors } = parseAuth(input);
		const serverId = input.value(serverIdOption);
		const sessionDir = input.value(sessionDirOption);
		const provider = input.value(providerOption);
		const model = input.value(modelOption);
		const pluginPackages = input.values(pluginPackageOption);
		const modelErrors = provider !== undefined && model === undefined ? ["--provider requires --model"] : [];
		const errors = [...authErrors, ...modelErrors, ...unsupportedOptions("server", input)];
		if (errors.length > 0) return { ok: false, errors };
		return {
			ok: true,
			command: {
				command: "server",
				...(auth === undefined ? {} : { auth }),
				...(provider === undefined ? {} : { provider }),
				...(model === undefined ? {} : { model }),
				...(pluginPackages.length === 0 ? {} : { pluginPackages }),
				...(serverId === undefined ? {} : { serverId }),
				...(sessionDir === undefined ? {} : { sessionDir }),
			},
		};
	})
	.action((command, context) => context.runServer(command));
