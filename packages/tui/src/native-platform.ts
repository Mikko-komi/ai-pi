/**
 * Optional native clipboard and modifier helpers per OS.
 *
 * 按平台加载 `.node` 剪贴板/修饰键。缺模块或非支持 OS 返回 undefined。
 */

import { createRequire } from "node:module";
import * as path from "node:path";
import { getNativeModuleCandidates } from "./native-module-path.ts";

const cjsRequire = createRequire(import.meta.url);

/**
 * Native modifier names understood by the platform helper.
 *
 * 原生层认识的修饰键名。不是终端 CSI 修饰位。
 */
export type ModifierKey = "shift" | "command" | "control" | "option";

/**
 * Native clipboard reads, and optional writes on platforms that need them.
 *
 * 系统剪贴板。undefined=不可用，null=空；传输失败才拒。Linux 写走命令行。
 */
export interface NativeClipboard {
	/** Undefined means unavailable, null means no text; transfer failures reject. */
	getText(): Promise<string | null | undefined>;
	/** Undefined means unavailable, null means no image; transfer failures reject. */
	getImage(): Promise<Uint8Array | null | undefined>;
	/** Linux uses command-line tools to retain clipboard ownership instead. */
	setText?(text: string): Promise<void>;
}

type NativePlatformHelper = NativeClipboard & {
	enableVirtualTerminalInput?: () => boolean;
	isModifierPressed?: (name: ModifierKey) => boolean;
};

// Cache module loading, not display availability: a disconnected display can recover.
const helpers = new Map<string, NativePlatformHelper | undefined>();

function loadNativePlatformHelper(platform: string, suffix = ""): NativePlatformHelper | undefined {
	const arch = process.arch;
	if (arch !== "x64" && arch !== "arm64") return undefined;
	const nativePath = path.join(
		"native",
		platform,
		"prebuilds",
		`${platform}-${arch}`,
		`${platform}-platform${suffix}.node`,
	);
	if (helpers.has(nativePath)) return helpers.get(nativePath);

	for (const modulePath of getNativeModuleCandidates(nativePath)) {
		try {
			const helper = cjsRequire(modulePath) as Partial<NativePlatformHelper> | null;
			if (typeof helper?.getText === "function" && typeof helper.getImage === "function") {
				helpers.set(nativePath, helper as NativePlatformHelper);
				return helper as NativePlatformHelper;
			}
		} catch {
			// Try the next possible packaging location.
		}
	}
	helpers.set(nativePath, undefined);
	return undefined;
}

/**
 * Load the Darwin/Windows native helper, or undefined if unavailable.
 *
 * 仅 darwin/win32 加载。架构不对或文件缺失返回 undefined。
 */
export function getNativePlatformHelper(): NativePlatformHelper | undefined {
	if (process.platform !== "darwin" && process.platform !== "win32") return undefined;
	return loadNativePlatformHelper(process.platform);
}

/**
 * Load a clipboard helper without opening the display until a read is requested.
 *
 * Linux 无 DISPLAY 直接空。非 Linux 复用平台 helper。
 */
export function getNativeClipboard(): NativeClipboard | undefined {
	if (process.platform !== "linux") return getNativePlatformHelper();
	if (!process.env.DISPLAY) return undefined;
	return loadNativePlatformHelper("linux", "-x11");
}
