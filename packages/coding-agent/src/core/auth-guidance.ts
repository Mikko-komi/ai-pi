/**
 * User-facing login and model-selection help strings.
 *
 * 登录和选模型失败时的提示。统一指向 `/login` 和文档，不在这里做鉴权。
 */

import { join } from "node:path";
import { getDocsPath } from "../config.ts";

const UNKNOWN_PROVIDER = "unknown";

/**
 * Provider login help pointing at /login and local docs.
 *
 * 指向 `/login` 和本地文档。不检查当前是否已登录。
 */
export function getProviderLoginHelp(): string {
	return [
		"Use /login to log into a provider via OAuth or API key. See:",
		`  ${join(getDocsPath(), "providers.md")}`,
		`  ${join(getDocsPath(), "models.md")}`,
	].join("\n");
}

/**
 * Message when no models can be used.
 *
 * 没有任何可用模型时的提示。原因不在这里区分。
 */
export function formatNoModelsAvailableMessage(): string {
	return `No models available. ${getProviderLoginHelp()}`;
}

/**
 * Message when a model must still be chosen after login.
 *
 * 已提示登录后仍须 `/model` 选模型。
 */
export function formatNoModelSelectedMessage(): string {
	return `No model selected.\n\n${getProviderLoginHelp()}\n\nThen use /model to select a model.`;
}

/**
 * Message when a provider has no API key.
 *
 * `provider` 为 unknown 时改口成「当前模型」，避免对用户露出占位名。
 */
export function formatNoApiKeyFoundMessage(provider: string): string {
	const providerDisplay = provider === UNKNOWN_PROVIDER ? "the selected model" : provider;
	return `No API key found for ${providerDisplay}.\n\n${getProviderLoginHelp()}`;
}
