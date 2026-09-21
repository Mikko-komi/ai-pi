/**
 * Type-only compatibility entry point for coding-agent extension OAuth declarations.
 *
 * 扩展 OAuth 声明的类型兼容入口。只再导出类型，本文件不定义符号。
 */

export type {
	OAuthAuthInfo,
	OAuthCredentials,
	OAuthDeviceCodeInfo,
	OAuthLoginCallbacks,
	OAuthPrompt,
	OAuthSelectOption,
	OAuthSelectPrompt,
} from "./compat/extension-oauth-types.ts";
