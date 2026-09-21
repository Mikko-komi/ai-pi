/**
 * Lazy loader for the Google Vertex provider streams.
 *
 * 第一次 stream 才 import google-vertex。宿主 import 缓存去重。
 */

import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

/**
 * ProviderStreams factory that loads google-vertex on first use.
 *
 * 返回 lazyApi 包装。load 失败用 error 事件收口。
 */
export const googleVertexApi = (): ProviderStreams => lazyApi(() => import("./google-vertex.ts"));
