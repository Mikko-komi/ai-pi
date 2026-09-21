/**
 * OSC 11 / color-scheme report parsers for terminal theme detection.
 *
 * 解析终端回的背景色和明暗方案。格式不对返回 undefined。
 */

/**
 * 0–255 sRGB triple from an OSC 11 background reply.
 *
 * OSC 11 解析出的 RGB。通道已归一到 0–255。
 */
export interface RgbColor {
	r: number;
	g: number;
	b: number;
}

/**
 * Light vs dark scheme reported by the terminal.
 *
 * 终端自报的明暗。不是自己算亮度。
 */
export type TerminalColorScheme = "dark" | "light";

function hexToRgb(hex: string): RgbColor {
	const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
	const r = parseInt(normalized.slice(0, 2), 16);
	const g = parseInt(normalized.slice(2, 4), 16);
	const b = parseInt(normalized.slice(4, 6), 16);
	return { r, g, b };
}

function parseOscHexChannel(channel: string): number | undefined {
	if (!/^[0-9a-f]+$/i.test(channel)) {
		return undefined;
	}
	const max = 16 ** channel.length - 1;
	if (max <= 0) {
		return undefined;
	}
	return Math.round((parseInt(channel, 16) / max) * 255);
}

const OSC11_BACKGROUND_COLOR_RESPONSE_PATTERN = /^\x1b\]11;([^\x07\x1b]*)(?:\x07|\x1b\\)$/i;
const COLOR_SCHEME_REPORT_PATTERN = /^(?:\x1b\[\?997;(1|2)n)+$/;

/**
 * Whether `data` is a complete OSC 11 background-color reply.
 *
 * 是否整段 OSC 11 背景色应答。只判形，不解析值。
 */
export function isOsc11BackgroundColorResponse(data: string): boolean {
	return OSC11_BACKGROUND_COLOR_RESPONSE_PATTERN.test(data);
}

/**
 * Parse OSC 11 `#rrggbb`, `#rrrrggggbbbb`, or `rgb:r/g/b` into 8-bit RGB.
 *
 * 解析 OSC 11 颜色值。对不上或通道非法返回 undefined。
 */
export function parseOsc11BackgroundColor(data: string): RgbColor | undefined {
	const match = data.match(OSC11_BACKGROUND_COLOR_RESPONSE_PATTERN);
	if (!match) {
		return undefined;
	}

	const value = match[1].trim();
	if (value.startsWith("#")) {
		const hex = value.slice(1);
		if (/^[0-9a-f]{6}$/i.test(hex)) {
			return hexToRgb(value);
		}
		if (/^[0-9a-f]{12}$/i.test(hex)) {
			const r = parseOscHexChannel(hex.slice(0, 4));
			const g = parseOscHexChannel(hex.slice(4, 8));
			const b = parseOscHexChannel(hex.slice(8, 12));
			return r !== undefined && g !== undefined && b !== undefined ? { r, g, b } : undefined;
		}
		return undefined;
	}

	const rgbValue = value.replace(/^rgba?:/i, "");
	const [red, green, blue] = rgbValue.split("/");
	if (red === undefined || green === undefined || blue === undefined) {
		return undefined;
	}
	const r = parseOscHexChannel(red);
	const g = parseOscHexChannel(green);
	const b = parseOscHexChannel(blue);
	return r !== undefined && g !== undefined && b !== undefined ? { r, g, b } : undefined;
}

/**
 * Parse a CSI `?997;1|2n` color-scheme report into dark or light.
 *
 * 解析 `?997` 方案报告。`2` 为 light，其余匹配为 dark。
 */
export function parseTerminalColorSchemeReport(data: string): TerminalColorScheme | undefined {
	const match = data.match(COLOR_SCHEME_REPORT_PATTERN);
	if (!match) {
		return undefined;
	}
	return match[1] === "2" ? "light" : "dark";
}
