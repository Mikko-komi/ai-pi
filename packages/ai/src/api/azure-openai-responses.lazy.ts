/**
 * Lazy loader for the Azure OpenAI Responses provider streams.
 *
 * 第一次 stream 才 import azure-openai-responses。宿主 import 缓存去重。
 */

import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

/**
 * ProviderStreams factory that loads azure-openai-responses on first use.
 *
 * 返回 lazyApi 包装。load 失败用 error 事件收口。
 */
export const azureOpenAIResponsesApi = (): ProviderStreams => lazyApi(() => import("./azure-openai-responses.ts"));
