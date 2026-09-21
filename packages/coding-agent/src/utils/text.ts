/**
 * UTF-8 BOM helpers for decoded text.
 *
 * 只剥开头 U+FEFF。split 保留 BOM 本身，strip 丢掉。
 */

/**
 * Split a leading UTF-8 byte order mark from decoded text.
 *
 * 没有 BOM 时 bom 为空串。只看第一个码点。
 */
export function splitBom(content: string): { bom: string; text: string } {
	return content.startsWith("\uFEFF") ? { bom: "\uFEFF", text: content.slice(1) } : { bom: "", text: content };
}

/**
 * Remove a leading UTF-8 byte order mark from decoded text.
 *
 * 没有 BOM 原样返回。
 */
export function stripBom(content: string): string {
	return splitBom(content).text;
}
