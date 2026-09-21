/**
 * Lazy loader for the pi-messages provider streams.
 *
 * 第一次 stream 才 import pi-messages。宿主 import 缓存去重。
 */

import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

/**
 * ProviderStreams factory that loads pi-messages on first use.
 *
 * 返回 lazyApi 包装。load 失败用 error 事件收口。
 */
export const piMessagesApi = (): ProviderStreams => lazyApi(() => import("./pi-messages.ts"));
