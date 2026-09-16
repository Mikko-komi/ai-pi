import { writeFileSync } from "node:fs";

const FN = (filePath, name, start, end, summary, tags, complexity) => ({
	id: `function:${filePath}:${name}`,
	type: "function",
	name,
	filePath,
	lineRange: [start, end],
	summary,
	tags,
	complexity,
});

const CLS = (filePath, name, start, end, summary, tags, complexity, languageNotes) => ({
	id: `class:${filePath}:${name}`,
	type: "class",
	name,
	filePath,
	lineRange: [start, end],
	summary,
	tags,
	complexity,
	...(languageNotes ? { languageNotes } : {}),
});

const FILE = (filePath, name, summary, tags, complexity, languageNotes) => ({
	id: `file:${filePath}`,
	type: "file",
	name,
	filePath,
	summary,
	tags,
	complexity,
	...(languageNotes ? { languageNotes } : {}),
});

const files = [
	FILE(
		"packages/tui/src/fuzzy.ts",
		"fuzzy.ts",
		"提供按字符顺序（不必连续）的模糊匹配与列表过滤，分数越低表示匹配越好。",
		["模糊匹配", "utility", "过滤", "搜索"],
		"moderate",
	),
	FILE(
		"packages/tui/src/keybindings.ts",
		"keybindings.ts",
		"定义 TUI 默认快捷键表与 KeybindingsManager，支持用户覆盖、冲突检测，并用 matchesKey 匹配输入。",
		["快捷键", "event-handler", "配置", "键盘"],
		"complex",
	),
	FILE(
		"packages/tui/src/keys.ts",
		"keys.ts",
		"解析终端按键输入，同时支持传统 escape 序列与 Kitty keyboard protocol，并提供 matchesKey/parseKey。",
		["键盘协议", "输入解析", "kitty", "event-handler"],
		"complex",
		"同时覆盖 legacy CSI、modifyOtherKeys 与 Kitty 协议的按键识别。",
	),
	FILE(
		"packages/tui/src/kill-ring.ts",
		"kill-ring.ts",
		"Emacs 风格 kill/yank 环形缓冲区，支持连续删除合并与 yank-pop 轮换。",
		["剪贴历史", "编辑器", "data-model", "utility"],
		"simple",
	),
	FILE(
		"packages/tui/src/latex.ts",
		"latex.ts",
		"将受限 LaTeX 数学公式解析并渲染为等宽终端布局，覆盖符号、分数、根号与矩阵。",
		["latex", "渲染", "markdown", "排版"],
		"complex",
		"用 Unicode 数学符号与多行 layout 节点模拟分数、上下标和矩阵。",
	),
	FILE(
		"packages/tui/src/layout-node.ts",
		"layout-node.ts",
		"声明 Stack/Scroll 布局节点类型，并通过 LAYOUT_NODE symbol 从组件取出布局树。",
		["布局", "type-definition", "组件协议", "symbol"],
		"simple",
	),
	FILE(
		"packages/tui/src/layout.ts",
		"layout.ts",
		"对组件树做测量、裁剪与绘制，处理滚动条几何、Kitty 图像行，并输出可命中的 LayoutFrame。",
		["布局引擎", "渲染", "滚动条", "hit-test"],
		"complex",
	),
	FILE(
		"packages/tui/src/native-modifiers.ts",
		"native-modifiers.ts",
		"通过原生平台 helper 查询 Shift/Command/Control/Option 是否按下。",
		["原生模块", "修饰键", "utility", "键盘"],
		"simple",
	),
	FILE(
		"packages/tui/src/native-module-path.ts",
		"native-module-path.ts",
		"按包安装路径、源码目录与可执行文件目录生成原生 .node 模块候选路径。",
		["原生模块", "路径解析", "utility", "打包"],
		"simple",
	),
	FILE(
		"packages/tui/src/native-platform.ts",
		"native-platform.ts",
		"按平台惰性加载原生 helper，提供剪贴板、VT 输入与修饰键查询。",
		["原生模块", "剪贴板", "平台适配", "factory"],
		"moderate",
	),
	FILE(
		"packages/tui/src/stdin-buffer.ts",
		"stdin-buffer.ts",
		"缓冲 stdin 分片直到 CSI/OSC/DCS/APC 等 escape 序列完整，避免半包被当成普通按键。",
		["输入缓冲", "escape-sequence", "event-handler", "stdin"],
		"complex",
		"用超时与括号粘贴模式拼装可能跨多次 data 事件到达的终端序列。",
	),
	FILE(
		"packages/tui/src/terminal-colors.ts",
		"terminal-colors.ts",
		"解析 OSC 11 背景色与终端配色方案报告，将 hex 通道转为 RGB 并判断 dark/light。",
		["颜色", "osc", "终端查询", "解析"],
		"moderate",
	),
	FILE(
		"packages/tui/src/terminal-image.ts",
		"terminal-image.ts",
		"探测 Kitty/iTerm2 图像能力，编解码图像转义序列，并计算单元格尺寸与回退文本。",
		["图像协议", "kitty", "iterm2", "能力探测"],
		"complex",
		"从 PNG/JPEG/GIF/WebP 头解析像素尺寸，再按单元格像素换算占位行。",
	),
	FILE(
		"packages/tui/src/terminal.ts",
		"terminal.ts",
		"封装进程终端 I/O：协商 Kitty/modifyOtherKeys、缓冲 stdin，并提供光标、清屏与进度条写入。",
		["终端", "键盘协议", "I/O", "service"],
		"complex",
	),
	FILE(
		"packages/tui/src/tui-alt-screen.ts",
		"tui-alt-screen.ts",
		"全屏备用屏幕 TUI：布局滚动、鼠标选区、搜索高亮、滚动条与 Kitty 图像生命周期。",
		["备用屏幕", "viewport", "鼠标", "选区"],
		"complex",
	),
	FILE(
		"packages/tui/src/tui-main-screen.ts",
		"tui-main-screen.ts",
		"主屏幕差分渲染实现，跟踪已绘制行与 Kitty 图像 ID，并定位硬件光标。",
		["主屏幕", "差分渲染", "kitty", "光标"],
		"complex",
	),
	FILE(
		"packages/tui/src/tui.ts",
		"tui.ts",
		"TUI 核心：组件/鼠标协议、Container、叠加层焦点与 TuiBase 的输入、查询和合成渲染循环。",
		["entry-point", "组件模型", "渲染循环", "鼠标"],
		"complex",
	),
	FILE(
		"packages/tui/src/undo-stack.ts",
		"undo-stack.ts",
		"通用撤销栈，push 时 structuredClone 快照，pop 直接返回已分离副本。",
		["撤销", "data-model", "utility", "编辑器"],
		"simple",
	),
	FILE(
		"packages/tui/src/utils.ts",
		"utils.ts",
		"终端文本度量与裁剪工具：grapheme 宽度、ANSI/OSC 8 追踪、换行与按列切片。",
		["utility", "ansi", "文本宽度", "grapheme"],
		"complex",
		"结合 Intl.Segmenter 与 East Asian Width 计算可见列宽，并保持 ANSI 状态机。",
	),
	FILE(
		"packages/tui/src/word-navigation.ts",
		"word-navigation.ts",
		"基于 Intl.Segmenter 的按词前进/后退光标计算，可注入自定义分段与原子片段。",
		["词导航", "编辑器", "utility", "光标"],
		"moderate",
	),
];

const functions = [
	FN("packages/tui/src/fuzzy.ts", "fuzzyMatch", 12, 93, "按查询字符顺序匹配文本并打分，连续命中与靠前位置得分更好。", ["模糊匹配", "评分", "utility"], "moderate"),
	FN("packages/tui/src/fuzzy.ts", "fuzzyFilter", 99, 137, "对列表做模糊过滤并按匹配分数排序，空查询原样返回。", ["模糊匹配", "过滤", "utility"], "simple"),

	FN("packages/tui/src/keybindings.ts", "normalizeKeys", 217, 229, "将单个或数组 KeyId 规范成去重后的按键列表。", ["快捷键", "normalization", "utility"], "simple"),
	FN("packages/tui/src/keybindings.ts", "setKeybindings", 311, 313, "替换进程级默认 KeybindingsManager 实例。", ["快捷键", "singleton", "配置"], "simple"),
	FN("packages/tui/src/keybindings.ts", "getKeybindings", 315, 320, "返回当前 KeybindingsManager，若尚未设置则惰性创建。", ["快捷键", "singleton", "factory"], "simple"),

	FN("packages/tui/src/keys.ts", "setKittyProtocolActive", 31, 33, "设置全局 Kitty keyboard protocol 是否已启用。", ["kitty", "状态", "键盘协议"], "simple"),
	FN("packages/tui/src/keys.ts", "isKittyProtocolActive", 38, 40, "查询全局 Kitty keyboard protocol 是否处于活动状态。", ["kitty", "状态", "键盘协议"], "simple"),
	FN("packages/tui/src/keys.ts", "isKeyRelease", 527, 551, "判断输入是否为 Kitty 协议的按键释放事件。", ["kitty", "按键事件", "解析"], "simple"),
	FN("packages/tui/src/keys.ts", "isKeyRepeat", 557, 577, "判断输入是否为 Kitty 协议的按键重复事件。", ["kitty", "按键事件", "解析"], "simple"),
	FN("packages/tui/src/keys.ts", "parseKittySequence", 587, 651, "解析 Kitty CSI u 序列，提取 codepoint、修饰键与事件类型。", ["kitty", "csi", "解析"], "moderate"),
	FN("packages/tui/src/keys.ts", "matchesKittySequence", 653, 694, "比较输入是否匹配期望的 Kitty codepoint 与修饰键。", ["kitty", "匹配", "键盘"], "simple"),
	FN("packages/tui/src/keys.ts", "rawCtrlChar", 749, 760, "将字母键映射为对应的 raw Ctrl 控制字符。", ["ctrl", "legacy", "utility"], "simple"),
	FN("packages/tui/src/keys.ts", "formatKeyNameWithModifiers", 776, 786, "把修饰键与主键名格式化为 ctrl+shift+key 形式的 KeyId。", ["格式化", "keyid", "utility"], "simple"),
	FN("packages/tui/src/keys.ts", "parseKeyId", 788, 801, "把 KeyId 字符串拆成修饰键集合与基础键名。", ["解析", "keyid", "utility"], "simple"),
	FN("packages/tui/src/keys.ts", "matchesKey", 820, 1204, "对照 KeyId 匹配原始输入，覆盖 legacy、Kitty 与 modifyOtherKeys 路径。", ["按键匹配", "键盘协议", "核心"], "complex"),
	FN("packages/tui/src/keys.ts", "formatParsedKey", 1212, 1249, "将已解析的 codepoint/修饰键格式化为规范 KeyId。", ["格式化", "keyid", "解析"], "simple"),
	FN("packages/tui/src/keys.ts", "parseKey", 1251, 1327, "把原始输入解析为 KeyId，失败时返回 undefined。", ["按键解析", "键盘协议", "入口"], "moderate"),
	FN("packages/tui/src/keys.ts", "decodeKittyPrintable", 1350, 1383, "从 Kitty 序列解码可打印字符，处理移位字母身份。", ["kitty", "可打印键", "解码"], "simple"),
	FN("packages/tui/src/keys.ts", "decodeModifyOtherKeysPrintable", 1385, 1397, "从 modifyOtherKeys 序列解码可打印字符。", ["modifyOtherKeys", "可打印键", "解码"], "simple"),
	FN("packages/tui/src/keys.ts", "decodePrintableKey", 1399, 1401, "按当前协议状态选择 Kitty 或 modifyOtherKeys 可打印解码。", ["可打印键", "分发", "键盘协议"], "simple"),

	FN("packages/tui/src/latex.ts", "replaceCharacters", 601, 611, "按替换表逐字符改写字符串，用于符号与上下标映射。", ["latex", "字符映射", "utility"], "simple"),
	FN("packages/tui/src/latex.ts", "formatScript", 613, 626, "把内容格式化为上标或下标 Unicode 文本。", ["latex", "上下标", "排版"], "simple"),
	FN("packages/tui/src/latex.ts", "normalizeOutput", 646, 657, "规范化渲染结果中的空白与特殊空字符。", ["latex", "normalization", "utility"], "simple"),
	FN("packages/tui/src/latex.ts", "joinLayouts", 698, 721, "水平拼接多个 layout 片段并按基线对齐。", ["latex", "布局", "排版"], "simple"),
	FN("packages/tui/src/latex.ts", "renderLayout", 723, 809, "把 layout 节点树绘制成等宽多行字符串。", ["latex", "渲染", "布局"], "moderate"),
	FN("packages/tui/src/latex.ts", "renderLatex", 1376, 1394, "解析并渲染 LaTeX 源，导出给 Markdown 等调用方。", ["latex", "入口", "渲染"], "simple"),

	FN("packages/tui/src/layout-node.ts", "getLayoutNode", 48, 51, "若组件实现 LAYOUT_NODE symbol 则返回其布局节点。", ["布局", "组件协议", "introspection"], "simple"),

	FN("packages/tui/src/layout.ts", "renderCached", 68, 81, "按宽度缓存组件 render 结果，避免重复测量。", ["缓存", "渲染", "布局"], "simple"),
	FN("packages/tui/src/layout.ts", "layoutComponent", 106, 247, "递归布局 Stack/Scroll/叶子组件，计算矩形、裁剪与滚动内容。", ["布局", "递归", "核心"], "moderate"),
	FN("packages/tui/src/layout.ts", "replaceScrollbarCell", 249, 278, "在图像行或普通文本行上替换滚动条单元格，尽量保留背景。", ["滚动条", "绘制", "图像行"], "simple"),
	FN("packages/tui/src/layout.ts", "getScrollbarGeometry", 280, 307, "根据滚动状态计算轨道、滑块位置与最大 scrollTop。", ["滚动条", "几何", "hit-test"], "simple"),
	FN("packages/tui/src/layout.ts", "paintScrollbar", 309, 328, "把滚动条轨道与滑块绘制到屏幕行缓冲。", ["滚动条", "绘制", "渲染"], "simple"),
	FN("packages/tui/src/layout.ts", "paintBox", 330, 377, "将布局盒的文本/图像行合成到屏幕，并处理裁剪与 Kitty 行。", ["绘制", "合成", "图像"], "simple"),
	FN("packages/tui/src/layout.ts", "renderLayoutFrame", 379, 408, "对根组件完成一次完整布局并返回 LayoutFrame。", ["布局", "入口", "渲染"], "simple"),
	FN("packages/tui/src/layout.ts", "getLayoutBoxesAt", 415, 425, "收集覆盖指定坐标的布局盒，用于鼠标命中。", ["hit-test", "鼠标", "布局"], "simple"),
	FN("packages/tui/src/layout.ts", "getScrollViewBox", 427, 437, "在布局帧中查找指定 ScrollView 对应的布局盒。", ["滚动", "查找", "布局"], "simple"),
	FN("packages/tui/src/layout.ts", "getScrollViewsAt", 439, 449, "返回指定坐标下的 ScrollView 布局盒列表。", ["滚动", "hit-test", "鼠标"], "simple"),

	FN("packages/tui/src/native-modifiers.ts", "isNativeModifierPressed", 5, 13, "查询原生 helper 报告的修饰键按下状态，失败时返回 false。", ["修饰键", "原生模块", "键盘"], "simple"),

	FN("packages/tui/src/native-module-path.ts", "getNativeModuleCandidates", 14, 31, "生成去重后的原生模块候选路径列表。", ["路径解析", "原生模块", "打包"], "simple"),

	FN("packages/tui/src/native-platform.ts", "loadNativePlatformHelper", 26, 51, "按平台/架构尝试加载预编译 .node helper 并缓存结果。", ["原生模块", "加载", "缓存"], "simple"),
	FN("packages/tui/src/native-platform.ts", "getNativePlatformHelper", 53, 56, "在 macOS/Windows 上返回已加载的原生平台 helper。", ["原生模块", "平台适配", "factory"], "simple"),
	FN("packages/tui/src/native-platform.ts", "getNativeClipboard", 59, 63, "获取剪贴板 helper；Linux 仅在 DISPLAY 存在时加载 X11 变体。", ["剪贴板", "linux", "原生模块"], "simple"),

	FN("packages/tui/src/stdin-buffer.ts", "isCompleteSequence", 31, 80, "判断缓冲数据是否为完整 escape 序列、半包或非 escape。", ["escape-sequence", "完整性", "解析"], "moderate"),
	FN("packages/tui/src/stdin-buffer.ts", "isCompleteCsiSequence", 86, 128, "检测 CSI 序列是否已收到终结符。", ["csi", "escape-sequence", "解析"], "simple"),
	FN("packages/tui/src/stdin-buffer.ts", "isCompleteOscSequence", 134, 145, "检测 OSC 序列是否以 BEL 或 ST 结束。", ["osc", "escape-sequence", "解析"], "simple"),
	FN("packages/tui/src/stdin-buffer.ts", "isCompleteDcsSequence", 152, 163, "检测 DCS 序列是否完整。", ["dcs", "escape-sequence", "解析"], "simple"),
	FN("packages/tui/src/stdin-buffer.ts", "isCompleteApcSequence", 170, 181, "检测 APC 序列是否完整。", ["apc", "escape-sequence", "解析"], "simple"),
	FN("packages/tui/src/stdin-buffer.ts", "extractCompleteSequences", 194, 257, "从缓冲区切出所有已完成序列，留下半包。", ["分帧", "stdin", "escape-sequence"], "moderate"),

	FN("packages/tui/src/terminal-colors.ts", "parseOscHexChannel", 17, 26, "解析 OSC 颜色响应中的单个 hex 通道。", ["颜色", "hex", "解析"], "simple"),
	FN("packages/tui/src/terminal-colors.ts", "isOsc11BackgroundColorResponse", 31, 33, "判断数据是否像 OSC 11 背景色响应。", ["osc11", "颜色", "探测"], "simple"),
	FN("packages/tui/src/terminal-colors.ts", "parseOsc11BackgroundColor", 35, 65, "解析 OSC 11 响应得到 RGB 背景色。", ["osc11", "颜色", "解析"], "simple"),
	FN("packages/tui/src/terminal-colors.ts", "parseTerminalColorSchemeReport", 67, 73, "解析终端 dark/light 配色方案报告。", ["配色", "dark-mode", "解析"], "simple"),

	FN("packages/tui/src/terminal-image.ts", "getCellDimensions", 40, 42, "返回当前单元格像素宽高，默认 9x18。", ["单元格", "图像", "度量"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "setCellDimensions", 44, 46, "更新由终端查询得到的单元格像素尺寸。", ["单元格", "图像", "配置"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "probeTmuxHyperlinks", 53, 67, "探测 tmux 是否转发 OSC 8 超链接。", ["tmux", "hyperlink", "能力探测"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "detectCapabilitiesFromEnvironment", 69, 133, "根据 TERM/环境变量推断图像协议、真彩与超链接能力。", ["能力探测", "环境变量", "图像协议"], "moderate"),
	FN("packages/tui/src/terminal-image.ts", "detectCapabilities", 139, 158, "探测并缓存终端图像相关能力，可叠加覆盖项。", ["能力探测", "缓存", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getCapabilities", 160, 169, "返回已缓存的终端能力，必要时先探测。", ["能力探测", "缓存", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "resetCapabilitiesCache", 171, 173, "清空能力探测缓存以便重新检测。", ["缓存", "能力探测", "重置"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "setCapabilityOverrides", 176, 186, "设置能力覆盖并失效缓存。", ["配置", "能力探测", "覆盖"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "setCapabilities", 189, 191, "直接写入缓存的终端能力对象。", ["配置", "能力探测", "缓存"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "isImageLine", 196, 203, "判断一行是否包含 Kitty/iTerm2 图像占位序列。", ["图像行", "探测", "渲染"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "allocateImageId", 210, 213, "分配递增的 Kitty 图像 ID。", ["kitty", "id", "分配"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "encodeKitty", 215, 259, "把 base64 图像编码为 Kitty 图形协议转义序列。", ["kitty", "编码", "图像协议"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "deleteKittyImage", 265, 267, "生成删除指定 Kitty 图像 ID 的序列。", ["kitty", "清理", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "deleteAllKittyImages", 273, 275, "生成删除全部 Kitty 图像的序列。", ["kitty", "清理", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "deleteAllKittyPlacements", 278, 280, "生成删除全部 Kitty placement 的序列。", ["kitty", "清理", "placement"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "encodeITerm2", 282, 308, "把 base64 图像编码为 iTerm2 内联图像序列。", ["iterm2", "编码", "图像协议"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "registerKittyImageMetadata", 337, 345, "登记一行对应的 Kitty 图像元数据。", ["kitty", "元数据", "注册"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getKittyImageMetadata", 354, 364, "读取一行上登记的 Kitty 图像元数据。", ["kitty", "元数据", "查询"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getKittyImagePlacement", 387, 419, "解析一行中的 Kitty placement 参数。", ["kitty", "placement", "解析"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "cropKittyImageLine", 421, 433, "按可见行裁剪 Kitty 图像行的占位内容。", ["kitty", "裁剪", "滚动"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "calculateImageCellSize", 435, 459, "按最大单元格与纵横比计算图像占用的单元格宽高。", ["度量", "单元格", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "calculateImageRows", 461, 467, "按目标宽度计算图像占用的终端行数。", ["度量", "行数", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getPngDimensions", 469, 488, "从 PNG 头读取像素宽高。", ["png", "尺寸", "解析"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getJpegDimensions", 490, 531, "扫描 JPEG SOF 标记读取像素宽高。", ["jpeg", "尺寸", "解析"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getGifDimensions", 533, 553, "从 GIF 逻辑屏幕描述符读取像素宽高。", ["gif", "尺寸", "解析"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getWebpDimensions", 555, 592, "解析 WebP VP8/VP8L/VP8X 头得到像素宽高。", ["webp", "尺寸", "解析"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "getImageDimensions", 594, 608, "按 MIME 类型分发到对应格式的尺寸解析器。", ["尺寸", "分发", "图像"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "renderImage", 610, 653, "按终端能力选择 Kitty/iTerm2 编码并生成可绘制行。", ["渲染", "图像协议", "入口"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "hyperlink", 665, 667, "用 OSC 8 把文本包成终端超链接。", ["osc8", "hyperlink", "格式化"], "simple"),
	FN("packages/tui/src/terminal-image.ts", "imageFallback", 683, 696, "在不支持图像协议时生成路径/尺寸回退文本。", ["回退", "图像", "文本"], "simple"),

	FN("packages/tui/src/terminal.ts", "parseKeyboardProtocolNegotiationSequence", 20, 31, "识别 Kitty flags 或设备属性响应，用于键盘协议协商。", ["键盘协议", "协商", "解析"], "simple"),
	FN("packages/tui/src/terminal.ts", "isAppleTerminalSession", 37, 39, "判断当前是否为 macOS Apple Terminal。", ["终端探测", "apple-terminal", "平台"], "simple"),
	FN("packages/tui/src/terminal.ts", "refreshTerminalDimensions", 46, 53, "向自身发送 SIGWINCH 以刷新行列尺寸，失败则忽略。", ["窗口尺寸", "sigwinch", "终端"], "simple"),
	FN("packages/tui/src/terminal.ts", "normalizeNativeShiftEnterInput", 55, 62, "把原生 Shift+Enter 序列规范成 Kitty 风格输入。", ["shift-enter", "normalization", "键盘"], "simple"),
	FN("packages/tui/src/terminal.ts", "normalizeAppleTerminalInput", 64, 66, "对 Apple Terminal 输入做平台相关规范化。", ["apple-terminal", "normalization", "键盘"], "simple"),
	FN("packages/tui/src/terminal.ts", "resolveEscapeTimeoutMs", 123, 132, "按终端类型解析 stdin escape 超时毫秒数。", ["超时", "escape", "配置"], "simple"),

	FN("packages/tui/src/tui-main-screen.ts", "parseKittyImageHeader", 81, 99, "解析主屏幕行里的 Kitty 图像头字段。", ["kitty", "解析", "图像"], "simple"),

	FN("packages/tui/src/tui.ts", "dispatchMouseEvent", 81, 98, "向组件分发鼠标事件并记录命中目标与坐标变换。", ["鼠标", "分发", "组件"], "simple"),
	FN("packages/tui/src/tui.ts", "retargetMouseEvent", 101, 109, "把已有鼠标事件改写到新目标组件的局部坐标。", ["鼠标", "坐标变换", "分发"], "simple"),
	FN("packages/tui/src/tui.ts", "isFocusable", 158, 160, "判断组件是否声明了可聚焦能力。", ["焦点", "组件", "introspection"], "simple"),
	FN("packages/tui/src/tui.ts", "parseSizeValue", 200, 209, "把数字或百分比尺寸解析为相对参考值的像素/单元格。", ["尺寸", "布局", "解析"], "simple"),
	FN("packages/tui/src/tui.ts", "compositeTuiLine", 387, 416, "把 overlay 行按列宽合成到基线上，正确处理图像行与 ANSI。", ["合成", "overlay", "渲染"], "simple"),
	FN("packages/tui/src/tui.ts", "isViewportTUI", 461, 463, "判断实例是否为带 VIEWPORT_TUI 标记的备用屏幕 TUI。", ["viewport", "introspection", "类型守卫"], "simple"),

	FN("packages/tui/src/utils.ts", "getGraphemeSegmenter", 10, 12, "返回共享的 Intl.Segmenter grapheme 实例。", ["grapheme", "segmenter", "singleton"], "simple"),
	FN("packages/tui/src/utils.ts", "getWordSegmenter", 17, 19, "返回共享的 Intl.Segmenter word 实例。", ["分词", "segmenter", "singleton"], "simple"),
	FN("packages/tui/src/utils.ts", "couldBeEmoji", 27, 37, "用 Unicode 区块启发式判断片段是否可能是 emoji。", ["emoji", "启发式", "宽度"], "simple"),
	FN("packages/tui/src/utils.ts", "truncateFragmentToWidth", 67, 145, "按可见列宽截断文本片段，处理宽字符与 ANSI。", ["截断", "宽度", "ansi"], "moderate"),
	FN("packages/tui/src/utils.ts", "finalizeTruncatedResult", 147, 167, "为截断结果补上省略号与可选右填充。", ["截断", "格式化", "宽度"], "simple"),
	FN("packages/tui/src/utils.ts", "graphemeWidth", 174, 235, "计算单个 grapheme 的终端单元格宽度，含 CJK 与 emoji。", ["宽度", "grapheme", "cjk"], "moderate"),
	FN("packages/tui/src/utils.ts", "visibleWidth", 240, 295, "计算含 ANSI 的字符串可见列宽。", ["宽度", "ansi", "度量"], "moderate"),
	FN("packages/tui/src/utils.ts", "stripTerminalSequences", 298, 312, "剥除 ANSI/OSC 等终端序列，留下纯文本。", ["ansi", "剥离", "utility"], "simple"),
	FN("packages/tui/src/utils.ts", "getGraphemeCellRange", 320, 341, "返回覆盖指定列的 grapheme 列区间。", ["grapheme", "列", "选区"], "simple"),
	FN("packages/tui/src/utils.ts", "getOsc8LinkAtColumn", 344, 366, "查找指定列上的 OSC 8 超链接 URL。", ["osc8", "hyperlink", "命中"], "simple"),
	FN("packages/tui/src/utils.ts", "normalizeTerminalOutput", 379, 401, "规范化终端输出中的控制字符与序列边界。", ["normalization", "终端输出", "ansi"], "simple"),
	FN("packages/tui/src/utils.ts", "extractAnsiCode", 406, 444, "从位置处提取一段完整 ANSI/OSC 转义码。", ["ansi", "解析", "转义"], "simple"),
	FN("packages/tui/src/utils.ts", "parseOsc8Hyperlink", 454, 472, "解析 OSC 8 超链接参数与 URL。", ["osc8", "hyperlink", "解析"], "simple"),
	FN("packages/tui/src/utils.ts", "getActiveOsc8Close", 482, 502, "根据前缀推断关闭当前 OSC 8 链接所需的序列。", ["osc8", "状态", "ansi"], "simple"),
	FN("packages/tui/src/utils.ts", "updateTrackerFromText", 733, 744, "用文本驱动 AnsiCodeTracker 前进并更新活动码。", ["ansi", "状态机", "tracker"], "simple"),
	FN("packages/tui/src/utils.ts", "getActiveBackgroundAnsi", 747, 751, "提取文本末尾仍然生效的背景色 ANSI。", ["背景色", "ansi", "状态"], "simple"),
	FN("packages/tui/src/utils.ts", "splitIntoTokensWithAnsi", 756, 830, "把带 ANSI 的文本拆成保留样式的 token 序列。", ["分词", "ansi", "换行"], "moderate"),
	FN("packages/tui/src/utils.ts", "wrapTextWithAnsi", 843, 866, "按宽度对带 ANSI 的文本自动换行。", ["换行", "ansi", "排版"], "simple"),
	FN("packages/tui/src/utils.ts", "wrapSingleLine", 868, 947, "对单行做按词/按宽折行，并延续 ANSI 状态。", ["换行", "ansi", "排版"], "moderate"),
	FN("packages/tui/src/utils.ts", "isWhitespaceChar", 954, 956, "判断字符是否为空白。", ["空白", "字符分类", "utility"], "simple"),
	FN("packages/tui/src/utils.ts", "isPunctuationChar", 961, 963, "判断字符是否为标点。", ["标点", "字符分类", "utility"], "simple"),
	FN("packages/tui/src/utils.ts", "breakLongWord", 965, 1032, "把超宽单词按单元格宽度切开并保留 ANSI。", ["换行", "长词", "ansi"], "moderate"),
	FN("packages/tui/src/utils.ts", "applyBackgroundToLine", 1042, 1051, "把背景色函数应用到整行可见宽度。", ["背景色", "绘制", "ansi"], "simple"),
	FN("packages/tui/src/utils.ts", "truncateToWidth", 1064, 1200, "按可见列宽截断整行，处理图像行、链接与填充。", ["截断", "宽度", "核心"], "moderate"),
	FN("packages/tui/src/utils.ts", "sliceByColumn", 1206, 1208, "按起始列与长度切片一行，委托 sliceWithWidth。", ["切片", "列", "utility"], "simple"),
	FN("packages/tui/src/utils.ts", "sliceWithWidth", 1211, 1256, "按列范围切片并重放必要的 ANSI 前缀/重置。", ["切片", "ansi", "列"], "simple"),
	FN("packages/tui/src/utils.ts", "extractSegments", 1266, 1337, "从一行抽出前中后三段，供 overlay 合成使用。", ["切片", "合成", "ansi"], "moderate"),

	FN("packages/tui/src/word-navigation.ts", "findWordBackward", 22, 70, "从光标向左跳过空白后停在上一词或标点边界。", ["词导航", "光标", "后退"], "simple"),
	FN("packages/tui/src/word-navigation.ts", "findWordForward", 78, 117, "从光标向右跳到下一词或标点边界。", ["词导航", "光标", "前进"], "simple"),
];

const classes = [
	CLS("packages/tui/src/keybindings.ts", "KeybindingsManager", 231, 307, "管理默认与用户快捷键，重建查找表并检测冲突，用 matchesKey 匹配输入。", ["快捷键", "注册表", "冲突检测"], "moderate"),
	CLS("packages/tui/src/kill-ring.ts", "KillRing", 8, 46, "保存被删除文本的环形缓冲，支持累积 kill 与 rotate yank-pop。", ["剪贴历史", "环形缓冲", "编辑器"], "simple"),
	CLS("packages/tui/src/latex.ts", "LatexParser", 811, 1365, "递归解析 LaTeX 命令、环境与参数，并生成可渲染的 layout 节点。", ["latex", "解析器", "递归下降"], "complex", "手写递归下降解析器，覆盖 command、environment 与嵌套参数。"),
	CLS("packages/tui/src/stdin-buffer.ts", "StdinBuffer", 281, 444, "积累 stdin 分片，按超时刷新半包，并向监听者发出完整序列。", ["输入缓冲", "event-emitter", "stdin"], "moderate"),
	CLS("packages/tui/src/terminal.ts", "ProcessTerminal", 137, 547, "进程 stdin/stdout 终端实现：键盘协议协商、原始模式、光标与进度写入。", ["终端", "I/O", "键盘协议"], "complex"),
	CLS("packages/tui/src/tui-alt-screen.ts", "TuiAltScreen", 195, 1721, "全屏 ViewportTUI：滚动视口、选区复制、搜索、滚动条拖拽与差分绘制。", ["备用屏幕", "viewport", "鼠标", "渲染"], "complex"),
	CLS("packages/tui/src/tui-main-screen.ts", "BoundedTerminalWriter", 18, 74, "限制单次写入字符数的终端 writer，避免主屏幕突发输出过大。", ["写入缓冲", "限流", "终端"], "simple"),
	CLS("packages/tui/src/tui-main-screen.ts", "TuiMainScreen", 124, 655, "主屏幕 TUI：差分重绘已输出行，并清理变更范围内的 Kitty 图像。", ["主屏幕", "差分渲染", "kitty"], "complex"),
	CLS("packages/tui/src/tui.ts", "Container", 319, 379, "可嵌套子组件容器，负责增删、失效与鼠标向下分发。", ["容器", "组件", "鼠标"], "moderate"),
	CLS("packages/tui/src/tui.ts", "TuiBase", 465, 1456, "TUI 基类：终端生命周期、渲染调度、叠加层焦点与颜色/单元格查询。", ["基类", "渲染循环", "焦点", "overlay"], "complex"),
	CLS("packages/tui/src/undo-stack.ts", "UndoStack", 7, 28, "泛型撤销栈，push 深拷贝快照，pop 返回已分离状态。", ["撤销", "快照", "泛型"], "simple"),
	CLS("packages/tui/src/utils.ts", "AnsiCodeTracker", 507, 731, "扫描文本维护当前 ANSI 样式、颜色与 OSC 8 超链接状态。", ["ansi", "状态机", "样式"], "moderate"),
];

const exportedNames = {
	"packages/tui/src/fuzzy.ts": ["fuzzyMatch", "fuzzyFilter"],
	"packages/tui/src/keybindings.ts": ["KeybindingsManager", "setKeybindings", "getKeybindings"],
	"packages/tui/src/keys.ts": [
		"setKittyProtocolActive",
		"isKittyProtocolActive",
		"isKeyRelease",
		"isKeyRepeat",
		"matchesKey",
		"parseKey",
		"decodeKittyPrintable",
		"decodePrintableKey",
	],
	"packages/tui/src/kill-ring.ts": ["KillRing"],
	"packages/tui/src/latex.ts": ["renderLatex"],
	"packages/tui/src/layout-node.ts": ["getLayoutNode"],
	"packages/tui/src/layout.ts": [
		"getScrollbarGeometry",
		"renderLayoutFrame",
		"getLayoutBoxesAt",
		"getScrollViewBox",
		"getScrollViewsAt",
	],
	"packages/tui/src/native-modifiers.ts": ["isNativeModifierPressed"],
	"packages/tui/src/native-module-path.ts": ["getNativeModuleCandidates"],
	"packages/tui/src/native-platform.ts": ["getNativePlatformHelper", "getNativeClipboard"],
	"packages/tui/src/stdin-buffer.ts": ["StdinBuffer"],
	"packages/tui/src/terminal-colors.ts": [
		"isOsc11BackgroundColorResponse",
		"parseOsc11BackgroundColor",
		"parseTerminalColorSchemeReport",
	],
	"packages/tui/src/terminal-image.ts": [
		"getCellDimensions",
		"setCellDimensions",
		"detectCapabilities",
		"getCapabilities",
		"resetCapabilitiesCache",
		"setCapabilityOverrides",
		"setCapabilities",
		"isImageLine",
		"allocateImageId",
		"encodeKitty",
		"deleteKittyImage",
		"deleteAllKittyImages",
		"deleteAllKittyPlacements",
		"encodeITerm2",
		"registerKittyImageMetadata",
		"getKittyImageMetadata",
		"getKittyImagePlacement",
		"cropKittyImageLine",
		"calculateImageCellSize",
		"calculateImageRows",
		"getPngDimensions",
		"getJpegDimensions",
		"getGifDimensions",
		"getWebpDimensions",
		"getImageDimensions",
		"renderImage",
		"hyperlink",
		"imageFallback",
	],
	"packages/tui/src/terminal.ts": [
		"parseKeyboardProtocolNegotiationSequence",
		"isAppleTerminalSession",
		"refreshTerminalDimensions",
		"normalizeNativeShiftEnterInput",
		"normalizeAppleTerminalInput",
		"resolveEscapeTimeoutMs",
		"ProcessTerminal",
	],
	"packages/tui/src/tui-alt-screen.ts": ["TuiAltScreen"],
	"packages/tui/src/tui-main-screen.ts": ["TuiMainScreen"],
	"packages/tui/src/tui.ts": [
		"dispatchMouseEvent",
		"retargetMouseEvent",
		"isFocusable",
		"compositeTuiLine",
		"isViewportTUI",
		"Container",
		"TuiBase",
	],
	"packages/tui/src/undo-stack.ts": ["UndoStack"],
	"packages/tui/src/utils.ts": [
		"getGraphemeSegmenter",
		"getWordSegmenter",
		"visibleWidth",
		"stripTerminalSequences",
		"getGraphemeCellRange",
		"getOsc8LinkAtColumn",
		"normalizeTerminalOutput",
		"extractAnsiCode",
		"getActiveBackgroundAnsi",
		"wrapTextWithAnsi",
		"isWhitespaceChar",
		"isPunctuationChar",
		"applyBackgroundToLine",
		"truncateToWidth",
		"sliceByColumn",
		"sliceWithWidth",
		"extractSegments",
	],
	"packages/tui/src/word-navigation.ts": ["findWordBackward", "findWordForward"],
};

const batchImportData = {
	"packages/tui/src/fuzzy.ts": [],
	"packages/tui/src/keybindings.ts": ["packages/tui/src/keys.ts"],
	"packages/tui/src/keys.ts": [],
	"packages/tui/src/kill-ring.ts": [],
	"packages/tui/src/latex.ts": ["packages/tui/src/utils.ts"],
	"packages/tui/src/layout-node.ts": ["packages/tui/src/tui.ts"],
	"packages/tui/src/layout.ts": [
		"packages/tui/src/components/scroll-view.ts",
		"packages/tui/src/components/stack.ts",
		"packages/tui/src/layout-node.ts",
		"packages/tui/src/terminal-image.ts",
		"packages/tui/src/tui.ts",
		"packages/tui/src/utils.ts",
	],
	"packages/tui/src/native-modifiers.ts": ["packages/tui/src/native-platform.ts"],
	"packages/tui/src/native-module-path.ts": [],
	"packages/tui/src/native-platform.ts": ["packages/tui/src/native-module-path.ts"],
	"packages/tui/src/stdin-buffer.ts": [],
	"packages/tui/src/terminal-colors.ts": [],
	"packages/tui/src/terminal-image.ts": [],
	"packages/tui/src/terminal.ts": [
		"packages/tui/src/keys.ts",
		"packages/tui/src/native-modifiers.ts",
		"packages/tui/src/native-platform.ts",
		"packages/tui/src/stdin-buffer.ts",
	],
	"packages/tui/src/tui-alt-screen.ts": [
		"packages/tui/src/alt-screen-search.ts",
		"packages/tui/src/components/alt-screen-flash.ts",
		"packages/tui/src/components/scroll-view.ts",
		"packages/tui/src/keybindings.ts",
		"packages/tui/src/keys.ts",
		"packages/tui/src/layout-node.ts",
		"packages/tui/src/layout.ts",
		"packages/tui/src/terminal-image.ts",
		"packages/tui/src/terminal.ts",
		"packages/tui/src/tui.ts",
		"packages/tui/src/utils.ts",
	],
	"packages/tui/src/tui-main-screen.ts": [
		"packages/tui/src/terminal-image.ts",
		"packages/tui/src/tui.ts",
		"packages/tui/src/utils.ts",
	],
	"packages/tui/src/tui.ts": [
		"packages/tui/src/keys.ts",
		"packages/tui/src/terminal-colors.ts",
		"packages/tui/src/terminal-image.ts",
		"packages/tui/src/terminal.ts",
		"packages/tui/src/utils.ts",
	],
	"packages/tui/src/undo-stack.ts": [],
	"packages/tui/src/utils.ts": [],
	"packages/tui/src/word-navigation.ts": ["packages/tui/src/utils.ts"],
};

const neighborMap = {
	"packages/tui/src/fuzzy.ts": ["packages/tui/src/autocomplete.ts", "packages/tui/src/components/settings-list.ts"],
	"packages/tui/src/keybindings.ts": [
		"packages/tui/src/alt-screen-search.ts",
		"packages/tui/src/components/cancellable-loader.ts",
		"packages/tui/src/components/editor.ts",
		"packages/tui/src/components/input.ts",
		"packages/tui/src/components/select-list.ts",
		"packages/tui/src/components/settings-list.ts",
	],
	"packages/tui/src/keys.ts": ["packages/tui/src/components/editor.ts", "packages/tui/src/components/input.ts"],
	"packages/tui/src/kill-ring.ts": ["packages/tui/src/components/editor.ts", "packages/tui/src/components/input.ts"],
	"packages/tui/src/latex.ts": ["packages/tui/src/components/markdown.ts"],
	"packages/tui/src/layout-node.ts": ["packages/tui/src/components/scroll-view.ts", "packages/tui/src/components/stack.ts"],
	"packages/tui/src/layout.ts": ["packages/tui/src/components/scroll-view.ts", "packages/tui/src/components/stack.ts"],
	"packages/tui/src/terminal-image.ts": ["packages/tui/src/components/image.ts", "packages/tui/src/components/markdown.ts"],
	"packages/tui/src/tui-alt-screen.ts": [
		"packages/tui/src/alt-screen-search.ts",
		"packages/tui/src/components/alt-screen-flash.ts",
		"packages/tui/src/components/scroll-view.ts",
	],
	"packages/tui/src/tui.ts": [
		"packages/tui/src/alt-screen-search.ts",
		"packages/tui/src/components/alt-screen-flash.ts",
		"packages/tui/src/components/box.ts",
		"packages/tui/src/components/editor.ts",
		"packages/tui/src/components/h-stack.ts",
		"packages/tui/src/components/image.ts",
		"packages/tui/src/components/input.ts",
		"packages/tui/src/components/loader.ts",
		"packages/tui/src/components/markdown.ts",
		"packages/tui/src/components/mouse-region.ts",
		"packages/tui/src/components/scroll-view.ts",
		"packages/tui/src/components/select-list.ts",
		"packages/tui/src/components/settings-list.ts",
		"packages/tui/src/components/spacer.ts",
		"packages/tui/src/components/stack.ts",
		"packages/tui/src/components/text.ts",
		"packages/tui/src/components/truncated-text.ts",
		"packages/tui/src/editor-component.ts",
	],
	"packages/tui/src/undo-stack.ts": ["packages/tui/src/components/editor.ts", "packages/tui/src/components/input.ts"],
	"packages/tui/src/utils.ts": [
		"packages/tui/src/alt-screen-search.ts",
		"packages/tui/src/components/alt-screen-flash.ts",
		"packages/tui/src/components/box.ts",
		"packages/tui/src/components/editor.ts",
		"packages/tui/src/components/h-stack.ts",
		"packages/tui/src/components/image.ts",
		"packages/tui/src/components/input.ts",
		"packages/tui/src/components/markdown.ts",
		"packages/tui/src/components/select-list.ts",
		"packages/tui/src/components/settings-list.ts",
		"packages/tui/src/components/text.ts",
		"packages/tui/src/components/truncated-text.ts",
	],
	"packages/tui/src/word-navigation.ts": ["packages/tui/src/components/editor.ts", "packages/tui/src/components/input.ts"],
};

const neighborSymbols = {
	"packages/tui/src/components/stack.ts": ["visibleStackEntries", "allocateStackSizes", "Stack"],
	"packages/tui/src/alt-screen-search.ts": ["getAltScreenSearchMatchKey"],
};

function edge(source, target, type, weight) {
	return { source, target, type, direction: "forward", weight };
}

const nodes = [...files, ...functions, ...classes];
const nodeIds = new Set(nodes.map((n) => n.id));
const edges = [];

for (const [filePath, targets] of Object.entries(batchImportData)) {
	for (const target of targets) {
		edges.push(edge(`file:${filePath}`, `file:${target}`, "imports", 0.7));
	}
}

for (const n of [...functions, ...classes]) {
	edges.push(edge(`file:${n.filePath}`, n.id, "contains", 1.0));
	const exported = exportedNames[n.filePath] || [];
	if (exported.includes(n.name)) {
		edges.push(edge(`file:${n.filePath}`, n.id, "exports", 0.8));
	}
}

const calls = [
	["class:packages/tui/src/keybindings.ts:KeybindingsManager", "function:packages/tui/src/keys.ts:matchesKey"],
	["function:packages/tui/src/latex.ts:renderLayout", "function:packages/tui/src/utils.ts:visibleWidth"],
	["class:packages/tui/src/latex.ts:LatexParser", "function:packages/tui/src/utils.ts:visibleWidth"],
	["function:packages/tui/src/layout.ts:layoutComponent", "function:packages/tui/src/layout-node.ts:getLayoutNode"],
	["function:packages/tui/src/layout.ts:layoutComponent", "function:packages/tui/src/components/stack.ts:visibleStackEntries"],
	["function:packages/tui/src/layout.ts:layoutComponent", "function:packages/tui/src/components/stack.ts:allocateStackSizes"],
	["function:packages/tui/src/layout.ts:replaceScrollbarCell", "function:packages/tui/src/terminal-image.ts:isImageLine"],
	["function:packages/tui/src/layout.ts:replaceScrollbarCell", "function:packages/tui/src/utils.ts:getGraphemeCellRange"],
	["function:packages/tui/src/layout.ts:replaceScrollbarCell", "function:packages/tui/src/utils.ts:sliceByColumn"],
	["function:packages/tui/src/layout.ts:replaceScrollbarCell", "function:packages/tui/src/utils.ts:extractAnsiCode"],
	["function:packages/tui/src/layout.ts:replaceScrollbarCell", "function:packages/tui/src/utils.ts:visibleWidth"],
	["function:packages/tui/src/layout.ts:replaceScrollbarCell", "function:packages/tui/src/utils.ts:getActiveBackgroundAnsi"],
	["function:packages/tui/src/layout.ts:paintBox", "function:packages/tui/src/terminal-image.ts:getKittyImageMetadata"],
	["function:packages/tui/src/layout.ts:paintBox", "function:packages/tui/src/terminal-image.ts:cropKittyImageLine"],
	["function:packages/tui/src/layout.ts:paintBox", "function:packages/tui/src/terminal-image.ts:isImageLine"],
	["function:packages/tui/src/layout.ts:paintBox", "function:packages/tui/src/tui.ts:compositeTuiLine"],
	["function:packages/tui/src/native-modifiers.ts:isNativeModifierPressed", "function:packages/tui/src/native-platform.ts:getNativePlatformHelper"],
	["function:packages/tui/src/native-platform.ts:loadNativePlatformHelper", "function:packages/tui/src/native-module-path.ts:getNativeModuleCandidates"],
	["class:packages/tui/src/terminal.ts:ProcessTerminal", "function:packages/tui/src/keys.ts:setKittyProtocolActive"],
	["class:packages/tui/src/terminal.ts:ProcessTerminal", "function:packages/tui/src/native-modifiers.ts:isNativeModifierPressed"],
	["class:packages/tui/src/terminal.ts:ProcessTerminal", "function:packages/tui/src/native-platform.ts:getNativePlatformHelper"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:getCapabilities"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:setCapabilities"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:isImageLine"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:visibleWidth"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:sliceByColumn"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:deleteAllKittyImages"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:getKittyImagePlacement"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:deleteKittyImage"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/layout.ts:getScrollViewBox"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/alt-screen-search.ts:getAltScreenSearchMatchKey"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/keybindings.ts:getKeybindings"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/keys.ts:isKeyRelease"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/layout.ts:getLayoutBoxesAt"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/layout-node.ts:getLayoutNode"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/tui.ts:dispatchMouseEvent"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/tui.ts:retargetMouseEvent"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/layout.ts:getScrollViewsAt"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/layout.ts:getScrollbarGeometry"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:stripTerminalSequences"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:getOsc8LinkAtColumn"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:getGraphemeCellRange"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:extractAnsiCode"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/utils.ts:truncateToWidth"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/tui.ts:compositeTuiLine"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/layout.ts:renderLayoutFrame"],
	["class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "function:packages/tui/src/terminal-image.ts:deleteAllKittyPlacements"],
	["class:packages/tui/src/tui-main-screen.ts:TuiMainScreen", "function:packages/tui/src/terminal-image.ts:isImageLine"],
	["class:packages/tui/src/tui-main-screen.ts:TuiMainScreen", "function:packages/tui/src/terminal-image.ts:deleteKittyImage"],
	["class:packages/tui/src/tui-main-screen.ts:TuiMainScreen", "function:packages/tui/src/utils.ts:visibleWidth"],
	["function:packages/tui/src/tui.ts:compositeTuiLine", "function:packages/tui/src/terminal-image.ts:isImageLine"],
	["function:packages/tui/src/tui.ts:compositeTuiLine", "function:packages/tui/src/utils.ts:extractSegments"],
	["function:packages/tui/src/tui.ts:compositeTuiLine", "function:packages/tui/src/utils.ts:sliceWithWidth"],
	["function:packages/tui/src/tui.ts:compositeTuiLine", "function:packages/tui/src/utils.ts:visibleWidth"],
	["function:packages/tui/src/tui.ts:compositeTuiLine", "function:packages/tui/src/utils.ts:sliceByColumn"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/terminal-image.ts:getCapabilities"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/keys.ts:matchesKey"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/keys.ts:isKeyRelease"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/terminal-colors.ts:isOsc11BackgroundColorResponse"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/terminal-colors.ts:parseOsc11BackgroundColor"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/terminal-colors.ts:parseTerminalColorSchemeReport"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/terminal-image.ts:setCellDimensions"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/utils.ts:visibleWidth"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/utils.ts:sliceByColumn"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/terminal-image.ts:isImageLine"],
	["class:packages/tui/src/tui.ts:TuiBase", "function:packages/tui/src/utils.ts:normalizeTerminalOutput"],
	["function:packages/tui/src/word-navigation.ts:findWordBackward", "function:packages/tui/src/utils.ts:isWhitespaceChar"],
	["function:packages/tui/src/word-navigation.ts:findWordForward", "function:packages/tui/src/utils.ts:isWhitespaceChar"],
];

for (const [source, target] of calls) {
	edges.push(edge(source, target, "calls", 0.8));
}

edges.push(edge("class:packages/tui/src/tui-alt-screen.ts:TuiAltScreen", "class:packages/tui/src/tui.ts:TuiBase", "inherits", 0.9));
edges.push(edge("class:packages/tui/src/tui-main-screen.ts:TuiMainScreen", "class:packages/tui/src/tui.ts:TuiBase", "inherits", 0.9));

const importCount = Object.values(batchImportData).reduce((n, a) => n + a.length, 0);
const actualImports = edges.filter((e) => e.type === "imports").length;
if (actualImports !== importCount) {
	throw new Error(`imports mismatch: ${actualImports} !== ${importCount}`);
}

const ids = nodes.map((n) => n.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) throw new Error(`duplicate ids: ${dup.join(", ")}`);

const filePaths = [...new Set(files.map((f) => f.filePath))].sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;
let parts = nodeCount <= 60 && edgeCount <= 120 ? 1 : Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
const chunkSize = Math.ceil(filePaths.length / parts);
const groups = [];
for (let i = 0; i < filePaths.length; i += chunkSize) {
	groups.push(filePaths.slice(i, i + chunkSize));
}

const knownFiles = new Set([
	...filePaths,
	...Object.values(batchImportData).flat(),
	...Object.values(neighborMap).flat(),
]);

function edgeOk(e, partNodeIds) {
	if (partNodeIds.has(e.source) && (partNodeIds.has(e.target) || nodeIds.has(e.target))) {
		if (partNodeIds.has(e.target) || e.target.startsWith("file:") || e.target.startsWith("function:") || e.target.startsWith("class:")) {
			// source must be in this part
		}
	}
	if (!partNodeIds.has(e.source)) return false;
	if (partNodeIds.has(e.target) || nodeIds.has(e.target)) return true;
	if (e.target.startsWith("file:")) {
		return knownFiles.has(e.target.slice("file:".length));
	}
	const m = e.target.match(/^(function|class):(.+):([^:]+)$/);
	if (m) {
		const path = m[2];
		const symbol = m[3];
		if (knownFiles.has(path)) return true;
		const symbols = neighborSymbols[path];
		return Boolean(symbols && symbols.includes(symbol));
	}
	return false;
}

const outDir = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua/intermediate";
const written = [];
for (let i = 0; i < groups.length; i++) {
	const partFiles = new Set(groups[i]);
	const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
	const partIds = new Set(partNodes.map((n) => n.id));
	const partEdges = edges.filter((e) => partIds.has(e.source));
	const bad = partEdges.filter((e) => !edgeOk(e, partIds));
	if (bad.length) {
		console.error("VALIDATION FAIL part", i + 1, bad);
		throw new Error(`part ${i + 1} validation failed: ${bad.length} edges`);
	}
	const payload = { nodes: partNodes, edges: partEdges };
	const name = groups.length === 1 ? "batch-22.json" : `batch-22-part-${i + 1}.json`;
	const dest = `${outDir}/${name}`;
	writeFileSync(dest, JSON.stringify(payload, null, 2) + "\n");
	written.push({ name, nodes: partNodes.length, edges: partEdges.length, files: groups[i] });
}

console.log(JSON.stringify({ nodeCount, edgeCount, parts: groups.length, importCount, written }, null, 2));
