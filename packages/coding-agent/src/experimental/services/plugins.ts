/**
 * Chord service contracts for server-built and Session-hosted plugin generations.
 *
 * 插件两层合同。展示侧走 PresentationPlugins；当前附着 Session 的 facet 走 SessionPlugins。
 */

import { type Context, defineService, type JsonValue } from "@earendil-works/chord";

/**
 * Server-built plugin generations available to presentations.
 *
 * 服务端编好的插件代。prepareSession 才选定 packagePaths；reload 要求已经 prepare。
 */
export interface PresentationPlugins {
	prepareSession(
		request: { readonly sessionId: string; readonly packagePaths: readonly string[] | null },
		context: Context,
	): Promise<JsonValue>;
	reload(context: Context): Promise<JsonValue>;
}

/**
 * Chord service token for PresentationPlugins.
 *
 * 服务令牌。id 固定 `pi.presentation-plugins`。
 */
export const PresentationPlugins = defineService<PresentationPlugins>("pi.presentation-plugins");

/**
 * Plugin facets hosted in the currently attached Session worker.
 *
 * 当前附着 Session worker 里的插件 facet。reload 只重载 worker 侧，不改服务端选型。
 */
export interface SessionPlugins {
	reload(context: Context): Promise<void>;
}

/**
 * Chord service token for SessionPlugins.
 *
 * 服务令牌。id 固定 `pi.session-plugins`。
 */
export const SessionPlugins = defineService<SessionPlugins>("pi.session-plugins");
