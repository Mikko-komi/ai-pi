/**
 * OpenCode per-conversation session routing header.
 *
 * OpenCode 会话路由头。派发前写入 x-opencode-session；调用方已带同名头则不覆盖。
 */

import type { ProviderHeaders, ProviderStreams, StreamOptions } from "../types.ts";

const OPENCODE_SESSION_HEADER = "x-opencode-session";

function hasHeader(headers: ProviderHeaders | undefined, name: string): boolean {
	const expected = name.toLowerCase();
	return Object.keys(headers ?? {}).some((key) => key.toLowerCase() === expected);
}

function withSessionHeader<TOptions extends StreamOptions>(options: TOptions | undefined): TOptions | undefined {
	if (!options?.sessionId || hasHeader(options.headers, OPENCODE_SESSION_HEADER)) return options;
	return {
		...options,
		headers: { ...options.headers, [OPENCODE_SESSION_HEADER]: options.sessionId },
	};
}

/**
 * Adds OpenCode's required per-conversation routing header before API dispatch.
 *
 * 给流包上 OpenCode 会话头。已有同名头则原样转发。
 */
export function withOpenCodeSessionHeader(streams: ProviderStreams): ProviderStreams {
	return {
		...streams,
		stream: (model, context, options) => streams.stream(model, context, withSessionHeader(options)),
		streamSimple: (model, context, options) => streams.streamSimple(model, context, withSessionHeader(options)),
	};
}
