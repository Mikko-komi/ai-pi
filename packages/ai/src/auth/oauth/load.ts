/**
 * Dynamic loaders for Node-only OAuth flow modules.
 *
 * OAuth 流的按需加载。变量 specifier 挡住打包器跟进 Node-only 代码；Bun 二进制可先注入静态表。
 */

import type { OAuthAuth } from "../types.ts";

/**
 * Loads an OAuth flow module through a variable specifier so bundlers cannot
 * follow the import into Node-only flow code (`node:http` callback servers,
 * `node:crypto` PKCE). The `.ts`/`.js` rewrite keeps the trick working from
 * both source and built output.
 */
const importOAuthModule = (specifier: string): Promise<unknown> => {
	const runtimeSpecifier = import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier;
	return import(runtimeSpecifier);
};

type OAuthFlowLoaders = {
	anthropic: () => OAuthAuth | Promise<OAuthAuth>;
	openaiCodex: () => OAuthAuth | Promise<OAuthAuth>;
	githubCopilot: () => OAuthAuth | Promise<OAuthAuth>;
	openrouter: () => OAuthAuth | Promise<OAuthAuth>;
	kimiCoding: () => OAuthAuth | Promise<OAuthAuth>;
	xai: () => OAuthAuth | Promise<OAuthAuth>;
	radius: (options: { name: string; gateway: string }) => OAuthAuth | Promise<OAuthAuth>;
};

let bundledLoaders: OAuthFlowLoaders | undefined;

/**
 * Registers statically bundled OAuth flows for standalone Bun binaries.
 *
 * 注册打进 Bun 二进制的 OAuth 流。之后 load* 走内存表，不再动态 import。
 */
export function registerBundledOAuthFlowLoaders(loaders: OAuthFlowLoaders): void {
	bundledLoaders = loaders;
}

/**
 * Load Anthropic Claude Pro/Max OAuth.
 *
 * 加载 Anthropic OAuth。有 bundled 表则用之，否则动态 import。
 */
export const loadAnthropicOAuth = async (): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.anthropic();
	return ((await importOAuthModule("./anthropic.ts")) as { anthropicOAuth: OAuthAuth }).anthropicOAuth;
};

/**
 * Load OpenAI Codex (ChatGPT) OAuth.
 *
 * 加载 OpenAI Codex OAuth。有 bundled 表则用之，否则动态 import。
 */
export const loadOpenAICodexOAuth = async (): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.openaiCodex();
	return ((await importOAuthModule("./openai-codex.ts")) as { openaiCodexOAuth: OAuthAuth }).openaiCodexOAuth;
};

/**
 * Load GitHub Copilot OAuth.
 *
 * 加载 GitHub Copilot OAuth。有 bundled 表则用之，否则动态 import。
 */
export const loadGitHubCopilotOAuth = async (): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.githubCopilot();
	return ((await importOAuthModule("./github-copilot.ts")) as { githubCopilotOAuth: OAuthAuth }).githubCopilotOAuth;
};

/**
 * Load OpenRouter OAuth.
 *
 * 加载 OpenRouter OAuth。有 bundled 表则用之，否则动态 import。
 */
export const loadOpenRouterOAuth = async (): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.openrouter();
	return ((await importOAuthModule("./openrouter.ts")) as { openRouterOAuth: OAuthAuth }).openRouterOAuth;
};

/**
 * Load Kimi Code subscription OAuth.
 *
 * 加载 Kimi Code OAuth。有 bundled 表则用之，否则动态 import。
 */
export const loadKimiCodingOAuth = async (): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.kimiCoding();
	return ((await importOAuthModule("./kimi-coding.ts")) as { kimiCodingOAuth: OAuthAuth }).kimiCodingOAuth;
};

/**
 * Load xAI SuperGrok / X Premium OAuth.
 *
 * 加载 xAI OAuth。有 bundled 表则用之，否则动态 import。
 */
export const loadXaiOAuth = async (): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.xai();
	return ((await importOAuthModule("./xai.ts")) as { xaiOAuth: OAuthAuth }).xaiOAuth;
};

/**
 * Load Radius gateway OAuth for a named gateway.
 *
 * 按网关加载 Radius OAuth。bundled 表走工厂参数，否则动态 import 再构造。
 */
export const loadRadiusOAuth = async (options: { name: string; gateway: string }): Promise<OAuthAuth> => {
	if (bundledLoaders) return bundledLoaders.radius(options);
	return (
		(await importOAuthModule("./radius.ts")) as {
			createRadiusOAuth: (input: { name: string; gateway: string }) => OAuthAuth;
		}
	).createRadiusOAuth(options);
};
