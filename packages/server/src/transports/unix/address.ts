/**
 * Derive a Unix socket path from a logical server id and runtime directory.
 *
 * 由 serverId 推导 socket 路径。id 必须是小写 UUIDv4，否则抛。
 */

import { join } from "node:path";

/**
 * Derive the local Unix socket path for one logical server identity.
 *
 * 拼 `<dir>/<serverId>.sock`。serverId 过不了 UUIDv4 就抛，不静默改写。
 */
export function getUnixSocketPath(serverId: string, serverDirectory: string): string {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(serverId)) {
		throw new TypeError("Unix serverId must be a canonical lowercase UUIDv4");
	}
	return join(serverDirectory, `${serverId}.sock`);
}
