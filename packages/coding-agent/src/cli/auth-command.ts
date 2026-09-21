/**
 * Parse and validate `pi auth …` subcommands.
 *
 * `pi auth` 子命令的解析。未知子命令或旗标错位都抛 {@link AuthCommandError}。
 */

import type { AuthResult } from "@earendil-works/pi-ai";
import { APP_NAME } from "../config.ts";
import type { Args } from "./args.ts";

/**
 * Which `pi auth` verb this invocation is.
 *
 * `auth` 动词。`api_key` / `bearer_token` 是打印凭证，`check` 是探测。
 */
export type AuthCommandKind = "check" | "api_key" | "bearer_token";

/**
 * Parsed `pi auth` invocation after the verb.
 *
 * 解析后的 auth 调用。`args` 是动词后面交给 `parseArgs` 的剩余 argv。
 */
export interface AuthCommand {
	kind: AuthCommandKind;
	args: string[];
	json: boolean;
	credentials: boolean;
	noRefresh: boolean;
	minExpiryMs?: number;
}

/**
 * User-facing auth CLI failure. `main` prints the message and exits.
 *
 * auth 子命令的用户错误。`main` 只打 message 再退出，不当内部故障。
 */
export class AuthCommandError extends Error {}

const AUTH_COMMAND_USAGE: Record<AuthCommandKind, string> = {
	check: `${APP_NAME} auth check --provider <provider> [--json] [--credentials] [--no-refresh]`,
	api_key: `${APP_NAME} auth print-api-key --provider <provider> [--model <model>]`,
	bearer_token: `${APP_NAME} auth print-bearer-token --provider <provider> [--model <model>] [--min-expiry <duration>]`,
};

/**
 * Human name of one auth verb, for error strings.
 *
 * 错误文案用的动词名，例如 `auth print-api-key`。
 */
export function getAuthCommandName(kind: AuthCommandKind): string {
	return kind === "check" ? "auth check" : kind === "api_key" ? "auth print-api-key" : "auth print-bearer-token";
}

/**
 * One-line usage for a given auth verb.
 *
 * 某一 auth 动词的一行用法，给失败提示复用。
 */
export function getAuthCommandUsage(kind: AuthCommandKind): string {
	return AUTH_COMMAND_USAGE[kind];
}

/**
 * Whether argv is `auth` help rather than a verb.
 *
 * 是不是 `auth` 帮助。`auth` 后无动词、`help`、`--help`/`-h` 都算。
 */
export function isAuthCommandHelp(args: string[]): boolean {
	return (
		args[0] === "auth" &&
		(args[1] === undefined || args[1] === "help" || args.includes("--help") || args.includes("-h"))
	);
}

/**
 * Print `pi auth` usage to stdout.
 *
 * 打 `pi auth` 帮助。只写 stdout，不解析 argv。
 */
export function printAuthCommandHelp(): void {
	console.log(`Usage:
  pi auth print-api-key [--provider <provider>] [--model <model>]
  pi auth print-bearer-token [--provider <provider>] [--model <model>] [--min-expiry <duration>]
  pi auth check [--provider <provider>] [--model <model>] [--json] [--credentials] [--no-refresh]

Auth commands require at least one of --provider or --model. Checks refresh expired OAuth credentials by default; --no-refresh prevents this. --credentials emits the credential, or includes it in JSON output.`);
}

/**
 * Parse a leading `auth` verb. Non-auth argv returns undefined.
 *
 * 解析开头的 `auth` 动词。不是 auth 返回 undefined；未知动词抛 AuthCommandError。
 */
export function parseAuthCommand(args: string[]): AuthCommand | undefined {
	if (args[0] !== "auth") return undefined;

	const kind =
		args[1] === "check"
			? "check"
			: args[1] === "print-api-key"
				? "api_key"
				: args[1] === "print-bearer-token"
					? "bearer_token"
					: undefined;
	if (!kind) {
		throw new AuthCommandError(
			`Unknown auth command "${args[1] ?? ""}". Use "${APP_NAME} auth print-api-key", "${APP_NAME} auth print-bearer-token", or "${APP_NAME} auth check".`,
		);
	}

	const commandArgs: string[] = [];
	let json = false;
	let credentials = false;
	let noRefresh = false;
	let minExpiryMs: number | undefined;
	for (let index = 2; index < args.length; index++) {
		const arg = args[index];
		if (arg === "--min-expiry") {
			if (kind !== "bearer_token")
				throw new AuthCommandError("--min-expiry is only supported by print-bearer-token");
			const value = args[++index];
			const match = value ? /^(\d+)(ms|s|m|h)$/iu.exec(value) : undefined;
			if (!match) throw new AuthCommandError("--min-expiry must use a duration such as 30m or 1h");
			const amount = Number(match[1]);
			const unit = match[2];
			minExpiryMs = amount * (unit === "ms" ? 1 : unit === "s" ? 1_000 : unit === "m" ? 60_000 : 3_600_000);
			continue;
		}
		if (arg === "--json" || arg === "--credentials" || arg === "--no-refresh") {
			if (kind !== "check") throw new AuthCommandError(`${arg} is only supported by auth check`);
			if (arg === "--json") json = true;
			else if (arg === "--credentials") credentials = true;
			else noRefresh = true;
			continue;
		}
		commandArgs.push(arg);
	}

	return minExpiryMs === undefined
		? { kind, args: commandArgs, json, credentials, noRefresh }
		: { kind, args: commandArgs, json, credentials, noRefresh, minExpiryMs };
}

/**
 * Restrict auth verbs to `--provider` / `--model`.
 *
 * auth 只收 `--provider` 和 `--model`。缺一且另一也没有，或夹带别的旗标，就抛。
 */
export function validateAuthCommandArgs(args: Args, kind: AuthCommandKind): { provider?: string; model?: string } {
	const provider = args.provider?.trim() || undefined;
	const model = args.model?.trim() || undefined;
	if (args.unknownFlags.size > 0) {
		const option = args.unknownFlags.keys().next().value;
		throw new AuthCommandError(`Unknown option --${option} for "${getAuthCommandName(kind)}".`);
	}
	if (args.apiKey !== undefined || args.messages.length > 0 || args.fileArgs.length > 0) {
		throw new AuthCommandError("Auth commands only accept --provider and --model");
	}
	if (kind === "check") {
		if (!provider && !model) {
			throw new AuthCommandError("Auth checks require --provider <provider> or --model <model>");
		}
		return { provider, model };
	}
	if (!provider && !model) {
		throw new AuthCommandError("Credential printing requires --provider <provider> or --model <model>");
	}
	return { provider, model };
}

/**
 * Pull the printable secret out of an AuthResult.
 *
 * 从 AuthResult 抽出可打印密钥。优先 apiKey，否则解析 Authorization: Bearer。
 */
export function getAuthCredential(auth: AuthResult | undefined): string | undefined {
	if (auth?.auth.apiKey) return auth.auth.apiKey;
	const authorization = Object.entries(auth?.auth.headers ?? {}).find(
		([name]) => name.toLowerCase() === "authorization",
	)?.[1];
	return typeof authorization === "string" ? /^Bearer\s+(.+)$/iu.exec(authorization)?.[1] : undefined;
}
