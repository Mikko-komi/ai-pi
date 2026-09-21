/**
 * Provider readiness checks used by `pi auth check`.
 *
 * `auth check` 的就绪探测。失败收成 status/reason，不把 refresh 异常抛给 CLI。
 */

import type { CredentialStore } from "@earendil-works/pi-ai";
import { resolveCliModel } from "../core/model-resolver.ts";
import { ModelRuntime } from "../core/model-runtime.ts";
import { InMemoryCodingAgentModelsStore } from "../core/models-store.ts";
import type { Args } from "./args.ts";
import { AuthCommandError, getAuthCredential, validateAuthCommandArgs } from "./auth-command.ts";

/**
 * Outcome class for {@link checkProviderAuth}.
 *
 * 探测结果档。`invalid` 只表示 runtime 或 checkAuth 自身坏了。
 */
export type AuthCheckStatus = "ready" | "not_ready" | "invalid";

/**
 * Why a provider is not ready or is invalid.
 *
 * 未就绪或无效的原因。`credential_not_available` 留给读凭证失败，check 路径主要用前三项。
 */
export type AuthCheckReason =
	| "provider_not_found"
	| "credentials_not_configured"
	| "credential_not_available"
	| "invalid_state";

/**
 * Structured result of one provider auth check.
 *
 * 一次探测的结构化结果。`ready` 时才带 `authType`。
 */
export interface AuthCheckResult {
	status: AuthCheckStatus;
	provider: string;
	reason?: AuthCheckReason;
	authType?: "api_key" | "oauth";
}

/**
 * Resolve `--provider`/`--model` and report whether that provider can authenticate.
 *
 * 解析 provider 并探测凭证。缺 provider、模型对不上会抛 AuthCommandError；其余收成 status。
 */
export async function checkProviderAuth(
	args: Args,
	modelRuntime: ModelRuntime,
	options: { refresh: boolean } = { refresh: false },
): Promise<AuthCheckResult> {
	const { provider: cliProvider, model: cliModel } = validateAuthCommandArgs(args, "check");
	let provider = cliProvider;
	if (cliModel) {
		const resolved = resolveCliModel({ cliProvider, cliModel, modelRuntime });
		if (resolved.error || !resolved.model) {
			throw new AuthCommandError(resolved.error ?? `Unable to resolve model "${cliModel}"`);
		}
		provider = resolved.model.provider;
	}
	if (!provider) throw new AuthCommandError("Unable to resolve an auth provider");
	if (modelRuntime.getError()) {
		return { status: "invalid", provider, reason: "invalid_state" };
	}
	if (!modelRuntime.getProvider(provider)) {
		return { status: "not_ready", provider, reason: "provider_not_found" };
	}
	try {
		const auth = await modelRuntime.checkAuth(provider);
		if (!auth) return { status: "not_ready", provider, reason: "credentials_not_configured" };
		if (options.refresh && !(await modelRuntime.getAuth(provider))) {
			return { status: "not_ready", provider, reason: "credentials_not_configured" };
		}
		return { status: "ready", provider, authType: auth.type };
	} catch {
		return { status: "invalid", provider, reason: "invalid_state" };
	}
}

/**
 * Read one provider secret, optionally going through refresh.
 *
 * 读一个 provider 的密钥。不 refresh 时 OAuth 直接用已存 access；refresh 走 `getAuth`。
 */
export async function getProviderCredential(
	providerId: string,
	modelRuntime: ModelRuntime,
	credentials: CredentialStore,
	options: { refresh: boolean },
): Promise<string | undefined> {
	const credential = await credentials.read(providerId);
	if (!options.refresh && credential?.type === "oauth") return credential.access;
	return getAuthCredential(await modelRuntime.getAuth(providerId));
}

/**
 * Build a network-silent ModelRuntime for auth CLI subcommands.
 *
 * 给 auth 子命令建不拉网的 ModelRuntime。不 refresh、不写 models.json。
 */
export async function createAuthCheckModelRuntime(credentials: CredentialStore): Promise<ModelRuntime> {
	return ModelRuntime.create({
		credentials,
		modelsStore: new InMemoryCodingAgentModelsStore(),
		allowModelNetwork: false,
		refreshOnCreate: false,
	});
}
