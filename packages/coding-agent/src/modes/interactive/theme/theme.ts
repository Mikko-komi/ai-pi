/**
 * Interactive theme palette, loaders, and the process-wide `theme` proxy.
 *
 * 交互主题：调色板、加载和进程级 `theme` 代理。未 `initTheme` 就读 proxy 会抛。
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import {
	type EditorTheme,
	getCapabilities,
	type MarkdownTheme,
	type RgbColor,
	type SelectListTheme,
	type SettingsListTheme,
} from "@earendil-works/pi-tui";
import chalk from "chalk";
import { getCustomThemesDir, getThemesDir } from "../../../config.ts";
import type { SourceInfo } from "../../../core/source-info.ts";
import { closeWatcher, watchWithErrorHandler } from "../../../utils/fs-watch.ts";
import { highlight, supportsLanguage } from "../../../utils/syntax-highlight.ts";
import { stripBom } from "../../../utils/text.ts";

// ============================================================================
// Types & Schema
// ============================================================================

/** The schema that validates this shape lives in `theme-json.ts`; importing the type is free. */
import type { ThemeColorValue as ColorValue, ValidatedThemeJson as ThemeJson } from "./theme-json.ts";

export type { ValidatedThemeJson as ThemeJson } from "./theme-json.ts";

/**
 * Optional validator installed by interactive mode. Built-in themes skip it.
 *
 * 可选的主题 JSON 校验器。交互模式才安装；内置主题路径不强制校验。
 */
export type ThemeJsonValidator = (label: string, json: unknown) => ThemeJson;

let themeJsonValidator: ThemeJsonValidator | undefined;

/**
 * Install full theme validation. Without it, documents are accepted as-is, which is what built-in
 * themes already do: validating user-authored JSON needs typebox, and a presentation that only uses
 * built-in themes should not pay ~17 MB of module graph for it.
 *
 * 装上完整校验。不装则用户 JSON 只做浅检查；内置主题本来就不走 typebox。
 */
export function setThemeJsonValidator(validator: ThemeJsonValidator): void {
	themeJsonValidator = validator;
}

/**
 * Foreground token names a {@link Theme} can paint.
 *
 * 前景色 token。缺可选色时 Theme 用 muted/text/thinkingXhigh 回退。
 */
export type ThemeColor =
	| "accent"
	| "border"
	| "borderAccent"
	| "borderMuted"
	| "success"
	| "error"
	| "warning"
	| "muted"
	| "dim"
	| "text"
	| "thinkingText"
	| "scrollbarTrack"
	| "scrollbarThumb"
	| "searchMatchText"
	| "userMessageText"
	| "customMessageText"
	| "customMessageLabel"
	| "toolTitle"
	| "toolOutput"
	| "mdHeading"
	| "mdLink"
	| "mdLinkUrl"
	| "mdCode"
	| "mdCodeBlock"
	| "mdCodeBlockBorder"
	| "mdQuote"
	| "mdQuoteBorder"
	| "mdHr"
	| "mdListBullet"
	| "toolDiffAdded"
	| "toolDiffRemoved"
	| "toolDiffContext"
	| "syntaxComment"
	| "syntaxKeyword"
	| "syntaxFunction"
	| "syntaxVariable"
	| "syntaxString"
	| "syntaxNumber"
	| "syntaxType"
	| "syntaxOperator"
	| "syntaxPunctuation"
	| "thinkingOff"
	| "thinkingMinimal"
	| "thinkingLow"
	| "thinkingMedium"
	| "thinkingHigh"
	| "thinkingXhigh"
	| "thinkingMax"
	| "bashMode";

/**
 * Background token names a {@link Theme} can paint.
 *
 * 背景色 token。`searchMatchBg` 缺了回退 `selectedBg`。
 */
export type ThemeBg =
	| "selectedBg"
	| "searchMatchBg"
	| "userMessageBg"
	| "customMessageBg"
	| "toolPendingBg"
	| "toolSuccessBg"
	| "toolErrorBg";

type OptionalThemeColor = "scrollbarTrack" | "scrollbarThumb" | "thinkingMax" | "searchMatchText";
type OptionalThemeBg = "searchMatchBg";

type ColorMode = "truecolor" | "256color";

// ============================================================================
// Color Utilities
// ============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const cleaned = hex.replace("#", "");
	if (cleaned.length !== 6) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	const r = parseInt(cleaned.substring(0, 2), 16);
	const g = parseInt(cleaned.substring(2, 4), 16);
	const b = parseInt(cleaned.substring(4, 6), 16);
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
		throw new Error(`Invalid hex color: ${hex}`);
	}
	return { r, g, b };
}

// The 6x6x6 color cube channel values (indices 0-5)
const CUBE_VALUES = [0, 95, 135, 175, 215, 255];

// Grayscale ramp values (indices 232-255, 24 grays from 8 to 238)
const GRAY_VALUES = Array.from({ length: 24 }, (_, i) => 8 + i * 10);

function findClosestCubeIndex(value: number): number {
	let minDist = Infinity;
	let minIdx = 0;
	for (let i = 0; i < CUBE_VALUES.length; i++) {
		const dist = Math.abs(value - CUBE_VALUES[i]);
		if (dist < minDist) {
			minDist = dist;
			minIdx = i;
		}
	}
	return minIdx;
}

function findClosestGrayIndex(gray: number): number {
	let minDist = Infinity;
	let minIdx = 0;
	for (let i = 0; i < GRAY_VALUES.length; i++) {
		const dist = Math.abs(gray - GRAY_VALUES[i]);
		if (dist < minDist) {
			minDist = dist;
			minIdx = i;
		}
	}
	return minIdx;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
	// Weighted Euclidean distance (human eye is more sensitive to green)
	const dr = r1 - r2;
	const dg = g1 - g2;
	const db = b1 - b2;
	return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}

function rgbTo256(r: number, g: number, b: number): number {
	// Find closest color in the 6x6x6 cube
	const rIdx = findClosestCubeIndex(r);
	const gIdx = findClosestCubeIndex(g);
	const bIdx = findClosestCubeIndex(b);
	const cubeR = CUBE_VALUES[rIdx];
	const cubeG = CUBE_VALUES[gIdx];
	const cubeB = CUBE_VALUES[bIdx];
	const cubeIndex = 16 + 36 * rIdx + 6 * gIdx + bIdx;
	const cubeDist = colorDistance(r, g, b, cubeR, cubeG, cubeB);

	// Find closest grayscale
	const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
	const grayIdx = findClosestGrayIndex(gray);
	const grayValue = GRAY_VALUES[grayIdx];
	const grayIndex = 232 + grayIdx;
	const grayDist = colorDistance(r, g, b, grayValue, grayValue, grayValue);

	// Check if color has noticeable saturation (hue matters)
	// If max-min spread is significant, prefer cube to preserve tint
	const maxC = Math.max(r, g, b);
	const minC = Math.min(r, g, b);
	const spread = maxC - minC;

	// Only consider grayscale if color is nearly neutral (spread < 10)
	// AND grayscale is actually closer
	if (spread < 10 && grayDist < cubeDist) {
		return grayIndex;
	}

	return cubeIndex;
}

function hexTo256(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	return rgbTo256(r, g, b);
}

function fgAnsi(color: string | number, mode: ColorMode): string {
	if (color === "") return "\x1b[39m";
	if (typeof color === "number") return `\x1b[38;5;${color}m`;
	if (color.startsWith("#")) {
		if (mode === "truecolor") {
			const { r, g, b } = hexToRgb(color);
			return `\x1b[38;2;${r};${g};${b}m`;
		} else {
			const index = hexTo256(color);
			return `\x1b[38;5;${index}m`;
		}
	}
	throw new Error(`Invalid color value: ${color}`);
}

function bgAnsi(color: string | number, mode: ColorMode): string {
	if (color === "") return "\x1b[49m";
	if (typeof color === "number") return `\x1b[48;5;${color}m`;
	if (color.startsWith("#")) {
		if (mode === "truecolor") {
			const { r, g, b } = hexToRgb(color);
			return `\x1b[48;2;${r};${g};${b}m`;
		} else {
			const index = hexTo256(color);
			return `\x1b[48;5;${index}m`;
		}
	}
	throw new Error(`Invalid color value: ${color}`);
}

function resolveVarRefs(
	value: ColorValue,
	vars: Record<string, ColorValue>,
	visited = new Set<string>(),
): string | number {
	if (typeof value === "number" || value === "" || value.startsWith("#")) {
		return value;
	}
	if (visited.has(value)) {
		throw new Error(`Circular variable reference detected: ${value}`);
	}
	if (!(value in vars)) {
		throw new Error(`Variable reference not found: ${value}`);
	}
	visited.add(value);
	return resolveVarRefs(vars[value], vars, visited);
}

function resolveThemeColors<T extends Record<string, ColorValue>>(
	colors: T,
	vars: Record<string, ColorValue> = {},
): Record<keyof T, string | number> {
	const resolved: Record<string, string | number> = {};
	for (const [key, value] of Object.entries(colors)) {
		resolved[key] = resolveVarRefs(value, vars);
	}
	return resolved as Record<keyof T, string | number>;
}

function withThemeColorFallbacks(colors: ThemeJson["colors"]): ThemeJson["colors"] & {
	scrollbarTrack: ColorValue;
	scrollbarThumb: ColorValue;
	thinkingMax: ColorValue;
	searchMatchBg: ColorValue;
	searchMatchText: ColorValue;
} {
	return {
		...colors,
		scrollbarTrack: colors.scrollbarTrack ?? colors.muted,
		scrollbarThumb: colors.scrollbarThumb ?? colors.text,
		thinkingMax: colors.thinkingMax ?? colors.thinkingXhigh,
		searchMatchBg: colors.searchMatchBg ?? colors.selectedBg,
		searchMatchText: colors.searchMatchText ?? colors.text,
	};
}

// ============================================================================
// Theme Class
// ============================================================================

/**
 * Resolved ANSI palette for one theme document.
 *
 * 一份主题解析后的 ANSI 调色板。未知 token 在 fg/bg 时抛，不静默回退。
 */
export class Theme {
	readonly name?: string;
	readonly sourcePath?: string;
	sourceInfo?: SourceInfo;
	private fgColors: Map<ThemeColor, string>;
	private bgColors: Map<ThemeBg, string>;
	private mode: ColorMode;

	constructor(
		fgColors: Record<Exclude<ThemeColor, OptionalThemeColor>, string | number> &
			Partial<Record<OptionalThemeColor, string | number>>,
		bgColors: Record<Exclude<ThemeBg, OptionalThemeBg>, string | number> &
			Partial<Record<OptionalThemeBg, string | number>>,
		mode: ColorMode,
		options: { name?: string; sourcePath?: string; sourceInfo?: SourceInfo } = {},
	) {
		this.name = options.name;
		this.sourcePath = options.sourcePath;
		this.sourceInfo = options.sourceInfo;
		this.mode = mode;
		this.fgColors = new Map();
		const colors = {
			...fgColors,
			scrollbarTrack: fgColors.scrollbarTrack ?? fgColors.muted,
			scrollbarThumb: fgColors.scrollbarThumb ?? fgColors.text,
			thinkingMax: fgColors.thinkingMax ?? fgColors.thinkingXhigh,
			searchMatchText: fgColors.searchMatchText ?? fgColors.text,
		};
		for (const [key, value] of Object.entries(colors) as [ThemeColor, string | number][]) {
			this.fgColors.set(key, fgAnsi(value, mode));
		}
		this.bgColors = new Map();
		const backgrounds = {
			...bgColors,
			searchMatchBg: bgColors.searchMatchBg ?? bgColors.selectedBg,
		};
		for (const [key, value] of Object.entries(backgrounds) as [ThemeBg, string | number][]) {
			this.bgColors.set(key, bgAnsi(value, mode));
		}
	}

	fg(color: ThemeColor, text: string): string {
		const ansi = this.fgColors.get(color);
		if (!ansi) throw new Error(`Unknown theme color: ${color}`);
		return `${ansi}${text}\x1b[39m`; // Reset only foreground color
	}

	bg(color: ThemeBg, text: string): string {
		const ansi = this.bgColors.get(color);
		if (!ansi) throw new Error(`Unknown theme background color: ${color}`);
		return `${ansi}${text}\x1b[49m`; // Reset only background color
	}

	bold(text: string): string {
		return chalk.bold(text);
	}

	italic(text: string): string {
		return chalk.italic(text);
	}

	underline(text: string): string {
		return chalk.underline(text);
	}

	inverse(text: string): string {
		return chalk.inverse(text);
	}

	strikethrough(text: string): string {
		return chalk.strikethrough(text);
	}

	getFgAnsi(color: ThemeColor): string {
		const ansi = this.fgColors.get(color);
		if (!ansi) throw new Error(`Unknown theme color: ${color}`);
		return ansi;
	}

	getBgAnsi(color: ThemeBg): string {
		const ansi = this.bgColors.get(color);
		if (!ansi) throw new Error(`Unknown theme background color: ${color}`);
		return ansi;
	}

	getColorMode(): ColorMode {
		return this.mode;
	}

	getThinkingBorderColor(level: ThinkingLevel): (str: string) => string {
		// Map thinking levels to dedicated theme colors
		switch (level) {
			case "off":
				return (str: string) => this.fg("thinkingOff", str);
			case "minimal":
				return (str: string) => this.fg("thinkingMinimal", str);
			case "low":
				return (str: string) => this.fg("thinkingLow", str);
			case "medium":
				return (str: string) => this.fg("thinkingMedium", str);
			case "high":
				return (str: string) => this.fg("thinkingHigh", str);
			case "xhigh":
				return (str: string) => this.fg("thinkingXhigh", str);
			case "max":
				return (str: string) => this.fg("thinkingMax", str);
			default:
				return (str: string) => this.fg("thinkingOff", str);
		}
	}

	getBashModeBorderColor(): (str: string) => string {
		return (str: string) => this.fg("bashMode", str);
	}
}

// ============================================================================
// Theme Loading
// ============================================================================

let BUILTIN_THEMES: Record<string, ThemeJson> | undefined;

function getBuiltinThemes(): Record<string, ThemeJson> {
	if (!BUILTIN_THEMES) {
		const themesDir = getThemesDir();
		const darkPath = path.join(themesDir, "dark.json");
		const lightPath = path.join(themesDir, "light.json");
		BUILTIN_THEMES = {
			dark: JSON.parse(stripBom(fs.readFileSync(darkPath, "utf-8"))) as ThemeJson,
			light: JSON.parse(stripBom(fs.readFileSync(lightPath, "utf-8"))) as ThemeJson,
		};
	}
	return BUILTIN_THEMES;
}

/**
 * Unique theme names: built-in, custom files, then registered instances.
 *
 * 可用主题名。内置、用户文件、已登记实例去重后按名字排序。
 */
export function getAvailableThemes(): string[] {
	return getAvailableThemesWithPaths().map(({ name }) => name);
}

/**
 * Theme name plus the file it was loaded from, if any.
 *
 * 主题名和来源路径。内存登记且无 sourcePath 时 path 为 undefined。
 */
export interface ThemeInfo {
	name: string;
	path: string | undefined;
}

/**
 * {@link getAvailableThemes} plus source paths. First name wins.
 *
 * 带路径的主题列表。同名以先见到的为准：内置压过用户文件，再压过登记实例。
 */
export function getAvailableThemesWithPaths(): ThemeInfo[] {
	const themesDir = getThemesDir();
	const result: ThemeInfo[] = [];
	const seen = new Set<string>();
	const addTheme = (themeInfo: ThemeInfo) => {
		if (seen.has(themeInfo.name)) {
			return;
		}
		seen.add(themeInfo.name);
		result.push(themeInfo);
	};

	// Built-in themes
	for (const name of Object.keys(getBuiltinThemes())) {
		addTheme({ name, path: path.join(themesDir, `${name}.json`) });
	}

	// Custom themes
	for (const themeInfo of getCustomThemeInfos()) {
		addTheme(themeInfo);
	}

	for (const [name, theme] of registeredThemes.entries()) {
		addTheme({ name, path: theme.sourcePath });
	}

	return result.sort((a, b) => a.name.localeCompare(b.name));
}

function getCustomThemeInfos(): ThemeInfo[] {
	const customThemesDir = getCustomThemesDir();
	const result: ThemeInfo[] = [];
	if (!fs.existsSync(customThemesDir)) {
		return result;
	}

	for (const file of fs.readdirSync(customThemesDir)) {
		if (!file.endsWith(".json")) {
			continue;
		}
		const themePath = path.join(customThemesDir, file);
		try {
			const customTheme = loadThemeFromPath(themePath);
			if (customTheme.name) {
				result.push({ name: customTheme.name, path: themePath });
			}
		} catch {
			// Invalid themes are ignored here; the resource loader reports them
			// during normal startup/reload.
		}
	}
	return result;
}

function assertThemeNameIsValid(name: string): void {
	if (name.includes("/")) {
		throw new Error(
			`Invalid theme name "${name}": theme names cannot contain "/" because it is reserved for automatic light/dark theme settings.`,
		);
	}
}

function parseThemeJson(label: string, json: unknown): ThemeJson {
	if (themeJsonValidator) return themeJsonValidator(label, json);
	if (typeof json !== "object" || json === null || !("colors" in json)) {
		throw new Error(`Invalid theme "${label}": expected an object with a "colors" map.`);
	}
	return json as ThemeJson;
}

function parseThemeJsonContent(label: string, content: string): ThemeJson {
	let json: unknown;
	try {
		json = JSON.parse(stripBom(content));
	} catch (error) {
		throw new Error(`Failed to parse theme ${label}: ${error}`);
	}
	return parseThemeJson(label, json);
}

function loadThemeJson(name: string): ThemeJson {
	const builtinThemes = getBuiltinThemes();
	if (name in builtinThemes) {
		return builtinThemes[name];
	}
	const registeredTheme = registeredThemes.get(name);
	if (registeredTheme?.sourcePath) {
		const content = fs.readFileSync(registeredTheme.sourcePath, "utf-8");
		return parseThemeJsonContent(registeredTheme.sourcePath, content);
	}
	if (registeredTheme) {
		throw new Error(`Theme "${name}" does not have a source path for export`);
	}
	const customThemesDir = getCustomThemesDir();
	const themePath = path.join(customThemesDir, `${name}.json`);
	if (!fs.existsSync(themePath)) {
		throw new Error(`Theme not found: ${name}`);
	}
	const content = fs.readFileSync(themePath, "utf-8");
	return parseThemeJsonContent(name, content);
}

function createTheme(themeJson: ThemeJson, mode?: ColorMode, sourcePath?: string): Theme {
	const colorMode = mode ?? (getCapabilities().trueColor ? "truecolor" : "256color");
	const resolvedColors = resolveThemeColors(withThemeColorFallbacks(themeJson.colors), themeJson.vars);
	const fgColors: Record<ThemeColor, string | number> = {} as Record<ThemeColor, string | number>;
	const bgColors: Record<ThemeBg, string | number> = {} as Record<ThemeBg, string | number>;
	const bgColorKeys: Set<string> = new Set([
		"selectedBg",
		"searchMatchBg",
		"userMessageBg",
		"customMessageBg",
		"toolPendingBg",
		"toolSuccessBg",
		"toolErrorBg",
	]);
	for (const [key, value] of Object.entries(resolvedColors)) {
		if (bgColorKeys.has(key)) {
			bgColors[key as ThemeBg] = value;
		} else {
			fgColors[key as ThemeColor] = value;
		}
	}
	return new Theme(fgColors, bgColors, colorMode, {
		name: themeJson.name,
		sourcePath,
	});
}

/**
 * Load and resolve one theme JSON file into a {@link Theme}.
 *
 * 从路径加载并解析成 Theme。JSON 坏了或校验失败就抛。
 */
export function loadThemeFromPath(themePath: string, mode?: ColorMode): Theme {
	const content = fs.readFileSync(themePath, "utf-8");
	const themeJson = parseThemeJsonContent(themePath, content);
	return createTheme(themeJson, mode, themePath);
}

function loadTheme(name: string, mode?: ColorMode): Theme {
	const registeredTheme = registeredThemes.get(name);
	if (registeredTheme) {
		return registeredTheme;
	}
	const themeJson = loadThemeJson(name);
	return createTheme(themeJson, mode);
}

/**
 * Load a named theme, or undefined if it cannot be resolved.
 *
 * 按名取主题。找不到或解析失败返回 undefined，不抛。
 */
export function getThemeByName(name: string): Theme | undefined {
	try {
		return loadTheme(name);
	} catch {
		return undefined;
	}
}

/**
 * Terminal background class used to pick an auto theme.
 *
 * 终端底色档。auto 设置 `light/dark` 靠它选一边。
 */
export type TerminalTheme = "dark" | "light";

/**
 * Parse `lightName/darkName`. Extra slashes or empty sides yield undefined.
 *
 * 解析 `浅色名/深色名`。多一段 `/` 或任一侧为空都当成普通主题名，返回 undefined。
 */
export function parseAutoThemeSetting(
	themeSetting: string | undefined,
): { lightTheme: string; darkTheme: string } | undefined {
	if (!themeSetting) return undefined;
	const slashIndex = themeSetting.indexOf("/");
	if (slashIndex === -1 || themeSetting.indexOf("/", slashIndex + 1) !== -1) {
		return undefined;
	}

	const lightTheme = themeSetting.slice(0, slashIndex).trim();
	const darkTheme = themeSetting.slice(slashIndex + 1).trim();
	if (!lightTheme || !darkTheme) {
		return undefined;
	}
	return { lightTheme, darkTheme };
}

/**
 * Resolve a setting to one theme name given the current terminal class.
 *
 * 把设置收成一个主题名。auto 跟终端档走；含 `/` 但不是 auto 则 undefined。
 */
export function resolveThemeSetting(
	themeSetting: string | undefined,
	terminalTheme: TerminalTheme,
): string | undefined {
	const autoTheme = parseAutoThemeSetting(themeSetting);
	if (autoTheme) {
		return terminalTheme === "light" ? autoTheme.lightTheme : autoTheme.darkTheme;
	}
	if (themeSetting?.includes("/")) return undefined;
	if (typeof themeSetting === "string") return themeSetting;
	return undefined;
}

/**
 * Result of guessing the terminal background class.
 *
 * 终端底色探测结果。`confidence` 决定是否写回 settings。
 */
export interface TerminalThemeDetection {
	theme: TerminalTheme;
	source: "terminal background" | "COLORFGBG" | "fallback";
	detail: string;
	confidence: "high" | "low";
}

/**
 * Optional env override for COLORFGBG detection.
 *
 * COLORFGBG 探测的环境覆盖。测试可注入 env，默认 `process.env`。
 */
export interface TerminalThemeDetectionOptions {
	env?: NodeJS.ProcessEnv;
}

/**
 * TUI capability: query OSC 11 background RGB.
 *
 * 能查 OSC 11 背景色的 TUI。超时或失败由调用方回退 COLORFGBG。
 */
export interface TerminalBackgroundThemeDetector {
	queryTerminalBackgroundColor({ timeoutMs }: { timeoutMs: number }): Promise<RgbColor | undefined>;
}

/**
 * TUI capability: color-scheme query plus OSC 11 fallback.
 *
 * 能查终端 color-scheme，并回退 OSC 11 的 TUI。
 */
export interface TerminalAutoThemeDetector extends TerminalBackgroundThemeDetector {
	queryTerminalColorScheme?({ timeoutMs }: { timeoutMs: number }): Promise<TerminalTheme | undefined>;
}

/**
 * Inputs for {@link detectTerminalBackgroundTheme}.
 *
 * OSC 11 探测参数。`timeoutMs` 必须由调用方给出。
 */
export interface TerminalBackgroundThemeDetectionOptions extends TerminalThemeDetectionOptions {
	ui: TerminalBackgroundThemeDetector;
	timeoutMs: number;
}

/**
 * Inputs for {@link detectTerminalThemeForAuto}.
 *
 * auto 主题探测参数。先 color-scheme，再 OSC 11 / COLORFGBG。
 */
export interface TerminalAutoThemeDetectionOptions extends TerminalThemeDetectionOptions {
	ui: TerminalAutoThemeDetector;
	timeoutMs: number;
}

function getColorFgBgBackgroundIndex(colorfgbg: string): number | undefined {
	const parts = colorfgbg.split(";");
	for (let i = parts.length - 1; i >= 0; i--) {
		const bg = parseInt(parts[i].trim(), 10);
		if (Number.isInteger(bg) && bg >= 0 && bg <= 255) {
			return bg;
		}
	}
	return undefined;
}

function getRgbColorLuminance({ r, g, b }: RgbColor): number {
	const toLinear = (channel: number) => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getAnsiColorLuminance(index: number): number {
	return getRgbColorLuminance(hexToRgb(ansi256ToHex(index)));
}

/**
 * Classify an RGB background as light or dark by relative luminance.
 *
 * 按相对亮度把 RGB 底色分成 light/dark。阈值 0.5。
 */
export function getThemeForRgbColor(rgb: RgbColor): TerminalTheme {
	return getRgbColorLuminance(rgb) >= 0.5 ? "light" : "dark";
}

/**
 * Guess terminal class from COLORFGBG, else dark with low confidence.
 *
 * 从 COLORFGBG 猜终端档。没有可用背景索引就 dark + low confidence。
 */
export function detectTerminalBackgroundFromEnv(options: TerminalThemeDetectionOptions = {}): TerminalThemeDetection {
	const env = options.env ?? process.env;
	const colorfgbg = env.COLORFGBG || "";
	const bg = getColorFgBgBackgroundIndex(colorfgbg);
	if (bg !== undefined) {
		return {
			theme: getAnsiColorLuminance(bg) >= 0.5 ? "light" : "dark",
			source: "COLORFGBG",
			detail: `background color index ${bg}`,
			confidence: "high",
		};
	}

	return {
		theme: "dark",
		source: "fallback",
		detail: "no terminal background hint found",
		confidence: "low",
	};
}

/**
 * Query OSC 11, then fall back to {@link detectTerminalBackgroundFromEnv}.
 *
 * 先问 OSC 11，失败再走 COLORFGBG。查询抛错不当失败，只降级。
 */
export async function detectTerminalBackgroundTheme({
	ui,
	timeoutMs,
	env,
}: TerminalBackgroundThemeDetectionOptions): Promise<TerminalThemeDetection> {
	try {
		const rgb = await ui.queryTerminalBackgroundColor({ timeoutMs });
		if (rgb) {
			return {
				theme: getThemeForRgbColor(rgb),
				source: "terminal background",
				detail: `OSC 11 background rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
				confidence: "high",
			};
		}
	} catch {
		// Fall back to environment-based detection when the terminal query fails.
	}

	return detectTerminalBackgroundFromEnv({ env });
}

/**
 * Prefer the terminal color-scheme query, then OSC 11 / COLORFGBG.
 *
 * auto 用的终端档。color-scheme 有结果就用；否则等并行的背景探测。
 */
export async function detectTerminalThemeForAuto({
	ui,
	timeoutMs,
	env,
}: TerminalAutoThemeDetectionOptions): Promise<TerminalTheme> {
	let colorSchemePromise: Promise<TerminalTheme | undefined> | undefined;
	try {
		colorSchemePromise = ui.queryTerminalColorScheme?.({ timeoutMs });
	} catch {
		// Fall back to OSC 11 / COLORFGBG detection when starting the color-scheme query fails.
	}
	const backgroundThemePromise = detectTerminalBackgroundTheme({ ui, timeoutMs, env });

	try {
		const colorScheme = await colorSchemePromise;
		if (colorScheme) return colorScheme;
	} catch {
		// Fall back to the concurrently queried OSC 11 / COLORFGBG detection.
	}
	return (await backgroundThemePromise).theme;
}

/**
 * Default theme name from env detection (`dark` or `light`).
 *
 * 默认主题名，等于环境探测出的终端档。
 */
export function getDefaultTheme(): string {
	return detectTerminalBackgroundFromEnv().theme;
}

// ============================================================================
// Global Theme Instance
// ============================================================================

// Use globalThis to share theme across module loaders (tsx + jiti in dev mode)
const THEME_KEY = Symbol.for("@earendil-works/pi-coding-agent:theme");
const THEME_KEY_OLD = Symbol.for("@mariozechner/pi-coding-agent:theme");

/**
 * Process-wide current {@link Theme}. Shared across tsx/jiti loaders via globalThis.
 *
 * 进程级当前主题。tsx/jiti 多实例靠 globalThis 共享；未 init 就读会抛。
 */
export const theme: Theme = new Proxy({} as Theme, {
	get(_target, prop) {
		const t = (globalThis as Record<symbol, Theme>)[THEME_KEY];
		if (!t) throw new Error("Theme not initialized. Call initTheme() first.");
		return (t as unknown as Record<string | symbol, unknown>)[prop];
	},
});

function setGlobalTheme(t: Theme): void {
	(globalThis as Record<symbol, Theme>)[THEME_KEY] = t;
	(globalThis as Record<symbol, Theme>)[THEME_KEY_OLD] = t;
}

let currentThemeName: string | undefined;
let themeWatcher: fs.FSWatcher | undefined;
let themeReloadTimer: NodeJS.Timeout | undefined;
let onThemeChangeCallback: (() => void) | undefined;
const registeredThemes = new Map<string, Theme>();

/**
 * Replace the in-memory theme registry. Names must not contain `/`.
 *
 * 整表替换内存主题登记。无名实例丢掉；名字含 `/` 立刻抛。
 */
export function setRegisteredThemes(themes: Theme[]): void {
	registeredThemes.clear();
	for (const theme of themes) {
		if (theme.name) {
			assertThemeNameIsValid(theme.name);
			registeredThemes.set(theme.name, theme);
		}
	}
}

/**
 * Load the named theme into {@link theme}. Invalid names fall back to `dark`.
 *
 * 把命名主题装进全局 proxy。失败静默回退 dark，且不为回退主题开 watcher。
 */
export function initTheme(themeName?: string, enableWatcher: boolean = false): void {
	const name = themeName ?? getDefaultTheme();
	currentThemeName = name;
	try {
		setGlobalTheme(loadTheme(name));
		if (enableWatcher) {
			startThemeWatcher();
		}
	} catch (_error) {
		// Theme is invalid - fall back to dark theme silently
		currentThemeName = "dark";
		setGlobalTheme(loadTheme("dark"));
		// Don't start watcher for fallback theme
	}
}

/**
 * Switch {@link theme} and notify the change callback. Failure still lands on `dark`.
 *
 * 切换全局主题并通知回调。失败也落到 dark，返回 error 字符串。
 */
export function setTheme(name: string, enableWatcher: boolean = false): { success: boolean; error?: string } {
	currentThemeName = name;
	try {
		setGlobalTheme(loadTheme(name));
		if (enableWatcher) {
			startThemeWatcher();
		}
		if (onThemeChangeCallback) {
			onThemeChangeCallback();
		}
		return { success: true };
	} catch (error) {
		// Theme is invalid - fall back to dark theme
		currentThemeName = "dark";
		setGlobalTheme(loadTheme("dark"));
		// Don't start watcher for fallback theme
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Install an already-built Theme and stop the file watcher.
 *
 * 装入现成 Theme 实例并停掉文件 watcher。名字记成 `<in-memory>`。
 */
export function setThemeInstance(themeInstance: Theme): void {
	setGlobalTheme(themeInstance);
	currentThemeName = "<in-memory>";
	stopThemeWatcher(); // Can't watch a direct instance
	if (onThemeChangeCallback) {
		onThemeChangeCallback();
	}
}

/**
 * Replace the single theme-change listener used to invalidate the TUI.
 *
 * 替换唯一的主题变更监听。后一次覆盖前一次，不是多播。
 */
export function onThemeChange(callback: () => void): void {
	onThemeChangeCallback = callback;
}

function startThemeWatcher(): void {
	stopThemeWatcher();

	// Only watch if it's a custom theme (not built-in)
	if (!currentThemeName || currentThemeName === "dark" || currentThemeName === "light") {
		return;
	}

	const customThemesDir = getCustomThemesDir();
	const watchedThemeName = currentThemeName;
	const watchedFileName = `${watchedThemeName}.json`;
	const themeFile = path.join(customThemesDir, watchedFileName);

	// Only watch if the file exists
	if (!fs.existsSync(themeFile)) {
		return;
	}

	const scheduleReload = () => {
		if (themeReloadTimer) {
			clearTimeout(themeReloadTimer);
		}
		themeReloadTimer = setTimeout(() => {
			themeReloadTimer = undefined;

			// Ignore stale timers after switching themes or stopping the watcher
			if (currentThemeName !== watchedThemeName) {
				return;
			}

			// Keep the last successfully loaded theme active if the file is temporarily missing
			if (!fs.existsSync(themeFile)) {
				return;
			}

			try {
				// Reload the theme from disk and refresh the registry cache
				const reloadedTheme = loadThemeFromPath(themeFile);
				registeredThemes.set(watchedThemeName, reloadedTheme);
				setGlobalTheme(reloadedTheme);
				// Notify callback (to invalidate UI)
				if (onThemeChangeCallback) {
					onThemeChangeCallback();
				}
			} catch (_error) {
				// Ignore errors (file might be in invalid state while being edited)
			}
		}, 100);
	};

	themeWatcher =
		watchWithErrorHandler(
			customThemesDir,
			(_eventType, filename) => {
				if (currentThemeName !== watchedThemeName) {
					return;
				}
				if (!filename) {
					scheduleReload();
					return;
				}
				if (filename !== watchedFileName) {
					return;
				}
				scheduleReload();
			},
			() => {
				closeWatcher(themeWatcher);
				themeWatcher = undefined;
			},
		) ?? undefined;
}

/**
 * Drop the custom-theme file watcher and any pending reload timer.
 *
 * 停掉自定义主题文件 watcher 和待触发的 reload。内置主题本来就不监视。
 */
export function stopThemeWatcher(): void {
	if (themeReloadTimer) {
		clearTimeout(themeReloadTimer);
		themeReloadTimer = undefined;
	}
	closeWatcher(themeWatcher);
	themeWatcher = undefined;
}

// ============================================================================
// HTML Export Helpers
// ============================================================================

/**
 * Convert a 256-color index to hex string.
 * Indices 0-15: basic colors (approximate)
 * Indices 16-231: 6x6x6 color cube
 * Indices 232-255: grayscale ramp
 */
function ansi256ToHex(index: number): string {
	// Basic colors (0-15) - approximate common terminal values
	const basicColors = [
		"#000000",
		"#800000",
		"#008000",
		"#808000",
		"#000080",
		"#800080",
		"#008080",
		"#c0c0c0",
		"#808080",
		"#ff0000",
		"#00ff00",
		"#ffff00",
		"#0000ff",
		"#ff00ff",
		"#00ffff",
		"#ffffff",
	];
	if (index < 16) {
		return basicColors[index];
	}

	// Color cube (16-231): 6x6x6 = 216 colors
	if (index < 232) {
		const cubeIndex = index - 16;
		const r = Math.floor(cubeIndex / 36);
		const g = Math.floor((cubeIndex % 36) / 6);
		const b = cubeIndex % 6;
		const toHex = (n: number) => (n === 0 ? 0 : 55 + n * 40).toString(16).padStart(2, "0");
		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}

	// Grayscale (232-255): 24 shades
	const gray = 8 + (index - 232) * 10;
	const grayHex = gray.toString(16).padStart(2, "0");
	return `#${grayHex}${grayHex}${grayHex}`;
}

/**
 * Get resolved theme colors as CSS-compatible hex strings.
 * Used by HTML export to generate CSS custom properties.
 *
 * 解析成 CSS hex。256 色转 hex；空串按主题名猜默认正文色。
 */
export function getResolvedThemeColors(themeName?: string): Record<string, string> {
	const name = themeName ?? currentThemeName ?? getDefaultTheme();
	const isLight = name === "light";
	const themeJson = loadThemeJson(name);
	const resolved = resolveThemeColors(withThemeColorFallbacks(themeJson.colors), themeJson.vars);

	// Default text color for empty values (terminal uses default fg color)
	const defaultText = isLight ? "#000000" : "#e5e5e7";

	const cssColors: Record<string, string> = {};
	for (const [key, value] of Object.entries(resolved)) {
		if (typeof value === "number") {
			cssColors[key] = ansi256ToHex(value);
		} else if (value === "") {
			// Empty means default terminal color - use sensible fallback for HTML
			cssColors[key] = defaultText;
		} else {
			cssColors[key] = value;
		}
	}
	return cssColors;
}

/**
 * Check if a theme is a "light" theme (for CSS that needs light/dark variants).
 *
 * 是否名为 `light`。只看名字，不分析颜色。
 */
export function isLightTheme(themeName?: string): boolean {
	// Currently just check the name - could be extended to analyze colors
	return themeName === "light";
}

/**
 * Get explicit export colors from theme JSON, if specified.
 * Returns undefined for each color that isn't explicitly set.
 *
 * 主题 JSON 里显式写的导出色。缺段或加载失败返回空对象，不抛。
 */
export function getThemeExportColors(themeName?: string): {
	pageBg?: string;
	cardBg?: string;
	infoBg?: string;
} {
	const name = themeName ?? currentThemeName ?? getDefaultTheme();
	try {
		const themeJson = loadThemeJson(name);
		const exportSection = themeJson.export;
		if (!exportSection) return {};

		const vars = themeJson.vars ?? {};
		const resolve = (value: ColorValue | undefined): string | undefined => {
			if (value === undefined) return undefined;
			const resolved = resolveVarRefs(value, vars);
			if (typeof resolved === "number") return ansi256ToHex(resolved);
			if (resolved === "") return undefined;
			return resolved;
		};

		return {
			pageBg: resolve(exportSection.pageBg),
			cardBg: resolve(exportSection.cardBg),
			infoBg: resolve(exportSection.infoBg),
		};
	} catch {
		return {};
	}
}

// ============================================================================
// TUI Helpers
// ============================================================================

type CliHighlightTheme = Record<string, (s: string) => string>;

let cachedHighlightThemeFor: Theme | undefined;
let cachedCliHighlightTheme: CliHighlightTheme | undefined;

function buildCliHighlightTheme(t: Theme): CliHighlightTheme {
	return {
		keyword: (s: string) => t.fg("syntaxKeyword", s),
		built_in: (s: string) => t.fg("syntaxType", s),
		literal: (s: string) => t.fg("syntaxNumber", s),
		number: (s: string) => t.fg("syntaxNumber", s),
		regexp: (s: string) => t.fg("syntaxString", s),
		string: (s: string) => t.fg("syntaxString", s),
		comment: (s: string) => t.fg("syntaxComment", s),
		doctag: (s: string) => t.fg("syntaxComment", s),
		meta: (s: string) => t.fg("muted", s),
		function: (s: string) => t.fg("syntaxFunction", s),
		title: (s: string) => t.fg("syntaxFunction", s),
		class: (s: string) => t.fg("syntaxType", s),
		type: (s: string) => t.fg("syntaxType", s),
		tag: (s: string) => t.fg("syntaxPunctuation", s),
		name: (s: string) => t.fg("syntaxKeyword", s),
		attr: (s: string) => t.fg("syntaxVariable", s),
		variable: (s: string) => t.fg("syntaxVariable", s),
		params: (s: string) => t.fg("syntaxVariable", s),
		operator: (s: string) => t.fg("syntaxOperator", s),
		punctuation: (s: string) => t.fg("syntaxPunctuation", s),
		emphasis: (s: string) => t.italic(s),
		strong: (s: string) => t.bold(s),
		link: (s: string) => t.underline(s),
		addition: (s: string) => t.fg("toolDiffAdded", s),
		deletion: (s: string) => t.fg("toolDiffRemoved", s),
	};
}

function getCliHighlightTheme(t: Theme): CliHighlightTheme {
	if (cachedHighlightThemeFor !== t || !cachedCliHighlightTheme) {
		cachedHighlightThemeFor = t;
		cachedCliHighlightTheme = buildCliHighlightTheme(t);
	}
	return cachedCliHighlightTheme;
}

/**
 * Highlight code with syntax coloring based on file extension or language.
 * Returns array of highlighted lines.
 *
 * 按语言高亮，返回行数组。未知语言不自动探测，整段用 mdCodeBlock 色。
 */
export function highlightCode(code: string, lang?: string): string[] {
	// Validate language before highlighting to avoid stderr spam from cli-highlight
	const validLang = lang && supportsLanguage(lang) ? lang : undefined;
	// Skip highlighting when no valid language is specified. cli-highlight's
	// auto-detection is unreliable and can misidentify prose as AppleScript,
	// LiveCodeServer, etc., coloring random English words as keywords.
	if (!validLang) {
		return code.split("\n").map((line) => theme.fg("mdCodeBlock", line));
	}
	const opts = {
		language: validLang,
		ignoreIllegals: true,
		theme: getCliHighlightTheme(theme),
	};
	try {
		return highlight(code, opts).split("\n");
	} catch {
		return code.split("\n");
	}
}

/**
 * Get language identifier from file path extension.
 *
 * 从扩展名映射 highlight 语言 id。不认识的扩展返回 undefined。
 */
export function getLanguageFromPath(filePath: string): string | undefined {
	const ext = filePath.split(".").pop()?.toLowerCase();
	if (!ext) return undefined;

	const extToLang: Record<string, string> = {
		ts: "typescript",
		tsx: "typescript",
		js: "javascript",
		jsx: "javascript",
		mjs: "javascript",
		cjs: "javascript",
		py: "python",
		rb: "ruby",
		rs: "rust",
		go: "go",
		java: "java",
		kt: "kotlin",
		swift: "swift",
		c: "c",
		h: "c",
		cpp: "cpp",
		cc: "cpp",
		cxx: "cpp",
		hpp: "cpp",
		cs: "csharp",
		php: "php",
		sh: "bash",
		bash: "bash",
		zsh: "bash",
		fish: "fish",
		ps1: "powershell",
		sql: "sql",
		html: "html",
		htm: "html",
		css: "css",
		scss: "scss",
		sass: "sass",
		less: "less",
		json: "json",
		yaml: "yaml",
		yml: "yaml",
		toml: "toml",
		xml: "xml",
		md: "markdown",
		markdown: "markdown",
		dockerfile: "dockerfile",
		makefile: "makefile",
		cmake: "cmake",
		lua: "lua",
		perl: "perl",
		r: "r",
		scala: "scala",
		clj: "clojure",
		ex: "elixir",
		exs: "elixir",
		erl: "erlang",
		hs: "haskell",
		ml: "ocaml",
		vim: "vim",
		graphql: "graphql",
		proto: "protobuf",
		tf: "hcl",
		hcl: "hcl",
	};

	return extToLang[ext];
}

/**
 * Markdown renderer theme bound to the current {@link theme} proxy.
 *
 * 当前全局主题下的 Markdown 配色。代码高亮同样禁止自动语言探测。
 */
export function getMarkdownTheme(): MarkdownTheme {
	return {
		heading: (text: string) => theme.fg("mdHeading", text),
		link: (text: string) => theme.fg("mdLink", text),
		linkUrl: (text: string) => theme.fg("mdLinkUrl", text),
		code: (text: string) => theme.fg("mdCode", text),
		codeBlock: (text: string) => theme.fg("mdCodeBlock", text),
		codeBlockBorder: (text: string) => theme.fg("mdCodeBlockBorder", text),
		quote: (text: string) => theme.fg("mdQuote", text),
		quoteBorder: (text: string) => theme.fg("mdQuoteBorder", text),
		hr: (text: string) => theme.fg("mdHr", text),
		listBullet: (text: string) => theme.fg("mdListBullet", text),
		bold: (text: string) => theme.bold(text),
		italic: (text: string) => theme.italic(text),
		underline: (text: string) => theme.underline(text),
		strikethrough: (text: string) => chalk.strikethrough(text),
		highlightCode: (code: string, lang?: string): string[] => {
			// Validate language before highlighting to avoid stderr spam from cli-highlight
			const validLang = lang && supportsLanguage(lang) ? lang : undefined;
			// Skip highlighting when no valid language is specified. cli-highlight's
			// auto-detection is unreliable and can misidentify prose as AppleScript,
			// LiveCodeServer, etc., coloring random English words as keywords.
			if (!validLang) {
				return code.split("\n").map((line) => theme.fg("mdCodeBlock", line));
			}
			const opts = {
				language: validLang,
				ignoreIllegals: true,
				theme: getCliHighlightTheme(theme),
			};
			try {
				return highlight(code, opts).split("\n");
			} catch {
				return code.split("\n").map((line) => theme.fg("mdCodeBlock", line));
			}
		},
	};
}

/**
 * Select-list colors bound to the current {@link theme} proxy.
 *
 * 当前全局主题下的选择列表配色。
 */
export function getSelectListTheme(): SelectListTheme {
	return {
		selectedPrefix: (text: string) => theme.fg("accent", text),
		selectedText: (text: string) => theme.fg("accent", text),
		description: (text: string) => theme.fg("muted", text),
		scrollInfo: (text: string) => theme.fg("muted", text),
		noMatch: (text: string) => theme.fg("muted", text),
	};
}

/**
 * Editor chrome colors, including the nested select-list theme.
 *
 * 编辑器边框和嵌套选择列表的配色。
 */
export function getEditorTheme(): EditorTheme {
	return {
		borderColor: (text: string) => theme.fg("borderMuted", text),
		selectList: getSelectListTheme(),
	};
}

/**
 * Settings-list colors bound to the current {@link theme} proxy.
 *
 * 当前全局主题下的设置列表配色。
 */
export function getSettingsListTheme(): SettingsListTheme {
	return {
		label: (text: string, selected: boolean) => (selected ? theme.fg("accent", text) : text),
		value: (text: string, selected: boolean) => (selected ? theme.fg("accent", text) : theme.fg("muted", text)),
		description: (text: string) => theme.fg("dim", text),
		cursor: theme.fg("accent", "→ "),
		hint: (text: string) => theme.fg("dim", text),
	};
}
