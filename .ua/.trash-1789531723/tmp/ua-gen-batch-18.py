#!/usr/bin/env python3
"""Generate batch-18 knowledge-graph parts."""
from __future__ import annotations

import json
from pathlib import Path

UA = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
brief = json.loads((UA / "intermediate/batch-briefs/batch-18.json").read_text())
batch_imports: dict[str, list[str]] = brief["batchImportData"]
neighbor_map: dict[str, list[dict]] = brief["neighborMap"]

nodes: list[dict] = []


def add(node: dict) -> None:
    nodes.append(node)


# --- files + significant symbols ---

add({
    "id": "file:packages/ai/src/models-store.ts",
    "type": "file",
    "name": "models-store.ts",
    "filePath": "packages/ai/src/models-store.ts",
    "summary": "定义按 provider ID 持久化模型目录的 ModelsStore 接口，并提供基于 Map 的 InMemoryModelsStore；读写使用 structuredClone，并尊重 AbortSignal。",
    "tags": ["data-model", "in-memory-store", "模型目录"],
    "complexity": "simple",
})
add({
    "id": "class:packages/ai/src/models-store.ts:InMemoryModelsStore",
    "type": "class",
    "name": "InMemoryModelsStore",
    "filePath": "packages/ai/src/models-store.ts",
    "lineRange": [27, 45],
    "summary": "进程内 ModelsStore：按 provider 缓存目录条目，read/write 深拷贝，delete 移除条目。",
    "tags": ["in-memory-store", "data-model", "实现"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/providers/faux.ts",
    "type": "file",
    "name": "faux.ts",
    "filePath": "packages/ai/src/providers/faux.ts",
    "summary": "测试用 faux provider：按脚本队列产出 assistant 消息，模拟 token 增量流、usage 估算以及 deferred 拉取/取消，再通过 createProvider 注册为真实 Provider。",
    "tags": ["test", "factory", "provider", "测试替身"],
    "complexity": "complex",
    "languageNotes": "用 queueMicrotask 驱动异步事件流，避免测试里真实网络 I/O。",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:fauxText",
    "type": "function",
    "name": "fauxText",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [52, 54],
    "summary": "构造 type=text 的 Faux 文本内容块。",
    "tags": ["factory", "test", "content"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:fauxThinking",
    "type": "function",
    "name": "fauxThinking",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [56, 58],
    "summary": "构造 type=thinking 的 Faux 思考内容块。",
    "tags": ["factory", "test", "thinking"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:fauxToolCall",
    "type": "function",
    "name": "fauxToolCall",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [60, 67],
    "summary": "构造带随机 id 的 Faux toolCall 内容块。",
    "tags": ["factory", "test", "tool-call"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:fauxAssistantMessage",
    "type": "function",
    "name": "fauxAssistantMessage",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [76, 99],
    "summary": "把字符串或内容块规范成完整 AssistantMessage，填入 faux 默认 api/provider/model 与 usage。",
    "tags": ["factory", "test", "assistant-message"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:contentToText",
    "type": "function",
    "name": "contentToText",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [164, 176],
    "summary": "把用户/工具结果内容块压成文本，图像块用 mime 与长度占位。",
    "tags": ["utility", "serialization", "test"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:assistantContentToText",
    "type": "function",
    "name": "assistantContentToText",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [178, 190],
    "summary": "把 assistant 内容块压成文本，thinking 与 toolCall 也参与序列化。",
    "tags": ["utility", "serialization", "test"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:serializeContext",
    "type": "function",
    "name": "serializeContext",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [206, 218],
    "summary": "序列化 system/messages/tools，供 prompt-cache 前缀比较与 token 估算。",
    "tags": ["utility", "serialization", "prompt-cache"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:withUsageEstimate",
    "type": "function",
    "name": "withUsageEstimate",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [229, 267],
    "summary": "按上下文序列估算 input/output/cacheRead/cacheWrite，并写入 AssistantMessage.usage。",
    "tags": ["token-estimate", "usage", "test"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:splitStringByTokenSize",
    "type": "function",
    "name": "splitStringByTokenSize",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [269, 279],
    "summary": "按 min/max token 字符窗口把字符串切成流式 delta 片段。",
    "tags": ["streaming", "utility", "test"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:cloneMessage",
    "type": "function",
    "name": "cloneMessage",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [281, 291],
    "summary": "深拷贝 AssistantMessage 并覆盖 api/provider/modelId。",
    "tags": ["utility", "clone", "test"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:createDeferredMessage",
    "type": "function",
    "name": "createDeferredMessage",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [293, 305],
    "summary": "构造 stopReason=deferred 的占位 assistant 消息，携带 DeferredHandle。",
    "tags": ["factory", "deferred", "test"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:createErrorMessage",
    "type": "function",
    "name": "createErrorMessage",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [307, 319],
    "summary": "把任意抛出值转成 stopReason=error 的 AssistantMessage。",
    "tags": ["error-handling", "factory", "test"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:streamWithDeltas",
    "type": "function",
    "name": "streamWithDeltas",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [338, 434],
    "summary": "把完整 assistant 消息拆成 start/delta/end 事件推入流，可按 tokensPerSecond 节流，并处理 abort。",
    "tags": ["streaming", "event-stream", "test"],
    "complexity": "complex",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:createFauxCore",
    "type": "function",
    "name": "createFauxCore",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [436, 673],
    "summary": "创建 faux 核心：脚本化 stream/streamSimple、deferred fetch/cancel、模型解析与响应队列。",
    "tags": ["factory", "provider", "test", "deferred"],
    "complexity": "complex",
})
add({
    "id": "function:packages/ai/src/providers/faux.ts:fauxProvider",
    "type": "function",
    "name": "fauxProvider",
    "filePath": "packages/ai/src/providers/faux.ts",
    "lineRange": [685, 708],
    "summary": "用 createFauxCore 加上 createProvider，返回可挂到 Models 集合的测试 Provider 句柄。",
    "tags": ["factory", "provider", "test", "entry-point"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/providers/images/register-builtins.ts",
    "type": "file",
    "name": "register-builtins.ts",
    "filePath": "packages/ai/src/providers/images/register-builtins.ts",
    "summary": "懒加载 OpenRouter 图像 API 并注册为内置 images provider；模块加载失败时返回 stopReason=error 的 AssistantImages。模块加载时自动执行注册。",
    "tags": ["entry-point", "lazy-load", "images", "registry"],
    "complexity": "simple",
    "languageNotes": "使用动态 import 延迟加载 openrouter-images，避免主路径拉入图像实现。",
})
add({
    "id": "function:packages/ai/src/providers/images/register-builtins.ts:createLazyLoadErrorImages",
    "type": "function",
    "name": "createLazyLoadErrorImages",
    "filePath": "packages/ai/src/providers/images/register-builtins.ts",
    "lineRange": [11, 21],
    "summary": "把懒加载失败转成带 errorMessage 的空输出 AssistantImages。",
    "tags": ["error-handling", "images", "factory"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/images/register-builtins.ts:generateImagesOpenRouter",
    "type": "function",
    "name": "generateImagesOpenRouter",
    "filePath": "packages/ai/src/providers/images/register-builtins.ts",
    "lineRange": [30, 41],
    "summary": "懒加载后转发到 OpenRouter generateImages，捕获异常并返回错误图像结果。",
    "tags": ["images", "lazy-load", "api-handler"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/providers/images/register-builtins.ts:registerBuiltInImagesApiProviders",
    "type": "function",
    "name": "registerBuiltInImagesApiProviders",
    "filePath": "packages/ai/src/providers/images/register-builtins.ts",
    "lineRange": [43, 48],
    "summary": "把 openrouter-images 注册进 images API registry。",
    "tags": ["registry", "images", "entry-point"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/session-resources.ts",
    "type": "file",
    "name": "session-resources.ts",
    "filePath": "packages/ai/src/session-resources.ts",
    "summary": "维护会话级 cleanup 回调集合；cleanupSessionResources 逐一执行，任一失败则汇总为 AggregateError。",
    "tags": ["session", "cleanup", "resource-management"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/session-resources.ts:registerSessionResourceCleanup",
    "type": "function",
    "name": "registerSessionResourceCleanup",
    "filePath": "packages/ai/src/session-resources.ts",
    "lineRange": [5, 10],
    "summary": "注册会话资源清理回调，并返回用于注销的 disposer。",
    "tags": ["session", "cleanup", "registry"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/session-resources.ts:cleanupSessionResources",
    "type": "function",
    "name": "cleanupSessionResources",
    "filePath": "packages/ai/src/session-resources.ts",
    "lineRange": [12, 24],
    "summary": "对全部 cleanup 回调执行会话清理，收集错误后一次性抛出 AggregateError。",
    "tags": ["session", "cleanup", "error-handling"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/types.ts",
    "type": "file",
    "name": "types.ts",
    "filePath": "packages/ai/src/types.ts",
    "summary": "pi-ai 核心类型契约：KnownApi/Provider、消息与工具、流与图像选项、各厂商 compat，以及 Model/ImagesModel 与成本结构。",
    "tags": ["type-definition", "data-model", "类型定义", "barrel"],
    "complexity": "complex",
    "languageNotes": "以 export type/interface 为主的契约文件；tree-sitter 只抽到 AssistantMessageEventStream 的类型再导出。",
})

add({
    "id": "file:packages/ai/src/utils/abort-signals.ts",
    "type": "file",
    "name": "abort-signals.ts",
    "filePath": "packages/ai/src/utils/abort-signals.ts",
    "summary": "合并多个 AbortSignal：任一源 abort 即触发，并在返回 signal abort 时拆除监听以免泄漏。",
    "tags": ["utility", "abort", "cancellation"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/abort-signals.ts:combineAbortSignals",
    "type": "function",
    "name": "combineAbortSignals",
    "filePath": "packages/ai/src/utils/abort-signals.ts",
    "lineRange": [6, 41],
    "summary": "过滤有效 AbortSignal 并合成一个联动 abort 的新 signal，带 abort 清理。",
    "tags": ["utility", "abort", "cancellation"],
    "complexity": "moderate",
})

add({
    "id": "file:packages/ai/src/utils/assistant-message-frame.ts",
    "type": "file",
    "name": "assistant-message-frame.ts",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "summary": "把 AssistantMessageEvent 编成可传输 frame，处理 text/thinking/toolCall 增量与 JSON 前缀追赶，并能从 frame 还原 assistant 消息。",
    "tags": ["serialization", "streaming", "assistant-message", "frame"],
    "complexity": "complex",
    "languageNotes": "toolcall_delta 会用 parseStreamingJson 追赶 start 快照，兼容 grammar 调用的遗留初始 input。",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:cloneToolCall",
    "type": "function",
    "name": "cloneToolCall",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [66, 75],
    "summary": "深拷贝 toolCall，arguments 用 structuredClone。",
    "tags": ["clone", "tool-call", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:cloneStartMessage",
    "type": "function",
    "name": "cloneStartMessage",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [77, 92],
    "summary": "深拷贝 start 事件中的部分 AssistantMessage，避免后续增量污染快照。",
    "tags": ["clone", "assistant-message", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:isJsonPrefix",
    "type": "function",
    "name": "isJsonPrefix",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [117, 132],
    "summary": "递归判断 current JSON 值是否为 snapshot 的前缀扩展，用于 tool-call 增量追赶。",
    "tags": ["validation", "json", "streaming"],
    "complexity": "simple",
})
add({
    "id": "class:packages/ai/src/utils/assistant-message-frame.ts:AssistantMessageFrameEncoder",
    "type": "class",
    "name": "AssistantMessageFrameEncoder",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [139, 326],
    "summary": "有状态编码器：按 start/delta/end 事件输出 frame，并处理 toolCall JSON 追赶与 text/thinking 覆盖增量。",
    "tags": ["serialization", "streaming", "encoder"],
    "complexity": "complex",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:encode",
    "type": "function",
    "name": "encode",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [144, 285],
    "summary": "将单个 AssistantMessageEvent 转为 frame；终态 done/error 不产出 frame，非法顺序抛错。",
    "tags": ["serialization", "streaming", "encoder"],
    "complexity": "complex",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:encodeTextDelta",
    "type": "function",
    "name": "encodeTextDelta",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [310, 325],
    "summary": "对 text/thinking 增量去掉已被 start 快照覆盖的前缀，只发送未覆盖字符。",
    "tags": ["streaming", "delta", "encoder"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:appendBlock",
    "type": "function",
    "name": "appendBlock",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [328, 342],
    "summary": "按 contentIndex 追加块到还原中的消息，禁止覆盖已有块或留下空洞。",
    "tags": ["reducer", "assistant-message", "validation"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:activeBlock",
    "type": "function",
    "name": "activeBlock",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [344, 366],
    "summary": "取出指定 index 的进行中块并校验 kind，供 reducer 追加 delta。",
    "tags": ["reducer", "validation", "assistant-message"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/assistant-message-frame.ts:reduceAssistantMessageFrames",
    "type": "function",
    "name": "reduceAssistantMessageFrames",
    "filePath": "packages/ai/src/utils/assistant-message-frame.ts",
    "lineRange": [372, 490],
    "summary": "把 frame 序列还原为 AssistantMessage，拼接 text/thinking 并流式解析 toolCall JSON。",
    "tags": ["reducer", "serialization", "assistant-message"],
    "complexity": "complex",
})

add({
    "id": "file:packages/ai/src/utils/deferred-tools.ts",
    "type": "file",
    "name": "deferred-tools.ts",
    "filePath": "packages/ai/src/utils/deferred-tools.ts",
    "summary": "根据 transcript 里 toolResult.addedToolNames，把当前工具拆成立即下发与延迟加载两套。",
    "tags": ["tools", "deferred", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/deferred-tools.ts:splitDeferredTools",
    "type": "function",
    "name": "splitDeferredTools",
    "filePath": "packages/ai/src/utils/deferred-tools.ts",
    "lineRange": [8, 39],
    "summary": "按已用 toolCall 与 addedToolNames 划分 immediate/deferred 工具表，可自定义名称归一化。",
    "tags": ["tools", "deferred", "utility"],
    "complexity": "moderate",
})

add({
    "id": "file:packages/ai/src/utils/diagnostics.ts",
    "type": "file",
    "name": "diagnostics.ts",
    "filePath": "packages/ai/src/utils/diagnostics.ts",
    "summary": "把抛出值规范化为 AssistantMessageDiagnostic，并追加到 assistant 消息的 diagnostics 列表。",
    "tags": ["diagnostics", "error-handling", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/diagnostics.ts:formatThrownValue",
    "type": "function",
    "name": "formatThrownValue",
    "filePath": "packages/ai/src/utils/diagnostics.ts",
    "lineRange": [15, 19],
    "summary": "把 Error 或任意抛出值格式化为诊断字符串。",
    "tags": ["diagnostics", "error-handling", "formatting"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/diagnostics.ts:extractDiagnosticError",
    "type": "function",
    "name": "extractDiagnosticError",
    "filePath": "packages/ai/src/utils/diagnostics.ts",
    "lineRange": [21, 30],
    "summary": "从未知错误提取 name/message，供诊断记录使用。",
    "tags": ["diagnostics", "error-handling", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/diagnostics.ts:createAssistantMessageDiagnostic",
    "type": "function",
    "name": "createAssistantMessageDiagnostic",
    "filePath": "packages/ai/src/utils/diagnostics.ts",
    "lineRange": [32, 38],
    "summary": "创建带 type/error/details 的 AssistantMessageDiagnostic。",
    "tags": ["diagnostics", "factory", "assistant-message"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/diagnostics.ts:appendAssistantMessageDiagnostic",
    "type": "function",
    "name": "appendAssistantMessageDiagnostic",
    "filePath": "packages/ai/src/utils/diagnostics.ts",
    "lineRange": [40, 45],
    "summary": "把一条诊断追加到 AssistantMessage.diagnostics。",
    "tags": ["diagnostics", "assistant-message", "utility"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/error-body.ts",
    "type": "file",
    "name": "error-body.ts",
    "filePath": "packages/ai/src/utils/error-body.ts",
    "summary": "从各厂商 SDK 错误对象抽取 HTTP status 与 body，截断后格式化为可读 provider 错误文本，避免只剩 “403 no body”。",
    "tags": ["error-handling", "provider", "normalization"],
    "complexity": "moderate",
    "languageNotes": "兼容 Mistral、openai、@google/genai、Bedrock 等不同字段名，并用 messageCarriesBody 避免重复打印。",
})
add({
    "id": "function:packages/ai/src/utils/error-body.ts:normalizeProviderError",
    "type": "function",
    "name": "normalizeProviderError",
    "filePath": "packages/ai/src/utils/error-body.ts",
    "lineRange": [38, 54],
    "summary": "探测 SDK 错误形状，返回 status/body/message 及 body 是否已含在 message 中。",
    "tags": ["error-handling", "normalization", "provider"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/error-body.ts:formatProviderError",
    "type": "function",
    "name": "formatProviderError",
    "filePath": "packages/ai/src/utils/error-body.ts",
    "lineRange": [128, 135],
    "summary": "把规范化错误拼成带可选前缀的展示字符串。",
    "tags": ["error-handling", "formatting", "provider"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/error-body.ts:truncateErrorText",
    "type": "function",
    "name": "truncateErrorText",
    "filePath": "packages/ai/src/utils/error-body.ts",
    "lineRange": [137, 140],
    "summary": "按字符上限截断错误文本。",
    "tags": ["error-handling", "utility", "truncation"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/error-body.ts:safeJsonStringify",
    "type": "function",
    "name": "safeJsonStringify",
    "filePath": "packages/ai/src/utils/error-body.ts",
    "lineRange": [142, 149],
    "summary": "安全 JSON.stringify，循环引用或不可序列化时回退占位串。",
    "tags": ["serialization", "error-handling", "utility"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/estimate.ts",
    "type": "file",
    "name": "estimate.ts",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "summary": "用约 4 字符/token 启发式估算消息、图像、工具与完整 context 的 token，并优先复用最近 assistant usage。",
    "tags": ["token-estimate", "utility", "usage"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:calculateContextTokens",
    "type": "function",
    "name": "calculateContextTokens",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [17, 19],
    "summary": "从 Usage 取 totalTokens，否则把 input/output/cache 分量相加。",
    "tags": ["token-estimate", "usage", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:estimateTextTokens",
    "type": "function",
    "name": "estimateTextTokens",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [37, 39],
    "summary": "按字符数/4 估算纯文本 token。",
    "tags": ["token-estimate", "utility", "text"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:estimateTextAndImageContentTokens",
    "type": "function",
    "name": "estimateTextAndImageContentTokens",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [41, 43],
    "summary": "估算文本加图像内容块的 token（图像按固定字符当量）。",
    "tags": ["token-estimate", "images", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:estimateMessageTokens",
    "type": "function",
    "name": "estimateMessageTokens",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [45, 61],
    "summary": "按角色估算单条 user/assistant/toolResult 消息的 token。",
    "tags": ["token-estimate", "message", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:getLastAssistantUsageInfo",
    "type": "function",
    "name": "getLastAssistantUsageInfo",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [63, 87],
    "summary": "从后往前找带有效 usage 的 assistant 消息，作为估算锚点。",
    "tags": ["token-estimate", "usage", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:estimateMessages",
    "type": "function",
    "name": "estimateMessages",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [89, 103],
    "summary": "对消息数组逐条估算并求和。",
    "tags": ["token-estimate", "message", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/estimate.ts:estimateContextTokens",
    "type": "function",
    "name": "estimateContextTokens",
    "filePath": "packages/ai/src/utils/estimate.ts",
    "lineRange": [114, 143],
    "summary": "综合 system、tools、历史 usage 与其后消息，返回 ContextUsageEstimate。",
    "tags": ["token-estimate", "context", "usage"],
    "complexity": "moderate",
})

add({
    "id": "file:packages/ai/src/utils/event-stream.ts",
    "type": "file",
    "name": "event-stream.ts",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "summary": "通用异步事件流：双栈 FIFO 在生产者 push 与消费者 async iterate 之间交接；AssistantMessageEventStream 在 done/error 时给出最终消息。",
    "tags": ["streaming", "async-iterable", "event-stream"],
    "complexity": "moderate",
    "languageNotes": "用两个数组模拟 FIFO，避免 shift 的 O(n) 成本。",
})
add({
    "id": "class:packages/ai/src/utils/event-stream.ts:FifoQueue",
    "type": "class",
    "name": "FifoQueue",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "lineRange": [3, 23],
    "summary": "双栈 FIFO：enqueue 入 incoming，dequeue 时翻转到 outgoing。",
    "tags": ["queue", "utility", "data-structure"],
    "complexity": "simple",
})
add({
    "id": "class:packages/ai/src/utils/event-stream.ts:EventStream",
    "type": "class",
    "name": "EventStream",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "lineRange": [26, 89],
    "summary": "可异步迭代的事件流：push 投递或唤醒 waiter，end 结束，result 等待终态提取值。",
    "tags": ["streaming", "async-iterable", "event-stream"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/event-stream.ts:push",
    "type": "function",
    "name": "push",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "lineRange": [43, 58],
    "summary": "推入事件；若判定完成则 resolve 最终结果，否则交给 waiter 或入队。",
    "tags": ["streaming", "event-stream", "producer"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/event-stream.ts:end",
    "type": "function",
    "name": "end",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "lineRange": [60, 70],
    "summary": "标记流结束，可选写入最终结果并唤醒全部等待中的消费者。",
    "tags": ["streaming", "event-stream", "producer"],
    "complexity": "simple",
})
add({
    "id": "class:packages/ai/src/utils/event-stream.ts:AssistantMessageEventStream",
    "type": "class",
    "name": "AssistantMessageEventStream",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "lineRange": [91, 105],
    "summary": "特化 EventStream：done/error 为终态，分别提取 message 或 error。",
    "tags": ["streaming", "assistant-message", "event-stream"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/event-stream.ts:createAssistantMessageEventStream",
    "type": "function",
    "name": "createAssistantMessageEventStream",
    "filePath": "packages/ai/src/utils/event-stream.ts",
    "lineRange": [108, 110],
    "summary": "工厂函数，供扩展创建 AssistantMessageEventStream。",
    "tags": ["factory", "streaming", "assistant-message"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/hash.ts",
    "type": "file",
    "name": "hash.ts",
    "filePath": "packages/ai/src/utils/hash.ts",
    "summary": "对字符串做 32-bit 滚动哈希，输出 8 位 hex，用作短指纹。",
    "tags": ["utility", "hash", "fingerprint"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/hash.ts:shortHash",
    "type": "function",
    "name": "shortHash",
    "filePath": "packages/ai/src/utils/hash.ts",
    "lineRange": [2, 13],
    "summary": "计算字符串的 32-bit 哈希并格式化为 8 位十六进制。",
    "tags": ["utility", "hash", "fingerprint"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/headers.ts",
    "type": "file",
    "name": "headers.ts",
    "filePath": "packages/ai/src/utils/headers.ts",
    "summary": "把 Fetch Headers 与可空 ProviderHeaders 转成普通 record，过滤 null 值。",
    "tags": ["utility", "headers", "http"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/headers.ts:headersToRecord",
    "type": "function",
    "name": "headersToRecord",
    "filePath": "packages/ai/src/utils/headers.ts",
    "lineRange": [3, 9],
    "summary": "把 Headers 迭代为 Record<string, string>。",
    "tags": ["utility", "headers", "http"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/headers.ts:providerHeadersToRecord",
    "type": "function",
    "name": "providerHeadersToRecord",
    "filePath": "packages/ai/src/utils/headers.ts",
    "lineRange": [11, 18],
    "summary": "把 ProviderHeaders 中非 null 项收成 record，空则返回 undefined。",
    "tags": ["utility", "headers", "provider"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/json-parse.ts",
    "type": "file",
    "name": "json-parse.ts",
    "filePath": "packages/ai/src/utils/json-parse.ts",
    "summary": "修复字符串内控制字符与非法转义，再解析 JSON；并基于 partial-json 解析流式未闭合 JSON。",
    "tags": ["json", "parsing", "streaming", "repair"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/json-parse.ts:escapeControlCharacter",
    "type": "function",
    "name": "escapeControlCharacter",
    "filePath": "packages/ai/src/utils/json-parse.ts",
    "lineRange": [10, 25],
    "summary": "把控制字符转成 JSON 转义或 \\uXXXX。",
    "tags": ["json", "escaping", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/json-parse.ts:repairJson",
    "type": "function",
    "name": "repairJson",
    "filePath": "packages/ai/src/utils/json-parse.ts",
    "lineRange": [32, 83],
    "summary": "扫描 JSON 字符串字面量，转义裸控制字符并修正非法反斜杠转义。",
    "tags": ["json", "repair", "parsing"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/json-parse.ts:parseJsonWithRepair",
    "type": "function",
    "name": "parseJsonWithRepair",
    "filePath": "packages/ai/src/utils/json-parse.ts",
    "lineRange": [85, 95],
    "summary": "先 JSON.parse，失败则 repairJson 后再解析。",
    "tags": ["json", "parsing", "repair"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/json-parse.ts:parseStreamingJson",
    "type": "function",
    "name": "parseStreamingJson",
    "filePath": "packages/ai/src/utils/json-parse.ts",
    "lineRange": [104, 124],
    "summary": "解析可能未闭合的流式 JSON，失败时回退到 repair 后再用 partial-json。",
    "tags": ["json", "streaming", "parsing"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/node-http-proxy.ts",
    "type": "file",
    "name": "node-http-proxy.ts",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "summary": "按 HTTP(S)_PROXY 与 NO_PROXY 决定目标 URL 是否走代理，并拒绝不支持的代理协议。",
    "tags": ["proxy", "http", "environment", "utility"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/node-http-proxy.ts:getProxyEnv",
    "type": "function",
    "name": "getProxyEnv",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "lineRange": [13, 23],
    "summary": "从覆盖 env 或 getProviderEnvValue 读取大小写两种代理变量名。",
    "tags": ["proxy", "environment", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/node-http-proxy.ts:parseProxyTargetUrl",
    "type": "function",
    "name": "parseProxyTargetUrl",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "lineRange": [25, 35],
    "summary": "把目标字符串解析为 URL，非法则返回 undefined。",
    "tags": ["proxy", "url", "parsing"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/node-http-proxy.ts:parseNoProxyEntry",
    "type": "function",
    "name": "parseNoProxyEntry",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "lineRange": [41, 72],
    "summary": "解析 NO_PROXY 单项：主机、可选端口、前导点后缀与 * 通配。",
    "tags": ["proxy", "no-proxy", "parsing"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/node-http-proxy.ts:shouldProxyHostname",
    "type": "function",
    "name": "shouldProxyHostname",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "lineRange": [74, 116],
    "summary": "按 NO_PROXY 规则判断主机名/端口是否应绕过代理。",
    "tags": ["proxy", "no-proxy", "matching"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/node-http-proxy.ts:getProxyForUrl",
    "type": "function",
    "name": "getProxyForUrl",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "lineRange": [118, 136],
    "summary": "按目标协议选择 http(s)_proxy，并尊重 NO_PROXY。",
    "tags": ["proxy", "http", "environment"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/node-http-proxy.ts:resolveHttpProxyUrlForTarget",
    "type": "function",
    "name": "resolveHttpProxyUrlForTarget",
    "filePath": "packages/ai/src/utils/node-http-proxy.ts",
    "lineRange": [141, 161],
    "summary": "解析目标应使用的 HTTP 代理 URL；遇不支持协议抛出 UNSUPPORTED_PROXY_PROTOCOL_MESSAGE。",
    "tags": ["proxy", "http", "validation"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/overflow.ts",
    "type": "file",
    "name": "overflow.ts",
    "filePath": "packages/ai/src/utils/overflow.ts",
    "summary": "用各厂商 context overflow 错误正则与 usage/stopReason 启发式判断是否溢出，以及 length 截断是否可 compact 后重试。",
    "tags": ["overflow", "error-handling", "context-window"],
    "complexity": "moderate",
    "languageNotes": "覆盖 Anthropic/OpenAI/Google/Groq/OpenRouter 等多家错误文案，并用 NON_OVERFLOW_PATTERNS 排除误报。",
})
add({
    "id": "function:packages/ai/src/utils/overflow.ts:isContextOverflow",
    "type": "function",
    "name": "isContextOverflow",
    "filePath": "packages/ai/src/utils/overflow.ts",
    "lineRange": [134, 163],
    "summary": "结合错误正则、非溢出排除项以及 usage 填满窗口等启发式判断 context overflow。",
    "tags": ["overflow", "error-handling", "context-window"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/overflow.ts:isRecoverableLength",
    "type": "function",
    "name": "isRecoverableLength",
    "filePath": "packages/ai/src/utils/overflow.ts",
    "lineRange": [171, 173],
    "summary": "判断 length 停止是否发生在未达期望输出上限时，从而可做一次 compact 重试。",
    "tags": ["overflow", "retry", "length"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/overflow.ts:getOverflowPatterns",
    "type": "function",
    "name": "getOverflowPatterns",
    "filePath": "packages/ai/src/utils/overflow.ts",
    "lineRange": [178, 180],
    "summary": "返回 overflow 正则副本，供测试断言。",
    "tags": ["overflow", "test", "utility"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/pi-user-agent.ts",
    "type": "file",
    "name": "pi-user-agent.ts",
    "filePath": "packages/ai/src/utils/pi-user-agent.ts",
    "summary": "生成带 OS/arch 的 pi-ai User-Agent；在受限运行时通过 process.getBuiltinModule 取 node:os。",
    "tags": ["utility", "user-agent", "http"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/pi-user-agent.ts:getPiUserAgent",
    "type": "function",
    "name": "getPiUserAgent",
    "filePath": "packages/ai/src/utils/pi-user-agent.ts",
    "lineRange": [17, 19],
    "summary": "返回含 platform/release/arch 的 pi-ai User-Agent 字符串。",
    "tags": ["utility", "user-agent", "http"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/provider-env.ts",
    "type": "file",
    "name": "provider-env.ts",
    "filePath": "packages/ai/src/utils/provider-env.ts",
    "summary": "解析 provider 环境变量：覆盖 env、process.env，以及 Bun sandbox 下空 process.env 时从 /proc/self/environ 回退。",
    "tags": ["environment", "provider", "bun", "utility"],
    "complexity": "simple",
    "languageNotes": "复制 coding-agent 的 Bun sandbox 回退，使 pi-ai 可独立使用而不依赖 restoreSandboxEnv。",
})
add({
    "id": "function:packages/ai/src/utils/provider-env.ts:getBunSandboxEnvValue",
    "type": "function",
    "name": "getBunSandboxEnvValue",
    "filePath": "packages/ai/src/utils/provider-env.ts",
    "lineRange": [15, 39],
    "summary": "在 Bun 编译二进制且 process.env 为空时，读取并缓存 /proc/self/environ。",
    "tags": ["environment", "bun", "sandbox"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/provider-env.ts:getProviderEnvValue",
    "type": "function",
    "name": "getProviderEnvValue",
    "filePath": "packages/ai/src/utils/provider-env.ts",
    "lineRange": [45, 52],
    "summary": "按覆盖 env → process.env → Bun sandbox 回退的顺序读取变量。",
    "tags": ["environment", "provider", "utility"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/provider-retry.ts",
    "type": "file",
    "name": "provider-retry.ts",
    "filePath": "packages/ai/src/utils/provider-retry.ts",
    "summary": "HTTP provider 请求重试：识别 x-should-retry / Retry-After 与 408/429/5xx，并在 abortable sleep 后重试。",
    "tags": ["retry", "http", "provider", "backoff"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/provider-retry.ts:isRetryableProviderError",
    "type": "function",
    "name": "isRetryableProviderError",
    "filePath": "packages/ai/src/utils/provider-retry.ts",
    "lineRange": [23, 35],
    "summary": "按 x-should-retry 头或 408/409/429/5xx 判断 provider 错误是否可重试。",
    "tags": ["retry", "http", "error-handling"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/provider-retry.ts:validateServerRetryDelayMs",
    "type": "function",
    "name": "validateServerRetryDelayMs",
    "filePath": "packages/ai/src/utils/provider-retry.ts",
    "lineRange": [37, 49],
    "summary": "校验服务端建议延迟，超过上限则抛错让外层策略处理。",
    "tags": ["retry", "backoff", "validation"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/provider-retry.ts:getRetryDelayMs",
    "type": "function",
    "name": "getRetryDelayMs",
    "filePath": "packages/ai/src/utils/provider-retry.ts",
    "lineRange": [51, 67],
    "summary": "从 Retry-After（秒或 HTTP-date）或指数退避加抖动计算下次等待。",
    "tags": ["retry", "backoff", "http"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/provider-retry.ts:abortableSleep",
    "type": "function",
    "name": "abortableSleep",
    "filePath": "packages/ai/src/utils/provider-retry.ts",
    "lineRange": [75, 95],
    "summary": "可被 AbortSignal 打断的 sleep，中断时抛出 abort Error。",
    "tags": ["retry", "abort", "backoff"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/provider-retry.ts:retryProviderRequest",
    "type": "function",
    "name": "retryProviderRequest",
    "filePath": "packages/ai/src/utils/provider-retry.ts",
    "lineRange": [105, 125],
    "summary": "循环执行 request，遇可重试 provider 错误则 sleep 后重试，直到次数用尽或 abort。",
    "tags": ["retry", "http", "provider"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/retry.ts",
    "type": "file",
    "name": "retry.ts",
    "filePath": "packages/ai/src/utils/retry.ts",
    "summary": "Agent 级 assistant 调用重试：指数退避、配额/账单错误不重试，abort 在退避睡眠中也规范成 aborted 消息。",
    "tags": ["retry", "assistant-message", "backoff", "agent"],
    "complexity": "complex",
    "languageNotes": "RETRYABLE/NON_RETRYABLE 正则覆盖 overload、网络、WebSocket 与多家 stream 提前结束文案。",
})
add({
    "id": "function:packages/ai/src/utils/retry.ts:retryDelayMs",
    "type": "function",
    "name": "retryDelayMs",
    "filePath": "packages/ai/src/utils/retry.ts",
    "lineRange": [111, 115],
    "summary": "按 baseDelayMs * 2^(attempt-1) 计算延迟，并受 maxAgentDelayMs 上限约束。",
    "tags": ["retry", "backoff", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/retry.ts:sleep",
    "type": "function",
    "name": "sleep",
    "filePath": "packages/ai/src/utils/retry.ts",
    "lineRange": [138, 154],
    "summary": "可 abort 的延迟；中断时抛 RetrySleepAbortError。",
    "tags": ["retry", "abort", "backoff"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/retry.ts:retryAssistantCall",
    "type": "function",
    "name": "retryAssistantCall",
    "filePath": "packages/ai/src/utils/retry.ts",
    "lineRange": [174, 224],
    "summary": "对 produce() 做有界重试：成功/不可重试立即返回，否则退避并回调 onRetry*。",
    "tags": ["retry", "assistant-message", "agent"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/retry.ts:isRetryableAssistantError",
    "type": "function",
    "name": "isRetryableAssistantError",
    "filePath": "packages/ai/src/utils/retry.ts",
    "lineRange": [235, 240],
    "summary": "用配额类排除正则与可重试 provider 错误正则判断 assistant 错误是否可重试。",
    "tags": ["retry", "error-handling", "classification"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/sanitize-unicode.ts",
    "type": "file",
    "name": "sanitize-unicode.ts",
    "filePath": "packages/ai/src/utils/sanitize-unicode.ts",
    "summary": "把孤立 UTF-16 surrogate 替换为 U+FFFD，避免非法 Unicode 进入 provider 请求。",
    "tags": ["unicode", "sanitization", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/sanitize-unicode.ts:sanitizeSurrogates",
    "type": "function",
    "name": "sanitizeSurrogates",
    "filePath": "packages/ai/src/utils/sanitize-unicode.ts",
    "lineRange": [21, 25],
    "summary": "替换文本中的孤立 surrogate 为替换字符。",
    "tags": ["unicode", "sanitization", "utility"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/text.ts",
    "type": "file",
    "name": "text.ts",
    "filePath": "packages/ai/src/utils/text.ts",
    "summary": "从消息内容块中抽出 type=text 的文本并拼接。",
    "tags": ["utility", "text", "content"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/text.ts:contentText",
    "type": "function",
    "name": "contentText",
    "filePath": "packages/ai/src/utils/text.ts",
    "lineRange": [6, 12],
    "summary": "若输入已是字符串则原样返回，否则过滤 text 块并用分隔符 join。",
    "tags": ["utility", "text", "content"],
    "complexity": "simple",
})

add({
    "id": "file:packages/ai/src/utils/validation.ts",
    "type": "file",
    "name": "validation.ts",
    "filePath": "packages/ai/src/utils/validation.ts",
    "summary": "用 TypeBox 校验 tool call 是否存在于工具表，并按 JSON Schema 强制转换/校验 arguments。",
    "tags": ["validation", "tools", "json-schema", "typebox"],
    "complexity": "complex",
    "languageNotes": "对 string/number/integer/boolean 做宽松 coerce，union/allOf/anyOf 走 TypeBox Compile 缓存。",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:matchesJsonType",
    "type": "function",
    "name": "matchesJsonType",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [30, 49],
    "summary": "判断运行时值是否匹配 JSON Schema type（含 integer）。",
    "tags": ["validation", "json-schema", "utility"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:coercePrimitiveByType",
    "type": "function",
    "name": "coercePrimitiveByType",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [59, 131],
    "summary": "按声明 type 把字符串等宽松值强制转为 number/integer/boolean/string。",
    "tags": ["validation", "coercion", "json-schema"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:applySchemaObjectCoercion",
    "type": "function",
    "name": "applySchemaObjectCoercion",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [133, 154],
    "summary": "对 object schema 的 properties 与 additionalProperties 递归 coerce。",
    "tags": ["validation", "coercion", "json-schema"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:applySchemaArrayCoercion",
    "type": "function",
    "name": "applySchemaArrayCoercion",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [156, 173],
    "summary": "对 array schema 的 items（单 schema 或 tuple）递归 coerce。",
    "tags": ["validation", "coercion", "json-schema"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:coerceWithUnionSchema",
    "type": "function",
    "name": "coerceWithUnionSchema",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [175, 192],
    "summary": "对 anyOf/oneOf 分支尝试 coerce，并用 TypeBox validator 选中第一个匹配分支。",
    "tags": ["validation", "coercion", "union"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:coerceWithJsonSchema",
    "type": "function",
    "name": "coerceWithJsonSchema",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [194, 238],
    "summary": "按 schema 组合（allOf/anyOf/oneOf/object/array/primitive）递归强制转换。",
    "tags": ["validation", "coercion", "json-schema"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:normalizeOptionalNulls",
    "type": "function",
    "name": "normalizeOptionalNulls",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [240, 269],
    "summary": "去掉可选字段上的 null，使其符合 TypeBox 对 missing vs null 的区分。",
    "tags": ["validation", "normalization", "json-schema"],
    "complexity": "moderate",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:getValidator",
    "type": "function",
    "name": "getValidator",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [271, 280],
    "summary": "用 WeakMap 缓存 TypeBox Compile 结果。",
    "tags": ["validation", "typebox", "cache"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:formatValidationPath",
    "type": "function",
    "name": "formatValidationPath",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [282, 293],
    "summary": "把 TypeBox 校验错误路径格式化为可读 JSON Pointer 风格字符串。",
    "tags": ["validation", "formatting", "error-handling"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:validateToolCall",
    "type": "function",
    "name": "validateToolCall",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [302, 308],
    "summary": "确认 toolCall.name 存在于工具表，否则返回错误信息。",
    "tags": ["validation", "tools", "tool-call"],
    "complexity": "simple",
})
add({
    "id": "function:packages/ai/src/utils/validation.ts:validateToolArguments",
    "type": "function",
    "name": "validateToolArguments",
    "filePath": "packages/ai/src/utils/validation.ts",
    "lineRange": [317, 350],
    "summary": "对 tool.parameters 做 coerce、去可选 null，再用 TypeBox 校验 arguments。",
    "tags": ["validation", "tools", "json-schema"],
    "complexity": "moderate",
})

# uniqueness
ids = [n["id"] for n in nodes]
assert len(ids) == len(set(ids)), "duplicate node ids"

file_nodes = [n for n in nodes if n["type"] == "file"]
assert len(file_nodes) == 24, len(file_nodes)

# --- edges ---
edges: list[dict] = []

# contains + exports
EXPORTED = {
    "class:packages/ai/src/models-store.ts:InMemoryModelsStore",
    "function:packages/ai/src/providers/faux.ts:fauxText",
    "function:packages/ai/src/providers/faux.ts:fauxThinking",
    "function:packages/ai/src/providers/faux.ts:fauxToolCall",
    "function:packages/ai/src/providers/faux.ts:fauxAssistantMessage",
    "function:packages/ai/src/providers/faux.ts:createFauxCore",
    "function:packages/ai/src/providers/faux.ts:fauxProvider",
    "function:packages/ai/src/providers/images/register-builtins.ts:generateImagesOpenRouter",
    "function:packages/ai/src/providers/images/register-builtins.ts:registerBuiltInImagesApiProviders",
    "function:packages/ai/src/session-resources.ts:registerSessionResourceCleanup",
    "function:packages/ai/src/session-resources.ts:cleanupSessionResources",
    "function:packages/ai/src/utils/abort-signals.ts:combineAbortSignals",
    "class:packages/ai/src/utils/assistant-message-frame.ts:AssistantMessageFrameEncoder",
    "function:packages/ai/src/utils/assistant-message-frame.ts:reduceAssistantMessageFrames",
    "function:packages/ai/src/utils/deferred-tools.ts:splitDeferredTools",
    "function:packages/ai/src/utils/diagnostics.ts:formatThrownValue",
    "function:packages/ai/src/utils/diagnostics.ts:extractDiagnosticError",
    "function:packages/ai/src/utils/diagnostics.ts:createAssistantMessageDiagnostic",
    "function:packages/ai/src/utils/diagnostics.ts:appendAssistantMessageDiagnostic",
    "function:packages/ai/src/utils/error-body.ts:normalizeProviderError",
    "function:packages/ai/src/utils/error-body.ts:formatProviderError",
    "function:packages/ai/src/utils/error-body.ts:truncateErrorText",
    "function:packages/ai/src/utils/error-body.ts:safeJsonStringify",
    "function:packages/ai/src/utils/estimate.ts:calculateContextTokens",
    "function:packages/ai/src/utils/estimate.ts:estimateTextTokens",
    "function:packages/ai/src/utils/estimate.ts:estimateTextAndImageContentTokens",
    "function:packages/ai/src/utils/estimate.ts:estimateMessageTokens",
    "function:packages/ai/src/utils/estimate.ts:estimateContextTokens",
    "class:packages/ai/src/utils/event-stream.ts:EventStream",
    "class:packages/ai/src/utils/event-stream.ts:AssistantMessageEventStream",
    "function:packages/ai/src/utils/event-stream.ts:createAssistantMessageEventStream",
    "function:packages/ai/src/utils/hash.ts:shortHash",
    "function:packages/ai/src/utils/headers.ts:headersToRecord",
    "function:packages/ai/src/utils/headers.ts:providerHeadersToRecord",
    "function:packages/ai/src/utils/json-parse.ts:repairJson",
    "function:packages/ai/src/utils/json-parse.ts:parseJsonWithRepair",
    "function:packages/ai/src/utils/json-parse.ts:parseStreamingJson",
    "function:packages/ai/src/utils/node-http-proxy.ts:resolveHttpProxyUrlForTarget",
    "function:packages/ai/src/utils/overflow.ts:isContextOverflow",
    "function:packages/ai/src/utils/overflow.ts:isRecoverableLength",
    "function:packages/ai/src/utils/overflow.ts:getOverflowPatterns",
    "function:packages/ai/src/utils/pi-user-agent.ts:getPiUserAgent",
    "function:packages/ai/src/utils/provider-env.ts:getProviderEnvValue",
    "function:packages/ai/src/utils/provider-retry.ts:retryProviderRequest",
    "function:packages/ai/src/utils/retry.ts:retryDelayMs",
    "function:packages/ai/src/utils/retry.ts:retryAssistantCall",
    "function:packages/ai/src/utils/retry.ts:isRetryableAssistantError",
    "function:packages/ai/src/utils/sanitize-unicode.ts:sanitizeSurrogates",
    "function:packages/ai/src/utils/text.ts:contentText",
    "function:packages/ai/src/utils/validation.ts:validateToolCall",
    "function:packages/ai/src/utils/validation.ts:validateToolArguments",
}

for n in nodes:
    if n["type"] in ("function", "class"):
        src = f"file:{n['filePath']}"
        edges.append({
            "source": src,
            "target": n["id"],
            "type": "contains",
            "direction": "forward",
            "weight": 1.0,
        })
        if n["id"] in EXPORTED:
            edges.append({
                "source": src,
                "target": n["id"],
                "type": "exports",
                "direction": "forward",
                "weight": 0.8,
            })

# imports 1:1
import_count = 0
for src_path, targets in batch_imports.items():
    for t in targets:
        assert src_path != t
        edges.append({
            "source": f"file:{src_path}",
            "target": f"file:{t}",
            "type": "imports",
            "direction": "forward",
            "weight": 0.7,
        })
        import_count += 1
expected_imports = sum(len(v) for v in batch_imports.values())
assert import_count == expected_imports, (import_count, expected_imports)

# calls (cross-file; skip same-batch cross-part function targets that fail part validation)
edges.extend([
    {
        "source": "function:packages/ai/src/providers/faux.ts:createFauxCore",
        "target": "function:packages/ai/src/utils/event-stream.ts:createAssistantMessageEventStream",
        "type": "calls",
        "direction": "forward",
        "weight": 0.8,
    },
    {
        "source": "function:packages/ai/src/providers/faux.ts:fauxProvider",
        "target": "function:packages/ai/src/models.ts:createProvider",
        "type": "calls",
        "direction": "forward",
        "weight": 0.8,
    },
    {
        "source": "function:packages/ai/src/providers/images/register-builtins.ts:registerBuiltInImagesApiProviders",
        "target": "function:packages/ai/src/images-api-registry.ts:registerImagesApiProvider",
        "type": "calls",
        "direction": "forward",
        "weight": 0.8,
    },
    {
        "source": "function:packages/ai/src/providers/images/register-builtins.ts:generateImagesOpenRouter",
        "target": "function:packages/ai/src/api/openrouter-images.ts:generateImages",
        "type": "calls",
        "direction": "forward",
        "weight": 0.8,
    },
    {
        "source": "function:packages/ai/src/utils/node-http-proxy.ts:getProxyEnv",
        "target": "function:packages/ai/src/utils/provider-env.ts:getProviderEnvValue",
        "type": "calls",
        "direction": "forward",
        "weight": 0.8,
    },
])

edges.append({
    "source": "class:packages/ai/src/utils/event-stream.ts:AssistantMessageEventStream",
    "target": "class:packages/ai/src/utils/event-stream.ts:EventStream",
    "type": "inherits",
    "direction": "forward",
    "weight": 0.9,
})

# no self-edges
for e in edges:
    assert e["source"] != e["target"], e

# split
file_paths = sorted({n["filePath"] for n in nodes if "filePath" in n and n["type"] == "file"})
assert file_paths == sorted(f["path"] for f in brief["files"])

node_count = len(nodes)
edge_count = len(edges)
parts_n = max(1, -(-node_count // 60), -(-edge_count // 120))  # ceil
print(f"totals nodes={node_count} edges={edge_count} parts={parts_n} imports={import_count} exports={len(EXPORTED)}")

chunk = -(-len(file_paths) // parts_n)
part_files = [file_paths[i : i + chunk] for i in range(0, len(file_paths), chunk)]
assert len(part_files) == parts_n, (len(part_files), parts_n)

# neighbor symbols for validation
neighbor_files = set()
neighbor_symbols: set[tuple[str, str, str]] = set()  # (kind-ish, path, symbol)
for src, neighs in neighbor_map.items():
    for n in neighs:
        neighbor_files.add(n["path"])
        for s in n.get("symbols") or []:
            neighbor_symbols.add(("function", n["path"], s))
            neighbor_symbols.add(("class", n["path"], s))
import_targets = set()
for ts in batch_imports.values():
    import_targets.update(ts)
allowed_files = set(file_paths) | neighbor_files | import_targets | set(batch_imports.keys())

out_dir = UA / "intermediate"
written = []
for i, group in enumerate(part_files, 1):
    group_set = set(group)
    part_nodes = [n for n in nodes if n.get("filePath") in group_set]
    part_ids = {n["id"] for n in part_nodes}
    part_edges = [e for e in edges if e["source"] in part_ids]

    failed = []
    for e in part_edges:
        for end in (e["source"], e["target"]):
            if end in part_ids:
                continue
            if end.startswith("file:"):
                path = end[len("file:") :]
                if path in neighbor_files or path in import_targets or path in batch_imports:
                    continue
                failed.append((e, end, "file not in neighbor/import"))
                continue
            if end.startswith("function:") or end.startswith("class:"):
                kind, rest = end.split(":", 1)
                # function:<path>:<symbol>
                # path may contain colons? not here
                path, symbol = rest.rsplit(":", 1)
                if path in neighbor_files and any(
                    s == symbol for neighs in neighbor_map.values() for n in neighs if n["path"] == path for s in (n.get("symbols") or [])
                ):
                    continue
                # same-batch other part: only allowed if listed as neighbor symbol — will fail
                failed.append((e, end, "cross-ref not in neighbor.symbols"))
                continue
            failed.append((e, end, "unknown id form"))
    if failed:
        raise SystemExit(f"validation failed part {i}: {failed[:5]} count={len(failed)}")

    out = out_dir / f"batch-18-part-{i}.json"
    out.write_text(json.dumps({"nodes": part_nodes, "edges": part_edges}, ensure_ascii=False, indent=2) + "\n")
    written.append((out.name, len(part_nodes), len(part_edges), group))
    print(f"wrote {out} nodes={len(part_nodes)} edges={len(part_edges)} files={len(group)}")

print("FILES", [p for p, *_ in written])
print("ALL_FILES", file_paths)
