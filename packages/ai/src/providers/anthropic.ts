/**
 * Built-in Anthropic provider factory.
 *
 * Anthropic 内建 Provider 工厂。apiKey 与 Claude Pro/Max OAuth 并列；流交给 anthropic-messages。
 */

import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.ts";
import { lazyOAuth } from "../auth/helpers.ts";
import { loadAnthropicOAuth } from "../auth/oauth/load.ts";
import type { ApiKeyAuth } from "../auth/types.ts";
import { ANTHROPIC_API_KEY_ENV, ANTHROPIC_AUTH_TOKEN_ENV, ANTHROPIC_OAUTH_TOKEN_ENV } from "../env-api-keys.ts";
import { createProvider, type Provider } from "../models.ts";
import { ANTHROPIC_MODELS } from "./anthropic.models.ts";

function anthropicApiKeyAuth(): ApiKeyAuth {
	return {
		name: "Anthropic API key",
		login: async (interaction) => {
			interaction.signal.throwIfAborted();
			const key = await interaction.prompt({ type: "secret", message: "Enter Anthropic API key" });
			interaction.signal.throwIfAborted();
			return { type: "api_key", key };
		},
		resolve: async ({ ctx, credential, signal }) => {
			signal.throwIfAborted();
			if (credential?.key) {
				return { auth: { apiKey: credential.key }, env: credential.env, source: "stored credential" };
			}

			const authToken = await ctx.env(ANTHROPIC_AUTH_TOKEN_ENV);
			signal.throwIfAborted();
			if (authToken) {
				return {
					auth: { headers: { Authorization: `Bearer ${authToken}` } },
					source: ANTHROPIC_AUTH_TOKEN_ENV,
				};
			}

			for (const envVar of [ANTHROPIC_OAUTH_TOKEN_ENV, ANTHROPIC_API_KEY_ENV]) {
				const apiKey = await ctx.env(envVar);
				signal.throwIfAborted();
				if (apiKey) return { auth: { apiKey }, source: envVar };
			}
			return undefined;
		},
	};
}

/**
 * Construct the built-in Anthropic provider.
 *
 * 构造 Anthropic 内建 Provider。apiKey 解析 stored 与环境 token；另挂订阅 OAuth。
 */
export function anthropicProvider(): Provider<"anthropic-messages"> {
	return createProvider({
		id: "anthropic",
		name: "Anthropic",
		baseUrl: "https://api.anthropic.com",
		auth: {
			apiKey: anthropicApiKeyAuth(),
			oauth: lazyOAuth({
				name: "Anthropic (Claude Pro/Max)",
				isSubscription: true,
				load: loadAnthropicOAuth,
			}),
		},
		models: Object.values(ANTHROPIC_MODELS),
		api: anthropicMessagesApi(),
	});
}
