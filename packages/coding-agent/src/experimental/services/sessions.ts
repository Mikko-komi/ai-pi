/**
 * Chord service contracts for session directory and attach/create/remove.
 *
 * 会话目录与管理合同。目录只读复制态；写操作走 SessionManagement。
 */

import { type Context, defineService, type ReplicatedState } from "@earendil-works/chord";
import type { ServerId } from "@earendil-works/pi-protocol";

/**
 * Server plus session identity without listing metadata.
 *
 * 会话地址。只有 serverId/sessionId，不含 createdAt。
 */
export interface SessionAddress {
	serverId: ServerId;
	sessionId: string;
}

/**
 * Directory row for one session.
 *
 * 目录条目。在地址上加 createdAt。
 */
export interface SessionSummary extends SessionAddress {
	createdAt: number;
}

/**
 * Optional identity for creating a session.
 *
 * 创建输入。id 可选，缺省由存储分配。
 */
export interface SessionCreateOptions {
	id?: string;
}

/**
 * Replicated session directory snapshot.
 *
 * 复制的目录快照。revision 每次 refresh 递增。
 */
export interface SessionDirectoryState {
	revision: number;
	sessions: SessionSummary[];
}

/**
 * Read-only replicated session directory.
 *
 * 只读目录服务。只有 state，没有写操作。
 */
export interface SessionDirectory {
	readonly state: ReplicatedState<SessionDirectoryState>;
}

/**
 * Chord service token for SessionDirectory.
 *
 * 服务令牌。id 固定 `pi.session-directory`。
 */
export const SessionDirectory = defineService<SessionDirectory>("pi.session-directory");

/**
 * Create, remove, attach, and detach sessions.
 *
 * 会话写操作。不列目录；attach/detach 对着当前 presentation。
 */
export interface SessionManagement {
	create(options: SessionCreateOptions, context: Context): Promise<SessionSummary>;
	remove(sessionId: string, context: Context): Promise<void>;
	attach(sessionId: string, context: Context): Promise<void>;
	detach(context: Context): Promise<void>;
}

/**
 * Chord service token for SessionManagement.
 *
 * 服务令牌。id 固定 `pi.session-management`。
 */
export const SessionManagement = defineService<SessionManagement>("pi.session-management");
