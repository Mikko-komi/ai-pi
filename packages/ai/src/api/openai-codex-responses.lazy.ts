/**
 * Lazy loader for the OpenAI Codex Responses provider streams.
 *
 * 第一次 stream 才 import openai-codex-responses。宿主 import 缓存去重。
 */

import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

/**
 * ProviderStreams factory that loads openai-codex-responses on first use.
 *
 * 返回 lazyApi 包装。load 失败用 error 事件收口。
 */
export const openAICodexResponsesApi = (): ProviderStreams => lazyApi(() => import("./openai-codex-responses.ts"));
