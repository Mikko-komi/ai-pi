/**
 * Product install detection and path helpers for package assets and `~/.pi/agent`.
 *
 * 产品安装探测和路径。包内资源跟发行形态走；用户配置跟 `APP_NAME` / 环境变量走。
 */

import { accessSync, constants, existsSync, readFileSync, realpathSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join, resolve, sep, win32 } from "path";
import { fileURLToPath } from "url";
import { spawnProcessSync } from "./utils/child-process.ts";
import { normalizePath } from "./utils/paths.ts";
import { stripBom } from "./utils/text.ts";

// =============================================================================
// Package Detection
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect if we're running as a Bun compiled binary.
 * Bun binaries have import.meta.url containing "$bunfs", "~BUN", or "%7EBUN" (Bun's virtual filesystem path)
 *
 * 是否 Bun 编译二进制。只看 `import.meta.url` 的虚拟文件系统标记。
 */
export const isBunBinary =
	import.meta.url.includes("$bunfs") || import.meta.url.includes("~BUN") || import.meta.url.includes("%7EBUN");

/**
 * Detect if Bun is the runtime (compiled binary or bun run)
 *
 * 是否 Bun 运行时。编译二进制和 `bun run` 都算。
 */
export const isBunRuntime = !!process.versions.bun;

declare const PI_BUNDLED_NODE: boolean;
/**
 * Detect the esbuild-bundled Node.js distribution.
 *
 * 是否 esbuild 打好的 Node 发行。编译期注入 `PI_BUNDLED_NODE`，未定义则 false。
 */
export const isBundledNode = typeof PI_BUNDLED_NODE !== "undefined" && PI_BUNDLED_NODE;

// =============================================================================
// Install Method Detection
// =============================================================================

/**
 * How this binary was installed, used to pick a self-update command.
 *
 * 安装途径。用来选自我更新命令；认不出就是 `unknown`，不猜。
 */
export type InstallMethod = "bun-binary" | "npm" | "pnpm" | "yarn" | "bun" | "unknown";

interface SelfUpdateCommandStep {
	command: string;
	args: string[];
	display: string;
}

/**
 * Spawnable self-update command, optionally with an uninstall step first.
 *
 * 可 spawn 的自我更新命令。换包名时 `steps` 先卸载再安装。
 */
export interface SelfUpdateCommand extends SelfUpdateCommandStep {
	steps?: SelfUpdateCommandStep[];
}

/**
 * Package to install during self-update; spec may differ from the local name.
 *
 * 自我更新要装的包。`installSpec` 可以和本地 `packageName` 不同。
 */
export type SelfUpdatePackageTarget = string | { packageName: string; installSpec?: string };

function normalizeSelfUpdatePackageTarget(target: SelfUpdatePackageTarget): {
	packageName: string;
	installSpec: string;
} {
	if (typeof target === "string") {
		return { packageName: target, installSpec: target };
	}
	return { packageName: target.packageName, installSpec: target.installSpec ?? target.packageName };
}

function makeSelfUpdateCommand(
	installStep: SelfUpdateCommandStep,
	uninstallStep?: SelfUpdateCommandStep,
): SelfUpdateCommand {
	if (!uninstallStep) return installStep;
	return {
		...installStep,
		display: `${uninstallStep.display} && ${installStep.display}`,
		steps: [uninstallStep, installStep],
	};
}

function makeSelfUpdateCommandStep(command: string, args: string[]): SelfUpdateCommandStep {
	return {
		command,
		args,
		display: [command, ...args].map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(" "),
	};
}

/**
 * Infer {@link InstallMethod} from Bun flags and resolved install paths.
 *
 * 从 Bun 标记和路径推断安装途径。对不上任何全局管理器就返回 `unknown`。
 */
export function detectInstallMethod(): InstallMethod {
	if (isBunBinary) {
		return "bun-binary";
	}

	const resolvedPath = `${__dirname}\0${process.execPath || ""}`.toLowerCase().replace(/\\/g, "/");

	if (resolvedPath.includes("/pnpm/") || resolvedPath.includes("/.pnpm/")) {
		return "pnpm";
	}
	if (resolvedPath.includes("/yarn/") || resolvedPath.includes("/.yarn/")) {
		return "yarn";
	}
	if (isBunRuntime || resolvedPath.includes("/install/global/node_modules/")) {
		return "bun";
	}
	if (resolvedPath.includes("/npm/") || resolvedPath.includes("/node_modules/")) {
		return "npm";
	}

	return "unknown";
}

function getInferredNpmInstall(): { root: string; prefix: string } | undefined {
	const packageDir = getPackageDir();
	const path = process.platform === "win32" || packageDir.includes("\\") ? win32 : { basename, dirname };
	const parent = path.dirname(packageDir);
	let root: string | undefined;
	if (path.basename(parent).startsWith("@") && path.basename(path.dirname(parent)) === "node_modules") {
		root = path.dirname(parent);
	} else if (path.basename(parent) === "node_modules") {
		root = parent;
	}
	if (!root) return undefined;
	const rootParent = path.dirname(root);
	if (path.basename(rootParent) === "lib") return { root, prefix: path.dirname(rootParent) };
	// Windows global npm prefixes use `<prefix>\\node_modules`, which is
	// indistinguishable from local project installs by path shape alone. Do not
	// infer unsupported Windows custom prefixes without `npm root -g` evidence.
	return undefined;
}

function getSelfUpdateCommandForMethod(
	method: InstallMethod,
	installedPackageName: string,
	updatePackageTarget: SelfUpdatePackageTarget = installedPackageName,
	npmCommand?: string[],
): SelfUpdateCommand | undefined {
	const target = normalizeSelfUpdatePackageTarget(updatePackageTarget);
	switch (method) {
		case "bun-binary":
			return undefined;
		case "pnpm": {
			const match = readCommandOutput("pnpm", ["root", "-g"])
				? undefined
				: /^(.*[\\/]global[\\/][^\\/]+)[\\/]\.pnpm[\\/]/.exec(getPackageDir());
			const binDirArgs = match
				? [`--config.global-bin-dir=${process.env.PNPM_HOME || dirname(dirname(match[1]))}`]
				: [];
			return makeSelfUpdateCommand(
				makeSelfUpdateCommandStep("pnpm", [
					"install",
					"-g",
					"--ignore-scripts",
					"--config.minimumReleaseAge=0",
					...binDirArgs,
					target.installSpec,
				]),
				target.packageName === installedPackageName
					? undefined
					: makeSelfUpdateCommandStep("pnpm", ["remove", "-g", ...binDirArgs, installedPackageName]),
			);
		}
		case "yarn":
			return makeSelfUpdateCommand(
				makeSelfUpdateCommandStep("yarn", ["global", "add", "--ignore-scripts", target.installSpec]),
				target.packageName === installedPackageName
					? undefined
					: makeSelfUpdateCommandStep("yarn", ["global", "remove", installedPackageName]),
			);
		case "bun":
			return makeSelfUpdateCommand(
				makeSelfUpdateCommandStep("bun", [
					"install",
					"-g",
					"--ignore-scripts",
					"--minimum-release-age=0",
					target.installSpec,
				]),
				target.packageName === installedPackageName
					? undefined
					: makeSelfUpdateCommandStep("bun", ["uninstall", "-g", installedPackageName]),
			);
		case "npm": {
			const [command = "npm", ...npmArgs] = npmCommand ?? [];
			const inferred = npmCommand?.length ? undefined : getInferredNpmInstall();
			const prefixArgs = [...npmArgs, ...(inferred ? ["--prefix", inferred.prefix] : [])];
			const installStep = makeSelfUpdateCommandStep(command, [
				...prefixArgs,
				"install",
				"-g",
				"--ignore-scripts",
				"--min-release-age=0",
				target.installSpec,
			]);
			const uninstallStep =
				target.packageName === installedPackageName
					? undefined
					: makeSelfUpdateCommandStep(command, [...prefixArgs, "uninstall", "-g", installedPackageName]);
			return makeSelfUpdateCommand(installStep, uninstallStep);
		}
		case "unknown":
			return undefined;
	}
}

function readCommandOutput(
	command: string,
	args: string[],
	options: { requireSuccess?: boolean } = {},
): string | undefined {
	const result = spawnProcessSync(command, args, {
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	if (result.status === 0) return result.stdout.trim() || undefined;
	if (options.requireSuccess) {
		const reason = result.error?.message || result.stderr.trim() || `exit code ${result.status ?? "unknown"}`;
		throw new Error(`Failed to run ${[command, ...args].join(" ")}: ${reason}`);
	}
	return undefined;
}

function getGlobalPackageRoots(method: InstallMethod, _packageName: string, npmCommand?: string[]): string[] {
	switch (method) {
		case "npm": {
			const configured = !!npmCommand?.length;
			const [command = "npm", ...npmArgs] = npmCommand ?? [];
			if (configured && command === "bun") {
				const bunBin = readCommandOutput(command, [...npmArgs, "pm", "bin", "-g"], {
					requireSuccess: true,
				});
				const roots = [join(homedir(), ".bun", "install", "global", "node_modules")];
				if (bunBin) {
					roots.push(join(dirname(bunBin), "install", "global", "node_modules"));
				}
				return roots;
			}
			const root = readCommandOutput(command, [...npmArgs, "root", "-g"], {
				requireSuccess: configured,
			});
			const inferred = configured ? undefined : getInferredNpmInstall();
			return [root, inferred?.root].filter((x): x is string => !!x);
		}
		case "pnpm": {
			const root = readCommandOutput("pnpm", ["root", "-g"]);
			if (root) return [root, dirname(root)];
			const match = /^(.*[\\/]global[\\/][^\\/]+)[\\/]\.pnpm[\\/]/.exec(getPackageDir());
			return match ? [match[1]] : [];
		}
		case "yarn": {
			const dir = readCommandOutput("yarn", ["global", "dir"]);
			return dir ? [dir, join(dir, "node_modules")] : [];
		}
		case "bun": {
			const bunBin = readCommandOutput("bun", ["pm", "bin", "-g"]);
			const roots = [join(homedir(), ".bun", "install", "global", "node_modules")];
			if (bunBin) {
				roots.push(join(dirname(bunBin), "install", "global", "node_modules"));
			}
			return roots;
		}
		case "bun-binary":
		case "unknown":
			return [];
	}
}

function normalizeExistingPathForComparison(path: string, resolveSymlinks: boolean): string | undefined {
	const resolvedPath = resolve(path);
	if (!existsSync(resolvedPath)) {
		return undefined;
	}
	let normalizedPath = resolvedPath;
	if (resolveSymlinks) {
		try {
			normalizedPath = realpathSync(resolvedPath);
		} catch {
			return undefined;
		}
	}
	if (process.platform === "win32") {
		normalizedPath = normalizedPath.toLowerCase();
	}
	return normalizedPath;
}

function getPathComparisonCandidates(path: string): string[] {
	return Array.from(
		new Set(
			[normalizeExistingPathForComparison(path, false), normalizeExistingPathForComparison(path, true)].filter(
				(candidate): candidate is string => !!candidate,
			),
		),
	);
}

function getEntrypointPackageDir(): string | undefined {
	const entrypoint = process.argv[1];
	if (!entrypoint) return undefined;
	let dir = dirname(entrypoint);
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) {
			return dir;
		}
		dir = dirname(dir);
	}
	return undefined;
}

function isSelfUpdatePathWritable(): boolean {
	const packageDir = getPackageDir();
	try {
		accessSync(packageDir, constants.W_OK);
		accessSync(dirname(packageDir), constants.W_OK);
		return true;
	} catch {
		return false;
	}
}

function isManagedByGlobalPackageManager(method: InstallMethod, packageName: string, npmCommand?: string[]): boolean {
	const packageDirs = [getPackageDir(), getEntrypointPackageDir()].filter((dir): dir is string => !!dir);
	const packageDirCandidates = packageDirs.flatMap((dir) => getPathComparisonCandidates(dir));
	return getGlobalPackageRoots(method, packageName, npmCommand).some((root) => {
		return getPathComparisonCandidates(root).some((normalizedRoot) => {
			const rootPrefix = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`;
			return packageDirCandidates.some((packageDir) => packageDir.startsWith(rootPrefix));
		});
	});
}

/**
 * Command to self-update this global install, or undefined if unmanaged.
 *
 * 当前全局安装的自我更新命令。非全局、不可写或 bun-binary 返回 undefined。
 */
export function getSelfUpdateCommand(
	packageName: string,
	npmCommand?: string[],
	updatePackageTarget: SelfUpdatePackageTarget = packageName,
): SelfUpdateCommand | undefined {
	const method = detectInstallMethod();
	const command = getSelfUpdateCommandForMethod(method, packageName, updatePackageTarget, npmCommand);
	if (!command || !isManagedByGlobalPackageManager(method, packageName, npmCommand) || !isSelfUpdatePathWritable()) {
		return undefined;
	}
	return command;
}

/**
 * Human instruction when automatic self-update cannot run.
 *
 * 自动更新不可用时的说明。bun-binary 指向 GitHub releases，其它指向包管理器。
 */
export function getSelfUpdateUnavailableInstruction(
	packageName: string,
	npmCommand?: string[],
	updatePackageTarget: SelfUpdatePackageTarget = packageName,
): string {
	const method = detectInstallMethod();
	const target = normalizeSelfUpdatePackageTarget(updatePackageTarget);
	if (method === "bun-binary") {
		return `Download from: https://github.com/earendil-works/pi/releases/latest`;
	}
	const command = getSelfUpdateCommandForMethod(method, packageName, target, npmCommand);
	if (command) {
		if (isManagedByGlobalPackageManager(method, packageName, npmCommand) && !isSelfUpdatePathWritable()) {
			return `This installation is managed by a global ${method} install, but the install path is not writable. Update it yourself with: ${command.display}`;
		}
		return `This installation is not managed by a global ${method} install. Update it with the package manager, wrapper, or source checkout that provides it.`;
	}
	return `Update ${target.installSpec} using the package manager, wrapper, or source checkout that provides this installation.`;
}

/**
 * One-line update hint: either `Run: …` or the unavailable instruction.
 *
 * 一行更新提示。有自我更新命令就 `Run:`，否则退到不可用说明。
 */
export function getUpdateInstruction(packageName: string): string {
	const method = detectInstallMethod();
	const command = getSelfUpdateCommandForMethod(method, packageName);
	if (command) {
		return `Run: ${command.display}`;
	}
	return getSelfUpdateUnavailableInstruction(packageName);
}

// =============================================================================
// Package Asset Paths (shipped with executable)
// =============================================================================

/**
 * Get the base directory for resolving package assets (themes, package.json, README.md, CHANGELOG.md).
 * - For Bun binary: returns the directory containing the executable
 * - For Node.js and tsx: returns the package root containing package.json
 * - Ignores Bun binary metadata copied into dist/ when the package root is available
 *
 * 从 startDir 往上找带 package.json 的根。若停在 `dist/` 且父级也有 package.json，回退到父级。
 */
export function findNodePackageDir(startDir: string): string {
	let dir = startDir;
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) {
			const parent = dirname(dir);
			// build:binary places Bun's metadata inside dist/. Node still needs the
			// package root so its dist-relative asset paths do not become dist/dist/.
			if (basename(dir) === "dist" && existsSync(join(parent, "package.json"))) {
				return parent;
			}
			return dir;
		}
		dir = dirname(dir);
	}
	return startDir;
}

/**
 * Directory that owns shipped assets. Honors `PI_PACKAGE_DIR`.
 *
 * 包资源根目录。`PI_PACKAGE_DIR` 优先；Bun 二进制用 execPath 目录。
 */
export function getPackageDir(): string {
	// Allow override via environment variable (useful for Nix/Guix where store paths tokenize poorly)
	const envDir = process.env.PI_PACKAGE_DIR;
	if (envDir) {
		return normalizePath(envDir);
	}

	if (isBunBinary) {
		// Bun binary: process.execPath points to the compiled executable
		return dirname(process.execPath);
	}
	return findNodePackageDir(__dirname);
}

/**
 * Get path to built-in themes directory (shipped with package)
 * - For Bun binary: theme/ next to executable
 * - For Node.js (dist/): dist/modes/interactive/theme/
 * - For tsx (src/): src/modes/interactive/theme/
 *
 * 内置主题目录。Bun 二进制在可执行文件旁的 `theme/`，源码/dist 在 modes/interactive/theme。
 */
export function getThemesDir(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "theme");
	}
	// Theme is in modes/interactive/theme/ relative to src/ or dist/
	const packageDir = getPackageDir();
	const srcOrDist = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, srcOrDist, "modes", "interactive", "theme");
}

/**
 * Get path to HTML export template directory (shipped with package)
 * - For Bun binary: export-html/ next to executable
 * - For Node.js (dist/): dist/core/export-html/
 * - For tsx (src/): src/core/export-html/
 *
 * HTML 导出模板目录。发行形态决定是可执行文件旁还是 core/export-html。
 */
export function getExportTemplateDir(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "export-html");
	}
	const packageDir = getPackageDir();
	const srcOrDist = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, srcOrDist, "core", "export-html");
}

/**
 * Get path to package.json
 *
 * 包根下的 `package.json`。读不到时 APP_* 常量走硬编码回退。
 */
export function getPackageJsonPath(): string {
	return join(getPackageDir(), "package.json");
}

/**
 * Get path to README.md
 *
 * 包根下的 README.md，路径经 `resolve` 成绝对路径。
 */
export function getReadmePath(): string {
	return resolve(join(getPackageDir(), "README.md"));
}

/**
 * Get path to docs directory
 *
 * 包根下的 docs 目录。
 */
export function getDocsPath(): string {
	return resolve(join(getPackageDir(), "docs"));
}

/**
 * Get path to examples directory
 *
 * 包根下的 examples 目录。
 */
export function getExamplesPath(): string {
	return resolve(join(getPackageDir(), "examples"));
}

/**
 * Get path to CHANGELOG.md
 *
 * 包根下的 CHANGELOG.md。
 */
export function getChangelogPath(): string {
	return resolve(join(getPackageDir(), "CHANGELOG.md"));
}

/**
 * Get path to built-in interactive assets directory.
 * - For Bun binary: assets/ next to executable
 * - For Node.js (dist/): dist/modes/interactive/assets/
 * - For tsx (src/): src/modes/interactive/assets/
 *
 * 交互内置资源目录。有 `src/` 用 src，否则用 dist。
 */
export function getInteractiveAssetsDir(): string {
	if (isBunBinary) {
		return join(getPackageDir(), "assets");
	}
	const packageDir = getPackageDir();
	const srcOrDist = existsSync(join(packageDir, "src")) ? "src" : "dist";
	return join(packageDir, srcOrDist, "modes", "interactive", "assets");
}

/**
 * Get path to a bundled interactive asset
 *
 * 内置交互资源里的一个文件名。不检查文件是否存在。
 */
export function getBundledInteractiveAssetPath(name: string): string {
	return join(getInteractiveAssetsDir(), name);
}

// =============================================================================
// App Config (from package.json piConfig)
// =============================================================================

interface PackageJson {
	name?: string;
	version?: string;
	piConfig?: {
		name?: string;
		configDir?: string;
	};
}

let pkg: PackageJson = {};
try {
	pkg = JSON.parse(stripBom(readFileSync(getPackageJsonPath(), "utf-8"))) as PackageJson;
} catch (e: unknown) {
	const err = e as NodeJS.ErrnoException;
	if (err.code !== "ENOENT") throw e;
}

const piConfigName: string | undefined = pkg.piConfig?.name;
/**
 * npm package name from package.json, else the upstream default.
 *
 * package.json 的 name。读失败回退 `@earendil-works/pi-coding-agent`。
 */
export const PACKAGE_NAME: string = pkg.name || "@earendil-works/pi-coding-agent";
/**
 * CLI process title and command name. Rebrands via `piConfig.name`.
 *
 * 进程标题和命令名。再品牌看 `piConfig.name`，默认 `pi`。
 */
export const APP_NAME: string = piConfigName || "pi";
/**
 * Display title. Official build keeps the π glyph; rebrands use {@link APP_NAME}.
 *
 * 展示标题。官方发行用 π，再品牌用 APP_NAME。
 */
export const APP_TITLE: string = piConfigName ? APP_NAME : "π";
/**
 * Project-local config folder name (default `.pi`).
 *
 * 项目配置目录名。来自 `piConfig.configDir`，默认 `.pi`。
 */
export const CONFIG_DIR_NAME: string = pkg.piConfig?.configDir || ".pi";
/**
 * Package version string, or `0.0.0` when package.json is missing.
 *
 * 包版本。读不到 package.json 时是 `0.0.0`。
 */
export const VERSION: string = pkg.version || "0.0.0";

// e.g., PI_CODING_AGENT_DIR or TAU_CODING_AGENT_DIR
/**
 * Env var that overrides {@link getAgentDir}. Derived from {@link APP_NAME}.
 *
 * 覆盖 agent 配置目录的环境变量名，随 APP_NAME 变化。
 */
export const ENV_AGENT_DIR = `${APP_NAME.toUpperCase()}_CODING_AGENT_DIR`;
/**
 * Env var that overrides the session storage directory.
 *
 * 覆盖会话目录的环境变量名。CLI `--session-dir` 仍优先。
 */
export const ENV_SESSION_DIR = `${APP_NAME.toUpperCase()}_CODING_AGENT_SESSION_DIR`;

/**
 * Normalize a user path, including `~` expansion.
 *
 * 规范化用户路径，默认展开 `~`。不只是 trim。
 */
export function expandTildePath(path: string): string {
	return normalizePath(path);
}

const DEFAULT_SHARE_VIEWER_URL = "https://pi.dev/session/";

/**
 * Get the share viewer URL for a gist ID.
 *
 * gist 预览 URL。基址可用 `PI_SHARE_VIEWER_URL` 覆盖，默认 pi.dev。
 */
export function getShareViewerUrl(gistId: string): string {
	const baseUrl = process.env.PI_SHARE_VIEWER_URL || DEFAULT_SHARE_VIEWER_URL;
	return `${baseUrl}#${gistId}`;
}

// =============================================================================
// User Config Paths (~/.pi/agent/*)
// =============================================================================

/**
 * Get the agent config directory (e.g., ~/.pi/agent/)
 *
 * 用户 agent 配置根。`ENV_AGENT_DIR` 优先，否则 `~/<CONFIG_DIR_NAME>/agent`。
 */
export function getAgentDir(): string {
	const envDir = process.env[ENV_AGENT_DIR];
	if (envDir) {
		return expandTildePath(envDir);
	}
	return join(homedir(), CONFIG_DIR_NAME, "agent");
}

/**
 * Get path to user's custom themes directory
 *
 * 用户自定义主题目录：`getAgentDir()/themes`。
 */
export function getCustomThemesDir(): string {
	return join(getAgentDir(), "themes");
}

/**
 * Get path to models.json
 *
 * 用户 `models.json` 路径。
 */
export function getModelsPath(): string {
	return join(getAgentDir(), "models.json");
}

/**
 * Get path to auth.json
 *
 * 用户 `auth.json` 路径。
 */
export function getAuthPath(): string {
	return join(getAgentDir(), "auth.json");
}

/**
 * Get path to settings.json
 *
 * 用户 `settings.json` 路径。
 */
export function getSettingsPath(): string {
	return join(getAgentDir(), "settings.json");
}

/**
 * Get path to tools directory
 *
 * 用户 `tools/`。新安装应把托管二进制放 bin/，这里仍给迁移用。
 */
export function getToolsDir(): string {
	return join(getAgentDir(), "tools");
}

/**
 * Get path to managed binaries directory (fd, rg)
 *
 * 托管二进制目录（fd、rg）。
 */
export function getBinDir(): string {
	return join(getAgentDir(), "bin");
}

/**
 * Get path to prompt templates directory
 *
 * 用户 prompt 模板目录。旧名是 commands/。
 */
export function getPromptsDir(): string {
	return join(getAgentDir(), "prompts");
}

/**
 * Get path to sessions directory
 *
 * 默认会话根目录。可被 `ENV_SESSION_DIR` / `--session-dir` 覆盖。
 */
export function getSessionsDir(): string {
	return join(getAgentDir(), "sessions");
}

/**
 * Get path to debug log file
 *
 * 调试日志路径：`getAgentDir()/<APP_NAME>-debug.log`。
 */
export function getDebugLogPath(): string {
	return join(getAgentDir(), `${APP_NAME}-debug.log`);
}
