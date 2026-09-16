#!/usr/bin/env python3
"""Generate batch-9 knowledge graph fragments."""
from __future__ import annotations

import json
import math
from pathlib import Path

UA = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
BRIEF = json.loads((UA / "intermediate/batch-briefs/batch-9.json").read_text())
IMPORTS: dict[str, list[str]] = BRIEF["batchImportData"]
OUT_DIR = UA / "intermediate"

# --- helpers ---

def node(id, type, name, summary, tags, complexity, filePath=None, lineRange=None, languageNotes=None):
    n = {"id": id, "type": type, "name": name, "summary": summary, "tags": tags, "complexity": complexity}
    if filePath:
        n["filePath"] = filePath
    if lineRange:
        n["lineRange"] = lineRange
    if languageNotes:
        n["languageNotes"] = languageNotes
    return n


def edge(source, target, typ, weight):
    return {"source": source, "target": target, "type": typ, "direction": "forward", "weight": weight}


def fid(path):
    return f"file:{path}"


def fnid(path, name):
    return f"function:{path}:{name}"


def clid(path, name):
    return f"class:{path}:{name}"


# path constants
P_LOOP = "packages/agent/src/agent-loop.ts"
P_AGENT = "packages/agent/src/agent.ts"
P_HARNESS = "packages/agent/src/harness/agent-harness.ts"
P_BRANCH = "packages/agent/src/harness/compaction/branch-summarization.ts"
P_COMPACT = "packages/agent/src/harness/compaction/compaction.ts"
P_CUTILS = "packages/agent/src/harness/compaction/utils.ts"
P_CONFIG = "packages/agent/src/harness/config.ts"
P_CTX = "packages/agent/src/harness/context.ts"
P_NODE = "packages/agent/src/harness/env/nodejs.ts"
P_EVENTS = "packages/agent/src/harness/events.ts"
P_ASST = "packages/agent/src/harness/execution/assistant.ts"
P_GATE = "packages/agent/src/harness/execution/effect-gate.ts"
P_TOOLS = "packages/agent/src/harness/execution/tools.ts"
P_HOOKS = "packages/agent/src/harness/hooks.ts"
P_MSGS = "packages/agent/src/harness/messages.ts"
P_TPL = "packages/agent/src/harness/prompt-templates.ts"
P_RESULT = "packages/agent/src/harness/result.ts"
P_DRIVE = "packages/agent/src/harness/runtime/drive.ts"
P_BOUND = "packages/agent/src/harness/runtime/drive/boundary.ts"
P_CHK = "packages/agent/src/harness/runtime/drive/checkpoint.ts"
P_DEF = "packages/agent/src/harness/runtime/drive/deferred.ts"
P_GEN = "packages/agent/src/harness/runtime/drive/generation.ts"
P_REC = "packages/agent/src/harness/runtime/drive/reconcile.ts"
P_RCV = "packages/agent/src/harness/runtime/drive/recovery.ts"
P_RESP = "packages/agent/src/harness/runtime/drive/response.ts"
P_RETRY = "packages/agent/src/harness/runtime/drive/retry.ts"
P_STR = "packages/agent/src/harness/runtime/drive/structural.ts"
P_TERM = "packages/agent/src/harness/runtime/drive/terminal.ts"
P_PLACE = "packages/agent/src/harness/runtime/drive/tool-placement.ts"

# (path, name, start, end, exported, kind=function|class, summary, tags, complexity, notes?)
SYMBOLS: list[tuple] = []


def add(path, name, a, b, exported, kind, summary, tags, complexity, notes=None):
    SYMBOLS.append((path, name, a, b, exported, kind, summary, tags, complexity, notes))


# ===== files + symbols =====
FILES = [
    node(fid(P_LOOP), "file", "agent-loop.ts", P_LOOP,
         "实现 Agent 主循环：写入 prompt、流式拉取 assistant 回复，并按序或并行执行 tool call。",
         ["entry-point", "agent-loop", "tool-execution", "streaming"], "complex",
         "全程使用 AgentMessage，仅在调用 LLM 边界转换为 Message[]。"),
    node(fid(P_AGENT), "file", "agent.ts", P_AGENT,
         "对外 Agent 类：维护可变状态、steering/follow-up 队列，并通过生命周期包装驱动 agent-loop。",
         ["entry-point", "agent", "state-management", "event-handler"], "complex"),
    node(fid(P_HARNESS), "file", "agent-harness.ts", P_HARNESS,
         "Harness 公共类型、错误再导出，以及把 createAgentHarness 挂到 AgentHarness.create 的工厂入口。",
         ["type-definition", "harness", "barrel", "factory"], "complex",
         "以类型与接口为主，运行时仅转发 createAgentHarness。"),
    node(fid(P_BRANCH), "file", "branch-summarization.ts", P_BRANCH,
         "从 session 分支收集条目、按 token 预算裁剪，并请求 LLM 生成分支摘要。",
         ["compaction", "summarization", "branch", "llm"], "complex"),
    node(fid(P_COMPACT), "file", "compaction.ts", P_COMPACT,
         "上下文压缩核心：估算 token、寻找合法切点、生成摘要，并把 compact 结果写回 session。",
         ["compaction", "summarization", "token-budget", "llm"], "complex"),
    node(fid(P_CUTILS), "file", "utils.ts", P_CUTILS,
         "压缩/摘要辅助：从消息提取文件读写集合，并把对话序列化为可送入 LLM 的文本。",
         ["utility", "compaction", "serialization"], "moderate"),
    node(fid(P_CONFIG), "file", "config.ts", P_CONFIG,
         "校验 tool 名称唯一性、RetryPolicy 与 CompactionSettings 的数值约束。",
         ["validation", "configuration", "retry"], "simple"),
    node(fid(P_CTX), "file", "context.ts", P_CTX,
         "再导出 Chord Context API，并用 ContextKey 在 context 上挂接 telemetry parent。",
         ["barrel", "context", "telemetry", "type-definition"], "simple"),
    node(fid(P_NODE), "file", "nodejs.ts", P_NODE,
         "Node.js ExecutionEnv：解析路径、拉起 shell、读写文件，并管理子进程树与临时目录。",
         ["execution-env", "nodejs", "filesystem", "shell"], "complex",
         "覆盖 POSIX/Windows/WSL 的 bash 探测与进程树终止。"),
    node(fid(P_EVENTS), "file", "events.ts", P_EVENTS,
         "Harness 事件总线：串行投递、快照级 watch，以及可重快照的缓冲 watcher。",
         ["event-handler", "pubsub", "harness"], "complex"),
    node(fid(P_ASST), "file", "assistant.ts", P_ASST,
         "构造 harness assistant 请求选项，并消费模型 EventStream 转发给 observer。",
         ["streaming", "assistant", "llm"], "moderate"),
    node(fid(P_GATE), "file", "effect-gate.ts", P_GATE,
         "可中止的 effect 门闩：admit 执行副作用，signalAbort/close 统一取消进行中的调用。",
         ["concurrency", "cancellation", "gate"], "moderate"),
    node(fid(P_TOOLS), "file", "tools.ts", P_TOOLS,
         "单次 tool call 的 prepare、before-hook 决策、经 gate 执行与 finalize。",
         ["tool-execution", "validation", "execution"], "moderate"),
    node(fid(P_HOOKS), "file", "hooks.ts", P_HOOKS,
         "HookRegistry：按生命周期阶段注册并聚合 before/after hooks，同时合并 stream options patch。",
         ["hooks", "middleware", "telemetry", "aggregation"], "complex"),
    node(fid(P_MSGS), "file", "messages.ts", P_MSGS,
         "把 bashExecution/custom/branchSummary/compactionSummary 等扩展消息转换为 LLM Message。",
         ["serialization", "messages", "llm"], "moderate"),
    node(fid(P_TPL), "file", "prompt-templates.ts", P_TPL,
         "从目录或文件加载带 YAML frontmatter 的 prompt 模板，并解析/替换命令参数。",
         ["prompt-templates", "loader", "frontmatter"], "complex"),
    node(fid(P_RESULT), "file", "result.ts", P_RESULT,
         "定义 Result 联合类型与 TaggedError 工厂，以及 harness 操作失败用的一组带标签错误。",
         ["type-definition", "error-handling", "result"], "moderate"),
    node(fid(P_DRIVE), "file", "drive.ts", P_DRIVE,
         "按 operation 状态机分派 durable 过程，直到 settled、waiting 或取消调和。",
         ["state-machine", "drive", "orchestrator"], "moderate"),
    node(fid(P_BOUND), "file", "boundary.ts", P_BOUND,
         "run 边界：归一化 retry policy、规划 inbox 落盘，并在结束时提交边界事件。",
         ["drive", "inbox", "session-commit", "boundary"], "complex"),
    node(fid(P_CHK), "file", "checkpoint.ts", P_CHK,
         "启动 run（注入 prompt 条目）并在 checkpoint 规划 compaction 与 inbox。",
         ["drive", "checkpoint", "compaction"], "moderate"),
    node(fid(P_DEF), "file", "deferred.ts", P_DEF,
         "轮询 deferred/suspended 模型响应：准备 poll、发布 intent、消费流并写回。",
         ["drive", "deferred", "streaming", "polling"], "complex"),
    node(fid(P_GEN), "file", "generation.ts", P_GEN,
         "准备 assistant generation（模型、工具、system prompt），发布 intent 并执行或等待重试。",
         ["drive", "generation", "streaming", "retry"], "complex"),
    node(fid(P_REC), "file", "reconcile.ts", P_REC,
         "取消调和：尽力取消 deferred、回收 assistant effect，并发布 aborted 终态。",
         ["drive", "cancellation", "recovery"], "moderate"),
    node(fid(P_RCV), "file", "recovery.ts", P_RCV,
         "从已写入的 assistant 帧重建中断消息，并发布 generation/取消后的响应。",
         ["drive", "recovery", "streaming"], "moderate"),
    node(fid(P_RESP), "file", "response.ts", P_RESP,
         "打开 assistant 流进度、发布配置失败，并按 overflow/retry/abort 规范化后提交响应。",
         ["drive", "response", "error-handling", "streaming"], "complex"),
    node(fid(P_RETRY), "file", "retry.ts", P_RETRY,
         "按 RetryPolicy 计算下次重试时间，并在 AbortSignal 下等待到点。",
         ["retry", "utility", "cancellation"], "simple"),
    node(fid(P_STR), "file", "structural.ts", P_STR,
         "结构性任务驱动：compaction/分支摘要的决策、嵌套 LLM 请求、重试等待与导航提交。",
         ["drive", "compaction", "summarization", "navigation"], "complex"),
    node(fid(P_TERM), "file", "terminal.ts", P_TERM,
         "扫描并删除 operation 临时键，同时构造 operation 结果记录。",
         ["drive", "cleanup", "session"], "moderate"),
    node(fid(P_PLACE), "file", "tool-placement.ts", P_PLACE,
         "读取 tool batch 来源与待提交结果，物化后写入 session 并推进 lane 状态。",
         ["drive", "tool-execution", "session-commit"], "complex"),
]

# fix FILES - I used positional args wrong. Rebuild properly below.
FILES = []


def fnode(path, name, summary, tags, complexity, notes=None):
    FILES.append(node(fid(path), "file", name, summary, tags, complexity, filePath=path, languageNotes=notes))


fnode(P_LOOP, "agent-loop.ts",
      "实现 Agent 主循环：写入 prompt、流式拉取 assistant 回复，并按序或并行执行 tool call。",
      ["entry-point", "agent-loop", "tool-execution", "streaming"], "complex",
      "全程使用 AgentMessage，仅在调用 LLM 边界转换为 Message[]。")
fnode(P_AGENT, "agent.ts",
      "对外 Agent 类：维护可变状态、steering/follow-up 队列，并通过生命周期包装驱动 agent-loop。",
      ["entry-point", "agent", "state-management", "event-handler"], "complex")
fnode(P_HARNESS, "agent-harness.ts",
      "Harness 公共类型、错误再导出，以及把 createAgentHarness 挂到 AgentHarness.create 的工厂入口。",
      ["type-definition", "harness", "barrel", "factory"], "complex",
      "以类型与接口为主，运行时仅转发 createAgentHarness。")
fnode(P_BRANCH, "branch-summarization.ts",
      "从 session 分支收集条目、按 token 预算裁剪，并请求 LLM 生成分支摘要。",
      ["compaction", "summarization", "branch", "llm"], "complex")
fnode(P_COMPACT, "compaction.ts",
      "上下文压缩核心：估算 token、寻找合法切点、生成摘要，并把 compact 结果写回 session。",
      ["compaction", "summarization", "token-budget", "llm"], "complex")
fnode(P_CUTILS, "utils.ts",
      "压缩/摘要辅助：从消息提取文件读写集合，并把对话序列化为可送入 LLM 的文本。",
      ["utility", "compaction", "serialization"], "moderate")
fnode(P_CONFIG, "config.ts",
      "校验 tool 名称唯一性、RetryPolicy 与 CompactionSettings 的数值约束。",
      ["validation", "configuration", "retry"], "simple")
fnode(P_CTX, "context.ts",
      "再导出 Chord Context API，并用 ContextKey 在 context 上挂接 telemetry parent。",
      ["barrel", "context", "telemetry", "type-definition"], "simple")
fnode(P_NODE, "nodejs.ts",
      "Node.js ExecutionEnv：解析路径、拉起 shell、读写文件，并管理子进程树与临时目录。",
      ["execution-env", "nodejs", "filesystem", "shell"], "complex",
      "覆盖 POSIX/Windows/WSL 的 bash 探测与进程树终止。")
fnode(P_EVENTS, "events.ts",
      "Harness 事件总线：串行投递、快照级 watch，以及可重快照的缓冲 watcher。",
      ["event-handler", "pubsub", "harness"], "complex")
fnode(P_ASST, "assistant.ts",
      "构造 harness assistant 请求选项，并消费模型 EventStream 转发给 observer。",
      ["streaming", "assistant", "llm"], "moderate")
fnode(P_GATE, "effect-gate.ts",
      "可中止的 effect 门闩：admit 执行副作用，signalAbort/close 统一取消进行中的调用。",
      ["concurrency", "cancellation", "gate"], "moderate")
fnode(P_TOOLS, "tools.ts",
      "单次 tool call 的 prepare、before-hook 决策、经 gate 执行与 finalize。",
      ["tool-execution", "validation", "execution"], "moderate")
fnode(P_HOOKS, "hooks.ts",
      "HookRegistry：按生命周期阶段注册并聚合 before/after hooks，同时合并 stream options patch。",
      ["hooks", "middleware", "telemetry", "aggregation"], "complex")
fnode(P_MSGS, "messages.ts",
      "把 bashExecution/custom/branchSummary/compactionSummary 等扩展消息转换为 LLM Message。",
      ["serialization", "messages", "llm"], "moderate")
fnode(P_TPL, "prompt-templates.ts",
      "从目录或文件加载带 YAML frontmatter 的 prompt 模板，并解析/替换命令参数。",
      ["prompt-templates", "loader", "frontmatter"], "complex")
fnode(P_RESULT, "result.ts",
      "定义 Result 联合类型与 TaggedError 工厂，以及 harness 操作失败用的一组带标签错误。",
      ["type-definition", "error-handling", "result"], "moderate")
fnode(P_DRIVE, "drive.ts",
      "按 operation 状态机分派 durable 过程，直到 settled、waiting 或取消调和。",
      ["state-machine", "drive", "orchestrator"], "moderate")
fnode(P_BOUND, "boundary.ts",
      "run 边界：归一化 retry policy、规划 inbox 落盘，并在结束时提交边界事件。",
      ["drive", "inbox", "session-commit", "boundary"], "complex")
fnode(P_CHK, "checkpoint.ts",
      "启动 run（注入 prompt 条目）并在 checkpoint 规划 compaction 与 inbox。",
      ["drive", "checkpoint", "compaction"], "moderate")
fnode(P_DEF, "deferred.ts",
      "轮询 deferred/suspended 模型响应：准备 poll、发布 intent、消费流并写回。",
      ["drive", "deferred", "streaming", "polling"], "complex")
fnode(P_GEN, "generation.ts",
      "准备 assistant generation（模型、工具、system prompt），发布 intent 并执行或等待重试。",
      ["drive", "generation", "streaming", "retry"], "complex")
fnode(P_REC, "reconcile.ts",
      "取消调和：尽力取消 deferred、回收 assistant effect，并发布 aborted 终态。",
      ["drive", "cancellation", "recovery"], "moderate")
fnode(P_RCV, "recovery.ts",
      "从已写入的 assistant 帧重建中断消息，并发布 generation/取消后的响应。",
      ["drive", "recovery", "streaming"], "moderate")
fnode(P_RESP, "response.ts",
      "打开 assistant 流进度、发布配置失败，并按 overflow/retry/abort 规范化后提交响应。",
      ["drive", "response", "error-handling", "streaming"], "complex")
fnode(P_RETRY, "retry.ts",
      "按 RetryPolicy 计算下次重试时间，并在 AbortSignal 下等待到点。",
      ["retry", "utility", "cancellation"], "simple")
fnode(P_STR, "structural.ts",
      "结构性任务驱动：compaction/分支摘要的决策、嵌套 LLM 请求、重试等待与导航提交。",
      ["drive", "compaction", "summarization", "navigation"], "complex")
fnode(P_TERM, "terminal.ts",
      "扫描并删除 operation 临时键，同时构造 operation 结果记录。",
      ["drive", "cleanup", "session"], "moderate")
fnode(P_PLACE, "tool-placement.ts",
      "读取 tool batch 来源与待提交结果，物化后写入 session 并推进 lane 状态。",
      ["drive", "tool-execution", "session-commit"], "complex")

# agent-loop
add(P_LOOP, "agentLoop", 32, 55, True, "function",
    "以 EventStream 包装启动新 prompt 的 agent 循环，并把事件推给调用方。",
    ["entry-point", "streaming", "agent-loop"], "simple")
add(P_LOOP, "agentLoopContinue", 65, 94, True, "function",
    "以 EventStream 包装从现有上下文继续的 agent 循环。",
    ["entry-point", "streaming", "agent-loop"], "simple")
add(P_LOOP, "runAgentLoop", 96, 119, True, "function",
    "发出 prompt 事件后进入 runLoop，缺省 streamFn 时回落到 getDefaultStreamFn。",
    ["agent-loop", "streaming"], "simple")
add(P_LOOP, "runAgentLoopContinue", 121, 144, True, "function",
    "不追加新 prompt，直接继续现有上下文上的循环。",
    ["agent-loop", "streaming"], "simple")
add(P_LOOP, "runLoop", 156, 273, False, "function",
    "主循环：注入 steering、流式生成 assistant，并在 tool call 后决定是否停轮。",
    ["agent-loop", "orchestration", "tool-execution"], "moderate")
add(P_LOOP, "streamAssistantResponse", 279, 370, False, "function",
    "调用 streamFn 拉取 assistant 流，聚合内容并处理中途错误。",
    ["streaming", "assistant", "llm"], "moderate")
add(P_LOOP, "failToolCallsFromTruncatedMessage", 379, 404, False, "function",
    "当 assistant 消息被截断时，为未完成的 tool call 合成失败结果。",
    ["error-handling", "tool-execution"], "simple")
add(P_LOOP, "executeToolCalls", 409, 424, False, "function",
    "按配置在串行与并行两种策略间分派 tool call 批次。",
    ["tool-execution", "orchestration"], "simple")
add(P_LOOP, "executeToolCallsSequential", 431, 485, False, "function",
    "按顺序 prepare/execute/finalize 每个 tool call，遇终止标志则停批。",
    ["tool-execution", "sequential"], "moderate")
add(P_LOOP, "executeToolCallsParallel", 487, 561, False, "function",
    "并行执行已准备好的 tool call，再按原顺序 finalize。",
    ["tool-execution", "concurrency"], "moderate")
add(P_LOOP, "prepareToolCallArguments", 593, 605, False, "function",
    "调用 tool.prepareArguments 或校验原始参数，失败则返回错误文本。",
    ["validation", "tool-execution"], "simple")
add(P_LOOP, "prepareToolCall", 607, 675, False, "function",
    "解析 tool、跑 beforeToolCall，并在拦截或校验失败时提前结束。",
    ["tool-execution", "hooks", "validation"], "moderate")
add(P_LOOP, "executePreparedToolCall", 677, 718, False, "function",
    "执行已准备的 tool，捕获异常并转换为 tool result。",
    ["tool-execution", "error-handling"], "simple")
add(P_LOOP, "finalizeExecutedToolCall", 720, 765, False, "function",
    "跑 afterToolCall，组装最终 ToolResultMessage 并决定是否终止批次。",
    ["tool-execution", "hooks"], "simple")
add(P_LOOP, "createToolResultMessage", 784, 798, False, "function",
    "把 finalized tool call 编成带时间戳的 toolResult 消息。",
    ["serialization", "tool-execution"], "simple")

# agent
add(P_AGENT, "createMutableAgentState", 68, 95, False, "function",
    "从初始状态复制 tools/messages，构造带 getter/setter 的可变 AgentState。",
    ["state-management", "factory"], "simple")
add(P_AGENT, "PendingMessageQueue", 125, 159, False, "class",
    "按 QueueMode（steer/all/one）入队、排空或清空待发送消息。",
    ["queue", "steering", "state-management"], "simple")
add(P_AGENT, "Agent", 173, 592, True, "class",
    "可订阅的 Agent：prompt/continue、steer/follow-up，以及 abort/reset 与事件处理。",
    ["agent", "entry-point", "event-handler", "state-management"], "complex")

# branch
add(P_BRANCH, "collectEntriesForBranchSummary", 87, 118, True, "function",
    "沿旧 tip 与目标路径收集需要纳入分支摘要的 session 条目。",
    ["branch", "session", "compaction"], "simple")
add(P_BRANCH, "getMessageFromEntry", 119, 133, False, "function",
    "从 entry 取出消息，分支/压缩摘要条目则重建对应摘要消息。",
    ["messages", "compaction"], "simple")
add(P_BRANCH, "prepareBranchEntries", 136, 182, True, "function",
    "按 token 预算从新到旧装入消息，并累计文件读写集合。",
    ["compaction", "token-budget", "preparation"], "simple")
add(P_BRANCH, "generateBranchSummary", 219, 234, True, "function",
    "准备条目后调用带 request 的生成函数，缺省 request 用 completeSimpleWithRetries。",
    ["summarization", "llm", "branch"], "simple")
add(P_BRANCH, "generateBranchSummaryWithRequest", 242, 300, True, "function",
    "序列化对话、请求模型，并把文件操作列表附加到分支摘要结果。",
    ["summarization", "llm", "branch"], "moderate")

# compaction
add(P_COMPACT, "extractFileOperations", 46, 76, False, "function",
    "从切点之后的消息/条目中提取 read/edited 文件集合。",
    ["compaction", "file-operations"], "simple")
add(P_COMPACT, "getMessageFromEntry", 77, 88, False, "function",
    "把 session entry 还原为可参与压缩的消息（含摘要条目）。",
    ["messages", "compaction"], "simple")
add(P_COMPACT, "createSummaryRequestOptions", 117, 125, True, "function",
    "为摘要 LLM 请求补齐 telemetry context 与 uuidv7 会话 id。",
    ["llm", "telemetry", "factory"], "simple")
add(P_COMPACT, "completeSimpleWithRetries", 127, 144, True, "function",
    "用 retryAssistantCall 包装 models.completeSimple，供摘要路径复用。",
    ["llm", "retry", "summarization"], "simple")
add(P_COMPACT, "calculateContextTokens", 164, 166, True, "function",
    "把 usage 中的 input/cache 计数加总为上下文 token 估计。",
    ["token-budget", "utility"], "simple")
add(P_COMPACT, "getAssistantUsage", 167, 180, False, "function",
    "从 assistant 消息取出 usage，并计算上下文 token。",
    ["token-budget", "usage"], "simple")
add(P_COMPACT, "getLastAssistantUsage", 183, 192, True, "function",
    "从条目列表倒序查找最近一条 assistant usage。",
    ["token-budget", "usage"], "simple")
add(P_COMPACT, "estimateContextTokens", 215, 243, True, "function",
    "优先用真实 usage，否则按消息内容启发式估算上下文 token。",
    ["token-budget", "estimation"], "simple")
add(P_COMPACT, "shouldCompact", 246, 249, True, "function",
    "根据上下文窗口与 reserve/threshold 设置判断是否需要压缩。",
    ["compaction", "token-budget"], "simple")
add(P_COMPACT, "estimateTextAndImageContentChars", 253, 267, False, "function",
    "累计文本字符数，图片按固定成本折算。",
    ["estimation", "token-budget"], "simple")
add(P_COMPACT, "estimateTokens", 270, 310, True, "function",
    "按角色启发式估算单条消息 token（含 tool 参数 JSON）。",
    ["estimation", "token-budget"], "simple")
add(P_COMPACT, "findValidCutPoints", 311, 340, False, "function",
    "在区间内找出不会拆开 tool 配对的合法压缩切点。",
    ["compaction", "cut-point"], "simple")
add(P_COMPACT, "findTurnStartIndex", 343, 357, True, "function",
    "从给定条目回退到该轮 user/assistant 回合起点。",
    ["compaction", "cut-point"], "simple")
add(P_COMPACT, "findCutPoint", 370, 418, True, "function",
    "在保留近期 token 的约束下选择最佳压缩切点。",
    ["compaction", "cut-point", "token-budget"], "simple")
add(P_COMPACT, "generateSummary", 497, 522, True, "function",
    "生成压缩摘要文本，成功则 ok、失败则 err。",
    ["summarization", "llm"], "simple")
add(P_COMPACT, "generateSummaryWithUsage", 525, 544, True, "function",
    "生成摘要并附带本次 LLM usage，供 compact 记账。",
    ["summarization", "usage", "llm"], "simple")
add(P_COMPACT, "generateSummaryWithRequest", 555, 611, True, "function",
    "用可注入 request 函数调用模型，解析摘要并处理空响应。",
    ["summarization", "llm"], "moderate")
add(P_COMPACT, "prepareCompaction", 634, 707, True, "function",
    "根据 settings 找切点、拆分保留后缀，并提取文件操作，得到 CompactionPreparation。",
    ["compaction", "preparation", "token-budget"], "moderate")
add(P_COMPACT, "compact", 727, 744, True, "function",
    "对已准备的历史调用 generateSummary，组装 CompactResult。",
    ["compaction", "summarization"], "simple")
add(P_COMPACT, "compactWithRequest", 753, 816, True, "function",
    "用注入的 request 生成压缩摘要，并附带 usage 与文件列表。",
    ["compaction", "summarization", "llm"], "moderate")
add(P_COMPACT, "generateTurnPrefixSummary", 817, 865, False, "function",
    "为溢出恢复生成 turn 前缀摘要，复用 generateSummaryWithRequest。",
    ["summarization", "overflow", "llm"], "simple")

# utils
add(P_CUTILS, "createFileOps", 15, 21, True, "function",
    "创建空的 read/written/edited 文件路径集合。",
    ["factory", "file-operations"], "simple")
add(P_CUTILS, "extractFileOpsFromMessage", 24, 51, True, "function",
    "从 tool 调用与结果中识别 read/write/edit 路径并写入 FileOps。",
    ["file-operations", "parsing"], "simple")
add(P_CUTILS, "computeFileLists", 54, 59, True, "function",
    "把 FileOps 分成只读文件与已修改文件两个排序列表。",
    ["file-operations", "utility"], "simple")
add(P_CUTILS, "formatFileOperations", 62, 72, True, "function",
    "把读写文件列表格式化为摘要提示中的可读段落。",
    ["formatting", "summarization"], "simple")
add(P_CUTILS, "serializeConversation", 91, 132, True, "function",
    "把消息列表序列化为带 thinking/tool 标注的摘要输入文本。",
    ["serialization", "summarization"], "simple")

# config
add(P_CONFIG, "validateToolNames", 11, 17, True, "function",
    "检查 tools 名称唯一，重复则抛错。",
    ["validation", "tools"], "simple")
add(P_CONFIG, "validateRetryPolicy", 19, 31, True, "function",
    "校验 RetryPolicy 的次数与延迟字段为安全整数。",
    ["validation", "retry"], "simple")
add(P_CONFIG, "validateCompactionSettings", 33, 42, True, "function",
    "校验压缩 reserve/threshold 为安全整数。",
    ["validation", "compaction"], "simple")

# context
add(P_CTX, "getTelemetryContext", 30, 32, True, "function",
    "从 context 读取 telemetry parent，缺失则返回 NOOP_TELEMETRY_CONTEXT。",
    ["telemetry", "context"], "simple")
add(P_CTX, "withTelemetryContext", 35, 37, True, "function",
    "把给定 telemetry parent 写入新的 context。",
    ["telemetry", "context"], "simple")

# nodejs helpers + classes
add(P_NODE, "resolveTimeoutMs", 46, 57, False, "function",
    "把 timeout 规范为毫秒，非法值返回 FileError。",
    ["validation", "timeout"], "simple")
add(P_NODE, "resolvePath", 59, 73, False, "function",
    "解析 ~、file URL 与相对路径为绝对路径。",
    ["filesystem", "path"], "simple")
add(P_NODE, "fileKindFromStats", 75, 84, False, "function",
    "根据 fs.Stats 判断 file/directory/symlink。",
    ["filesystem"], "simple")
add(P_NODE, "fileInfoFromStats", 86, 99, False, "function",
    "把路径与 Stats 组装为 FileInfo Result。",
    ["filesystem"], "simple")
add(P_NODE, "toFileError", 105, 129, False, "function",
    "把 Node 错误码映射为带 path 的 FileError。",
    ["error-handling", "filesystem"], "simple")
add(P_NODE, "runCommand", 144, 177, False, "function",
    "spawn 子进程并在超时后杀掉进程树，收集 stdout。",
    ["shell", "process"], "simple")
add(P_NODE, "getShellConfig", 204, 246, False, "function",
    "探测自定义 shell 或平台 bash（含 WSL 遗留路径）。",
    ["shell", "platform"], "simple")
add(P_NODE, "getShellEnv", 248, 259, False, "function",
    "按 inheritEnv 合并基础环境与额外变量。",
    ["shell", "environment"], "simple")
add(P_NODE, "killProcessTree", 261, 290, False, "function",
    "按平台杀掉 pid 及其子进程树。",
    ["process", "cleanup"], "simple")
add(P_NODE, "waitForChildProcess", 292, 371, False, "function",
    "等待子进程退出，处理 abort、超时与 stdout spill。",
    ["process", "shell", "cancellation"], "moderate")
add(P_NODE, "NodeTextLineReader", 374, 436, False, "class",
    "按块解码文本文件并逐行返回，供 readTextLines 使用。",
    ["filesystem", "streaming", "reader"], "moderate")
add(P_NODE, "NodeExecutionEnv", 438, 924, True, "class",
    "Node ExecutionEnv 实现：exec、文件读写、目录列举、临时文件与 cleanup。",
    ["execution-env", "nodejs", "filesystem", "shell"], "complex")

# events
add(P_EVENTS, "HarnessEventBus", 8, 163, True, "class",
    "串行投递 harness 事件，支持 typed on/emit 与基于快照的 watch。",
    ["event-handler", "pubsub", "harness"], "moderate")
add(P_EVENTS, "BufferedEventWatcher", 165, 286, False, "class",
    "带缓冲与 epoch 的 watcher，可在 resnapshot 边界后重放事件。",
    ["event-handler", "watcher", "buffering"], "moderate")

# assistant
add(P_ASST, "createRequestOptions", 65, 91, False, "function",
    "组装 stream 请求选项，注入 telemetry 并调用 beforePayload。",
    ["llm", "telemetry", "factory"], "simple")
add(P_ASST, "consumeAssistantStream", 99, 133, True, "function",
    "迭代 assistant 流事件，转发给 observer，并在结束后跑 afterResponse。",
    ["streaming", "assistant"], "simple")
add(P_ASST, "streamHarnessAssistant", 136, 175, True, "function",
    "转换消息、请求模型流，并交给 consumeAssistantStream 消费。",
    ["streaming", "assistant", "llm"], "simple")

# gate
add(P_GATE, "AbortRequested", 2, 10, True, "class",
    "表示 gate 已请求中止；携带 cancellation promise 供调用方等待收尾。",
    ["cancellation", "error-handling"], "simple")
add(P_GATE, "createGate", 31, 64, True, "function",
    "创建 admit/signalAbort/close 门闩，关闭后拒绝新的副作用。",
    ["factory", "gate", "cancellation"], "simple")

# tools
add(P_TOOLS, "prepareToolCall", 78, 98, True, "function",
    "查找 tool、准备并校验参数，失败则返回即时错误结果。",
    ["tool-execution", "validation"], "simple")
add(P_TOOLS, "applyBeforeToolDecision", 101, 122, True, "function",
    "应用 before-tool hook 的拦截或改参，并重新校验。",
    ["hooks", "tool-execution", "validation"], "simple")
add(P_TOOLS, "executeToolCall", 125, 158, True, "function",
    "经 gate.admit 执行 tool.execute，把异常转为错误 tool result。",
    ["tool-execution", "gate", "cancellation"], "simple")
add(P_TOOLS, "finalizeToolCall", 161, 181, True, "function",
    "合并 after-tool patch，生成最终 tool result 与是否终止标志。",
    ["tool-execution", "hooks"], "simple")
add(P_TOOLS, "toolResultFromMessage", 184, 195, True, "function",
    "从已有 toolResult 消息还原 Executed/Finalized 结构。",
    ["tool-execution", "serialization"], "simple")
add(P_TOOLS, "createToolResultMessage", 198, 210, True, "function",
    "把 finalized call 编成 Agent toolResult 消息。",
    ["serialization", "tool-execution"], "simple")

# hooks
add(P_HOOKS, "HookRegistry", 15, 444, True, "class",
    "注册并按阶段聚合 hooks；经 gate 运行 tool 前后钩子，失败可 fail-closed。",
    ["hooks", "registry", "middleware", "gate"], "complex")
add(P_HOOKS, "applyStreamOptionsPatch", 446, 487, True, "function",
    "把 hook 返回的 stream options patch 浅合并到基础选项。",
    ["streaming", "hooks", "merge"], "simple")
add(P_HOOKS, "createStreamOptionsPatch", 489, 533, False, "function",
    "比较新值与基线，生成最小 stream options patch。",
    ["streaming", "hooks", "diff"], "simple")

# messages
add(P_MSGS, "bashExecutionToText", 63, 79, True, "function",
    "把 bashExecution 消息格式化为可放入 user 文本的命令/输出块。",
    ["formatting", "messages"], "simple")
add(P_MSGS, "createBranchSummaryMessage", 81, 92, True, "function",
    "构造带 fromId 的 branchSummary 消息。",
    ["factory", "summarization", "messages"], "simple")
add(P_MSGS, "createCompactionSummaryMessage", 94, 105, True, "function",
    "构造带 tokensBefore 的 compactionSummary 消息。",
    ["factory", "compaction", "messages"], "simple")
add(P_MSGS, "createCustomMessage", 107, 122, True, "function",
    "构造 custom 角色消息，保留 display/details。",
    ["factory", "messages"], "simple")
add(P_MSGS, "convertToLlm", 124, 168, True, "function",
    "把 harness 扩展角色映射为 LLM 可消费的 user/assistant/toolResult。",
    ["serialization", "llm", "messages"], "simple")

# prompt templates
add(P_TPL, "loadPromptTemplates", 31, 64, True, "function",
    "对每个路径做 fileInfo，目录则枚举、文件则解析为模板。",
    ["loader", "prompt-templates"], "simple")
add(P_TPL, "loadSourcedPromptTemplates", 72, 98, True, "function",
    "按来源加载模板并可选 mapPromptTemplate 改写。",
    ["loader", "prompt-templates"], "simple")
add(P_TPL, "loadTemplatesFromDir", 100, 127, False, "function",
    "列举目录中的 markdown 文件并逐个解析模板。",
    ["loader", "prompt-templates"], "simple")
add(P_TPL, "loadTemplateFromFile", 129, 173, False, "function",
    "读文件、解析 frontmatter，用标题或文件名作为模板名。",
    ["loader", "frontmatter"], "simple")
add(P_TPL, "resolveKind", 175, 207, False, "function",
    "canonicalize 路径并再次 fileInfo，区分文件与目录。",
    ["filesystem", "loader"], "simple")
add(P_TPL, "parseFrontmatter", 209, 223, False, "function",
    "从 markdown 头部切出 YAML frontmatter 与正文。",
    ["parsing", "frontmatter"], "simple")
add(P_TPL, "parseCommandArgs", 226, 249, True, "function",
    "按引号规则把命令参数字符串拆成 argv。",
    ["parsing", "prompt-templates"], "simple")
add(P_TPL, "substituteArgs", 252, 265, True, "function",
    "把模板中的 $1/$2 占位符替换为解析后的参数。",
    ["prompt-templates", "substitution"], "simple")
add(P_TPL, "formatPromptTemplateInvocation", 268, 270, True, "function",
    "把模板名与参数格式化为一条调用文本。",
    ["formatting", "prompt-templates"], "simple")

# result
add(P_RESULT, "TaggedError", 28, 51, True, "function",
    "返回带 _tag 与 toJSON/is 的 Error 子类工厂，用于可判别错误。",
    ["factory", "error-handling"], "simple")
add(P_RESULT, "matchError", 111, 117, True, "function",
    "按错误构造函数匹配并调用对应 matcher。",
    ["error-handling", "utility"], "simple")

RESULT_ERRORS = [
    ("LaneBusy", 53, 58, "目标 lane 已有进行中的 operation。"),
    ("OperationMismatch", 59, 65, "请求的 operation 与 lane 当前 operation 不一致。"),
    ("NoActiveRun", 66, 66, "当前没有可操作的 active run。"),
    ("NoActiveOperation", 67, 67, "当前没有可操作的 active operation。"),
    ("NothingToResume", 68, 68, "没有可 resume 的挂起 run。"),
    ("NothingToCompact", 69, 69, "没有可压缩的历史。"),
    ("InvalidMessage", 70, 74, "提交的消息不满足 harness 约束。"),
    ("InvalidNavigation", 75, 79, "导航目标不合法。"),
    ("UnknownSkill", 80, 80, "引用了未知 skill。"),
    ("UnknownTemplate", 81, 81, "引用了未知 prompt template。"),
    ("UnknownTarget", 82, 82, "引用了未知 session/entry 目标。"),
    ("InvalidLane", 83, 87, "lane 名无效或不存在。"),
    ("Closed", 88, 88, "harness 已关闭，拒绝后续操作。"),
    ("HarnessFault", 90, 98, "包装未预期的内部故障，并保留 cause。"),
    ("HarnessClosed", 100, 105, "在已关闭 harness 上继续操作时抛出的错误。"),
]
for name, a, b, summary in RESULT_ERRORS:
    add(P_RESULT, name, a, b, True, "class", summary, ["error-handling", "harness", "tagged-error"], "simple")

# drive
add(P_DRIVE, "driveOperation", 29, 106, True, "function",
    "循环读取 operation.at，分派 start/checkpoint/generation/tools/deferred/summary/navigation。",
    ["state-machine", "drive", "orchestrator"], "moderate")

# boundary
add(P_BOUND, "normalizedRetryPolicy", 44, 53, True, "function",
    "从 lane config 读取并归一化 RetryPolicy。",
    ["retry", "config"], "simple")
add(P_BOUND, "assistantReadyAtBoundary", 55, 76, True, "function",
    "在边界处分配 assistant 条目 id，并带上 overflowRecovery 与 retry policy。",
    ["drive", "boundary", "assistant"], "simple")
add(P_BOUND, "planBoundaryInbox", 79, 148, True, "function",
    "按 steering/follow-up 规则挑选 inbox，生成 insertEntry/deleteValue 写入。",
    ["inbox", "session-commit", "steering"], "moderate")
add(P_BOUND, "boundaryPlacementEvents", 150, 161, True, "function",
    "把本次提交的 inbox 条目转成 committed entry 事件。",
    ["events", "session-commit"], "simple")
add(P_BOUND, "finishRunBoundary", 164, 262, True, "function",
    "跑 after_drive hook、提交边界写入，并返回 settled/waiting 结果。",
    ["drive", "boundary", "hooks"], "moderate")

# checkpoint
add(P_CHK, "startRun", 25, 92, True, "function",
    "注入 before_run 消息、链接 prompt 条目并提交 starting 状态。",
    ["drive", "session-commit", "hooks"], "moderate")
add(P_CHK, "runCheckpoint", 95, 190, True, "function",
    "在 checkpoint 准备压缩阈值、规划 inbox，并决定进入 generation 或结束 run。",
    ["drive", "checkpoint", "compaction"], "moderate")

# deferred
add(P_DEF, "readDeferredSourceHandle", 48, 73, True, "function",
    "从 session 读取 deferred 源条目上的 DeferredHandle。",
    ["deferred", "session"], "simple")
add(P_DEF, "readSourceHandle", 75, 88, False, "function",
    "在 continueOperation 快照下读取 deferred 源 handle。",
    ["deferred", "session"], "simple")
add(P_DEF, "prepareDeferredPoll", 90, 129, False, "function",
    "解析模型、跑 before_request，并合并 stream options。",
    ["deferred", "hooks", "preparation"], "simple")
add(P_DEF, "publishPollIntent", 131, 183, False, "function",
    "为 poll 分配响应条目并写入 operation 状态。",
    ["deferred", "session-commit"], "moderate")
add(P_DEF, "performDeferredPoll", 185, 229, False, "function",
    "经 gate 调用 streamDeferred，并用 consumeAssistantStream 消费。",
    ["deferred", "streaming", "gate"], "simple")
add(P_DEF, "pollDeferred", 231, 258, False, "function",
    "编排 prepare/publish/perform，失败则 publishConfigurationFailure。",
    ["deferred", "orchestration"], "simple")
add(P_DEF, "runDeferredSuspended", 261, 267, True, "function",
    "从 suspended 状态发起一次 deferred poll。",
    ["deferred", "drive"], "simple")
add(P_DEF, "recoverDeferredPoll", 270, 276, True, "function",
    "从 effect_pending 恢复未完成的 deferred poll。",
    ["deferred", "recovery"], "simple")
add(P_DEF, "runDeferred", 279, 287, True, "function",
    "按状态分派 runDeferredSuspended 或 recoverDeferredPoll。",
    ["deferred", "drive"], "simple")

# generation
add(P_GEN, "configurationError", 42, 54, False, "function",
    "构造 generation 配置错误（缺模型或未知 tool）。",
    ["error-handling", "generation"], "simple")
add(P_GEN, "resolveSystemPrompt", 56, 66, False, "function",
    "解析 lane 的 systemPrompt 源或静态字符串。",
    ["prompt", "generation"], "simple")
add(P_GEN, "prepareGeneration", 68, 130, False, "function",
    "解析模型与活动工具、读取有界上下文，并跑 before_request hooks。",
    ["generation", "preparation", "hooks"], "moderate")
add(P_GEN, "publishGenerationIntent", 132, 172, False, "function",
    "为 generation 分配响应条目并写入 ready 状态。",
    ["generation", "session-commit"], "simple")
add(P_GEN, "performGeneration", 174, 231, False, "function",
    "打开响应进度，经 streamHarnessAssistant 拉取模型流。",
    ["generation", "streaming", "gate"], "moderate")
add(P_GEN, "runRetryWait", 234, 282, True, "function",
    "等待 retry notBefore，然后把状态推回 assistant.ready。",
    ["retry", "generation", "gate"], "simple")
add(P_GEN, "runGeneration", 285, 302, True, "function",
    "分派 retry wait 或 prepare/publish/perform generation。",
    ["generation", "drive", "orchestration"], "simple")

# reconcile
add(P_REC, "cancelDeferredBestEffort", 17, 38, False, "function",
    "尽力调用 models.cancelDeferred，忽略取消失败。",
    ["cancellation", "deferred"], "simple")
add(P_REC, "readDeferredHandle", 40, 53, False, "function",
    "在 settle 快照中读取 deferred 源 handle。",
    ["deferred", "session"], "simple")
add(P_REC, "publishAbortedTerminal", 55, 129, False, "function",
    "写入 aborted 结果、清理 operation 键，并发送终态事件。",
    ["cancellation", "session-commit"], "moderate")
add(P_REC, "reconcileOperation", 132, 173, True, "function",
    "对 cancel_requested 发 abort、回收 effect，并发布 aborted terminal。",
    ["cancellation", "drive", "reconciliation"], "simple")

# recovery
add(P_RCV, "interruptedAssistantMessage", 22, 41, False, "function",
    "用部分内容构造 stopReason=aborted 的 assistant 消息。",
    ["recovery", "assistant"], "simple")
add(P_RCV, "recoverAssistantGeneration", 44, 84, True, "function",
    "从已落盘帧还原 assistant 消息，再 publishResponse。",
    ["recovery", "generation", "streaming"], "simple")
add(P_RCV, "recoverCancelledAssistantEffect", 87, 126, True, "function",
    "取消路径下从帧还原 assistant 并发布响应。",
    ["recovery", "cancellation"], "simple")

# response
add(P_RESP, "openAssistantResponse", 46, 97, True, "function",
    "打开帧进度编码器，返回 start/update/end/afterResponse/close observer。",
    ["streaming", "assistant", "progress"], "moderate")
add(P_RESP, "publishConfigurationFailure", 106, 138, True, "function",
    "把配置错误写成 operation 失败结果并清理临时键。",
    ["error-handling", "session-commit"], "simple")
add(P_RESP, "deferredHandleIsValid", 168, 179, False, "function",
    "检查 assistant 消息是否携带可用的 DeferredHandle。",
    ["deferred", "validation"], "simple")
add(P_RESP, "publishResponse", 182, 485, True, "function",
    "按 overflow/abort/retry/成功路径规范化 assistant 响应并提交写入。",
    ["response", "retry", "compaction", "session-commit"], "complex")

# retry
add(P_RETRY, "retryNotBefore", 3, 10, True, "function",
    "按 policy 与 attempt 计算下次重试的绝对时间戳。",
    ["retry", "utility"], "simple")
add(P_RETRY, "waitUntil", 12, 36, True, "function",
    "等待到 notBefore，或在 AbortSignal 触发时拒绝。",
    ["retry", "cancellation"], "simple")

# structural
add(P_STR, "durableCompactionPreparation", 75, 89, True, "function",
    "把 CompactionPreparation 转成可持久化的 JSON 形态。",
    ["serialization", "compaction"], "simple")
add(P_STR, "durableBranchPreparation", 91, 100, True, "function",
    "把 BranchPreparation 转成可持久化的 JSON 形态。",
    ["serialization", "branch"], "simple")
add(P_STR, "compactionPreparation", 110, 123, False, "function",
    "从持久化形态还原 CompactionPreparation。",
    ["serialization", "compaction"], "simple")
add(P_STR, "readStructuralPreparation", 152, 186, False, "function",
    "从 operationPreparation 键读取并还原 compaction/branch 准备数据。",
    ["session", "compaction", "preparation"], "simple")
add(P_STR, "summaryContext", 188, 199, False, "function",
    "组装摘要任务的模型、设置与归一化 retry policy。",
    ["summarization", "config"], "simple")
add(P_STR, "publishStructuralOutcome", 222, 577, False, "function",
    "按成功/失败/导航结果写入摘要条目、清理或进入下一边界。",
    ["session-commit", "compaction", "navigation"], "complex")
add(P_STR, "publishStructuralReady", 579, 605, False, "function",
    "把 deciding 状态推进到 summary.ready 并写入准备数据。",
    ["drive", "session-commit"], "simple")
add(P_STR, "runStructuralDecision", 608, 672, True, "function",
    "决定执行 compaction/分支摘要或直接结束，并发布 ready/outcome。",
    ["drive", "compaction", "decision"], "moderate")
add(P_STR, "effectPendingFromReady", 674, 683, False, "function",
    "从 ready 状态构造 summary.effect_pending。",
    ["drive", "state-machine"], "simple")
add(P_STR, "retryWaitFromEffect", 685, 695, False, "function",
    "从 effect 计算 retry wait 状态（含 notBefore）。",
    ["retry", "drive"], "simple")
add(P_STR, "publishAttemptIntent", 707, 725, False, "function",
    "为结构性 LLM 尝试写入 effect_pending intent。",
    ["session-commit", "summarization"], "simple")
add(P_STR, "publishNestedRequestIntent", 727, 747, False, "function",
    "为嵌套摘要请求写入 usage 占位与 intent。",
    ["session-commit", "llm"], "simple")
add(P_STR, "publishNestedRequestOutcome", 749, 772, False, "function",
    "把嵌套请求的 usage/结果写回 session。",
    ["session-commit", "usage"], "simple")
add(P_STR, "requestStreamOptions", 774, 794, False, "function",
    "为结构性 LLM 调用组装带 telemetry 的 stream options。",
    ["llm", "telemetry"], "simple")
add(P_STR, "performStructuralAttempt", 796, 923, False, "function",
    "经 gate 调用 compactWithRequest 或 generateBranchSummaryWithRequest。",
    ["summarization", "compaction", "llm", "gate"], "moderate")
add(P_STR, "readAttemptPreparation", 925, 951, False, "function",
    "读取 ready 状态对应的持久化 preparation。",
    ["preparation", "session"], "simple")
add(P_STR, "publishAttemptResult", 953, 1007, False, "function",
    "把结构性尝试结果转为 outcome 或 retry wait。",
    ["summarization", "retry", "session-commit"], "moderate")
add(P_STR, "runStructuralGeneration", 1010, 1029, True, "function",
    "发布 attempt intent 并执行结构性 LLM 生成。",
    ["drive", "summarization"], "simple")
add(P_STR, "runStructuralRetryWait", 1032, 1074, True, "function",
    "等待结构性重试窗口，再回到 summary.ready。",
    ["retry", "drive", "gate"], "simple")
add(P_STR, "recoverStructuralGeneration", 1077, 1115, True, "function",
    "从 effect_pending 恢复未完成的结构性生成。",
    ["recovery", "summarization"], "simple")
add(P_STR, "prepareCompactionThreshold", 1118, 1152, True, "function",
    "在 checkpoint 用 prepareCompaction+shouldCompact 判断是否触发压缩。",
    ["compaction", "checkpoint"], "simple")
add(P_STR, "prepareOverflowCompaction", 1155, 1170, True, "function",
    "上下文溢出时准备强制压缩。",
    ["compaction", "overflow"], "simple")
add(P_STR, "commitNavigation", 1173, 1222, True, "function",
    "提交导航写入、清理 operation，并结束 run。",
    ["navigation", "session-commit", "drive"], "simple")

# terminal
add(P_TERM, "operationCleanupWrites", 26, 60, True, "function",
    "扫描 operation 前缀键，生成删除 pending/args/memo/preparation 的写入。",
    ["cleanup", "session"], "simple")
add(P_TERM, "operationResultRecord", 63, 82, True, "function",
    "构造带 status/tip/error 的 OperationResultRecord。",
    ["factory", "session"], "simple")

# tool-placement
add(P_PLACE, "readToolBatchSource", 34, 56, True, "function",
    "读取 assistant 条目上的 tool call 映射，作为 batch 源。",
    ["tool-execution", "session"], "simple")
add(P_PLACE, "toolCallFor", 72, 78, True, "function",
    "按 id 从 batch 源取出对应 tool call。",
    ["tool-execution", "utility"], "simple")
add(P_PLACE, "withToolBatch", 80, 82, True, "function",
    "把 tool batch 信息并入 operation scope。",
    ["tool-execution", "session"], "simple")
add(P_PLACE, "readPlacement", 84, 142, False, "function",
    "读取已完成/待提交的 tool result 与 pending 条目。",
    ["tool-execution", "session"], "moderate")
add(P_PLACE, "commitPlacement", 144, 278, False, "function",
    "把就绪的 tool result 写入 session，更新 lane 并可能结束 operation。",
    ["tool-execution", "session-commit"], "moderate")
add(P_PLACE, "materializeReady", 280, 326, True, "function",
    "读取 placement 后提交，供 tools drive 在 ready 时落盘。",
    ["tool-execution", "session-commit"], "simple")

def ensure_tags(tags: list[str], extras: list[str]) -> list[str]:
    out = list(tags)
    for t in extras:
        if len(out) >= 3:
            break
        if t not in out:
            out.append(t)
    while len(out) < 3:
        out.append("utility")
    return out[:5]


for n in FILES:
    extras = ["typescript", "agent", "harness" if "/harness/" in n["filePath"] else "core"]
    n["tags"] = ensure_tags(n["tags"], extras)

# build nodes
nodes: list[dict] = list(FILES)
file_of: dict[str, str] = {}
exported_ids: list[tuple[str, str]] = []  # filePath, nodeId
symbol_ids: dict[tuple[str, str], str] = {}

for path, name, a, b, exported, kind, summary, tags, complexity, notes in SYMBOLS:
    nid = clid(path, name) if kind == "class" else fnid(path, name)
    if nid in {n["id"] for n in nodes}:
        raise SystemExit(f"duplicate id {nid}")
    extras = [kind, path.split("/")[-1].replace(".ts", ""), "harness" if "/harness/" in path else "agent"]
    nodes.append(node(nid, kind, name, summary, ensure_tags(tags, extras), complexity, filePath=path, lineRange=[a, b], languageNotes=notes))
    file_of[nid] = path
    symbol_ids[(path, name)] = nid
    if exported:
        exported_ids.append((path, nid))

# edges
edges: list[dict] = []

# imports 1:1
import_count = 0
for src, targets in IMPORTS.items():
    for t in targets:
        edges.append(edge(fid(src), fid(t), "imports", 0.7))
        import_count += 1

# contains + exports
for path, name, a, b, exported, kind, summary, tags, complexity, notes in SYMBOLS:
    nid = symbol_ids[(path, name)]
    edges.append(edge(fid(path), nid, "contains", 1.0))
    if exported:
        edges.append(edge(fid(path), nid, "exports", 0.8))

# cross-file calls
CALLS = [
    (fnid(P_LOOP, "runAgentLoop"), fnid("packages/agent/src/stream-fn.ts", "getDefaultStreamFn")),
    (fnid(P_LOOP, "runAgentLoopContinue"), fnid("packages/agent/src/stream-fn.ts", "getDefaultStreamFn")),
    (clid(P_AGENT, "Agent"), fnid(P_LOOP, "runAgentLoop")),
    (clid(P_AGENT, "Agent"), fnid(P_LOOP, "runAgentLoopContinue")),
    (clid(P_AGENT, "Agent"), fnid("packages/agent/src/stream-fn.ts", "getDefaultStreamFn")),
    (fid(P_HARNESS), fnid("packages/agent/src/harness/runtime/harness.ts", "createAgentHarness")),
    (fnid(P_BRANCH, "getMessageFromEntry"), fnid(P_MSGS, "createBranchSummaryMessage")),
    (fnid(P_BRANCH, "getMessageFromEntry"), fnid(P_MSGS, "createCompactionSummaryMessage")),
    (fnid(P_BRANCH, "prepareBranchEntries"), fnid(P_CUTILS, "createFileOps")),
    (fnid(P_BRANCH, "prepareBranchEntries"), fnid(P_CUTILS, "extractFileOpsFromMessage")),
    (fnid(P_BRANCH, "prepareBranchEntries"), fnid(P_COMPACT, "estimateTokens")),
    (fnid(P_BRANCH, "generateBranchSummary"), fnid(P_COMPACT, "completeSimpleWithRetries")),
    (fnid(P_BRANCH, "generateBranchSummaryWithRequest"), fnid(P_CUTILS, "serializeConversation")),
    (fnid(P_BRANCH, "generateBranchSummaryWithRequest"), fnid(P_COMPACT, "createSummaryRequestOptions")),
    (fnid(P_BRANCH, "generateBranchSummaryWithRequest"), fnid(P_CUTILS, "computeFileLists")),
    (fnid(P_BRANCH, "generateBranchSummaryWithRequest"), fnid(P_CUTILS, "formatFileOperations")),
    (fnid(P_COMPACT, "extractFileOperations"), fnid(P_CUTILS, "createFileOps")),
    (fnid(P_COMPACT, "extractFileOperations"), fnid(P_CUTILS, "extractFileOpsFromMessage")),
    (fnid(P_COMPACT, "getMessageFromEntry"), fnid(P_MSGS, "createBranchSummaryMessage")),
    (fnid(P_COMPACT, "getMessageFromEntry"), fnid(P_MSGS, "createCompactionSummaryMessage")),
    (fnid(P_COMPACT, "createSummaryRequestOptions"), fnid(P_CTX, "getTelemetryContext")),
    (fnid(P_CTX, "withTelemetryContext"), fnid("packages/chord/src/context/index.ts", "withContextValue")),
    (fnid(P_ASST, "createRequestOptions"), fnid(P_CTX, "getTelemetryContext")),
    (fnid(P_TOOLS, "executeToolCall"), fnid("packages/chord/src/context/index.ts", "withAbortSignal")),
    (clid(P_HOOKS, "HookRegistry"), fnid("packages/chord/src/context/index.ts", "withAbortSignal")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_CHK, "startRun")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_CHK, "runCheckpoint")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_GEN, "runGeneration")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_RCV, "recoverAssistantGeneration")),
    (fnid(P_DRIVE, "driveOperation"), fnid("packages/agent/src/harness/runtime/drive/tools.ts", "runTools")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_DEF, "runDeferred")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_STR, "runStructuralDecision")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_STR, "runStructuralGeneration")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_STR, "recoverStructuralGeneration")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_STR, "runStructuralRetryWait")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_STR, "commitNavigation")),
    (fnid(P_DRIVE, "driveOperation"), fnid(P_REC, "reconcileOperation")),
    (fnid(P_BOUND, "planBoundaryInbox"), fnid("packages/agent/src/harness/runtime/transcript.ts", "readLaneQueues")),
    (fnid(P_BOUND, "planBoundaryInbox"), fnid("packages/agent/src/harness/session/commit.ts", "insertEntry")),
    (fnid(P_BOUND, "boundaryPlacementEvents"), fnid("packages/agent/src/harness/runtime/transcript.ts", "committedEntryEvents")),
    (fnid(P_BOUND, "finishRunBoundary"), fnid("packages/agent/src/harness/runtime/transcript.ts", "readBoundedContext")),
    (fnid(P_CHK, "startRun"), fnid("packages/agent/src/harness/runtime/transcript.ts", "chainEntries")),
    (fnid(P_CHK, "startRun"), fnid("packages/agent/src/harness/session/types.ts", "operationScopeOf")),
    (fnid(P_CHK, "startRun"), fnid("packages/agent/src/harness/session/commit.ts", "insertEntry")),
    (fnid(P_CHK, "startRun"), fnid("packages/agent/src/harness/runtime/transcript.ts", "committedEntryEvents")),
    (fnid(P_CHK, "runCheckpoint"), fnid(P_STR, "prepareCompactionThreshold")),
    (fnid(P_CHK, "runCheckpoint"), fnid(P_BOUND, "planBoundaryInbox")),
    (fnid(P_CHK, "runCheckpoint"), fnid(P_BOUND, "assistantReadyAtBoundary")),
    (fnid(P_CHK, "runCheckpoint"), fnid(P_BOUND, "boundaryPlacementEvents")),
    (fnid(P_CHK, "runCheckpoint"), fnid(P_BOUND, "finishRunBoundary")),
    (fnid(P_DEF, "prepareDeferredPoll"), fnid(P_HOOKS, "applyStreamOptionsPatch")),
    (fnid(P_DEF, "performDeferredPoll"), fnid(P_RESP, "openAssistantResponse")),
    (fnid(P_DEF, "performDeferredPoll"), fnid("packages/chord/src/context/index.ts", "withAbortSignal")),
    (fnid(P_DEF, "performDeferredPoll"), fnid(P_CTX, "getTelemetryContext")),
    (fnid(P_DEF, "performDeferredPoll"), fnid(P_ASST, "consumeAssistantStream")),
    (fnid(P_DEF, "pollDeferred"), fnid(P_RESP, "publishConfigurationFailure")),
    (fnid(P_DEF, "pollDeferred"), fnid(P_RESP, "publishResponse")),
    (fnid(P_GEN, "prepareGeneration"), fnid("packages/agent/src/harness/runtime/transcript.ts", "readBoundedContext")),
    (fnid(P_GEN, "prepareGeneration"), fnid(P_HOOKS, "applyStreamOptionsPatch")),
    (fnid(P_GEN, "performGeneration"), fnid(P_RESP, "openAssistantResponse")),
    (fnid(P_GEN, "performGeneration"), fnid(P_ASST, "streamHarnessAssistant")),
    (fnid(P_GEN, "performGeneration"), fnid("packages/chord/src/context/index.ts", "withAbortSignal")),
    (fnid(P_GEN, "performGeneration"), fnid(P_CTX, "getTelemetryContext")),
    (fnid(P_GEN, "runRetryWait"), fnid(P_RETRY, "waitUntil")),
    (fnid(P_GEN, "runGeneration"), fnid(P_RESP, "publishConfigurationFailure")),
    (fnid(P_REC, "cancelDeferredBestEffort"), fnid(P_CTX, "getTelemetryContext")),
    (fnid(P_REC, "readDeferredHandle"), fnid(P_DEF, "readDeferredSourceHandle")),
    (fnid(P_REC, "publishAbortedTerminal"), fnid(P_TERM, "operationResultRecord")),
    (fnid(P_REC, "publishAbortedTerminal"), fnid(P_TERM, "operationCleanupWrites")),
    (fnid(P_REC, "reconcileOperation"), fnid(P_RCV, "recoverCancelledAssistantEffect")),
    (fnid(P_REC, "reconcileOperation"), fnid("packages/agent/src/harness/runtime/drive/tools.ts", "runTools")),
    (fnid(P_RCV, "recoverAssistantGeneration"), fnid("packages/agent/src/harness/runtime/progress.ts", "readAssistantFrames")),
    (fnid(P_RCV, "recoverAssistantGeneration"), fnid(P_RESP, "publishResponse")),
    (fnid(P_RCV, "recoverCancelledAssistantEffect"), fnid("packages/agent/src/harness/runtime/progress.ts", "readAssistantFrames")),
    (fnid(P_RCV, "recoverCancelledAssistantEffect"), fnid(P_RESP, "publishResponse")),
    (fnid(P_RESP, "openAssistantResponse"), fnid("packages/agent/src/harness/runtime/progress.ts", "openFrameProgress")),
    (fnid(P_RESP, "publishConfigurationFailure"), fnid(P_TERM, "operationResultRecord")),
    (fnid(P_RESP, "publishConfigurationFailure"), fnid(P_TERM, "operationCleanupWrites")),
    (fnid(P_RESP, "publishResponse"), fnid(P_STR, "prepareOverflowCompaction")),
    (fnid(P_RESP, "publishResponse"), fnid(P_RETRY, "retryNotBefore")),
    (fnid(P_RESP, "publishResponse"), fnid(P_TERM, "operationResultRecord")),
    (fnid(P_STR, "summaryContext"), fnid(P_BOUND, "normalizedRetryPolicy")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid(P_BOUND, "planBoundaryInbox")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid(P_TERM, "operationCleanupWrites")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid(P_TERM, "operationResultRecord")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid(P_BOUND, "finishRunBoundary")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid("packages/agent/src/harness/session/commit.ts", "insertUsage")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid("packages/agent/src/harness/session/commit.ts", "insertEntry")),
    (fnid(P_STR, "publishStructuralOutcome"), fnid("packages/agent/src/harness/runtime/transcript.ts", "committedEntryEvents")),
    (fnid(P_STR, "requestStreamOptions"), fnid(P_CTX, "getTelemetryContext")),
    (fnid(P_STR, "performStructuralAttempt"), fnid(P_HOOKS, "applyStreamOptionsPatch")),
    (fnid(P_STR, "performStructuralAttempt"), fnid(P_COMPACT, "compactWithRequest")),
    (fnid(P_STR, "performStructuralAttempt"), fnid(P_BRANCH, "generateBranchSummaryWithRequest")),
    (fnid(P_STR, "performStructuralAttempt"), fnid("packages/chord/src/context/index.ts", "withAbortSignal")),
    (fnid(P_STR, "retryWaitFromEffect"), fnid(P_RETRY, "retryNotBefore")),
    (fnid(P_STR, "runStructuralRetryWait"), fnid(P_RETRY, "waitUntil")),
    (fnid(P_STR, "prepareCompactionThreshold"), fnid(P_COMPACT, "prepareCompaction")),
    (fnid(P_STR, "prepareCompactionThreshold"), fnid(P_COMPACT, "shouldCompact")),
    (fnid(P_STR, "prepareOverflowCompaction"), fnid(P_COMPACT, "prepareCompaction")),
    (fnid(P_STR, "commitNavigation"), fnid(P_TERM, "operationCleanupWrites")),
    (fnid(P_STR, "commitNavigation"), fnid(P_TERM, "operationResultRecord")),
    (fnid(P_PLACE, "commitPlacement"), fnid("packages/agent/src/harness/session/commit.ts", "insertEntry")),
    (fnid(P_PLACE, "commitPlacement"), fnid("packages/agent/src/harness/session/commit.ts", "insertUsage")),
    (fnid(P_PLACE, "withToolBatch"), fnid("packages/agent/src/harness/session/types.ts", "operationScopeOf")),
]

seen_calls = set()
for src, tgt in CALLS:
    if src == tgt:
        raise SystemExit(f"self call {src}")
    key = (src, tgt)
    if key in seen_calls:
        continue
    seen_calls.add(key)
    edges.append(edge(src, tgt, "calls", 0.8))

# --- validate / split ---
BATCH_FILES = [f["path"] for f in BRIEF["files"]]
assert [n["filePath"] for n in FILES] == BATCH_FILES, "file order mismatch"

expected_imports = sum(len(v) for v in IMPORTS.values())
actual_imports = sum(1 for e in edges if e["type"] == "imports")
if actual_imports != expected_imports:
    raise SystemExit(f"imports {actual_imports} != {expected_imports}")

# neighborMap + batchImportData for validation
NEIGHBOR = BRIEF["neighborMap"]
known_files = set(BATCH_FILES)
for src, targets in IMPORTS.items():
    known_files.update(targets)
for path, neighs in NEIGHBOR.items():
    known_files.add(path)
    for n in neighs:
        known_files.add(n["path"])

# extra known function targets outside batch
extra_ok = {
    fnid("packages/agent/src/stream-fn.ts", "getDefaultStreamFn"),
    fnid("packages/agent/src/harness/runtime/harness.ts", "createAgentHarness"),
    fnid("packages/chord/src/context/index.ts", "withContextValue"),
    fnid("packages/chord/src/context/index.ts", "withAbortSignal"),
    fnid("packages/agent/src/harness/runtime/drive/tools.ts", "runTools"),
    fnid("packages/agent/src/harness/runtime/transcript.ts", "readLaneQueues"),
    fnid("packages/agent/src/harness/session/commit.ts", "insertEntry"),
    fnid("packages/agent/src/harness/runtime/transcript.ts", "committedEntryEvents"),
    fnid("packages/agent/src/harness/runtime/transcript.ts", "readBoundedContext"),
    fnid("packages/agent/src/harness/runtime/transcript.ts", "chainEntries"),
    fnid("packages/agent/src/harness/session/types.ts", "operationScopeOf"),
    fnid("packages/agent/src/harness/runtime/progress.ts", "readAssistantFrames"),
    fnid("packages/agent/src/harness/runtime/progress.ts", "openFrameProgress"),
    fnid("packages/agent/src/harness/session/commit.ts", "insertUsage"),
}

local_ids = {n["id"] for n in nodes}
neighbor_symbols: dict[str, set[str]] = {}
for path, neighs in NEIGHBOR.items():
    for n in neighs:
        neighbor_symbols.setdefault(n["path"], set()).update(n.get("symbols") or [])


def edge_ok(e, part_ids: set[str]) -> bool:
    for end in (e["source"], e["target"]):
        if end in part_ids or end in extra_ok:
            continue
        if end.startswith("file:"):
            p = end[len("file:"):]
            if p in known_files:
                continue
            return False
        if end.startswith("function:") or end.startswith("class:"):
            rest = end.split(":", 2)
            if len(rest) != 3:
                return False
            _, p, sym = rest
            if end in local_ids:
                continue
            if p in neighbor_symbols and (not neighbor_symbols[p] or sym in neighbor_symbols[p]):
                continue
            if p in known_files:
                # allow if neighbor listed the file even with empty symbols
                continue
            return False
        return False
    return True


nodeCount = len(nodes)
edgeCount = len(edges)
print(f"TOTAL nodes={nodeCount} edges={edgeCount} imports={actual_imports} symbols={len(SYMBOLS)}")

# split
if nodeCount <= 60 and edgeCount <= 120:
    parts_n = 1
else:
    parts_n = math.ceil(max(nodeCount / 60, edgeCount / 120))

paths_sorted = sorted(BATCH_FILES)
if parts_n == 1:
    groups = [paths_sorted]
else:
    chunk = math.ceil(len(paths_sorted) / parts_n)
    groups = [paths_sorted[i : i + chunk] for i in range(0, len(paths_sorted), chunk)]

# attach filePath for all nodes
for n in nodes:
    if "filePath" not in n:
        raise SystemExit(f"missing filePath {n['id']}")

written = []
for i, group in enumerate(groups, 1):
    gset = set(group)
    part_nodes = [n for n in nodes if n["filePath"] in gset]
    part_ids = {n["id"] for n in part_nodes}
    part_edges = [e for e in edges if e["source"] in part_ids]
    bad = [e for e in part_edges if not edge_ok(e, part_ids)]
    if bad:
        raise SystemExit(f"part {i} invalid edges: {bad[:5]}")
    payload = {"nodes": part_nodes, "edges": part_edges}
    if parts_n == 1:
        out = OUT_DIR / "batch-9.json"
    else:
        out = OUT_DIR / f"batch-9-part-{i}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    written.append((out.name, len(part_nodes), len(part_edges), group))
    print(f"WROTE {out.name} nodes={len(part_nodes)} edges={len(part_edges)} files={len(group)}")

print("PARTS", len(written))
