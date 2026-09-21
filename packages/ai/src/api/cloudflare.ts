/**
 * Cloudflare Workers AI and AI Gateway base URL templates.
 *
 * 账号和网关 id 仍是占位符，调用方替换。只提供 URL，不做鉴权。
 */

/**
 * Workers AI direct endpoint.
 *
 * 直连 Workers AI。`{CLOUDFLARE_ACCOUNT_ID}` 要替换。
 */
export const CLOUDFLARE_WORKERS_AI_BASE_URL =
	"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1";

/**
 * AI Gateway Unified API. https://developers.cloudflare.com/ai-gateway/usage/unified-api/
 *
 * AI Gateway 的 /compat 统一入口。账号和网关 id 都要替换。
 */
export const CLOUDFLARE_AI_GATEWAY_COMPAT_BASE_URL =
	"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/compat";

/**
 * AI Gateway → OpenAI passthrough. Used until /compat supports /v1/responses.
 *
 * OpenAI 透传。/compat 还不能走 /v1/responses 时用这条。
 */
export const CLOUDFLARE_AI_GATEWAY_OPENAI_BASE_URL =
	"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/openai";

/**
 * AI Gateway → Anthropic passthrough.
 *
 * Anthropic 透传。账号和网关 id 都要替换。
 */
export const CLOUDFLARE_AI_GATEWAY_ANTHROPIC_BASE_URL =
	"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/anthropic";
