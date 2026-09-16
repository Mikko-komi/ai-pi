#!/usr/bin/env python3
"""Generate batch-19 knowledge-graph fragments."""
import json
from collections import defaultdict
from pathlib import Path

UA = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
brief = json.loads((UA / "intermediate/batch-briefs/batch-19.json").read_text())
batch_import = brief["batchImportData"]
neighbor_map = brief["neighborMap"]

P_IRW = "packages/coding-agent/src/utils/image-resize-worker.ts"
P_IR = "packages/coding-agent/src/utils/image-resize.ts"
P_MIME = "packages/coding-agent/src/utils/mime.ts"
P_PHOTON = "packages/coding-agent/src/utils/photon.ts"
P_TRI = "packages/coding-agent/src/utils/tool-result-images.ts"
P_TM = "packages/coding-agent/src/utils/tools-manager.ts"
P_SRT = "packages/session-backends/sqlite-node/benchmark/session/session-repo-targets.ts"
P_SRB = "packages/session-backends/sqlite-node/benchmark/session/session-repo.bench.ts"
P_STT = "packages/session-backends/sqlite-node/benchmark/session/storage-targets.ts"
P_STB = "packages/session-backends/sqlite-node/benchmark/session/storage.bench.ts"
P_IDX = "packages/session-backends/sqlite-node/src/index.ts"
P_MIG = "packages/session-backends/sqlite-node/src/sqlite/migrations.ts"
P_REPO = "packages/session-backends/sqlite-node/src/sqlite/repo.ts"
P_SESS = "packages/session-backends/sqlite-node/src/sqlite/session.ts"
P_BE = "packages/session-backends/sqlite-node/src/sqlite/session/branch-entries.ts"
P_ENT = "packages/session-backends/sqlite-node/src/sqlite/session/entries.ts"
P_SROW = "packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts"
P_SSEQ = "packages/session-backends/sqlite-node/src/sqlite/session/session-sequences.ts"
P_SSTAT = "packages/session-backends/sqlite-node/src/sqlite/session/session-stats.ts"
P_UL = "packages/session-backends/sqlite-node/src/sqlite/session/usage-ledger.ts"
P_VAL = "packages/session-backends/sqlite-node/src/sqlite/session/values.ts"
P_SQL = "packages/session-backends/sqlite-node/src/sqlite/sql.ts"
P_STOR = "packages/session-backends/sqlite-node/src/sqlite/storage.ts"
P_TYP = "packages/session-backends/sqlite-node/src/sqlite/types.ts"

P_CORE = "packages/coding-agent/src/utils/image-resize-core.ts"
P_IP = "packages/coding-agent/src/utils/image-process.ts"
P_HTTP = "packages/coding-agent/src/utils/management-http.ts"
P_AI = "packages/ai/src/index.ts"


def file_node(path, name, summary, tags, complexity, notes=None):
    n = {
        "id": f"file:{path}",
        "type": "file",
        "name": name,
        "filePath": path,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if notes:
        n["languageNotes"] = notes
    return n


def sym(kind, path, name, start, end, summary, tags, complexity, notes=None):
    n = {
        "id": f"{kind}:{path}:{name}",
        "type": kind,
        "name": name,
        "filePath": path,
        "lineRange": [start, end],
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if notes:
        n["languageNotes"] = notes
    return n


def edge(src, tgt, typ, weight):
    return {"source": src, "target": tgt, "type": typ, "direction": "forward", "weight": weight}


nodes = [
    file_node(
        P_IRW,
        "image-resize-worker.ts",
        "Worker 线程入口：接收可转移的图像字节，调用进程内 resize 并回传结果或错误，避免阻塞 TUI 主循环。",
        ["worker", "image-processing", "utility"],
        "simple",
    ),
    file_node(
        P_IR,
        "image-resize.ts",
        "对外图像缩放入口：优先在 worker 线程用 Photon 缩放，失败则回退到进程内处理，并生成尺寸换算说明。",
        ["image-processing", "utility", "worker"],
        "moderate",
        "通过 worker_threads 与 Transferable 字节避免阻塞事件循环；Bun 编译产物用字符串路径加载 worker。",
    ),
    file_node(
        P_MIME,
        "mime.ts",
        "通过魔数检测受支持的图像 MIME 类型，覆盖 JPEG/PNG/GIF/WebP/BMP，并识别动画 PNG。",
        ["utility", "validation", "image-processing"],
        "moderate",
    ),
    file_node(
        P_PHOTON,
        "photon.ts",
        "包装 photon-node 的懒加载，并修补 fs.readFileSync，以便在 Bun 编译二进制中找到 WASM。",
        ["image-processing", "wasm", "utility"],
        "moderate",
        "通过猴子补丁 fs.readFileSync 把丢失的 photon_rs_bg.wasm 重定向到可执行文件旁的回退路径。",
    ),
    file_node(
        P_TRI,
        "tool-result-images.ts",
        "规范化工具结果中的图像块，对 oversized 图像走 processImage，避免后续 provider 请求整段被拒。",
        ["utility", "image-processing", "validation"],
        "simple",
    ),
    file_node(
        P_TM,
        "tools-manager.ts",
        "管理 fd/ripgrep 等外部 CLI 工具：解析本地或系统路径，并从 GitHub release 下载、解压、安装到 bin 目录。",
        ["utility", "service", "download"],
        "complex",
    ),
    file_node(
        P_SRT,
        "session-repo-targets.ts",
        "为 SQLite SessionRepo 基准测试提供 fixture：创建临时目录与 SqliteSessionRepo 实例。",
        ["test", "benchmark", "factory"],
        "simple",
    ),
    file_node(
        P_SRB,
        "session-repo.bench.ts",
        "注册 SessionRepo 的目录读写与 fork 写入基准场景，使用共享 harness 数据集与 seed 函数。",
        ["test", "benchmark", "session"],
        "simple",
    ),
    file_node(
        P_STT,
        "storage-targets.ts",
        "为 SQLite Storage 基准测试构建内存数据库 fixture，写入初始 schema 与空 session 行。",
        ["test", "benchmark", "factory"],
        "simple",
    ),
    file_node(
        P_STB,
        "storage.bench.ts",
        "注册 SQLite Storage 的读写基准场景，并对 fixture 预置 harness 数据集。",
        ["test", "benchmark", "storage"],
        "simple",
    ),
    file_node(
        P_IDX,
        "index.ts",
        "node:sqlite 适配层：包装 DatabaseSync/Statement，提供可注入的 SqliteDatabaseFactory，并再导出 session backend。",
        ["entry-point", "adapter", "factory"],
        "moderate",
        "用 node:sqlite 的 DatabaseSync 实现同步事务，并拒绝事务回调返回 Promise。",
    ),
    file_node(
        P_MIG,
        "migrations.ts",
        "读取 schema.sql 并对数据库执行初始 schema 迁移。",
        ["database", "migration", "schema-definition"],
        "simple",
    ),
    file_node(
        P_REPO,
        "repo.ts",
        "SQLite SessionRepo 实现：按文件或共享库管理 session 生命周期，支持 create/open/list/delete/fork 与快照复制。",
        ["data-model", "service", "session"],
        "complex",
    ),
    file_node(
        P_SESS,
        "session.ts",
        "SqliteOpenSession 包装底层 Session，用 admit 集合串行化并发操作，并在关闭时排空 in-flight 请求。",
        ["session", "lifecycle", "adapter"],
        "moderate",
    ),
    file_node(
        P_BE,
        "branch-entries.ts",
        "维护 branch_meta/branch_entries 索引：追加、分叉、compaction 边界拷贝，以及按段扫描分支条目。",
        ["data-model", "session", "query"],
        "complex",
    ),
    file_node(
        P_ENT,
        "entries.ts",
        "session 条目的编解码与 SQL 读写，含预编译插入的 EntryRowWriter 和按查询扫描。",
        ["data-model", "serialization", "database"],
        "moderate",
    ),
    file_node(
        P_SROW,
        "session-row.ts",
        "sessions 表的 CRUD：读写元数据、插入初始行，并级联删除 entries/values/ledger/branch 相关行。",
        ["data-model", "database", "session"],
        "moderate",
    ),
    file_node(
        P_SSEQ,
        "session-sequences.ts",
        "读写 sessions.next_seq，用于分配下一条目序号。",
        ["database", "utility", "session"],
        "simple",
    ),
    file_node(
        P_SSTAT,
        "session-stats.ts",
        "聚合 session 的 message_count 与 token usage，支持累加 Usage 并写回 usage_payload。",
        ["data-model", "session", "utility"],
        "simple",
    ),
    file_node(
        P_UL,
        "usage-ledger.ts",
        "usage_ledger 行的插入、解码与条件扫描，并提供预编译写入器。",
        ["data-model", "database", "serialization"],
        "simple",
    ),
    file_node(
        P_VAL,
        "values.ts",
        "标量与列表值的 SQLite 存取：upsert/delete、前缀扫描，以及列表分页读取。",
        ["data-model", "database", "query"],
        "moderate",
    ),
    file_node(
        P_SQL,
        "sql.ts",
        "带参数的 SQL 模板标签与 SqlQuery 执行器，支持 exec/run/get/all/iterate 和片段拼接。",
        ["utility", "database", "query"],
        "simple",
        "标签模板把插值编成 ? 占位符，并把 SqlQuery 片段拼接成复合 WHERE。",
    ),
    file_node(
        P_STOR,
        "storage.ts",
        "SqliteStorage 实现 Storage 接口：排队提交事务、读写条目/值/分支/usage，并生成 fork 快照。",
        ["data-model", "service", "session"],
        "moderate",
    ),
    file_node(
        P_TYP,
        "types.ts",
        "定义 SQLite 后端的数据库、语句、工厂接口，隔离 node:sqlite 实现细节。",
        ["type-definition", "database", "adapter"],
        "simple",
    ),
    # image-resize
    sym("function", P_IR, "resizeImageInWorker", 25, 76, "在独立 worker 中执行图像缩放：发送可转移字节、校验响应，并在超时或错误时终止 worker。", ["image-processing", "worker", "utility"], "moderate"),
    sym("function", P_IR, "resizeImage", 85, 110, "对外缩放入口：优先启动 worker，Bun 下尝试嵌入路径，失败则回退到进程内 Photon 处理。", ["image-processing", "entry-point", "utility"], "simple"),
    sym("function", P_IR, "formatDimensionNote", 116, 123, "为已缩放图像生成坐标换算说明，帮助模型把显示坐标映射回原图。", ["utility", "formatting", "image-processing"], "simple"),
    # mime
    sym("function", P_MIME, "detectSupportedImageMimeType", 6, 23, "根据缓冲区魔数识别 JPEG/PNG/GIF/WebP/BMP，动画 PNG 返回 undefined。", ["utility", "validation", "image-processing"], "simple"),
    sym("function", P_MIME, "detectSupportedImageMimeTypeFromFile", 25, 34, "读取文件头部字节并委托 detectSupportedImageMimeType 判断 MIME。", ["utility", "validation", "image-processing"], "simple"),
    sym("function", P_MIME, "isAnimatedPng", 42, 55, "扫描 PNG chunk 是否包含 acTL，以判断是否为动画 PNG。", ["utility", "validation", "image-processing"], "simple"),
    sym("function", P_MIME, "isBmp", 57, 81, "校验 BMP 头、DIB 尺寸与位深，确认是否为可解码的位图。", ["utility", "validation", "image-processing"], "simple"),
    # photon
    sym("function", P_PHOTON, "patchPhotonWasmRead", 54, 110, "临时劫持 fs.readFileSync，把丢失的 photon WASM 读取重定向到多个回退路径。", ["wasm", "utility", "adapter"], "moderate"),
    sym("function", P_PHOTON, "loadPhoton", 116, 139, "懒加载 photon-node 模块，加载期间应用 WASM 路径补丁并缓存成功或失败结果。", ["image-processing", "factory", "wasm"], "simple"),
    # tool-result-images
    sym("function", P_TRI, "normalizeToolResultImages", 22, 62, "遍历工具结果内容，将 oversized 图像交给 processImage，未变化时返回原数组。", ["utility", "image-processing", "validation"], "simple"),
    # tools-manager
    sym("function", P_TM, "getToolPath", 83, 102, "按优先顺序查找已安装的 fd/rg：本地 bin 目录，其次系统 PATH 中的别名。", ["utility", "path-resolution", "tooling"], "simple"),
    sym("function", P_TM, "getLatestVersion", 110, 138, "跟随 GitHub latest release 重定向，解析 tag 并去掉工具配置的前缀。", ["download", "utility", "api-handler"], "simple"),
    sym("function", P_TM, "downloadFile", 141, 154, "带超时地下载 URL 到目标路径，将 Web stream 管道写入本地文件。", ["download", "utility", "network"], "simple"),
    sym("function", P_TM, "findBinaryRecursively", 156, 176, "在解压目录中递归查找指定二进制文件名。", ["utility", "filesystem", "search"], "simple"),
    sym("function", P_TM, "formatSpawnFailure", 178, 191, "把 spawnSync 失败格式化为包含 stderr/stdout 的错误信息。", ["utility", "error-handling", "process"], "simple"),
    sym("function", P_TM, "getWindowsTarCommand", 208, 217, "定位 Windows 上可用的 tar.exe，优先系统32目录。", ["utility", "windows", "archive"], "simple"),
    sym("function", P_TM, "extractZipArchive", 219, 255, "在 Windows 上依次尝试 tar/powershell/expand 解压 zip，并汇总失败原因。", ["utility", "archive", "windows"], "simple"),
    sym("function", P_TM, "downloadTool", 258, 331, "按平台选择 GitHub asset，下载并解压 tar.gz/zip，再把二进制安装到 bin 目录。", ["download", "service", "install"], "moderate"),
    sym("function", P_TM, "ensureTool", 349, 400, "确保 fd/rg 可用：已存在则返回路径，离线模式报错，否则下载并报告状态。", ["service", "entry-point", "install"], "moderate"),
    # sqlite index
    sym("class", P_IDX, "NodeSqliteStatement", 17, 61, "把 node:sqlite 预处理语句适配为 SqliteStatement，兼容命名参数与位置参数。", ["adapter", "database", "sqlite"], "simple"),
    sym("class", P_IDX, "NodeSqliteDatabase", 63, 100, "包装 DatabaseSync：exec/prepare/close，并用 BEGIN IMMEDIATE 实现同步事务。", ["adapter", "database", "sqlite"], "simple"),
    sym("function", P_IDX, "wrapNodeSqliteDatabase", 102, 104, "把已有 DatabaseSync 实例包装为 SqliteDatabase。", ["factory", "adapter", "database"], "simple"),
    sym("function", P_IDX, "createNodeSqliteFactory", 106, 120, "创建可 open/openExisting/openReadOnly 的 SqliteDatabaseFactory。", ["factory", "entry-point", "database"], "simple"),
    # migrations
    sym("function", P_MIG, "applyInitialSchema", 5, 8, "读取同目录 schema.sql 并对数据库执行初始 DDL。", ["migration", "database", "schema-definition"], "simple"),
    # repo
    sym("function", P_REPO, "buildForkSnapshot", 86, 102, "基于源快照调用 createForkSnapshot，排序条目并计算 messageCount 与 nextSeq。", ["session", "fork", "data-model"], "simple"),
    sym("function", P_REPO, "readForkSourceEntries", 105, 120, "按 fork 选项从源库读取完整条目或扫描到指定分支 tip。", ["session", "fork", "query"], "simple"),
    sym("function", P_REPO, "createSqliteForkSnapshot", 122, 147, "在只读事务中读取源 session 元数据、标量值与条目，组装 fork 快照。", ["session", "fork", "database"], "simple"),
    sym("class", P_REPO, "SqliteSessionRepo", 157, 453, "SQLite SessionRepo：管理每 session 文件或共享库，提供创建、打开、列举、删除、fork 与关闭。", ["service", "session", "data-model"], "complex"),
    # session
    sym("class", P_SESS, "SqliteOpenSession", 24, 213, "打开中的 SQLite session 外观：委托底层 Session，并用 admit 跟踪并发，关闭时拒绝新操作。", ["session", "lifecycle", "adapter"], "moderate"),
    # branch-entries
    sym("function", P_BE, "readBranchMembership", 51, 63, "查询条目当前所属的有效 branch_id 与 entry_seq。", ["query", "session", "database"], "simple"),
    sym("function", P_BE, "readBranchSegmentsNewestFirst", 98, 111, "从 tip 沿 base 链收集分支段，按从新到旧返回。", ["query", "session", "data-model"], "simple"),
    sym("function", P_BE, "readNewestCompactionBoundary", 113, 130, "在分支段中查找最新 compaction 条目，作为分叉拷贝下界。", ["query", "session", "compaction"], "simple"),
    sym("function", P_BE, "copyBranchEntriesAfterSeqThroughParent", 132, 150, "把源分支段中 afterSeq 之后的条目复制到目标分支。", ["session", "database", "fork"], "simple"),
    sym("function", P_BE, "createDivergentBranchForEntry", 152, 164, "为非线性追加创建新分支：写入 branch_meta 并拷贝 compaction 之后的祖先条目。", ["session", "fork", "data-model"], "simple"),
    sym("function", P_BE, "appendEntryToBranchIndex", 166, 178, "把新条目挂到分支索引：根分支、沿 tip 追加，或创建分叉分支。", ["session", "data-model", "index"], "simple"),
    sym("function", P_BE, "readStopSeq", 187, 205, "按查询谓词计算分支段内的停止序号，供扫描提前结束。", ["query", "session", "database"], "simple"),
    sym("function", P_BE, "branchScanPredicates", 207, 229, "拼出分支扫描的 SQL 谓词：段范围、类型过滤与 stopSeq。", ["query", "database", "session"], "simple"),
    sym("function", P_BE, "scanEntrySegmentRows", 235, 251, "扫描单个分支段并返回带 payload 的完整条目行。", ["query", "session", "database"], "simple"),
    sym("function", P_BE, "decodeEntryStructureRow", 253, 262, "把无 payload 的结构行解码为 EntryStructure。", ["serialization", "data-model", "session"], "simple"),
    sym("function", P_BE, "scanStructureSegmentRows", 264, 281, "扫描单个分支段并返回不含 payload 的条目结构行。", ["query", "session", "database"], "simple"),
    sym("function", P_BE, "scanBranchSegments", 283, 312, "沿分支段链调用 readSegment，处理 stopSeq 与 limit，拼出跨段扫描结果。", ["query", "session", "database"], "simple"),
    sym("function", P_BE, "scanBranchEntries", 314, 316, "按 StorageBranchScan 扫描分支上的完整 Entry。", ["query", "session", "entry-point"], "simple"),
    sym("function", P_BE, "scanBranchEntryStructures", 318, 324, "按 StorageBranchScan 扫描分支上的 EntryStructure。", ["query", "session", "entry-point"], "simple"),
    # entries
    sym("function", P_ENT, "entryPayload", 28, 63, "按条目类型序列化 payload JSON，覆盖 message/tool/compaction/custom 等变体。", ["serialization", "data-model", "session"], "simple"),
    sym("function", P_ENT, "entryRowParams", 72, 83, "把 Entry 转成 INSERT 语句参数，包含序列化后的 payload。", ["serialization", "database", "session"], "simple"),
    sym("class", P_ENT, "EntryRowWriter", 85, 97, "预编译 INSERT 语句的条目写入器，供提交循环复用。", ["database", "serialization", "session"], "simple"),
    sym("function", P_ENT, "insertEntryRow", 99, 101, "一次性准备并插入单条 entry 行。", ["database", "session", "write"], "simple"),
    sym("function", P_ENT, "decodeEntryRow", 103, 121, "按 type 把 entries 行解码为 Entry，解析 JSON payload。", ["serialization", "data-model", "session"], "simple"),
    sym("function", P_ENT, "entryStructureFromRow", 123, 132, "从行数据构造不含 payload 的 EntryStructure。", ["serialization", "data-model", "session"], "simple"),
    sym("function", P_ENT, "readEntryRows", 134, 143, "按 id 列表批量读取 entries 行。", ["query", "database", "session"], "simple"),
    sym("function", P_ENT, "readAllEntryRows", 145, 148, "按 seq 升序读取某 session 的全部 entries。", ["query", "database", "session"], "simple"),
    sym("function", P_ENT, "scanEntryRows", 150, 161, "按类型、序号范围与 limit 扫描 entries 表。", ["query", "database", "session"], "simple"),
    # session-row
    sym("function", P_SROW, "zeroUsage", 22, 31, "返回全零的 Usage 对象，用作新 session 的初始 usage_payload。", ["utility", "data-model", "session"], "simple"),
    sym("function", P_SROW, "readSessionRow", 33, 40, "按 id 读取 sessions 表的一行。", ["query", "database", "session"], "simple"),
    sym("function", P_SROW, "readAllSessionRows", 42, 46, "读取库中全部 sessions 行。", ["query", "database", "session"], "simple"),
    sym("function", P_SROW, "hasSessionRow", 48, 50, "判断指定 session id 是否已存在。", ["query", "database", "session"], "simple"),
    sym("function", P_SROW, "metadataFromSessionRow", 52, 70, "把 sessions 行映射为 SqliteSessionMetadata，并标记存储版本是否过期。", ["serialization", "data-model", "session"], "simple"),
    sym("function", P_SROW, "insertSessionRow", 72, 90, "插入新 session 行，写入零 usage 与初始 next_seq。", ["database", "session", "data-model"], "simple"),
    sym("function", P_SROW, "deleteSessionRows", 92, 102, "按 session id 级联删除 entries、values、ledger、branch 与 session 行。", ["database", "session", "migration"], "simple"),
    # sequences
    sym("function", P_SSEQ, "readNextSeq", 4, 8, "读取 sessions.next_seq。", ["query", "database", "session"], "simple"),
    sym("function", P_SSEQ, "advanceNextSeq", 10, 14, "把 sessions.next_seq 更新为指定值。", ["database", "session", "write"], "simple"),
    # stats
    sym("function", P_SSTAT, "addUsage", 7, 28, "逐字段累加两次 Usage（token 与 cost）。", ["utility", "data-model", "session"], "simple"),
    sym("function", P_SSTAT, "readSessionStats", 30, 36, "从 session 行解析 messageCount 与 usage。", ["query", "session", "data-model"], "simple"),
    sym("function", P_SSTAT, "incrementMessageCount", 38, 40, "将 sessions.message_count 加一。", ["database", "session", "write"], "simple"),
    sym("function", P_SSTAT, "addUsageToSessionStats", 42, 45, "把增量 Usage 累加后写回 usage_payload。", ["database", "session", "data-model"], "simple"),
    # usage-ledger
    sym("function", P_UL, "usageLedgerRowParams", 17, 27, "把 usage ledger 行转成 INSERT 参数，序列化 usage 与 details。", ["serialization", "database", "session"], "simple"),
    sym("class", P_UL, "UsageLedgerRowWriter", 29, 41, "预编译 INSERT 的 usage_ledger 写入器。", ["database", "serialization", "session"], "simple"),
    sym("function", P_UL, "insertUsageLedgerRow", 43, 45, "一次性准备并插入单条 usage_ledger 行。", ["database", "session", "write"], "simple"),
    sym("function", P_UL, "decodeUsageLedgerRow", 47, 56, "把 usage_ledger 行解码为 UsageRow，解析 JSON 字段。", ["serialization", "data-model", "session"], "simple"),
    sym("function", P_UL, "scanUsageLedgerRows", 58, 67, "按序号范围与 limit 扫描 usage_ledger。", ["query", "database", "session"], "simple"),
    # values
    sym("function", P_VAL, "setScalarValueRow", 25, 36, "upsert 标量值行（session/namespace/key）。", ["database", "data-model", "session"], "simple"),
    sym("function", P_VAL, "deleteScalarValueRow", 38, 41, "删除指定地址的标量值行。", ["database", "session", "write"], "simple"),
    sym("function", P_VAL, "appendListValueRow", 43, 53, "向 list_values 追加一个带 seq 的元素。", ["database", "data-model", "session"], "simple"),
    sym("function", P_VAL, "deleteListValueRows", 55, 58, "删除指定地址的全部列表元素。", ["database", "session", "write"], "simple"),
    sym("function", P_VAL, "readScalarValueRow", 67, 77, "按地址读取并解码标量值。", ["query", "database", "session"], "simple"),
    sym("function", P_VAL, "readAllScalarValueRows", 79, 88, "按 seq 读取某 session 的全部标量值。", ["query", "database", "session"], "simple"),
    sym("function", P_VAL, "nextPrefixBoundary", 90, 102, "计算 key 前缀扫描的上界字符串（下一个 code point 边界）。", ["utility", "query", "encoding"], "simple"),
    sym("function", P_VAL, "scanScalarValueRows", 104, 115, "按 namespace/key 前缀扫描标量值。", ["query", "database", "session"], "simple"),
    sym("function", P_VAL, "listValueReadQuery", 117, 135, "构造列表读取的 SqlQuery，处理 offset/limit 与正反向。", ["query", "database", "session"], "simple"),
    sym("function", P_VAL, "readListValueRows", 137, 146, "执行列表读取查询并解码元素。", ["query", "database", "session"], "simple"),
    # sql
    sym("class", P_SQL, "SqlQuery", 6, 35, "保存 SQL 文本与参数，提供 exec/run/get/all/iterate 执行入口。", ["database", "query", "utility"], "simple"),
    sym("function", P_SQL, "sql", 38, 53, "SQL 标签模板：拼接文本、收集插值或嵌套 SqlQuery 片段。", ["database", "query", "utility"], "simple"),
    sym("function", P_SQL, "joinSqlFragments", 56, 66, "用分隔符拼接多个 SqlQuery 片段并合并参数。", ["database", "query", "utility"], "simple"),
    # storage
    sym("class", P_STOR, "SqliteStorage", 49, 211, "SQLite Storage：排队 applyCommit，读写条目/值/分支/usage，并在事务中推进 seq。", ["service", "session", "data-model"], "moderate"),
]

exported = [
    (P_IR, "resizeImage", "function"),
    (P_IR, "formatDimensionNote", "function"),
    (P_MIME, "detectSupportedImageMimeType", "function"),
    (P_MIME, "detectSupportedImageMimeTypeFromFile", "function"),
    (P_PHOTON, "loadPhoton", "function"),
    (P_TRI, "normalizeToolResultImages", "function"),
    (P_TM, "getToolPath", "function"),
    (P_TM, "getLatestVersion", "function"),
    (P_TM, "ensureTool", "function"),
    (P_IDX, "wrapNodeSqliteDatabase", "function"),
    (P_IDX, "createNodeSqliteFactory", "function"),
    (P_MIG, "applyInitialSchema", "function"),
    (P_REPO, "SqliteSessionRepo", "class"),
    (P_SESS, "SqliteOpenSession", "class"),
    (P_BE, "appendEntryToBranchIndex", "function"),
    (P_BE, "scanBranchEntries", "function"),
    (P_BE, "scanBranchEntryStructures", "function"),
    (P_ENT, "EntryRowWriter", "class"),
    (P_ENT, "insertEntryRow", "function"),
    (P_ENT, "decodeEntryRow", "function"),
    (P_ENT, "entryStructureFromRow", "function"),
    (P_ENT, "readEntryRows", "function"),
    (P_ENT, "readAllEntryRows", "function"),
    (P_ENT, "scanEntryRows", "function"),
    (P_SROW, "readSessionRow", "function"),
    (P_SROW, "readAllSessionRows", "function"),
    (P_SROW, "hasSessionRow", "function"),
    (P_SROW, "metadataFromSessionRow", "function"),
    (P_SROW, "insertSessionRow", "function"),
    (P_SROW, "deleteSessionRows", "function"),
    (P_SSEQ, "readNextSeq", "function"),
    (P_SSEQ, "advanceNextSeq", "function"),
    (P_SSTAT, "readSessionStats", "function"),
    (P_SSTAT, "incrementMessageCount", "function"),
    (P_SSTAT, "addUsageToSessionStats", "function"),
    (P_UL, "UsageLedgerRowWriter", "class"),
    (P_UL, "insertUsageLedgerRow", "function"),
    (P_UL, "decodeUsageLedgerRow", "function"),
    (P_UL, "scanUsageLedgerRows", "function"),
    (P_VAL, "setScalarValueRow", "function"),
    (P_VAL, "deleteScalarValueRow", "function"),
    (P_VAL, "appendListValueRow", "function"),
    (P_VAL, "deleteListValueRows", "function"),
    (P_VAL, "readScalarValueRow", "function"),
    (P_VAL, "readAllScalarValueRows", "function"),
    (P_VAL, "scanScalarValueRows", "function"),
    (P_VAL, "listValueReadQuery", "function"),
    (P_VAL, "readListValueRows", "function"),
    (P_SQL, "SqlQuery", "class"),
    (P_SQL, "sql", "function"),
    (P_SQL, "joinSqlFragments", "function"),
    (P_STOR, "SqliteStorage", "class"),
]

edges = []

# contains + exports
for n in nodes:
    if n["type"] in ("function", "class"):
        edges.append(edge(f"file:{n['filePath']}", n["id"], "contains", 1.0))

for path, name, kind in exported:
    edges.append(edge(f"file:{path}", f"{kind}:{path}:{name}", "exports", 0.8))

# imports 1:1
import_count = 0
for src, targets in batch_import.items():
    for tgt in targets:
        edges.append(edge(f"file:{src}", f"file:{tgt}", "imports", 0.7))
        import_count += 1

# depends_on worker
edges.append(edge(f"file:{P_IR}", f"file:{P_IRW}", "depends_on", 0.6))

# tested_by production -> bench
edges.append(edge(f"file:{P_REPO}", f"file:{P_SRB}", "tested_by", 0.5))
edges.append(edge(f"file:{P_IDX}", f"file:{P_SRB}", "tested_by", 0.5))
edges.append(edge(f"file:{P_STOR}", f"file:{P_STB}", "tested_by", 0.5))
edges.append(edge(f"file:{P_MIG}", f"file:{P_STB}", "tested_by", 0.5))

# calls
FN = lambda p, n: f"function:{p}:{n}"
CL = lambda p, n: f"class:{p}:{n}"

def calls(src, tgt):
    edges.append(edge(src, tgt, "calls", 0.8))

calls(FN(P_IR, "resizeImage"), FN(P_CORE, "resizeImageInProcess"))
calls(FN(P_TRI, "normalizeToolResultImages"), FN(P_IP, "processImage"))
calls(FN(P_TM, "getLatestVersion"), FN(P_HTTP, "fetchWithRetry"))
calls(FN(P_TM, "downloadFile"), FN(P_HTTP, "fetchWithRetry"))
calls(CL(P_IDX, "NodeSqliteDatabase"), FN(P_SQL, "sql"))

calls(FN(P_REPO, "readForkSourceEntries"), FN(P_BE, "scanBranchEntries"))
calls(FN(P_REPO, "createSqliteForkSnapshot"), FN(P_SROW, "metadataFromSessionRow"))
calls(FN(P_REPO, "createSqliteForkSnapshot"), FN(P_SROW, "readSessionRow"))
calls(FN(P_REPO, "createSqliteForkSnapshot"), FN(P_VAL, "readAllScalarValueRows"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_VAL, "setScalarValueRow"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SQL, "sql"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_MIG, "applyInitialSchema"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SROW, "hasSessionRow"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SROW, "insertSessionRow"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_AI, "uuidv7"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SROW, "metadataFromSessionRow"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SROW, "readSessionRow"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SROW, "readAllSessionRows"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_SROW, "deleteSessionRows"))
calls(CL(P_REPO, "SqliteSessionRepo"), FN(P_BE, "appendEntryToBranchIndex"))

for name in (
    "readBranchMembership",
    "readNewestCompactionBoundary",
    "copyBranchEntriesAfterSeqThroughParent",
    "createDivergentBranchForEntry",
    "readStopSeq",
    "branchScanPredicates",
    "scanEntrySegmentRows",
    "scanStructureSegmentRows",
):
    calls(FN(P_BE, name), FN(P_SQL, "sql"))
for name in ("readStopSeq", "scanEntrySegmentRows", "scanStructureSegmentRows"):
    calls(FN(P_BE, name), FN(P_SQL, "joinSqlFragments"))
calls(FN(P_BE, "scanBranchEntries"), FN(P_ENT, "decodeEntryRow"))

for name in ("readEntryRows", "readAllEntryRows", "scanEntryRows"):
    calls(FN(P_ENT, name), FN(P_SQL, "sql"))
for name in ("readEntryRows", "scanEntryRows"):
    calls(FN(P_ENT, name), FN(P_SQL, "joinSqlFragments"))

for name in ("readSessionRow", "readAllSessionRows", "hasSessionRow", "insertSessionRow", "deleteSessionRows"):
    calls(FN(P_SROW, name), FN(P_SQL, "sql"))

calls(FN(P_SSEQ, "readNextSeq"), FN(P_SQL, "sql"))
calls(FN(P_SSEQ, "advanceNextSeq"), FN(P_SQL, "sql"))

calls(FN(P_SSTAT, "readSessionStats"), FN(P_SROW, "readSessionRow"))
calls(FN(P_SSTAT, "incrementMessageCount"), FN(P_SQL, "sql"))
calls(FN(P_SSTAT, "addUsageToSessionStats"), FN(P_SQL, "sql"))

calls(FN(P_UL, "scanUsageLedgerRows"), FN(P_SQL, "sql"))
calls(FN(P_UL, "scanUsageLedgerRows"), FN(P_SQL, "joinSqlFragments"))

for name in (
    "setScalarValueRow",
    "deleteScalarValueRow",
    "appendListValueRow",
    "deleteListValueRows",
    "readScalarValueRow",
    "readAllScalarValueRows",
    "scanScalarValueRows",
    "listValueReadQuery",
):
    calls(FN(P_VAL, name), FN(P_SQL, "sql"))

stor = CL(P_STOR, "SqliteStorage")
for tgt in (
    FN(P_ENT, "readEntryRows"),
    FN(P_ENT, "decodeEntryRow"),
    FN(P_VAL, "readScalarValueRow"),
    FN(P_VAL, "scanScalarValueRows"),
    FN(P_VAL, "readListValueRows"),
    FN(P_BE, "scanBranchEntries"),
    FN(P_BE, "scanBranchEntryStructures"),
    FN(P_ENT, "scanEntryRows"),
    FN(P_UL, "scanUsageLedgerRows"),
    FN(P_SSTAT, "readSessionStats"),
    FN(P_VAL, "readAllScalarValueRows"),
    FN(P_ENT, "readAllEntryRows"),
    FN(P_SSEQ, "readNextSeq"),
    FN(P_BE, "appendEntryToBranchIndex"),
    FN(P_SSTAT, "incrementMessageCount"),
    FN(P_SSTAT, "addUsageToSessionStats"),
    FN(P_VAL, "deleteScalarValueRow"),
    FN(P_VAL, "setScalarValueRow"),
    FN(P_VAL, "deleteListValueRows"),
    FN(P_VAL, "appendListValueRow"),
    FN(P_SSEQ, "advanceNextSeq"),
):
    calls(stor, tgt)

# sanity
ids = [n["id"] for n in nodes]
assert len(ids) == len(set(ids)), "duplicate node ids"
assert import_count == sum(len(v) for v in batch_import.values()), (import_count, sum(len(v) for v in batch_import.values()))

# required fields
for n in nodes:
    assert n["summary"] and n["tags"] and n["complexity"]
    assert 3 <= len(n["tags"]) <= 5, (n["id"], n["tags"])
    assert n["type"] in {
        "file", "function", "class", "config", "document", "service",
        "table", "endpoint", "pipeline", "schema", "resource",
    }
    if n["type"] in ("function", "class"):
        assert "lineRange" in n
    else:
        assert "filePath" in n

# partition
file_paths = sorted({n["filePath"] for n in nodes if n.get("filePath")})
node_count = len(nodes)
edge_count = len(edges)
parts_n = max(1, -(-node_count // 60), -(-edge_count // 120))  # ceil
if node_count <= 60 and edge_count <= 120:
    parts_n = 1


def split_files(n_parts):
    size = -(-len(file_paths) // n_parts)
    return [file_paths[i : i + size] for i in range(0, len(file_paths), size)]


def part_edge_counts(groups):
    counts = []
    for files in groups:
        file_set = set(files)
        part_ids = {n["id"] for n in nodes if n.get("filePath") in file_set}
        counts.append(sum(1 for e in edges if e["source"] in part_ids))
    return counts


while True:
    groups = split_files(parts_n)
    node_counts = [sum(1 for n in nodes if n.get("filePath") in set(g)) for g in groups]
    e_counts = part_edge_counts(groups)
    if all(c <= 60 for c in node_counts) and all(c <= 120 for c in e_counts):
        break
    parts_n += 1
    if parts_n > len(file_paths):
        raise SystemExit(f"cannot split under limits: nodes={node_counts} edges={e_counts}")

part_files = groups
print(f"nodes={node_count} edges={edge_count} imports={import_count} parts={parts_n}")
print(f"files={len(file_paths)} per-part-nodes={node_counts} per-part-edges={e_counts}")
assert sum(len(p) for p in part_files) == len(file_paths)

# neighbor symbols
neighbor_symbols = set()
neighbor_paths = set(neighbor_map.keys())
import_paths = set(batch_import.keys())
for src, tgts in batch_import.items():
    import_paths.update(tgts)
for _path, neighs in neighbor_map.items():
    for neigh in neighs:
        neighbor_paths.add(neigh["path"])
        for s in neigh.get("symbols") or []:
            neighbor_symbols.add((neigh["path"], s))

# all batch function/class ids for intra-batch cross-part
batch_symbol_ids = {n["id"] for n in nodes if n["type"] in ("function", "class")}
batch_file_ids = {n["id"] for n in nodes if n["type"] == "file"}

out_dir = UA / "intermediate"
# remove stale parts
for old in out_dir.glob("batch-19*.json"):
    if old.name.startswith("batch-19"):
        old.unlink()

total_written_nodes = 0
total_written_edges = 0
for i, files in enumerate(part_files, 1):
    file_set = set(files)
    part_nodes = [n for n in nodes if n.get("filePath") in file_set]
    part_ids = {n["id"] for n in part_nodes}
    part_edges = [e for e in edges if e["source"] in part_ids]
    # validate
    failures = []
    for e in part_edges:
        for end in (e["source"], e["target"]):
            if end in part_ids:
                continue
            if end.startswith("file:"):
                p = end[len("file:") :]
                if p in neighbor_paths or p in import_paths:
                    continue
                if end in batch_file_ids:
                    continue
                failures.append((e, end, "unresolved-file"))
                continue
            if end.startswith("function:") or end.startswith("class:"):
                kind, rest = end.split(":", 1)
                # function:path:name — path may contain colons? not here
                # split from the right for name
                path, name = rest.rsplit(":", 1)
                if (path, name) in neighbor_symbols:
                    continue
                if end in batch_symbol_ids:
                    continue
                failures.append((e, end, "unresolved-symbol"))
                continue
            failures.append((e, end, "unknown"))
    if failures:
        print("VALIDATION FAIL part", i)
        for f in failures[:20]:
            print(" ", f)
        raise SystemExit(1)
    payload = {"nodes": part_nodes, "edges": part_edges}
    if parts_n == 1:
        dest = out_dir / "batch-19.json"
    else:
        dest = out_dir / f"batch-19-part-{i}.json"
    dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    total_written_nodes += len(part_nodes)
    total_written_edges += len(part_edges)
    print(f"wrote {dest.name} nodes={len(part_nodes)} edges={len(part_edges)} files={len(files)}")

print("TOTAL", total_written_nodes, total_written_edges)
assert total_written_nodes == node_count
assert total_written_edges == edge_count
