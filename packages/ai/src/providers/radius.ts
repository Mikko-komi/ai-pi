/**
 * Radius gateway provider with a persisted, dynamically refreshed catalog.
 *
 * Radius 网关 Provider。目录可持久化并动态刷新；本文件不实现 OAuth 与协议。
 */

import { piMessagesApi } from "../api/pi-messages.lazy.ts";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.ts";
import { loadRadiusOAuth } from "../auth/oauth/load.ts";
import type { Provider } from "../models.ts";
import {
	DEFAULT_RADIUS_GATEWAY,
	getRadiusModels,
	getRadiusModelsFromConfig,
	loadRadiusGatewayConfig,
	normalizeRadiusGatewayUrl,
} from "./radius-config.ts";

/**
 * Construction overrides for a Radius gateway provider.
 *
 * 构造 Radius Provider 的覆盖项。缺省 id/name/gateway 走内建默认值。
 */
export interface RadiusProviderOptions {
	id?: string;
	name?: string;
	gateway?: string;
}

/**
 * Radius gateway provider with a persisted, dynamically refreshed catalog.
 *
 * 构造 Radius 网关 Provider。刷新先恢复存储/legacy 凭证目录，再按允许联网拉取 `/v1/config`。
 */
export function radiusProvider(options: RadiusProviderOptions = {}): Provider<"pi-messages"> {
	const id = options.id ?? "radius";
	const name = options.name ?? "Radius";
	const gateway = normalizeRadiusGatewayUrl(options.gateway ?? DEFAULT_RADIUS_GATEWAY);
	let models = getRadiusModels(id, undefined);
	const streams = piMessagesApi();

	return {
		id,
		name,
		auth: {
			apiKey: envApiKeyAuth("Radius API key", ["RADIUS_API_KEY"]),
			oauth: lazyOAuth({ name, load: () => loadRadiusOAuth({ name, gateway }) }),
		},
		getModels: () => models,
		refreshModels: async (context) => {
			const stored = context.stored;
			if (stored) {
				const restored = stored.models.filter((model) => model.provider === id) as typeof models;
				if (
					!(await context.publish({
						update: () => {
							models = restored;
						},
					}))
				) {
					return;
				}
			}

			// Import catalogs cached by the pre-ModelsStore Radius implementation.
			if (!stored && context.credential?.type === "oauth") {
				const legacy = getRadiusModels(id, context.credential);
				if (legacy.length > 0) {
					if (
						!(await context.publish({
							persist: { models: legacy, checkedAt: Date.now() },
							update: () => {
								models = legacy;
							},
						}))
					) {
						return;
					}
				}
			}

			if (!context.allowNetwork || context.signal.aborted) return;
			const apiKey = context.credential?.type === "oauth" ? context.credential.access : context.credential?.key;
			const config = await loadRadiusGatewayConfig(gateway, apiKey, context.signal);
			if (context.signal.aborted) return;
			const refreshed = getRadiusModelsFromConfig(id, config);
			await context.publish({
				persist: { models: refreshed, checkedAt: Date.now() },
				update: () => {
					models = refreshed;
				},
			});
		},
		stream: (model, context, streamOptions) => streams.stream(model, context, streamOptions),
		streamSimple: (model, context, streamOptions) => streams.streamSimple(model, context, streamOptions),
	};
}
