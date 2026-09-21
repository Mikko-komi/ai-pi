/**
 * OpenAI prompt_cache_key length limit and truncation.
 *
 * prompt_cache_key 最长 64 个 Unicode 码点。超了截断，不按字节切。
 */

/**
 * Maximum Unicode code points OpenAI accepts in prompt_cache_key.
 *
 * OpenAI prompt_cache_key 上限。按码点计，不是字节。
 */
export const OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH = 64;

/**
 * Truncate a prompt cache key to the OpenAI length limit.
 *
 * undefined 原样返回。超长按码点截到 64，不抛。
 */
export function clampOpenAIPromptCacheKey(key: string | undefined): string | undefined {
	if (key === undefined) return undefined;
	const chars = Array.from(key);
	if (chars.length <= OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH) return key;
	return chars.slice(0, OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH).join("");
}
