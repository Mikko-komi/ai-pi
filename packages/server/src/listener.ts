/**
 * Transport-agnostic listener contract for accepted byte connections.
 *
 * 监听器合同。认证归应用；这里只交已授权的 ByteConnection。
 */

import type { ByteConnectionAcceptor } from "./connection.ts";

/**
 * Supplies established byte connections after any required transport authentication.
 *
 * 已授权字节连接的来源。start 之后才 accept；close 可重复调用。
 */
export interface ServerListener {
	/** Starts listening and passes authorized connections to accept. */
	start(accept: ByteConnectionAcceptor): Promise<void>;
	close(): Promise<void>;
}
