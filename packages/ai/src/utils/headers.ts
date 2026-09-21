/**
 * Convert Headers and ProviderHeaders into plain records.
 *
 * 转成普通记录。ProviderHeaders 的 null 值丢掉；空记录变 undefined。
 */

import type { ProviderHeaders } from "../types.ts";

/**
 * Copy a Headers object into a plain string record.
 *
 * 逐条拷进普通对象。保留原始大小写键。
 */
export function headersToRecord(headers: Headers): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of headers.entries()) {
		result[key] = value;
	}
	return result;
}

/**
 * Drop null ProviderHeaders values; return undefined when nothing remains.
 *
 * undefined 输入原样。全是 null 则返回 undefined。
 */
export function providerHeadersToRecord(headers: ProviderHeaders | undefined): Record<string, string> | undefined {
	if (!headers) return undefined;
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value !== null) result[key] = value;
	}
	return Object.keys(result).length > 0 ? result : undefined;
}
