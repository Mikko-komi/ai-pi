/**
 * Build the `User-Agent` token for pi HTTP clients.
 *
 * 形如 `pi/<version> (platform; runtime; arch)`。runtime 区分 bun 和 node。
 */

/**
 * Return `pi/<version> (platform; bun|node; arch)`.
 *
 * version 原样嵌入，不做 semver 校验。
 */
export function getPiUserAgent(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `pi/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}
