> 本文为 [settings.md](settings.md) 的中文译本。

# 设置

Pi 使用 JSON 设置文件，项目设置覆盖全局设置。

| 位置 | 作用域 |
|----------|-------|
| `~/.pi/agent/settings.json` | 全局（所有项目） |
| `.pi/settings.json` | 项目（当前目录） |

可直接编辑，或用 `/settings` 改常见选项。要在交互中保存启动模型默认值，使用 `/model` 并在目标模型上按 Ctrl+S。要保存启动 thinking 级别，使用 `/thinking` 并按 Ctrl+S。

## 项目信任

交互式启动时，若项目文件夹包含项目本地设置、资源或项目 `.agents/skills`，且 `~/.pi/agent/trust.json` 中没有该文件夹或其父文件夹的已保存决定，pi 会先询问是否信任。信任项目后，pi 可以加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目软件包，并执行项目扩展。

非交互模式（`-p`、`--mode json` 和 `--mode rpc`）不显示信任提示。没有适用的已保存信任决定时，它们使用全局设置中的 `defaultProjectTrust`：`ask`（默认）和 `never` 会忽略这些项目资源，`always` 则信任它们。传入 `--approve`/`-a` 或 `--no-approve`/`-na` 可覆盖本次运行的项目信任。

若没有扩展或已保存决定适用，由 `defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中设为 `"ask"`、`"always"` 或 `"never"`，或用 `/settings` 更改。

`pi config` 和软件包命令使用同一套项目信任流程，但 `pi update` 从不提示。传入 `--approve` 可为本条命令信任项目本地设置，或传入 `--no-approve` 忽略它们。

在交互模式使用 `/trust` 可为后续会话保存项目信任决定，包括对直接父文件夹的信任。它只写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此需重启 pi 后更改才生效。

## 全部设置

### 模型与 Thinking

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `defaultProvider` | string | - | 启动提供方（例如 `"anthropic"`、`"openai"`；在 `/model` 中用 Ctrl+S 保存，或手动编辑） |
| `defaultModel` | string | - | 启动模型 ID（在 `/model` 中用 Ctrl+S 保存，或手动编辑） |
| `defaultThinkingLevel` | string | - | 启动 thinking 级别（在 `/thinking` 中用 Ctrl+S 保存，或手动编辑）：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` |
| `modelThinkingLevels` | object | - | 按模型的启动 thinking 级别，键为 `"provider/modelId"`；从 `/settings` → Default thinking level per model 配置，或手动编辑 |
| `hideThinkingBlock` | boolean | `false` | 在输出中隐藏 thinking 块 |
| `showCacheMissNotices` | boolean | `false` | 对显著的 prompt 缓存未命中、压缩或分支摘要用量，以及提供方恢复诊断（例如被丢弃的 Anthropic thinking 块）显示 transcript 通知 |
| `thinkingBudgets` | object | - | 每个 thinking 级别的自定义 token 预算。Anthropic、Google 和 Bedrock 原生使用这些值。OpenAI 兼容模型在设置了 `compat.thinkingTokenBudgetField`（或 `supportsThinkingTokenBudget`）时使用。 |

#### thinkingBudgets

```json
{
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 4096,
    "medium": 10240,
    "high": 32768
  }
}
```

### UI 与显示

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `theme` | string | `"dark"` | 主题名（`"dark"`、`"light"` 或自定义） |
| `externalEditor` | string | 先 `$VISUAL`，再 `$EDITOR`，然后 Windows 上为 Notepad，其他平台为 `nano` | Ctrl+G 外部编辑器命令；优先于环境变量 |
| `quietStartup` | boolean | `false` | 隐藏启动页眉 |
| `defaultProjectTrust` | string | `"ask"` | 回退的项目信任行为：`"ask"`、`"always"` 或 `"never"`。仅全局设置 |
| `collapseChangelog` | boolean | `false` | 更新后显示精简 changelog |
| `enableInstallTelemetry` | boolean | `true` | 发送匿名安装/更新 ping 以及所选提供方归因请求头。这不控制更新检查 |
| `enableAnalytics` | boolean | `false` | 选择加入的分析数据共享。目前只在实验性首次设置（`PI_EXPERIMENTAL=1`）期间询问 |
| `trackingId` | string | - | 分析跟踪标识符，在打开 `enableAnalytics` 时生成 |
| `doubleEscapeAction` | string | `"tree"` | 双击 Escape 的动作：`"tree"`、`"fork"` 或 `"none"` |
| `treeFilterMode` | string | `"default"` | `/tree` 的默认过滤器：`"default"`、`"no-tools"`、`"user-only"`、`"labeled-only"`、`"all"` |
| `editorPaddingX` | number | `0` | 输入编辑器的水平内边距（0-3） |
| `outputPad` | number | `1` | 用户消息、助手消息和 thinking 的水平内边距（0 或 1） |
| `autocompleteMaxVisible` | number | `5` | 自动补全下拉中最多可见项数（3-20） |
| `showHardwareCursor` | boolean | `false` | TUI 为 IME 定位光标时显示终端光标 |
| `tuiMode` | string | `"regular"` | 交互 TUI 模式：`"regular"` 或实验性 `"fullscreen"`。`/settings` 中的更改立即生效；`--tui-mode` 在启动时覆盖此设置 |
| `fullscreenExitOutput` | string | `"transcript"` | 全屏退出输出：`"transcript"` 打印最终 transcript 和恢复提示，`"resume-hint"` 恢复之前的屏幕并只打印恢复提示。对普通 TUI 模式无效 |
| `fullscreenScrollbar` | string | `"auto"` | 全屏 transcript 滚动条：`"auto"` 在滚动时或指针位于最右列轨道上时临时显示，`"always"` 预留该列并保持可见，`"hidden"` 隐藏。对普通 TUI 模式无效 |
| `fullscreenCopyOnSelect` | boolean | `true` | 全屏模式自动复制选中文本。禁用时选区保持高亮，`Ctrl+X` 复制活动选区 |

对 VS Code，加上 `--wait`，以便编辑器退出后 pi 继续：

```json
{
  "externalEditor": "code --wait"
}
```

### 遥测与更新检查

`enableInstallTelemetry` 控制发往 `https://pi.dev/api/report-install` 的匿名安装/更新 ping，以及 OpenRouter、NVIDIA NIM 和 Cloudflare 提供方请求的 Pi 归因头。选择退出会同时禁用这两项。它不会禁用更新检查；Pi 仍可获取 `https://pi.dev/api/latest-version` 以查找最新版本。

设置 `PI_SKIP_VERSION_CHECK=1` 可禁用 Pi 版本更新检查。使用 `--offline` 或 `PI_OFFLINE=1` 可禁用此处描述的全部启动网络操作，包括更新检查、软件包更新检查，以及安装/更新遥测。

### 网络

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `httpProxy` | string | - | HTTP 代理 URL，应用为 `HTTP_PROXY` 和 `HTTPS_PROXY`。仅全局设置。 |

```json
{
  "httpProxy": "http://127.0.0.1:7890"
}
```

### 警告

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `warnings.anthropicExtraUsage` | boolean | `true` | 当 Anthropic 订阅鉴权可能使用付费额外用量时显示警告 |

```json
{
  "warnings": {
    "anthropicExtraUsage": false
  }
}
```

### 压缩

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `compaction.enabled` | boolean | `true` | 启用自动压缩 |
| `compaction.reserveTokens` | number | `16384` | 为 LLM 回复预留的 token |
| `compaction.keepRecentTokens` | number | `20000` | 保留的近期 token（不摘要） |
| `compaction.modelOverrides` | object | - | 按模型覆盖 `reserveTokens` 和 `keepRecentTokens`，键为精确的 `"provider/modelId"` |

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

#### 按模型覆盖压缩设置

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000,
    "modelOverrides": {
      "some-provider/big-model": {
        "reserveTokens": 400000
      },
      "local/small-model": {
        "reserveTokens": 2048,
        "keepRecentTokens": 4096
      }
    }
  }
}
```

键匹配精确、区分大小写的 `provider/modelId` 值，不是名称或 glob 模式。模型 ID 可以包含斜杠（例如 `openrouter/anthropic/claude-sonnet-4`）。

每个 token 设置独立解析：匹配的模型覆盖 → 普通 `compaction` 设置 → 内置默认。在示例中，`some-provider/big-model` 仍使用普通的 20000 近期 token。token 值必须是非负安全整数。匹配模型覆盖中的无效值会在读取时报错；只有省略的字段才回退到普通设置。模型覆盖条目必须是对象。普通 token 设置无效会在读取时报错，即使活动模型有有效覆盖。只有省略的普通值才使用内置默认。接受 0，但 `reserveTokens: 0` 不留回复余量，也会把摘要输出预算设为 0。

全局和项目设置在模型查找**之前**递归合并。项目可以为某个模型只覆盖一个字段，而不替换该模型的其他字段或其他模型。全局的模型专用值优先于项目级回退；要更改它，请在项目中覆盖同一模型条目。

`enabled` 不是按模型区分的。活动模型的 token 设置适用于手动压缩、自动阈值检查（包括助手轮次之间），以及溢出恢复。切换模型在下一次检查或压缩时生效。在 JSON 中配置覆盖；`/settings` 只保留普通的自动压缩开关。

触发和摘要行为见 [compaction.zh.md](compaction.zh.md)。

### 分支摘要

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `branchSummary.reserveTokens` | number | `16384` | 选择分支历史时预留的 token；输出上限为 4096 token |
| `branchSummary.skipPrompt` | boolean | `false` | `/tree` 导航时跳过 “Summarize branch?” 提示（默认不摘要） |

### 重试

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `retry.enabled` | boolean | `true` | 在瞬时错误时启用自动 agent 级重试 |
| `retry.maxRetries` | number | `3` | 最大 agent 级重试次数 |
| `retry.baseDelayMs` | number | `2000` | agent 级指数退避的基础延迟（2s、4s、8s） |
| `retry.maxAgentDelayMs` | number | `60000` | 最大 agent 级重试延迟（60s） |
| `retry.provider.timeoutMs` | number | SDK 默认 | 提供方/SDK 请求超时（毫秒） |
| `retry.provider.maxRetries` | number | `0` | 提供方/SDK 重试次数 |
| `retry.provider.maxRetryDelayMs` | number | `60000` | 失败前等待的最大服务器请求延迟（60s） |

agent 级重试使用由 `retry.maxAgentDelayMs` 封顶的指数退避，因此长时间中断后的重试仍能保持响应。

当提供方请求的重试延迟长于 `retry.provider.maxRetryDelayMs` 时，请求会立即失败并给出说明性错误，而不是静默等待。设为 `0` 可禁用该上限。

除非明确需要提供方级重试，请把 `retry.provider.maxRetries` 保持为 `0`。设为大于 `0` 可能让 SDK/提供方重试在 Pi 看到之前处理超出用量限额的错误，在某些情况下会阻塞 agent，直到提供方配额重置。

```json
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000,
    "maxAgentDelayMs": 60000,
    "provider": {
      "timeoutMs": 3600000,
      "maxRetries": 0,
      "maxRetryDelayMs": 60000
    }
  }
}
```

### 消息投递

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `steeringMode` | string | `"one-at-a-time"` | 转向消息的发送方式：`"all"` 或 `"one-at-a-time"` |
| `followUpMode` | string | `"one-at-a-time"` | 后续消息的发送方式：`"all"` 或 `"one-at-a-time"` |
| `transport` | string | `"auto"` | 支持多种传输的提供方的首选传输：`"sse"`、`"websocket"`、`"websocket-cached"` 或 `"auto"` |
| `httpIdleTimeoutMs` | number | `300000` | HTTP 头/正文空闲超时（毫秒），也用于带显式流空闲超时的提供方。设为 `0` 禁用。 |
| `websocketConnectTimeoutMs` | number | `15000` | 支持 WebSocket 传输的提供方的 WebSocket 连接/打开握手超时（毫秒）。设为 `0` 禁用。 |

### 终端与图片

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `terminal.showImages` | boolean | `true` | 在终端中显示图片（若支持） |
| `terminal.imageWidthCells` | number | `60` | 内联图片的首选宽度（终端单元格） |
| `terminal.clearOnShrink` | boolean | `false` | 内容收缩时清除空行（可能闪烁） |
| `terminal.hyperlinks` | boolean 或 `"auto"` | `"auto"` | 覆盖 OSC 8 超链接支持（高级，仅 JSON） |
| `terminal.images` | string 或 boolean | `"auto"` | 用 `"kitty"`、`"iterm2"`、`false` 或 `"auto"` 覆盖图片协议支持（高级，仅 JSON） |
| `terminal.trueColor` | boolean 或 `"auto"` | `"auto"` | 覆盖 truecolor 支持（高级，仅 JSON） |
| `images.autoResize` | boolean | `true` | 将图片缩放到最大 2000x2000。适用于 `@file` 附件、`read` 以及工具返回的图片 |
| `images.blockImages` | boolean | `false` | 阻止向 LLM 发送任何图片 |

### Shell

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `shellPath` | string | - | 自定义 shell 路径（例如 Windows 上的 Cygwin）；支持前导 `~` 表示主目录 |
| `shellCommandPrefix` | string | - | 每条 bash 命令的前缀（例如 `"shopt -s expand_aliases"`） |
| `npmCommand` | string[] | - | 用于 npm 软件包查找/安装操作的命令 argv（例如 `["mise", "exec", "node@20", "--", "npm"]`） |

JSON 中的 Windows 路径必须使用正斜杠或转义反斜杠：

```json
{
  "shellPath": "C:/Program Files/Git/bin/bash.exe"
}
```

```json
{
  "shellPath": "C:\\Program Files\\Git\\bin\\bash.exe"
}
```

```json
{
  "npmCommand": ["mise", "exec", "node@20", "--", "npm"]
}
```

`npmCommand` 用于全部 npm 包管理操作，包括安装、卸载，以及 git 软件包内的依赖安装。用户范围的 npm 软件包装到 `~/.pi/agent/npm/`；项目范围的 npm 软件包装到 `.pi/npm/`。使用与进程启动完全一致的 argv 风格条目。配置了 `npmCommand` 时，git 软件包依赖安装使用普通 `install`，以避免包装器或替代包管理器中的 npm 专用标志。

### 工具

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `defaultTools` | string[] | - | 初始启用的内置工具。省略时，Pi 使用其标准默认值 |

`defaultTools` 选择启动时启用的内置工具。扩展和 SDK 自定义工具仍保持启用。可用内置工具为 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find` 和 `ls`：

```json
{
  "defaultTools": ["bash", "edit", "write"]
}
```

在 Windows 上选择 `powershell` 而不是 `bash`，或两者都包含：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

空数组启动时没有内置工具，但保留扩展和 SDK 自定义工具。`--tools` 用对全部工具的严格白名单替换此行为，`--no-tools` 禁用全部工具，`--no-builtin-tools` 禁用内置默认。`--exclude-tools` 过滤结果列表。项目的 `defaultTools` 数组替换全局数组。

### 会话

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `sessionDir` | string | - | 会话文件存储目录。接受绝对或相对路径，以及 `~`。 |

```json
{ "sessionDir": ".pi/sessions" }
```

当多个来源指定会话目录时，优先级为 `--session-dir`、`PI_CODING_AGENT_SESSION_DIR`，然后是 settings.json 中的 `sessionDir`。

### 模型循环

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `enabledModels` | string[] | - | 用于 Ctrl+P 循环的模型模式（格式与 `--models` CLI 标志相同） |

```json
{
  "enabledModels": ["claude-*", "gpt-4o", "gemini-2*"]
}
```

### Markdown

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `markdown.codeBlockIndent` | string | `"  "` | 代码块缩进 |
| `markdown.mermaid` | string | `"streaming"` | Mermaid 渲染模式：`"off"`、`"final"` 或 `"streaming"` |

### 资源

这些设置定义从何处加载扩展、skill、prompt 和主题。

`~/.pi/agent/settings.json` 中的路径相对于 `~/.pi/agent` 解析。`.pi/settings.json` 中的路径相对于 `.pi` 解析。支持绝对路径和 `~`。

| 设置项 | 类型 | 默认值 | 说明 |
|---------|------|---------|-------------|
| `packages` | array | `[]` | 从中加载资源的 npm/git 软件包 |
| `extensions` | string[] | `[]` | 本地扩展文件路径或目录 |
| `skills` | string[] | `[]` | 本地 skill 文件路径或目录 |
| `prompts` | string[] | `[]` | 本地 prompt 模板路径或目录 |
| `themes` | string[] | `[]` | 本地主题文件路径或目录 |
| `enableSkillCommands` | boolean | `true` | 把 skill 注册为 `/skill:name` 命令 |

数组支持 glob 模式和排除。用 `!pattern` 排除。用 `+path` 强制包含精确路径，用 `-path` 强制排除精确路径。

#### packages

字符串形式加载软件包的全部资源：

```json
{
  "packages": ["pi-skills", "@org/my-extension"]
}
```

对象形式过滤要加载的资源：

```json
{
  "packages": [
    {
      "source": "pi-skills",
      "skills": ["brave-search", "transcribe"],
      "extensions": []
    }
  ]
}
```

软件包管理详情见 [packages.zh.md](packages.zh.md)。

## 示例

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514",
  "defaultThinkingLevel": "medium",
  "modelThinkingLevels": {
    "anthropic/claude-sonnet-4-20250514": "high"
  },
  "theme": "dark",
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3
  },
  "enabledModels": ["claude-*", "gpt-4o"],
  "warnings": {
    "anthropicExtraUsage": true
  },
  "packages": ["pi-skills"]
}
```

## 项目覆盖

项目设置（`.pi/settings.json`）覆盖全局设置。嵌套对象会合并：

```json
// ~/.pi/agent/settings.json（全局）
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 16384 }
}

// .pi/settings.json（项目）
{
  "compaction": { "reserveTokens": 8192 }
}

// 结果
{
  "theme": "dark",
  "compaction": { "enabled": true, "reserveTokens": 8192 }
}
```
