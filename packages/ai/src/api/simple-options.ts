/**
 * Build stream options and fit thinking budgets into token ceilings.
 *
 * 组装 StreamOptions，并把 maxTokens / thinking 预算夹进窗口和回答余量。
 */

import type {
	Api,
	Context,
	Model,
	SimpleStreamOptions,
	StreamOptions,
	ThinkingBudgets,
	ThinkingLevel,
} from "../types.ts";
import { estimateContextTokens } from "../utils/estimate.ts";

const CONTEXT_SAFETY_TOKENS = 4096;
const MIN_MAX_TOKENS = 1;

/**
 * Fit maxTokens into the remaining context window after a safety reserve.
 *
 * 窗口无效则只保证下限 1。有效窗口减去估算和 4096 安全余量。
 */
export function clampMaxTokensToContext(model: Model<Api>, context: Context, maxTokens: number): number {
	if (model.contextWindow <= 0) return Math.max(MIN_MAX_TOKENS, maxTokens);
	const available = model.contextWindow - estimateContextTokens(context).tokens - CONTEXT_SAFETY_TOKENS;
	return Math.min(maxTokens, Math.max(MIN_MAX_TOKENS, available));
}

/**
 * Merge model defaults and SimpleStreamOptions into StreamOptions.
 *
 * sampling 是 model 与 options 浅合并。maxTokens 已经夹过窗口。apiKey 参数优先于 options。
 */
export function buildBaseOptions(
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
	apiKey?: string,
): StreamOptions {
	const samplingParams =
		model.samplingParams || options?.samplingParams
			? { ...model.samplingParams, ...options?.samplingParams }
			: undefined;
	return {
		temperature: options?.temperature,
		samplingParams,
		maxTokens: clampMaxTokensToContext(model, context, options?.maxTokens ?? model.maxTokens),
		signal: options?.signal,
		telemetryContext: options?.telemetryContext,
		apiKey: apiKey || options?.apiKey,
		fetch: options?.fetch,
		transport: options?.transport,
		cacheRetention: options?.cacheRetention,
		sessionId: options?.sessionId,
		headers: options?.headers,
		onPayload: options?.onPayload,
		onResponse: options?.onResponse,
		timeoutMs: options?.timeoutMs,
		websocketConnectTimeoutMs: options?.websocketConnectTimeoutMs,
		maxRetries: options?.maxRetries,
		maxRetryDelayMs: options?.maxRetryDelayMs,
		metadata: options?.metadata,
		env: options?.env,
	};
}

/**
 * Tokens always left for the answer when a thinking budget shares the response ceiling.
 *
 * thinking 与回答共享上限时，回答至少留 1024。
 */
export const MIN_ANSWER_TOKENS = 1024;

/**
 * Default token budgets per thinking level.
 *
 * minimal / low / medium / high 的默认预算。xhigh / max 不在这张表。
 */
export const DEFAULT_THINKING_BUDGETS: ThinkingBudgets = {
	minimal: 1024,
	low: 2048,
	medium: 8192,
	high: 16384,
};

/**
 * Collapse xhigh/max thinking levels to high.
 *
 * xhigh 和 max 收成 high。其它原样。undefined 仍 undefined。
 */
export function clampReasoning(effort: ThinkingLevel | undefined): Exclude<ThinkingLevel, "xhigh" | "max"> | undefined {
	return effort === "xhigh" || effort === "max" ? "high" : effort;
}

/**
 * Look up a thinking budget after clamping the requested level.
 *
 * 先 clamp 再查表。custom 覆盖默认。
 */
export function thinkingBudgetForLevel(reasoningLevel: ThinkingLevel, customBudgets?: ThinkingBudgets): number {
	const budgets = { ...DEFAULT_THINKING_BUDGETS, ...customBudgets };
	const level = clampReasoning(reasoningLevel)!;
	return budgets[level]!;
}

/**
 * Cap a thinking budget so at least MIN_ANSWER_TOKENS remain under a shared response ceiling.
 *
 * thinking 不超过 ceiling - 1024。ceiling 太小则预算可为 0。
 */
export function clampThinkingBudgetToAnswerRoom(thinkingBudget: number, ceiling: number): number {
	return Math.min(thinkingBudget, Math.max(0, ceiling - MIN_ANSWER_TOKENS));
}

/**
 * Expand maxTokens to include thinking, then clamp thinking if it fills the ceiling.
 *
 * 调用方没封顶则用模型上限并在其内塞 thinking。有封顶则 base+thinking 再夹模型上限。塞不下就压 thinking。
 */
export function adjustMaxTokensForThinking(
	// Undefined means no explicit caller cap. Use the model cap and fit thinking inside it.
	baseMaxTokens: number | undefined,
	modelMaxTokens: number,
	reasoningLevel: ThinkingLevel,
	customBudgets?: ThinkingBudgets,
): { maxTokens: number; thinkingBudget: number } {
	let thinkingBudget = thinkingBudgetForLevel(reasoningLevel, customBudgets);
	const maxTokens =
		baseMaxTokens === undefined ? modelMaxTokens : Math.min(baseMaxTokens + thinkingBudget, modelMaxTokens);

	if (maxTokens <= thinkingBudget) {
		thinkingBudget = clampThinkingBudgetToAnswerRoom(thinkingBudget, maxTokens);
	}

	return { maxTokens, thinkingBudget };
}
