/**
 * Pluggable transport: newline-delimited JSON over any duplex pair.
 *
 * `Connection` is the shared abstraction and every host uses it. `Transport` is only for hops that
 * have an address to negotiate: the unix socket between presentations and the server. A spawned
 * worker needs none, because the pipes exist before it does.
 *
 * 可插传输：任意双工上的换行 JSON。Connection 是共用抽象；Transport 只给有地址要协商的 hop。
 */

import { rm } from "node:fs/promises";
import { createConnection as connectSocket, createServer, type Socket } from "node:net";

/**
 * An established message connection. `send` is a no-op after close.
 *
 * 一条已建立的消息连接。send 在已关闭后是空操作。
 */
export interface Connection {
	send(message: unknown): void;
	onMessage(handler: (message: unknown) => void): void;
	onClose(handler: () => void): void;
	close(): void;
}

/**
 * Handle returned by `listen`. `close` stops accepting new connections.
 *
 * listen 的句柄。close 停接受新连接。
 */
export interface Listener {
	close(): Promise<void>;
}

/**
 * Addressed hop: listen and connect. Child-process pipes are not a `Transport`.
 *
 * 有地址的 hop：listen 与 connect。子进程管道不是 Transport。
 */
export interface Transport {
	listen(onConnection: (connection: Connection) => void): Promise<Listener>;
	connect(): Promise<Connection>;
}

/**
 * Frame JSON messages as one line each over a readable/writable pair.
 *
 * 一行一条 JSON。空行忽略；任一侧 error/end 都当关闭。
 */
export function jsonConnection(
	input: NodeJS.ReadableStream,
	output: NodeJS.WritableStream,
	close: () => void,
): Connection {
	const messageHandlers: ((message: unknown) => void)[] = [];
	const closeHandlers: (() => void)[] = [];
	let buffered = "";
	let closed = false;
	const notifyClosed = (): void => {
		if (closed) return;
		closed = true;
		for (const handler of closeHandlers) handler();
	};
	input.setEncoding("utf8");
	input.on("data", (chunk: string) => {
		buffered += chunk;
		let newline = buffered.indexOf("\n");
		while (newline !== -1) {
			const line = buffered.slice(0, newline);
			buffered = buffered.slice(newline + 1);
			if (line.length > 0) {
				const message: unknown = JSON.parse(line);
				for (const handler of messageHandlers) handler(message);
			}
			newline = buffered.indexOf("\n");
		}
	});
	input.on("end", notifyClosed);
	input.on("error", notifyClosed);
	output.on("error", notifyClosed);
	return {
		send: (message) => {
			if (!closed) output.write(`${JSON.stringify(message)}\n`);
		},
		onMessage: (handler) => messageHandlers.push(handler),
		onClose: (handler) => closeHandlers.push(handler),
		close: () => {
			notifyClosed();
			close();
		},
	};
}

function socketConnection(socket: Socket): Connection {
	return jsonConnection(socket, socket, () => socket.destroy());
}

/**
 * A spawned child is connected at birth, so there is no address to dial and no `Transport`: the
 * parent reads the child's stdout and writes its stdin, and the child sees the same pipes reversed.
 *
 * 出生即连上，没有地址。缺 pipe 抛错；close 杀子进程。
 */
export function childConnection(child: {
	stdin: NodeJS.WritableStream | null;
	stdout: NodeJS.ReadableStream | null;
	kill(): unknown;
}): Connection {
	if (!child.stdin || !child.stdout) throw new Error("Child process was spawned without pipes");
	return jsonConnection(child.stdout, child.stdin, () => child.kill());
}

/**
 * The child's own view of the pipes its parent created.
 *
 * 读 stdin、写 stdout；close 只 pause stdin，不 exit。
 */
export function parentConnection(): Connection {
	return jsonConnection(process.stdin, process.stdout, () => process.stdin.pause());
}

/**
 * Unix-socket transport at `path`: listen after unlinking, or connect.
 *
 * 路径上的 unix socket。listen 先 force rm；connect 失败把 socket error 原样拒绝。
 */
export function socketTransport(path: string): Transport {
	return {
		async listen(onConnection) {
			await rm(path, { force: true });
			const server = createServer((socket) => onConnection(socketConnection(socket)));
			await new Promise<void>((resolve, reject) => {
				server.once("error", reject);
				server.listen(path, resolve);
			});
			return {
				close: () =>
					new Promise<void>((resolve) => {
						server.close(() => resolve());
					}),
			};
		},
		connect() {
			return new Promise<Connection>((resolve, reject) => {
				const socket = connectSocket(path);
				socket.once("connect", () => resolve(socketConnection(socket)));
				socket.once("error", reject);
			});
		},
	};
}
