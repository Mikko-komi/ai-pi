/**
 * Experimental `client` command: connect to a server and run a session.
 *
 * 实验 client 子命令。`--session-id` / `--continue` / `--resume` 三选一。
 */

import { Command, flagOption, stringOption } from "../command.ts";
import {
	type AuthInput,
	authTokenFileOption,
	authTokenOption,
	connectOption,
	parseAuth,
	type TransportAddress,
	unsupportedOptions,
} from "../command-options.ts";

/**
 * Parsed experimental client invocation.
 *
 * client 调用。`--provider` 必须搭配 `--model`；prompt 最多一段且不能是 flag。
 */
export interface ClientCommand {
	readonly command: "client";
	readonly auth?: AuthInput;
	readonly connect?: TransportAddress;
	readonly sessionId?: string;
	readonly continue?: boolean;
	readonly resume?: boolean;
	readonly provider?: string;
	readonly model?: string;
	readonly pluginPackages?: readonly string[];
	readonly prompt?: string;
}

/**
 * Host callback that executes a parsed client command.
 *
 * 执行已解析 client 调用的宿主回调。CLI 只解析，不在这里连服务。
 */
export interface ClientCommandContext {
	runClient(command: ClientCommand): void | Promise<void>;
}

const sessionIdOption = stringOption("--session-id");
const continueOption = flagOption("--continue");
const continueShortOption = flagOption("-c");
const resumeOption = flagOption("--resume");
const resumeShortOption = flagOption("-r");
const providerOption = stringOption("--provider");
const modelOption = stringOption("--model");
const pluginPackageOption = stringOption("-e", { repeatable: true });

/**
 * Experimental client command tree with connect, session, model, and auth options.
 *
 * client 命令定义。`--` 后的单段非空参数当 prompt；其余 leftover 当不支持选项。
 */
export const clientCommand = new Command<ClientCommand, ClientCommandContext>("client")
	.option(connectOption)
	.option(sessionIdOption)
	.option(continueOption)
	.option(continueShortOption)
	.option(resumeOption)
	.option(resumeShortOption)
	.option(providerOption)
	.option(modelOption)
	.option(pluginPackageOption)
	.option(authTokenOption)
	.option(authTokenFileOption)
	.build((input) => {
		const { auth, errors: authErrors } = parseAuth(input);
		const connect = input.value(connectOption);
		const sessionId = input.value(sessionIdOption);
		const shouldContinue = input.value(continueOption) === true || input.value(continueShortOption) === true;
		const shouldResume = input.value(resumeOption) === true || input.value(resumeShortOption) === true;
		const provider = input.value(providerOption);
		const model = input.value(modelOption);
		const pluginPackages = input.values(pluginPackageOption);
		const promptArgs = input.remainingArgs[0] === "--" ? input.remainingArgs.slice(1) : input.remainingArgs;
		const prompt =
			promptArgs.length === 1 &&
			(input.remainingArgs[0] === "--" || !promptArgs[0]!.startsWith("-")) &&
			promptArgs[0]!.length > 0
				? promptArgs[0]
				: undefined;
		const modelErrors = provider !== undefined && model === undefined ? ["--provider requires --model"] : [];
		const sessionSelectionErrors =
			[sessionId !== undefined, shouldContinue, shouldResume].filter(Boolean).length > 1
				? ["--session-id, --continue, and --resume are mutually exclusive"]
				: [];
		const unsupportedErrors =
			input.remainingArgs.length === 0 || prompt !== undefined ? [] : unsupportedOptions("client", input);
		const errors = [...authErrors, ...modelErrors, ...sessionSelectionErrors, ...unsupportedErrors];
		if (errors.length > 0) return { ok: false, errors };
		return {
			ok: true,
			command: {
				command: "client",
				...(auth === undefined ? {} : { auth }),
				...(connect === undefined ? {} : { connect }),
				...(sessionId === undefined ? {} : { sessionId }),
				...(shouldContinue ? { continue: true } : {}),
				...(shouldResume ? { resume: true } : {}),
				...(provider === undefined ? {} : { provider }),
				...(model === undefined ? {} : { model }),
				...(pluginPackages.length === 0 ? {} : { pluginPackages }),
				...(prompt === undefined ? {} : { prompt }),
			},
		};
	})
	.action((command, context) => context.runClient(command));
