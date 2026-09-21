/**
 * Parse and strip YAML frontmatter bounded by `---` lines.
 *
 * 先去 BOM 再认开头 `---`。没有闭合分隔符则整份当 body。YAML 空则 frontmatter 为 `{}`。
 */

import { parse } from "yaml";
import { stripBom } from "./text.ts";

type ParsedFrontmatter<T extends Record<string, unknown>> = {
	frontmatter: T;
	body: string;
};

const normalizeNewlines = (value: string): string => value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const extractFrontmatter = (content: string): { yamlString: string | null; body: string } => {
	const normalized = normalizeNewlines(stripBom(content));

	if (!normalized.startsWith("---")) {
		return { yamlString: null, body: normalized };
	}

	const endIndex = normalized.indexOf("\n---", 3);
	if (endIndex === -1) {
		return { yamlString: null, body: normalized };
	}

	return {
		yamlString: normalized.slice(4, endIndex),
		body: normalized.slice(endIndex + 4).trim(),
	};
};

/**
 * Parse YAML frontmatter and return it with the remaining body.
 *
 * 无 frontmatter 时 frontmatter 是空对象。body 已统一换行并 trim 掉分隔后空白。
 */
export const parseFrontmatter = <T extends Record<string, unknown> = Record<string, unknown>>(
	content: string,
): ParsedFrontmatter<T> => {
	const { yamlString, body } = extractFrontmatter(content);
	if (!yamlString) {
		return { frontmatter: {} as T, body };
	}
	const parsed = parse(yamlString);
	return { frontmatter: (parsed ?? {}) as T, body };
};

/**
 * Return the document body with YAML frontmatter removed.
 *
 * 没有 frontmatter 则返回去 BOM 后的全文。
 */
export const stripFrontmatter = (content: string): string => parseFrontmatter(content).body;
