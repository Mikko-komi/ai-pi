/**
 * Shared experimental CLI options for auth and transport addresses.
 *
 * 实验 CLI 共用的 auth / `--connect` 选项。token 与 token-file 互斥。
 */

import { posix } from "node:path";
import { isServerId, type ServerId } from "@earendil-works/pi-protocol";
import { type ParsedCommandInput, stringOption, valueOption } from "./command.ts";

/**
 * Inline token or file-path source for experimental command auth.
 *
 * 实验命令的认证来源。token 与 file 两种，不能同时给。
 */
export type AuthInput =
	| { readonly type: "token"; readonly token: string }
	| { readonly type: "file"; readonly path: string };

interface UnixTransportAddress {
	readonly transport: "unix";
	readonly path: string;
}

interface RadiusTransportAddress {
	readonly transport: "radius";
	readonly serverId: ServerId;
}

/**
 * Unix socket path or Radius server-id address from `--connect`.
 *
 * `--connect` 地址。unix 必须是 `unix:///` 绝对路径；radius 要小写 UUIDv4。
 */
export type TransportAddress = UnixTransportAddress | RadiusTransportAddress;

/**
 * `--auth-token` string option.
 *
 * 内联 token 选项。与 `--auth-token-file` 互斥，由 `parseAuth` 检查。
 */
export const authTokenOption = stringOption("--auth-token");

/**
 * `--auth-token-file` path option.
 *
 * token 文件路径选项。与 `--auth-token` 互斥。
 */
export const authTokenFileOption = stringOption("--auth-token-file");

function parseAuthInput(options: { readonly authToken?: string; readonly authTokenFile?: string }): {
	auth?: AuthInput;
	errors: string[];
} {
	if (options.authToken !== undefined && options.authTokenFile !== undefined) {
		return { errors: ["--auth-token and --auth-token-file are mutually exclusive"] };
	}
	if (options.authToken !== undefined) {
		return { auth: { type: "token", token: options.authToken }, errors: [] };
	}
	if (options.authTokenFile !== undefined) {
		return { auth: { type: "file", path: options.authTokenFile }, errors: [] };
	}
	return { errors: [] };
}

function parseTransportAddress(value: string): { address?: TransportAddress; error?: string } {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return { error: `Invalid --connect address "${value}"` };
	}
	if (url.protocol === "radius:") {
		if (
			url.username ||
			url.password ||
			url.port ||
			(url.pathname !== "" && url.pathname !== "/") ||
			url.search ||
			url.hash ||
			value !== `radius://${url.hostname}${url.pathname}`
		) {
			return { error: `Invalid --connect address "${value}"` };
		}
		const serverId = url.hostname;
		if (!isServerId(serverId)) {
			return { error: "Radius transport address requires a lowercase UUIDv4 server ID" };
		}
		return { address: { transport: "radius", serverId } };
	}
	if (url.protocol !== "unix:") return { error: `Unsupported --connect transport "${url.protocol}"` };
	if (url.hostname || url.port || url.username || url.password) {
		return { error: "Unix transport address must not include an authority" };
	}
	if (
		!value.startsWith("unix:///") ||
		value.startsWith("unix:////") ||
		value.includes("?") ||
		value.includes("#") ||
		url.href !== value
	) {
		return { error: `Invalid --connect address "${value}"` };
	}
	let path: string;
	try {
		path = decodeURIComponent(url.pathname);
	} catch {
		return { error: `Invalid --connect address "${value}"` };
	}
	if (path.includes("\0")) return { error: `Invalid --connect address "${value}"` };
	if (!posix.isAbsolute(path)) return { error: "Unix transport address requires an absolute path" };
	return { address: { transport: "unix", path } };
}

/**
 * `--connect` option that parses a unix or radius transport address.
 *
 * 解析 `--connect`。非法 URL 或不受支持的 scheme 返回 error，不抛。
 */
export const connectOption = valueOption("--connect", (value) => {
	const result = parseTransportAddress(value);
	return result.address
		? { ok: true, value: result.address }
		: { ok: false, error: result.error ?? `Invalid --connect address "${value}"` };
});

/**
 * Read mutually exclusive auth options from parsed command input.
 *
 * 从已解析输入取 auth。两个选项都给则只回 errors。
 */
export function parseAuth(input: ParsedCommandInput): { auth?: AuthInput; errors: string[] } {
	return parseAuthInput({
		authToken: input.value(authTokenOption),
		authTokenFile: input.value(authTokenFileOption),
	});
}

/**
 * Error if leftover argv remains on an experimental command.
 *
 * remainingArgs 非空时提示实验命令还不支持既有 CLI 选项。空则空数组。
 */
export function unsupportedOptions(command: string, input: ParsedCommandInput): string[] {
	if (input.remainingArgs.length === 0) return [];
	return [`The experimental ${command} command does not support existing CLI options yet`];
}
