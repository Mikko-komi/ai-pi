import { readFileSync, writeFileSync } from "node:fs";

const brief = JSON.parse(
	readFileSync("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua/intermediate/batch-briefs/batch-16.json", "utf8"),
);

const F = (path, name) => `function:${path}:${name}`;
const C = (path, name) => `class:${path}:${name}`;
const File = (path) => `file:${path}`;

const P = {
	testing: "packages/agent/src/harness/session/testing/index.ts",
	agentIndex: "packages/agent/src/index.ts",
	fileProc: "packages/coding-agent/src/cli/file-processor.ts",
	branch: "packages/coding-agent/src/core/compaction/branch-summarization.ts",
	comp: "packages/coding-agent/src/core/compaction/compaction.ts",
	cutils: "packages/coding-agent/src/core/compaction/utils.ts",
	bash: "packages/coding-agent/src/core/tools/bash.ts",
	editDiff: "packages/coding-agent/src/core/tools/edit-diff.ts",
	edit: "packages/coding-agent/src/core/tools/edit.ts",
	queue: "packages/coding-agent/src/core/tools/file-mutation-queue.ts",
	find: "packages/coding-agent/src/core/tools/find.ts",
	grep: "packages/coding-agent/src/core/tools/grep.ts",
	toolsIdx: "packages/coding-agent/src/core/tools/index.ts",
	ls: "packages/coding-agent/src/core/tools/ls.ts",
	outAcc: "packages/coding-agent/src/core/tools/output-accumulator.ts",
	pathUtils: "packages/coding-agent/src/core/tools/path-utils.ts",
	ps: "packages/coding-agent/src/core/tools/powershell.ts",
	read: "packages/coding-agent/src/core/tools/read.ts",
	wrap: "packages/coding-agent/src/core/tools/tool-definition-wrapper.ts",
	trunc: "packages/coding-agent/src/core/tools/truncate.ts",
	write: "packages/coding-agent/src/core/tools/write.ts",
	exif: "packages/coding-agent/src/utils/exif-orientation.ts",
	imgConv: "packages/coding-agent/src/utils/image-convert.ts",
	imgProc: "packages/coding-agent/src/utils/image-process.ts",
	imgResize: "packages/coding-agent/src/utils/image-resize-core.ts",
};

function padTags(path, tags) {
	const extras = [];
	if (path.includes("/compaction/")) extras.push("compaction", "session");
	if (path.includes("/tools/")) extras.push("tool", "coding-agent");
	if (path.includes("/utils/")) extras.push("utility", "image");
	if (path.includes("/cli/")) extras.push("cli", "coding-agent");
	if (path.includes("packages/agent/")) extras.push("agent", "barrel");
	const out = [...tags];
	for (const t of extras) {
		if (out.length >= 3) break;
		if (!out.includes(t)) out.push(t);
	}
	while (out.length < 3) out.push("typescript");
	return out.slice(0, 5);
}
function fileNode(path, name, summary, tags, complexity, languageNotes) {
	const n = { id: File(path), type: "file", name, filePath: path, summary, tags: padTags(path, tags), complexity };
	if (languageNotes) n.languageNotes = languageNotes;
	return n;
}
function fnNode(path, name, lineRange, summary, tags, complexity) {
	return { id: F(path, name), type: "function", name, filePath: path, lineRange, summary, tags: padTags(path, tags), complexity };
}
function classNode(path, name, lineRange, summary, tags, complexity) {
	return { id: C(path, name), type: "class", name, filePath: path, lineRange, summary, tags: padTags(path, tags), complexity };
}

const nodes = [
	fileNode(
		P.testing,
		"index.ts",
		"@pi/agent 会话测试入口：再导出 storage/session-repo 基准数据集、一致性套件以及 GatingStorage、InstrumentedStorage 等装饰器。",
		["entry-point", "barrel", "test", "session"],
		"simple",
		"纯 TypeScript barrel，仅做 named re-export，无本地实现。",
	),
	fileNode(
		P.agentIndex,
		"index.ts",
		"@pi/agent 公共 API 入口：再导出 telemetry、compaction、harness、session、工具类型与 ExecutionEnv/FileSystem 等核心契约。",
		["entry-point", "barrel", "api"],
		"moderate",
		"大量 export * / export type，把 harness 与 compaction 表面汇成单一包入口。",
	),
	fileNode(
		P.fileProc,
		"file-processor.ts",
		"把 CLI 的 @file 参数解析成文本内容与图像附件：解析路径、识别图片 MIME、可选缩放，并对文本去 BOM。",
		["cli", "file-processing", "image"],
		"moderate",
	),
	fnNode(
		P.fileProc,
		"processFileArguments",
		[25, 88],
		"遍历 @file 参数：解析可读路径，图片走 processImage，文本去 BOM 后拼接；失败则 chalk 报错并 process.exit。",
		["cli", "file-processing", "entry-point"],
		"moderate",
	),

	fileNode(
		P.branch,
		"branch-summarization.ts",
		"会话树切分支时收集被离开路径上的条目，按 token 预算裁剪后调用 LLM 生成分支摘要，并附带读写文件清单。",
		["compaction", "summarization", "session"],
		"complex",
	),
	fnNode(
		P.branch,
		"collectEntriesForBranchSummary",
		[108, 146],
		"从 oldLeaf 回溯到与 target 的共同祖先，收集需摘要的 SessionEntry（含 compaction 边界）。",
		["session", "traversal", "compaction"],
		"moderate",
	),
	fnNode(
		P.branch,
		"getMessageFromEntry",
		[156, 180],
		"把 SessionEntry 转成可摘要的 AgentMessage：custom/branch_summary/compaction 走专用构造，其余取 message 字段。",
		["session", "message", "adapter"],
		"simple",
	),
	fnNode(
		P.branch,
		"prepareBranchEntries",
		[195, 247],
		"从条目抽出消息与文件操作，按 token 预算从尾部保留最近上下文，得到 BranchPreparation。",
		["compaction", "token-budget", "preparation"],
		"moderate",
	),
	fnNode(
		P.branch,
		"generateBranchSummary",
		[293, 382],
		"序列化分支对话并调用 completeSummarization 生成摘要，校验失败/工具调用后附加文件操作列表。",
		["summarization", "llm", "compaction"],
		"complex",
	),

	fileNode(
		P.comp,
		"compaction.ts",
		"长会话上下文压缩：估算 token、寻找安全切点、准备待摘要消息，再经 LLM 生成/更新摘要并处理拆分 turn。",
		["compaction", "summarization", "token-budget"],
		"complex",
		"纯函数模块：I/O 交给 SessionManager，压缩后会话需重新加载。",
	),
	fnNode(P.comp, "extractFileOperations", [42, 70], "从先前 compaction.details 与当前消息的工具调用中合并读写/编辑文件集合。", ["file-ops", "compaction"], "simple"),
	fnNode(P.comp, "combineUsage", [99, 120], "把两次 LLM Usage（含 cache/reasoning/cost）按字段相加，供拆分 turn 双摘要合并。", ["usage", "aggregation"], "simple"),
	fnNode(P.comp, "calculateContextTokens", [146, 148], "由 Usage 计算上下文 token：input + cacheRead + cacheWrite。", ["token-budget", "utility"], "simple"),
	fnNode(P.comp, "getAssistantUsage", [154, 167], "从 assistant 消息提取 usage，缺省时回退 calculateContextTokens。", ["usage", "message"], "simple"),
	fnNode(P.comp, "getLastAssistantUsage", [172, 181], "从会话条目中取最近一条 assistant 的 usage，供压缩阈值判断。", ["usage", "session"], "simple"),
	fnNode(P.comp, "estimateContextTokens", [202, 230], "优先用真实 usage，否则按消息启发式估算上下文 token 与来源。", ["token-budget", "estimation"], "simple"),
	fnNode(P.comp, "shouldCompact", [235, 238], "比较 contextTokens 与窗口减去 reserveTokens，决定是否触发压缩。", ["compaction", "threshold"], "simple"),
	fnNode(P.comp, "estimateTextAndImageContentChars", [246, 260], "累计文本块字符与图像占位字符，供启发式 token 估算。", ["estimation", "content"], "simple"),
	fnNode(P.comp, "estimateTokens", [266, 306], "按角色估算单条消息 token：文本/图像、tool 参数 JSON 与结果文本分别换算。", ["token-budget", "estimation"], "moderate"),
	fnNode(P.comp, "isCutPointMessage", [308, 321], "判断消息是否可作为压缩切点（用户/自定义边界消息）。", ["compaction", "cut-point"], "simple"),
	fnNode(P.comp, "isTurnStartMessage", [323, 336], "判断消息是否为一轮对话起点，避免在 turn 中间误切。", ["compaction", "turn"], "simple"),
	fnNode(P.comp, "findValidCutPoints", [351, 363], "在条目区间内扫描可安全切断的索引列表。", ["compaction", "cut-point"], "simple"),
	fnNode(P.comp, "findTurnStartIndex", [369, 376], "从给定条目向前找到所属 turn 的起始索引。", ["compaction", "turn"], "simple"),
	fnNode(
		P.comp,
		"findCutPoint",
		[403, 461],
		"在 keepRecentTokens 约束下选择 firstKept 与可选拆分 turn 的 cut point，保证切在合法边界。",
		["compaction", "cut-point", "token-budget"],
		"moderate",
	),
	fnNode(P.comp, "getSummarizationFailure", [545, 553], "把 summarization 的 error/length stopReason 转成不可落盘的失败说明。", ["error-handling", "summarization"], "simple"),
	fnNode(P.comp, "createSummarizationOptions", [555, 570], "组装 SimpleStreamOptions，并在模型支持时附上 reasoning/thinkingLevel。", ["llm", "options"], "simple"),
	fnNode(
		P.comp,
		"completeSummarization",
		[579, 599],
		"压缩/分支摘要的统一 LLM 出口：禁用 cache、分配 sessionId，并用 retryAssistantCall 包裹 stream/completeSimple。",
		["llm", "retry", "summarization"],
		"simple",
	),
	fnNode(P.comp, "generateSummary", [605, 639], "generateSummaryWithUsage 的薄封装，只返回摘要文本。", ["summarization", "llm"], "moderate"),
	fnNode(P.comp, "buildSummarizationContext", [642, 653], "用系统提示与用户 prompt 构造一次性 Context。", ["summarization", "context"], "simple"),
	fnNode(
		P.comp,
		"generateSummaryWithUsage",
		[656, 726],
		"序列化对话（可合并 previousSummary），调用 LLM 生成摘要并返回 usage；拒绝不完整或带 toolCall 的响应。",
		["summarization", "llm", "usage"],
		"complex",
	),
	fnNode(
		P.comp,
		"prepareCompaction",
		[750, 829],
		"定位上次 compaction 边界、估算 token、找 cut point，拆出待摘要消息/turn 前缀与文件操作。",
		["compaction", "preparation", "session"],
		"complex",
	),
	fnNode(
		P.comp,
		"compact",
		[858, 964],
		"按 preparation 生成历史摘要，必要时再摘要拆分 turn 前缀，合并 usage 并附加文件清单后返回 CompactionResult。",
		["compaction", "summarization", "llm"],
		"complex",
	),
	fnNode(P.comp, "generateTurnPrefixSummary", [969, 1012], "对过大 turn 被切掉的前缀单独做 LLM 摘要，供 suffix 保留上下文。", ["summarization", "turn", "llm"], "moderate"),

	fileNode(
		P.cutils,
		"utils.ts",
		"压缩/分支摘要的共享工具：从消息提取文件操作、格式化文件列表，以及把对话序列化成可送入摘要 prompt 的文本。",
		["utility", "compaction", "serialization"],
		"moderate",
	),
	fnNode(P.cutils, "createFileOps", [18, 24], "创建空的 read/written/edited 文件路径集合。", ["factory", "file-ops"], "simple"),
	fnNode(P.cutils, "extractFileOpsFromMessage", [29, 56], "扫描消息中的 read/write/edit 工具调用，把路径写入 FileOperations。", ["file-ops", "tool-call"], "simple"),
	fnNode(P.cutils, "computeFileLists", [62, 67], "从 FileOperations 算出只读文件与已修改文件的排序列表。", ["file-ops", "aggregation"], "simple"),
	fnNode(P.cutils, "formatFileOperations", [72, 82], "把读写文件列表格式化为可追加到摘要末尾的 Markdown 段落。", ["formatting", "summarization"], "simple"),
	fnNode(
		P.cutils,
		"serializeConversation",
		[109, 150],
		"把 LLM 消息展平为带角色标签的文本，截断过长结果，避免模型把摘要当成对话续写。",
		["serialization", "summarization"],
		"moderate",
	),

	fileNode(
		P.bash,
		"bash.ts",
		"定义 bash/通用 shell 工具：本地 spawn、超时与 abort、流式输出节流，以及可注入的 spawnHook/自定义 operations。",
		["tool", "shell", "factory"],
		"complex",
	),
	fnNode(P.bash, "resolveTimeoutMs", [24, 35], "把 timeout 规范成有限毫秒数，非法值回退默认超时。", ["validation", "timeout"], "simple"),
	fnNode(
		P.bash,
		"createLocalShellOperations",
		[79, 145],
		"创建本地 shell operations：检查可执行文件、spawn、跟踪分离进程，并在 abort/超时时装杀进程树。",
		["shell", "process", "factory"],
		"moderate",
	),
	fnNode(P.bash, "createLocalBashOperations", [153, 155], "用 getShellConfig 包装 createLocalShellOperations，得到 bash operations。", ["factory", "shell"], "simple"),
	fnNode(P.bash, "resolveSpawnContext", [165, 191], "解析 cwd/env/session 路径，并调用可选 spawnHook 改写命令与环境。", ["shell", "hook", "session"], "simple"),
	fnNode(
		P.bash,
		"createShellToolDefinition",
		[222, 373],
		"构建通用 shell ToolDefinition：执行命令、用 OutputAccumulator 累积输出、节流 onUpdate，并处理超时/截断细节。",
		["tool", "shell", "factory"],
		"complex",
	),
	fnNode(P.bash, "createBashToolDefinition", [385, 390], "用 bash 配置调用 createShellToolDefinition。", ["factory", "tool"], "simple"),
	fnNode(P.bash, "createBashTool", [392, 400], "把 bash ToolDefinition wrap 成 AgentTool，并拷贝 prompt snippet/guidelines。", ["factory", "tool"], "simple"),

	fileNode(
		P.editDiff,
		"edit-diff.ts",
		"实现精确/模糊文本替换、换行保持，以及预览用 unified diff 生成（含多 edit 批量应用）。",
		["diff", "editing", "fuzzy-match"],
		"complex",
	),
	fnNode(P.editDiff, "detectLineEnding", [11, 17], "检测内容主要换行风格（CRLF/LF）。", ["text", "line-ending"], "simple"),
	fnNode(P.editDiff, "normalizeToLF", [19, 21], "把 CRLF/CR 规范成 LF，便于匹配与替换。", ["text", "normalization"], "simple"),
	fnNode(P.editDiff, "restoreLineEndings", [23, 25], "把 LF 文本恢复为原始换行风格。", ["text", "line-ending"], "simple"),
	fnNode(P.editDiff, "normalizeForFuzzyMatch", [34, 55], "NFKC、去行尾空白、智能引号/破折号/特殊空格归一，供模糊查找。", ["fuzzy-match", "normalization"], "simple"),
	fnNode(P.editDiff, "getReplacementLineRange", [84, 109], "根据 replacement 偏移计算覆盖的原始行区间。", ["diff", "line-range"], "simple"),
	fnNode(P.editDiff, "applyReplacements", [111, 120], "按偏移把多段 replacement 拼回字符串。", ["editing", "replacement"], "simple"),
	fnNode(
		P.editDiff,
		"applyReplacementsPreservingUnchangedLines",
		[132, 173],
		"按行分组应用替换，未改动行沿用原始内容与换行，避免无关 diff。",
		["editing", "diff", "line-ending"],
		"moderate",
	),
	fnNode(P.editDiff, "fuzzyFindText", [207, 245], "先精确 indexOf，失败则在归一化文本上模糊定位 oldText。", ["fuzzy-match", "search"], "moderate"),
	fnNode(P.editDiff, "getNotFoundError", [253, 262], "构造 oldText 未找到时的多 edit 友好错误。", ["error-handling", "editing"], "simple"),
	fnNode(P.editDiff, "getDuplicateError", [264, 273], "构造 oldText 出现多次、无法唯一定位时的错误。", ["error-handling", "editing"], "simple"),
	fnNode(
		P.editDiff,
		"applyEditsToNormalizedContent",
		[300, 362],
		"在已规范化内容上依次精确/模糊应用 edits，处理空 oldText、重复匹配与无变化。",
		["editing", "fuzzy-match"],
		"moderate",
	),
	fnNode(P.editDiff, "generateUnifiedPatch", [365, 370], "对路径上的新旧内容生成 unified patch 字符串。", ["diff", "patch"], "simple"),
	fnNode(
		P.editDiff,
		"generateDiffString",
		[376, 499],
		"行级 LCS 风格 diff：收集 hunk、保留上下文行，并记录首个变更行号。",
		["diff", "algorithm"],
		"complex",
	),
	fnNode(
		P.editDiff,
		"computeEditsDiff",
		[514, 543],
		"只读预览：读文件、去 BOM、应用 edits 后生成 diff，供 TUI 在真正写入前展示。",
		["diff", "preview", "editing"],
		"moderate",
	),
	fnNode(P.editDiff, "computeEditDiff", [549, 556], "单条 edit 的 computeEditsDiff 便捷封装。", ["diff", "preview"], "simple"),

	fileNode(
		P.edit,
		"edit.ts",
		"edit 工具：解析单条/批量 edits，在文件变更队列中读改写，并返回 unified diff 详情。",
		["tool", "editing", "factory"],
		"moderate",
	),
	fnNode(P.edit, "prepareEditArguments", [103, 134], "把模型输入规范成 Edit 数组，兼容单对象、JSON 字符串与数组。", ["validation", "editing"], "moderate"),
	fnNode(
		P.edit,
		"createEditToolDefinition",
		[143, 216],
		"定义 edit 工具：校验输入、队列内读文件、应用规范化 edits、写回并生成 diff。",
		["tool", "editing", "factory"],
		"complex",
	),
	fnNode(P.edit, "createEditTool", [218, 220], "wrap createEditToolDefinition 为可执行 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.queue,
		"file-mutation-queue.ts",
		"按规范化文件路径串行化并发写/改，避免同一文件上的 edit/write 交错损坏。",
		["concurrency", "queue", "file-io"],
		"moderate",
	),
	fnNode(P.queue, "getMutationQueueKey", [16, 26], "resolve/realpath 得到队列键；新建文件在缺失路径时回退 resolve。", ["path", "concurrency"], "simple"),
	fnNode(
		P.queue,
		"withFileMutationQueue",
		[32, 61],
		"在每路径 Promise 链上排队执行 fn，完成后释放队列项。",
		["concurrency", "queue", "file-io"],
		"moderate",
	),

	fileNode(
		P.find,
		"find.ts",
		"find 工具：优先自定义 glob，否则下载/调用 fd，相对化结果并截断输出。",
		["tool", "search", "factory"],
		"complex",
	),
	fnNode(P.find, "relativizeFindResultPath", [14, 24], "把匹配路径相对 search root 并统一为 posix 分隔符。", ["path", "normalization"], "simple"),
	fnNode(
		P.find,
		"createFindToolDefinition",
		[70, 314],
		"实现 find：abort 安全、自定义 glob 或 fd（gitignore/full-path/Windows 分隔符），并报告数量/字节截断。",
		["tool", "search", "factory"],
		"complex",
	),
	fnNode(P.find, "createFindTool", [316, 318], "wrap find ToolDefinition 为 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.grep,
		"grep.ts",
		"grep 工具：确保 ripgrep 可用，流式解析 JSON 匹配，支持上下文行、大小写/字面量/glob，并截断行与匹配数。",
		["tool", "search", "factory"],
		"complex",
	),
	fnNode(
		P.grep,
		"createGrepToolDefinition",
		[70, 319],
		"实现 grep：spawn rg --json，达 limit 后杀进程，格式化匹配块并附 match/byte/line 截断说明。",
		["tool", "search", "ripgrep"],
		"complex",
	),
	fnNode(P.grep, "createGrepTool", [321, 323], "wrap grep ToolDefinition 为 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.toolsIdx,
		"index.ts",
		"coding-agent 内置工具桶：再导出各工具类型/工厂，并按 coding/read-only/all 组合定义或 AgentTool。",
		["barrel", "factory", "tool"],
		"moderate",
	),
	fnNode(P.toolsIdx, "createToolDefinition", [118, 139], "按 ToolName 分发到对应 createXToolDefinition。", ["factory", "dispatch"], "simple"),
	fnNode(P.toolsIdx, "createTool", [141, 162], "按 ToolName 分发到对应 createXTool。", ["factory", "dispatch"], "simple"),
	fnNode(P.toolsIdx, "createCodingToolDefinitions", [164, 171], "返回 read/bash/edit/write 的 ToolDefinition 列表。", ["factory", "tool"], "simple"),
	fnNode(P.toolsIdx, "createReadOnlyToolDefinitions", [173, 180], "返回 read/grep/find/ls 的只读 ToolDefinition 列表。", ["factory", "tool"], "simple"),
	fnNode(P.toolsIdx, "createAllToolDefinitions", [182, 193], "返回全部 ToolName 到 ToolDefinition 的记录。", ["factory", "tool"], "simple"),
	fnNode(P.toolsIdx, "createCodingTools", [195, 202], "返回 read/bash/edit/write 的 AgentTool 列表。", ["factory", "tool"], "simple"),
	fnNode(P.toolsIdx, "createReadOnlyTools", [204, 211], "返回 read/grep/find/ls 的只读 AgentTool 列表。", ["factory", "tool"], "simple"),
	fnNode(P.toolsIdx, "createAllTools", [213, 224], "返回全部内置 AgentTool 的记录。", ["factory", "tool"], "simple"),

	fileNode(
		P.ls,
		"ls.ts",
		"ls 工具：列出目录条目（目录加 /），按 limit 与字节上限截断并给出续读提示。",
		["tool", "filesystem", "factory"],
		"moderate",
	),
	fnNode(
		P.ls,
		"createLsToolDefinition",
		[54, 171],
		"实现 ls：校验目录、不区分大小写排序、stat 标注目录，并报告条目/字节截断。",
		["tool", "filesystem", "factory"],
		"complex",
	),
	fnNode(P.ls, "createLsTool", [173, 175], "wrap ls ToolDefinition 为 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.outAcc,
		"output-accumulator.ts",
		"流式输出累加器：解码 UTF-8、只保留滚动 tail 供快照，超限时落临时文件并报告截断。",
		["streaming", "buffering", "truncation"],
		"moderate",
		"用流式 TextDecoder 与按字节裁 tail，避免超大命令输出撑爆内存。",
	),
	classNode(
		P.outAcc,
		"OutputAccumulator",
		[35, 222],
		"有界内存的输出收集器：append/finish/snapshot，超限写临时文件，snapshot 用 truncateTail。",
		["streaming", "buffering", "class"],
		"complex",
	),
	fnNode(P.outAcc, "append", [64, 78], "追加原始 Buffer：流式解码并按需写入临时文件或内存 chunk。", ["streaming", "buffering"], "simple"),
	fnNode(P.outAcc, "finish", [80, 89], "结束累加：冲刷 decoder，必要时打开临时文件。", ["streaming"], "simple"),
	fnNode(P.outAcc, "snapshot", [91, 119], "对 tail 做 truncateTail，汇总行/字节截断，可选在截断时持久化全文。", ["snapshot", "truncation"], "moderate"),
	fnNode(P.outAcc, "closeTempFile", [121, 142], "结束并等待临时文件 WriteStream finish。", ["file-io", "async"], "simple"),
	fnNode(P.outAcc, "appendDecodedText", [148, 177], "更新 decoded 统计与行计数，tail 过大时 trim。", ["streaming", "text"], "moderate"),
	fnNode(P.outAcc, "trimTail", [179, 194], "按 UTF-8 边界把 tail 裁到 maxRollingBytes。", ["buffering", "utf8"], "simple"),
	fnNode(P.outAcc, "ensureTempFile", [211, 221], "首次需要时创建临时日志并把已缓存 rawChunks 刷盘。", ["file-io", "streaming"], "simple"),

	fileNode(
		P.pathUtils,
		"path-utils.ts",
		"工具层路径解析：相对 cwd 展开，并兼容 macOS 截图名、NFD 与花引号等真实路径变体。",
		["path", "utility", "filesystem"],
		"moderate",
	),
	fnNode(P.pathUtils, "pathExists", [31, 38], "异步 access 判断路径是否存在。", ["filesystem", "utility"], "simple"),
	fnNode(P.pathUtils, "expandPath", [40, 42], "用 normalizePath 展开 ~ 等用户路径。", ["path", "normalization"], "simple"),
	fnNode(P.pathUtils, "resolveToCwd", [48, 50], "把用户路径相对给定 cwd 解析为绝对路径。", ["path", "cwd"], "simple"),
	fnNode(
		P.pathUtils,
		"resolveReadPath",
		[52, 84],
		"同步解析可读路径：依次尝试原路径、macOS 截图、NFD 与花引号变体。",
		["path", "filesystem", "compatibility"],
		"moderate",
	),
	fnNode(
		P.pathUtils,
		"resolveReadPathAsync",
		[86, 118],
		"resolveReadPath 的异步版本，用 pathExists 探测变体。",
		["path", "filesystem", "compatibility"],
		"moderate",
	),

	fileNode(
		P.ps,
		"powershell.ts",
		"在通用 shell 工具上套 PowerShell 配置与 prompt，复用 bash 的 spawn/输出管线。",
		["tool", "shell", "powershell"],
		"moderate",
	),
	fnNode(P.ps, "createLocalPowerShellOperations", [32, 37], "用 PowerShell shell config 创建本地 operations。", ["factory", "powershell"], "simple"),
	fnNode(P.ps, "createPowerShellToolDefinition", [49, 57], "用 PowerShell 配置调用 createShellToolDefinition。", ["factory", "tool"], "simple"),
	fnNode(P.ps, "createPowerShellTool", [59, 67], "wrap PowerShell ToolDefinition 为 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.read,
		"read.ts",
		"read 工具：异步解析路径，文本按 offset/limit/字节截断；图片走 processImage，非视觉模型附加说明。",
		["tool", "filesystem", "image"],
		"moderate",
	),
	fnNode(
		P.read,
		"createReadToolDefinition",
		[64, 193],
		"实现 read：图片处理或文本分页截断，并给出续读/超大行的 bash 回退提示。",
		["tool", "filesystem", "factory"],
		"complex",
	),
	fnNode(P.read, "createReadTool", [195, 197], "wrap read ToolDefinition 为 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.wrap,
		"tool-definition-wrapper.ts",
		"把 ToolDefinition 与可选 ctxFactory 包成 AgentTool，或从已有 AgentTool 反构定义。",
		["adapter", "tool", "wrapper"],
		"simple",
	),
	fnNode(P.wrap, "wrapToolDefinition", [5, 20], "用 ctxFactory 注入执行上下文后调用 definition.execute。", ["adapter", "wrapper"], "simple"),
	fnNode(P.wrap, "wrapToolDefinitions", [23, 28], "批量 wrap 一组 ToolDefinition。", ["adapter", "factory"], "simple"),
	fnNode(P.wrap, "createToolDefinitionFromAgentTool", [36, 47], "从 AgentTool 还原 ToolDefinition（execute 直接转发）。", ["adapter", "tool"], "simple"),

	fileNode(
		P.trunc,
		"truncate.ts",
		"按行数与字节上限截断工具输出：truncateHead/Tail、单行截断与人类可读 formatSize。",
		["truncation", "utility", "output"],
		"moderate",
	),
	fnNode(P.trunc, "splitLinesForCounting", [47, 56], "按换行拆行并去掉末尾空行，供行数统计。", ["text", "utility"], "simple"),
	fnNode(P.trunc, "formatSize", [61, 69], "把字节数格式化为 B/KB/MB。", ["formatting", "utility"], "simple"),
	fnNode(
		P.trunc,
		"truncateHead",
		[78, 160],
		"从开头保留内容直到行或字节上限，标记 truncatedBy 与 firstLineExceedsLimit。",
		["truncation", "output"],
		"complex",
	),
	fnNode(
		P.trunc,
		"truncateTail",
		[168, 241],
		"从末尾保留最近输出，超字节时按 UTF-8 边界裁剪。",
		["truncation", "output"],
		"complex",
	),
	fnNode(P.trunc, "truncateStringToBytesFromEnd", [247, 262], "从字符串末尾截到 maxBytes，避开 UTF-8 续字节。", ["truncation", "utf8"], "simple"),
	fnNode(P.trunc, "truncateLine", [268, 276], "把单行截到 maxChars（grep 默认 GREP_MAX_LINE_LENGTH）。", ["truncation", "text"], "simple"),

	fileNode(
		P.write,
		"write.ts",
		"write 工具：在变更队列中 mkdir 后写入完整文件内容。",
		["tool", "filesystem", "factory"],
		"moderate",
	),
	fnNode(
		P.write,
		"createWriteToolDefinition",
		[44, 93],
		"定义 write：解析路径、队列内创建父目录并写入，支持 abort。",
		["tool", "filesystem", "factory"],
		"moderate",
	),
	fnNode(P.write, "createWriteTool", [95, 97], "wrap write ToolDefinition 为 AgentTool。", ["factory", "tool"], "simple"),

	fileNode(
		P.exif,
		"exif-orientation.ts",
		"从 JPEG/WebP EXIF 读取 Orientation，并用 Photon 做翻转/旋转以纠正显示方向。",
		["image", "exif", "orientation"],
		"moderate",
	),
	fnNode(P.exif, "readOrientationFromTiff", [5, 37], "解析 TIFF IFD 中的 Orientation tag（大小端）。", ["exif", "binary"], "moderate"),
	fnNode(P.exif, "findJpegTiffOffset", [39, 62], "在 JPEG APP1/EXIF 段中定位 TIFF 头偏移。", ["exif", "jpeg"], "simple"),
	fnNode(P.exif, "findWebpTiffOffset", [64, 84], "在 WebP EXIF chunk 中定位 TIFF 头。", ["exif", "webp"], "simple"),
	fnNode(P.exif, "hasExifHeader", [86, 95], "检查给定偏移是否为 Exif\\0\\0 头。", ["exif", "validation"], "simple"),
	fnNode(P.exif, "getExifOrientation", [97, 121], "按 JPEG/WebP 容器找到 TIFF 并读取 Orientation。", ["exif", "orientation"], "simple"),
	fnNode(P.exif, "rotate90", [125, 143], "用 Photon 原始像素做 90° 旋转。", ["image", "transform"], "simple"),
	fnNode(
		P.exif,
		"applyExifOrientation",
		[146, 182],
		"按 Orientation 1–8 组合 fliph/flipv/rotate90，使像素与显示方向一致。",
		["image", "exif", "transform"],
		"moderate",
	),

	fileNode(
		P.imgConv,
		"image-convert.ts",
		"用 Photon 把任意支持格式字节/base64 转为 PNG，并先应用 EXIF 方向。",
		["image", "conversion", "png"],
		"simple",
	),
	fnNode(P.imgConv, "convertImageBytesToPng", [4, 24], "loadPhoton 解码、applyExifOrientation 后导出 PNG 字节。", ["image", "conversion"], "simple"),
	fnNode(P.imgConv, "convertToPng", [30, 49], "base64 + mime 入口，内部调用 convertImageBytesToPng 再编码回 base64。", ["image", "conversion"], "simple"),

	fileNode(
		P.imgProc,
		"image-process.ts",
		"统一图片预处理：规范化 MIME、非 PNG 转 PNG、按选项 resize，并收集转换/尺寸 hint。",
		["image", "preprocessing", "resize"],
		"moderate",
	),
	fnNode(P.imgProc, "normalizeSupportedImageMimeType", [33, 47], "去掉参数并把别名映射到支持的 image MIME。", ["mime", "normalization"], "simple"),
	fnNode(P.imgProc, "normalizeImage", [49, 65], "校验 MIME；非 PNG 则 convertImageBytesToPng。", ["image", "normalization"], "simple"),
	fnNode(
		P.imgProc,
		"processImage",
		[72, 119],
		"规范化后按需 resizeImage，返回 ok/data/mimeType/hints，失败则带错误消息。",
		["image", "preprocessing"],
		"moderate",
	),

	fileNode(
		P.imgResize,
		"image-resize-core.ts",
		"进程内 Photon 缩放：纠正 EXIF、按最大边缩放，并在 PNG/JPEG 候选中选更小编码。",
		["image", "resize", "photon"],
		"moderate",
	),
	fnNode(
		P.imgResize,
		"resizeImageInProcess",
		[59, 164],
		"解码、定向、按 maxDimension 迭代缩放并比较编码体积，返回 ResizedImage。",
		["image", "resize", "encoding"],
		"complex",
	),
];

const exported = [
	[P.fileProc, "processFileArguments"],
	[P.branch, "collectEntriesForBranchSummary"],
	[P.branch, "prepareBranchEntries"],
	[P.branch, "generateBranchSummary"],
	[P.comp, "calculateContextTokens"],
	[P.comp, "getLastAssistantUsage"],
	[P.comp, "estimateContextTokens"],
	[P.comp, "shouldCompact"],
	[P.comp, "estimateTokens"],
	[P.comp, "findTurnStartIndex"],
	[P.comp, "findCutPoint"],
	[P.comp, "getSummarizationFailure"],
	[P.comp, "completeSummarization"],
	[P.comp, "generateSummary"],
	[P.comp, "generateSummaryWithUsage"],
	[P.comp, "prepareCompaction"],
	[P.comp, "compact"],
	[P.cutils, "createFileOps"],
	[P.cutils, "extractFileOpsFromMessage"],
	[P.cutils, "computeFileLists"],
	[P.cutils, "formatFileOperations"],
	[P.cutils, "serializeConversation"],
	[P.bash, "createLocalShellOperations"],
	[P.bash, "createLocalBashOperations"],
	[P.bash, "createShellToolDefinition"],
	[P.bash, "createBashToolDefinition"],
	[P.bash, "createBashTool"],
	[P.editDiff, "detectLineEnding"],
	[P.editDiff, "normalizeToLF"],
	[P.editDiff, "restoreLineEndings"],
	[P.editDiff, "normalizeForFuzzyMatch"],
	[P.editDiff, "applyReplacementsPreservingUnchangedLines"],
	[P.editDiff, "fuzzyFindText"],
	[P.editDiff, "applyEditsToNormalizedContent"],
	[P.editDiff, "generateUnifiedPatch"],
	[P.editDiff, "generateDiffString"],
	[P.editDiff, "computeEditsDiff"],
	[P.editDiff, "computeEditDiff"],
	[P.edit, "createEditToolDefinition"],
	[P.edit, "createEditTool"],
	[P.queue, "withFileMutationQueue"],
	[P.find, "relativizeFindResultPath"],
	[P.find, "createFindToolDefinition"],
	[P.find, "createFindTool"],
	[P.grep, "createGrepToolDefinition"],
	[P.grep, "createGrepTool"],
	[P.toolsIdx, "createToolDefinition"],
	[P.toolsIdx, "createTool"],
	[P.toolsIdx, "createCodingToolDefinitions"],
	[P.toolsIdx, "createReadOnlyToolDefinitions"],
	[P.toolsIdx, "createAllToolDefinitions"],
	[P.toolsIdx, "createCodingTools"],
	[P.toolsIdx, "createReadOnlyTools"],
	[P.toolsIdx, "createAllTools"],
	[P.ls, "createLsToolDefinition"],
	[P.ls, "createLsTool"],
	[P.pathUtils, "pathExists"],
	[P.pathUtils, "expandPath"],
	[P.pathUtils, "resolveToCwd"],
	[P.pathUtils, "resolveReadPath"],
	[P.pathUtils, "resolveReadPathAsync"],
	[P.ps, "createLocalPowerShellOperations"],
	[P.ps, "createPowerShellToolDefinition"],
	[P.ps, "createPowerShellTool"],
	[P.read, "createReadToolDefinition"],
	[P.read, "createReadTool"],
	[P.wrap, "wrapToolDefinition"],
	[P.wrap, "wrapToolDefinitions"],
	[P.wrap, "createToolDefinitionFromAgentTool"],
	[P.trunc, "formatSize"],
	[P.trunc, "truncateHead"],
	[P.trunc, "truncateTail"],
	[P.trunc, "truncateLine"],
	[P.write, "createWriteToolDefinition"],
	[P.write, "createWriteTool"],
	[P.exif, "applyExifOrientation"],
	[P.imgConv, "convertImageBytesToPng"],
	[P.imgConv, "convertToPng"],
	[P.imgProc, "processImage"],
	[P.imgResize, "resizeImageInProcess"],
];

const edges = [];

for (const [src, targets] of Object.entries(brief.batchImportData)) {
	for (const t of targets) {
		edges.push({ source: File(src), target: File(t), type: "imports", direction: "forward", weight: 0.7 });
	}
}

for (const n of nodes) {
	if (n.type === "function" || n.type === "class") {
		edges.push({ source: File(n.filePath), target: n.id, type: "contains", direction: "forward", weight: 1.0 });
	}
}

for (const [path, name] of exported) {
	edges.push({ source: File(path), target: F(path, name), type: "exports", direction: "forward", weight: 0.8 });
}
edges.push({ source: File(P.outAcc), target: C(P.outAcc, "OutputAccumulator"), type: "exports", direction: "forward", weight: 0.8 });

const call = (srcPath, srcName, tgtPath, tgtName) => ({
	source: F(srcPath, srcName),
	target: F(tgtPath, tgtName),
	type: "calls",
	direction: "forward",
	weight: 0.8,
});

const messages = "packages/coding-agent/src/core/messages.ts";
const sessionMgr = "packages/coding-agent/src/core/session-manager.ts";
const aiIdx = "packages/ai/src/index.ts";
const aiCompat = "packages/ai/src/compat.ts";
const mime = "packages/coding-agent/src/utils/mime.ts";
const text = "packages/coding-agent/src/utils/text.ts";
const shell = "packages/coding-agent/src/utils/shell.ts";
const childProc = "packages/coding-agent/src/utils/child-process.ts";
const toolsMgr = "packages/coding-agent/src/utils/tools-manager.ts";
const paths = "packages/coding-agent/src/utils/paths.ts";
const photon = "packages/coding-agent/src/utils/photon.ts";
const imgResizePub = "packages/coding-agent/src/utils/image-resize.ts";

edges.push(
	call(P.fileProc, "processFileArguments", P.pathUtils, "resolveReadPath"),
	call(P.fileProc, "processFileArguments", P.imgProc, "processImage"),
	call(P.fileProc, "processFileArguments", mime, "detectSupportedImageMimeTypeFromFile"),
	call(P.fileProc, "processFileArguments", text, "stripBom"),

	call(P.branch, "getMessageFromEntry", messages, "createCustomMessage"),
	call(P.branch, "getMessageFromEntry", messages, "createBranchSummaryMessage"),
	call(P.branch, "getMessageFromEntry", messages, "createCompactionSummaryMessage"),
	call(P.branch, "prepareBranchEntries", P.cutils, "createFileOps"),
	call(P.branch, "prepareBranchEntries", P.cutils, "extractFileOpsFromMessage"),
	call(P.branch, "prepareBranchEntries", P.comp, "estimateTokens"),
	call(P.branch, "generateBranchSummary", messages, "convertToLlm"),
	call(P.branch, "generateBranchSummary", P.cutils, "serializeConversation"),
	call(P.branch, "generateBranchSummary", P.comp, "completeSummarization"),
	call(P.branch, "generateBranchSummary", P.comp, "getSummarizationFailure"),
	call(P.branch, "generateBranchSummary", aiIdx, "contentText"),
	call(P.branch, "generateBranchSummary", P.cutils, "computeFileLists"),
	call(P.branch, "generateBranchSummary", P.cutils, "formatFileOperations"),

	call(P.comp, "extractFileOperations", P.cutils, "createFileOps"),
	call(P.comp, "extractFileOperations", P.cutils, "extractFileOpsFromMessage"),
	call(P.comp, "findCutPoint", sessionMgr, "sessionEntryToContextMessages"),
	call(P.comp, "completeSummarization", aiIdx, "uuidv7"),
	call(P.comp, "completeSummarization", aiCompat, "completeSimple"),
	call(P.comp, "generateSummaryWithUsage", messages, "convertToLlm"),
	call(P.comp, "generateSummaryWithUsage", P.cutils, "serializeConversation"),
	call(P.comp, "generateSummaryWithUsage", aiIdx, "contentText"),
	call(P.comp, "prepareCompaction", sessionMgr, "buildSessionContext"),
	call(P.comp, "prepareCompaction", P.cutils, "extractFileOpsFromMessage"),
	call(P.comp, "compact", P.cutils, "computeFileLists"),
	call(P.comp, "compact", P.cutils, "formatFileOperations"),
	call(P.cutils, "serializeConversation", aiIdx, "contentText"),

	call(P.bash, "createLocalShellOperations", shell, "getShellEnv"),
	call(P.bash, "createLocalShellOperations", shell, "trackDetachedChildPid"),
	call(P.bash, "createLocalShellOperations", shell, "untrackDetachedChildPid"),
	call(P.bash, "createLocalShellOperations", shell, "killProcessTree"),
	call(P.bash, "createLocalShellOperations", childProc, "waitForChildProcess"),
	call(P.bash, "createBashTool", P.wrap, "wrapToolDefinition"),

	call(P.editDiff, "computeEditsDiff", P.pathUtils, "resolveToCwd"),
	call(P.editDiff, "computeEditsDiff", text, "splitBom"),
	call(P.edit, "createEditToolDefinition", P.queue, "withFileMutationQueue"),
	call(P.edit, "createEditToolDefinition", P.pathUtils, "resolveToCwd"),
	call(P.edit, "createEditToolDefinition", text, "splitBom"),
	call(P.edit, "createEditToolDefinition", P.editDiff, "detectLineEnding"),
	call(P.edit, "createEditToolDefinition", P.editDiff, "normalizeToLF"),
	call(P.edit, "createEditToolDefinition", P.editDiff, "applyEditsToNormalizedContent"),
	call(P.edit, "createEditToolDefinition", P.editDiff, "restoreLineEndings"),
	call(P.edit, "createEditToolDefinition", P.editDiff, "generateDiffString"),
	call(P.edit, "createEditToolDefinition", P.editDiff, "generateUnifiedPatch"),
	call(P.edit, "createEditTool", P.wrap, "wrapToolDefinition"),

	call(P.find, "createFindToolDefinition", P.pathUtils, "resolveToCwd"),
	call(P.find, "createFindToolDefinition", P.pathUtils, "pathExists"),
	call(P.find, "createFindToolDefinition", P.trunc, "truncateHead"),
	call(P.find, "createFindToolDefinition", P.trunc, "formatSize"),
	call(P.find, "createFindToolDefinition", toolsMgr, "ensureTool"),
	call(P.find, "createFindTool", P.wrap, "wrapToolDefinition"),

	call(P.grep, "createGrepToolDefinition", P.pathUtils, "resolveToCwd"),
	call(P.grep, "createGrepToolDefinition", toolsMgr, "ensureTool"),
	call(P.grep, "createGrepToolDefinition", P.trunc, "truncateHead"),
	call(P.grep, "createGrepToolDefinition", P.trunc, "formatSize"),
	call(P.grep, "createGrepToolDefinition", P.trunc, "truncateLine"),
	call(P.grep, "createGrepTool", P.wrap, "wrapToolDefinition"),

	call(P.toolsIdx, "createToolDefinition", P.read, "createReadToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.bash, "createBashToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.ps, "createPowerShellToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.edit, "createEditToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.write, "createWriteToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.grep, "createGrepToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.find, "createFindToolDefinition"),
	call(P.toolsIdx, "createToolDefinition", P.ls, "createLsToolDefinition"),
	call(P.toolsIdx, "createTool", P.read, "createReadTool"),
	call(P.toolsIdx, "createTool", P.bash, "createBashTool"),
	call(P.toolsIdx, "createTool", P.ps, "createPowerShellTool"),
	call(P.toolsIdx, "createTool", P.edit, "createEditTool"),
	call(P.toolsIdx, "createTool", P.write, "createWriteTool"),
	call(P.toolsIdx, "createTool", P.grep, "createGrepTool"),
	call(P.toolsIdx, "createTool", P.find, "createFindTool"),
	call(P.toolsIdx, "createTool", P.ls, "createLsTool"),
	call(P.toolsIdx, "createCodingToolDefinitions", P.read, "createReadToolDefinition"),
	call(P.toolsIdx, "createCodingToolDefinitions", P.bash, "createBashToolDefinition"),
	call(P.toolsIdx, "createCodingToolDefinitions", P.edit, "createEditToolDefinition"),
	call(P.toolsIdx, "createCodingToolDefinitions", P.write, "createWriteToolDefinition"),
	call(P.toolsIdx, "createReadOnlyToolDefinitions", P.read, "createReadToolDefinition"),
	call(P.toolsIdx, "createReadOnlyToolDefinitions", P.grep, "createGrepToolDefinition"),
	call(P.toolsIdx, "createReadOnlyToolDefinitions", P.find, "createFindToolDefinition"),
	call(P.toolsIdx, "createReadOnlyToolDefinitions", P.ls, "createLsToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.read, "createReadToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.bash, "createBashToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.ps, "createPowerShellToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.edit, "createEditToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.write, "createWriteToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.grep, "createGrepToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.find, "createFindToolDefinition"),
	call(P.toolsIdx, "createAllToolDefinitions", P.ls, "createLsToolDefinition"),
	call(P.toolsIdx, "createCodingTools", P.read, "createReadTool"),
	call(P.toolsIdx, "createCodingTools", P.bash, "createBashTool"),
	call(P.toolsIdx, "createCodingTools", P.edit, "createEditTool"),
	call(P.toolsIdx, "createCodingTools", P.write, "createWriteTool"),
	call(P.toolsIdx, "createReadOnlyTools", P.read, "createReadTool"),
	call(P.toolsIdx, "createReadOnlyTools", P.grep, "createGrepTool"),
	call(P.toolsIdx, "createReadOnlyTools", P.find, "createFindTool"),
	call(P.toolsIdx, "createReadOnlyTools", P.ls, "createLsTool"),
	call(P.toolsIdx, "createAllTools", P.read, "createReadTool"),
	call(P.toolsIdx, "createAllTools", P.bash, "createBashTool"),
	call(P.toolsIdx, "createAllTools", P.ps, "createPowerShellTool"),
	call(P.toolsIdx, "createAllTools", P.edit, "createEditTool"),
	call(P.toolsIdx, "createAllTools", P.write, "createWriteTool"),
	call(P.toolsIdx, "createAllTools", P.grep, "createGrepTool"),
	call(P.toolsIdx, "createAllTools", P.find, "createFindTool"),
	call(P.toolsIdx, "createAllTools", P.ls, "createLsTool"),

	call(P.ls, "createLsToolDefinition", P.pathUtils, "resolveToCwd"),
	call(P.ls, "createLsToolDefinition", P.trunc, "truncateHead"),
	call(P.ls, "createLsToolDefinition", P.trunc, "formatSize"),
	call(P.ls, "createLsTool", P.wrap, "wrapToolDefinition"),

	call(P.outAcc, "snapshot", P.trunc, "truncateTail"),

	call(P.pathUtils, "expandPath", paths, "normalizePath"),
	call(P.pathUtils, "resolveToCwd", paths, "resolvePath"),

	call(P.ps, "createLocalPowerShellOperations", P.bash, "createLocalShellOperations"),
	call(P.ps, "createPowerShellToolDefinition", P.bash, "createShellToolDefinition"),
	call(P.ps, "createPowerShellTool", P.wrap, "wrapToolDefinition"),

	call(P.read, "createReadToolDefinition", P.pathUtils, "resolveReadPathAsync"),
	call(P.read, "createReadToolDefinition", P.imgProc, "processImage"),
	call(P.read, "createReadToolDefinition", P.trunc, "truncateHead"),
	call(P.read, "createReadToolDefinition", P.trunc, "formatSize"),
	call(P.read, "createReadTool", P.wrap, "wrapToolDefinition"),

	call(P.write, "createWriteToolDefinition", P.pathUtils, "resolveToCwd"),
	call(P.write, "createWriteToolDefinition", P.queue, "withFileMutationQueue"),
	call(P.write, "createWriteTool", P.wrap, "wrapToolDefinition"),

	call(P.imgConv, "convertImageBytesToPng", photon, "loadPhoton"),
	call(P.imgConv, "convertImageBytesToPng", P.exif, "applyExifOrientation"),
	call(P.imgProc, "normalizeImage", P.imgConv, "convertImageBytesToPng"),
	call(P.imgProc, "processImage", imgResizePub, "resizeImage"),
	call(P.imgProc, "processImage", imgResizePub, "formatDimensionNote"),
	call(P.imgResize, "resizeImageInProcess", photon, "loadPhoton"),
	call(P.imgResize, "resizeImageInProcess", P.exif, "applyExifOrientation"),
);

const importCount = Object.values(brief.batchImportData).reduce((n, a) => n + a.length, 0);
const actualImports = edges.filter((e) => e.type === "imports").length;
if (actualImports !== importCount) {
	throw new Error(`imports ${actualImports} !== expected ${importCount}`);
}

const ids = new Set(nodes.map((n) => n.id));
if (ids.size !== nodes.length) throw new Error("duplicate node ids");
for (const e of edges) {
	if (e.source === e.target) throw new Error(`self edge ${e.source}`);
}

const files = [...new Set(nodes.map((n) => n.filePath))].sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;
let parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
function partStats(pcount) {
	const gs = Math.ceil(files.length / pcount);
	const stats = [];
	for (let p = 0; p < pcount; p++) {
		const partFiles = new Set(files.slice(p * gs, (p + 1) * gs));
		if (partFiles.size === 0) continue;
		const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
		const partIds = new Set(partNodes.map((n) => n.id));
		const partEdges = edges.filter((e) => partIds.has(e.source));
		stats.push({ nodes: partNodes.length, edges: partEdges.length });
	}
	return { gs, stats };
}
while (true) {
	const { stats } = partStats(parts);
	if (stats.every((s) => s.nodes <= 60 && s.edges <= 120)) break;
	parts += 1;
	if (parts > files.length) break;
}
const groupSize = Math.ceil(files.length / parts);

console.log({ nodeCount, edgeCount, parts, groupSize, files: files.length, importCount, perPart: partStats(parts).stats });

const neighborFiles = new Set();
for (const [src, targets] of Object.entries(brief.batchImportData)) {
	neighborFiles.add(src);
	for (const t of targets) neighborFiles.add(t);
}
for (const [src, neighbors] of Object.entries(brief.neighborMap || {})) {
	neighborFiles.add(src);
	for (const n of neighbors) neighborFiles.add(n.path);
}
const neighborSymbols = new Map();
for (const neighbors of Object.values(brief.neighborMap || {})) {
	for (const n of neighbors) {
		if (!neighborSymbols.has(n.path)) neighborSymbols.set(n.path, new Set());
		for (const s of n.symbols || []) neighborSymbols.get(n.path).add(s);
	}
}
for (const n of nodes) {
	if (n.type === "function" || n.type === "class") {
		const path = n.filePath;
		if (!neighborSymbols.has(path)) neighborSymbols.set(path, new Set());
		neighborSymbols.get(path).add(n.name);
	}
}

function edgeOk(e, partIds) {
	const check = (id) => {
		if (partIds.has(id)) return true;
		if (id.startsWith("file:")) return neighborFiles.has(id.slice(5));
		const m = id.match(/^(function|class):(.+):(.+)$/);
		if (!m) return false;
		const [, , path, symbol] = m;
		if (neighborFiles.has(path) && neighborSymbols.get(path)?.has(symbol)) return true;
		if (ids.has(id)) return true;
		return false;
	};
	return check(e.source) && check(e.target);
}

const outDir = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua/intermediate";
let written = [];
for (let p = 0; p < parts; p++) {
	const partFiles = new Set(files.slice(p * groupSize, (p + 1) * groupSize));
	if (partFiles.size === 0) continue;
	const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
	const partIds = new Set(partNodes.map((n) => n.id));
	const partEdges = edges.filter((e) => partIds.has(e.source));
	const bad = partEdges.filter((e) => !edgeOk(e, partIds));
	if (bad.length) {
		console.error("BAD EDGES", JSON.stringify(bad, null, 2));
		throw new Error(`part ${p + 1} validation failed: ${bad.length} edges`);
	}
	const name = `${outDir}/batch-16-part-${p + 1}.json`;
	writeFileSync(name, JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2));
	written.push({ name, nodes: partNodes.length, edges: partEdges.length, files: [...partFiles] });
}
console.log(JSON.stringify(written, null, 2));
