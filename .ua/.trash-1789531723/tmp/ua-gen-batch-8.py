#!/usr/bin/env python3
"""Generate batch-8 knowledge-graph fragments from extract results."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

UA_DIR = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
EXTRACT = json.loads((UA_DIR / "tmp/ua-file-extract-results-8.json").read_text())
BRIEF = json.loads((UA_DIR / "intermediate/batch-briefs/batch-8.json").read_text())
OUT_DIR = UA_DIR / "intermediate"

BATCH_IMPORT = BRIEF["batchImportData"]
NEIGHBOR_MAP = BRIEF["neighborMap"]

NEIGHBOR_SYMBOLS: dict[str, set[str]] = defaultdict(set)
NEIGHBOR_PATHS: set[str] = set()
for _src, neighbors in NEIGHBOR_MAP.items():
    for n in neighbors:
        NEIGHBOR_PATHS.add(n["path"])
        NEIGHBOR_SYMBOLS[n["path"]].update(n.get("symbols") or [])

IMPORT_PATHS: set[str] = set()
for paths in BATCH_IMPORT.values():
    IMPORT_PATHS.update(paths)


def fid(path: str) -> str:
    return f"file:{path}"


def sid(kind: str, path: str, name: str) -> str:
    return f"{kind}:{path}:{name}"


def span(item: dict) -> int:
    return int(item["endLine"]) - int(item["startLine"]) + 1


def cx(lines: int) -> str:
    if lines > 200:
        return "complex"
    if lines >= 50:
        return "moderate"
    return "simple"


# --- semantic metadata (Chinese) ------------------------------------------------
# Keys: file:<path> | function:<path>:<name> | class:<path>:<name>
META: dict[str, dict] = {
    "file:packages/coding-agent/src/modes/interactive/components/session-selector.ts": {
        "summary": "交互式 session 选择器：按当前/全部范围加载会话，支持搜索排序、重命名、删除确认与路径展示。",
        "tags": ["component", "selector", "session", "tui"],
        "complexity": "complex",
    },
    "function:packages/coding-agent/src/modes/interactive/components/session-selector.ts:formatSessionDate": {
        "summary": "把会话时间格式化为相对描述（分钟/小时/天前）或本地日期。",
        "tags": ["utility", "formatting", "date"],
    },
    "function:packages/coding-agent/src/modes/interactive/components/session-selector.ts:buildSessionTree": {
        "summary": "按 parent 关系将会话列表建成树，供列表缩进与分组显示。",
        "tags": ["tree", "session", "data-model"],
    },
    "function:packages/coding-agent/src/modes/interactive/components/session-selector.ts:flattenSessionTree": {
        "summary": "前序展开会话树为扁平行，保留缩进供 SessionList 渲染。",
        "tags": ["tree", "session", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/components/session-selector.ts:deleteSessionFile": {
        "summary": "删除会话文件并处理失败，供选择器确认删除后调用。",
        "tags": ["session", "filesystem", "mutation"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorHeader": {
        "summary": "选择器页头：展示范围、排序、过滤状态、加载进度与快捷键提示。",
        "tags": ["component", "header", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionList": {
        "summary": "可聚焦会话列表：过滤排序、键盘导航、删除确认与当前会话高亮。",
        "tags": ["component", "list", "keyboard", "tui"],
        "complexity": "complex",
    },
    "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorComponent": {
        "summary": "会话选择器容器：懒加载当前/全部会话，协调重命名输入与 SessionList。",
        "tags": ["component", "selector", "session", "tui"],
        "complexity": "complex",
    },
    "file:packages/coding-agent/src/modes/interactive/components/settings-selector.ts": {
        "summary": "交互式设置面板：用 SettingsList 编辑 compact、主题、thinking、HTTP 超时与项目信任等选项。",
        "tags": ["component", "settings", "selector", "tui"],
        "complexity": "complex",
    },
    "function:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:singleModeThemeItems": {
        "summary": "生成单主题模式下的可选主题项，并附带切换到 automatic 的入口。",
        "tags": ["theme", "settings", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:defaultAutomaticThemes": {
        "summary": "从当前 theme setting 解析 automatic 的 light/dark 回退主题。",
        "tags": ["theme", "settings", "utility"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:WarningSettingsSubmenu": {
        "summary": "警告类设置子菜单：在 SettingsList 上编辑各类 warning 开关。",
        "tags": ["component", "settings", "submenu"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:ThemeSubmenu": {
        "summary": "主题子菜单：单主题或 automatic light/dark 选择，支持预览与取消还原。",
        "tags": ["component", "theme", "submenu", "settings"],
        "complexity": "complex",
    },
    "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent": {
        "summary": "设置选择器根组件：组装 SettingsList 与各子菜单回调。",
        "tags": ["component", "settings", "selector", "tui"],
        "complexity": "complex",
    },
    "file:packages/coding-agent/src/modes/interactive/components/settings-submenu.ts": {
        "summary": "设置页复用的子菜单原语：可搜索单选 SelectSubmenu 与多步 SteppedSubmenu。",
        "tags": ["component", "submenu", "settings", "tui"],
        "complexity": "complex",
    },
    "class:packages/coding-agent/src/modes/interactive/components/settings-submenu.ts:SelectSubmenu": {
        "summary": "带搜索框的单选子菜单，fuzzyFilter 过滤选项并回调选中/取消。",
        "tags": ["component", "submenu", "selector", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/settings-submenu.ts:SteppedSubmenu": {
        "summary": "多步向导子菜单：逐步收集选项，完成后一次性 onComplete。",
        "tags": ["component", "submenu", "wizard", "tui"],
        "complexity": "moderate",
    },
    "file:packages/coding-agent/src/modes/interactive/components/show-images-selector.ts": {
        "summary": "选择是否在工具结果中显示图片的简单 SelectList。",
        "tags": ["component", "selector", "images", "tui"],
        "complexity": "simple",
    },
    "class:packages/coding-agent/src/modes/interactive/components/show-images-selector.ts:ShowImagesSelectorComponent": {
        "summary": "Show images 开关选择器，选中后回调并关闭。",
        "tags": ["component", "selector", "images", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts": {
        "summary": "渲染 skill 调用消息：折叠时只显示标题，展开后输出 Markdown 正文。",
        "tags": ["component", "skill", "message", "tui"],
        "complexity": "simple",
    },
    "class:packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts:SkillInvocationMessageComponent": {
        "summary": "Skill 调用块 UI，按 expanded 切换摘要与完整 Markdown。",
        "tags": ["component", "skill", "message", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/components/status-indicator.ts": {
        "summary": "交互模式状态指示器族：working、retry 倒计时、compaction、branch summary 与 idle 占位。",
        "tags": ["component", "status", "spinner", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:StatusIndicator": {
        "summary": "基于 Loader 的状态指示器基类，提供边框内渲染与 dispose。",
        "tags": ["component", "status", "base-class", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:WorkingStatusIndicator": {
        "summary": "Agent 工作中指示器，使用 theme 着色 spinner 与消息。",
        "tags": ["component", "status", "working", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:RetryStatusIndicator": {
        "summary": "重试倒计时指示器，内嵌 CountdownTimer 并显示取消快捷键。",
        "tags": ["component", "status", "retry", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:CompactionStatusIndicator": {
        "summary": "上下文 compaction 进行中的状态指示器。",
        "tags": ["component", "status", "compaction", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:BranchSummaryStatusIndicator": {
        "summary": "分支摘要生成中的状态指示器。",
        "tags": ["component", "status", "branch-summary", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:IdleStatus": {
        "summary": "空闲占位组件，渲染空白行以稳定 footer 布局。",
        "tags": ["component", "status", "idle", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/components/theme-selector.ts": {
        "summary": "独立主题选择器：列出 getAvailableThemes() 并在焦点变化时预览。",
        "tags": ["component", "theme", "selector", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/theme-selector.ts:ThemeSelectorComponent": {
        "summary": "主题 SelectList，选中应用、取消还原，移动时触发 onPreview。",
        "tags": ["component", "theme", "selector", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/components/thinking-selector.ts": {
        "summary": "Thinking level 选择器：可搜索列表，支持设为默认并显示快捷键。",
        "tags": ["component", "thinking", "selector", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:ThinkingSelectorComponent": {
        "summary": "可聚焦 thinking 选择器，fuzzyFilter 过滤级别并回调 onSelect/onSelectAsDefault。",
        "tags": ["component", "thinking", "selector", "tui"],
        "complexity": "moderate",
    },
    "file:packages/coding-agent/src/modes/interactive/components/tool-execution.ts": {
        "summary": "工具执行 UI：用 tool renderer 画 call/result，支持展开、图片 Kitty 转换与回退文本。",
        "tags": ["component", "tool", "renderer", "tui"],
        "complexity": "complex",
    },
    "class:packages/coding-agent/src/modes/interactive/components/tool-execution.ts:ToolExecutionComponent": {
        "summary": "单个工具调用的渲染容器，流式更新 args/result，并可把图片转 PNG 给 Kitty。",
        "tags": ["component", "tool", "renderer", "images"],
        "complexity": "complex",
    },
    "file:packages/coding-agent/src/modes/interactive/components/tree-selector.ts": {
        "summary": "Session 树选择器：折叠展开、搜索、横向视口、复制节点与就地改标签。",
        "tags": ["component", "tree", "session", "selector"],
        "complexity": "complex",
        "languageNotes": "TreeList 自行实现 Component，用 gutter/connector 与横向 viewport 处理超宽树行。",
    },
    "function:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:renderHorizontalViewport": {
        "summary": "按选中锚点裁剪超宽树行，保证当前节点在可视列内。",
        "tags": ["utility", "viewport", "tree", "tui"],
    },
    "function:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:formatHelpKeys": {
        "summary": "把树选择器相关 keybinding 格式化为帮助行文案。",
        "tags": ["utility", "keybinding", "help"],
    },
    "function:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:compactRawKeys": {
        "summary": "压缩重复的原始按键名，避免帮助行过长。",
        "tags": ["utility", "keybinding", "formatting"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:TreeList": {
        "summary": "会话树列表核心：扁平化、过滤、折叠、键盘导航与节点文本/工具调用展示。",
        "tags": ["component", "tree", "list", "keyboard"],
        "complexity": "complex",
    },
    "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:SearchLine": {
        "summary": "树搜索输入行，把按键转发给 TreeList 的过滤逻辑。",
        "tags": ["component", "search", "tree", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:TreeHelp": {
        "summary": "树选择器底部帮助行，展示导航/折叠/复制快捷键。",
        "tags": ["component", "help", "tree", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:LabelInput": {
        "summary": "就地标签编辑输入框，提交或取消后交回焦点。",
        "tags": ["component", "input", "tree", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:TreeSelectorComponent": {
        "summary": "树选择器容器：组合 TreeList、帮助与标签输入，并转发焦点。",
        "tags": ["component", "selector", "tree", "session"],
        "complexity": "moderate",
    },
    "file:packages/coding-agent/src/modes/interactive/components/trust-selector.ts": {
        "summary": "项目信任选择器：列出 trust 选项，标记已保存决策并确认新选择。",
        "tags": ["component", "trust", "selector", "security"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/modes/interactive/components/trust-selector.ts:formatDecision": {
        "summary": "把已保存的信任路径与 decision 格式化为页头说明。",
        "tags": ["utility", "trust", "formatting"],
    },
    "class:packages/coding-agent/src/modes/interactive/components/trust-selector.ts:TrustSelectorComponent": {
        "summary": "信任选项列表，键盘选择后回调 onSelect，Esc 取消。",
        "tags": ["component", "trust", "selector", "tui"],
        "complexity": "moderate",
    },
    "file:packages/coding-agent/src/modes/interactive/components/user-message-selector.ts": {
        "summary": "从历史用户消息中挑选一条，供编辑或重新提交。",
        "tags": ["component", "selector", "message", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/user-message-selector.ts:UserMessageList": {
        "summary": "用户消息列表：单行预览、键盘导航并回调选中消息。",
        "tags": ["component", "list", "message", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/user-message-selector.ts:UserMessageSelectorComponent": {
        "summary": "用户消息选择器容器，无消息时短暂提示后自动取消。",
        "tags": ["component", "selector", "message", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/components/user-message.ts": {
        "summary": "聊天中的用户消息气泡：经 markdown-transform 渲染，并可用 outputPad 对齐。",
        "tags": ["component", "message", "markdown", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/components/user-message.ts:UserMessageComponent": {
        "summary": "用户消息容器，rebuild 时应用 Markdown 主题与 transformers。",
        "tags": ["component", "message", "markdown", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/components/visual-truncate.ts": {
        "summary": "按视觉行数截断文本：用临时 Text 组件测量换行后再切片。",
        "tags": ["utility", "truncation", "tui", "layout"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/modes/interactive/components/visual-truncate.ts:truncateToVisualLines": {
        "summary": "把文本渲染为视觉行并截到 maxVisualLines，避免撑破聊天视口。",
        "tags": ["utility", "truncation", "tui"],
    },
    "file:packages/coding-agent/src/modes/interactive/external-editor.ts": {
        "summary": "把草稿写入临时文件并 spawn 外部编辑器，读回内容后 stripBom。",
        "tags": ["utility", "editor", "spawn", "io"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/modes/interactive/external-editor.ts:editInExternalEditor": {
        "summary": "启动外部编辑器编辑临时文件，成功则返回去 BOM 后的文本。",
        "tags": ["editor", "spawn", "io"],
    },
    "file:packages/coding-agent/src/modes/interactive/interactive-mode.ts": {
        "summary": "交互模式总控：组装 TUI、快捷键、各类 selector、扩展 UI 与 session 事件循环，业务委托给 AgentSession。",
        "tags": ["entry-point", "tui", "orchestrator", "session"],
        "complexity": "complex",
        "languageNotes": "单类超过 6000 行，集中处理渲染、命令、登录与扩展 UI；createInteractiveTui 从 tui-renderer 再导出。",
    },
    "function:packages/coding-agent/src/modes/interactive/interactive-mode.ts:formatResumeCommand": {
        "summary": "根据 SessionManager 生成可复制的 `pi --resume` 命令行。",
        "tags": ["utility", "session", "cli"],
    },
    "function:packages/coding-agent/src/modes/interactive/interactive-mode.ts:createFuzzyAutocompleteItems": {
        "summary": "对候选项做 fuzzyFilter，再映射为编辑器 AutocompleteItem。",
        "tags": ["autocomplete", "fuzzy", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/interactive-mode.ts:getLoginProviderCompletionOptions": {
        "summary": "按 provider id 合并登录补全项，并汇总可用 authTypes。",
        "tags": ["autocomplete", "auth", "provider"],
    },
    "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:ExpandableText": {
        "summary": "可展开 Text：在折叠摘要与完整文本之间切换。",
        "tags": ["component", "text", "expandable", "tui"],
    },
    "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode": {
        "summary": "交互会话运行时：挂载 TUI、订阅 Agent 事件、弹出选择器并处理 slash/热键命令。",
        "tags": ["orchestrator", "tui", "session", "event-handler"],
        "complexity": "complex",
    },
    "file:packages/coding-agent/src/modes/interactive/model-search.ts": {
        "summary": "为模型选择器提供模糊搜索文本，拼接 id、provider 与显示名。",
        "tags": ["utility", "search", "model", "selector"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/modes/interactive/model-search.ts:getModelSearchText": {
        "summary": "返回模型项的搜索串：id、provider 与 name。",
        "tags": ["utility", "search", "model"],
    },
    "function:packages/coding-agent/src/modes/interactive/model-search.ts:getModelSelectorSearchText": {
        "summary": "模型选择器搜索串：去掉打头的裸 model id，让 provider 前缀查询排在代理 id 之前。",
        "tags": ["utility", "search", "model"],
    },
    "file:packages/coding-agent/src/modes/interactive/session-share.ts": {
        "summary": "分享当前会话：导出带 pi.share 元数据的 JSONL，优先走 Radius，失败则回退 private gist。",
        "tags": ["session", "share", "export", "network"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/modes/interactive/session-share.ts:exportSessionForShare": {
        "summary": "调用 exportSessionToJsonl，并写入 systemPrompt/tools 等分享元数据。",
        "tags": ["session", "export", "share"],
    },
    "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareSession": {
        "summary": "分享入口：导出临时 JSONL，先 tryShareViaRadius，再回退 HTML gist。",
        "tags": ["session", "share", "network"],
    },
    "function:packages/coding-agent/src/modes/interactive/session-share.ts:tryShareViaRadius": {
        "summary": "用 Radius 凭证 POST 会话，成功后用 hyperlink 展示 viewer URL。",
        "tags": ["share", "radius", "network", "auth"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareViaGist": {
        "summary": "通过 gh gist 上传会话 HTML，作为 Radius 失败时的回退。",
        "tags": ["share", "gist", "export"],
        "complexity": "moderate",
    },
    "file:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts": {
        "summary": "交互主题控制器：按 settings 与终端配色应用/预览主题，并监听 color scheme 变化。",
        "tags": ["theme", "controller", "settings", "tui"],
        "complexity": "moderate",
    },
    "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController": {
        "summary": "绑定 TUI 与 SettingsManager，处理 automatic 主题、预览与 dispose。",
        "tags": ["theme", "controller", "settings"],
        "complexity": "moderate",
    },
    "file:packages/coding-agent/src/modes/interactive/theme/theme.ts": {
        "summary": "主题运行时：加载内置/自定义 JSON、解析颜色变量、检测终端 dark/light，并向组件提供 theme 适配器。",
        "tags": ["theme", "ansi", "highlight", "runtime"],
        "complexity": "complex",
        "languageNotes": "truecolor 与 256 色立方/灰度近似；自定义主题可 fs.watch 热更新。",
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setThemeJsonValidator": {
        "summary": "安装主题 JSON 校验器；内置主题可跳过以免拉入 typebox。",
        "tags": ["theme", "validation", "config"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:hexToRgb": {
        "summary": "解析 #RRGGBB 为 RGB 三元组。",
        "tags": ["color", "utility", "theme"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:findClosestCubeIndex": {
        "summary": "在 ANSI 6x6x6 立方通道值上找最近索引。",
        "tags": ["color", "ansi", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:findClosestGrayIndex": {
        "summary": "在 24 级灰度斜坡上找最近索引。",
        "tags": ["color", "ansi", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:rgbTo256": {
        "summary": "把 RGB 映射到 ANSI 256：饱和色走立方，近灰色走灰度斜坡。",
        "tags": ["color", "ansi", "theme"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:fgAnsi": {
        "summary": "生成前景 ANSI：truecolor 用 38;2，否则量化到 256 色。",
        "tags": ["ansi", "color", "theme"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:bgAnsi": {
        "summary": "生成背景 ANSI：truecolor 用 48;2，否则量化到 256 色。",
        "tags": ["ansi", "color", "theme"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveVarRefs": {
        "summary": "递归解析主题颜色变量引用，并检测循环。",
        "tags": ["theme", "validation", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveThemeColors": {
        "summary": "把 colors 表中的变量引用展开为具体色值。",
        "tags": ["theme", "color", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:withThemeColorFallbacks": {
        "summary": "为可选色（滚动条、thinkingMax、searchMatch）填回退。",
        "tags": ["theme", "color", "defaults"],
    },
    "class:packages/coding-agent/src/modes/interactive/theme/theme.ts:Theme": {
        "summary": "主题实例：缓存 fg/bg ANSI，并提供 bold/italic 等样式与边框色。",
        "tags": ["theme", "ansi", "tui"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getBuiltinThemes": {
        "summary": "枚举打包的内置主题名。",
        "tags": ["theme", "discovery", "utility"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemes": {
        "summary": "返回当前可用主题名列表。",
        "tags": ["theme", "discovery", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemesWithPaths": {
        "summary": "列出内置与自定义主题及其文件路径、来源信息。",
        "tags": ["theme", "discovery", "filesystem"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getCustomThemeInfos": {
        "summary": "扫描自定义主题目录，收集用户主题 JSON。",
        "tags": ["theme", "discovery", "filesystem"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:loadThemeJson": {
        "summary": "读取并解析命名主题的 JSON 文档。",
        "tags": ["theme", "io", "parsing"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:createTheme": {
        "summary": "由 ThemeJson 构造 Theme：解析变量、补回退并生成 ANSI 表。",
        "tags": ["theme", "factory", "color"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:loadThemeFromPath": {
        "summary": "从指定路径加载主题文件并创建 Theme。",
        "tags": ["theme", "io", "factory"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getThemeByName": {
        "summary": "按名称查找已注册或可加载的 Theme。",
        "tags": ["theme", "lookup", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:parseAutoThemeSetting": {
        "summary": "解析 `auto:light,dark` 形式的主题设置。",
        "tags": ["theme", "settings", "parsing"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveThemeSetting": {
        "summary": "结合终端 dark/light 把 theme setting 解析为具体主题名。",
        "tags": ["theme", "settings", "resolution"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getColorFgBgBackgroundIndex": {
        "summary": "从 COLORFGBG 环境变量提取背景色索引。",
        "tags": ["theme", "terminal", "env"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getThemeForRgbColor": {
        "summary": "按 RGB 亮度判断应使用 dark 还是 light 主题。",
        "tags": ["theme", "color", "detection"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalBackgroundFromEnv": {
        "summary": "用 COLORFGBG 等环境变量推断终端背景主题。",
        "tags": ["theme", "terminal", "detection"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalBackgroundTheme": {
        "summary": "查询终端 OSC 背景色（可超时），推断 dark/light。",
        "tags": ["theme", "terminal", "detection"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalThemeForAuto": {
        "summary": "automatic 模式的主题检测：OSC 优先，环境变量回退。",
        "tags": ["theme", "terminal", "auto"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getDefaultTheme": {
        "summary": "返回默认主题名。",
        "tags": ["theme", "defaults", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setRegisteredThemes": {
        "summary": "用扩展或测试注入的 Theme 列表替换注册表。",
        "tags": ["theme", "registry", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:initTheme": {
        "summary": "启动时初始化全局 theme，可选开启文件监视。",
        "tags": ["theme", "initialization", "runtime"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setTheme": {
        "summary": "按名称切换全局 theme，失败时返回 error。",
        "tags": ["theme", "runtime", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setThemeInstance": {
        "summary": "直接安装 Theme 实例为全局 theme。",
        "tags": ["theme", "runtime", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:onThemeChange": {
        "summary": "注册全局主题变更回调。",
        "tags": ["theme", "event-handler", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:startThemeWatcher": {
        "summary": "监视自定义主题文件，变更后重新加载并通知订阅者。",
        "tags": ["theme", "filesystem", "watch"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:stopThemeWatcher": {
        "summary": "关闭主题文件监视器。",
        "tags": ["theme", "filesystem", "watch"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:ansi256ToHex": {
        "summary": "把 ANSI 256 索引还原为近似 hex，供导出/高亮。",
        "tags": ["color", "ansi", "conversion"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getResolvedThemeColors": {
        "summary": "返回指定主题解析后的颜色字典。",
        "tags": ["theme", "color", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:isLightTheme": {
        "summary": "判断主题是否为 light（按背景亮度）。",
        "tags": ["theme", "color", "api"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getThemeExportColors": {
        "summary": "导出 HTML/分享用的主题色板。",
        "tags": ["theme", "export", "color"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:buildCliHighlightTheme": {
        "summary": "把 Theme 映射为 CLI 语法高亮用的 scope 着色函数。",
        "tags": ["theme", "highlight", "cli"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:highlightCode": {
        "summary": "按语言高亮代码行，供工具输出与 Markdown 代码块使用。",
        "tags": ["highlight", "theme", "code"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getLanguageFromPath": {
        "summary": "由文件扩展名/路径推断 highlight.js 语言 id。",
        "tags": ["highlight", "language", "utility"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getMarkdownTheme": {
        "summary": "构造 TUI MarkdownTheme，绑定当前 theme 颜色。",
        "tags": ["theme", "markdown", "adapter"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getSelectListTheme": {
        "summary": "构造 SelectListTheme。",
        "tags": ["theme", "adapter", "tui"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getEditorTheme": {
        "summary": "构造 EditorTheme。",
        "tags": ["theme", "adapter", "editor"],
    },
    "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getSettingsListTheme": {
        "summary": "构造 SettingsListTheme。",
        "tags": ["theme", "adapter", "settings"],
    },
    "file:packages/coding-agent/src/modes/interactive/tui-renderer.ts": {
        "summary": "交互 TUI 组合根：fullscreen 建 TuiAltScreen，regular 建 TuiMainScreen，并用 Proxy 稳定 TUI 引用。",
        "tags": ["factory", "tui", "renderer", "entry-point"],
        "complexity": "moderate",
        "languageNotes": "createInteractiveTuiReference 用 Proxy 在 InteractiveMode 替换 renderer 时保持组件持有的 TUI 引用有效。",
    },
    "function:packages/coding-agent/src/modes/interactive/tui-renderer.ts:createInteractiveTui": {
        "summary": "按 tuiMode 创建 TuiAltScreen 或 TuiMainScreen，并接入复制、打开 URL 与搜索高亮。",
        "tags": ["factory", "tui", "renderer"],
    },
    "function:packages/coding-agent/src/modes/interactive/tui-renderer.ts:createInteractiveTuiReference": {
        "summary": "返回转发到当前 TUI 的 Proxy，避免组件持有已替换的 renderer。",
        "tags": ["factory", "proxy", "tui"],
    },
    "file:packages/coding-agent/src/utils/ansi.ts": {
        "summary": "剥离 ANSI/OSC 转义序列，得到可供测量或复制的纯文本。",
        "tags": ["utility", "ansi", "text"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/utils/ansi.ts:ansiRegex": {
        "summary": "构造匹配 CSI/OSC 等终端序列的正则。",
        "tags": ["ansi", "regex", "utility"],
    },
    "function:packages/coding-agent/src/utils/ansi.ts:stripAnsi": {
        "summary": "删除字符串中的 ANSI 转义，保留可见字符。",
        "tags": ["ansi", "text", "utility"],
    },
    "file:packages/coding-agent/src/utils/changelog.ts": {
        "summary": "解析 CHANGELOG 版本块、规范化仓库相对链接，并计算相对上次版本的新条目。",
        "tags": ["changelog", "parsing", "versioning", "utility"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/utils/changelog.ts:splitLocalTarget": {
        "summary": "拆分本地链接的 path、query 与 fragment。",
        "tags": ["url", "parsing", "utility"],
    },
    "function:packages/coding-agent/src/utils/changelog.ts:resolveRepositoryPath": {
        "summary": "把 changelog 链接路径规范到仓库内 packages/coding-agent 前缀。",
        "tags": ["path", "changelog", "utility"],
    },
    "function:packages/coding-agent/src/utils/changelog.ts:normalizeChangelogLinkTarget": {
        "summary": "把相对/旧仓库链接改写成当前 GitHub 仓库的规范 URL。",
        "tags": ["changelog", "url", "normalization"],
    },
    "function:packages/coding-agent/src/utils/changelog.ts:normalizeChangelogLinks": {
        "summary": "替换 markdown 中的 changelog 链接目标。",
        "tags": ["changelog", "markdown", "normalization"],
    },
    "function:packages/coding-agent/src/utils/changelog.ts:parseChangelog": {
        "summary": "按 `## [x.y.z]` 标题解析 changelog 文件为版本条目列表。",
        "tags": ["changelog", "parsing", "versioning"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/utils/changelog.ts:compareVersions": {
        "summary": "按 major/minor/patch 比较两个 changelog 条目。",
        "tags": ["versioning", "utility", "changelog"],
    },
    "function:packages/coding-agent/src/utils/changelog.ts:getNewEntries": {
        "summary": "筛选出比 lastVersion 更新的 changelog 条目。",
        "tags": ["changelog", "versioning", "filter"],
    },
    "file:packages/coding-agent/src/utils/clipboard-command.ts": {
        "summary": "带超时 spawn 剪贴板 CLI，收集 stdout 并在超时后杀掉子进程。",
        "tags": ["clipboard", "spawn", "utility"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/utils/clipboard-command.ts:runClipboardCommand": {
        "summary": "执行剪贴板命令，支持 timeout、stdin 写入与 stdout 拼接。",
        "tags": ["clipboard", "spawn", "io"],
    },
    "file:packages/coding-agent/src/utils/clipboard-image.ts": {
        "summary": "从 Wayland/X11/WSL PowerShell/原生剪贴板读取图片，并规范 MIME。",
        "tags": ["clipboard", "images", "platform", "utility"],
        "complexity": "complex",
        "languageNotes": "按 WAYLAND_DISPLAY / WSL 探测分流；PowerShell 路径把图片存临时 PNG 再读回。",
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:isWaylandSession": {
        "summary": "根据 WAYLAND_DISPLAY / XDG_SESSION_TYPE 判断 Wayland 会话。",
        "tags": ["clipboard", "wayland", "platform"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:extensionForImageMimeType": {
        "summary": "把支持的图片 MIME 映射为文件扩展名。",
        "tags": ["images", "mime", "utility"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:selectPreferredImageMimeType": {
        "summary": "从剪贴板声明的 MIME 列表中挑选首选图片类型。",
        "tags": ["images", "mime", "clipboard"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:convertToPng": {
        "summary": "用 Photon 把剪贴板字节转为 PNG。",
        "tags": ["images", "conversion", "photon"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaWlPaste": {
        "summary": "通过 wl-paste 列出 MIME 并读取首选图片。",
        "tags": ["clipboard", "wayland", "images"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:isWSL": {
        "summary": "检测当前是否运行在 WSL。",
        "tags": ["platform", "wsl", "utility"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaPowerShell": {
        "summary": "在 WSL/Windows 上用 PowerShell 把剪贴板图像存成 PNG 再读回。",
        "tags": ["clipboard", "powershell", "images", "wsl"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaXclip": {
        "summary": "通过 xclip 从 X11 剪贴板读取图片字节。",
        "tags": ["clipboard", "x11", "images"],
    },
    "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImage": {
        "summary": "按平台依次尝试原生/Wayland/X11/PowerShell 读取剪贴板图片。",
        "tags": ["clipboard", "images", "platform"],
    },
    "file:packages/coding-agent/src/utils/clipboard.ts": {
        "summary": "跨平台读写剪贴板文本；远程会话复制回退 OSC 52。",
        "tags": ["clipboard", "text", "platform", "utility"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/utils/clipboard.ts:readClipboardText": {
        "summary": "按平台调用 pbpaste/wl-paste/xclip 或原生剪贴板读取文本。",
        "tags": ["clipboard", "text", "platform"],
    },
    "function:packages/coding-agent/src/utils/clipboard.ts:copyToClipboard": {
        "summary": "写入剪贴板文本；远程会话额外发射 OSC 52。",
        "tags": ["clipboard", "text", "osc52"],
    },
    "file:packages/coding-agent/src/utils/fs-watch.ts": {
        "summary": "带 error handler 的 fs.watch 封装，以及安全关闭 watcher。",
        "tags": ["filesystem", "watch", "utility"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/utils/fs-watch.ts:closeWatcher": {
        "summary": "关闭 FSWatcher 并忽略已关闭错误。",
        "tags": ["filesystem", "watch", "cleanup"],
    },
    "function:packages/coding-agent/src/utils/fs-watch.ts:watchWithErrorHandler": {
        "summary": "创建 fs.watch 并在 error 时回调，避免未处理异常。",
        "tags": ["filesystem", "watch", "error-handling"],
    },
    "file:packages/coding-agent/src/utils/html.ts": {
        "summary": "解码 HTML 命名/十进制/十六进制实体，供高亮 HTML 转 ANSI。",
        "tags": ["html", "decoding", "utility"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/utils/html.ts:decodeHtmlEntity": {
        "summary": "解码单个 HTML 实体为字符。",
        "tags": ["html", "decoding", "utility"],
    },
    "function:packages/coding-agent/src/utils/html.ts:decodeHtmlEntityAt": {
        "summary": "从 html[index] 起解析一个实体并返回新位置。",
        "tags": ["html", "decoding", "parsing"],
    },
    "file:packages/coding-agent/src/utils/open-browser.ts": {
        "summary": "按平台 spawn 默认浏览器打开 URL（open/xdg-open/cmd start）。",
        "tags": ["browser", "spawn", "platform", "utility"],
        "complexity": "simple",
    },
    "function:packages/coding-agent/src/utils/open-browser.ts:openBrowser": {
        "summary": "detached spawn 系统浏览器打开 target。",
        "tags": ["browser", "spawn", "platform"],
    },
    "file:packages/coding-agent/src/utils/syntax-highlight.ts": {
        "summary": "用 highlight.js 高亮代码，再把 HTML span 映射为 theme 着色的 ANSI。",
        "tags": ["highlight", "ansi", "html", "utility"],
        "complexity": "moderate",
        "languageNotes": "异步 import highlight.js 全语言包；renderHighlightedHtml 解析 span class 为 scope 栈。",
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:loadAllHighlightLanguages": {
        "summary": "延迟加载 highlight.js 全语言索引。",
        "tags": ["highlight", "lazy-load", "initialization"],
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:getScopeFromSpanTag": {
        "summary": "从 highlight.js span 的 class 提取 hljs 作用域名。",
        "tags": ["highlight", "html", "parsing"],
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:getScopeFormatter": {
        "summary": "按 scope 前缀查找 theme 中的着色函数。",
        "tags": ["highlight", "theme", "formatting"],
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:getActiveFormatter": {
        "summary": "从 scope 栈顶向下找第一个可用 formatter。",
        "tags": ["highlight", "theme", "formatting"],
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:renderHighlightedHtml": {
        "summary": "把 highlight.js HTML 转为 ANSI：处理 span 栈与 HTML 实体。",
        "tags": ["highlight", "ansi", "html"],
        "complexity": "moderate",
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:highlight": {
        "summary": "调用 highlight.js（指定语言或自动）并渲染为 ANSI。",
        "tags": ["highlight", "api", "code"],
    },
    "function:packages/coding-agent/src/utils/syntax-highlight.ts:supportsLanguage": {
        "summary": "查询 highlight.js 是否识别该语言名。",
        "tags": ["highlight", "language", "api"],
    },
    "file:packages/tui/src/index.ts": {
        "summary": "@earendil-works/pi-tui 的公共 barrel：重导出组件、TUI、键绑定、模糊匹配与终端图像 API。",
        "tags": ["barrel", "entry-point", "tui", "exports"],
        "complexity": "moderate",
        "languageNotes": "纯 TypeScript 再导出，不包含实现；实现分布在 tui 包内各模块。",
    },
}


def file_complexity(result: dict) -> str:
    return cx(int(result.get("nonEmptyLines") or result.get("totalLines") or 0))


def is_sig_fn(fn: dict, exported: set[str]) -> bool:
    return fn["name"] in exported or span(fn) >= 10


def is_sig_cls(cls: dict, exported: set[str]) -> bool:
    return cls["name"] in exported or span(cls) >= 20 or len(cls.get("methods") or []) >= 2


def make_node(node_id: str, ntype: str, name: str, path: str, line_range=None) -> dict:
    meta = META.get(node_id)
    if not meta or not meta.get("summary") or not meta.get("tags"):
        raise SystemExit(f"missing META for {node_id}")
    node = {
        "id": node_id,
        "type": ntype,
        "name": name,
        "filePath": path,
        "summary": meta["summary"],
        "tags": list(meta["tags"]),
        "complexity": meta.get("complexity") or ("complex" if ntype == "file" else "simple"),
    }
    if line_range:
        node["lineRange"] = line_range
    if meta.get("languageNotes"):
        node["languageNotes"] = meta["languageNotes"]
    return node


def edge(src: str, tgt: str, etype: str, weight: float) -> dict:
    return {"source": src, "target": tgt, "type": etype, "direction": "forward", "weight": weight}


nodes: list[dict] = []
edges: list[dict] = []
node_ids: set[str] = set()
nodes_by_file: dict[str, list[str]] = defaultdict(list)
symbol_nodes: dict[tuple[str, str, str], str] = {}  # (kind, path, name) -> id
exported_symbol_ids: set[str] = set()

# Skip type-only / const re-exports when matching function/class names
SKIP_EXPORT_AS_SYMBOL = {
    "ThemeJson",
    "theme",
    "FS_WATCH_RETRY_DELAY_MS",
    "createInteractiveTui",  # re-export from interactive-mode.ts only
    "createInteractiveTuiReference",
    "getChangelogPath",
}

for result in EXTRACT["results"]:
    path = result["path"]
    export_names = {e["name"] for e in result.get("exports") or []}
    file_id = fid(path)
    fmeta = META[file_id]
    fnode = make_node(file_id, "file", Path(path).name, path)
    fnode["complexity"] = fmeta.get("complexity") or file_complexity(result)
    nodes.append(fnode)
    node_ids.add(file_id)
    nodes_by_file[path].append(file_id)

    for fn in result.get("functions") or []:
        if not is_sig_fn(fn, export_names):
            continue
        nid = sid("function", path, fn["name"])
        n = make_node(nid, "function", fn["name"], path, [fn["startLine"], fn["endLine"]])
        if "complexity" not in META[nid]:
            n["complexity"] = cx(span(fn))
        nodes.append(n)
        node_ids.add(nid)
        nodes_by_file[path].append(nid)
        symbol_nodes[("function", path, fn["name"])] = nid
        if fn["name"] in export_names:
            exported_symbol_ids.add(nid)

    for cls in result.get("classes") or []:
        if not is_sig_cls(cls, export_names):
            continue
        nid = sid("class", path, cls["name"])
        n = make_node(nid, "class", cls["name"], path, [cls["startLine"], cls["endLine"]])
        if "complexity" not in META[nid]:
            n["complexity"] = cx(span(cls))
        nodes.append(n)
        node_ids.add(nid)
        nodes_by_file[path].append(nid)
        symbol_nodes[("class", path, cls["name"])] = nid
        if cls["name"] in export_names:
            exported_symbol_ids.add(nid)

    # contains + exports
    for nid in nodes_by_file[path]:
        if nid == file_id:
            continue
        edges.append(edge(file_id, nid, "contains", 1.0))
        if nid in exported_symbol_ids:
            edges.append(edge(file_id, nid, "exports", 0.8))

    # imports (1:1)
    for imp in BATCH_IMPORT.get(path, []):
        edges.append(edge(file_id, fid(imp), "imports", 0.7))

# inherits (same-file)
STATUS = "packages/coding-agent/src/modes/interactive/components/status-indicator.ts"
for child in (
    "WorkingStatusIndicator",
    "RetryStatusIndicator",
    "CompactionStatusIndicator",
    "BranchSummaryStatusIndicator",
):
    edges.append(
        edge(
            sid("class", STATUS, child),
            sid("class", STATUS, "StatusIndicator"),
            "inherits",
            0.9,
        )
    )

# same-file / same-batch / neighbor calls
CALLS: list[tuple[str, str]] = [
    # session-selector
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorHeader",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyHint",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionList",
        "function:packages/coding-agent/src/modes/interactive/components/session-selector-search.ts:filterAndSortSessions",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionList",
        "function:packages/coding-agent/src/modes/interactive/components/session-selector-search.ts:parseSearchQuery",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionList",
        "function:packages/coding-agent/src/modes/interactive/components/session-selector-search.ts:hasSessionName",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorComponent",
        "class:packages/coding-agent/src/core/session-manager.ts:SessionManager",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorComponent",
        "class:packages/coding-agent/src/core/keybindings.ts:KeybindingsManager",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    # settings-selector -> submenu (same batch; kept if same part or target in this batch nodes)
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/settings-submenu.ts:SelectSubmenu",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/settings-submenu.ts:SteppedSubmenu",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent",
        "function:packages/coding-agent/src/core/http-dispatcher.ts:formatHttpIdleTimeoutMs",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyDisplayText",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:defaultAutomaticThemes",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:parseAutoThemeSetting",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:ThemeSubmenu",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:parseAutoThemeSetting",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:ThemeSubmenu",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getSettingsListTheme",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/settings-submenu.ts:SelectSubmenu",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getSelectListTheme",
    ),
    # skill / status / thinking / theme-selector
    (
        "class:packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts:SkillInvocationMessageComponent",
        "function:packages/coding-agent/src/core/agent-session.ts:parseSkillBlock",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts:SkillInvocationMessageComponent",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyText",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:RetryStatusIndicator",
        "class:packages/coding-agent/src/modes/interactive/components/countdown-timer.ts:CountdownTimer",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/status-indicator.ts:WorkingStatusIndicator",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyText",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/theme-selector.ts:ThemeSelectorComponent",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemes",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/theme-selector.ts:ThemeSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:ThinkingSelectorComponent",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getSelectListTheme",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:ThinkingSelectorComponent",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyDisplayText",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:ThinkingSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    # tool-execution
    (
        "class:packages/coding-agent/src/modes/interactive/components/tool-execution.ts:ToolExecutionComponent",
        "function:packages/coding-agent/src/utils/image-convert.ts:convertToPng",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/tool-execution.ts:ToolExecutionComponent",
        "function:packages/coding-agent/src/core/tools/render-utils.ts:getTextOutput",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/tool-execution.ts:ToolExecutionComponent",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyHint",
    ),
    # tree / trust / user-message
    (
        "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:TreeList",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyHint",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:TreeSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/components/tree-selector.ts:formatHelpKeys",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:formatKeyText",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/trust-selector.ts:TrustSelectorComponent",
        "function:packages/coding-agent/src/core/trust-manager.ts:getProjectTrustOptions",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/trust-selector.ts:TrustSelectorComponent",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyHint",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/trust-selector.ts:TrustSelectorComponent",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:rawKeyHint",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/trust-selector.ts:TrustSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/user-message.ts:UserMessageComponent",
        "function:packages/coding-agent/src/modes/interactive/components/markdown-transform.ts:createMarkdownTransform",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/components/user-message-selector.ts:UserMessageSelectorComponent",
        "class:packages/coding-agent/src/modes/interactive/components/dynamic-border.ts:DynamicBorder",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/external-editor.ts:editInExternalEditor",
        "function:packages/coding-agent/src/utils/text.ts:stripBom",
    ),
    # interactive-mode
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/core/agent-session.ts:AgentSession",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/core/session-manager.ts:SessionManager",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/core/settings-manager.ts:SettingsManager",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/core/keybindings.ts:KeybindingsManager",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/core/model-runtime.ts:ModelRuntime",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/core/agent-session-services.ts:createAgentSessionServices",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:refreshModelCatalogs",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/model-selector.ts:ModelSelectorComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/footer.ts:FooterComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/login-dialog.ts:LoginDialogComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/assistant-message.ts:AssistantMessageComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/core/agent-session.ts:parseSkillBlock",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/core/messages.ts:createCustomMessage",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/ai/src/compat.ts:getModel",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/core/trust-manager.ts:ProjectTrustStore",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/core/http-dispatcher.ts:configureHttpDispatcher",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/modes/interactive/components/mermaid.ts:createMermaidMarkdownTransformer",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "function:packages/coding-agent/src/modes/interactive/external-editor.ts:editInExternalEditor",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/user-message.ts:UserMessageComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/tool-execution.ts:ToolExecutionComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/session-selector.ts:SessionSelectorComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/components/settings-selector.ts:SettingsSelectorComponent",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/interactive-mode.ts:InteractiveMode",
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/interactive-mode.ts:getLoginProviderCompletionOptions",
        "function:packages/coding-agent/src/modes/interactive/components/oauth-selector.ts:formatAuthSelectorProviderType",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/interactive-mode.ts:formatResumeCommand",
        "class:packages/coding-agent/src/core/session-manager.ts:SessionManager",
    ),
    # session-share
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareSession",
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:exportSessionForShare",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareSession",
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:tryShareViaRadius",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareSession",
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareViaGist",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:exportSessionForShare",
        "function:packages/coding-agent/src/core/session-export.ts:exportSessionToJsonl",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:tryShareViaRadius",
        "function:packages/coding-agent/src/cli/auth-command.ts:getAuthCredential",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:tryShareViaRadius",
        "function:packages/coding-agent/src/config.ts:getShareViewerUrl",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/session-share.ts:shareSession",
        "class:packages/coding-agent/src/modes/interactive/components/bordered-loader.ts:BorderedLoader",
    ),
    # theme-controller
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveThemeSetting",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:parseAutoThemeSetting",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:initTheme",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setTheme",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setThemeInstance",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalThemeForAuto",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalBackgroundTheme",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:InteractiveThemeController",
        "class:packages/coding-agent/src/core/settings-manager.ts:SettingsManager",
    ),
    # theme.ts internals + neighbors
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:rgbTo256",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:findClosestCubeIndex",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:rgbTo256",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:findClosestGrayIndex",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:fgAnsi",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:hexToRgb",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:bgAnsi",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:hexToRgb",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveThemeColors",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveVarRefs",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:createTheme",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:resolveThemeColors",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:createTheme",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:withThemeColorFallbacks",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemes",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemesWithPaths",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemesWithPaths",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getCustomThemeInfos",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:loadThemeFromPath",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:createTheme",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:initTheme",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setTheme",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:setTheme",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:startThemeWatcher",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:startThemeWatcher",
        "function:packages/coding-agent/src/utils/fs-watch.ts:watchWithErrorHandler",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:stopThemeWatcher",
        "function:packages/coding-agent/src/utils/fs-watch.ts:closeWatcher",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:highlightCode",
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:highlight",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:highlightCode",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getLanguageFromPath",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:highlightCode",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:buildCliHighlightTheme",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalThemeForAuto",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalBackgroundTheme",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:detectTerminalBackgroundFromEnv",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getColorFgBgBackgroundIndex",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getThemeExportColors",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getResolvedThemeColors",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:loadThemeJson",
        "function:packages/coding-agent/src/utils/text.ts:stripBom",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getAvailableThemesWithPaths",
        "function:packages/coding-agent/src/config.ts:getThemesDir",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getCustomThemeInfos",
        "function:packages/coding-agent/src/config.ts:getCustomThemesDir",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme.ts:Theme",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:fgAnsi",
    ),
    (
        "class:packages/coding-agent/src/modes/interactive/theme/theme.ts:Theme",
        "function:packages/coding-agent/src/modes/interactive/theme/theme.ts:bgAnsi",
    ),
    # tui-renderer
    (
        "function:packages/coding-agent/src/modes/interactive/tui-renderer.ts:createInteractiveTui",
        "function:packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts:keyDisplayText",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/tui-renderer.ts:createInteractiveTui",
        "function:packages/coding-agent/src/utils/clipboard.ts:copyToClipboard",
    ),
    (
        "function:packages/coding-agent/src/modes/interactive/tui-renderer.ts:createInteractiveTui",
        "function:packages/coding-agent/src/utils/open-browser.ts:openBrowser",
    ),
    # changelog
    (
        "function:packages/coding-agent/src/utils/changelog.ts:normalizeChangelogLinks",
        "function:packages/coding-agent/src/utils/changelog.ts:normalizeChangelogLinkTarget",
    ),
    (
        "function:packages/coding-agent/src/utils/changelog.ts:normalizeChangelogLinkTarget",
        "function:packages/coding-agent/src/utils/changelog.ts:splitLocalTarget",
    ),
    (
        "function:packages/coding-agent/src/utils/changelog.ts:normalizeChangelogLinkTarget",
        "function:packages/coding-agent/src/utils/changelog.ts:resolveRepositoryPath",
    ),
    (
        "function:packages/coding-agent/src/utils/changelog.ts:getNewEntries",
        "function:packages/coding-agent/src/utils/changelog.ts:compareVersions",
    ),
    # clipboard
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImage",
        "function:packages/coding-agent/src/utils/clipboard-image.ts:isWaylandSession",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImage",
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaWlPaste",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImage",
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaXclip",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImage",
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaPowerShell",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaWlPaste",
        "function:packages/coding-agent/src/utils/clipboard-image.ts:selectPreferredImageMimeType",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaWlPaste",
        "function:packages/coding-agent/src/utils/clipboard-command.ts:runClipboardCommand",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaXclip",
        "function:packages/coding-agent/src/utils/clipboard-command.ts:runClipboardCommand",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImageViaPowerShell",
        "function:packages/coding-agent/src/utils/clipboard-command.ts:runClipboardCommand",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:convertToPng",
        "function:packages/coding-agent/src/utils/photon.ts:loadPhoton",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard-image.ts:readClipboardImage",
        "function:packages/coding-agent/src/utils/mime.ts:detectSupportedImageMimeType",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard.ts:readClipboardText",
        "function:packages/coding-agent/src/utils/clipboard-command.ts:runClipboardCommand",
    ),
    (
        "function:packages/coding-agent/src/utils/clipboard.ts:copyToClipboard",
        "function:packages/coding-agent/src/utils/clipboard-command.ts:runClipboardCommand",
    ),
    # syntax-highlight
    (
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:highlight",
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:renderHighlightedHtml",
    ),
    (
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:renderHighlightedHtml",
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:getScopeFromSpanTag",
    ),
    (
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:renderHighlightedHtml",
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:getActiveFormatter",
    ),
    (
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:getActiveFormatter",
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:getScopeFormatter",
    ),
    (
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:renderHighlightedHtml",
        "function:packages/coding-agent/src/utils/html.ts:decodeHtmlEntityAt",
    ),
    (
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:supportsLanguage",
        "function:packages/coding-agent/src/utils/syntax-highlight.ts:loadAllHighlightLanguages",
    ),
    # ansi
    (
        "function:packages/coding-agent/src/utils/ansi.ts:stripAnsi",
        "function:packages/coding-agent/src/utils/ansi.ts:ansiRegex",
    ),
]


def parse_node_ref(ref: str) -> tuple[str, str] | None:
    """Return (kind, path) for file:/function:/class: ids."""
    if ref.startswith("file:"):
        return "file", ref[len("file:") :]
    for prefix in ("function:", "class:"):
        if ref.startswith(prefix):
            rest = ref[len(prefix) :]
            # path is everything before the last colon that starts a symbol
            # paths don't contain colon except we use last segment as name
            idx = rest.rfind(":")
            if idx < 0:
                return None
            return prefix[:-1], rest[:idx]
    return None


def symbol_name(ref: str) -> str | None:
    if ref.startswith("function:") or ref.startswith("class:"):
        return ref.rsplit(":", 1)[-1]
    return None


def target_allowed(target: str, part_node_ids: set[str]) -> bool:
    if target in part_node_ids:
        return True
    if target.startswith("file:"):
        path = target[len("file:") :]
        return path in NEIGHBOR_PATHS or path in IMPORT_PATHS
    if target.startswith("function:") or target.startswith("class:"):
        parsed = parse_node_ref(target)
        if not parsed:
            return False
        _kind, path = parsed
        name = symbol_name(target)
        if name and name in NEIGHBOR_SYMBOLS.get(path, set()):
            return True
        # same-batch symbol living in another part: allowed if we created the node
        # globally AND path is in this batch. Step E only allows neighbor.symbols
        # or part-local ids. So same-batch cross-part function targets FAIL.
        return False
    return False


for src, tgt in CALLS:
    if src not in node_ids:
        raise SystemExit(f"call source missing: {src}")
    # target may be in-batch or neighbor
    if tgt not in node_ids:
        parsed = parse_node_ref(tgt)
        name = symbol_name(tgt)
        if not parsed or not name or name not in NEIGHBOR_SYMBOLS.get(parsed[1], set()):
            raise SystemExit(f"call target not in nodes or neighborMap: {tgt}")
    edges.append(edge(src, tgt, "calls", 0.8))


# Dedup edges
seen_e = set()
uniq_edges = []
for e in edges:
    key = (e["source"], e["target"], e["type"])
    if key in seen_e:
        continue
    seen_e.add(key)
    uniq_edges.append(e)
edges = uniq_edges

# Import-edge count check
import_expected = sum(len(v) for v in BATCH_IMPORT.values())
import_actual = sum(1 for e in edges if e["type"] == "imports")
if import_actual != import_expected:
    raise SystemExit(f"imports mismatch: {import_actual} != {import_expected}")

# Unused META keys (typos)
used_ids = {n["id"] for n in nodes}
unused = sorted(set(META) - used_ids)
if unused:
    raise SystemExit(f"unused META keys: {unused[:20]}")

missing_files = [f["path"] for f in BRIEF["files"] if fid(f["path"]) not in used_ids]
if missing_files:
    raise SystemExit(f"missing file nodes: {missing_files}")

# Split
node_count = len(nodes)
edge_count = len(edges)
formula_parts = max(1, math.ceil(max(node_count / 60, edge_count / 120)))

batch_files = sorted({n["filePath"] for n in nodes})
# Increase parts until no chunk exceeds 60 nodes or 120 edges (approx.)
parts = formula_parts
while True:
    group = math.ceil(len(batch_files) / parts)
    chunks = [batch_files[i : i + group] for i in range(0, len(batch_files), group)]
    max_nodes = 0
    max_edges = 0
    for chunk in chunks:
        ids = {nid for p in chunk for nid in nodes_by_file[p]}
        max_nodes = max(max_nodes, len(ids))
        max_edges = max(max_edges, sum(1 for e in edges if e["source"] in ids))
    if (max_nodes <= 60 and max_edges <= 120) or parts >= len(batch_files):
        break
    parts += 1

group = math.ceil(len(batch_files) / parts)
chunks = [batch_files[i : i + group] for i in range(0, len(batch_files), group)]

node_by_id = {n["id"]: n for n in nodes}

written = []
errors = []
for i, chunk in enumerate(chunks, start=1):
    part_ids = {nid for p in chunk for nid in nodes_by_file[p]}
    part_nodes = [n for n in nodes if n["id"] in part_ids]
    part_edges = []
    for e in edges:
        if e["source"] not in part_ids:
            continue
        if target_allowed(e["target"], part_ids):
            part_edges.append(e)
        elif e["type"] == "calls" and e["target"] in node_ids:
            # same-batch cross-part call: drop to satisfy Step E
            continue
        else:
            errors.append((i, e))
    out = {"nodes": part_nodes, "edges": part_edges}
    if parts == 1:
        dest = OUT_DIR / "batch-8.json"
    else:
        dest = OUT_DIR / f"batch-8-part-{i}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    written.append((dest.name, len(part_nodes), len(part_edges), chunk))

if errors:
    msg = ["VALIDATION FAILED:"]
    for part_i, e in errors[:30]:
        msg.append(f"  part {part_i}: {e['type']} {e['source']} -> {e['target']}")
    raise SystemExit("\n".join(msg) + f"\n({len(errors)} invalid edges)")

print(f"nodes={node_count} edges={edge_count} formula_parts={formula_parts} parts={parts}")
print(f"imports={import_actual}")
print(f"files={len(batch_files)} skipped=0")
for name, n, e, chunk in written:
    print(f"  {name}: nodes={n} edges={e} files={len(chunk)}")
