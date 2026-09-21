/**
 * Default thinking-level constants used when settings do not override them.
 *
 * 思考级别默认值。设置没覆盖时用这些；选项表是只读的。
 */

import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

/**
 * Default thinking level applied when none is saved.
 *
 * 未保存思考级别时的默认值。必须是 `THINKING_LEVEL_OPTIONS` 里的一项。
 */
export const DEFAULT_THINKING_LEVEL: ThinkingLevel = "medium";

/**
 * All thinking levels the CLI/UI may offer.
 *
 * 可选思考级别全集。顺序给 UI 用，不要当优先级。
 */
export const THINKING_LEVEL_OPTIONS: readonly ThinkingLevel[] = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];
