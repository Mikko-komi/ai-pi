/**
 * Lazy loader for the Google Generative AI provider streams.
 *
 * 第一次 stream 才 import google-generative-ai。宿主 import 缓存去重。
 */

import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

/**
 * ProviderStreams factory that loads google-generative-ai on first use.
 *
 * 返回 lazyApi 包装。load 失败用 error 事件收口。
 */
export const googleGenerativeAIApi = (): ProviderStreams => lazyApi(() => import("./google-generative-ai.ts"));
