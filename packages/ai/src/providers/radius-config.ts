/**
 * Radius gateway catalog and credential-config helpers.
 *
 * Radius 网关目录与凭证配置助手。本文件只解析/拉取 config，不造 Provider。
 */

import type { OAuthCredential } from "../auth/types.ts";
import type { Model, ThinkingLevelMap } from "../types.ts";

/**
 * Default Radius gateway origin.
 *
 * Radius 默认网关 origin。无尾斜杠。
 */
export const DEFAULT_RADIUS_GATEWAY = "https://radius.pi.dev";

/**
 * One model row as advertised by a Radius gateway config.
 *
 * 网关 config 里的一条模型。转成本地 Model 时再填 api/provider/baseUrl。
 */
export type RadiusGatewayModel = {
	id: string;
	name: string;
	reasoning: boolean;
	thinkingLevelMap?: ThinkingLevelMap;
	input: ("text" | "image")[];
	cost: Model<"pi-messages">["cost"];
	contextWindow: number;
	maxTokens: number;
};

/**
 * Gateway config: shared base URL plus advertised models.
 *
 * 网关配置。baseUrl 与模型列表成对；缺字段则整份丢弃。
 */
export type RadiusGatewayConfig = {
	baseUrl: string;
	models: RadiusGatewayModel[];
};

/**
 * OAuth credential that may carry a cached gateway config.
 *
 * 可带缓存 gatewayConfig 的 OAuth 凭证。legacy 目录导入用。
 */
export type RadiusOAuthCredential = OAuthCredential & {
	gatewayConfig?: RadiusGatewayConfig;
};

function isRadiusGatewayModel(value: unknown): value is RadiusGatewayModel {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const model = value as Partial<RadiusGatewayModel>;
	return (
		typeof model.id === "string" &&
		typeof model.name === "string" &&
		typeof model.reasoning === "boolean" &&
		Array.isArray(model.input) &&
		typeof model.cost === "object" &&
		model.cost !== null &&
		!Array.isArray(model.cost) &&
		typeof model.contextWindow === "number" &&
		typeof model.maxTokens === "number"
	);
}

function sanitizeRadiusGatewayConfig(config: unknown): RadiusGatewayConfig | undefined {
	if (typeof config !== "object" || config === null || Array.isArray(config)) return undefined;
	const { baseUrl, models } = config as Partial<RadiusGatewayConfig>;
	if (typeof baseUrl !== "string" || !Array.isArray(models)) return undefined;
	return {
		baseUrl,
		models: models.filter(isRadiusGatewayModel).map((model) => ({ ...model })),
	};
}

/**
 * Normalize a gateway URL: add https and strip trailing slashes.
 *
 * 规范化网关 URL：缺 scheme 补 https，去掉尾斜杠。
 */
export function normalizeRadiusGatewayUrl(value: string): string {
	const withScheme = /^https?:\/\//iu.test(value) ? value : `https://${value}`;
	return withScheme.replace(/\/+$/u, "");
}

/**
 * Read a sanitized gateway config from a stored OAuth credential.
 *
 * 从 OAuth 凭证取出并校验 gatewayConfig；无效则 undefined。
 */
export function getRadiusCredentialConfig(credential: OAuthCredential | undefined): RadiusGatewayConfig | undefined {
	return sanitizeRadiusGatewayConfig((credential as RadiusOAuthCredential | undefined)?.gatewayConfig);
}

/**
 * Map a gateway config into pi-messages models for a provider id.
 *
 * 把网关 config 转成该 provider 的 pi-messages 模型列表。
 */
export function getRadiusModelsFromConfig(providerId: string, config: RadiusGatewayConfig): Model<"pi-messages">[] {
	return config.models.map((model) => ({
		...model,
		api: "pi-messages",
		provider: providerId,
		baseUrl: config.baseUrl,
	}));
}

/**
 * Models from the credential's cached gateway config, or empty.
 *
 * 凭证缓存 config 里的模型；没有则空数组。
 */
export function getRadiusModels(providerId: string, credential: OAuthCredential | undefined): Model<"pi-messages">[] {
	const config = getRadiusCredentialConfig(credential);
	return config ? getRadiusModelsFromConfig(providerId, config) : [];
}

function truncateHttpBody(body: string): string {
	const trimmed = body.trim();
	return trimmed.length > 512 ? `${trimmed.slice(0, 512)}…` : trimmed;
}

/**
 * Fetch and sanitize `/v1/config` from a Radius gateway.
 *
 * 拉取网关 `/v1/config` 并校验。HTTP 失败或形状不对则抛错。
 */
export async function loadRadiusGatewayConfig(
	gateway: string,
	apiKey?: string,
	signal?: AbortSignal,
): Promise<RadiusGatewayConfig> {
	const headers: Record<string, string> = { accept: "application/json" };
	if (apiKey) headers.authorization = `Bearer ${apiKey}`;
	const response = await fetch(new URL("/v1/config", gateway), { headers, signal });
	if (!response.ok) {
		throw new Error(
			`Could not load Radius config from ${gateway}: ${response.status}: ${truncateHttpBody(await response.text())}`,
		);
	}
	const config = sanitizeRadiusGatewayConfig(await response.json());
	if (!config) throw new Error(`Invalid Radius config from ${gateway}`);
	return config;
}
