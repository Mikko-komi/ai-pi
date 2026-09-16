import fs from "node:fs";
import path from "node:path";

const UA_DIR = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua";
const brief = JSON.parse(fs.readFileSync(path.join(UA_DIR, "intermediate/batch-briefs/batch-20.json"), "utf8"));
const extract = JSON.parse(fs.readFileSync(path.join(UA_DIR, "tmp/ua-file-extract-results-20.json"), "utf8"));

const FILE_META = {
	"packages/tui/src/alt-screen-search.ts": {
		summary: "备用屏幕搜索：把终端行编成可检索语料，定位匹配并渲染带导航按钮的查询栏。",
		tags: ["component", "search", "alt-screen"],
		complexity: "complex",
		languageNotes: "用 grapheme segmenter 把 ANSI 行映射回行列，避免宽字符与转义序列错位。",
	},
	"packages/tui/src/autocomplete.ts": {
		summary: "组合自动补全：斜杠命令 fuzzy 过滤，以及路径/@ 引用的目录与 fd 模糊文件建议。",
		tags: ["autocomplete", "service", "file-search"],
		complexity: "complex",
		languageNotes: "通过 spawn fd 做可取消的文件系统遍历，超时或 abort 时回退到同步 readdir。",
	},
	"packages/tui/src/components/alt-screen-flash.ts": {
		summary: "备用屏幕短暂闪现容器：按超时叠加提示行，用 requestRender 刷新后自动移除。",
		tags: ["component", "alt-screen", "notification"],
		complexity: "simple",
	},
	"packages/tui/src/components/box.ts": {
		summary: "带 padding 与背景的容器：缓存子组件行、转发鼠标事件，并用背景函数铺满空白。",
		tags: ["component", "container", "layout"],
		complexity: "moderate",
	},
	"packages/tui/src/components/cancellable-loader.ts": {
		summary: "可取消 Loader：Escape 触发 AbortController，把 signal 交给异步任务。",
		tags: ["component", "loader", "cancellation"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts": {
		summary: "多行 TUI 编辑器：视觉换行、历史、yank/undo、粘贴标记，以及斜杠/文件自动补全下拉。",
		tags: ["component", "editor", "autocomplete"],
		complexity: "complex",
		languageNotes: "粘贴大文本收成 [paste #n] 标记，用自定义 segmenter 保证光标与回绕按 grapheme 计算。",
	},
	"packages/tui/src/components/h-stack.ts": {
		summary: "水平 Stack：按 grow/shrink 分配列宽，用 compositeTuiLine 把子组件拼到同一行。",
		tags: ["component", "layout", "stack"],
		complexity: "simple",
	},
	"packages/tui/src/components/image.ts": {
		summary: "终端图片组件：探测尺寸、分配 Kitty 图像 id，并按终端宽度渲染协议序列。",
		tags: ["component", "image", "terminal"],
		complexity: "moderate",
	},
	"packages/tui/src/components/input.ts": {
		summary: "单行输入：括号粘贴、emacs 风格删除/yank/undo、单词跳转，以及带光标标记的渲染。",
		tags: ["component", "input", "editor"],
		complexity: "complex",
	},
	"packages/tui/src/components/loader.ts": {
		summary: "基于 Text 的加载指示器：定时切换 spinner 帧，并刷新消息与颜色。",
		tags: ["component", "loader", "animation"],
		complexity: "moderate",
	},
	"packages/tui/src/components/markdown.ts": {
		summary: "终端 Markdown 渲染：扩展 marked 以支持 LaTeX、严格删除线、表格折行与 OSC 8 链接。",
		tags: ["component", "markdown", "rendering"],
		complexity: "complex",
		languageNotes: "自定义 Tokenizer 解析 $ / $$，渲染时走 renderLatex，并保护 Kitty 图像行不被 wrap。",
	},
	"packages/tui/src/components/mouse-region.ts": {
		summary: "鼠标区域包装器：原样渲染子组件，并把命中的鼠标事件回调给 onMouse。",
		tags: ["component", "event-handler", "mouse"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts": {
		summary: "可滚动容器：跟随底部、瞬时滚动条、overscroll 链式传递，并向布局系统暴露 ScrollLayoutNode。",
		tags: ["component", "container", "scroll"],
		complexity: "moderate",
	},
	"packages/tui/src/components/select-list.ts": {
		summary: "可过滤选择列表：键盘/鼠标改选，主列截断与滚动窗口，选中时回调 onSelect。",
		tags: ["component", "select", "list"],
		complexity: "complex",
	},
	"packages/tui/src/components/settings-list.ts": {
		summary: "设置列表：fuzzy 搜索、子菜单与 Input 过滤，激活项时写回 onChange。",
		tags: ["component", "settings", "list"],
		complexity: "complex",
	},
	"packages/tui/src/components/spacer.ts": {
		summary: "空白占位组件：按指定行数输出空行，用于撑开垂直布局。",
		tags: ["component", "layout", "spacer"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts": {
		summary: "抽象 Stack：维护带 basis/grow/shrink 的子项，并导出可见项过滤与尺寸分配算法。",
		tags: ["component", "layout", "stack"],
		complexity: "moderate",
		languageNotes: "allocateStackSizes 先按 basis 占位，再把剩余/不足空间按 grow/shrink 权重分配。",
	},
	"packages/tui/src/components/text.ts": {
		summary: "文本组件：ANSI 感知折行、可选背景函数，以及水平/垂直 padding。",
		tags: ["component", "text", "rendering"],
		complexity: "moderate",
	},
	"packages/tui/src/components/truncated-text.ts": {
		summary: "单行截断文本：按可见列宽 truncate，并保留 padding 与首行内容。",
		tags: ["component", "text", "truncation"],
		complexity: "simple",
	},
	"packages/tui/src/components/v-stack.ts": {
		summary: "垂直 Stack：按分配高度切片子组件输出，并在子项之间插入 gap 空行。",
		tags: ["component", "layout", "stack"],
		complexity: "simple",
	},
	"packages/tui/src/editor-component.ts": {
		summary: "自定义编辑器接口：规定文本读写、提交回调、历史与自动补全等扩展点。",
		tags: ["type-definition", "editor", "extension"],
		complexity: "simple",
		languageNotes: "仅导出 TypeScript interface，无运行时实现。",
	},
};

const CLASS_META = {
	"packages/tui/src/alt-screen-search.ts:AltScreenSearchIndex": {
		summary: "缓存备用屏幕语料与查询结果，query 变化时重建匹配列表。",
		tags: ["search", "index", "cache"],
		complexity: "simple",
	},
	"packages/tui/src/alt-screen-search.ts:AltScreenSearchComponent": {
		summary: "搜索栏 UI：嵌入 Input、显示结果计数，并处理上/下一条命中按钮。",
		tags: ["component", "search", "input"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:CombinedAutocompleteProvider": {
		summary: "实现 AutocompleteProvider：命令补全、@ 路径与 fd 模糊文件建议，并写回补全文本。",
		tags: ["autocomplete", "provider", "file-search"],
		complexity: "complex",
	},
	"packages/tui/src/components/alt-screen-flash.ts:AltScreenFlashContainer": {
		summary: "管理一组限时 flash 条目，到期后 splice 并请求重绘。",
		tags: ["component", "notification", "timer"],
		complexity: "simple",
	},
	"packages/tui/src/components/box.ts:Box": {
		summary: "实现 Component 的盒子容器：子节点管理、鼠标命中分发与背景铺满。",
		tags: ["component", "container", "layout"],
		complexity: "moderate",
	},
	"packages/tui/src/components/cancellable-loader.ts:CancellableLoader": {
		summary: "扩展 Loader，用 Escape 中止 AbortSignal 并可选调用 onAbort。",
		tags: ["component", "loader", "cancellation"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:Editor": {
		summary: "完整多行编辑器状态机：视觉行导航、kill-ring、undo、历史浏览与自动补全请求。",
		tags: ["component", "editor", "state-machine"],
		complexity: "complex",
	},
	"packages/tui/src/components/h-stack.ts:HStack": {
		summary: "水平方向 Stack，按分配宽度渲染并对齐子组件。",
		tags: ["component", "layout", "stack"],
		complexity: "simple",
	},
	"packages/tui/src/components/image.ts:Image": {
		summary: "缓存按宽度渲染的终端图像行，宽度变化时重新 encode。",
		tags: ["component", "image", "cache"],
		complexity: "moderate",
	},
	"packages/tui/src/components/input.ts:Input": {
		summary: "单行可聚焦输入控件，处理键绑定、粘贴与 undo/yank。",
		tags: ["component", "input", "focusable"],
		complexity: "complex",
	},
	"packages/tui/src/components/loader.ts:Loader": {
		summary: "在 Text 上叠加 spinner 动画与消息更新。",
		tags: ["component", "loader", "animation"],
		complexity: "moderate",
	},
	"packages/tui/src/components/markdown.ts:Markdown": {
		summary: "把 Markdown 词法树渲染成带主题、表格与公式的终端行。",
		tags: ["component", "markdown", "rendering"],
		complexity: "complex",
	},
	"packages/tui/src/components/mouse-region.ts:MouseRegion": {
		summary: "把鼠标事件从子组件坐标转交给外部 handler。",
		tags: ["component", "mouse", "event-handler"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:ScrollView": {
		summary: "单子节点滚动视口，支持 follow-end、滚动条显隐与布局节点导出。",
		tags: ["component", "scroll", "container"],
		complexity: "moderate",
	},
	"packages/tui/src/components/select-list.ts:SelectList": {
		summary: "可滚动、可过滤的选择列表，支持键盘与鼠标选中。",
		tags: ["component", "select", "list"],
		complexity: "moderate",
	},
	"packages/tui/src/components/settings-list.ts:SettingsList": {
		summary: "设置项列表：搜索、子菜单导航，以及值编辑后的 onChange。",
		tags: ["component", "settings", "list"],
		complexity: "complex",
	},
	"packages/tui/src/components/spacer.ts:Spacer": {
		summary: "输出固定数量空行的占位 Component。",
		tags: ["component", "layout", "spacer"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:Stack": {
		summary: "抽象弹性布局容器，统一维护 StackEntry 并委托 Container 管理子节点。",
		tags: ["component", "layout", "stack"],
		complexity: "moderate",
	},
	"packages/tui/src/components/text.ts:Text": {
		summary: "缓存折行结果的文本 Component，支持自定义背景。",
		tags: ["component", "text", "cache"],
		complexity: "moderate",
	},
	"packages/tui/src/components/truncated-text.ts:TruncatedText": {
		summary: "按宽度截断的单行文本 Component。",
		tags: ["component", "text", "truncation"],
		complexity: "simple",
	},
	"packages/tui/src/components/v-stack.ts:VStack": {
		summary: "垂直方向 Stack，按分配行数堆叠子组件。",
		tags: ["component", "layout", "stack"],
		complexity: "simple",
	},
};

const FN_META = {
	"packages/tui/src/alt-screen-search.ts:buildSearchCorpus": {
		summary: "去掉 ANSI 后按 grapheme 拼出可检索文本，并记录每个片段对应的行列跨度。",
		tags: ["search", "corpus", "ansi"],
		complexity: "moderate",
	},
	"packages/tui/src/alt-screen-search.ts:findSearchCorpusMatches": {
		summary: "在语料上做正则查找，并把字符偏移映射回屏幕行列片段。",
		tags: ["search", "regex", "mapping"],
		complexity: "simple",
	},
	"packages/tui/src/alt-screen-search.ts:findAltScreenSearchMatches": {
		summary: "一次性构建语料并返回查询的全部屏幕匹配。",
		tags: ["search", "entry-point", "utility"],
		complexity: "simple",
	},
	"packages/tui/src/alt-screen-search.ts:getAltScreenSearchMatchKey": {
		summary: "用行列区间生成匹配稳定键，供导航去重。",
		tags: ["search", "utility", "identity"],
		complexity: "simple",
	},
	"packages/tui/src/alt-screen-search.ts:search": {
		summary: "在索引上复用或重建语料，返回规范化查询的匹配列表。",
		tags: ["search", "index", "cache"],
		complexity: "simple",
	},
	"packages/tui/src/alt-screen-search.ts:render": {
		summary: "绘制查询 Input、结果计数与上/下一条按钮，并计算按钮命中列。",
		tags: ["rendering", "search", "ui"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:buildFdPathQuery": {
		summary: "把用户路径前缀转成 fd 可用的正则，按路径段拼接分隔符模式。",
		tags: ["autocomplete", "fd", "query"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:findUnclosedQuoteStart": {
		summary: "从光标向前找未闭合引号起点，用于带引号的路径前缀。",
		tags: ["autocomplete", "parsing", "quotes"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:extractQuotedPrefix": {
		summary: "提取光标前带引号的 token，区分原始前缀与是否仍在引号内。",
		tags: ["autocomplete", "parsing", "quotes"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:parsePathPrefix": {
		summary: "规范化路径前缀：展开引号、识别 ~/ 与相对/绝对路径形态。",
		tags: ["autocomplete", "parsing", "path"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:buildCompletionValue": {
		summary: "按是否目录、是否引号来组装插入文本，目录补上分隔符。",
		tags: ["autocomplete", "completion", "path"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:walkDirectoryWithFd": {
		summary: "优先 spawn fd 列举匹配路径，失败或取消时回退同步目录遍历。",
		tags: ["autocomplete", "fd", "filesystem"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:getSuggestions": {
		summary: "按 @ 前缀、斜杠命令或路径上下文选择补全源，并返回 items/prefix。",
		tags: ["autocomplete", "provider", "dispatch"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:applyCompletion": {
		summary: "把选中项写回当前行：处理引号、目录斜杠与命令/路径替换范围。",
		tags: ["autocomplete", "completion", "editing"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:extractAtPrefix": {
		summary: "识别 @ 文件引用前缀，供模糊文件补全触发。",
		tags: ["autocomplete", "parsing", "mention"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:extractPathPrefix": {
		summary: "从光标前文本抽出路径 token，处理分隔符与引号。",
		tags: ["autocomplete", "parsing", "path"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:expandHomePath": {
		summary: "把 ~/ 展开为用户主目录，供文件系统查询使用。",
		tags: ["autocomplete", "path", "utility"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:resolveScopedFuzzyQuery": {
		summary: "把 scoped 查询拆成目录基座与 fd/fuzzy 片段，限制搜索范围。",
		tags: ["autocomplete", "fuzzy", "path"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:getFileSuggestions": {
		summary: "按前缀列目录或启动 fd，给路径补全打分并排序。",
		tags: ["autocomplete", "filesystem", "ranking"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:scoreEntry": {
		summary: "按前缀匹配位置与目录优先给补全项打分。",
		tags: ["autocomplete", "ranking", "scoring"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:getBaseDirSuggestions": {
		summary: "当前缀为空时列出基目录条目作为起点建议。",
		tags: ["autocomplete", "filesystem", "listing"],
		complexity: "simple",
	},
	"packages/tui/src/autocomplete.ts:getFuzzyFileSuggestions": {
		summary: "对 @ 引用走 fd 模糊搜索，并把结果转成显示路径。",
		tags: ["autocomplete", "fuzzy", "fd"],
		complexity: "moderate",
	},
	"packages/tui/src/autocomplete.ts:shouldTriggerFileCompletion": {
		summary: "判断光标前文本是否像路径，从而自动弹出文件补全。",
		tags: ["autocomplete", "trigger", "path"],
		complexity: "simple",
	},
	"packages/tui/src/components/alt-screen-flash.ts:flash": {
		summary: "登记一条限时提示，到期移除并触发重绘。",
		tags: ["notification", "timer", "ui"],
		complexity: "simple",
	},
	"packages/tui/src/components/box.ts:matchCache": {
		summary: "比较子行、宽度与背景样本，决定是否复用缓存渲染。",
		tags: ["cache", "rendering", "optimization"],
		complexity: "simple",
	},
	"packages/tui/src/components/box.ts:handleMouse": {
		summary: "按子组件布局把鼠标事件分发给命中的 child。",
		tags: ["event-handler", "mouse", "container"],
		complexity: "simple",
	},
	"packages/tui/src/components/box.ts:render": {
		summary: "渲染子组件、加 padding，并在缓存未命中时铺背景。",
		tags: ["rendering", "container", "cache"],
		complexity: "moderate",
	},
	"packages/tui/src/components/box.ts:applyBg": {
		summary: "按可见宽度补空格后把背景 ANSI 应用到整行。",
		tags: ["rendering", "ansi", "background"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:segmentWithMarkers": {
		summary: "在 grapheme 分段时合并合法的 [paste #n] 标记，避免标记被拆开。",
		tags: ["editor", "paste", "segmentation"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:wordWrapLine": {
		summary: "按可见列宽对一行做 CJK/单词感知折行，保留预分段与粘贴标记。",
		tags: ["editor", "word-wrap", "layout"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:createScrollBorder": {
		summary: "生成顶部/底部滚动提示边框，显示隐藏行数。",
		tags: ["editor", "rendering", "scroll"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:constructor": {
		summary: "初始化编辑器状态、kill-ring、undo 栈与自动补全字段。",
		tags: ["editor", "initialization", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:setAutocompleteProvider": {
		summary: "注入 AutocompleteProvider 并清掉进行中的补全请求。",
		tags: ["editor", "autocomplete", "provider"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:addToHistory": {
		summary: "把非空文本压入历史上行，供上下键浏览。",
		tags: ["editor", "history", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:navigateHistory": {
		summary: "在历史上行间移动，进入时保存草稿，越界则退出浏览。",
		tags: ["editor", "history", "navigation"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:setTextInternal": {
		summary: "替换内部文本与光标并失效布局，不走外部 onChange。",
		tags: ["editor", "state", "mutation"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:render": {
		summary: "按滚动偏移绘制可见视觉行、光标标记、补全列表与上下边框。",
		tags: ["editor", "rendering", "autocomplete"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:handleMouse": {
		summary: "把点击映射到视觉行/列，或转发给自动补全列表。",
		tags: ["editor", "mouse", "event-handler"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:handleInput": {
		summary: "主按键分发：粘贴、提交、删除、移动、yank/undo、跳转与补全触发。",
		tags: ["editor", "event-handler", "keybindings"],
		complexity: "complex",
	},
	"packages/tui/src/components/editor.ts:layoutText": {
		summary: "把逻辑行折成视觉行映射，计算光标所在视觉位置与滚动。",
		tags: ["editor", "layout", "word-wrap"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:expandPasteMarkers": {
		summary: "把 [paste #n] 标记还原为完整粘贴正文。",
		tags: ["editor", "paste", "expansion"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:setText": {
		summary: "对外设置文本：规范化、重置光标/历史浏览并通知 onChange。",
		tags: ["editor", "api", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:insertTextAtCursor": {
		summary: "在光标插入文本并推 undo，供外部扩展调用。",
		tags: ["editor", "editing", "api"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:insertTextAtCursorInternal": {
		summary: "底层插入：拆行、更新光标并处理自动补全失效。",
		tags: ["editor", "editing", "mutation"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:insertCharacter": {
		summary: "插入可打印字符或触发补全，处理覆盖与成对符号。",
		tags: ["editor", "editing", "autocomplete"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:handlePaste": {
		summary: "括号粘贴：大文本收成标记，小文本直接插入。",
		tags: ["editor", "paste", "markers"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:addNewLine": {
		summary: "在光标处断行，保持缩进并更新视觉布局。",
		tags: ["editor", "editing", "newline"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:shouldSubmitOnBackslashEnter": {
		summary: "判断反斜杠+Enter 是否应提交而非插入换行。",
		tags: ["editor", "submit", "keybindings"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:submitValue": {
		summary: "提交当前文本（展开粘贴标记）并调用 onSubmit。",
		tags: ["editor", "submit", "callback"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:handleBackspace": {
		summary: "按 grapheme/标记删除光标前内容，处理行合并与补全。",
		tags: ["editor", "editing", "delete"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:setCursorCol": {
		summary: "设置逻辑列并清除垂直移动的 preferred 列缓存。",
		tags: ["editor", "cursor", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:moveToVisualLine": {
		summary: "在视觉行间上下移动，保持目标列并处理滚动。",
		tags: ["editor", "navigation", "visual-line"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:computeVerticalMoveColumn": {
		summary: "计算垂直移动时应落到的视觉列，兼容宽字符与 snap。",
		tags: ["editor", "cursor", "visual-line"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:deleteToStartOfLine": {
		summary: "删除到行首并写入 kill-ring。",
		tags: ["editor", "kill-ring", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:deleteToEndOfLine": {
		summary: "删除到行尾并写入 kill-ring。",
		tags: ["editor", "kill-ring", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:deleteWordBackwards": {
		summary: "按词法边界向后删词，可进入 kill-ring。",
		tags: ["editor", "word-navigation", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:deleteWordForward": {
		summary: "按词法边界向前删词，可进入 kill-ring。",
		tags: ["editor", "word-navigation", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:handleForwardDelete": {
		summary: "Delete 键：删除光标后 grapheme 或合并下一行。",
		tags: ["editor", "editing", "delete"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:buildVisualLineMap": {
		summary: "由折行结果构建逻辑行到视觉行的映射表。",
		tags: ["editor", "layout", "visual-line"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:findVisualLineAt": {
		summary: "定位某逻辑坐标所在的视觉行条目。",
		tags: ["editor", "layout", "lookup"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:moveCursor": {
		summary: "按偏移移动光标，处理行边界与 preferred 列。",
		tags: ["editor", "cursor", "navigation"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:pageScroll": {
		summary: "按可见页高度翻页并移动光标。",
		tags: ["editor", "scroll", "navigation"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:moveWordBackwards": {
		summary: "光标跳到上一词边界。",
		tags: ["editor", "word-navigation", "cursor"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:yank": {
		summary: "从 kill-ring 取出最近删除文本并插入。",
		tags: ["editor", "kill-ring", "yank"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:yankPop": {
		summary: "替换上一次 yank 为 kill-ring 中更早的条目。",
		tags: ["editor", "kill-ring", "yank"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:insertYankedText": {
		summary: "插入 yank 文本并记录区间，供 yank-pop 替换。",
		tags: ["editor", "kill-ring", "editing"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:deleteYankedText": {
		summary: "删除上一次 yank 插入的区间。",
		tags: ["editor", "kill-ring", "editing"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:undo": {
		summary: "弹出 undo 快照，恢复文本与光标。",
		tags: ["editor", "undo", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:jumpToChar": {
		summary: "进入/执行跳转到行内下一指定字符。",
		tags: ["editor", "navigation", "jump"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:moveWordForwards": {
		summary: "光标跳到下一词边界。",
		tags: ["editor", "word-navigation", "cursor"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:isInSlashCommandContext": {
		summary: "判断当前行是否仍处于 /command 补全上下文。",
		tags: ["editor", "autocomplete", "slash-command"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:getBestAutocompleteMatchIndex": {
		summary: "按前缀为补全列表挑选默认高亮项。",
		tags: ["editor", "autocomplete", "ranking"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:createAutocompleteList": {
		summary: "用建议项构建 SelectList 下拉并绑定选择回调。",
		tags: ["editor", "autocomplete", "select"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:handleTabCompletion": {
		summary: "Tab 时应用最佳补全或强制文件补全。",
		tags: ["editor", "autocomplete", "keybindings"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:requestAutocomplete": {
		summary: "按触发字符/防抖决定是否启动补全请求。",
		tags: ["editor", "autocomplete", "debounce"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:startAutocompleteRequest": {
		summary: "取消旧请求并启动新的 provider 查询。",
		tags: ["editor", "autocomplete", "async"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:setAutocompleteTriggerCharacters": {
		summary: "更新触发补全的字符集与对应正则。",
		tags: ["editor", "autocomplete", "config"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:getAutocompleteDebounceMs": {
		summary: "按当前前缀是否匹配防抖模式返回延迟毫秒。",
		tags: ["editor", "autocomplete", "debounce"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:runAutocompleteRequest": {
		summary: "调用 provider.getSuggestions，仅在请求仍有效时应用结果。",
		tags: ["editor", "autocomplete", "async"],
		complexity: "moderate",
	},
	"packages/tui/src/components/editor.ts:isAutocompleteRequestCurrent": {
		summary: "用 token/id 判断异步补全结果是否过期。",
		tags: ["editor", "autocomplete", "concurrency"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:applyAutocompleteSuggestions": {
		summary: "把建议填进下拉列表并更新选中项。",
		tags: ["editor", "autocomplete", "ui"],
		complexity: "simple",
	},
	"packages/tui/src/components/editor.ts:cancelAutocompleteRequest": {
		summary: "中止进行中的补全 AbortSignal 与防抖定时器。",
		tags: ["editor", "autocomplete", "cancellation"],
		complexity: "simple",
	},
	"packages/tui/src/components/h-stack.ts:render": {
		summary: "测量子项固有宽度，分配列宽后按对齐合成水平行。",
		tags: ["layout", "rendering", "stack"],
		complexity: "simple",
	},
	"packages/tui/src/components/image.ts:constructor": {
		summary: "保存图像数据并探测像素尺寸，必要时回退默认宽高。",
		tags: ["image", "initialization", "dimensions"],
		complexity: "simple",
	},
	"packages/tui/src/components/image.ts:render": {
		summary: "按单元格宽度调用 renderImage，缓存生成的协议行。",
		tags: ["image", "rendering", "terminal"],
		complexity: "moderate",
	},
	"packages/tui/src/components/input.ts:handleInput": {
		summary: "单行按键分发：粘贴缓冲、提交/取消、删除、移动与 undo/yank。",
		tags: ["input", "event-handler", "keybindings"],
		complexity: "moderate",
	},
	"packages/tui/src/components/input.ts:handleMouse": {
		summary: "按可见列定位光标，支持点击改写插入点。",
		tags: ["input", "mouse", "cursor"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:insertCharacter": {
		summary: "在光标插入字符并推 undo。",
		tags: ["input", "editing", "mutation"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:handleBackspace": {
		summary: "删除光标前一个 grapheme。",
		tags: ["input", "editing", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:handleForwardDelete": {
		summary: "删除光标后一个 grapheme。",
		tags: ["input", "editing", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:deleteToLineStart": {
		summary: "删除到行首并写入 kill-ring。",
		tags: ["input", "kill-ring", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:deleteWordBackwards": {
		summary: "向后删一个词并写入 kill-ring。",
		tags: ["input", "word-navigation", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:deleteWordForward": {
		summary: "向前删一个词并写入 kill-ring。",
		tags: ["input", "word-navigation", "delete"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:yank": {
		summary: "插入 kill-ring 当前条目。",
		tags: ["input", "kill-ring", "yank"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:yankPop": {
		summary: "用 kill-ring 上一条替换刚刚 yank 的文本。",
		tags: ["input", "kill-ring", "yank"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:handlePaste": {
		summary: "把粘贴内容规范化为单行并插入。",
		tags: ["input", "paste", "editing"],
		complexity: "simple",
	},
	"packages/tui/src/components/input.ts:render": {
		summary: "绘制 prompt、占位符与带 CURSOR_MARKER 的可见窗口。",
		tags: ["input", "rendering", "cursor"],
		complexity: "moderate",
	},
	"packages/tui/src/components/loader.ts:constructor": {
		summary: "用 Text 基类创建 loader，并配置 spinner 帧与颜色。",
		tags: ["loader", "initialization", "animation"],
		complexity: "simple",
	},
	"packages/tui/src/components/loader.ts:restartAnimation": {
		summary: "重置帧计时器，按 interval 循环更新指示器。",
		tags: ["loader", "animation", "timer"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:tokenizeInlineLatex": {
		summary: "扫描 $...$ 行内公式，处理转义并标记未闭合的 pending 段。",
		tags: ["markdown", "latex", "tokenizer"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:tokenizeBlockLatex": {
		summary: "扫描 $$ 块级公式，生成 latexBlock token。",
		tags: ["markdown", "latex", "tokenizer"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:trimPartialClosingFences": {
		summary: "流式渲染时去掉未写完的代码围栏，避免闪烁残片。",
		tags: ["markdown", "streaming", "fence"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:del": {
		summary: "严格匹配成对 ~~，避免松散删除线误伤文本。",
		tags: ["markdown", "tokenizer", "strikethrough"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:constructor": {
		summary: "保存 Markdown 文本、padding、主题与渲染选项。",
		tags: ["markdown", "initialization", "theme"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:render": {
		summary: "解析 token 树、应用默认样式与 padding，并缓存按宽度的输出行。",
		tags: ["markdown", "rendering", "cache"],
		complexity: "moderate",
	},
	"packages/tui/src/components/markdown.ts:applyDefaultStyle": {
		summary: "给普通文本行套上默认前景/背景，跳过已有样式与图像行。",
		tags: ["markdown", "styling", "ansi"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:getDefaultStylePrefix": {
		summary: "根据主题计算默认文本的 ANSI 前缀。",
		tags: ["markdown", "styling", "theme"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:renderToken": {
		summary: "按 token 类型渲染标题、代码、引用、列表、表格、公式与段落。",
		tags: ["markdown", "rendering", "dispatch"],
		complexity: "moderate",
	},
	"packages/tui/src/components/markdown.ts:renderInlineTokens": {
		summary: "渲染行内加粗/链接/代码/公式，并在支持时输出 OSC 8 超链接。",
		tags: ["markdown", "inline", "hyperlink"],
		complexity: "moderate",
	},
	"packages/tui/src/components/markdown.ts:renderList": {
		summary: "渲染有序/无序列表，处理嵌套缩进与续行折行。",
		tags: ["markdown", "list", "rendering"],
		complexity: "moderate",
	},
	"packages/tui/src/components/markdown.ts:getLongestWordWidth": {
		summary: "测量单元格内最长词的可见宽度，供表格列宽估计。",
		tags: ["markdown", "table", "metrics"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:wrapCellText": {
		summary: "用 ANSI 感知折行把单元格文本限制在列宽内。",
		tags: ["markdown", "table", "word-wrap"],
		complexity: "simple",
	},
	"packages/tui/src/components/markdown.ts:renderTable": {
		summary: "计算列宽、绘制表头分隔线，并按单元格折行对齐表格。",
		tags: ["markdown", "table", "rendering"],
		complexity: "moderate",
	},
	"packages/tui/src/components/scroll-view.ts:constructor": {
		summary: "配置 follow-end、滚动条策略与单一 child。",
		tags: ["scroll", "initialization", "container"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:markScrollbarActivity": {
		summary: "显示瞬时滚动条并在延迟后自动隐藏。",
		tags: ["scroll", "scrollbar", "timer"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:scrollTo": {
		summary: "滚动到绝对偏移，处理 follow-end 抑制与范围夹取。",
		tags: ["scroll", "navigation", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:scrollBy": {
		summary: "相对滚动并在触底时恢复 follow-end。",
		tags: ["scroll", "navigation", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:scrollToStart": {
		summary: "滚到内容顶部并关闭跟随底部。",
		tags: ["scroll", "navigation", "state"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:scrollToEnd": {
		summary: "滚到内容底部并可重新启用 follow-end。",
		tags: ["scroll", "navigation", "follow-end"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:updateLayout": {
		summary: "根据内容高度与视口更新 scrollTop，并在跟随模式下吸底。",
		tags: ["scroll", "layout", "follow-end"],
		complexity: "simple",
	},
	"packages/tui/src/components/scroll-view.ts:render": {
		summary: "渲染 child 并暴露 LAYOUT_NODE 供外层裁剪滚动。",
		tags: ["scroll", "rendering", "layout"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:render": {
		summary: "渲染可见窗口内的选项，无匹配时显示空态与滚动信息。",
		tags: ["select", "rendering", "list"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:handleMouse": {
		summary: "鼠标按下/移动/释放时更新选中项，释放触发 onSelect。",
		tags: ["select", "mouse", "event-handler"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:handleInput": {
		summary: "上下移动、确认与取消的键绑定处理。",
		tags: ["select", "keybindings", "event-handler"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:getVisibleRange": {
		summary: "计算让选中项保持在窗口内的起止下标。",
		tags: ["select", "scroll", "windowing"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:renderItem": {
		summary: "按主题绘制一行：主列截断、描述对齐与选中高亮。",
		tags: ["select", "rendering", "theme"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:getPrimaryColumnBounds": {
		summary: "估算主列可用宽度，给描述列留出空间。",
		tags: ["select", "layout", "metrics"],
		complexity: "simple",
	},
	"packages/tui/src/components/select-list.ts:truncatePrimary": {
		summary: "按列宽截断主列文本，保留可见宽度语义。",
		tags: ["select", "truncation", "text"],
		complexity: "simple",
	},
	"packages/tui/src/components/settings-list.ts:constructor": {
		summary: "初始化设置项、可选搜索 Input，以及子菜单状态。",
		tags: ["settings", "initialization", "search"],
		complexity: "simple",
	},
	"packages/tui/src/components/settings-list.ts:renderMainList": {
		summary: "绘制搜索框、可见设置行、值与描述，以及底部快捷键提示。",
		tags: ["settings", "rendering", "list"],
		complexity: "moderate",
	},
	"packages/tui/src/components/settings-list.ts:handleMouse": {
		summary: "把点击分给子菜单、搜索框或主列表项并激活。",
		tags: ["settings", "mouse", "event-handler"],
		complexity: "simple",
	},
	"packages/tui/src/components/settings-list.ts:handleInput": {
		summary: "处理导航、激活、取消，以及搜索输入后的过滤。",
		tags: ["settings", "keybindings", "search"],
		complexity: "simple",
	},
	"packages/tui/src/components/settings-list.ts:activateItem": {
		summary: "打开子菜单或切换/提交当前设置项的值。",
		tags: ["settings", "activation", "submenu"],
		complexity: "simple",
	},
	"packages/tui/src/components/settings-list.ts:closeSubmenu": {
		summary: "关闭子菜单并在需要时恢复主列表导航位置。",
		tags: ["settings", "submenu", "navigation"],
		complexity: "simple",
	},
	"packages/tui/src/components/settings-list.ts:addHintLine": {
		summary: "在底部追加截断后的快捷键提示行。",
		tags: ["settings", "hint", "rendering"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:distribute": {
		summary: "按 grow 或 shrink 权重把多余/不足空间分配到可调子项。",
		tags: ["layout", "flex", "allocation"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:allocateStackSizes": {
		summary: "结合 basis、min/max 与 gap 计算每个子项的最终尺寸。",
		tags: ["layout", "flex", "allocation"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:visibleStackEntries": {
		summary: "按 viewport 回调过滤当前可见的 Stack 子项。",
		tags: ["layout", "visibility", "stack"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:constructor": {
		summary: "规范化 gap/align，并把初始 children 登记为 StackEntry。",
		tags: ["layout", "initialization", "stack"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:addChild": {
		summary: "把 Component 或带约束的 entry 加入 Stack 并同步 Container。",
		tags: ["layout", "stack", "children"],
		complexity: "simple",
	},
	"packages/tui/src/components/stack.ts:clear": {
		summary: "清空 entries 与 Container 子节点。",
		tags: ["layout", "stack", "children"],
		complexity: "simple",
	},
	"packages/tui/src/components/text.ts:render": {
		summary: "按宽度 wrapTextWithAnsi，加 padding 与可选背景后输出缓存行。",
		tags: ["text", "rendering", "word-wrap"],
		complexity: "moderate",
	},
	"packages/tui/src/components/truncated-text.ts:render": {
		summary: "只取首行并按宽度截断，周围填充 padding。",
		tags: ["text", "truncation", "rendering"],
		complexity: "simple",
	},
	"packages/tui/src/components/v-stack.ts:render": {
		summary: "按分配高度切片各子组件行，并插入 gap。",
		tags: ["layout", "rendering", "stack"],
		complexity: "simple",
	},
};

const EXPORTED_FNS = new Set([
	"packages/tui/src/alt-screen-search.ts:findAltScreenSearchMatches",
	"packages/tui/src/alt-screen-search.ts:getAltScreenSearchMatchKey",
	"packages/tui/src/components/editor.ts:wordWrapLine",
	"packages/tui/src/components/stack.ts:visibleStackEntries",
	"packages/tui/src/components/stack.ts:allocateStackSizes",
]);

function extractMethodRanges(filePath, startLine, endLine) {
	const lines = fs.readFileSync(path.join("/Users/elex-mb0203/MyWork/agent-projects/ai-pi", filePath), "utf8").split(/\n/);
	const methods = [];
	const ctor = /^(\t|  )constructor\s*\(/;
	const getter = /^(\t|  )((?:public|private|protected|override|static)\s+)*(get|set)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
	const re = /^(\t|  )((?:public|private|protected|override|static|async|get|set|readonly)\s+)*([A-Za-z_][A-Za-z0-9_]*)\s*(\(|<|=)/;
	for (let i = startLine; i <= endLine && i <= lines.length; i++) {
		const line = lines[i - 1];
		let name = null;
		if (ctor.test(line)) name = "constructor";
		else {
			const g = line.match(getter);
			if (g) name = g[4];
			else {
				const m = line.match(re);
				if (m && !["if", "for", "while", "switch", "catch", "return", "new", "typeof", "else"].includes(m[3])) {
					if (m[4] === "=" && !/=>\s*\{?/.test(line) && !/=\s*(async\s*)?\(/.test(line)) continue;
					name = m[3];
				}
			}
		}
		if (name) methods.push({ name, startLine: i });
	}
	for (let i = 0; i < methods.length; i++) {
		methods[i].endLine = i + 1 < methods.length ? methods[i + 1].startLine - 1 : endLine;
	}
	return methods;
}

function complexityFromRange(start, end) {
	const n = end - start + 1;
	if (n > 200) return "complex";
	if (n > 50) return "moderate";
	return "simple";
}

const nodes = [];
const edges = [];
const nodeIds = new Set();

function addNode(node) {
	if (nodeIds.has(node.id)) throw new Error(`duplicate node ${node.id}`);
	nodeIds.add(node.id);
	nodes.push(node);
}

function addEdge(edge) {
	if (edge.source === edge.target) return;
	edges.push(edge);
}

const SKIP_CLASSES = new Set(["packages/tui/src/components/markdown.ts:StrictStrikethroughTokenizer"]);

for (const f of extract.results) {
	const meta = FILE_META[f.path];
	if (!meta) throw new Error(`missing file meta ${f.path}`);
	const fileId = `file:${f.path}`;
	addNode({
		id: fileId,
		type: "file",
		name: path.basename(f.path),
		filePath: f.path,
		summary: meta.summary,
		tags: meta.tags,
		complexity: meta.complexity,
		...(meta.languageNotes ? { languageNotes: meta.languageNotes } : {}),
	});

	for (const target of brief.batchImportData[f.path] || []) {
		addEdge({ source: fileId, target: `file:${target}`, type: "imports", direction: "forward", weight: 0.7 });
	}

	const exportNames = new Set((f.exports || []).map((e) => e.name));

	for (const fn of f.functions || []) {
		const key = `${f.path}:${fn.name}`;
		const exported = exportNames.has(fn.name);
		const lines = fn.endLine - fn.startLine + 1;
		if (!exported && lines < 10) continue;
		const fnMeta = FN_META[key];
		if (!fnMeta) throw new Error(`missing fn meta ${key}`);
		const id = `function:${f.path}:${fn.name}`;
		addNode({
			id,
			type: "function",
			name: fn.name,
			filePath: f.path,
			lineRange: [fn.startLine, fn.endLine],
			summary: fnMeta.summary,
			tags: fnMeta.tags,
			complexity: fnMeta.complexity,
		});
		addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1.0 });
		if (exported) {
			addEdge({ source: fileId, target: id, type: "exports", direction: "forward", weight: 0.8 });
		}
	}

	for (const cls of f.classes || []) {
		const classKey = `${f.path}:${cls.name}`;
		if (SKIP_CLASSES.has(classKey)) {
			const methods = extractMethodRanges(f.path, cls.startLine, cls.endLine);
			for (const m of methods) {
				if (m.endLine - m.startLine + 1 < 10) continue;
				const key = `${f.path}:${m.name}`;
				const fnMeta = FN_META[key];
				if (!fnMeta) throw new Error(`missing fn meta ${key}`);
				const id = `function:${f.path}:${m.name}`;
				addNode({
					id,
					type: "function",
					name: m.name,
					filePath: f.path,
					lineRange: [m.startLine, m.endLine],
					summary: fnMeta.summary,
					tags: fnMeta.tags,
					complexity: fnMeta.complexity,
				});
				addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1.0 });
			}
			continue;
		}

		const classMeta = CLASS_META[classKey];
		if (!classMeta) throw new Error(`missing class meta ${classKey}`);
		const classId = `class:${f.path}:${cls.name}`;
		addNode({
			id: classId,
			type: "class",
			name: cls.name,
			filePath: f.path,
			lineRange: [cls.startLine, cls.endLine],
			summary: classMeta.summary,
			tags: classMeta.tags,
			complexity: classMeta.complexity,
		});
		addEdge({ source: fileId, target: classId, type: "contains", direction: "forward", weight: 1.0 });
		if (exportNames.has(cls.name)) {
			addEdge({ source: fileId, target: classId, type: "exports", direction: "forward", weight: 0.8 });
		}

		const methods = extractMethodRanges(f.path, cls.startLine, cls.endLine);
		for (const m of methods) {
			const lines = m.endLine - m.startLine + 1;
			if (lines < 10) continue;
			const key = `${f.path}:${m.name}`;
			const fnMeta = FN_META[key];
			if (!fnMeta) throw new Error(`missing fn meta ${key}`);
			const id = `function:${f.path}:${m.name}`;
			addNode({
				id,
				type: "function",
				name: m.name,
				filePath: f.path,
				lineRange: [m.startLine, m.endLine],
				summary: fnMeta.summary,
				tags: fnMeta.tags,
				complexity: fnMeta.complexity ?? complexityFromRange(m.startLine, m.endLine),
			});
			addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1.0 });
		}
	}
}

function F(p, n) {
	return `function:${p}:${n}`;
}
function C(p, n) {
	return `class:${p}:${n}`;
}
function File(p) {
	return `file:${p}`;
}

const CALLS = [
	["packages/tui/src/alt-screen-search.ts", "search", "packages/tui/src/alt-screen-search.ts", "buildSearchCorpus", "fn"],
	["packages/tui/src/alt-screen-search.ts", "search", "packages/tui/src/alt-screen-search.ts", "findSearchCorpusMatches", "fn"],
	["packages/tui/src/alt-screen-search.ts", "findAltScreenSearchMatches", "packages/tui/src/alt-screen-search.ts", "buildSearchCorpus", "fn"],
	["packages/tui/src/alt-screen-search.ts", "findAltScreenSearchMatches", "packages/tui/src/alt-screen-search.ts", "findSearchCorpusMatches", "fn"],
	["packages/tui/src/alt-screen-search.ts", "buildSearchCorpus", "packages/tui/src/utils.ts", "stripTerminalSequences", "fn"],
	["packages/tui/src/alt-screen-search.ts", "buildSearchCorpus", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/alt-screen-search.ts", "render", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/alt-screen-search.ts", "render", "packages/tui/src/utils.ts", "truncateToWidth", "fn"],

	["packages/tui/src/autocomplete.ts", "getSuggestions", "packages/tui/src/fuzzy.ts", "fuzzyFilter", "fn"],
	["packages/tui/src/autocomplete.ts", "getSuggestions", "packages/tui/src/autocomplete.ts", "extractAtPrefix", "fn"],
	["packages/tui/src/autocomplete.ts", "getSuggestions", "packages/tui/src/autocomplete.ts", "extractPathPrefix", "fn"],
	["packages/tui/src/autocomplete.ts", "getSuggestions", "packages/tui/src/autocomplete.ts", "getFileSuggestions", "fn"],
	["packages/tui/src/autocomplete.ts", "getSuggestions", "packages/tui/src/autocomplete.ts", "getFuzzyFileSuggestions", "fn"],
	["packages/tui/src/autocomplete.ts", "applyCompletion", "packages/tui/src/autocomplete.ts", "buildCompletionValue", "fn"],
	["packages/tui/src/autocomplete.ts", "extractPathPrefix", "packages/tui/src/autocomplete.ts", "extractQuotedPrefix", "fn"],
	["packages/tui/src/autocomplete.ts", "extractQuotedPrefix", "packages/tui/src/autocomplete.ts", "findUnclosedQuoteStart", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "walkDirectoryWithFd", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "parsePathPrefix", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "buildFdPathQuery", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "expandHomePath", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "getBaseDirSuggestions", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "getFuzzyFileSuggestions", "fn"],
	["packages/tui/src/autocomplete.ts", "getFileSuggestions", "packages/tui/src/autocomplete.ts", "scoreEntry", "fn"],
	["packages/tui/src/autocomplete.ts", "getFuzzyFileSuggestions", "packages/tui/src/autocomplete.ts", "walkDirectoryWithFd", "fn"],
	["packages/tui/src/autocomplete.ts", "getFuzzyFileSuggestions", "packages/tui/src/autocomplete.ts", "resolveScopedFuzzyQuery", "fn"],
	["packages/tui/src/autocomplete.ts", "getFuzzyFileSuggestions", "packages/tui/src/autocomplete.ts", "buildFdPathQuery", "fn"],

	["packages/tui/src/components/box.ts", "handleMouse", "packages/tui/src/tui.ts", "dispatchMouseEvent", "fn"],
	["packages/tui/src/components/box.ts", "applyBg", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/components/box.ts", "applyBg", "packages/tui/src/utils.ts", "applyBackgroundToLine", "fn"],
	["packages/tui/src/components/box.ts", "render", "packages/tui/src/components/box.ts", "applyBg", "fn"],
	["packages/tui/src/components/box.ts", "render", "packages/tui/src/components/box.ts", "matchCache", "fn"],

	["packages/tui/src/components/editor.ts", "constructor", "packages/tui/src/kill-ring.ts", "KillRing", "class"],
	["packages/tui/src/components/editor.ts", "constructor", "packages/tui/src/undo-stack.ts", "UndoStack", "class"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/keybindings.ts", "getKeybindings", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/keys.ts", "matchesKey", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/keys.ts", "decodePrintableKey", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "handleBackspace", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "handleForwardDelete", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "handlePaste", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "insertCharacter", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "addNewLine", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "submitValue", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "navigateHistory", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "moveCursor", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "moveToVisualLine", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "yank", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "yankPop", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "undo", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "jumpToChar", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "requestAutocomplete", "fn"],
	["packages/tui/src/components/editor.ts", "handleInput", "packages/tui/src/components/editor.ts", "handleTabCompletion", "fn"],
	["packages/tui/src/components/editor.ts", "wordWrapLine", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/components/editor.ts", "render", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/components/editor.ts", "render", "packages/tui/src/components/editor.ts", "createScrollBorder", "fn"],
	["packages/tui/src/components/editor.ts", "layoutText", "packages/tui/src/components/editor.ts", "wordWrapLine", "fn"],
	["packages/tui/src/components/editor.ts", "layoutText", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/components/editor.ts", "moveWordBackwards", "packages/tui/src/word-navigation.ts", "findWordBackward", "fn"],
	["packages/tui/src/components/editor.ts", "moveWordForwards", "packages/tui/src/word-navigation.ts", "findWordForward", "fn"],
	["packages/tui/src/components/editor.ts", "deleteWordBackwards", "packages/tui/src/word-navigation.ts", "findWordBackward", "fn"],
	["packages/tui/src/components/editor.ts", "deleteWordForward", "packages/tui/src/word-navigation.ts", "findWordForward", "fn"],
	["packages/tui/src/components/editor.ts", "createAutocompleteList", "packages/tui/src/components/select-list.ts", null, "file"],
	["packages/tui/src/components/editor.ts", "runAutocompleteRequest", "packages/tui/src/autocomplete.ts", null, "file"],
	["packages/tui/src/components/editor.ts", "yank", "packages/tui/src/components/editor.ts", "insertYankedText", "fn"],
	["packages/tui/src/components/editor.ts", "yankPop", "packages/tui/src/components/editor.ts", "deleteYankedText", "fn"],
	["packages/tui/src/components/editor.ts", "yankPop", "packages/tui/src/components/editor.ts", "insertYankedText", "fn"],
	["packages/tui/src/components/editor.ts", "handleTabCompletion", "packages/tui/src/components/editor.ts", "getBestAutocompleteMatchIndex", "fn"],
	["packages/tui/src/components/editor.ts", "requestAutocomplete", "packages/tui/src/components/editor.ts", "startAutocompleteRequest", "fn"],
	["packages/tui/src/components/editor.ts", "startAutocompleteRequest", "packages/tui/src/components/editor.ts", "runAutocompleteRequest", "fn"],
	["packages/tui/src/components/editor.ts", "runAutocompleteRequest", "packages/tui/src/components/editor.ts", "applyAutocompleteSuggestions", "fn"],
	["packages/tui/src/components/editor.ts", "runAutocompleteRequest", "packages/tui/src/components/editor.ts", "isAutocompleteRequestCurrent", "fn"],
	["packages/tui/src/components/editor.ts", "shouldSubmitOnBackslashEnter", "packages/tui/src/keys.ts", "matchesKey", "fn"],

	["packages/tui/src/components/h-stack.ts", "render", "packages/tui/src/components/stack.ts", "allocateStackSizes", "fn"],
	["packages/tui/src/components/h-stack.ts", "render", "packages/tui/src/components/stack.ts", "visibleStackEntries", "fn"],
	["packages/tui/src/components/h-stack.ts", "render", "packages/tui/src/tui.ts", "compositeTuiLine", "fn"],
	["packages/tui/src/components/h-stack.ts", "render", "packages/tui/src/utils.ts", "visibleWidth", "fn"],

	["packages/tui/src/components/image.ts", "constructor", "packages/tui/src/terminal-image.ts", "getImageDimensions", "fn"],
	["packages/tui/src/components/image.ts", "render", "packages/tui/src/terminal-image.ts", "allocateImageId", "fn"],
	["packages/tui/src/components/image.ts", "render", "packages/tui/src/terminal-image.ts", "renderImage", "fn"],

	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/keybindings.ts", "getKeybindings", "fn"],
	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/components/input.ts", "handlePaste", "fn"],
	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/components/input.ts", "handleBackspace", "fn"],
	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/components/input.ts", "handleForwardDelete", "fn"],
	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/components/input.ts", "insertCharacter", "fn"],
	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/components/input.ts", "yank", "fn"],
	["packages/tui/src/components/input.ts", "handleInput", "packages/tui/src/components/input.ts", "yankPop", "fn"],
	["packages/tui/src/components/input.ts", "deleteWordBackwards", "packages/tui/src/word-navigation.ts", "findWordBackward", "fn"],
	["packages/tui/src/components/input.ts", "deleteWordForward", "packages/tui/src/word-navigation.ts", "findWordForward", "fn"],

	["packages/tui/src/components/markdown.ts", "render", "packages/tui/src/components/markdown.ts", "renderToken", "fn"],
	["packages/tui/src/components/markdown.ts", "render", "packages/tui/src/utils.ts", "wrapTextWithAnsi", "fn"],
	["packages/tui/src/components/markdown.ts", "render", "packages/tui/src/utils.ts", "applyBackgroundToLine", "fn"],
	["packages/tui/src/components/markdown.ts", "render", "packages/tui/src/terminal-image.ts", "isImageLine", "fn"],
	["packages/tui/src/components/markdown.ts", "renderToken", "packages/tui/src/latex.ts", "renderLatex", "fn"],
	["packages/tui/src/components/markdown.ts", "renderToken", "packages/tui/src/components/markdown.ts", "renderInlineTokens", "fn"],
	["packages/tui/src/components/markdown.ts", "renderToken", "packages/tui/src/components/markdown.ts", "renderList", "fn"],
	["packages/tui/src/components/markdown.ts", "renderToken", "packages/tui/src/components/markdown.ts", "renderTable", "fn"],
	["packages/tui/src/components/markdown.ts", "renderInlineTokens", "packages/tui/src/latex.ts", "renderLatex", "fn"],
	["packages/tui/src/components/markdown.ts", "renderInlineTokens", "packages/tui/src/terminal-image.ts", "hyperlink", "fn"],
	["packages/tui/src/components/markdown.ts", "renderInlineTokens", "packages/tui/src/terminal-image.ts", "getCapabilities", "fn"],
	["packages/tui/src/components/markdown.ts", "wrapCellText", "packages/tui/src/utils.ts", "wrapTextWithAnsi", "fn"],
	["packages/tui/src/components/markdown.ts", "renderTable", "packages/tui/src/components/markdown.ts", "wrapCellText", "fn"],
	["packages/tui/src/components/markdown.ts", "renderTable", "packages/tui/src/components/markdown.ts", "getLongestWordWidth", "fn"],
	["packages/tui/src/components/markdown.ts", "renderList", "packages/tui/src/utils.ts", "wrapTextWithAnsi", "fn"],

	["packages/tui/src/components/select-list.ts", "handleInput", "packages/tui/src/keybindings.ts", "getKeybindings", "fn"],
	["packages/tui/src/components/select-list.ts", "render", "packages/tui/src/components/select-list.ts", "renderItem", "fn"],
	["packages/tui/src/components/select-list.ts", "render", "packages/tui/src/components/select-list.ts", "getVisibleRange", "fn"],
	["packages/tui/src/components/select-list.ts", "renderItem", "packages/tui/src/components/select-list.ts", "truncatePrimary", "fn"],
	["packages/tui/src/components/select-list.ts", "truncatePrimary", "packages/tui/src/utils.ts", "truncateToWidth", "fn"],
	["packages/tui/src/components/select-list.ts", "handleMouse", "packages/tui/src/components/select-list.ts", "getVisibleRange", "fn"],

	["packages/tui/src/components/settings-list.ts", "constructor", "packages/tui/src/components/input.ts", null, "file"],
	["packages/tui/src/components/settings-list.ts", "handleInput", "packages/tui/src/keybindings.ts", "getKeybindings", "fn"],
	["packages/tui/src/components/settings-list.ts", "handleInput", "packages/tui/src/fuzzy.ts", "fuzzyFilter", "fn"],
	["packages/tui/src/components/settings-list.ts", "handleInput", "packages/tui/src/components/settings-list.ts", "activateItem", "fn"],
	["packages/tui/src/components/settings-list.ts", "renderMainList", "packages/tui/src/utils.ts", "truncateToWidth", "fn"],
	["packages/tui/src/components/settings-list.ts", "renderMainList", "packages/tui/src/utils.ts", "visibleWidth", "fn"],
	["packages/tui/src/components/settings-list.ts", "renderMainList", "packages/tui/src/utils.ts", "wrapTextWithAnsi", "fn"],
	["packages/tui/src/components/settings-list.ts", "renderMainList", "packages/tui/src/components/settings-list.ts", "addHintLine", "fn"],
	["packages/tui/src/components/settings-list.ts", "handleMouse", "packages/tui/src/components/settings-list.ts", "activateItem", "fn"],

	["packages/tui/src/components/stack.ts", "allocateStackSizes", "packages/tui/src/components/stack.ts", "distribute", "fn"],

	["packages/tui/src/components/text.ts", "render", "packages/tui/src/utils.ts", "wrapTextWithAnsi", "fn"],
	["packages/tui/src/components/text.ts", "render", "packages/tui/src/utils.ts", "applyBackgroundToLine", "fn"],
	["packages/tui/src/components/text.ts", "render", "packages/tui/src/utils.ts", "visibleWidth", "fn"],

	["packages/tui/src/components/truncated-text.ts", "render", "packages/tui/src/utils.ts", "truncateToWidth", "fn"],
	["packages/tui/src/components/truncated-text.ts", "render", "packages/tui/src/utils.ts", "visibleWidth", "fn"],

	["packages/tui/src/components/v-stack.ts", "render", "packages/tui/src/components/stack.ts", "allocateStackSizes", "fn"],
	["packages/tui/src/components/v-stack.ts", "render", "packages/tui/src/components/stack.ts", "visibleStackEntries", "fn"],
];

const batchPaths = new Set(brief.files.map((f) => f.path));
for (const [sp, sn, tp, tn, kind] of CALLS) {
	const source = F(sp, sn);
	if (!nodeIds.has(source)) throw new Error(`missing call source ${source}`);
	let target;
	if (kind === "file") target = File(tp);
	else if (kind === "class") target = C(tp, tn);
	else target = F(tp, tn);
	if (kind !== "file" && tp === sp && !nodeIds.has(target)) {
		throw new Error(`missing same-file call target ${target}`);
	}
	// Same-batch cross-file symbols live in other parts; Step E only allows file: targets there.
	if (kind !== "file" && tp !== sp && batchPaths.has(tp)) {
		target = File(tp);
	}
	addEdge({ source, target, type: "calls", direction: "forward", weight: 0.8 });
}

addEdge({
	source: C("packages/tui/src/components/cancellable-loader.ts", "CancellableLoader"),
	target: File("packages/tui/src/components/loader.ts"),
	type: "inherits",
	direction: "forward",
	weight: 0.9,
});
addEdge({
	source: C("packages/tui/src/components/h-stack.ts", "HStack"),
	target: File("packages/tui/src/components/stack.ts"),
	type: "inherits",
	direction: "forward",
	weight: 0.9,
});
addEdge({
	source: C("packages/tui/src/components/v-stack.ts", "VStack"),
	target: File("packages/tui/src/components/stack.ts"),
	type: "inherits",
	direction: "forward",
	weight: 0.9,
});
addEdge({
	source: C("packages/tui/src/components/loader.ts", "Loader"),
	target: File("packages/tui/src/components/text.ts"),
	type: "inherits",
	direction: "forward",
	weight: 0.9,
});
addEdge({
	source: C("packages/tui/src/components/stack.ts", "Stack"),
	target: C("packages/tui/src/tui.ts", "Container"),
	type: "inherits",
	direction: "forward",
	weight: 0.9,
});

addEdge({
	source: C("packages/tui/src/components/scroll-view.ts", "ScrollView"),
	target: C("packages/tui/src/tui.ts", "Container"),
	type: "inherits",
	direction: "forward",
	weight: 0.9,
});

const importExpected = Object.values(brief.batchImportData).reduce((n, arr) => n + arr.length, 0);
const importActual = edges.filter((e) => e.type === "imports").length;
if (importActual !== importExpected) {
	throw new Error(`imports mismatch: expected ${importExpected}, got ${importActual}`);
}

const neighborSymbols = new Map();
for (const neighbors of Object.values(brief.neighborMap || {})) {
	for (const n of neighbors) {
		if (!neighborSymbols.has(n.path)) neighborSymbols.set(n.path, new Set());
		for (const sym of n.symbols || []) neighborSymbols.get(n.path).add(sym);
	}
}
const importTargets = new Set(Object.values(brief.batchImportData).flat());
const neighborFiles = new Set(Object.values(brief.neighborMap || {}).flat().map((n) => n.path));

function edgeTargetOk(target, partNodeIds) {
	if (partNodeIds.has(target)) return true;
	if (target.startsWith("file:")) {
		const fp = target.slice("file:".length);
		return importTargets.has(fp) || neighborFiles.has(fp);
	}
	const fn = target.match(/^(function|class):(.+):([^:]+)$/);
	if (fn) {
		const pth = fn[2];
		const symbol = fn[3];
		return neighborSymbols.get(pth)?.has(symbol) === true;
	}
	return false;
}

const filesAlpha = [...brief.files.map((f) => f.path)].sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;
let parts = Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));

function chunkFiles(partCount) {
	const size = Math.ceil(filesAlpha.length / partCount);
	const groups = [];
	for (let i = 0; i < filesAlpha.length; i += size) groups.push(filesAlpha.slice(i, i + size));
	return groups;
}

function assignParts(groups) {
	return groups.map((group) => {
		const fileSet = new Set(group);
		const partNodes = nodes.filter((n) => fileSet.has(n.filePath));
		const partIds = new Set(partNodes.map((n) => n.id));
		const partEdges = edges.filter((e) => partIds.has(e.source));
		return { files: group, nodes: partNodes, edges: partEdges, ids: partIds };
	});
}

function partsOk(assigned) {
	return assigned.every((p) => p.nodes.length <= 60 && p.edges.length <= 120);
}

let assigned = assignParts(chunkFiles(parts));
while (!partsOk(assigned) && parts < filesAlpha.length) {
	parts += 1;
	assigned = assignParts(chunkFiles(parts));
}
if (!partsOk(assigned)) {
	throw new Error(
		"cannot split under limits: " + assigned.map((p, i) => `p${i + 1}=${p.nodes.length}n/${p.edges.length}e`).join(" "),
	);
}

const outDir = path.join(UA_DIR, "intermediate");
const written = [];
assigned.forEach((part, idx) => {
	const bad = [];
	for (const e of part.edges) {
		if (!part.ids.has(e.source)) bad.push({ reason: "source missing", e });
		if (!edgeTargetOk(e.target, part.ids)) bad.push({ reason: "target invalid", e });
	}
	if (bad.length) {
		console.error(JSON.stringify(bad.slice(0, 25), null, 2));
		throw new Error(`validation failed on part ${idx + 1}: ${bad.length} bad edges`);
	}
	const payload = { nodes: part.nodes, edges: part.edges };
	const name = assigned.length === 1 ? "batch-20.json" : `batch-20-part-${idx + 1}.json`;
	const outPath = path.join(outDir, name);
	fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
	written.push({ name, nodes: part.nodes.length, edges: part.edges.length, files: part.files });
});

console.log(JSON.stringify({ nodeCount, edgeCount, parts: written.length, importActual, written }, null, 2));
