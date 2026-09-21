/**
 * Legacy OAuth prompt types retained for coding-agent extension compatibility.
 *
 * 旧扩展 OAuth 类型。只为兼容保留；新代码走现有 auth 事件，不新增回调。
 */

import type { OAuthCredentials } from "../auth/types.ts";

/**
 * Legacy extension OAuth prompt.
 *
 * 文本提问。allowEmpty 为真才接受空串。
 */
export interface OAuthPrompt {
	message: string;
	placeholder?: string;
	allowEmpty?: boolean;
}

/**
 * Legacy extension OAuth authorization link.
 *
 * 打开浏览器的 URL；instructions 可选。
 */
export interface OAuthAuthInfo {
	url: string;
	instructions?: string;
}

/**
 * Legacy extension OAuth device-code notification.
 *
 * 设备码展示。过期/轮询间隔可选。
 */
export interface OAuthDeviceCodeInfo {
	userCode: string;
	verificationUri: string;
	intervalSeconds?: number;
	expiresInSeconds?: number;
}

/**
 * One option in a legacy OAuth select prompt.
 *
 * 选择项。id 回传，label 展示。
 */
export interface OAuthSelectOption {
	id: string;
	label: string;
}

/**
 * Legacy OAuth multi-option prompt.
 *
 * 多选项提问。options 不能空到无法选。
 */
export interface OAuthSelectPrompt {
	message: string;
	options: OAuthSelectOption[];
}

/**
 * Callback surface retained only for coding-agent extension compatibility.
 *
 * 登录过程回调。signal 取消整次登录；可选方法缺省时扩展必须能降级。
 */
export interface OAuthLoginCallbacks {
	onAuth(info: OAuthAuthInfo): void;
	onDeviceCode(info: OAuthDeviceCodeInfo): void;
	onPrompt(prompt: OAuthPrompt): Promise<string>;
	onProgress?(message: string): void;
	onManualCodeInput?(): Promise<string>;
	onSelect(prompt: OAuthSelectPrompt): Promise<string | undefined>;
	signal?: AbortSignal;
}

export type { OAuthCredentials };
