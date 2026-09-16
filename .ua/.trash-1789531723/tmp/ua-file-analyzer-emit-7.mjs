import fs from "node:fs";

const UA_DIR = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua";
const brief = JSON.parse(fs.readFileSync(`${UA_DIR}/intermediate/batch-briefs/batch-7.json`, "utf8"));
const batchImportData = brief.batchImportData;

const TUI = "packages/tui/src/index.ts";
const CLIENT = "packages/coding-agent/src/extensions/llama/client.ts";
const COMPAT = "packages/ai/src/compat.ts";
const TRUNCATE = "packages/coding-agent/src/core/tools/truncate.ts";
const ANSI = "packages/coding-agent/src/utils/ansi.ts";
const VISUAL = "packages/coding-agent/src/modes/interactive/components/visual-truncate.ts";
const EXT_EDIT = "packages/coding-agent/src/modes/interactive/external-editor.ts";
const USAGE = "packages/coding-agent/src/core/usage-totals.ts";
const OPEN_BROWSER = "packages/coding-agent/src/utils/open-browser.ts";
const CATALOG = "packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts";
const MODEL_SEARCH = "packages/coding-agent/src/modes/interactive/model-search.ts";
const CONFIG = "packages/coding-agent/src/config.ts";
const PATHS = "packages/coding-agent/src/utils/paths.ts";
const STATUS = "packages/coding-agent/src/modes/interactive/components/status-indicator.ts";

function fileNode(filePath, name, summary, tags, complexity, languageNotes) {
	const n = { id: `file:${filePath}`, type: "file", name, filePath, summary, tags, complexity };
	if (languageNotes) n.languageNotes = languageNotes;
	return n;
}
function fnNode(filePath, name, lineRange, summary, tags, complexity) {
	return {
		id: `function:${filePath}:${name}`,
		type: "function",
		name,
		filePath,
		lineRange,
		summary,
		tags,
		complexity,
	};
}
function classNode(filePath, name, lineRange, summary, tags, complexity, languageNotes) {
	const n = { id: `class:${filePath}:${name}`, type: "class", name, filePath, lineRange, summary, tags, complexity };
	if (languageNotes) n.languageNotes = languageNotes;
	return n;
}
function edge(source, target, type, weight) {
	return { source, target, type, direction: "forward", weight };
}

const P = {
	provider: "packages/coding-agent/src/extensions/llama/provider.ts",
	ui: "packages/coding-agent/src/extensions/llama/ui.ts",
	viewport: "packages/coding-agent/src/modes/interactive/chat-viewport.ts",
	armin: "packages/coding-agent/src/modes/interactive/components/armin.ts",
	assistant: "packages/coding-agent/src/modes/interactive/components/assistant-message.ts",
	bash: "packages/coding-agent/src/modes/interactive/components/bash-execution.ts",
	loader: "packages/coding-agent/src/modes/interactive/components/bordered-loader.ts",
	branch: "packages/coding-agent/src/modes/interactive/components/branch-summary-message.ts",
	compaction: "packages/coding-agent/src/modes/interactive/components/compaction-summary-message.ts",
	configSel: "packages/coding-agent/src/modes/interactive/components/config-selector.ts",
	countdown: "packages/coding-agent/src/modes/interactive/components/countdown-timer.ts",
	customEd: "packages/coding-agent/src/modes/interactive/components/custom-editor.ts",
	customEn: "packages/coding-agent/src/modes/interactive/components/custom-entry.ts",
	customMsg: "packages/coding-agent/src/modes/interactive/components/custom-message.ts",
	daxnuts: "packages/coding-agent/src/modes/interactive/components/daxnuts.ts",
	diff: "packages/coding-agent/src/modes/interactive/components/diff.ts",
	dynBorder: "packages/coding-agent/src/modes/interactive/components/dynamic-border.ts",
	earendil: "packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts",
	extEd: "packages/coding-agent/src/modes/interactive/components/extension-editor.ts",
	extIn: "packages/coding-agent/src/modes/interactive/components/extension-input.ts",
	extSel: "packages/coding-agent/src/modes/interactive/components/extension-selector.ts",
	first: "packages/coding-agent/src/modes/interactive/components/first-time-setup.ts",
	footer: "packages/coding-agent/src/modes/interactive/components/footer.ts",
	hints: "packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts",
	login: "packages/coding-agent/src/modes/interactive/components/login-dialog.ts",
	mdx: "packages/coding-agent/src/modes/interactive/components/markdown-transform.ts",
	mermaid: "packages/coding-agent/src/modes/interactive/components/mermaid.ts",
	modelSel: "packages/coding-agent/src/modes/interactive/components/model-selector.ts",
	oauth: "packages/coding-agent/src/modes/interactive/components/oauth-selector.ts",
	scoped: "packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts",
	sessSearch: "packages/coding-agent/src/modes/interactive/components/session-selector-search.ts",
};

const nodes = [
	fileNode(
		P.provider,
		"provider.ts",
		"将 llama.cpp 本地服务器适配为 pi-ai Provider：解析 LLAMA_BASE_URL、把模型目录映射为 openai-completions Model，并委托 stream/streamSimple。",
		["provider", "llama.cpp", "factory", "adapter"],
		"moderate",
		"通过 compat.stream / streamSimple 复用 OpenAI Completions 传输，baseUrl 指向 llamaInferenceUrl。",
	),
	fnNode(P.provider, "routerAutoloadEnabled", [36, 47], "探测 llama.cpp 是否开启 models_autoload，从而决定未加载 preset 是否可被选中。", ["provider", "llama.cpp", "feature-detection"], "simple"),
	fnNode(P.provider, "toPiModel", [49, 72], "把 LlamaModelInfo 转成 openai-completions Model，补齐 contextWindow、多模态 input 与 compat 能力位。", ["adapter", "data-model", "llama.cpp"], "moderate"),
	fnNode(P.provider, "createLlamaProvider", [79, 180], "工厂：构造可刷新目录的 llama.cpp Provider，含 API key 登录、凭据校验与 catalog 发布。", ["factory", "provider", "entry-point"], "complex"),

	fileNode(
		P.ui,
		"ui.ts",
		"llama.cpp 扩展的交互式 TUI：模型列表、Hugging Face 搜索、确认框与下载进度，通过 showLlamaUi 挂到 extension custom UI。",
		["component", "llama.cpp", "tui", "extension"],
		"complex",
	),
	fnNode(P.ui, "contextLabel", [32, 42], "从模型 meta 或 --ctx-size 参数提取上下文窗口，格式化为 k 单位标签。", ["utility", "formatting", "llama.cpp"], "simple"),
	fnNode(P.ui, "frame", [64, 75], "用 DynamicBorder 与标题/页脚组装标准 llama 对话框容器。", ["component", "layout", "tui"], "simple"),
	fnNode(P.ui, "showLlamaUi", [480, 492], "在 extension command context 中打开 LlamaView，并在 run 结束后关闭 custom UI。", ["entry-point", "tui", "extension"], "simple"),
	fnNode(P.ui, "runWithProgress", [494, 542], "在进度对话框中跑可取消任务：竞态 settled/progress，确认后 abort 并返回 cancelled 结果。", ["async", "progress", "cancellation"], "moderate"),
	classNode(P.ui, "HuggingFaceSearch", [96, 274], "可聚焦的 Hugging Face 模型搜索面板：防抖查询、结果过滤与键盘选择。", ["component", "search", "huggingface"], "complex"),
	classNode(P.ui, "LlamaView", [276, 478], "实现 LlamaUi：展示本地模型、选择/确认、连接错误与进度更新，并托管 HuggingFaceSearch。", ["component", "tui", "llama.cpp"], "complex"),

	fileNode(
		P.viewport,
		"chat-viewport.ts",
		"组装交互模式全屏 transcript（ScrollView follow-end）与底部固定 dock（pending/status/editor/footer）。",
		["layout", "component", "tui", "factory"],
		"simple",
		"transcript 可增长，dock 用 VStack shrink 把输入区钉在底部。",
	),
	fnNode(P.viewport, "createChatViewport", [22, 46], "创建 ChatViewport：主滚动区和自动高度输入坞，可选 widgetsAbove/widgetsBelow。", ["factory", "layout", "tui"], "simple"),

	fileNode(
		P.armin,
		"armin.ts",
		"Armin 彩蛋：把 31×36 XBM 位图用半块字符渲染，并循环 typewriter/scanline/rain 等终端动画。",
		["component", "easter-egg", "animation", "tui"],
		"complex",
		"两行像素合成 ▀▄█，多种 effect 用 setInterval 驱动 invalidate。",
	),
	fnNode(P.armin, "buildFinalGrid", [48, 58], "按半块字符把 XBM 位图展开成最终显示网格。", ["utility", "rendering", "bitmap"], "simple"),
	classNode(P.armin, "ArminComponent", [60, 382], "实现 Component：初始化随机特效、逐帧更新网格并按宽度缓存渲染行。", ["component", "animation", "easter-egg"], "complex"),

	fileNode(
		P.assistant,
		"assistant-message.ts",
		"渲染完整 assistant 消息：Markdown 正文、可折叠 thinking 块、OSC 133 区域标记，并套用 MarkdownTransformer。",
		["component", "chat", "markdown", "tui"],
		"moderate",
	),
	classNode(P.assistant, "AssistantMessageComponent", [14, 202], "Container 子类，按内容块更新 Markdown/thinking，支持 streaming 与 thinking 显隐覆盖。", ["component", "chat", "markdown"], "moderate"),

	fileNode(
		P.bash,
		"bash-execution.ts",
		"流式展示 bash 执行：命令头、Loader、ANSI 清洗后的输出预览/展开，以及截断与完成状态。",
		["component", "bash", "streaming", "tui"],
		"moderate",
	),
	classNode(P.bash, "BashExecutionComponent", [21, 220], "Container 子类，追加输出、truncateTail/visual truncate，并在完成后显示 exitCode。", ["component", "bash", "streaming"], "moderate"),

	fileNode(
		P.loader,
		"bordered-loader.ts",
		"给扩展 UI 用的带 DynamicBorder 包装 Loader，可选 CancellableLoader 与 AbortController。",
		["component", "loader", "extension", "tui"],
		"moderate",
	),
	classNode(P.loader, "BorderedLoader", [7, 68], "带边框的可取消 Loader，转发 handleInput 并在 dispose 时 stop。", ["component", "loader", "cancellation"], "simple"),

	fileNode(
		P.branch,
		"branch-summary-message.ts",
		"渲染会话分支摘要消息：折叠预览与展开后的 Markdown 全文。",
		["component", "chat", "summary", "tui"],
		"moderate",
	),
	classNode(P.branch, "BranchSummaryMessageComponent", [10, 58], "Box 子类，按 expanded 切换分支摘要的短标签与完整 Markdown。", ["component", "summary", "markdown"], "simple"),

	fileNode(
		P.compaction,
		"compaction-summary-message.ts",
		"渲染 compaction 摘要：显示压缩前后 token 数，支持展开查看 Markdown 摘要。",
		["component", "chat", "compaction", "tui"],
		"moderate",
	),
	classNode(P.compaction, "CompactionSummaryMessageComponent", [10, 59], "Box 子类，折叠时展示 token 统计，展开后渲染 compaction Markdown。", ["component", "compaction", "summary"], "simple"),

	fileNode(
		P.configSel,
		"config-selector.ts",
		"交互式资源选择器：按 global/project 作用域浏览并开关 extensions/skills/prompts/themes，写入 SettingsManager。",
		["component", "settings", "selector", "tui"],
		"complex",
	),
	fnNode(P.configSel, "formatBaseDir", [66, 81], "把资源基目录格式化为 ~ 相对路径，便于分组标题显示。", ["utility", "path", "formatting"], "simple"),
	fnNode(P.configSel, "getGroupLabel", [83, 97], "按 metadata 与 agentDir 生成用户/项目/临时资源分组标签。", ["utility", "settings", "labeling"], "simple"),
	fnNode(P.configSel, "buildGroups", [99, 180], "把 ResolvedPaths 归并为按来源与资源类型分层的 ResourceGroup 树。", ["data-model", "settings", "grouping"], "complex"),
	classNode(P.configSel, "ConfigSelectorHeader", [187, 220], "渲染作用域标题与 tab/space/esc 快捷提示。", ["component", "header", "keybinding"], "simple"),
	classNode(P.configSel, "ResourceList", [222, 864], "可搜索、可聚焦的资源清单：继承/覆盖三态、包级与顶层开关，以及项目覆盖写入。", ["component", "settings", "selector"], "complex"),
	classNode(P.configSel, "ConfigSelectorComponent", [866, 942], "组合 Header 与 ResourceList，处理 global/project 写作用域切换。", ["component", "settings", "entry-point"], "moderate"),

	fileNode(
		P.countdown,
		"countdown-timer.ts",
		"对话框复用倒计时：每秒 onTick 并 requestRender，到时 dispose 后调用 onExpire。",
		["utility", "timer", "component"],
		"simple",
	),
	classNode(P.countdown, "CountdownTimer", [7, 39], "基于 setInterval 的秒级倒计时，支持 TUI 重绘与过期回调。", ["timer", "utility", "tui"], "simple"),

	fileNode(
		P.customEd,
		"custom-editor.ts",
		"继承 TUI Editor，叠加 coding-agent 应用级快捷键，并可把 StatusIndicator 嵌进顶边框。",
		["component", "editor", "keybinding", "tui"],
		"moderate",
	),
	classNode(P.customEd, "CustomEditor", [13, 148], "Editor 子类：onAction/handleInput 分发 AppKeybinding，并按宽度把工作状态画进顶边框。", ["component", "editor", "keybinding"], "moderate"),

	fileNode(
		P.customEn,
		"custom-entry.ts",
		"用扩展 EntryRenderer 渲染自定义 session entry，宿主负责 transcript 间距。",
		["component", "extension", "session", "tui"],
		"moderate",
	),
	classNode(P.customEn, "CustomEntryComponent", [11, 62], "Container 子类，调用 renderer 得到 Component 或回退文本，并支持展开。", ["component", "extension", "session"], "simple"),

	fileNode(
		P.customMsg,
		"custom-message.ts",
		"渲染扩展自定义消息：优先 MessageRenderer，否则用区别于 user message 的 Markdown/文本样式。",
		["component", "extension", "chat", "tui"],
		"moderate",
	),
	classNode(P.customMsg, "CustomMessageComponent", [12, 113], "Container 子类，rebuild 时切换自定义组件或 boxed Markdown，支持 outputPad。", ["component", "extension", "markdown"], "moderate"),

	fileNode(
		P.daxnuts,
		"daxnuts.ts",
		"DAXNUTS 彩蛋：把 32×32 RGB 肖像渲染成半块 ANSI 图，并滚动 POWERED BY DAXNUTS 致谢。",
		["component", "easter-egg", "animation", "tui"],
		"moderate",
		"像素来自紧凑 hex RGB，用 ▀ 半块与 24-bit ANSI 上色。",
	),
	fnNode(P.daxnuts, "parseImage", [17, 31], "把 DAX_HEX 解码为 32×32 RGB 像素矩阵。", ["utility", "image", "decoding"], "simple"),
	fnNode(P.daxnuts, "buildImage", [39, 55], "用半块字符与 RGB ANSI 把像素矩阵编成可显示行。", ["rendering", "ansi", "image"], "simple"),
	classNode(P.daxnuts, "DaxnutsComponent", [57, 164], "实现 Component：缓存渲染行并做滚动字幕动画。", ["component", "easter-egg", "animation"], "moderate"),

	fileNode(
		P.diff,
		"diff.ts",
		"把带行号的 unified-style diff 渲染成主题色文本，并用 diffWords 做行内高亮。",
		["utility", "diff", "rendering", "theme"],
		"moderate",
	),
	fnNode(P.diff, "renderIntraLineDiff", [26, 66], "对删除/新增行做 word-level diff，用 inverse 标出变更片段并避开缩进。", ["diff", "highlighting", "utility"], "moderate"),
	fnNode(P.diff, "renderDiff", [79, 147], "解析 +/−/上下文行，配对后调用行内 diff 并输出带主题色的完整 diff。", ["diff", "rendering", "utility"], "moderate"),

	fileNode(
		P.dynBorder,
		"dynamic-border.ts",
		"按视口宽度绘制单行 ─ 边框；扩展经 jiti 加载时应传入显式 color，避免 theme 模块缓存分裂。",
		["component", "layout", "theme", "tui"],
		"simple",
		"jiti 可能使用独立 module cache，默认 theme.fg 在扩展上下文中可能为 undefined。",
	),
	classNode(P.dynBorder, "DynamicBorder", [11, 25], "实现 Component：render(width) 输出一条着色水平线。", ["component", "layout", "border"], "simple"),

	fileNode(
		P.earendil,
		"earendil-announcement.ts",
		"展示捆绑 clankolas 图与博客链接的一次性公告组件。",
		["component", "announcement", "tui"],
		"simple",
	),
	fnNode(P.earendil, "loadImageBase64", [13, 25], "从捆绑 interactive asset 读取图片并缓存为 base64。", ["utility", "asset", "image"], "simple"),
	classNode(P.earendil, "EarendilAnnouncementComponent", [27, 53], "Container 公告：标题、说明、可选 Image 与博客 URL。", ["component", "announcement", "tui"], "simple"),

	fileNode(
		P.extEd,
		"extension-editor.ts",
		"扩展多行编辑器：内嵌 Editor，支持提交/取消，以及 Ctrl+G 打开外部编辑器。",
		["component", "editor", "extension", "tui"],
		"moderate",
	),
	classNode(P.extEd, "ExtensionEditorComponent", [22, 132], "可聚焦 Container，包装 Editor 并在外部编辑往返时 stop/start TUI。", ["component", "editor", "extension"], "moderate"),

	fileNode(
		P.extIn,
		"extension-input.ts",
		"扩展单行输入对话框，可选 CountdownTimer 超时自动取消。",
		["component", "input", "extension", "tui"],
		"moderate",
	),
	classNode(P.extIn, "ExtensionInputComponent", [16, 87], "可聚焦输入框，处理提交/取消快捷键并在 dispose 时清倒计时。", ["component", "input", "extension"], "moderate"),

	fileNode(
		P.extSel,
		"extension-selector.ts",
		"扩展选项列表：键盘上下选择、可选展开工具说明与倒计时取消。",
		["component", "selector", "extension", "tui"],
		"moderate",
	),
	classNode(P.extSel, "ExtensionSelectorComponent", [18, 112], "Container 选择列表，updateList 高亮当前项并转发 onSelect/onCancel。", ["component", "selector", "extension"], "moderate"),

	fileNode(
		P.first,
		"first-time-setup.ts",
		"首次启动向导：两步选择终端主题（可预览）与是否分享匿名分析数据。",
		["component", "onboarding", "settings", "tui"],
		"moderate",
	),
	classNode(P.first, "FirstTimeSetupComponent", [32, 145], "Container 向导，渲染 logo 与选项列表，回车提交、esc 取消。", ["component", "onboarding", "selector"], "moderate"),

	fileNode(
		P.footer,
		"footer.ts",
		"交互模式页脚：cwd、git 分支、token/context 用量，以及扩展状态文本。",
		["component", "footer", "usage", "tui"],
		"complex",
	),
	fnNode(P.footer, "formatTokens", [24, 30], "把 token 计数格式化为 k/M 紧凑字符串供页脚显示。", ["utility", "formatting", "usage"], "simple"),
	fnNode(P.footer, "formatCwdForFooter", [32, 44], "若 cwd 在 home 下则显示为 ~/ 相对路径。", ["utility", "path", "formatting"], "simple"),
	classNode(P.footer, "FooterComponent", [50, 245], "实现 Component：从 AgentSession 汇总 usage，并从 FooterDataProvider 取 git/扩展状态。", ["component", "footer", "usage"], "moderate"),

	fileNode(
		P.hints,
		"keybinding-hints.ts",
		"把 Keybinding 解析为显示文本：macOS alt→option、大小写，以及 dim/muted 的 hint 行。",
		["utility", "keybinding", "formatting", "tui"],
		"simple",
	),
	fnNode(P.hints, "formatKeyText", [17, 27], "把 ctrl+x/alt+y 这类键串拆开格式化，macOS 上将 alt 显示为 option。", ["utility", "keybinding", "formatting"], "simple"),
	fnNode(P.hints, "keyText", [34, 36], "按当前 Keybindings 解析绑定并输出未大写的按键文本。", ["utility", "keybinding"], "simple"),
	fnNode(P.hints, "keyDisplayText", [38, 40], "与 keyText 相同但首字母大写，适合页脚/选择器说明。", ["utility", "keybinding"], "simple"),
	fnNode(P.hints, "keyHint", [42, 44], "组合绑定文本与描述，用 theme dim/muted 着色。", ["utility", "keybinding", "theme"], "simple"),
	fnNode(P.hints, "rawKeyHint", [46, 48], "不查绑定表，直接把原始键串格式化为 hint。", ["utility", "keybinding", "theme"], "simple"),

	fileNode(
		P.login,
		"login-dialog.ts",
		"OAuth/设备码/手动输入登录对话框：可打开浏览器、展示等待/进度，并用 AbortController 取消。",
		["component", "oauth", "auth", "tui"],
		"complex",
	),
	classNode(P.login, "LoginDialogComponent", [11, 233], "可聚焦 Container，分 showAuth/showDeviceCode/showPrompt 等状态替换内容并收集输入。", ["component", "oauth", "auth"], "complex"),

	fileNode(
		P.mdx,
		"markdown-transform.ts",
		"按序应用 MarkdownTransformer；单个 transformer 抛错时跳过以保留当前 Markdown。",
		["utility", "markdown", "pipeline", "extension"],
		"simple",
	),
	fnNode(P.mdx, "createMarkdownTransform", [3, 10], "绑定 messageType/streaming 上下文，返回供 Markdown 组件调用的 transform 函数。", ["factory", "markdown", "pipeline"], "simple"),
	fnNode(P.mdx, "applyMarkdownTransformers", [12, 29], "依次执行 transformer，忽略异常以免一条扩展搞挂整段渲染。", ["markdown", "pipeline", "error-handling"], "simple"),

	fileNode(
		P.mermaid,
		"mermaid.ts",
		"MarkdownTransformer：把顶级 mermaid 代码块渲染成 Unicode 终端图，过宽或告警时回退源码。",
		["markdown", "mermaid", "transformer", "rendering"],
		"moderate",
		"用加长 backtick fence 把每行图编码为 CommonMark code span，以保留盒线与空格。",
	),
	fnNode(P.mermaid, "codeSpan", [18, 36], "按内容中最长反引号游程选择 fence，必要时加空格填充，避免破坏 CommonMark。", ["markdown", "utility", "escaping"], "simple"),
	fnNode(P.mermaid, "styleSpan", [38, 53], "按 grok-mermaid span.cls 把边框/边/标题映射到 Theme 前景色。", ["theme", "mermaid", "styling"], "simple"),
	fnNode(P.mermaid, "createMermaidMarkdownTransformer", [60, 89], "工厂：按渲染模式跳过 thinking/streaming，否则 lexer 替换 mermaid token。", ["factory", "markdown", "mermaid"], "moderate"),

	fileNode(
		P.modelSel,
		"model-selector.ts",
		"可搜索模型选择器：all/scoped 范围、默认模型标记、后台 refreshModelCatalogs，以及设为默认的快捷键。",
		["component", "selector", "model", "tui"],
		"complex",
	),
	classNode(P.modelSel, "ModelSelectorComponent", [40, 421], "可聚焦列表：从 ModelRuntime 快照加载、模糊过滤，并异步刷新目录状态。", ["component", "selector", "model"], "complex"),

	fileNode(
		P.oauth,
		"oauth-selector.ts",
		"认证提供方选择器：模糊搜索 oauth/api_key，并显示登录状态指示。",
		["component", "selector", "oauth", "auth"],
		"moderate",
	),
	fnNode(P.oauth, "formatAuthSelectorProviderType", [22, 24], "把 authType 显示为 subscription 或 API key。", ["utility", "formatting", "auth"], "simple"),
	classNode(P.oauth, "OAuthSelectorComponent", [29, 214], "可聚焦提供方列表，支持搜索过滤与状态徽章。", ["component", "selector", "oauth"], "moderate"),

	fileNode(
		P.scoped,
		"scoped-models-selector.ts",
		"管理 scoped 模型白名单：启用/全选/清空、排序移动，以及脏状态通知。",
		["component", "selector", "model", "settings"],
		"complex",
	),
	fnNode(P.scoped, "move", [55, 65], "在 enabledIds 列表中把指定模型上移或下移一位。", ["utility", "ordering", "model"], "simple"),
	classNode(P.scoped, "ScopedModelsSelectorComponent", [97, 401], "可聚焦多选列表：搜索、开关与排序，enabledIds 为 null 表示全部启用。", ["component", "selector", "model"], "complex"),

	fileNode(
		P.sessSearch,
		"session-selector-search.ts",
		"会话选择器搜索：解析 token/短语/re: 正则，模糊或精确匹配后按 threaded/recent/relevance 排序。",
		["utility", "search", "session", "filtering"],
		"moderate",
	),
	fnNode(P.sessSearch, "hasSessionName", [30, 32], "判断 SessionInfo 是否带非空 name。", ["utility", "session", "predicate"], "simple"),
	fnNode(P.sessSearch, "parseSearchQuery", [39, 114], "解析查询：re: 进正则模式，否则拆 quoted phrase 与 fuzzy token。", ["search", "parser", "session"], "complex"),
	fnNode(P.sessSearch, "matchSession", [116, 154], "按解析结果匹配会话文本，返回 matches 与越低越好的 score。", ["search", "session", "scoring"], "moderate"),
	fnNode(P.sessSearch, "filterAndSortSessions", [156, 194], "应用 nameFilter 与查询，再按 sortMode 排序会话列表。", ["search", "session", "filtering"], "moderate"),
];

const containsAndExports = [];
function addOwned(filePath, kind, name, exported) {
	const id = `${kind}:${filePath}:${name}`;
	containsAndExports.push(edge(`file:${filePath}`, id, "contains", 1.0));
	if (exported) containsAndExports.push(edge(`file:${filePath}`, id, "exports", 0.8));
}

addOwned(P.provider, "function", "routerAutoloadEnabled", false);
addOwned(P.provider, "function", "toPiModel", false);
addOwned(P.provider, "function", "createLlamaProvider", true);
addOwned(P.ui, "function", "contextLabel", false);
addOwned(P.ui, "function", "frame", false);
addOwned(P.ui, "function", "showLlamaUi", true);
addOwned(P.ui, "function", "runWithProgress", true);
addOwned(P.ui, "class", "HuggingFaceSearch", false);
addOwned(P.ui, "class", "LlamaView", false);
addOwned(P.viewport, "function", "createChatViewport", true);
addOwned(P.armin, "function", "buildFinalGrid", false);
addOwned(P.armin, "class", "ArminComponent", true);
addOwned(P.assistant, "class", "AssistantMessageComponent", true);
addOwned(P.bash, "class", "BashExecutionComponent", true);
addOwned(P.loader, "class", "BorderedLoader", true);
addOwned(P.branch, "class", "BranchSummaryMessageComponent", true);
addOwned(P.compaction, "class", "CompactionSummaryMessageComponent", true);
addOwned(P.configSel, "function", "formatBaseDir", false);
addOwned(P.configSel, "function", "getGroupLabel", false);
addOwned(P.configSel, "function", "buildGroups", false);
addOwned(P.configSel, "class", "ConfigSelectorHeader", false);
addOwned(P.configSel, "class", "ResourceList", false);
addOwned(P.configSel, "class", "ConfigSelectorComponent", true);
addOwned(P.countdown, "class", "CountdownTimer", true);
addOwned(P.customEd, "class", "CustomEditor", true);
addOwned(P.customEn, "class", "CustomEntryComponent", true);
addOwned(P.customMsg, "class", "CustomMessageComponent", true);
addOwned(P.daxnuts, "function", "parseImage", false);
addOwned(P.daxnuts, "function", "buildImage", false);
addOwned(P.daxnuts, "class", "DaxnutsComponent", true);
addOwned(P.diff, "function", "renderIntraLineDiff", false);
addOwned(P.diff, "function", "renderDiff", true);
addOwned(P.dynBorder, "class", "DynamicBorder", true);
addOwned(P.earendil, "function", "loadImageBase64", false);
addOwned(P.earendil, "class", "EarendilAnnouncementComponent", true);
addOwned(P.extEd, "class", "ExtensionEditorComponent", true);
addOwned(P.extIn, "class", "ExtensionInputComponent", true);
addOwned(P.extSel, "class", "ExtensionSelectorComponent", true);
addOwned(P.first, "class", "FirstTimeSetupComponent", true);
addOwned(P.footer, "function", "formatTokens", true);
addOwned(P.footer, "function", "formatCwdForFooter", true);
addOwned(P.footer, "class", "FooterComponent", true);
addOwned(P.hints, "function", "formatKeyText", true);
addOwned(P.hints, "function", "keyText", true);
addOwned(P.hints, "function", "keyDisplayText", true);
addOwned(P.hints, "function", "keyHint", true);
addOwned(P.hints, "function", "rawKeyHint", true);
addOwned(P.login, "class", "LoginDialogComponent", true);
addOwned(P.mdx, "function", "createMarkdownTransform", true);
addOwned(P.mdx, "function", "applyMarkdownTransformers", false);
addOwned(P.mermaid, "function", "codeSpan", false);
addOwned(P.mermaid, "function", "styleSpan", false);
addOwned(P.mermaid, "function", "createMermaidMarkdownTransformer", true);
addOwned(P.modelSel, "class", "ModelSelectorComponent", true);
addOwned(P.oauth, "function", "formatAuthSelectorProviderType", true);
addOwned(P.oauth, "class", "OAuthSelectorComponent", true);
addOwned(P.scoped, "function", "move", false);
addOwned(P.scoped, "class", "ScopedModelsSelectorComponent", true);
addOwned(P.sessSearch, "function", "hasSessionName", true);
addOwned(P.sessSearch, "function", "parseSearchQuery", true);
addOwned(P.sessSearch, "function", "matchSession", true);
addOwned(P.sessSearch, "function", "filterAndSortSessions", true);

const importEdges = [];
for (const [filePath, targets] of Object.entries(batchImportData)) {
	for (const target of targets) {
		importEdges.push(edge(`file:${filePath}`, `file:${target}`, "imports", 0.7));
	}
}

const semanticEdges = [
	// same-file calls
	edge(`function:${P.provider}:createLlamaProvider`, `function:${P.provider}:toPiModel`, "calls", 0.8),
	edge(`function:${P.provider}:createLlamaProvider`, `function:${P.provider}:routerAutoloadEnabled`, "calls", 0.8),
	edge(`function:${P.ui}:showLlamaUi`, `class:${P.ui}:LlamaView`, "calls", 0.8),
	edge(`function:${P.ui}:contextLabel`, `function:${P.ui}:contextLabel`, "calls", 0.8), // placeholder removed below
	edge(`class:${P.armin}:ArminComponent`, `function:${P.armin}:buildFinalGrid`, "calls", 0.8),
	edge(`function:${P.configSel}:getGroupLabel`, `function:${P.configSel}:formatBaseDir`, "calls", 0.8),
	edge(`function:${P.configSel}:buildGroups`, `function:${P.configSel}:getGroupLabel`, "calls", 0.8),
	edge(`class:${P.daxnuts}:DaxnutsComponent`, `function:${P.daxnuts}:buildImage`, "calls", 0.8),
	edge(`function:${P.daxnuts}:buildImage`, `function:${P.daxnuts}:parseImage`, "calls", 0.8),
	edge(`function:${P.diff}:renderDiff`, `function:${P.diff}:renderIntraLineDiff`, "calls", 0.8),
	edge(`class:${P.earendil}:EarendilAnnouncementComponent`, `function:${P.earendil}:loadImageBase64`, "calls", 0.8),
	edge(`class:${P.footer}:FooterComponent`, `function:${P.footer}:formatTokens`, "calls", 0.8),
	edge(`class:${P.footer}:FooterComponent`, `function:${P.footer}:formatCwdForFooter`, "calls", 0.8),
	edge(`function:${P.hints}:keyText`, `function:${P.hints}:formatKeyText`, "calls", 0.8),
	edge(`function:${P.hints}:keyDisplayText`, `function:${P.hints}:formatKeyText`, "calls", 0.8),
	edge(`function:${P.hints}:keyHint`, `function:${P.hints}:keyText`, "calls", 0.8),
	edge(`function:${P.hints}:rawKeyHint`, `function:${P.hints}:formatKeyText`, "calls", 0.8),
	edge(`function:${P.mdx}:createMarkdownTransform`, `function:${P.mdx}:applyMarkdownTransformers`, "calls", 0.8),
	edge(`function:${P.mermaid}:createMermaidMarkdownTransformer`, `function:${P.mermaid}:codeSpan`, "calls", 0.8),
	edge(`function:${P.mermaid}:createMermaidMarkdownTransformer`, `function:${P.mermaid}:styleSpan`, "calls", 0.8),
	edge(`class:${P.oauth}:OAuthSelectorComponent`, `function:${P.oauth}:formatAuthSelectorProviderType`, "calls", 0.8),
	edge(`function:${P.sessSearch}:filterAndSortSessions`, `function:${P.sessSearch}:parseSearchQuery`, "calls", 0.8),
	edge(`function:${P.sessSearch}:filterAndSortSessions`, `function:${P.sessSearch}:matchSession`, "calls", 0.8),
	edge(`function:${P.sessSearch}:filterAndSortSessions`, `function:${P.sessSearch}:hasSessionName`, "calls", 0.8),

	// cross-batch calls (neighborMap symbols)
	edge(`function:${P.provider}:createLlamaProvider`, `function:${CLIENT}:normalizeLlamaServerUrl`, "calls", 0.8),
	edge(`function:${P.provider}:createLlamaProvider`, `function:${CLIENT}:llamaInferenceUrl`, "calls", 0.8),
	edge(`function:${P.provider}:toPiModel`, `function:${CLIENT}:llamaInferenceUrl`, "calls", 0.8),
	edge(`function:${P.provider}:createLlamaProvider`, `function:${COMPAT}:stream`, "calls", 0.8),
	edge(`function:${P.provider}:createLlamaProvider`, `function:${COMPAT}:streamSimple`, "calls", 0.8),
	edge(`class:${P.bash}:BashExecutionComponent`, `function:${TRUNCATE}:truncateTail`, "calls", 0.8),
	edge(`class:${P.bash}:BashExecutionComponent`, `function:${ANSI}:stripAnsi`, "calls", 0.8),
	edge(`class:${P.bash}:BashExecutionComponent`, `function:${VISUAL}:truncateToVisualLines`, "calls", 0.8),
	edge(`class:${P.extEd}:ExtensionEditorComponent`, `function:${EXT_EDIT}:editInExternalEditor`, "calls", 0.8),
	edge(`class:${P.footer}:FooterComponent`, `function:${USAGE}:createUsageTotals`, "calls", 0.8),
	edge(`class:${P.footer}:FooterComponent`, `function:${USAGE}:addUsageToTotals`, "calls", 0.8),
	edge(`class:${P.login}:LoginDialogComponent`, `function:${OPEN_BROWSER}:openBrowser`, "calls", 0.8),
	edge(`class:${P.modelSel}:ModelSelectorComponent`, `function:${CATALOG}:refreshModelCatalogs`, "calls", 0.8),
	edge(`class:${P.modelSel}:ModelSelectorComponent`, `function:${MODEL_SEARCH}:getModelSelectorSearchText`, "calls", 0.8),
	edge(`class:${P.scoped}:ScopedModelsSelectorComponent`, `function:${MODEL_SEARCH}:getModelSearchText`, "calls", 0.8),
	edge(`function:${P.earendil}:loadImageBase64`, `function:${CONFIG}:getBundledInteractiveAssetPath`, "calls", 0.8),
	edge(`class:${P.configSel}:ResourceList`, `function:${PATHS}:canonicalizePath`, "calls", 0.8),
	edge(`class:${P.configSel}:ResourceList`, `function:${PATHS}:resolvePath`, "calls", 0.8),
	edge(`class:${P.configSel}:ResourceList`, `function:${PATHS}:isLocalPath`, "calls", 0.8),
	edge(`class:${P.customEd}:CustomEditor`, `class:${STATUS}:StatusIndicator`, "calls", 0.8),

	// inherits / implements to tui (neighbor symbols)
	edge(`class:${P.ui}:HuggingFaceSearch`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.assistant}:AssistantMessageComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.bash}:BashExecutionComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.loader}:BorderedLoader`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.branch}:BranchSummaryMessageComponent`, `class:${TUI}:Box`, "inherits", 0.9),
	edge(`class:${P.compaction}:CompactionSummaryMessageComponent`, `class:${TUI}:Box`, "inherits", 0.9),
	edge(`class:${P.configSel}:ConfigSelectorComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.customEd}:CustomEditor`, `class:${TUI}:Editor`, "inherits", 0.9),
	edge(`class:${P.customEn}:CustomEntryComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.customMsg}:CustomMessageComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.earendil}:EarendilAnnouncementComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.extEd}:ExtensionEditorComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.extIn}:ExtensionInputComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.extSel}:ExtensionSelectorComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.first}:FirstTimeSetupComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.login}:LoginDialogComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.modelSel}:ModelSelectorComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.oauth}:OAuthSelectorComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.scoped}:ScopedModelsSelectorComponent`, `class:${TUI}:Container`, "inherits", 0.9),
	edge(`class:${P.dynBorder}:DynamicBorder`, `class:${TUI}:Component`, "implements", 0.9),
	edge(`class:${P.armin}:ArminComponent`, `class:${TUI}:Component`, "implements", 0.9),
	edge(`class:${P.daxnuts}:DaxnutsComponent`, `class:${TUI}:Component`, "implements", 0.9),
	edge(`class:${P.footer}:FooterComponent`, `class:${TUI}:Component`, "implements", 0.9),
	edge(`class:${P.configSel}:ConfigSelectorHeader`, `class:${TUI}:Component`, "implements", 0.9),
	edge(`class:${P.configSel}:ResourceList`, `class:${TUI}:Component`, "implements", 0.9),
	edge(`class:${P.ui}:HuggingFaceSearch`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.ui}:LlamaView`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.configSel}:ResourceList`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.configSel}:ConfigSelectorComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.extEd}:ExtensionEditorComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.extIn}:ExtensionInputComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.login}:LoginDialogComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.modelSel}:ModelSelectorComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.oauth}:OAuthSelectorComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
	edge(`class:${P.scoped}:ScopedModelsSelectorComponent`, `class:${TUI}:Focusable`, "implements", 0.9),
];

// remove accidental self-call placeholder
const cleanedSemantic = semanticEdges.filter((e) => e.source !== e.target);

const edges = [...importEdges, ...containsAndExports, ...cleanedSemantic];

const expectedImports = Object.values(batchImportData).reduce((s, a) => s + a.length, 0);
if (importEdges.length !== expectedImports) {
	throw new Error(`import edges ${importEdges.length} !== expected ${expectedImports}`);
}

const ids = new Set(nodes.map((n) => n.id));
if (ids.size !== nodes.length) throw new Error("duplicate node ids");

const neighborSymbols = new Map();
for (const neighbors of Object.values(brief.neighborMap || {})) {
	for (const n of neighbors) {
		neighborSymbols.set(n.path, new Set(n.symbols || []));
	}
}
const importTargets = new Set();
for (const arr of Object.values(batchImportData)) for (const p of arr) importTargets.add(p);
for (const n of Object.keys(brief.neighborMap || {})) importTargets.add(n);
for (const neighbors of Object.values(brief.neighborMap || {})) {
	for (const n of neighbors) importTargets.add(n.path);
}

function targetAllowed(id, partNodeIds) {
	if (partNodeIds.has(id)) return true;
	if (id.startsWith("file:")) {
		const p = id.slice("file:".length);
		return importTargets.has(p) || Boolean(batchImportData[p]);
	}
	const m = /^(function|class):(.+):([^:]+)$/.exec(id);
	if (!m) return false;
	const [, , path, symbol] = m;
	const symbols = neighborSymbols.get(path);
	return Boolean(symbols && symbols.has(symbol));
}

const filesSorted = brief.files.map((f) => f.path).sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;
const parts = Math.max(1, Math.ceil(Math.max(nodeCount / 60, edgeCount / 120)));
const chunk = Math.ceil(filesSorted.length / parts);

console.log({ nodeCount, edgeCount, importEdges: importEdges.length, parts, chunk });

const written = [];
for (let i = 0; i < parts; i++) {
	const partFiles = new Set(filesSorted.slice(i * chunk, (i + 1) * chunk));
	const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
	const partIds = new Set(partNodes.map((n) => n.id));
	const partEdges = edges.filter((e) => partIds.has(e.source));
	const failed = [];
	for (const e of partEdges) {
		if (!partIds.has(e.source)) failed.push({ e, why: "source missing" });
		else if (!targetAllowed(e.target, partIds)) failed.push({ e, why: "target not allowed" });
	}
	if (failed.length) {
		console.error("VALIDATION FAIL part", i + 1);
		for (const f of failed.slice(0, 20)) console.error(f.why, f.e.source, "->", f.e.target);
		throw new Error(`part ${i + 1} validation failed: ${failed.length} edges`);
	}
	const out =
		parts === 1
			? `${UA_DIR}/intermediate/batch-7.json`
			: `${UA_DIR}/intermediate/batch-7-part-${i + 1}.json`;
	fs.writeFileSync(out, JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2) + "\n");
	written.push({ file: out, nodes: partNodes.length, edges: partEdges.length, files: [...partFiles] });
}

console.log(JSON.stringify(written, null, 2));
