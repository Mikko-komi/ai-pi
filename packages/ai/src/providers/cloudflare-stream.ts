/**
 * Cloudflare endpoint placeholder expansion for stream dispatch.
 *
 * Cloudflare 流包装。派发前把模型 baseUrl 里的账号/网关占位符换成 env。
 */

import type { Api, Model, ProviderEnv, ProviderStreams } from "../types.ts";

const CLOUDFLARE_ACCOUNT_ID = "CLOUDFLARE_ACCOUNT_ID";
const CLOUDFLARE_GATEWAY_ID = "CLOUDFLARE_GATEWAY_ID";

/**
 * Substitute Cloudflare account/gateway placeholders on a model's baseUrl.
 *
 * 用 env 展开模型 baseUrl 里的 Cloudflare 占位符。无 env 则原样返回。
 */
export function resolveCloudflareModel<TApi extends Api>(
	model: Model<TApi>,
	env: ProviderEnv | undefined,
): Model<TApi> {
	if (!env) return model;
	const baseUrl = model.baseUrl
		.replaceAll(`{${CLOUDFLARE_ACCOUNT_ID}}`, env[CLOUDFLARE_ACCOUNT_ID] ?? `{${CLOUDFLARE_ACCOUNT_ID}}`)
		.replaceAll(`{${CLOUDFLARE_GATEWAY_ID}}`, env[CLOUDFLARE_GATEWAY_ID] ?? `{${CLOUDFLARE_GATEWAY_ID}}`);
	return baseUrl === model.baseUrl ? model : { ...model, baseUrl };
}

/**
 * Wrap an API implementation so Cloudflare account/gateway endpoint
 * placeholders materialize from the resolved provider env before dispatch.
 *
 * 给流包上 Cloudflare 占位符展开。从 options.env 取值，不在这里做鉴权。
 */
export function cloudflareStreams(streams: ProviderStreams): ProviderStreams {
	return {
		stream: (model, context, options) =>
			streams.stream(resolveCloudflareModel(model, options?.env), context, options),
		streamSimple: (model, context, options) =>
			streams.streamSimple(resolveCloudflareModel(model, options?.env), context, options),
	};
}
