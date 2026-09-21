/**
 * Auth contracts: credentials, stores, login interaction, and provider auth methods.
 *
 * 鉴权合同。凭证、存储、登录交互和 Provider 的 apiKey/oauth 方法。
 */

import type { ProviderEnv, ProviderHeaders } from "../types.ts";

/**
 * Request auth for a single model request. If a value cannot be expressed as
 * `apiKey`, `headers`, or `baseUrl`, it is provider config, not auth.
 *
 * 单次请求鉴权。表达不了的东西是 Provider 配置，不是 auth。
 */
export interface ModelAuth {
	apiKey?: string;
	headers?: ProviderHeaders;
	baseUrl?: string;
}

/**
 * Stored api-key credential. `env` holds provider-scoped environment/config
 * values such as Cloudflare account/gateway ids.
 *
 * 已存的 api-key 凭证。`env` 放 Provider 范围配置（如 Cloudflare 账号）。
 */
export interface ApiKeyCredential {
	type: "api_key";
	key?: string;
	env?: ProviderEnv;
}

/**
 * OAuth token data returned by extension compatibility flows.
 *
 * 扩展兼容流返回的 OAuth token 数据。
 */
export interface OAuthCredentials {
	refresh: string;
	access: string;
	expires: number;
	[key: string]: unknown;
}

/**
 * Stored canonical OAuth credential.
 *
 * 已存的规范 OAuth 凭证。带 `type: "oauth"`。
 */
export interface OAuthCredential extends OAuthCredentials {
	type: "oauth";
}

/**
 * One type-tagged credential per provider — the shape of today's auth.json.
 *
 * 每个 Provider 一条带类型标签的凭证，即今天 auth.json 的形状。
 */
export type Credential = ApiKeyCredential | OAuthCredential;

/**
 * Non-secret credential metadata for account/status enumeration.
 *
 * 非密钥的凭证元数据，给账号/状态枚举。
 */
export interface CredentialInfo {
	providerId: string;
	type: Credential["type"];
}

/**
 * Optional cancellation for public auth and credential operations.
 *
 * 公开鉴权与凭证操作的可选取消。
 */
export interface AuthOperationOptions {
	signal?: AbortSignal;
}

/**
 * App-owned credential storage, keyed by `Provider.id`, one credential per
 * provider. `modify` is the only write path, so every mutation is a
 * serialized read-modify-write; `Models.getAuth()` runs OAuth refresh inside
 * `modify` so concurrent requests cannot double-refresh a rotated token. The
 * app persists a credential after login via
 * `modify(provider.id, async () => credential)`. Login/logout orchestration
 * is app-owned.
 *
 * Error semantics: `read` resolves `undefined` for missing entries. Methods
 * reject only on storage failure; `Models` wraps such rejections in
 * `ModelsError` with code "auth". Best-effort stores that serve an in-memory
 * view and record persistence errors internally (like coding-agent's
 * AuthStorage) are valid implementations.
 *
 * 应用持有的凭证库。按 `Provider.id` 一条；`modify` 是唯一写路径，OAuth refresh 必须在锁里跑。
 */
export interface CredentialStore {
	/**
	 * Read the stored credential, possibly expired. Display/status use;
	 * resolved request auth comes from `Models.getAuth()`.
	 */
	read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined>;

	/**
	 * List stored credential metadata without resolving or exposing secrets.
	 * Implementations must not execute configured API-key commands while listing.
	 */
	list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]>;

	/**
	 * Serialized write — the only write path. `fn` sees the current credential
	 * because correct writes (refresh, login-during-refresh) depend on it;
	 * return the new credential, or undefined to leave the entry unchanged.
	 * Mutual exclusion per provider id, cross-process too where the backing
	 * store supports it (e.g. a file lock). Resolves with the post-write
	 * credential. Rejections from `fn` propagate.
	 */
	modify(
		providerId: string,
		fn: (current: Credential | undefined) => Promise<Credential | undefined>,
		options?: AuthOperationOptions,
	): Promise<Credential | undefined>;

	/** Remove a credential (logout). Implementations serialize this against `modify`. */
	delete(providerId: string, options?: AuthOperationOptions): Promise<void>;
}

/**
 * Environment access for auth resolution. Injectable for tests and browsers.
 *
 * 鉴权解析用的环境访问。可注入，方便测试和浏览器。
 */
export interface AuthContext {
	env(name: string): Promise<string | undefined>;
	/** Check whether a file exists. Supports a leading `~`. Always false in browsers. */
	fileExists(path: string): Promise<boolean>;
}

/**
 * Result of resolving auth for a model.
 *
 * 解析出的请求鉴权。`source` 给状态 UI。
 */
export interface AuthResult {
	auth: ModelAuth;
	/** Provider-scoped environment/config values resolved from credentials and ambient context. */
	env?: ProviderEnv;
	/** Human-readable label for status UI: "ANTHROPIC_API_KEY", "OAuth", "~/.aws/credentials". */
	source?: string;
}

/**
 * Side-effect-free auth availability for status UI.
 *
 * 无副作用的鉴权可用性。给状态展示，不刷新 OAuth。
 */
export interface AuthCheck {
	source?: string;
	type: "api_key" | "oauth";
}

/**
 * Login/auth method kind a provider may expose.
 *
 * Provider 可暴露的登录/鉴权种类。
 */
export type AuthType = "api_key" | "oauth";

/**
 * Prompt shown to the user during login. `signal` lets the flow cancel a
 * pending prompt when an out-of-band event resolves the step, e.g. a
 * `manual_code` prompt raced against a callback server, aborted when the
 * callback wins.
 *
 * 登录时给用户的提示。`signal` 可在带外事件赢了时取消挂起的 prompt。
 */
export type AuthPrompt = { signal?: AbortSignal } & (
	| { type: "text"; message: string; placeholder?: string }
	| { type: "secret"; message: string; placeholder?: string }
	| { type: "select"; message: string; options: readonly { id: string; label: string; description?: string }[] }
	| { type: "manual_code"; message: string; placeholder?: string }
);

/**
 * Optional link attached to an auth info event.
 *
 * 鉴权 info 事件上的可选链接。
 */
export interface AuthInfoLink {
	url: string;
	label?: string;
}

/**
 * Progress events a login flow may emit to the UI.
 *
 * 登录流发给 UI 的进度事件。不含密钥。
 */
export type AuthEvent =
	| { type: "info"; message: string; links?: readonly AuthInfoLink[] }
	| { type: "auth_url"; url: string; instructions?: string }
	| {
			type: "device_code";
			userCode: string;
			verificationUri: string;
			intervalSeconds?: number;
			expiresInSeconds?: number;
	  }
	| { type: "progress"; message: string };

/**
 * Login interaction callbacks serving both api-key and OAuth flows.
 *
 * `prompt()` returns the entered/selected string (`select` returns the option
 * id). Rejects on cancel/abort. `signal` aborts the whole login flow;
 * per-prompt cancellation uses `AuthPrompt.signal`.
 *
 * 登录交互回调。api-key 和 OAuth 共用；`prompt` 取消则 reject。
 */
export interface AuthInteraction {
	signal?: AbortSignal;

	prompt(prompt: AuthPrompt): Promise<string>;
	notify(event: AuthEvent): void;
}

/**
 * Normalized interaction passed to provider login implementations.
 *
 * 交给 Provider login 的规范化交互。`signal` 必有。
 */
export type ProviderAuthInteraction = AuthInteraction & { signal: AbortSignal };

/**
 * Api-key auth: stored key/provider env plus ambient sources (env vars, AWS
 * profiles, ADC files). Ambient-only providers omit `login`.
 *
 * Api-key 鉴权：已存 key/环境加上环境变量、AWS、ADC。纯环境 Provider 可省略 `login`。
 */
export interface ApiKeyAuth {
	/** Display name, e.g. "Anthropic API key". */
	name: string;

	/** Interactive setup (prompt for key/provider env). Absent = ambient-only. */
	login?(interaction: ProviderAuthInteraction): Promise<ApiKeyCredential>;

	/**
	 * Optional side-effect-free availability check. Use this when `resolve()` may
	 * execute commands or perform other request-time work. Missing means Models
	 * checks availability by resolving auth.
	 */
	check?(input: {
		ctx: AuthContext;
		credential?: ApiKeyCredential;
		signal: AbortSignal;
	}): Promise<AuthCheck | undefined>;

	/**
	 * Resolve auth from the stored credential and/or ambient sources, merging
	 * per field (`credential.key ?? env("...")`, `credential.env?.NAME ?? env("...")`).
	 * undefined = not configured. Resolution is provider-scoped; model-specific
	 * endpoint preparation happens after auth has been resolved.
	 */
	resolve(input: {
		ctx: AuthContext;
		credential?: ApiKeyCredential;
		signal: AbortSignal;
	}): Promise<AuthResult | undefined>;
}

/**
 * OAuth auth. The `refresh`/`toAuth` split lets `Models` own the locked
 * refresh pattern: `refresh` produces a credential, `toAuth` derives request
 * auth from whatever credential ends up stored.
 *
 * OAuth 鉴权。`refresh` 产出凭证，`toAuth` 从已存凭证派生请求鉴权；锁由 `Models` 持有。
 */
export interface OAuthAuth {
	/** Display name, e.g. "Anthropic (Claude Pro/Max)". */
	name: string;

	/** Whether access through this auth method is backed by a provider subscription. */
	isSubscription?: boolean;

	/** Selector label for the OAuth login option, e.g. "Sign in with SuperGrok or X Premium". */
	loginLabel?: string;

	login(interaction: ProviderAuthInteraction): Promise<OAuthCredential>;

	/**
	 * Exchange the refresh token. Network call; throws on failure
	 * (invalid_grant etc.). `Models` runs this under the store lock.
	 */
	refresh(credential: OAuthCredential, signal: AbortSignal): Promise<OAuthCredential>;

	/**
	 * Side-effect-free derivation of request auth from a valid credential.
	 * Covers per-credential baseUrl (GitHub Copilot). Async so lazy wrappers
	 * can load the implementation on first use.
	 */
	toAuth(credential: OAuthCredential): Promise<ModelAuth>;
}

/**
 * Provider auth. At least one of `apiKey`/`oauth` must be present: even
 * ambient-credential providers and keyless local servers provide `apiKey`
 * auth whose `resolve()` reports whether the provider is configured.
 *
 * Provider 鉴权。`apiKey`/`oauth` 至少一个；无密钥本地服务也要有能报告是否已配置的 `apiKey`。
 */
export interface ProviderAuth {
	apiKey?: ApiKeyAuth;
	oauth?: OAuthAuth;
}
