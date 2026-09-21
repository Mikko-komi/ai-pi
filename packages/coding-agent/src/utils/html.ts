/**
 * Decode a single HTML entity at a known offset.
 *
 * 只认 amp/lt/gt/quot/apos 和数值实体。非法码点返回 undefined。
 */

/**
 * Decoded entity text and how many source characters it consumed.
 *
 * text 是解码结果；length 含 `&` 和 `;`。
 */
export interface DecodedHtmlEntity {
	text: string;
	length: number;
}

function decodeCodePoint(codePoint: number): string | undefined {
	if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
		return undefined;
	}
	return String.fromCodePoint(codePoint);
}

/**
 * Decode a named or numeric HTML entity without the surrounding `&` `;`.
 *
 * 未知名或不合法码点返回 undefined。十六进制认 `#x` / `#X`。
 */
export function decodeHtmlEntity(entity: string): string | undefined {
	switch (entity) {
		case "amp":
			return "&";
		case "lt":
			return "<";
		case "gt":
			return ">";
		case "quot":
			return '"';
		case "apos":
			return "'";
	}

	if (entity.startsWith("#x") || entity.startsWith("#X")) {
		return decodeCodePoint(Number.parseInt(entity.slice(2), 16));
	}

	if (entity.startsWith("#")) {
		return decodeCodePoint(Number.parseInt(entity.slice(1), 10));
	}

	return undefined;
}

/**
 * Decode an HTML entity starting at `index` if it looks like `&...;`.
 *
 * 找不到 `;` 或跨度超过 16 则失败。成功时 length 包含 `&` 和 `;`。
 */
export function decodeHtmlEntityAt(html: string, index: number): DecodedHtmlEntity | undefined {
	const semicolonIndex = html.indexOf(";", index + 1);
	if (semicolonIndex === -1 || semicolonIndex - index > 16) {
		return undefined;
	}

	const entity = html.slice(index + 1, semicolonIndex);
	const decoded = decodeHtmlEntity(entity);
	if (decoded === undefined) {
		return undefined;
	}

	return { text: decoded, length: semicolonIndex - index + 1 };
}
