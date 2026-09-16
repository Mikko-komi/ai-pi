#!/usr/bin/env python3
"""Emit batch-10 knowledge-graph fragments from structural extraction + semantic analysis."""

from __future__ import annotations

import json
import math
from pathlib import Path

UA_DIR = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
BRIEF = json.loads((UA_DIR / "intermediate/batch-briefs/batch-10.json").read_text())
IMPORTS: dict[str, list[str]] = BRIEF["batchImportData"]
NEIGHBOR_MAP: dict[str, list[dict]] = BRIEF["neighborMap"]

# --- path aliases ---
P_TOOLS = "packages/agent/src/harness/runtime/drive/tools.ts"
P_HARNESS = "packages/agent/src/harness/runtime/harness.ts"
P_LANE = "packages/agent/src/harness/runtime/lane.ts"
P_PROGRESS = "packages/agent/src/harness/runtime/progress.ts"
P_REDUCER = "packages/agent/src/harness/runtime/reducer.ts"
P_RESTORE = "packages/agent/src/harness/runtime/restore.ts"
P_TRANSCRIPT = "packages/agent/src/harness/runtime/transcript.ts"
P_RTYPES = "packages/agent/src/harness/runtime/types.ts"
P_COMMIT = "packages/agent/src/harness/session/commit.ts"
P_SCONTEXT = "packages/agent/src/harness/session/context.ts"
P_FPOLICY = "packages/agent/src/harness/session/fork-policy.ts"
P_FORK = "packages/agent/src/harness/session/fork.ts"
P_IMSS = "packages/agent/src/harness/session/in-memory-storage-state.ts"
P_CODEC = "packages/agent/src/harness/session/jsonl/codec.ts"
P_JFORK = "packages/agent/src/harness/session/jsonl/fork.ts"
P_IO = "packages/agent/src/harness/session/jsonl/io.ts"
P_LEGACY = "packages/agent/src/harness/session/jsonl/legacy-v3.ts"
P_REPO = "packages/agent/src/harness/session/jsonl/repo.ts"
P_JSTORAGE = "packages/agent/src/harness/session/jsonl/storage.ts"
P_JTYPES = "packages/agent/src/harness/session/jsonl/types.ts"
P_MEMORY = "packages/agent/src/harness/session/memory.ts"
P_MLINE = "packages/agent/src/harness/session/mutation-line.ts"
P_SESSION = "packages/agent/src/harness/session/session.ts"
P_BDATA = "packages/agent/src/harness/session/testing/benchmark/datasets.ts"
P_BREPO = "packages/agent/src/harness/session/testing/benchmark/session-repo.ts"
P_BSTOR = "packages/agent/src/harness/session/testing/benchmark/storage.ts"
P_CREPO = "packages/agent/src/harness/session/testing/conformance/session-repo.ts"
P_CSTOR = "packages/agent/src/harness/session/testing/conformance/storage.ts"
P_GATING = "packages/agent/src/harness/session/testing/gating-storage.ts"

# neighbor / other-batch targets
P_EFFECT = "packages/agent/src/harness/execution/effect-gate.ts"
P_ETOOLS = "packages/agent/src/harness/execution/tools.ts"
P_TPLACE = "packages/agent/src/harness/runtime/drive/tool-placement.ts"
P_DRIVE = "packages/agent/src/harness/runtime/drive.ts"
P_STRUCT = "packages/agent/src/harness/runtime/drive/structural.ts"
P_CONFIG = "packages/agent/src/harness/config.ts"
P_COMPACT = "packages/agent/src/harness/compaction/compaction.ts"
P_BRANCH = "packages/agent/src/harness/compaction/branch-summarization.ts"
P_CTX = "packages/agent/src/harness/context.ts"
P_MSGS = "packages/agent/src/harness/messages.ts"
P_PROMPTS = "packages/agent/src/harness/prompt-templates.ts"
P_SKILLS = "packages/agent/src/harness/skills.ts"
P_USAGE = "packages/agent/src/harness/utils/usage.ts"
P_HTYPES = "packages/agent/src/harness/types.ts"
P_UUID = "packages/ai/src/utils/uuid.ts"
P_SDEC = "packages/agent/src/harness/session/testing/storage-decorator.ts"


def ensure_tags(path: str, tags: list[str]) -> list[str]:
    extras: list[str] = []
    if "/testing/" in path:
        extras += ["test", "harness"]
    if "/jsonl/" in path:
        extras += ["jsonl", "session"]
    if "/runtime/" in path:
        extras += ["runtime", "harness"]
    if "/session/" in path:
        extras += ["session", "harness"]
    extras += ["agent", "utility"]
    out = list(tags)
    for extra in extras:
        if len(out) >= 3:
            break
        if extra not in out:
            out.append(extra)
    return out[:5]


def file_node(path: str, name: str, summary: str, tags: list[str], complexity: str, notes: str | None = None) -> dict:
    node = {
        "id": f"file:{path}",
        "type": "file",
        "name": name,
        "filePath": path,
        "summary": summary,
        "tags": ensure_tags(path, tags),
        "complexity": complexity,
    }
    if notes:
        node["languageNotes"] = notes
    return node


def sym(
    kind: str,
    path: str,
    name: str,
    start: int,
    end: int,
    summary: str,
    tags: list[str],
    complexity: str,
    exported: bool,
    notes: str | None = None,
) -> dict:
    node = {
        "id": f"{kind}:{path}:{name}",
        "type": kind,
        "name": name,
        "filePath": path,
        "lineRange": [start, end],
        "summary": summary,
        "tags": ensure_tags(path, tags),
        "complexity": complexity,
        "_exported": exported,
    }
    if notes:
        node["languageNotes"] = notes
    return node


FILE_NODES = [
    file_node(
        P_TOOLS,
        "tools.ts",
        "驱动 tool 批次的顺序或并行执行，覆盖准备、调用、中断恢复与结果发布。",
        ["runtime", "tool-execution", "service"],
        "complex",
        "按 sequential/parallel 分派 tool batch，并把中断检查点写回 session values。",
    ),
    file_node(
        P_HARNESS,
        "harness.ts",
        "AgentHarness 运行时实现：管理 lane 生命周期、全局配置，以及从 session 恢复未完成 operation。",
        ["entry-point", "service", "runtime"],
        "complex",
    ),
    file_node(
        P_LANE,
        "lane.ts",
        "单条 AgentLane 的命令总线，把 admission、drive、队列与 session 写入串在同一条 mutation line 上。",
        ["service", "runtime", "event-handler"],
        "complex",
        "超大 Lane 类同时承担 prompt/compact/navigate 入口与 durable operation 续跑。",
    ),
    file_node(
        P_PROGRESS,
        "progress.ts",
        "把 assistant frame 与 tool 输出写入 pending 通道，供驱动层流式展示进度。",
        ["runtime", "streaming", "service"],
        "moderate",
    ),
    file_node(
        P_REDUCER,
        "reducer.ts",
        "将 HarnessEvent 折叠进可变 LaneSnapshot；导航完成后要求调用方 rebase。",
        ["reducer", "event-handler", "runtime"],
        "complex",
        "对 snapshot 原地归约，navigation 完成返回 rebase 哨兵而非继续增量。",
    ),
    file_node(
        P_RESTORE,
        "restore.ts",
        "从 durable session 值重建进程内 LaneState，并校验 operation 与 intent 是否一致。",
        ["runtime", "restore", "service"],
        "moderate",
    ),
    file_node(
        P_TRANSCRIPT,
        "transcript.ts",
        "读取有界 transcript、inbox 队列与 pending 消息，并投影 entry 生命周期事件。",
        ["runtime", "transcript", "serialization"],
        "moderate",
    ),
    file_node(
        P_RTYPES,
        "types.ts",
        "定义 harness 运行时的 Config、LaneState、LaneCommand，以及进程内 Drive 控制器。",
        ["type-definition", "runtime", "data-model"],
        "moderate",
        "Drive 用 createGate 与 AbortController 管理一次进程本地 drive pass。",
    ),
    file_node(
        P_COMMIT,
        "commit.ts",
        "把 Write 物化为带 seq 的 CommittedWrite，并校验 commit 不变量。",
        ["serialization", "validation", "data-model"],
        "moderate",
    ),
    file_node(
        P_SCONTEXT,
        "context.ts",
        "把 session entry 投影为 LLM context messages，包含 compaction 与 branch summary。",
        ["context", "serialization", "utility"],
        "moderate",
    ),
    file_node(
        P_FPOLICY,
        "fork-policy.ts",
        "决定 fork 时复制哪些 entry，并投影目标 lane 的 current-state 写入。",
        ["fork", "policy", "validation"],
        "moderate",
    ),
    file_node(
        P_FORK,
        "fork.ts",
        "从源 snapshot 选择 fork 内容，并校验源分支完整性与 lane 配置。",
        ["fork", "validation", "service"],
        "moderate",
    ),
    file_node(
        P_IMSS,
        "in-memory-storage-state.ts",
        "内存中的 entry/value/list/usage 存储状态机，支持 prepare/validate/apply commit 与 fork。",
        ["data-model", "storage", "in-memory"],
        "complex",
    ),
    file_node(
        P_CODEC,
        "codec.ts",
        "解析 JSONL session header，区分 format-4 存储头与 legacy v3 session 头。",
        ["serialization", "validation", "codec"],
        "moderate",
    ),
    file_node(
        P_JFORK,
        "fork.ts",
        "流式扫描 JSONL 事务、按 fork 策略筛选内容，并原子写出目标 session 文件。",
        ["fork", "jsonl", "service"],
        "complex",
    ),
    file_node(
        P_IO,
        "io.ts",
        "JSONL 事务编解码与原子文件发布，供存储与 fork 路径共用。",
        ["io", "jsonl", "serialization"],
        "moderate",
    ),
    file_node(
        P_LEGACY,
        "legacy-v3.ts",
        "将 legacy v3 session 条目、配置与 usage 翻译为 format-4 writes。",
        ["migration", "legacy", "serialization"],
        "complex",
    ),
    file_node(
        P_REPO,
        "repo.ts",
        "基于文件系统的 format-4 SessionRepo，负责 create/open/list/delete/fork 生命周期。",
        ["repository", "jsonl", "service"],
        "complex",
    ),
    file_node(
        P_JSTORAGE,
        "storage.ts",
        "JSONL 文件 Storage：把已提交事务 replay 进 InMemoryStorageState，并支持 v3 升级。",
        ["storage", "jsonl", "service"],
        "complex",
        "打开时流式 replay，commit 则追加事务并同步内存状态。",
    ),
    file_node(
        P_JTYPES,
        "types.ts",
        "JSONL 格式版本常量，以及 header、存储与 repo 选项类型。",
        ["type-definition", "jsonl", "schema-definition"],
        "simple",
    ),
    file_node(
        P_MEMORY,
        "memory.ts",
        "进程内 MemoryStorage 与 MemorySessionRepo，用于测试和无持久化运行。",
        ["storage", "in-memory", "factory"],
        "complex",
    ),
    file_node(
        P_MLINE,
        "mutation-line.ts",
        "用 Promise 链串行化一个 Session 上的完整读改写作业。",
        ["concurrency", "utility", "serialization"],
        "simple",
        "以 tail Promise 串行化，seal 后拒绝后续 run。",
    ),
    file_node(
        P_SESSION,
        "session.ts",
        "StorageBackedSession 及其 mutation/branch 外观，并定义 session 不变量错误类型。",
        ["session", "service", "data-model"],
        "complex",
    ),
    file_node(
        P_BDATA,
        "datasets.ts",
        "存储 benchmark 共用的确定性线性分支数据集与 entry id。",
        ["test", "benchmark", "dataset"],
        "simple",
    ),
    file_node(
        P_BREPO,
        "session-repo.ts",
        "SessionRepo catalog/fork benchmark 的数据集、seed 与读写场景定义。",
        ["test", "benchmark", "session-repo"],
        "moderate",
    ),
    file_node(
        P_BSTOR,
        "storage.ts",
        "Storage 读写 benchmark 的 seed 事务生成与场景定义。",
        ["test", "benchmark", "storage"],
        "moderate",
    ),
    file_node(
        P_CREPO,
        "session-repo.ts",
        "SessionRepo 生命周期、消息与 fork 行为的一致性测试工厂。",
        ["test", "conformance", "session-repo"],
        "complex",
    ),
    file_node(
        P_CSTOR,
        "storage.ts",
        "Storage commit/scan/list/fork 路径的一致性测试套件工厂。",
        ["test", "conformance", "storage"],
        "complex",
    ),
    file_node(
        P_GATING,
        "gating-storage.ts",
        "测试用 StorageDecorator，可停等或丢弃已准入的 commit，用于竞争与丢失场景。",
        ["test", "storage", "decorator"],
        "moderate",
    ),
]

SYMBOLS = [
    # tools.ts
    sym("function", P_TOOLS, "replaceCall", 66, 75, "按 sourceIndex/resultEntryId 替换 batch 中的一条 ToolCall。", ["utility", "tool-execution"], "simple", False),
    sym("function", P_TOOLS, "invocationCapability", 82, 131, "构造 tool invocation 能力对象，提供 memo 读写并校验 effect 所有权。", ["tool-execution", "capability"], "moderate", False),
    sym("function", P_TOOLS, "syntheticMessage", 133, 148, "为中断或截断的 tool 调用合成 ToolResultMessage。", ["tool-execution", "serialization"], "simple", False),
    sym("function", P_TOOLS, "interruptedOutcome", 158, 168, "把检查点进度包装成 interrupted tool outcome。", ["tool-execution", "recovery"], "simple", False),
    sym("function", P_TOOLS, "truncatedOutcome", 170, 181, "为被截断的 tool 调用生成 truncated outcome。", ["tool-execution", "recovery"], "simple", False),
    sym("function", P_TOOLS, "publishToolIntent", 187, 227, "发布 tool 即将执行的 intent 事件，并写入 pending/args。", ["tool-execution", "event-handler"], "simple", False),
    sym("function", P_TOOLS, "publishToolOutcome", 229, 293, "把 finalized tool 结果写入 pending output 并发布 outcome 事件。", ["tool-execution", "event-handler"], "moderate", False),
    sym("function", P_TOOLS, "clearReplayCheckpoint", 295, 329, "清除可回放检查点，避免重复执行已完成的 tool 调用。", ["tool-execution", "recovery"], "simple", False),
    sym("function", P_TOOLS, "readCheckpoint", 331, 340, "读取指定 tool call 的 durable 进度检查点。", ["tool-execution", "recovery"], "simple", False),
    sym("function", P_TOOLS, "performToolInvocation", 350, 434, "执行一次已准备好的 tool 调用，处理中止、中断与截断。", ["tool-execution", "service"], "moderate", False),
    sym("function", P_TOOLS, "prepareToolInvocation", 436, 473, "准备 tool 调用参数并应用 before-tool hook 决策。", ["tool-execution", "validation"], "simple", False),
    sym("function", P_TOOLS, "startToolInvocation", 475, 513, "启动一次 tool 调用：发布 intent 后进入 perform。", ["tool-execution", "service"], "simple", False),
    sym("function", P_TOOLS, "recoverToolInvocation", 515, 540, "从取消或中断中恢复一条 tool 调用。", ["tool-execution", "recovery"], "simple", False),
    sym("function", P_TOOLS, "runSequential", 542, 609, "按顺序执行 tool batch，并在每步后物化 ready 结果。", ["tool-execution", "sequential"], "moderate", False),
    sym("function", P_TOOLS, "runParallel", 611, 653, "并行启动 batch 内各 tool 调用并等待全部完成。", ["tool-execution", "parallel"], "simple", False),
    sym("function", P_TOOLS, "runTools", 656, 692, "读取当前 tool batch 并按配置分派顺序或并行执行。", ["tool-execution", "entry-point"], "simple", True),
    # harness.ts
    sym("class", P_HARNESS, "Harness", 29, 372, "AgentHarness 运行时：持有 session、hooks、事件总线，并按名称构建/缓存 Lane。", ["service", "runtime", "entry-point"], "complex", True),
    sym("function", P_HARNESS, "createAgentHarness", 375, 408, "校验配置、从 session 恢复 lane，并构造未启动副作用的 Harness。", ["factory", "entry-point", "runtime"], "simple", True),
    # lane.ts
    sym("function", P_LANE, "selectAcceptedInbox", 143, 167, "按 steering/follow-up 模式从 inbox 选出本轮可接受的项。", ["queue", "policy"], "simple", False),
    sym("function", P_LANE, "pendingEntryWrite", 187, 197, "构造把 pending entry 写入 session values 的 Write。", ["session", "serialization"], "simple", False),
    sym("function", P_LANE, "capturedModel", 199, 218, "从 operation 捕获当时使用的 model 身份。", ["runtime", "model"], "simple", False),
    sym("class", P_LANE, "Lane", 221, 2012, "单 lane 命令执行器：admission、drive、abort、队列与配置变更都走同一条命令线。", ["service", "runtime", "event-handler"], "complex", True, "把 UI 命令与 durable operation 续跑绑在 serialized mutation line 上。"),
    # progress.ts
    sym("function", P_PROGRESS, "readAssistantFrames", 15, 33, "从 pending assistant frames 读取指定 response 的帧列表。", ["streaming", "transcript"], "simple", True),
    sym("function", P_PROGRESS, "openProgress", 35, 67, "打开一个把增量写入 session 并在仍持有 effect 时提交的进度通道。", ["streaming", "channel"], "simple", False),
    sym("function", P_PROGRESS, "openFrameProgress", 69, 88, "为 assistant response 打开 frame 进度通道。", ["streaming", "assistant"], "simple", True),
    sym("function", P_PROGRESS, "openToolProgress", 90, 117, "为 tool 调用打开增量输出进度通道。", ["streaming", "tool-execution"], "simple", True),
    # reducer.ts
    sym("function", P_REDUCER, "reduceLaneSnapshot", 22, 232, "按事件类型更新 LaneSnapshot 上的 operation、工具与队列状态。", ["reducer", "event-handler"], "complex", True),
    # restore.ts
    sym("function", P_RESTORE, "stateMatchesIntent", 26, 45, "检查 durable operation state 是否仍匹配其 intent。", ["validation", "restore"], "simple", False),
    sym("function", P_RESTORE, "classifyLaneStorage", 63, 76, "根据已存 values 判断 lane 是空、完整还是损坏。", ["restore", "validation"], "simple", False),
    sym("function", P_RESTORE, "readLaneStorage", 78, 89, "读取一条 lane 的 durable 配置、状态与 operation 切片。", ["restore", "storage"], "simple", True),
    sym("function", P_RESTORE, "restoreSession", 92, 115, "扫描 session 中所有 lane 并恢复其进程内状态。", ["restore", "session"], "simple", True),
    sym("function", P_RESTORE, "restoreLane", 118, 129, "恢复单条 lane 的存储切片为 LaneState。", ["restore", "session"], "simple", True),
    sym("function", P_RESTORE, "restoreLaneState", 131, 171, "把已读取的 durable 切片物化为进程内 LaneState。", ["restore", "runtime"], "simple", True),
    # transcript.ts
    sym("function", P_TRANSCRIPT, "chainEntries", 12, 21, "按 parentId 把新条目链接成 transcript 链。", ["transcript", "utility"], "simple", True),
    sym("function", P_TRANSCRIPT, "entryLifecycleEvents", 23, 32, "为单条 entry 生成生命周期 harness 事件。", ["transcript", "event-handler"], "simple", True),
    sym("function", P_TRANSCRIPT, "committedEntryEvents", 34, 48, "把一次 commit 中的新 entry 投影为生命周期事件。", ["transcript", "event-handler"], "simple", True),
    sym("function", P_TRANSCRIPT, "readBoundedEntries", 50, 67, "按 capability 边界读取 lane 上可见的 entry。", ["transcript", "session"], "simple", True),
    sym("function", P_TRANSCRIPT, "readBoundedContext", 69, 84, "读取有界 session context，供模型请求使用。", ["transcript", "context"], "simple", True),
    sym("function", P_TRANSCRIPT, "readLaneQueues", 86, 112, "读取 inbox 中排队的 steering/follow-up 消息。", ["transcript", "queue"], "simple", True),
    sym("function", P_TRANSCRIPT, "readPendingMessages", 114, 129, "按 id 列表读取尚未提交的 pending 消息。", ["transcript", "pending"], "simple", True),
    # runtime/types.ts
    sym("class", P_RTYPES, "SliceNotImplemented", 18, 23, "标记尚未实现的 AgentHarness slice 操作。", ["error", "type-definition"], "simple", True),
    sym("class", P_RTYPES, "Drive", 85, 141, "一次进程内 drive pass：持有 effect gate、完成 Promise 与中止信号。", ["runtime", "controller"], "moderate", True, "settle/fail 结束 completion，beginAbort/signalAbort/closeGate 控制 Gate。"),
    # commit.ts
    sym("function", P_COMMIT, "insertEntry", 53, 55, "把 NewEntry 包装成 entry Write。", ["factory", "commit"], "simple", True),
    sym("function", P_COMMIT, "insertUsage", 57, 59, "把 usage 行包装成 usage Write。", ["factory", "commit"], "simple", True),
    sym("function", P_COMMIT, "commitWrite", 61, 76, "为一条 Write 分配 seq/timestamp 并转为 CommittedWrite。", ["serialization", "commit"], "simple", True),
    sym("function", P_COMMIT, "materializeCommittedEntry", 78, 80, "给 NewEntry 填上 seq 与 timestamp 得到 Entry。", ["serialization", "commit"], "simple", True),
    sym("function", P_COMMIT, "prepareStorageCommit", 82, 88, "批量物化 writes 并生成不含 stats 的 CommitResult。", ["commit", "factory"], "simple", True),
    sym("function", P_COMMIT, "validateCommittedWrites", 90, 116, "校验已物化 writes 的 id/parent 不变量。", ["validation", "commit"], "simple", True),
    # session/context.ts
    sym("function", P_SCONTEXT, "buildContextEntries", 10, 22, "按投影规则把 entry 列表建成 context 条目。", ["context", "serialization"], "simple", True),
    sym("function", P_SCONTEXT, "sessionEntryToContextMessages", 31, 45, "把单条 session entry 转成 LLM context messages。", ["context", "serialization"], "simple", True),
    sym("function", P_SCONTEXT, "buildSessionContext", 47, 64, "读取并组装供模型使用的完整 session context。", ["context", "session"], "simple", True),
    # fork-policy.ts
    sym("function", P_FPOLICY, "selectBranchFork", 8, 37, "按 ForkOptions 选出要复制到目标的 entry 集合。", ["fork", "policy"], "simple", True),
    sym("function", P_FPOLICY, "projectForkCurrentStateWrite", 40, 67, "为 fork 目标投影 lane current-state 的 value writes。", ["fork", "serialization"], "simple", True),
    # fork.ts
    sym("function", P_FORK, "createForkSnapshot", 29, 63, "从源存储读取 fork 所需的 entry 与 scalar values。", ["fork", "snapshot"], "simple", True),
    sym("function", P_FORK, "selectForkContents", 65, 83, "对 snapshot 应用 fork 策略，得到目标内容。", ["fork", "policy"], "simple", False),
    sym("function", P_FORK, "validateForkSourceSnapshot", 85, 119, "校验源 snapshot 的分支完整性与必需 lane 值。", ["fork", "validation"], "simple", False),
    # in-memory-storage-state.ts
    sym("function", P_IMSS, "compareKeys", 61, 70, "按 namespace/key 比较存储键，供有序扫描使用。", ["utility", "storage"], "simple", False),
    sym("class", P_IMSS, "InMemoryStorageState", 78, 349, "内存状态机：apply commit、扫描 entry/value/list/usage，并执行 fork。", ["storage", "in-memory", "state-machine"], "complex", True),
    # codec.ts
    sym("function", P_CODEC, "isLegacyV3SessionHeader", 21, 32, "判断记录是否为 legacy v3 session header。", ["validation", "codec"], "simple", True),
    sym("function", P_CODEC, "isJsonlStorageHeader", 34, 47, "判断记录是否为 format-4 JSONL 存储头。", ["validation", "codec"], "simple", True),
    sym("function", P_CODEC, "parseJsonlSessionHeader", 53, 63, "解析 JSONL 文件第一行 header，失败则返回 Result 错误。", ["codec", "serialization"], "simple", True),
    # jsonl/fork.ts
    sym("function", P_JFORK, "readJsonlForkHeader", 25, 42, "读取源 JSONL 的 header 作为 fork 输入元数据。", ["fork", "jsonl"], "simple", False),
    sym("function", P_JFORK, "reachesForkBoundary", 44, 53, "判断一条 entry 是否到达 fork 边界。", ["fork", "policy"], "simple", False),
    sym("class", P_JFORK, "JsonlForkIndex", 71, 158, "在流式扫描中索引源事务，判断 entry/value 是否应进入目标。", ["fork", "index"], "moderate", False),
    sym("function", P_JFORK, "selectJsonlFork", 170, 181, "用 fork 策略从索引中选出要复制的内容。", ["fork", "policy"], "simple", False),
    sym("function", P_JFORK, "projectJsonlForkWrite", 185, 205, "把选中的源 write 投影为 fork 目标 write。", ["fork", "serialization"], "simple", False),
    sym("function", P_JFORK, "indexForkInput", 227, 257, "扫描源 JSONL 事务并填充 JsonlForkIndex。", ["fork", "jsonl"], "simple", False),
    sym("function", P_JFORK, "runJsonlFork", 295, 328, "执行完整 JSONL fork：索引、筛选并原子发布目标文件。", ["fork", "entry-point"], "simple", True),
    # io.ts
    sym("function", P_IO, "fileValue", 15, 18, "构造指向 JSONL 路径的 FileValue 描述。", ["io", "factory"], "simple", True),
    sym("function", P_IO, "readJsonlHeader", 20, 34, "读取并解析 JSONL 文件头。", ["io", "codec"], "simple", True),
    sym("function", P_IO, "parseCommittedWrite", 44, 64, "把 JSON 记录解析为 CommittedWrite。", ["io", "serialization"], "simple", False),
    sym("function", P_IO, "parseJsonlTransaction", 66, 74, "解析一行 JSONL 事务记录。", ["io", "serialization"], "simple", True),
    sym("function", P_IO, "serializeJsonlTransaction", 76, 78, "把事务序列化为 JSONL 行。", ["io", "serialization"], "simple", True),
    sym("function", P_IO, "publishFileAtomically", 81, 104, "先写临时文件再 rename，原子发布内容。", ["io", "atomicity"], "simple", True),
    sym("function", P_IO, "publishJsonl", 107, 118, "原子写出 header 加事务序列的 JSONL 文件。", ["io", "jsonl"], "simple", True),
    # legacy-v3.ts
    sym("function", P_LEGACY, "resolveLegacyV3ParentSessionId", 154, 163, "从 legacy header 解析父 session id。", ["legacy", "migration"], "simple", False),
    sym("function", P_LEGACY, "metadataFromLegacyV3Header", 165, 182, "把 v3 header 转成 format-4 session 元数据。", ["legacy", "migration"], "simple", True),
    sym("function", P_LEGACY, "normalizeLegacyV3Header", 184, 194, "规范化 v3 header 字段以便后续导入。", ["legacy", "normalization"], "simple", True),
    sym("function", P_LEGACY, "parseLegacyV3Entry", 196, 219, "解析一条 legacy v3 transcript entry。", ["legacy", "serialization"], "simple", False),
    sym("function", P_LEGACY, "importedCustomMessage", 221, 232, "把 v3 custom message 转成可导入的自定义消息。", ["legacy", "migration"], "simple", False),
    sym("function", P_LEGACY, "isRetainedEntry", 234, 244, "判断 v3 entry 是否应保留到 v4。", ["legacy", "policy"], "simple", False),
    sym("function", P_LEGACY, "projectContextMessage", 267, 291, "把 v3 context 消息投影为 v4 entry 内容。", ["legacy", "serialization"], "simple", False),
    sym("function", P_LEGACY, "normalizeRetainedEntry", 311, 363, "规范化一条保留的 v3 entry 为 v4 结构。", ["legacy", "normalization"], "moderate", False),
    sym("function", P_LEGACY, "selectedConfiguration", 365, 398, "从 v3 记录恢复被选中的 lane 配置。", ["legacy", "configuration"], "simple", False),
    sym("function", P_LEGACY, "indexLegacyV3Entry", 400, 447, "把一条 v3 entry 编入导入索引。", ["legacy", "index"], "simple", False),
    sym("function", P_LEGACY, "legacyEntryUsage", 449, 461, "从 v3 entry 提取 usage 行。", ["legacy", "usage"], "simple", False),
    sym("function", P_LEGACY, "readLegacyV3Inventory", 463, 484, "扫描 v3 文件建立可导入清单。", ["legacy", "inventory"], "simple", False),
    sym("function", P_LEGACY, "normalizeLegacyV3Values", 486, 521, "把 v3 标量/列表值规范为 v4 values。", ["legacy", "normalization"], "simple", False),
    sym("class", P_LEGACY, "LegacyV3Source", 528, 681, "v3 导入源：读取条目、翻译 id，并生成 v4 writes。", ["legacy", "migration", "source"], "moderate", True),
    # repo.ts
    sym("function", P_REPO, "metadataFromHeader", 21, 34, "从 format-4 header 与文件 mtime 组装 session 元数据。", ["repository", "metadata"], "simple", False),
    sym("class", P_REPO, "JsonlSessionRepo", 46, 389, "文件系统 SessionRepo：按 cwd 分目录存放 JSONL session，并委托 fork/open。", ["repository", "jsonl", "service"], "complex", True),
    # jsonl/storage.ts
    sym("class", P_JSTORAGE, "JsonlStorage", 40, 267, "JSONL Storage 实现：replay 事务、追加 commit，并可将 v3 升级为 v4。", ["storage", "jsonl", "service"], "complex", True),
    # memory.ts
    sym("class", P_MEMORY, "MemoryStorage", 37, 134, "进程内 Storage，把 commit/scan 委托给 InMemoryStorageState。", ["storage", "in-memory"], "moderate", True),
    sym("class", P_MEMORY, "MemorySessionFacade", 145, 332, "包在 MemoryStorage 上的 Session 外观，提供 mutate 与 branch API。", ["session", "facade", "in-memory"], "moderate", False),
    sym("class", P_MEMORY, "MemorySessionRepo", 334, 453, "进程内 SessionRepo，用 Map 管理 MemorySessionFacade 实例。", ["repository", "in-memory", "factory"], "moderate", True),
    # mutation-line.ts
    sym("class", P_MLINE, "MutationLine", 2, 23, "以 Promise tail 串行化 Session 上的读改写作业，seal 后拒绝新作业。", ["concurrency", "utility"], "simple", True),
    # session.ts
    sym("class", P_SESSION, "SessionInvariantError", 45, 50, "durable session 状态不一致、无法安全前进时抛出。", ["error", "session"], "simple", True),
    sym("class", P_SESSION, "SessionInvalidBranchError", 53, 63, "分支名非法或不存在时抛出。", ["error", "session", "branch"], "simple", True),
    sym("class", P_SESSION, "SessionBranchExistsError", 66, 74, "创建已存在的分支时抛出。", ["error", "session", "branch"], "simple", True),
    sym("class", P_SESSION, "SessionPendingAssistantMessageError", 77, 82, "仍有未完成 assistant 消息时拒绝某些 mutation。", ["error", "session"], "simple", True),
    sym("class", P_SESSION, "SessionUnknownTargetError", 85, 93, "引用未知 target/entry id 时抛出。", ["error", "session"], "simple", True),
    sym("class", P_SESSION, "StorageBackedSessionMutation", 95, 181, "一次打开的 session mutation：委托 Storage 读写并在 commit/end 时结算。", ["session", "mutation"], "moderate", False),
    sym("class", P_SESSION, "StorageBackedBranch", 183, 221, "指向 StorageBackedSession 上一条命名分支的外观。", ["session", "branch"], "simple", False),
    sym("class", P_SESSION, "StorageBackedSession", 224, 475, "可持久化 Session：经 MutationLine 串行访问底层 Storage。", ["session", "service"], "complex", True),
    # datasets.ts
    sym("function", P_BDATA, "storageBenchmarkEntryId", 10, 12, "生成存储 benchmark 使用的确定性 entry id。", ["test", "benchmark", "utility"], "simple", True),
    sym("function", P_BDATA, "createDataset", 14, 26, "构造指定规模的线性分支合成数据集。", ["test", "benchmark", "factory"], "simple", False),
    # benchmark/session-repo.ts
    sym("function", P_BREPO, "sessionRepoBenchmarkSessionId", 35, 37, "生成 SessionRepo benchmark 使用的确定性 session id。", ["test", "benchmark", "utility"], "simple", True),
    sym("function", P_BREPO, "seedSessionRepoCatalogBenchmark", 57, 68, "按数据集向 repo 写入 catalog benchmark 会话。", ["test", "benchmark", "seed"], "simple", True),
    sym("function", P_BREPO, "seedSessionRepoForkBenchmark", 136, 161, "写入带 lane 状态的源会话，供 fork benchmark 使用。", ["test", "benchmark", "seed"], "simple", True),
    # benchmark/storage.ts
    sym("function", P_BSTOR, "createEntry", 11, 24, "构造带固定 payload 大小的 benchmark entry。", ["test", "benchmark", "factory"], "simple", False),
    sym("function", P_BSTOR, "seedStorageBenchmark", 44, 47, "把数据集对应的 seed 事务提交到目标 Storage。", ["test", "benchmark", "seed"], "simple", True),
    # conformance/session-repo.ts
    sym("function", P_CREPO, "assistantMessage", 58, 89, "构造 conformance 测试用的 assistant 消息。", ["test", "factory"], "simple", False),
    sym("function", P_CREPO, "usageRow", 91, 104, "构造 conformance 测试用的 usage 行。", ["test", "factory"], "simple", False),
    sym("function", P_CREPO, "createCase", 121, 139, "把单个 repo 测试包装成带 setup/teardown 的用例。", ["test", "factory"], "simple", False),
    sym("function", P_CREPO, "createSessionRepoLifecycleConformance", 142, 228, "覆盖 SessionRepo create/open/list/delete 生命周期。", ["test", "conformance"], "moderate", True),
    sym("function", P_CREPO, "createSessionRepoOwnershipConformance", 231, 247, "覆盖关闭后的所有权与误用行为。", ["test", "conformance"], "simple", True),
    sym("function", P_CREPO, "createSessionRepoMessageConformance", 250, 300, "覆盖消息追加与读取路径。", ["test", "conformance"], "moderate", True),
    sym("function", P_CREPO, "createSessionRepoForkBehaviorConformance", 303, 700, "覆盖 fork 复制范围、分支内容与配置保留。", ["test", "conformance", "fork"], "complex", True),
    sym("function", P_CREPO, "createSessionRepoStreamingForkConformance", 703, 713, "覆盖流式/不完整源上的 fork 行为。", ["test", "conformance", "fork"], "simple", True),
    sym("function", P_CREPO, "createSessionRepoForkLaneValidationConformance", 715, 756, "覆盖 fork 时缺失或不完整 lane 的校验。", ["test", "conformance", "fork"], "simple", False),
    sym("function", P_CREPO, "createSessionRepoForkApplicationListConformance", 759, 929, "覆盖 fork 对 list values 的复制与裁剪。", ["test", "conformance", "fork"], "moderate", False),
    sym("function", P_CREPO, "createSessionRepoBranchForkApplicationStateConformance", 932, 1038, "覆盖分支 fork 后的 application/lane 状态。", ["test", "conformance", "fork"], "moderate", False),
    sym("function", P_CREPO, "createSessionRepoForkDestinationReservationConformance", 1041, 1080, "覆盖 fork 目标 id 预留与冲突。", ["test", "conformance", "fork"], "simple", True),
    sym("function", P_CREPO, "createSessionRepoForkSourceSnapshotConformance", 1083, 1150, "覆盖源 snapshot 完整性要求。", ["test", "conformance", "fork"], "moderate", True),
    sym("function", P_CREPO, "createSessionRepoForkCoordinationConformance", 1153, 1161, "组合 lane 校验、list 与 application-state fork 用例。", ["test", "conformance", "fork"], "simple", True),
    sym("function", P_CREPO, "createSessionRepoForkConformance", 1164, 1172, "组合全部 fork 相关 conformance 套件。", ["test", "conformance", "barrel"], "simple", True),
    sym("function", P_CREPO, "createSessionRepoConformance", 1175, 1185, "组合生命周期、所有权、消息与 fork 全套 repo 测试。", ["test", "conformance", "entry-point"], "simple", True),
    # conformance/storage.ts
    sym("function", P_CSTOR, "createCase", 38, 52, "把单个 Storage 测试包装成带 factory 的用例。", ["test", "factory"], "simple", False),
    sym("function", P_CSTOR, "usage", 54, 71, "构造带指定 token 计数的 usage 行。", ["test", "factory"], "simple", False),
    sym("function", P_CSTOR, "zeroUsage", 73, 82, "构造全零 usage 行。", ["test", "factory"], "simple", False),
    sym("function", P_CSTOR, "userEntry", 84, 95, "构造用户消息 entry fixture。", ["test", "factory"], "simple", False),
    sym("function", P_CSTOR, "compactionEntry", 106, 116, "构造 compaction summary entry fixture。", ["test", "factory"], "simple", False),
    sym("function", P_CSTOR, "createStorageConformance", 134, 920, "生成 Storage commit、扫描、list 与 fork 的完整一致性套件。", ["test", "conformance", "entry-point"], "complex", True),
    # gating-storage.ts
    sym("class", P_GATING, "CommitDiscarded", 6, 11, "模拟存储丢失后，每个被拒绝的 commit 抛出此错误。", ["error", "test"], "simple", True),
    sym("class", P_GATING, "GatingStorage", 26, 114, "可停等或丢弃已准入 commit 的测试 StorageDecorator。", ["test", "storage", "decorator"], "moderate", True),
]


def edge(source: str, target: str, etype: str, weight: float) -> dict:
    return {"source": source, "target": target, "type": etype, "direction": "forward", "weight": weight}


def build_edges(nodes: list[dict]) -> list[dict]:
    edges: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    def add(e: dict) -> None:
        key = (e["source"], e["target"], e["type"])
        if e["source"] == e["target"]:
            return
        if key in seen:
            return
        seen.add(key)
        edges.append(e)

    # imports 1:1
    for src, targets in IMPORTS.items():
        for dst in targets:
            add(edge(f"file:{src}", f"file:{dst}", "imports", 0.7))

    # contains + exports
    for n in nodes:
        if n["type"] in ("function", "class"):
            add(edge(f"file:{n['filePath']}", n["id"], "contains", 1.0))
            if n.get("_exported"):
                add(edge(f"file:{n['filePath']}", n["id"], "exports", 0.8))

    # Intra-file calls stay in the same part. Cross-file same-batch calls are
    # omitted so part validation can resolve targets; imports already link those files.
    # Cross-batch calls target neighborMap symbols.
    calls = [
        (f"function:{P_TOOLS}:runTools", f"function:{P_TPLACE}:readToolBatchSource"),
        (f"function:{P_TOOLS}:runTools", f"function:{P_TPLACE}:materializeReady"),
        (f"function:{P_TOOLS}:performToolInvocation", f"function:{P_ETOOLS}:executeToolCall"),
        (f"function:{P_TOOLS}:performToolInvocation", f"function:{P_ETOOLS}:finalizeToolCall"),
        (f"function:{P_TOOLS}:prepareToolInvocation", f"function:{P_ETOOLS}:prepareToolCall"),
        (f"function:{P_TOOLS}:prepareToolInvocation", f"function:{P_ETOOLS}:applyBeforeToolDecision"),
        (f"function:{P_TOOLS}:publishToolOutcome", f"function:{P_ETOOLS}:toolResultFromMessage"),
        (f"function:{P_TOOLS}:publishToolOutcome", f"function:{P_ETOOLS}:createToolResultMessage"),
        (f"function:{P_TOOLS}:startToolInvocation", f"function:{P_TPLACE}:toolCallFor"),
        (f"function:{P_TOOLS}:runSequential", f"function:{P_TPLACE}:withToolBatch"),
        (f"function:{P_TOOLS}:runParallel", f"function:{P_TPLACE}:withToolBatch"),
        (f"function:{P_HARNESS}:createAgentHarness", f"class:{P_HARNESS}:Harness"),
        (f"function:{P_HARNESS}:createAgentHarness", f"function:{P_CONFIG}:validateToolNames"),
        (f"function:{P_HARNESS}:createAgentHarness", f"function:{P_CONFIG}:validateRetryPolicy"),
        (f"function:{P_HARNESS}:createAgentHarness", f"function:{P_CONFIG}:validateCompactionSettings"),
        (f"class:{P_LANE}:Lane", f"function:{P_DRIVE}:driveOperation"),
        (f"class:{P_LANE}:Lane", f"function:{P_STRUCT}:durableBranchPreparation"),
        (f"class:{P_LANE}:Lane", f"function:{P_STRUCT}:durableCompactionPreparation"),
        (f"class:{P_LANE}:Lane", f"function:{P_ETOOLS}:toolResultFromMessage"),
        (f"class:{P_LANE}:Lane", f"function:{P_COMPACT}:prepareCompaction"),
        (f"class:{P_LANE}:Lane", f"function:{P_BRANCH}:prepareBranchEntries"),
        (f"class:{P_LANE}:Lane", f"function:{P_PROMPTS}:formatPromptTemplateInvocation"),
        (f"class:{P_LANE}:Lane", f"function:{P_SKILLS}:formatSkillInvocation"),
        (f"class:{P_LANE}:Lane", f"function:{P_CTX}:awaitWithContext"),
        (f"class:{P_RTYPES}:Drive", f"function:{P_EFFECT}:createGate"),
        (f"function:{P_PROGRESS}:openFrameProgress", f"function:{P_PROGRESS}:openProgress"),
        (f"function:{P_PROGRESS}:openToolProgress", f"function:{P_PROGRESS}:openProgress"),
        (f"function:{P_RESTORE}:restoreSession", f"function:{P_RESTORE}:restoreLaneState"),
        (f"function:{P_RESTORE}:restoreLane", f"function:{P_RESTORE}:readLaneStorage"),
        (f"function:{P_TRANSCRIPT}:committedEntryEvents", f"function:{P_TRANSCRIPT}:entryLifecycleEvents"),
        (f"function:{P_SCONTEXT}:sessionEntryToContextMessages", f"function:{P_MSGS}:createBranchSummaryMessage"),
        (f"function:{P_SCONTEXT}:sessionEntryToContextMessages", f"function:{P_MSGS}:createCompactionSummaryMessage"),
        (f"function:{P_SCONTEXT}:buildSessionContext", f"function:{P_SCONTEXT}:buildContextEntries"),
        (f"function:{P_SCONTEXT}:buildSessionContext", f"function:{P_SCONTEXT}:sessionEntryToContextMessages"),
        (f"class:{P_IMSS}:InMemoryStorageState", f"function:{P_USAGE}:addUsage"),
        (f"class:{P_IMSS}:InMemoryStorageState", f"function:{P_USAGE}:emptyUsage"),
        (f"function:{P_CODEC}:parseJsonlSessionHeader", f"function:{P_HTYPES}:ok"),
        (f"function:{P_CODEC}:parseJsonlSessionHeader", f"function:{P_HTYPES}:err"),
        (f"function:{P_IO}:publishJsonl", f"function:{P_IO}:publishFileAtomically"),
        (f"function:{P_COMMIT}:prepareStorageCommit", f"function:{P_COMMIT}:commitWrite"),
        (f"class:{P_LEGACY}:LegacyV3Source", f"function:{P_MSGS}:createBranchSummaryMessage"),
        (f"class:{P_LEGACY}:LegacyV3Source", f"function:{P_MSGS}:createCompactionSummaryMessage"),
        (f"class:{P_LEGACY}:LegacyV3Source", f"function:{P_USAGE}:addUsage"),
        (f"class:{P_LEGACY}:LegacyV3Source", f"function:{P_USAGE}:emptyUsage"),
        (f"class:{P_LEGACY}:LegacyV3Source", f"function:{P_UUID}:uuidv7"),
        (f"class:{P_REPO}:JsonlSessionRepo", f"function:{P_UUID}:uuidv7"),
        (f"class:{P_JSTORAGE}:JsonlStorage", f"function:{P_UUID}:uuidv7"),
        (f"class:{P_MEMORY}:MemorySessionRepo", f"class:{P_MEMORY}:MemoryStorage"),
        (f"class:{P_MEMORY}:MemorySessionRepo", f"function:{P_UUID}:uuidv7"),
        (f"class:{P_SESSION}:StorageBackedSession", f"function:{P_UUID}:uuidv7"),
        (f"function:{P_BREPO}:seedSessionRepoForkBenchmark", f"function:{P_BREPO}:sessionRepoBenchmarkSessionId"),
        (f"function:{P_BDATA}:createDataset", f"function:{P_BDATA}:storageBenchmarkEntryId"),
        (f"function:{P_CREPO}:createSessionRepoConformance", f"function:{P_CREPO}:createSessionRepoLifecycleConformance"),
        (f"function:{P_CREPO}:createSessionRepoConformance", f"function:{P_CREPO}:createSessionRepoOwnershipConformance"),
        (f"function:{P_CREPO}:createSessionRepoConformance", f"function:{P_CREPO}:createSessionRepoMessageConformance"),
        (f"function:{P_CREPO}:createSessionRepoConformance", f"function:{P_CREPO}:createSessionRepoForkConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkConformance", f"function:{P_CREPO}:createSessionRepoForkBehaviorConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkConformance", f"function:{P_CREPO}:createSessionRepoStreamingForkConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkConformance", f"function:{P_CREPO}:createSessionRepoForkDestinationReservationConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkConformance", f"function:{P_CREPO}:createSessionRepoForkSourceSnapshotConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkConformance", f"function:{P_CREPO}:createSessionRepoForkCoordinationConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkCoordinationConformance", f"function:{P_CREPO}:createSessionRepoForkLaneValidationConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkCoordinationConformance", f"function:{P_CREPO}:createSessionRepoForkApplicationListConformance"),
        (f"function:{P_CREPO}:createSessionRepoForkCoordinationConformance", f"function:{P_CREPO}:createSessionRepoBranchForkApplicationStateConformance"),
        (f"function:{P_CSTOR}:createStorageConformance", f"function:{P_CSTOR}:createCase"),
    ]
    for src, dst in calls:
        add(edge(src, dst, "calls", 0.8))

    inherits = [
        (f"class:{P_GATING}:GatingStorage", f"class:{P_SDEC}:StorageDecorator"),
    ]
    for src, dst in inherits:
        add(edge(src, dst, "inherits", 0.9))

    tested = [
        (P_COMMIT, P_CREPO),
        (P_COMMIT, P_CSTOR),
        (P_COMMIT, P_BSTOR),
        (P_BDATA, P_BREPO),
        (P_BDATA, P_BSTOR),
    ]
    for prod, test in tested:
        add(edge(f"file:{prod}", f"file:{test}", "tested_by", 0.5))

    return edges


def strip_private(node: dict) -> dict:
    return {k: v for k, v in node.items() if not k.startswith("_")}


def neighbor_symbols() -> set[tuple[str, str, str]]:
    """(kind_guess, path, symbol) — we accept function or class prefix for listed symbols."""
    out: set[tuple[str, str]] = set()
    for neighbors in NEIGHBOR_MAP.values():
        for nb in neighbors:
            for sym_name in nb.get("symbols") or []:
                out.add((nb["path"], sym_name))
    return out


def import_paths() -> set[str]:
    paths = set(IMPORTS.keys())
    for vals in IMPORTS.values():
        paths.update(vals)
    for src, neighbors in NEIGHBOR_MAP.items():
        paths.add(src)
        for nb in neighbors:
            paths.add(nb["path"])
    return paths


def validate_part(part_nodes: list[dict], part_edges: list[dict], allowed_files: set[str], nb_syms: set[tuple[str, str]]) -> list[str]:
    ids = {n["id"] for n in part_nodes}
    errors: list[str] = []
    for e in part_edges:
        for end in ("source", "target"):
            ref = e[end]
            if ref in ids:
                continue
            if ref.startswith("file:"):
                path = ref[len("file:") :]
                if path in allowed_files:
                    continue
                errors.append(f"{end} {ref} not in part nodes or import/neighbor files")
                continue
            if ref.startswith("function:") or ref.startswith("class:"):
                kind, rest = ref.split(":", 1)
                # function:path:name or class:path:name — path may contain colons? no
                # path has slashes; name is last segment after last path component... 
                # format is kind:relative-path:symbol
                # relative-path contains no colon typically
                parts = ref.split(":")
                # kind, path..., symbol
                symbol = parts[-1]
                path = ":".join(parts[1:-1]) if False else ref[len(kind) + 1 : ref.rfind(":")]
                if (path, symbol) in nb_syms:
                    continue
                errors.append(f"{end} {ref} not in part nodes and symbol not in neighborMap")
                continue
            errors.append(f"{end} {ref} has unknown id form")
    return errors


def main() -> None:
    nodes = [strip_private(n) | ({"_exported": n.get("_exported", False)} if "_exported" in n else {}) for n in FILE_NODES]
    # keep exported flag only on symbols
    all_nodes = list(FILE_NODES)
    for s in SYMBOLS:
        all_nodes.append(s)

    # uniqueness
    ids = [n["id"] for n in all_nodes]
    if len(ids) != len(set(ids)):
        dup = sorted({i for i in ids if ids.count(i) > 1})
        raise SystemExit(f"duplicate node ids: {dup}")

    # every batch file has a file node
    batch_files = [f["path"] for f in BRIEF["files"]]
    file_ids = {n["filePath"] for n in all_nodes if n["type"] == "file"}
    missing = set(batch_files) - file_ids
    extra = file_ids - set(batch_files)
    if missing or extra:
        raise SystemExit(f"file node mismatch missing={missing} extra={extra}")

    import_sum = sum(len(v) for v in IMPORTS.values())
    edges = build_edges(all_nodes)
    import_edges = [e for e in edges if e["type"] == "imports"]
    if len(import_edges) != import_sum:
        raise SystemExit(f"imports {len(import_edges)} != expected {import_sum}")

    public_nodes = [strip_private(n) for n in all_nodes]
    node_count = len(public_nodes)
    edge_count = len(edges)
    print(f"totals nodes={node_count} edges={edge_count} imports={len(import_edges)}")

    files_sorted = sorted(batch_files)
    if node_count <= 60 and edge_count <= 120:
        parts_n = 1
    else:
        parts_n = math.ceil(max(node_count / 60, edge_count / 120))
    chunk = math.ceil(len(files_sorted) / parts_n)
    print(f"parts={parts_n} chunk={chunk} files={len(files_sorted)}")

    allowed_files = import_paths()
    nb_syms = neighbor_symbols()
    out_dir = UA_DIR / "intermediate"
    written: list[Path] = []

    if parts_n == 1:
        payload = {"nodes": public_nodes, "edges": edges}
        path = out_dir / "batch-10.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
        written.append(path)
    else:
        id_to_node = {n["id"]: n for n in all_nodes}
        for k in range(parts_n):
            part_files = files_sorted[k * chunk : (k + 1) * chunk]
            part_file_set = set(part_files)
            part_nodes_raw = [n for n in all_nodes if n.get("filePath") in part_file_set]
            part_ids = {n["id"] for n in part_nodes_raw}
            part_edges = [e for e in edges if e["source"] in part_ids]
            errors = validate_part(part_nodes_raw, part_edges, allowed_files, nb_syms)
            if errors:
                raise SystemExit(f"part {k+1} validation failed:\n" + "\n".join(errors[:40]))
            payload = {"nodes": [strip_private(n) for n in part_nodes_raw], "edges": part_edges}
            path = out_dir / f"batch-10-part-{k+1}.json"
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
            written.append(path)
            print(f"wrote {path.name} nodes={len(payload['nodes'])} edges={len(payload['edges'])} files={len(part_files)}")

    # leftover edges?
    if parts_n > 1:
        assigned = 0
        for k in range(parts_n):
            part_files = set(files_sorted[k * chunk : (k + 1) * chunk])
            part_ids = {n["id"] for n in all_nodes if n.get("filePath") in part_files}
            assigned += sum(1 for e in edges if e["source"] in part_ids)
        if assigned != edge_count:
            raise SystemExit(f"edge assignment {assigned} != {edge_count}")

    print("written", [p.name for p in written])


if __name__ == "__main__":
    main()
