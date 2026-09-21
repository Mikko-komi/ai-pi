/**
 * Bundled Bedrock Converse stream functions for provider construction.
 *
 * Bedrock 流函数束。给 Provider 工厂挂 stream/streamSimple，不在这里做鉴权。
 */

import { stream, streamSimple } from "./api/bedrock-converse-stream.ts";

/**
 * Bedrock Converse `stream` and `streamSimple` bound as a provider module.
 *
 * Bedrock 流模块。只转发 converse-stream API，不含模型目录。
 */
export const bedrockProviderModule = {
	stream,
	streamSimple,
};
