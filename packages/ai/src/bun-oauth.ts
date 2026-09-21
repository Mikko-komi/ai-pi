/**
 * Static OAuth-flow registration for the standalone Bun binary.
 *
 * 独立 Bun 二进制的静态 OAuth 注册。避免打包器跟进 Node-only 动态 import。
 */

import { anthropicOAuth } from "./auth/oauth/anthropic.ts";
import { githubCopilotOAuth } from "./auth/oauth/github-copilot.ts";
import { kimiCodingOAuth } from "./auth/oauth/kimi-coding.ts";
import { registerBundledOAuthFlowLoaders } from "./auth/oauth/load.ts";
import { openaiCodexOAuth } from "./auth/oauth/openai-codex.ts";
import { openRouterOAuth } from "./auth/oauth/openrouter.ts";
import { createRadiusOAuth } from "./auth/oauth/radius.ts";
import { xaiOAuth } from "./auth/oauth/xai.ts";

/**
 * Register OAuth flows statically embedded in the standalone Bun binary.
 *
 * 注册打进 Bun 二进制的 OAuth 流。调用后 loaders 走内存表，不再动态 import。
 */
export function registerBunOAuthFlows(): void {
	registerBundledOAuthFlowLoaders({
		anthropic: () => anthropicOAuth,
		openaiCodex: () => openaiCodexOAuth,
		githubCopilot: () => githubCopilotOAuth,
		openrouter: () => openRouterOAuth,
		kimiCoding: () => kimiCodingOAuth,
		xai: () => xaiOAuth,
		radius: createRadiusOAuth,
	});
}
