/**
 * Unstarted Server factory with deterministic test defaults.
 *
 * 测试用 Server 工厂。不 start；缺省 serverId 固定，便于对拍。
 */

import { Server } from "../server.ts";
import type { ServerHost, ServerOptions } from "../types.ts";
import { TestServerHost } from "./host.ts";

/**
 * ServerOptions for tests, with optional host and serverId.
 *
 * 测试启动选项。listeners 仍必填；serverId 可省。
 */
export interface TestServerOptions extends Omit<ServerOptions, "serverId"> {
	host?: ServerHost;
	serverId?: string;
}

/**
 * Unstarted Server plus the host it was constructed with.
 *
 * 测试对。host 要么传入要么是 TestServerHost。
 */
export interface TestServer {
	server: Server;
	host: ServerHost;
}

/**
 * Create an unstarted Server with deterministic defaults for transport conformance tests.
 *
 * 造未启动的测试 Server。缺省 serverId 钉死，方便握手对拍。
 */
export function createTestServer(options: TestServerOptions): TestServer {
	const host = options.host ?? new TestServerHost();
	return {
		server: new Server(host, {
			listeners: options.listeners,
			maxFrameLength: options.maxFrameLength,
			handshakeTimeoutMs: options.handshakeTimeoutMs,
			serverId: options.serverId ?? "00000000-0000-4000-8000-000000000001",
			onError: options.onError,
		}),
		host,
	};
}
