/**
 * Builtin slash-command catalog and the shared command-info shape.
 *
 * 内置斜杠命令目录。扩展 / prompt / skill 命令不在这份表里。
 */

import { APP_NAME } from "../config.ts";
import type { SourceInfo } from "./source-info.ts";

/**
 * Where a non-builtin slash command was loaded from.
 *
 * 非内置斜杠命令的来源。内置命令不走这个字段。
 */
export type SlashCommandSource = "extension" | "prompt" | "skill";

/**
 * One discovered slash command from an extension, prompt, or skill.
 *
 * 发现到的一条斜杠命令。`sourceInfo` 指向文件，供冲突和信任判断。
 */
export interface SlashCommandInfo {
	name: string;
	description?: string;
	source: SlashCommandSource;
	sourceInfo: SourceInfo;
}

/**
 * One built-in slash command shown in help/autocomplete.
 *
 * 内置斜杠命令。`argumentHint` 只给补全，不表示参数已校验。
 */
export interface BuiltinSlashCommand {
	name: string;
	description: string;
	argumentHint?: string;
}

/**
 * The built-in slash commands shipped with coding-agent.
 *
 * 随 coding-agent 附带的内置命令表。改名要同步帮助和补全。
 */
export const BUILTIN_SLASH_COMMANDS: ReadonlyArray<BuiltinSlashCommand> = [
	{ name: "settings", description: "Open settings menu" },
	{ name: "model", description: "Select model (opens selector UI)", argumentHint: "<provider/model>" },
	{ name: "tree", description: "Navigate session tree (switch branches)" },
	{ name: "thinking", description: "Set thinking level", argumentHint: "<level>" },
	{ name: "scoped-models", description: "Enable/disable models for Ctrl+P cycling" },
	{ name: "export", description: "Export session (HTML default, or specify path: .html/.jsonl)" },
	{ name: "import", description: "Import and resume a session from a JSONL file" },
	{ name: "share", description: "Share session as a secret GitHub gist" },
	{ name: "copy", description: "Copy last agent message to clipboard" },
	{ name: "name", description: "Set session display name" },
	{ name: "session", description: "Show session info and stats" },
	{ name: "changelog", description: "Show changelog entries" },
	{ name: "hotkeys", description: "Show all keyboard shortcuts" },
	{ name: "fork", description: "Create a new fork from a previous user message" },
	{ name: "clone", description: "Duplicate the current session at the current position" },
	{ name: "trust", description: "Save project trust decision for future sessions" },
	{ name: "login", description: "Configure provider authentication", argumentHint: "<provider>" },
	{ name: "logout", description: "Remove provider authentication" },
	{ name: "new", description: "Start a new session" },
	{ name: "compact", description: "Manually compact the session context" },
	{ name: "resume", description: "Resume a different session" },
	{ name: "reload", description: "Reload keybindings, extensions, skills, prompts, themes, and context files" },
	{ name: "quit", description: `Quit ${APP_NAME}` },
];
