/**
 * Standard api-key auth helper and lazy OAuth wrapper.
 *
 * 标准环境变量 api-key 鉴权，以及把 OAuth 实现延迟加载的包装。
 */

import type { ApiKeyAuth, OAuthAuth } from "./types.ts";

/**
 * Standard api-key auth: a stored credential key wins, otherwise the first
 * set env var resolves. Includes a `login` that prompts for the key.
 * Providers with non-standard resolution (provider env, ambient files, IAM)
 * write their own `ApiKeyAuth`.
 *
 * 标准 api-key：已存 key 优先，否则第一个有值的环境变量。带 prompt login。
 */
export function envApiKeyAuth(name: string, envVars: readonly string[]): ApiKeyAuth {
	return {
		name,
		login: async (interaction) => {
			interaction.signal.throwIfAborted();
			const key = await interaction.prompt({ type: "secret", message: `Enter ${name}` });
			interaction.signal.throwIfAborted();
			return { type: "api_key", key };
		},
		resolve: async ({ ctx, credential, signal }) => {
			signal.throwIfAborted();
			if (credential?.key) {
				return { auth: { apiKey: credential.key }, env: credential.env, source: "stored credential" };
			}
			for (const envVar of envVars) {
				const value = await ctx.env(envVar);
				signal.throwIfAborted();
				if (value) return { auth: { apiKey: value }, source: envVar };
			}
			return undefined;
		},
	};
}

/**
 * Wraps a dynamically imported `OAuthAuth` so provider definitions can
 * advertise OAuth without importing the implementation. The flow loads on
 * first `login`/`refresh`/`toAuth` call; callers keep Node-only flow code out
 * of bundles by loading through a bundler-opaque dynamic import (variable
 * specifier, see the bedrock lazy wrapper).
 *
 * 包装动态 import 的 `OAuthAuth`。首次 login/refresh/toAuth 才加载，避免把 Node-only 流打进包。
 */
export function lazyOAuth(input: {
	name: string;
	isSubscription?: boolean;
	loginLabel?: string;
	load: () => Promise<OAuthAuth>;
}): OAuthAuth {
	let promise: Promise<OAuthAuth> | undefined;
	const loaded = () => {
		promise ??= input.load();
		return promise;
	};
	return {
		name: input.name,
		isSubscription: input.isSubscription,
		loginLabel: input.loginLabel,
		login: async (interaction) => (await loaded()).login(interaction),
		refresh: async (credential, signal) => (await loaded()).refresh(credential, signal),
		toAuth: async (credential) => (await loaded()).toAuth(credential),
	};
}
