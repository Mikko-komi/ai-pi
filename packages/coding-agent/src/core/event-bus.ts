/**
 * In-process channel bus for extension and UI events.
 *
 * 进程内频道总线。handler throw 只记日志，不拆掉其他订阅。
 */

import { EventEmitter } from "node:events";

/**
 * Subscribe/emit surface without teardown.
 *
 * 只含订阅和发送。`on` 返回取消函数。
 */
export interface EventBus {
	emit(channel: string, data: unknown): void;
	on(channel: string, handler: (data: unknown) => void): () => void;
}

/**
 * EventBus plus a way to drop every listener.
 *
 * 可清空的 EventBus。`clear` 去掉全部监听，不关进程。
 */
export interface EventBusController extends EventBus {
	clear(): void;
}

/**
 * Create an isolated in-process event bus.
 *
 * 新建隔离总线。handler 异步错误只打日志。
 */
export function createEventBus(): EventBusController {
	const emitter = new EventEmitter();
	return {
		emit: (channel, data) => {
			emitter.emit(channel, data);
		},
		on: (channel, handler) => {
			const safeHandler = async (data: unknown) => {
				try {
					await handler(data);
				} catch (err) {
					console.error(`Event handler error (${channel}):`, err);
				}
			};
			emitter.on(channel, safeHandler);
			return () => emitter.off(channel, safeHandler);
		},
		clear: () => {
			emitter.removeAllListeners();
		},
	};
}
