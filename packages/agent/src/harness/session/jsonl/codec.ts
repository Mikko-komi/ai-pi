/**
 * Header parsers for format-4 JSONL and legacy v3 session files.
 *
 * 解析会话文件第一行。只认 v4 header 或 v3-legacy；其它一律失败。
 */

import { err, ok, type Result } from "../../types.ts";
import { JSONL_FORMAT_VERSION, type JsonlStorageHeader } from "./types.ts";

/**
 * Legacy v3 file header. `timestamp` must be `Date.parse`-able.
 *
 * v3 文件头。`timestamp` 必须能被 `Date.parse`。
 */
export interface LegacyV3SessionHeader {
	type: "session";
	version: 3;
	id: string;
	timestamp: string;
	cwd: string;
	parentSession?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeIntegerAtLeast(value: unknown, minimum: number): value is number {
	return Number.isSafeInteger(value) && (value as number) >= minimum;
}

/**
 * Narrow an unknown value to a v3 session header.
 *
 * 收窄未知值为 v3 头。
 */
export function isLegacyV3SessionHeader(value: unknown): value is LegacyV3SessionHeader {
	return (
		isRecord(value) &&
		value.type === "session" &&
		value.version === 3 &&
		typeof value.id === "string" &&
		typeof value.cwd === "string" &&
		typeof value.timestamp === "string" &&
		Number.isFinite(Date.parse(value.timestamp)) &&
		(value.parentSession === undefined || typeof value.parentSession === "string")
	);
}

/**
 * Narrow an unknown value to a format-4 header. `v` must be the current format version.
 *
 * 收窄未知值为 v4 头。`v` 必须是当前格式版本。
 */
export function isJsonlStorageHeader(value: unknown): value is JsonlStorageHeader {
	return (
		isRecord(value) &&
		value.kind === "header" &&
		value.v === JSONL_FORMAT_VERSION &&
		typeof value.id === "string" &&
		typeof value.cwd === "string" &&
		isSafeIntegerAtLeast(value.storageVersion, 1) &&
		isSafeIntegerAtLeast(value.createdAt, 0) &&
		(value.nextSeq === undefined || isSafeIntegerAtLeast(value.nextSeq, 1)) &&
		(value.parentSessionId === undefined || typeof value.parentSessionId === "string") &&
		(value.legacyParentSessionPath === undefined || typeof value.legacyParentSessionPath === "string")
	);
}

/**
 * Parsed first line. Only v4 and v3-legacy are accepted.
 *
 * 解析后的头。只有 v4 和 v3-legacy。
 */
export type JsonlParsedSessionHeader =
	| { format: "v4"; header: JsonlStorageHeader }
	| { format: "v3-legacy"; header: LegacyV3SessionHeader };

/**
 * Parse the first line. Bad JSON or unknown versions fail the Result.
 *
 * 解析第一行。JSON 坏或版本不认都走 Result 失败。
 */
export function parseJsonlSessionHeader(line: string): Result<JsonlParsedSessionHeader, Error> {
	let value: unknown;
	try {
		value = JSON.parse(line);
	} catch (error) {
		return err(new Error("Invalid JSONL session header: not valid JSON", { cause: error }));
	}
	if (isJsonlStorageHeader(value)) return ok({ format: "v4", header: value });
	if (isLegacyV3SessionHeader(value)) return ok({ format: "v3-legacy", header: value });
	return err(new Error("Unsupported JSONL session header"));
}
