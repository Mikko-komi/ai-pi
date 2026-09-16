import { readFileSync, writeFileSync } from "node:fs";

const UA = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua";
const brief = JSON.parse(readFileSync(`${UA}/intermediate/batch-briefs/batch-6.json`, "utf8"));
const extracted = JSON.parse(readFileSync(`${UA}/tmp/ua-file-extract-results-6.json`, "utf8"));

const FILE_META = {
	"packages/coding-agent/src/cli/config-selector.ts": {
		summary: "为 `pi config` 启动 TUI 配置选择器：初始化 theme，挂上 ConfigSelectorComponent，关闭时停止 TUI 与 theme watcher。",
		tags: ["cli", "tui", "配置选择", "entry-point"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/cli/session-picker.ts": {
		summary: "为 `--resume` 展示会话选择器：创建启动 TUI、注入 KeybindingsManager，返回所选 session 路径或取消。",
		tags: ["cli", "tui", "会话选择", "entry-point"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/cli/startup-ui.ts": {
		summary: "启动阶段 TUI 基础设施：加载 theme 与 keybindings、创建 TuiMainScreen，并提供首次设置向导与通用 selector/input。",
		tags: ["cli", "tui", "启动流程", "theme"],
		complexity: "complex",
		languageNotes: "首次设置仅在官方发行版且 PI_EXPERIMENTAL=1、未覆盖 agent dir、尚无 settings.json 时运行。",
	},
	"packages/coding-agent/src/core/cache-stats.ts": {
		summary: "扫描 session entries，把本应命中 prompt-cache 却被重新计费的 token/费用记为 cache waste，并按 assistant 消息收集 miss。",
		tags: ["cache", "usage", "会话分析", "utility"],
		complexity: "moderate",
		languageNotes: "用 1024 token 噪声地板和 5 分钟 CACHE_TTL 区分 breakpoint 粒度噪声与真实 miss。",
	},
	"packages/coding-agent/src/core/experimental.ts": {
		summary: "用环境变量 `PI_EXPERIMENTAL=1` 判断是否启用实验功能开关。",
		tags: ["feature-flag", "experimental", "utility"],
		complexity: "simple",
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts": {
		summary: "把终端 ANSI/SGR 颜色与样式（含 256 色与 RGB）转为带 inline CSS 的 HTML，供 session HTML 导出使用。",
		tags: ["html-export", "ansi", "serialization", "utility"],
		complexity: "complex",
		languageNotes: "手写 SGR 状态机，支持 30–37/90–97、256 色立方体与 truecolor。",
	},
	"packages/coding-agent/src/core/export-html/tool-renderer.ts": {
		summary: "查找 ToolDefinition 的 TUI renderer，把 renderCall/renderResult 的 ANSI 输出转成 HTML 的折叠/展开片段。",
		tags: ["html-export", "tool-renderer", "tui", "factory"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/extensions/runner.ts": {
		summary: "Extension 运行时：绑定 provider 与 UI prompt、派发生命周期事件、解析命令/快捷键冲突，并向工具/命令提供统一 context。",
		tags: ["extension", "event-handler", "lifecycle", "service"],
		complexity: "complex",
		languageNotes: "扩展快捷键与内置 keybinding id 冲突时，保留列表中的 app/tui 动作优先。",
	},
	"packages/coding-agent/src/core/extensions/types.ts": {
		summary: "Extension 系统的核心类型合同：UI context、ToolDefinition、生命周期事件，以及内置工具 result/call 的 type guards。",
		tags: ["type-definition", "extension", "api-contract", "event-handler"],
		complexity: "complex",
		languageNotes: "大量 type-only import；用声明合并与重载 type guard 收窄 ToolCallEvent。",
	},
	"packages/coding-agent/src/core/extensions/wrapper.ts": {
		summary: "把 RegisteredTool 包成 AgentTool：注入 runner.createContext()，并在 execute 后把新激活的工具名并入 addedToolNames。",
		tags: ["extension", "wrapper", "factory", "tool"],
		complexity: "simple",
	},
	"packages/coding-agent/src/core/footer-data-provider.ts": {
		summary: "为 footer 提供 git 分支（支持 worktree 与 WSL 挂载盘轮询）和 extension 状态，并监听 HEAD/reftable 变化。",
		tags: ["footer", "git", "fs-watch", "service"],
		complexity: "complex",
		languageNotes: "WSL 下访问 /mnt/<drive> 时改用 watchFile 轮询，避免 inotify 在 DrvFs 上失效。",
	},
	"packages/coding-agent/src/core/keybindings.ts": {
		summary: "定义 app/TUI 默认快捷键（含 Windows/WSL 变体），迁移旧 key 名，并从 agentDir/keybindings.json 加载用户覆盖。",
		tags: ["keybindings", "configuration", "tui", "windows"],
		complexity: "complex",
		languageNotes: "通过 declare module 把 AppKeybindings 合并进 @earendil-works/pi-tui 的 Keybindings。",
	},
	"packages/coding-agent/src/core/messages.ts": {
		summary: "为 coding-agent 扩展 AgentMessage（bashExecution/custom/branchSummary/compactionSummary），并转换为 LLM 可消费消息。",
		tags: ["data-model", "message", "compaction", "serialization"],
		complexity: "moderate",
		languageNotes: "用 declaration merging 扩展 @earendil-works/pi-agent-core 的 CustomAgentMessages。",
	},
	"packages/coding-agent/src/core/session-export.ts": {
		summary: "把当前 session 分支写成 JSONL：session header、沿 leaf 的 entries，以及可选的导出专用 trailing entries。",
		tags: ["session", "export", "jsonl", "serialization"],
		complexity: "simple",
	},
	"packages/coding-agent/src/core/session-manager.ts": {
		summary: "JSONL session 的树形存储与发现：创建/打开/继续/分支、compaction 上下文重建，以及按 cwd 列出会话。",
		tags: ["session", "data-model", "persistence", "service"],
		complexity: "complex",
		languageNotes: "append-only JSONL + parentId 树；CURRENT_SESSION_VERSION=3，读取时自动 migrate。",
	},
	"packages/coding-agent/src/core/tools/render-utils.ts": {
		summary: "工具 TUI 渲染共享辅助：家目录缩短、OSC-8 超链接、参数校验文案，以及文本/图片输出规范化。",
		tags: ["utility", "tool-renderer", "tui", "path"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/tools/renderers/bash.ts": {
		summary: "bash/powershell 的纯展示 renderer：命令行、预览截断、耗时与更新节流；不加载执行路径或 typebox schema。",
		tags: ["tool-renderer", "bash", "tui", "component"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts": {
		summary: "edit 工具的调用预览与结果 diff 渲染，异步 computeEditsDiff 并按错误/pending 切换 header 背景。",
		tags: ["tool-renderer", "edit", "diff", "tui"],
		complexity: "complex",
	},
	"packages/coding-agent/src/core/tools/renderers/find.ts": {
		summary: "find 工具的调用/结果 TUI 呈现：pattern、path、limit，以及折叠行数与截断提示。",
		tags: ["tool-renderer", "find", "tui", "component"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/tools/renderers/grep.ts": {
		summary: "grep 工具的调用/结果 TUI 呈现：正则 pattern、path、glob/limit，以及折叠与截断提示。",
		tags: ["tool-renderer", "grep", "tui", "component"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/tools/renderers/index.ts": {
		summary: "内置工具 renderer 聚合入口；与执行实现分离，避免仅展示进程拖入约 17MB 的工具模块图。",
		tags: ["barrel", "tool-renderer", "factory", "entry-point"],
		complexity: "moderate",
		languageNotes: "createAllToolRenderers 按 ToolName 装配；withBuiltInRenderers 只补缺 renderCall/renderResult。",
	},
	"packages/coding-agent/src/core/tools/renderers/ls.ts": {
		summary: "ls 工具的调用/结果 TUI 呈现：路径超链接、limit，以及折叠目录列表与截断提示。",
		tags: ["tool-renderer", "ls", "tui", "component"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/tools/renderers/read.ts": {
		summary: "read 工具呈现：普通路径+行范围，或把 docs/skill/AGENTS.md 收成紧凑标题，结果做语法高亮。",
		tags: ["tool-renderer", "read", "syntax-highlight", "tui"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/tools/renderers/write.ts": {
		summary: "write 工具呈现：增量维护语法高亮缓存，流式追加时避免整文件重高亮。",
		tags: ["tool-renderer", "write", "syntax-highlight", "tui"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/core/usage-totals.ts": {
		summary: "按模型聚合 assistant usage/cost，把 toolResult 与 compaction/branch summary 的用量归入 Tools/summaries 桶。",
		tags: ["usage", "cost", "session", "utility"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/experimental/client-tui-chat.ts": {
		summary: "实验性、snapshot 驱动的聊天视图：把 LaneSnapshot 映射到 transcript、运行中工具与 working 状态组件。",
		tags: ["experimental", "tui", "component", "chat"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/experimental/mini/tui/view.ts": {
		summary: "mini TUI 的 alt-screen 视图：不持有 live runtime，只渲染复制的 SessionView snapshot，并把用户操作发成命令。",
		tags: ["experimental", "tui", "entry-point", "chat"],
		complexity: "complex",
		languageNotes: "视图与 worker 通过 protocol 命令通信，登录/选模型走 overlay 组件。",
	},
	"packages/coding-agent/src/extensions/index.ts": {
		summary: "内置 InlineExtension 注册表，目前只挂 hidden 的 llama.cpp factory。",
		tags: ["barrel", "extension", "entry-point"],
		complexity: "simple",
	},
	"packages/coding-agent/src/extensions/llama/client.ts": {
		summary: "llama.cpp 服务器 HTTP 客户端：list/load/unload/download，解析 SSE 进度，并用 AbortSignal 链接取消。",
		tags: ["extension", "http-client", "llama", "service"],
		complexity: "complex",
	},
	"packages/coding-agent/src/extensions/llama/huggingface.ts": {
		summary: "Hugging Face 模型搜索与量化详情客户端，并从 HF_TOKEN / 标准缓存路径发现 token。",
		tags: ["extension", "http-client", "huggingface", "认证"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/extensions/llama/index.ts": {
		summary: "llama.cpp 内置 extension：注册 provider，提供 /llama 命令以加载/卸载模型并从 Hugging Face 下载量化。",
		tags: ["extension", "llama", "slash-command", "entry-point"],
		complexity: "complex",
	},
};

const SYM_META = {
	"packages/coding-agent/src/cli/config-selector.ts:selectConfig": {
		summary: "初始化 theme 后打开 ConfigSelectorComponent；关闭时 stop TUI 与 theme watcher，exit 回调则 process.exit(0)。",
		tags: ["cli", "tui", "配置选择"],
	},
	"packages/coding-agent/src/cli/session-picker.ts:selectSession": {
		summary: "创建启动 TUI 与 KeybindingsManager，展示 SessionSelectorComponent，resolve 所选路径或 null。",
		tags: ["cli", "tui", "会话选择"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:loadThemes": {
		summary: "从已 resolve 的 theme 资源按路径加载 Theme，按名称去重；损坏 theme 被吞掉以免阻断启动。",
		tags: ["theme", "startup", "utility"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:loadStartupThemes": {
		summary: "用全局 SettingsManager 与 DefaultPackageManager.resolve 收集 theme 资源，再交给 loadThemes。",
		tags: ["theme", "startup", "package-manager"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:createStartupTui": {
		summary: "配置终端 capability/theme/keybindings，构造 TuiMainScreen 并应用 clear-on-shrink。",
		tags: ["tui", "startup", "factory"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:startStartupTui": {
		summary: "启动 TUI 并异步检测 auto theme，避免阻塞首帧。",
		tags: ["tui", "startup", "theme"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:shouldRunFirstTimeSetup": {
		summary: "仅当官方发行版、PI_EXPERIMENTAL、未覆盖 agent dir 且 settings.json 不存在时返回 true。",
		tags: ["startup", "feature-flag", "validation"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:showStartupSelector": {
		summary: "用 ExtensionSelectorComponent 展示选项列表，settle 后清空并 stop TUI。",
		tags: ["tui", "startup", "selector"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:showFirstTimeSetup": {
		summary: "展示 FirstTimeSetupComponent，把 theme 与 analytics 选择写回 SettingsManager 并 flush。",
		tags: ["tui", "startup", "onboarding"],
	},
	"packages/coding-agent/src/cli/startup-ui.ts:showStartupInput": {
		summary: "用 ExtensionInputComponent 收集单行输入，settle 后 dispose 并 stop TUI。",
		tags: ["tui", "startup", "input"],
	},
	"packages/coding-agent/src/core/cache-stats.ts:detectMiss": {
		summary: "相对上一请求计算 cache miss token/费用；无缓存活动、首轮或低于噪声地板则忽略。",
		tags: ["cache", "usage", "pricing"],
	},
	"packages/coding-agent/src/core/cache-stats.ts:asPreviousRequest": {
		summary: "把 assistant usage 收成 PreviousRequest，并粘滞 reportedCache 以便识别 cache-read-only provider。",
		tags: ["cache", "usage", "data-model"],
	},
	"packages/coding-agent/src/core/cache-stats.ts:scan": {
		summary: "遍历 session entries 累计 waste；compaction/branch_summary 会重置 prev，模型切换则计入。",
		tags: ["cache", "session", "scan"],
	},
	"packages/coding-agent/src/core/cache-stats.ts:computeCacheWaste": {
		summary: "返回整段 session 的累计 missedTokens/missedCost/missCount。",
		tags: ["cache", "usage", "utility"],
	},
	"packages/coding-agent/src/core/cache-stats.ts:collectCacheMisses": {
		summary: "返回按 assistant 消息引用索引的 miss map，供 resume/compaction 重建 transcript notice。",
		tags: ["cache", "session", "utility"],
	},
	"packages/coding-agent/src/core/cache-stats.ts:detectCacheMiss": {
		summary: "在 message_end（尚未 persist）时，用 scan 出的 prev 检测刚完成消息的 miss。",
		tags: ["cache", "event-handler", "utility"],
	},
	"packages/coding-agent/src/core/experimental.ts:areExperimentalFeaturesEnabled": {
		summary: "检查 process.env.PI_EXPERIMENTAL 是否为 \"1\"。",
		tags: ["feature-flag", "experimental", "utility"],
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts:color256ToHex": {
		summary: "把 256 色索引映射为 hex：0–15 标准色、16–231 立方体、232–255 灰度。",
		tags: ["ansi", "color", "utility"],
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts:createEmptyStyle": {
		summary: "创建空的 fg/bg/bold/dim/italic/underline 样式状态。",
		tags: ["ansi", "style", "utility"],
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts:styleToInlineCSS": {
		summary: "把当前 TextStyle 编成 color/background/font-weight 等 inline CSS。",
		tags: ["ansi", "html", "serialization"],
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts:applySgrCode": {
		summary: "解释一串 SGR 参数并就地更新样式，覆盖 reset、16/256/truecolor 与文本属性。",
		tags: ["ansi", "parser", "sgr"],
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts:ansiToHtml": {
		summary: "扫描 ANSI_REGEX，转义文本并用 span+inline CSS 包裹有样式的片段。",
		tags: ["ansi", "html-export", "serialization"],
	},
	"packages/coding-agent/src/core/export-html/ansi-to-html.ts:ansiLinesToHtml": {
		summary: "把多行 ANSI 分别转 HTML 并包进 ansi-line div，空行用 nbsp。",
		tags: ["ansi", "html-export", "utility"],
	},
	"packages/coding-agent/src/core/export-html/tool-renderer.ts:createToolHtmlRenderer": {
		summary: "按 toolCallId 缓存 TUI Component，调用 renderCall/renderResult 后再用 ansiLinesToHtml 产出 HTML。",
		tags: ["html-export", "tool-renderer", "factory"],
	},
	"packages/coding-agent/src/core/extensions/runner.ts:buildBuiltinKeybindings": {
		summary: "把已 resolve 的 KeybindingsConfig 编成 KeyId→动作表，保留列表中的动作在冲突时优先。",
		tags: ["keybindings", "extension", "conflict"],
	},
	"packages/coding-agent/src/core/extensions/runner.ts:emitSessionShutdownEvent": {
		summary: "若有 session_shutdown handler 则 emit，供进程退出前通知扩展。",
		tags: ["extension", "lifecycle", "event-handler"],
	},
	"packages/coding-agent/src/core/extensions/runner.ts:emitProjectTrustEvent": {
		summary: "依次调用各扩展的 project_trust handler，第一个 yes/no 获胜，undecided 继续。",
		tags: ["extension", "security", "event-handler"],
	},
	"packages/coding-agent/src/core/extensions/runner.ts:ExtensionRunner": {
		summary: "扩展运行时核心：bindCore 注册 provider、包装 UI prompt、emit 生命周期事件，并解析命令/工具/快捷键诊断。",
		tags: ["extension", "service", "lifecycle", "event-handler"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:defineTool": {
		summary: "恒等辅助：在 customTools 等数组里保留 ToolDefinition 的参数推断，避免 params 被 widen 成 unknown。",
		tags: ["type-definition", "tool", "utility"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isBashToolResult": {
		summary: "当 toolName 为 bash 时把 ToolResultEvent 收窄为 BashToolResultEvent。",
		tags: ["type-definition", "validation", "bash"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isPowerShellToolResult": {
		summary: "当 toolName 为 powershell 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "powershell"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isReadToolResult": {
		summary: "当 toolName 为 read 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "read"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isEditToolResult": {
		summary: "当 toolName 为 edit 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "edit"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isWriteToolResult": {
		summary: "当 toolName 为 write 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "write"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isGrepToolResult": {
		summary: "当 toolName 为 grep 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "grep"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isFindToolResult": {
		summary: "当 toolName 为 find 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "find"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isLsToolResult": {
		summary: "当 toolName 为 ls 时收窄 ToolResultEvent。",
		tags: ["type-definition", "validation", "ls"],
	},
	"packages/coding-agent/src/core/extensions/types.ts:isToolCallEventType": {
		summary: "按 toolName 重载收窄 ToolCallEvent，绕开 CustomToolCallEvent.toolName 为 string 导致的字面量重叠。",
		tags: ["type-definition", "validation", "tool"],
	},
	"packages/coding-agent/src/core/extensions/wrapper.ts:wrapRegisteredTool": {
		summary: "用 wrapToolDefinition + runner.createContext 包装单工具，并把 execute 期间新增的工具名写入 addedToolNames。",
		tags: ["wrapper", "tool", "extension"],
	},
	"packages/coding-agent/src/core/extensions/wrapper.ts:wrapRegisteredTools": {
		summary: "对 RegisteredTool 列表逐个调用 wrapRegisteredTool。",
		tags: ["wrapper", "tool", "factory"],
	},
	"packages/coding-agent/src/core/footer-data-provider.ts:findGitPaths": {
		summary: "从 cwd 向上找 .git（目录或 gitdir 文件），解析 worktree commondir 与 HEAD 路径。",
		tags: ["git", "path", "worktree"],
	},
	"packages/coding-agent/src/core/footer-data-provider.ts:resolveBranchWithGitAsync": {
		summary: "异步 execFile `git symbolic-ref` 读取当前分支，detached HEAD 返回 null。",
		tags: ["git", "async", "utility"],
	},
	"packages/coding-agent/src/core/footer-data-provider.ts:FooterDataProvider": {
		summary: "缓存 git 分支与 extension 状态，debounce 刷新，并在 HEAD/reftable 变化或 WSL 轮询时通知订阅者。",
		tags: ["footer", "git", "fs-watch", "service"],
	},
	"packages/coding-agent/src/core/keybindings.ts:useWindowsKeybindings": {
		summary: "win32 或带 WSL_DISTRO_NAME/WSL_INTEROP 的 linux 时使用 Windows 快捷键变体。",
		tags: ["keybindings", "windows", "wsl"],
	},
	"packages/coding-agent/src/core/keybindings.ts:toKeybindingsConfig": {
		summary: "把 JSON 对象收成 KeybindingsConfig，只接受 string 或 string[] 绑定。",
		tags: ["keybindings", "validation", "serialization"],
	},
	"packages/coding-agent/src/core/keybindings.ts:migrateKeybindingsConfig": {
		summary: "把旧 keybinding 名称映射到 app.* 规范名，并按 KEYBINDINGS 顺序重排。",
		tags: ["keybindings", "migration", "configuration"],
	},
	"packages/coding-agent/src/core/keybindings.ts:orderKeybindingsConfig": {
		summary: "先按内置 KEYBINDINGS 顺序输出已知键，再按字母序追加未知键。",
		tags: ["keybindings", "serialization", "utility"],
	},
	"packages/coding-agent/src/core/keybindings.ts:loadRawConfig": {
		summary: "读取 keybindings.json，stripBom 后 JSON.parse；缺失或非法则 undefined。",
		tags: ["keybindings", "io", "configuration"],
	},
	"packages/coding-agent/src/core/keybindings.ts:KeybindingsManager": {
		summary: "继承 TUI KeybindingsManager：从 agentDir/keybindings.json 加载用户绑定，支持 reload 与 getEffectiveConfig。",
		tags: ["keybindings", "service", "configuration"],
	},
	"packages/coding-agent/src/core/messages.ts:bashExecutionToText": {
		summary: "把 ! 命令的 BashExecutionMessage 编成带 exit/cancelled/truncated 标记的 user 文本。",
		tags: ["message", "bash", "serialization"],
	},
	"packages/coding-agent/src/core/messages.ts:createBranchSummaryMessage": {
		summary: "构造 branchSummary 自定义消息，timestamp 规范化为毫秒。",
		tags: ["message", "factory", "branch"],
	},
	"packages/coding-agent/src/core/messages.ts:createCompactionSummaryMessage": {
		summary: "构造 compactionSummary 自定义消息，记录压缩前 token 数。",
		tags: ["message", "factory", "compaction"],
	},
	"packages/coding-agent/src/core/messages.ts:createCustomMessage": {
		summary: "构造 extension 注入的 custom 消息，含 display 与 details。",
		tags: ["message", "factory", "extension"],
	},
	"packages/coding-agent/src/core/messages.ts:convertToLlm": {
		summary: "把 bash/custom/branch/compaction 消息转成 LLM user 文本；excludeFromContext 的 bash 被丢弃。",
		tags: ["message", "serialization", "llm"],
	},
	"packages/coding-agent/src/core/session-export.ts:exportSessionToJsonl": {
		summary: "写入 session header 与当前 branch 的 JSONL，并可追加导出专用 trailing entries。",
		tags: ["session", "export", "jsonl"],
	},
	"packages/coding-agent/src/core/session-manager.ts:assertValidSessionId": {
		summary: "校验 session id 只含字母数字与 .-_，且首尾为字母数字。",
		tags: ["session", "validation", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:migrateV1ToV2": {
		summary: "为 v1 entries 补 id/parentId，把线性日志升成可分支的树。",
		tags: ["session", "migration", "data-model"],
	},
	"packages/coding-agent/src/core/session-manager.ts:migrateV2ToV3": {
		summary: "把 v2 结构迁到 CURRENT_SESSION_VERSION=3 的字段形状。",
		tags: ["session", "migration", "data-model"],
	},
	"packages/coding-agent/src/core/session-manager.ts:migrateToCurrentVersion": {
		summary: "按 header version 依次调用 v1→v2、v2→v3 migrate。",
		tags: ["session", "migration", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:migrateSessionEntries": {
		summary: "导出入口：把任意版本 entries 迁到当前 session 版本。",
		tags: ["session", "migration", "entry-point"],
	},
	"packages/coding-agent/src/core/session-manager.ts:parseSessionEntries": {
		summary: "按行 JSON.parse session 文件内容，跳过空行，收集 FileEntry。",
		tags: ["session", "parser", "jsonl"],
	},
	"packages/coding-agent/src/core/session-manager.ts:getLatestCompactionEntry": {
		summary: "从 entries 中取时间线上最近的 compaction 条目。",
		tags: ["session", "compaction", "lookup"],
	},
	"packages/coding-agent/src/core/session-manager.ts:buildSessionPath": {
		summary: "从 leaf 沿 parentId 回溯到根，返回该分支的 entry 路径。",
		tags: ["session", "tree", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:getSessionContextSettings": {
		summary: "沿路径提取 thinking level 与当前 model 等上下文设置。",
		tags: ["session", "context", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:sessionEntryToContextMessages": {
		summary: "把单条 SessionEntry 转成 AgentMessage；custom/branch/compaction 走 messages factory。",
		tags: ["session", "message", "serialization"],
	},
	"packages/coding-agent/src/core/session-manager.ts:buildContextEntries": {
		summary: "沿 leaf 路径收集参与 LLM 上下文的 entries，compaction 之后只保留 firstKept 之后的节点。",
		tags: ["session", "compaction", "context"],
	},
	"packages/coding-agent/src/core/session-manager.ts:buildSessionContext": {
		summary: "组合路径、设置与 entries，产出给 LLM 的 messages/thinkingLevel/model。",
		tags: ["session", "context", "llm"],
	},
	"packages/coding-agent/src/core/session-manager.ts:getDefaultSessionDir": {
		summary: "按 cwd 与 agentDir 计算默认 sessions 目录并确保可用。",
		tags: ["session", "path", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:loadEntriesFromFile": {
		summary: "流式读取 JSONL session 文件，解析 header/entries，超限扫描抛 SessionHeaderScanLimitError。",
		tags: ["session", "io", "parser"],
	},
	"packages/coding-agent/src/core/session-manager.ts:readSessionHeader": {
		summary: "只读文件头部以获取 session header，避免为发现流程加载全部 entries。",
		tags: ["session", "io", "discovery"],
	},
	"packages/coding-agent/src/core/session-manager.ts:findMostRecentSession": {
		summary: "在 sessionDir 中找与 cwd 匹配、修改时间最新的 session 文件。",
		tags: ["session", "discovery", "lookup"],
	},
	"packages/coding-agent/src/core/session-manager.ts:extractTextContent": {
		summary: "从 user/assistant 消息提取可检索的纯文本，供 SessionInfo.firstMessage 使用。",
		tags: ["session", "message", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:getMessageActivityTime": {
		summary: "取 entry 的活动时间（消息 timestamp 或文件 mtime），用于列表排序。",
		tags: ["session", "discovery", "utility"],
	},
	"packages/coding-agent/src/core/session-manager.ts:buildSessionInfo": {
		summary: "从文件头与消息扫描构造 SessionInfo：cwd、name、parent、计数与可搜索文本。",
		tags: ["session", "discovery", "data-model"],
	},
	"packages/coding-agent/src/core/session-manager.ts:buildSessionInfosWithConcurrency": {
		summary: "有限并发地为文件列表构建 SessionInfo，并通过 onLoaded 汇报进度。",
		tags: ["session", "discovery", "concurrency"],
	},
	"packages/coding-agent/src/core/session-manager.ts:listSessionsFromDir": {
		summary: "列出目录中的 session 文件并构建 SessionInfo，支持进度回调。",
		tags: ["session", "discovery", "listing"],
	},
	"packages/coding-agent/src/core/session-manager.ts:SessionManager": {
		summary: "append-only JSONL session 管理器：new/open/continue/fork/branch、persist entries，并按 leaf 重建上下文。",
		tags: ["session", "persistence", "service", "data-model"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:shortenPath": {
		summary: "把家目录前缀换成 ~；非字符串返回空串。",
		tags: ["path", "utility", "display"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:linkPath": {
		summary: "终端支持 OSC-8 时把已样式文本链到 file:// URL。",
		tags: ["path", "tui", "hyperlink"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:str": {
		summary: "把 unknown 收成 string：非字符串非空返回 null，便于标记非法参数。",
		tags: ["validation", "utility", "type-definition"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:replaceTabs": {
		summary: "把制表符替换为三个空格，便于等宽渲染。",
		tags: ["display", "utility", "formatting"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:normalizeDisplayText": {
		summary: "去掉 CR，统一为 LF 显示文本。",
		tags: ["display", "utility", "formatting"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:getTextOutput": {
		summary: "拼接 tool result 文本块，剥离 ANSI/二进制；无图像能力时用 imageFallback。",
		tags: ["tool-renderer", "display", "image"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:invalidArgText": {
		summary: "返回 theme 着色的 `[invalid arg]` 占位。",
		tags: ["validation", "theme", "display"],
	},
	"packages/coding-agent/src/core/tools/render-utils.ts:renderToolPath": {
		summary: "校验路径后 shorten + 着色 + 可选超链接；null 显示 invalid arg。",
		tags: ["path", "tool-renderer", "display"],
	},
	"packages/coding-agent/src/core/tools/renderers/bash.ts:rebuildBashResultRenderComponent": {
		summary: "重建 bash 结果 Container：着色输出、折叠预览、截断提示与耗时页脚。",
		tags: ["bash", "tool-renderer", "component"],
	},
	"packages/coding-agent/src/core/tools/renderers/bash.ts:createShellRenderers": {
		summary: "为 bash/powershell 生成共享 renderer，仅 prompt 不同；结果更新按秒 invalidate。",
		tags: ["bash", "factory", "tool-renderer"],
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts:getEditCallRenderComponent": {
		summary: "复用 last Box 作为 EditCallRenderComponent，否则新建并写入 state。",
		tags: ["edit", "component", "tui"],
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts:getRenderablePreviewInput": {
		summary: "从 args 抽出 path 与 edits（兼容 file_path/oldText/newText），非法结构返回 undefined。",
		tags: ["edit", "validation", "diff"],
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts:formatEditResult": {
		summary: "错误时显示文本；成功则用 renderDiff 展示最终 diff。",
		tags: ["edit", "diff", "display"],
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts:getEditHeaderBg": {
		summary: "按 preview 错误/pending/成功选择 header 背景色。",
		tags: ["edit", "theme", "display"],
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts:buildEditCallComponent": {
		summary: "清空并填充 edit 调用组件：路径标题与可选 diff 预览。",
		tags: ["edit", "component", "diff"],
	},
	"packages/coding-agent/src/core/tools/renderers/edit.ts:setEditPreview": {
		summary: "在 argsKey 未变时写入 preview，避免过期异步 diff 覆盖新调用。",
		tags: ["edit", "diff", "async"],
	},
	"packages/coding-agent/src/core/tools/renderers/find.ts:formatFindCall": {
		summary: "着色渲染 `find <pattern> in <path>`，可选 limit。",
		tags: ["find", "display", "tool-renderer"],
	},
	"packages/coding-agent/src/core/tools/renderers/find.ts:formatFindResult": {
		summary: "折叠展示匹配路径行，附加 expand hint 与截断/体积警告。",
		tags: ["find", "display", "truncate"],
	},
	"packages/coding-agent/src/core/tools/renderers/grep.ts:formatGrepCall": {
		summary: "着色渲染 `grep /pattern/ in <path>`，附加 glob 与 limit。",
		tags: ["grep", "display", "tool-renderer"],
	},
	"packages/coding-agent/src/core/tools/renderers/grep.ts:formatGrepResult": {
		summary: "折叠展示匹配行，附加 expand hint 与行长/体积截断警告。",
		tags: ["grep", "display", "truncate"],
	},
	"packages/coding-agent/src/core/tools/renderers/index.ts:createAllToolRenderers": {
		summary: "返回按 ToolName 索引的内置 renderer；bash/powershell 共用 createShellRenderers。",
		tags: ["factory", "tool-renderer", "barrel"],
	},
	"packages/coding-agent/src/core/tools/renderers/index.ts:withBuiltInRenderers": {
		summary: "若 definition 缺少 renderCall/renderResult 则填入对应内置 renderer。",
		tags: ["factory", "tool-renderer", "merge"],
	},
	"packages/coding-agent/src/core/tools/renderers/ls.ts:formatLsResult": {
		summary: "折叠展示目录行（默认 20 行），附加 expand hint 与截断警告。",
		tags: ["ls", "display", "truncate"],
	},
	"packages/coding-agent/src/core/tools/renderers/read.ts:getPiDocsClassification": {
		summary: "若路径落在包内 docs 树，返回 kind=docs 的紧凑标签。",
		tags: ["read", "docs", "classification"],
	},
	"packages/coding-agent/src/core/tools/renderers/read.ts:getCompactReadClassification": {
		summary: "识别 skill、AGENTS.md/CLAUDE.md 或 pi docs，决定是否使用紧凑 read 标题。",
		tags: ["read", "classification", "path"],
	},
	"packages/coding-agent/src/core/tools/renderers/read.ts:formatCompactReadCall": {
		summary: "把 docs/skill/resource 读调用收成带快捷键提示的紧凑标题。",
		tags: ["read", "display", "keybindings"],
	},
	"packages/coding-agent/src/core/tools/renderers/read.ts:formatReadResult": {
		summary: "按语言高亮文件内容，折叠行数并提示截断；错误路径走纯文本。",
		tags: ["read", "syntax-highlight", "display"],
	},
	"packages/coding-agent/src/core/tools/renderers/write.ts:refreshWriteHighlightPrefix": {
		summary: "对缓存前 N 行重新 highlightCode，修复增量追加后的前缀高亮。",
		tags: ["write", "syntax-highlight", "cache"],
	},
	"packages/coding-agent/src/core/tools/renderers/write.ts:rebuildWriteHighlightCacheFull": {
		summary: "按路径语言对整份内容规范化并全量高亮，重建 WriteHighlightCache。",
		tags: ["write", "syntax-highlight", "cache"],
	},
	"packages/coding-agent/src/core/tools/renderers/write.ts:updateWriteHighlightCacheIncremental": {
		summary: "若内容是旧缓存前缀则只高亮增量行，否则回退全量重建。",
		tags: ["write", "syntax-highlight", "incremental"],
	},
	"packages/coding-agent/src/core/tools/renderers/write.ts:formatWriteCall": {
		summary: "渲染 write 路径标题与高亮文件内容，流式时走增量缓存。",
		tags: ["write", "display", "syntax-highlight"],
	},
	"packages/coding-agent/src/core/tools/renderers/write.ts:formatWriteResult": {
		summary: "渲染 write 结果文本（成功/错误），附带 expand hint。",
		tags: ["write", "display", "tool-renderer"],
	},
	"packages/coding-agent/src/core/usage-totals.ts:createUsageTotals": {
		summary: "创建全零的 UsageTotals（input/output/cache/cost）。",
		tags: ["usage", "factory", "utility"],
	},
	"packages/coding-agent/src/core/usage-totals.ts:addUsageToTotals": {
		summary: "把一条 Usage 累加进 totals，cost 取 usage.cost.total。",
		tags: ["usage", "cost", "utility"],
	},
	"packages/coding-agent/src/core/usage-totals.ts:getUsageCostBreakdown": {
		summary: "按 provider/model 聚合 assistant 用量，工具摘要单独分桶，再按 cost 降序。",
		tags: ["usage", "cost", "session"],
	},
	"packages/coding-agent/src/experimental/client-tui-chat.ts:ExperimentalChatView": {
		summary: "把 LaneSnapshot 同步到 transcript、pending queue、running tools 与 working indicator。",
		tags: ["experimental", "tui", "chat", "component"],
	},
	"packages/coding-agent/src/experimental/mini/tui/view.ts:runLogin": {
		summary: "用 LoginDialog/OAuthSelector overlay 走完账户登录，并把结果写回 UI 状态。",
		tags: ["experimental", "oauth", "tui"],
	},
	"packages/coding-agent/src/experimental/mini/tui/view.ts:runView": {
		summary: "mini TUI 主循环：连接 session、渲染 MiniTui、处理提交/中断/选模型/登录命令。",
		tags: ["experimental", "tui", "entry-point"],
	},
	"packages/coding-agent/src/experimental/mini/tui/view.ts:ListSelector": {
		summary: "带模糊搜索的 Focusable 列表，用于不持有 ModelRuntime 的选择场景。",
		tags: ["experimental", "tui", "selector", "component"],
	},
	"packages/coding-agent/src/experimental/mini/tui/view.ts:MiniTui": {
		summary: "Alt-screen 聊天表面：CustomEditor + ScrollView transcript，apply() 只消费复制的 snapshot。",
		tags: ["experimental", "tui", "chat", "component"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:linkSignal": {
		summary: "把 source AbortSignal 链接到 target AbortController，返回解除监听函数。",
		tags: ["abort", "utility", "http-client"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:sleep": {
		summary: "可取消的 sleep；signal abort 时 reject。",
		tags: ["async", "abort", "utility"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:parseLoadProgress": {
		summary: "从 llama.cpp 加载事件解析阶段比例与状态文案。",
		tags: ["llama", "progress", "parser"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:parseDownloadProgress": {
		summary: "从下载事件汇总各分片进度，并用 formatBytes 生成详情。",
		tags: ["llama", "progress", "parser"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:formatBytes": {
		summary: "把字节数格式化为 KiB/MiB/GiB 等人类可读单位。",
		tags: ["utility", "formatting", "display"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:normalizeLlamaServerUrl": {
		summary: "规范化 llama.cpp base URL：去尾斜杠并去掉 /v1 推理后缀。",
		tags: ["llama", "url", "validation"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:llamaInferenceUrl": {
		summary: "在规范化 server URL 后追加推理端点路径。",
		tags: ["llama", "url", "utility"],
	},
	"packages/coding-agent/src/extensions/llama/client.ts:LlamaClient": {
		summary: "llama.cpp HTTP API：list/props/load/unload/download，watch SSE，并提供 *AndWait 进度封装。",
		tags: ["llama", "http-client", "service"],
	},
	"packages/coding-agent/src/extensions/llama/huggingface.ts:findHuggingFaceToken": {
		summary: "按 HF_TOKEN、HF_TOKEN_PATH、HF_HOME、XDG_CACHE_HOME 与 ~/.cache/huggingface/token 查找 token。",
		tags: ["huggingface", "认证", "token"],
	},
	"packages/coding-agent/src/extensions/llama/huggingface.ts:HuggingFaceClient": {
		summary: "调用 Hugging Face Hub：search 模型、details 量化文件，处理 gated 与 rate-limit。",
		tags: ["huggingface", "http-client", "service"],
	},
	"packages/coding-agent/src/extensions/llama/index.ts:configuredClient": {
		summary: "从 ModelRegistry 取 llama.cpp auth/baseUrl，构造 LlamaClient；未配置则提示 /login。",
		tags: ["llama", "认证", "factory"],
	},
	"packages/coding-agent/src/extensions/llama/index.ts:llamaExtension": {
		summary: "注册 llama.cpp provider 与 /llama 命令：同步 catalog、加载/卸载，以及 Hugging Face 下载流程。",
		tags: ["llama", "extension", "slash-command"],
	},
};

function exportedSet(file) {
	return new Set((file.exports || []).map((e) => e.name));
}

function fnLines(fn) {
	return fn.endLine - fn.startLine + 1;
}

function significantFn(fn, exported) {
	return exported.has(fn.name) || fnLines(fn) >= 10;
}

function significantClass(cls, exported) {
	return exported.has(cls.name) || (cls.methods || []).length >= 2 || cls.endLine - cls.startLine + 1 >= 20;
}

function complexityForLines(n) {
	if (n > 200) return "complex";
	if (n >= 50) return "moderate";
	return "simple";
}

const SKIP_CLASSES = new Set([
	"packages/coding-agent/src/core/session-manager.ts:SessionHeaderScanLimitError",
	"packages/coding-agent/src/core/tools/renderers/bash.ts:BashResultRenderComponent",
	"packages/coding-agent/src/core/tools/renderers/write.ts:WriteCallRenderComponent",
]);

const nodes = [];
const nodeIds = new Set();
const exportedNodeIds = new Set();
const fileToChildIds = new Map();
const batchFileSet = new Set(brief.files.map((f) => f.path));

function addNode(node) {
	if (nodeIds.has(node.id)) throw new Error(`dup ${node.id}`);
	nodeIds.add(node.id);
	nodes.push(node);
	if (node.filePath) {
		if (!fileToChildIds.has(node.filePath)) fileToChildIds.set(node.filePath, []);
		if (node.type !== "file") fileToChildIds.get(node.filePath).push(node.id);
	}
}

for (const file of extracted.results) {
	const meta = FILE_META[file.path];
	if (!meta) throw new Error(`missing file meta ${file.path}`);
	const fileNode = {
		id: `file:${file.path}`,
		type: "file",
		name: file.path.split("/").pop(),
		filePath: file.path,
		summary: meta.summary,
		tags: meta.tags,
		complexity: meta.complexity,
	};
	if (meta.languageNotes) fileNode.languageNotes = meta.languageNotes;
	addNode(fileNode);

	const exported = exportedSet(file);
	for (const fn of file.functions || []) {
		if (!significantFn(fn, exported)) continue;
		const key = `${file.path}:${fn.name}`;
		const sm = SYM_META[key];
		if (!sm) throw new Error(`missing symbol meta ${key}`);
		const id = `function:${file.path}:${fn.name}`;
		addNode({
			id,
			type: "function",
			name: fn.name,
			filePath: file.path,
			lineRange: [fn.startLine, fn.endLine],
			summary: sm.summary,
			tags: sm.tags,
			complexity: complexityForLines(fnLines(fn)),
		});
		if (exported.has(fn.name)) exportedNodeIds.add(id);
	}
	for (const cls of file.classes || []) {
		const key = `${file.path}:${cls.name}`;
		if (SKIP_CLASSES.has(key)) continue;
		if (!significantClass(cls, exported)) continue;
		const sm = SYM_META[key];
		if (!sm) throw new Error(`missing class meta ${key}`);
		const id = `class:${file.path}:${cls.name}`;
		addNode({
			id,
			type: "class",
			name: cls.name,
			filePath: file.path,
			lineRange: [cls.startLine, cls.endLine],
			summary: sm.summary,
			tags: sm.tags,
			complexity: complexityForLines(cls.endLine - cls.startLine + 1),
		});
		if (exported.has(cls.name)) exportedNodeIds.add(id);
	}
}

function edge(source, target, type, weight) {
	return { source, target, type, direction: "forward", weight };
}

const edges = [];
const edgeKeys = new Set();
function addEdge(e) {
	if (e.source === e.target) return;
	const k = `${e.source}|${e.target}|${e.type}`;
	if (edgeKeys.has(k)) return;
	edgeKeys.add(k);
	edges.push(e);
}

for (const [filePath, imports] of Object.entries(brief.batchImportData)) {
	for (const target of imports) {
		addEdge(edge(`file:${filePath}`, `file:${target}`, "imports", 0.7));
	}
}

for (const [filePath, childIds] of fileToChildIds) {
	for (const id of childIds) {
		addEdge(edge(`file:${filePath}`, id, "contains", 1.0));
		if (exportedNodeIds.has(id)) addEdge(edge(`file:${filePath}`, id, "exports", 0.8));
	}
}

const id = (kind, path, name) => `${kind}:${path}:${name}`;
const F = {
	startup: "packages/coding-agent/src/cli/startup-ui.ts",
	picker: "packages/coding-agent/src/cli/session-picker.ts",
	cfg: "packages/coding-agent/src/cli/config-selector.ts",
	cache: "packages/coding-agent/src/core/cache-stats.ts",
	exp: "packages/coding-agent/src/core/experimental.ts",
	ansi: "packages/coding-agent/src/core/export-html/ansi-to-html.ts",
	toolHtml: "packages/coding-agent/src/core/export-html/tool-renderer.ts",
	runner: "packages/coding-agent/src/core/extensions/runner.ts",
	types: "packages/coding-agent/src/core/extensions/types.ts",
	wrap: "packages/coding-agent/src/core/extensions/wrapper.ts",
	footer: "packages/coding-agent/src/core/footer-data-provider.ts",
	keys: "packages/coding-agent/src/core/keybindings.ts",
	msgs: "packages/coding-agent/src/core/messages.ts",
	sexp: "packages/coding-agent/src/core/session-export.ts",
	sess: "packages/coding-agent/src/core/session-manager.ts",
	rutil: "packages/coding-agent/src/core/tools/render-utils.ts",
	rbash: "packages/coding-agent/src/core/tools/renderers/bash.ts",
	redit: "packages/coding-agent/src/core/tools/renderers/edit.ts",
	rfind: "packages/coding-agent/src/core/tools/renderers/find.ts",
	rgrep: "packages/coding-agent/src/core/tools/renderers/grep.ts",
	ridx: "packages/coding-agent/src/core/tools/renderers/index.ts",
	rls: "packages/coding-agent/src/core/tools/renderers/ls.ts",
	rread: "packages/coding-agent/src/core/tools/renderers/read.ts",
	rwrite: "packages/coding-agent/src/core/tools/renderers/write.ts",
	usage: "packages/coding-agent/src/core/usage-totals.ts",
	chat: "packages/coding-agent/src/experimental/client-tui-chat.ts",
	mini: "packages/coding-agent/src/experimental/mini/tui/view.ts",
	extidx: "packages/coding-agent/src/extensions/index.ts",
	lclient: "packages/coding-agent/src/extensions/llama/client.ts",
	lhf: "packages/coding-agent/src/extensions/llama/huggingface.ts",
	lidx: "packages/coding-agent/src/extensions/llama/index.ts",
};

function call(srcKind, srcPath, srcName, dstKind, dstPath, dstName) {
	addEdge(edge(id(srcKind, srcPath, srcName), id(dstKind, dstPath, dstName), "calls", 0.8));
}

// intra-batch calls (same conceptual clusters; partition is alphabetical so some land same-part)
call("function", F.picker, "selectSession", "function", F.startup, "createStartupTui");
call("function", F.picker, "selectSession", "function", F.startup, "startStartupTui");
call("function", F.picker, "selectSession", "class", F.keys, "KeybindingsManager");
call("function", F.startup, "loadStartupThemes", "function", F.startup, "loadThemes");
call("function", F.startup, "createStartupTui", "function", F.startup, "loadStartupThemes");
call("function", F.startup, "createStartupTui", "class", F.keys, "KeybindingsManager");
call("function", F.startup, "shouldRunFirstTimeSetup", "function", F.exp, "areExperimentalFeaturesEnabled");
call("function", F.startup, "showStartupSelector", "function", F.startup, "createStartupTui");
call("function", F.startup, "showStartupSelector", "function", F.startup, "startStartupTui");
call("function", F.startup, "showFirstTimeSetup", "function", F.startup, "createStartupTui");
call("function", F.startup, "showStartupInput", "function", F.startup, "createStartupTui");
call("function", F.startup, "showStartupInput", "function", F.startup, "startStartupTui");
call("function", F.cache, "scan", "function", F.cache, "detectMiss");
call("function", F.cache, "scan", "function", F.cache, "asPreviousRequest");
call("function", F.cache, "computeCacheWaste", "function", F.cache, "scan");
call("function", F.cache, "collectCacheMisses", "function", F.cache, "scan");
call("function", F.cache, "detectCacheMiss", "function", F.cache, "detectMiss");
call("function", F.cache, "detectCacheMiss", "function", F.cache, "scan");
call("function", F.ansi, "applySgrCode", "function", F.ansi, "color256ToHex");
call("function", F.ansi, "ansiToHtml", "function", F.ansi, "createEmptyStyle");
call("function", F.ansi, "ansiToHtml", "function", F.ansi, "applySgrCode");
call("function", F.ansi, "ansiToHtml", "function", F.ansi, "styleToInlineCSS");
call("function", F.ansi, "ansiLinesToHtml", "function", F.ansi, "ansiToHtml");
call("function", F.toolHtml, "createToolHtmlRenderer", "function", F.ansi, "ansiLinesToHtml");
call("function", F.wrap, "wrapRegisteredTool", "class", F.runner, "ExtensionRunner");
call("function", F.wrap, "wrapRegisteredTools", "function", F.wrap, "wrapRegisteredTool");
call("class", F.footer, "FooterDataProvider", "function", F.footer, "findGitPaths");
call("function", F.keys, "migrateKeybindingsConfig", "function", F.keys, "orderKeybindingsConfig");
call("class", F.keys, "KeybindingsManager", "function", F.keys, "loadRawConfig");
call("class", F.keys, "KeybindingsManager", "function", F.keys, "toKeybindingsConfig");
call("class", F.keys, "KeybindingsManager", "function", F.keys, "migrateKeybindingsConfig");
call("function", F.msgs, "convertToLlm", "function", F.msgs, "bashExecutionToText");
call("function", F.sexp, "exportSessionToJsonl", "class", F.sess, "SessionManager");
call("function", F.sess, "migrateToCurrentVersion", "function", F.sess, "migrateV1ToV2");
call("function", F.sess, "migrateToCurrentVersion", "function", F.sess, "migrateV2ToV3");
call("function", F.sess, "migrateSessionEntries", "function", F.sess, "migrateToCurrentVersion");
call("function", F.sess, "sessionEntryToContextMessages", "function", F.msgs, "createCustomMessage");
call("function", F.sess, "sessionEntryToContextMessages", "function", F.msgs, "createBranchSummaryMessage");
call("function", F.sess, "sessionEntryToContextMessages", "function", F.msgs, "createCompactionSummaryMessage");
call("function", F.sess, "buildContextEntries", "function", F.sess, "buildSessionPath");
call("function", F.sess, "buildSessionContext", "function", F.sess, "buildContextEntries");
call("function", F.sess, "buildSessionContext", "function", F.sess, "getSessionContextSettings");
call("function", F.sess, "findMostRecentSession", "function", F.sess, "readSessionHeader");
call("function", F.sess, "buildSessionInfo", "function", F.sess, "extractTextContent");
call("function", F.sess, "buildSessionInfo", "function", F.sess, "getMessageActivityTime");
call("function", F.sess, "buildSessionInfosWithConcurrency", "function", F.sess, "buildSessionInfo");
call("function", F.sess, "listSessionsFromDir", "function", F.sess, "buildSessionInfosWithConcurrency");
call("function", F.rutil, "renderToolPath", "function", F.rutil, "invalidArgText");
call("function", F.rutil, "renderToolPath", "function", F.rutil, "linkPath");
call("function", F.rutil, "renderToolPath", "function", F.rutil, "shortenPath");
call("function", F.rbash, "rebuildBashResultRenderComponent", "function", F.rutil, "getTextOutput");
call("function", F.rbash, "createShellRenderers", "function", F.rbash, "rebuildBashResultRenderComponent");
call("function", F.redit, "formatEditResult", "function", F.rutil, "str");
call("function", F.redit, "buildEditCallComponent", "function", F.redit, "getEditHeaderBg");
call("function", F.rfind, "formatFindCall", "function", F.rutil, "shortenPath");
call("function", F.rfind, "formatFindCall", "function", F.rutil, "invalidArgText");
call("function", F.rfind, "formatFindResult", "function", F.rutil, "getTextOutput");
call("function", F.rgrep, "formatGrepCall", "function", F.rutil, "shortenPath");
call("function", F.rgrep, "formatGrepCall", "function", F.rutil, "invalidArgText");
call("function", F.rgrep, "formatGrepResult", "function", F.rutil, "getTextOutput");
call("function", F.rls, "formatLsResult", "function", F.rutil, "getTextOutput");
call("function", F.ridx, "createAllToolRenderers", "function", F.rbash, "createShellRenderers");
call("function", F.ridx, "withBuiltInRenderers", "function", F.ridx, "createAllToolRenderers");
call("function", F.rread, "getCompactReadClassification", "function", F.rread, "getPiDocsClassification");
call("function", F.rread, "formatReadResult", "function", F.rutil, "getTextOutput");
call("function", F.rwrite, "updateWriteHighlightCacheIncremental", "function", F.rwrite, "rebuildWriteHighlightCacheFull");
call("function", F.rwrite, "updateWriteHighlightCacheIncremental", "function", F.rwrite, "refreshWriteHighlightPrefix");
call("function", F.rwrite, "formatWriteCall", "function", F.rutil, "renderToolPath");
call("function", F.rwrite, "formatWriteCall", "function", F.rwrite, "updateWriteHighlightCacheIncremental");
call("function", F.usage, "getUsageCostBreakdown", "function", F.usage, "createUsageTotals");
call("function", F.usage, "getUsageCostBreakdown", "function", F.usage, "addUsageToTotals");
call("class", F.chat, "ExperimentalChatView", "function", F.ridx, "createAllToolRenderers");
call("function", F.mini, "runView", "class", F.mini, "MiniTui");
call("function", F.mini, "runView", "function", F.mini, "runLogin");
call("class", F.mini, "MiniTui", "class", F.keys, "KeybindingsManager");
call("class", F.mini, "MiniTui", "function", F.ridx, "createAllToolRenderers");
call("function", F.lclient, "llamaInferenceUrl", "function", F.lclient, "normalizeLlamaServerUrl");
call("function", F.lclient, "parseDownloadProgress", "function", F.lclient, "formatBytes");
call("class", F.lclient, "LlamaClient", "function", F.lclient, "normalizeLlamaServerUrl");
call("function", F.lidx, "configuredClient", "function", F.lclient, "normalizeLlamaServerUrl");
call("function", F.lidx, "configuredClient", "class", F.lclient, "LlamaClient");
call("function", F.lidx, "llamaExtension", "function", F.lidx, "configuredClient");
call("function", F.lidx, "llamaExtension", "function", F.lhf, "findHuggingFaceToken");
call("function", F.lidx, "llamaExtension", "class", F.lhf, "HuggingFaceClient");
call("function", F.lidx, "llamaExtension", "class", F.lclient, "LlamaClient");
call("function", F.lidx, "llamaExtension", "function", F.lclient, "formatBytes");

// cross-batch neighbor calls
function ncall(srcKind, srcPath, srcName, dstKind, dstPath, dstName) {
	call(srcKind, srcPath, srcName, dstKind, dstPath, dstName);
}

ncall("function", F.cfg, "selectConfig", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "initTheme");
ncall("function", F.cfg, "selectConfig", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "stopThemeWatcher");
ncall("function", F.cfg, "selectConfig", "class", "packages/coding-agent/src/modes/interactive/components/config-selector.ts", "ConfigSelectorComponent");
ncall("function", F.picker, "selectSession", "class", "packages/coding-agent/src/modes/interactive/components/session-selector.ts", "SessionSelectorComponent");
ncall("function", F.startup, "loadThemes", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "loadThemeFromPath");
ncall("function", F.startup, "loadStartupThemes", "function", "packages/coding-agent/src/config.ts", "getAgentDir");
ncall("function", F.startup, "loadStartupThemes", "class", "packages/coding-agent/src/core/package-manager.ts", "DefaultPackageManager");
ncall("function", F.startup, "createStartupTui", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "initTheme");
ncall("function", F.startup, "createStartupTui", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "setRegisteredThemes");
ncall("function", F.startup, "createStartupTui", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "resolveThemeSetting");
ncall("function", F.startup, "createStartupTui", "function", "packages/coding-agent/src/config.ts", "getAgentDir");
ncall("function", F.startup, "shouldRunFirstTimeSetup", "function", "packages/coding-agent/src/config.ts", "getSettingsPath");
ncall("function", F.startup, "showStartupSelector", "class", "packages/coding-agent/src/modes/interactive/components/extension-selector.ts", "ExtensionSelectorComponent");
ncall("function", F.startup, "showFirstTimeSetup", "class", "packages/coding-agent/src/modes/interactive/components/first-time-setup.ts", "FirstTimeSetupComponent");
ncall("function", F.startup, "showFirstTimeSetup", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "detectTerminalThemeForAuto");
ncall("function", F.startup, "showStartupInput", "class", "packages/coding-agent/src/modes/interactive/components/extension-input.ts", "ExtensionInputComponent");
ncall("class", F.runner, "ExtensionRunner", "function", "packages/coding-agent/src/core/system-prompt.ts", "buildSystemPrompt");
ncall("function", F.wrap, "wrapRegisteredTool", "function", "packages/coding-agent/src/core/tools/tool-definition-wrapper.ts", "wrapToolDefinition");
ncall("class", F.footer, "FooterDataProvider", "function", "packages/coding-agent/src/utils/fs-watch.ts", "watchWithErrorHandler");
ncall("class", F.footer, "FooterDataProvider", "function", "packages/coding-agent/src/utils/fs-watch.ts", "closeWatcher");
ncall("class", F.keys, "KeybindingsManager", "function", "packages/coding-agent/src/config.ts", "getAgentDir");
ncall("function", F.keys, "loadRawConfig", "function", "packages/coding-agent/src/utils/text.ts", "stripBom");
ncall("function", F.sexp, "exportSessionToJsonl", "function", "packages/coding-agent/src/utils/paths.ts", "resolvePath");
ncall("class", F.sess, "SessionManager", "function", "packages/coding-agent/src/utils/paths.ts", "resolvePath");
ncall("class", F.sess, "SessionManager", "function", "packages/coding-agent/src/utils/paths.ts", "normalizePath");
ncall("function", F.rutil, "linkPath", "function", "packages/coding-agent/src/utils/paths.ts", "resolvePath");
ncall("function", F.rutil, "getTextOutput", "function", "packages/coding-agent/src/utils/ansi.ts", "stripAnsi");
ncall("function", F.rutil, "getTextOutput", "function", "packages/coding-agent/src/utils/shell.ts", "sanitizeBinaryOutput");
ncall("function", F.rbash, "rebuildBashResultRenderComponent", "function", "packages/coding-agent/src/modes/interactive/components/visual-truncate.ts", "truncateToVisualLines");
ncall("function", F.rbash, "rebuildBashResultRenderComponent", "function", "packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts", "keyHint");
ncall("function", F.rbash, "rebuildBashResultRenderComponent", "function", "packages/coding-agent/src/core/tools/truncate.ts", "formatSize");
ncall("function", F.redit, "formatEditResult", "function", "packages/coding-agent/src/modes/interactive/components/diff.ts", "renderDiff");
ncall("function", F.redit, "buildEditCallComponent", "function", "packages/coding-agent/src/modes/interactive/components/diff.ts", "renderDiff");
ncall("function", F.rfind, "formatFindResult", "function", "packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts", "keyHint");
ncall("function", F.rfind, "formatFindResult", "function", "packages/coding-agent/src/core/tools/truncate.ts", "formatSize");
ncall("function", F.rgrep, "formatGrepResult", "function", "packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts", "keyHint");
ncall("function", F.rgrep, "formatGrepResult", "function", "packages/coding-agent/src/core/tools/truncate.ts", "formatSize");
ncall("function", F.rls, "formatLsResult", "function", "packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts", "keyHint");
ncall("function", F.rls, "formatLsResult", "function", "packages/coding-agent/src/core/tools/truncate.ts", "formatSize");
ncall("function", F.rread, "getPiDocsClassification", "function", "packages/coding-agent/src/config.ts", "getReadmePath");
ncall("function", F.rread, "getCompactReadClassification", "function", "packages/coding-agent/src/core/tools/path-utils.ts", "resolveToCwd");
ncall("function", F.rread, "getCompactReadClassification", "function", "packages/coding-agent/src/utils/paths.ts", "formatPathRelativeToCwdOrAbsolute");
ncall("function", F.rread, "formatCompactReadCall", "function", "packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts", "keyText");
ncall("function", F.rread, "formatReadResult", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "highlightCode");
ncall("function", F.rread, "formatReadResult", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "getLanguageFromPath");
ncall("function", F.rwrite, "rebuildWriteHighlightCacheFull", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "highlightCode");
ncall("function", F.rwrite, "rebuildWriteHighlightCacheFull", "function", "packages/coding-agent/src/modes/interactive/theme/theme.ts", "getLanguageFromPath");
ncall("class", F.chat, "ExperimentalChatView", "class", "packages/coding-agent/src/modes/interactive/components/assistant-message.ts", "AssistantMessageComponent");
ncall("class", F.chat, "ExperimentalChatView", "class", "packages/coding-agent/src/modes/interactive/components/tool-execution.ts", "ToolExecutionComponent");
ncall("class", F.chat, "ExperimentalChatView", "class", "packages/coding-agent/src/modes/interactive/components/user-message.ts", "UserMessageComponent");
ncall("class", F.mini, "MiniTui", "class", "packages/coding-agent/src/modes/interactive/components/custom-editor.ts", "CustomEditor");
ncall("class", F.mini, "MiniTui", "function", "packages/coding-agent/src/config.ts", "getAgentDir");
ncall("function", F.mini, "runLogin", "class", "packages/coding-agent/src/modes/interactive/components/login-dialog.ts", "LoginDialogComponent");
ncall("function", F.mini, "runLogin", "class", "packages/coding-agent/src/modes/interactive/components/oauth-selector.ts", "OAuthSelectorComponent");
ncall("function", F.mini, "runView", "function", "packages/coding-agent/src/experimental/mini/tui/session.ts", "connect");
ncall("function", F.lidx, "llamaExtension", "function", "packages/coding-agent/src/extensions/llama/provider.ts", "createLlamaProvider");
ncall("function", F.lidx, "llamaExtension", "function", "packages/coding-agent/src/extensions/llama/ui.ts", "showLlamaUi");
ncall("function", F.lidx, "llamaExtension", "function", "packages/coding-agent/src/extensions/llama/ui.ts", "runWithProgress");

const importSum = Object.values(brief.batchImportData).reduce((n, a) => n + a.length, 0);
const importEdges = edges.filter((e) => e.type === "imports").length;
if (importEdges !== importSum) {
	throw new Error(`imports ${importEdges} !== ${importSum}`);
}

const neighborSymbols = new Set();
const neighborFiles = new Set();
const importFiles = new Set();
for (const arr of Object.values(brief.batchImportData)) {
	for (const p of arr) importFiles.add(p);
}
for (const [path, neighbors] of Object.entries(brief.neighborMap)) {
	neighborFiles.add(path);
	for (const n of neighbors) {
		if (n.path) neighborFiles.add(n.path);
		for (const s of n.symbols || []) neighborSymbols.add(`${n.path}:${s}`);
	}
}

function parseSym(target) {
	const m = target.match(/^(function|class):(.+):([^:]+)$/);
	return m ? { kind: m[1], path: m[2], symbol: m[3] } : null;
}

function officialTargetOk(target, partIds) {
	if (partIds.has(target)) return true;
	if (target.startsWith("file:")) {
		const p = target.slice(5);
		return neighborFiles.has(p) || importFiles.has(p) || batchFileSet.has(p);
	}
	const parsed = parseSym(target);
	if (parsed && neighborSymbols.has(`${parsed.path}:${parsed.symbol}`)) return true;
	return false;
}

function rewriteTarget(target, partIds) {
	if (officialTargetOk(target, partIds)) return target;
	const parsed = parseSym(target);
	if (parsed && batchFileSet.has(parsed.path)) return `file:${parsed.path}`;
	return null;
}

const filesSorted = [...batchFileSet].sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;

function partition(partCount) {
	const size = Math.ceil(filesSorted.length / partCount);
	const out = [];
	for (let i = 0; i < partCount; i++) {
		const partFiles = new Set(filesSorted.slice(i * size, (i + 1) * size));
		if (partFiles.size === 0) continue;
		const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
		const partIds = new Set(partNodes.map((n) => n.id));
		const partEdges = edges.filter((e) => partIds.has(e.source));
		out.push({ partFiles, partNodes, partIds, partEdges });
	}
	return out;
}

let parts = nodeCount <= 60 && edgeCount <= 120 ? 1 : Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
let groups = partition(parts);
while (groups.some((g) => g.partNodes.length > 60 || g.partEdges.length > 120) && parts < filesSorted.length) {
	parts += 1;
	groups = partition(parts);
}

const written = [];
for (let i = 0; i < groups.length; i++) {
	const { partFiles, partNodes, partIds, partEdges } = groups[i];
	const rewritten = [];
	const seen = new Set();
	const bad = [];
	for (const e of partEdges) {
		const target = rewriteTarget(e.target, partIds);
		if (!target) {
			bad.push(`${e.source} -> ${e.target} (${e.type})`);
			continue;
		}
		if (e.source === target) continue;
		const next = { ...e, target };
		const k = `${next.source}|${next.target}|${next.type}`;
		if (seen.has(k)) continue;
		seen.add(k);
		rewritten.push(next);
	}
	if (bad.length) {
		console.error(`part ${i + 1} validation failed:\n` + bad.join("\n"));
		process.exit(1);
	}
	const payload = { nodes: partNodes, edges: rewritten };
	const name = groups.length === 1 ? `batch-6.json` : `batch-6-part-${i + 1}.json`;
	const out = `${UA}/intermediate/${name}`;
	writeFileSync(out, JSON.stringify(payload, null, 2) + "\n");
	written.push({ name, nodes: partNodes.length, edges: rewritten.length, files: [...partFiles] });
}

console.log(JSON.stringify({ nodeCount, edgeCount, parts, importEdges, written }, null, 2));
