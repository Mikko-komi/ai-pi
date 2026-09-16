<p align="center">
  <a href="https://pi.dev">
    <img alt="pi logo" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://www.npmjs.com/package/@earendil-works/pi-coding-agent"><img alt="npm" src="https://img.shields.io/npm/v/@earendil-works/pi-coding-agent?style=flat-square" /></a>
</p>

> 本文为 [README.md](README.md) 的中文译本。

> 新贡献者提交的 issue 和 PR 默认会被自动关闭。维护者每天会审阅被自动关闭的 issue。见 [CONTRIBUTING.zh.md](../../CONTRIBUTING.zh.md)。

---

Pi 是一个精简的终端 coding harness。让 pi 适配你的工作流，而不是反过来，无需 fork 或修改 pi 内部实现。用 TypeScript [Extensions](#extensions)、[Skills](#skills)、[Prompt Templates](#prompt-templates) 和 [Themes](#themes) 扩展它。把 extensions、skills、prompt templates 和 themes 放进 [Pi Packages](#pi-packages)，通过 npm 或 git 与他人分享。

Pi 自带强大的默认能力，但跳过了 sub-agent、plan mode 等功能。你可以让 pi 按你的需求去构建，或安装符合你工作流的第三方 pi package。

Pi 有四种运行模式：交互模式、print 或 JSON、用于进程集成的 RPC，以及用于嵌入自有应用的 SDK。

## 分享你的开源 coding agent 会话

若你用 pi 做开源工作，请分享你的 coding agent 会话。

公开的 OSS 会话数据能用真实开发工作流改进模型、prompt、工具和评测。

完整说明见 [这篇 X 帖](https://x.com/badlogicgames/status/2037811643774652911)。

发布会话请用 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。按其 README.md 配置即可。你只需要 Hugging Face 账号、Hugging Face CLI 和 `pi-share-hf`。

也可以看[这个视频](https://x.com/badlogicgames/status/2041151967695634619)，里面演示了我如何发布 `pi-mono` 会话。

我定期发布自己的 `pi-mono` 工作会话：

- [Hugging Face 上的 badlogicgames/pi-mono](https://huggingface.co/datasets/badlogicgames/pi-mono)

## 目录

- [快速开始](#快速开始)
- [提供方与模型](#提供方与模型)
- [交互模式](#交互模式)
  - [编辑器](#编辑器)
  - [命令](#命令)
  - [键盘快捷键](#键盘快捷键)
  - [消息队列](#消息队列)
- [会话](#会话)
  - [分支](#分支)
  - [Compaction](#compaction)
- [设置](#设置)
- [上下文文件](#上下文文件)
- [定制](#定制)
  - [Prompt Templates](#prompt-templates)
  - [Skills](#skills)
  - [Extensions](#extensions)
  - [Themes](#themes)
  - [Pi Packages](#pi-packages)
- [程序化使用](#程序化使用)
- [设计理念](#设计理念)
- [CLI 参考](#cli-参考)

---

## 快速开始

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 会在安装时禁用依赖的生命周期脚本。Pi 的常规 npm 安装不需要 install 脚本。

安装脚本备选：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

用 API key 鉴权：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

或使用已有订阅：

```bash
pi
/login  # Then select provider
```

然后直接和 pi 对话即可。默认情况下，pi 给模型四个工具：`read`、`write`、`edit` 和 `bash`。模型用它们完成你的请求。通过 [skills](#skills)、[prompt templates](#prompt-templates)、[extensions](#extensions) 或 [pi packages](#pi-packages) 增加能力。

**平台说明：** [Windows](docs/windows.zh.md) | [Termux (Android)](docs/termux.zh.md) | [tmux](docs/tmux.zh.md) | [终端设置](docs/terminal-setup.zh.md) | [Shell 别名](docs/shell-aliases.zh.md)

---

## 提供方与模型

对每个内置提供方，pi 维护一份具备 tool 能力的模型列表。已配置的提供方目录会自动刷新；运行 `pi update --models` 可立即强制刷新。通过订阅（`/login`）或 API key 鉴权后，用 `/model`（或 Ctrl+L）从该提供方选择任意模型。在模型选择器中按 Ctrl+S，可将高亮模型保存为启动默认值。

**订阅：**
- Anthropic Claude Pro/Max
- OpenAI ChatGPT Plus/Pro (Codex)
- GitHub Copilot

**API key：**
- Anthropic
- Ant Ling
- OpenAI
- Azure OpenAI
- DeepSeek
- NVIDIA NIM
- Google Gemini
- Google Vertex
- Amazon Bedrock
- Mistral
- Groq
- Cerebras
- Cloudflare AI Gateway
- Cloudflare Workers AI
- xAI
- OpenRouter
- Vercel AI Gateway
- ZAI Coding Plan (Global)
- ZAI Coding Plan (China)
- OpenCode Zen
- OpenCode Go
- Hugging Face
- Fireworks
- Together AI
- Baseten
- Kimi For Coding
- MiniMax
- Xiaomi MiMo
- Xiaomi MiMo Token Plan (China)
- Xiaomi MiMo Token Plan (Amsterdam)
- Xiaomi MiMo Token Plan (Singapore)

Pi 也支持 llama.cpp router server。用 `/login llama.cpp` 配置，用 `/llama` 管理下载和已加载模型，再用 `/model` 选择已加载的模型。搭建与用法见 [docs/llama-cpp.zh.md](docs/llama-cpp.zh.md)。

其他提供方的配置说明见 [docs/providers.zh.md](docs/providers.zh.md)。

**自定义提供方与模型：** 若提供方使用受支持的 API（OpenAI、Anthropic、Google），可通过 `~/.pi/agent/models.json` 添加。自定义 API 或 OAuth 请用 extensions。见 [docs/models.zh.md](docs/models.zh.md) 和 [docs/custom-provider.zh.md](docs/custom-provider.zh.md)。

---

## 交互模式

<p align="center"><img src="docs/images/interactive-mode.png" alt="Interactive Mode" width="600"></p>

界面自上而下：

- **启动头** - 显示快捷键（全部见 `/hotkeys`）、已加载的 AGENTS.md 文件、prompt templates、skills 和 extensions
- **消息** - 你的消息、assistant 回复、tool call 与结果、通知、错误，以及 extension UI
- **编辑器** - 输入位置；边框颜色表示 thinking 级别，边框还会显示流式工作指示器
- **页脚** - 工作目录、会话名、总 token/cache 用量（`↑` 输入，`↓` 输出，`R` cache 读取，`W` cache 写入，`CH` 最近 cache 命中率）、费用、上下文用量、当前模型。总计包含 assistant 回复、工具上报的用量，以及摘要生成。

编辑器可被其他 UI 临时替换，例如内置 `/settings`，或来自 extensions 的自定义 UI（例如让用户以结构化格式回答模型提问的问答工具）。[Extensions](#extensions) 也可以替换编辑器、在其上方/下方添加 widget、状态行、自定义页脚或 overlay。

### 编辑器

| 功能 | 用法 |
|---------|-----|
| 文件引用 | 输入 `@` 对项目文件做模糊搜索 |
| 路径补全 | Tab 补全路径 |
| 多行 | Shift+Enter（Windows Terminal 上为 Ctrl+Enter） |
| 外部编辑器 | Ctrl+G 打开 `externalEditor`、`$VISUAL`、`$EDITOR`；Windows 上为 Notepad，其他平台为 `nano` |
| 剪贴板 | Ctrl+V 粘贴图片或文本（Windows 上为 Alt+V），或把图片拖到终端上 |
| Bash 命令 | `!command` 运行并把输出发给 LLM，`!!command` 运行但不发送 |

删除单词、撤销等标准编辑按键绑定见 [docs/keybindings.zh.md](docs/keybindings.zh.md)。

### 命令

在编辑器中输入 `/` 可触发命令。[Extensions](#extensions) 可以注册自定义命令，[skills](#skills) 以 `/skill:name` 的形式提供，[prompt templates](#prompt-templates) 通过 `/templatename` 展开。

| 命令 | 说明 |
|---------|-------------|
| `/login`, `/logout` | 管理提供方凭证 |
| [`/llama`](docs/llama-cpp.zh.md) | 下载、加载和卸载 llama.cpp router 模型 |
| `/model` | 切换模型；在选择器中按 Ctrl+S 可保存启动默认值 |
| `/thinking` | 切换 thinking 级别；在选择器中按 Ctrl+S 可保存启动默认值 |
| `/scoped-models` | 启用/禁用供 Ctrl+P 循环的模型 |
| `/settings` | Theme、消息送达、transport 及其他偏好 |
| `/resume` | 从以往会话中选择 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置会话显示名称 |
| `/session` | 显示会话信息（文件、ID、消息、token、费用） |
| `/tree` | 跳到会话中的任意一点并从那里继续 |
| `/trust` | 保存项目信任决定，供之后的会话使用（需重启） |
| `/fork` | 从之前的一条用户消息创建新会话 |
| `/clone` | 把当前活动分支复制到新会话 |
| `/compact [prompt]` | 手动 compact 上下文，可选自定义说明 |
| `/copy` | 将上一条 assistant 消息复制到剪贴板 |
| `/export [file]` | 将会话导出为 HTML 或 JSONL 文件 |
| `/import <file>` | 从 JSONL 文件导入并恢复会话 |
| `/share` | 上传为私有 GitHub gist，并给出可分享的 HTML 链接 |
| `/reload` | 重新加载 keybindings、extensions、skills、prompts、themes 和上下文文件 |
| `/hotkeys` | 显示全部键盘快捷键 |
| `/changelog` | 显示版本历史 |
| `/quit` | 退出 pi |

### 键盘快捷键

完整列表见 `/hotkeys`。通过 `~/.pi/agent/keybindings.json` 自定义。见 [docs/keybindings.zh.md](docs/keybindings.zh.md)。

**常用：**

| 按键 | 操作 |
|-----|--------|
| Ctrl+C | 清空编辑器 |
| Ctrl+C 两次 | 退出 |
| Escape | 取消/中止 |
| Escape 两次 | 打开 `/tree` |
| Ctrl+L | 打开模型选择器 |
| Ctrl+P / Shift+Ctrl+P | 在 scoped 模型间向前/向后循环 |
| Shift+Tab | 循环切换 thinking 级别 |
| Ctrl+O | 折叠/展开工具输出 |
| Ctrl+T | 折叠/展开 thinking 块 |
| Ctrl+X | 复制上一条 assistant 消息；在禁用全屏 copy-on-select 时，复制当前文本选区 |

### 消息队列

在 agent 工作时提交消息：

- **Enter** 将一条 *steering* 消息入队，在当前 assistant 轮次执行完其 tool call 后送达
- **Alt+Enter** 将一条 *follow-up* 消息入队，仅在 agent 完成全部工作后送达
- **Escape** 中止并将已排队消息恢复到编辑器
- **Alt+Up** 将已排队消息取回到编辑器

在 Windows Terminal 上，`Alt+Enter` 默认是全屏。请在 [docs/terminal-setup.zh.md](docs/terminal-setup.zh.md) 中重新映射，以便 pi 能收到 follow-up 快捷键。

在[设置](docs/settings.zh.md)中配置送达方式：`steeringMode` 和 `followUpMode` 可以是 `"one-at-a-time"`（默认，等待回复）或 `"all"`（一次送达全部已排队消息）。`transport` 为支持多种传输的提供方选择传输偏好（`"sse"`、`"websocket"` 或 `"auto"`）。

---

## 会话

会话以带树结构的 JSONL 文件存储。每条记录有 `id` 和 `parentId`，因此可以原地分支，无需创建新文件。文件格式见 [docs/session-format.zh.md](docs/session-format.zh.md)。

### 管理

会话自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse and select from past sessions
pi --no-session        # Ephemeral mode (don't save)
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Use specific session file or ID
pi --fork <path|id>    # Fork specific session file or ID into a new session
```

在交互模式中用 `/session` 查看当前会话 ID，然后再用 `--session <id>` 或 `--fork <id>` 复用它。

### 分支

**`/tree`** - 原地浏览会话树。选择任意历史点，从那里继续，并在分支之间切换。全部历史保存在同一个文件中。模型正在回复时选择某一点会取消该回复。compaction 或另一次树导航仍在进行时不能继续导航；等它结束后再试。

<p align="center"><img src="docs/images/tree-view.png" alt="Tree View" width="600"></p>

- 输入即可搜索；用 Ctrl+←/Ctrl+→ 或 Alt+←/Alt+→ 折叠/展开并在分支间跳转，用 ←/→ 翻页
- 过滤模式（Ctrl+O）：default → no-tools → user-only → labeled-only → all
- 按 Ctrl+X 复制选中的消息
- 按 Shift+L 将条目标记为书签，按 Shift+T 切换标签时间戳

**`/fork`** - 从活动分支上之前的一条用户消息创建新会话文件。打开选择器，复制到该点为止的活动路径，并把选中的 prompt 放到编辑器中供修改。

**`/clone`** - 在当前位置把当前活动分支复制到新会话文件。新会话保留完整的活动路径历史，并以空编辑器打开。

**`--fork <path|id>`** - 直接从 CLI fork 已有会话文件或部分会话 UUID。这会把完整源会话复制到当前项目中的新会话文件。

### Compaction

长会话可能耗尽上下文窗口。Compaction 会总结较旧的消息，同时保留较新的消息。

**手动：** `/compact` 或 `/compact <custom instructions>`

**自动：** 默认启用。在上下文溢出时触发（恢复并重试），或在接近上限时主动触发。通过 `/settings` 或 `settings.json` 配置。

Compaction 是有损的。完整历史仍留在 JSONL 文件中；用 `/tree` 回顾。通过 [extensions](#extensions) 自定义 compaction 行为。内部机制见 [docs/compaction.zh.md](docs/compaction.zh.md)。

---

## 设置

用 `/settings` 修改常用选项，或直接编辑 JSON 文件：

| 位置 | 作用范围 |
|----------|-------|
| `~/.pi/agent/settings.json` | 全局（所有项目） |
| `.pi/settings.json` | 项目（覆盖全局） |

全部选项见 [docs/settings.zh.md](docs/settings.zh.md)。

### 项目信任

交互模式启动时，若项目文件夹包含项目本地设置、资源或项目 `.agents/skills`，且 `~/.pi/agent/trust.json` 中对该文件夹或其父文件夹没有已保存的决定，pi 会先询问是否信任该项目。信任项目后，pi 可以加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目软件包，并执行项目 extensions。

在做出信任决定之前，pi 只加载上下文文件、用户/全局 extensions，以及 CLI `-e` extensions，以便它们能处理 `project_trust` 事件。项目本地 extensions、由项目软件包管理的 extensions，以及项目设置，只在项目被信任之后才会加载。切换到另一个 cwd 的会话、且该会话的信任尚未在当前进程中解析时，同样适用这一拆分。

非交互模式（`-p`、`--mode json` 和 `--mode rpc`）不会显示信任提示。若没有适用的已保存信任决定，它们使用全局设置中的 `defaultProjectTrust`：`ask`（默认）和 `never` 会忽略这些项目资源，`always` 会信任它们。传入 `--approve`/`-a` 或 `--no-approve`/`-na` 可覆盖单次运行的项目信任。

若没有 extension 或已保存决定适用，由 `defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中将其设为 `"ask"`、`"always"` 或 `"never"`，或用 `/settings` 修改。

`pi config` 和软件包命令使用同一套项目信任流程，但 `pi update` 从不提示。传入 `--approve` 可在单次命令中信任项目本地设置，或传入 `--no-approve` 忽略它们。

在交互模式中用 `/trust` 为之后的会话保存项目信任决定，包括对直接父文件夹的信任。它只写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此需要重启 pi 后更改才会生效。

### 遥测与更新检查

Pi 有两项彼此独立的启动功能：

- **更新检查：** 请求 `https://pi.dev/api/latest-version`，检查是否存在更新的 Pi 版本。用 `PI_SKIP_VERSION_CHECK=1` 禁用。禁用更新检查只关闭这一项检查。
- **安装/更新遥测：** 在首次安装或 changelog 检测到更新之后，向 `https://pi.dev/api/report-install` 发送匿名版本 ping。该设置还控制 OpenRouter、Cloudflare 以及直接 NVIDIA NIM 请求的可选提供方归因头。在 `settings.json` 中将 `enableInstallTelemetry` 设为 `false`，或设置 `PI_TELEMETRY=0` 即可退出。这不会禁用更新检查；除非禁用了更新检查或启用了离线模式，Pi 仍可能联系 `pi.dev` 获取最新版本。

使用 `--offline` 或 `PI_OFFLINE=1` 可禁用此处描述的全部启动网络操作，包括更新检查、软件包更新检查，以及安装/更新遥测。

---

## 上下文文件

Pi 启动时从以下位置加载 `AGENTS.md`（或 `CLAUDE.md`）：
- `~/.pi/agent/AGENTS.md`（全局）
- 父目录（从 cwd 向上遍历）
- 当前目录

若某目录包含 `AGENTS.override.md`，Pi 会加载它，而不是该目录中的 `AGENTS.md` 或 `CLAUDE.md`。其他目录的上下文文件仍会拼接。

用于项目说明（`AGENTS.md`/`CLAUDE.md`）、约定、常用命令。所有匹配文件都会拼接。

用 `--no-context-files`（或 `-nc`）禁用上下文文件加载。

### 系统提示

用 `.pi/SYSTEM.md`（项目）或 `~/.pi/agent/SYSTEM.md`（全局）替换默认 system prompt。用 `APPEND_SYSTEM.md` 追加而不替换。

---

## 定制

### Prompt Templates

可复用的 prompt，以 Markdown 文件存放。输入 `/name` 即可展开。

```markdown
<!-- ~/.pi/agent/prompts/review.md -->
Review this code for bugs, security issues, and performance problems.
Focus on: {{focus}}
```

放到 `~/.pi/agent/prompts/`、`.pi/prompts/`，或放到 [pi package](#pi-packages) 中与他人分享。见 [docs/prompt-templates.zh.md](docs/prompt-templates.zh.md)。

### Skills

按需加载的能力包，遵循 [Agent Skills 标准](https://agentskills.io)。通过 `/skill:name` 调用，或让 agent 自动加载。

```markdown
<!-- ~/.pi/agent/skills/my-skill/SKILL.md -->
# My Skill
Use this skill when the user asks about X.

## Steps
1. Do this
2. Then that
```

放到 `~/.pi/agent/skills/`、`~/.agents/skills/`、`.pi/skills/` 或 `.agents/skills/`（从 `cwd` 向上经过父目录），或放到 [pi package](#pi-packages) 中与他人分享。见 [docs/skills.zh.md](docs/skills.zh.md)。

### Extensions

<p align="center"><img src="docs/images/doom-extension.png" alt="Doom Extension" width="600"></p>

用 TypeScript 模块为 pi 扩展自定义工具、命令、键盘快捷键、事件处理和 UI 组件。

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerTool({ name: "deploy", ... });
  pi.registerCommand("stats", { ... });
  pi.on("tool_call", async (event, ctx) => { ... });
}
```

默认导出也可以是 `async`。pi 会在启动继续之前等待异步 extension factory，适合一次性初始化，例如在调用 `pi.registerProvider()` 之前拉取远程模型列表。

**可以做什么：**
- 自定义工具（或完全替换内置工具）
- Sub-agent 和 plan mode
- 自定义 compaction 与摘要
- 权限门闩和路径保护
- 自定义编辑器和 UI 组件
- 状态行、页头、页脚
- Git checkpoint 与自动 commit
- SSH 和沙箱执行
- MCP server 集成
- 让 pi 看起来像 Claude Code
- 等待时玩游戏（是的，Doom 能跑）
- ...你能想到的任何事

放到 `~/.pi/agent/extensions/`、`.pi/extensions/`，或放到 [pi package](#pi-packages) 中与他人分享。见 [docs/extensions.zh.md](docs/extensions.zh.md) 和 [examples/extensions/](examples/extensions/)。

### Themes

内置：`dark`、`light`。Themes 支持热重载：修改当前活动的 theme 文件后，pi 会立即应用更改。

放到 `~/.pi/agent/themes/`、`.pi/themes/`，或放到 [pi package](#pi-packages) 中与他人分享。见 [docs/themes.zh.md](docs/themes.zh.md)。

### Pi Packages

通过 npm 或 git 打包并分享 extensions、skills、prompts 和 themes。在 [npmjs.com](https://www.npmjs.com/search?q=keywords%3Api-package) 或 [Discord](https://discord.com/channels/1456806362351669492/1457744485428629628) 上查找软件包。

> **安全：** Pi packages 以完整系统权限运行。Extensions 会执行任意代码，skills 可以指示模型执行任何操作，包括运行可执行文件。安装第三方软件包前请先审阅源码。

```bash
pi install npm:@foo/pi-tools
pi install npm:@foo/pi-tools@1.2.3      # pinned version
pi install git:github.com/user/repo
pi install git:github.com/user/repo@v1  # tag or commit
pi install git:git@github.com:user/repo
pi install git:git@github.com:user/repo@v1  # tag or commit
pi install https://github.com/user/repo
pi install https://github.com/user/repo@v1      # tag or commit
pi install ssh://git@github.com/user/repo
pi install ssh://git@github.com/user/repo@v1    # tag or commit
pi remove npm:@foo/pi-tools
pi uninstall npm:@foo/pi-tools          # alias for remove
pi list
pi update                               # update pi only
pi update --all                         # update pi and packages
pi update --extensions                  # update packages only
pi update --models                      # refresh model catalogs only
pi update --self                        # update pi only
pi update --self --force                # reinstall pi even if current
pi update npm:@foo/pi-tools             # update one package
pi config                               # enable/disable extensions, skills, prompts, themes
```

软件包安装到 `~/.pi/agent/git/`（git）或 `~/.pi/agent/npm/`（npm）。用 `-l` 做项目本地安装（`.pi/git/`、`.pi/npm/`）。Git `@ref` 值是钉死的 tag 或 commit；被钉死的软件包会被 `pi update --extensions` 和 `pi update --all` 跳过，因此要用 `pi install git:host/user/repo@new-ref` 把已有软件包移到新的 ref。Git 软件包默认用 `npm install --omit=dev` 安装依赖，因此运行时依赖必须列在 `dependencies` 下；配置了 `npmCommand` 时，git 软件包改用普通 `install`，以便与包装器兼容。若你使用 Node 版本管理器，并希望软件包安装复用稳定的 npm 上下文，请在 `settings.json` 中设置 `npmCommand`，例如 `["mise", "exec", "node@20", "--", "npm"]`。

在 `package.json` 中加入 `pi` 键即可创建软件包：

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

没有 `pi` manifest 时，pi 会从约定目录（`extensions/`、`skills/`、`prompts/`、`themes/`）自动发现。

见 [docs/packages.zh.md](docs/packages.zh.md)。

---

## 程序化使用

### SDK

```typescript
import { createAgentSession, ModelRuntime, SessionManager } from "@earendil-works/pi-coding-agent";

const modelRuntime = await ModelRuntime.create();
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  modelRuntime,
});

await session.prompt("What files are in the current directory?");
```

高级的多会话 runtime 替换请使用 `createAgentSessionRuntime()` 和 `AgentSessionRuntime`。

见 [docs/sdk.zh.md](docs/sdk.zh.md) 和 [examples/sdk/](examples/sdk/)。

### RPC 模式

非 Node.js 集成请使用 stdin/stdout 上的 RPC 模式：

```bash
pi --mode rpc
```

RPC 模式使用严格的 LF 分隔 JSONL 分帧。客户端必须只按 `\n` 拆分记录。不要使用 Node `readline` 这类通用按行读取器，它们也会在 JSON 载荷内部的 Unicode 分隔符处拆分。

协议见 [docs/rpc.zh.md](docs/rpc.zh.md)。

---

## 设计理念

Pi 刻意做成高度可扩展，这样就不必规定你的工作流。其他工具内置的功能，可以用 [extensions](#extensions)、[skills](#skills) 自己做，或从第三方 [pi packages](#pi-packages) 安装。这样核心保持精简，同时让你按自己的工作方式塑造 pi。

**没有 MCP。** 用带 README 的 CLI 工具（见 [Skills](#skills)），或写一个 extension 来加 MCP 支持。[为什么？](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)

**没有 sub-agent。** 做法很多。通过 tmux 拉起 pi 实例，或用 [extensions](#extensions) 自己做，或安装按你的方式实现的软件包。

**没有权限弹窗。** 在容器里运行，或用 [extensions](#extensions) 按你的环境和安全要求做自己的确认流程。

**没有 plan mode。** 把计划写到文件里，或用 [extensions](#extensions) 自己做，或安装一个软件包。

**没有内置 to-do。** 它们会让模型困惑。用 TODO.md 文件，或用 [extensions](#extensions) 自己做。

**没有后台 bash。** 用 tmux。可观测性完整，也能直接交互。

完整理由见[这篇博文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)。

---

## CLI 参考

```bash
pi [options] [--] [@files...] [messages...]
```

### 软件包命令

```bash
pi install <source> [-l]     # Install package, -l for project-local
pi remove <source> [-l]      # Remove package
pi uninstall <source> [-l]   # Alias for remove
pi update [source|self|pi]   # Update pi only, or one package source
pi update --all              # Update pi and packages
pi update --extensions       # Update packages only
pi update --models           # Refresh model catalogs only
pi update --self             # Update pi only
pi update --self --force     # Reinstall pi even if current
pi update --extension <src>  # Update one package
pi list                      # List installed packages
pi config                    # Enable/disable package resources
```

`pi config` 和项目软件包命令接受 `--approve`/`--no-approve`，以便在单次命令中信任或忽略项目本地设置。`pi update` 从不提示项目信任。

### 模式

| 标志 | 说明 |
|------|-------------|
| （默认） | 交互模式 |
| `-p`, `--print` | 打印回复后退出 |
| `--mode json` | 以 JSON 行输出全部事件（见 [docs/json.zh.md](docs/json.zh.md)） |
| `--mode rpc` | 用于进程集成的 RPC 模式（见 [docs/rpc.zh.md](docs/rpc.zh.md)） |
| `--export <in> [out]` | 将会话导出为 HTML |

在 print 模式下，pi 也会读取管道传入的 stdin，并把它合并进初始 prompt：

```bash
cat README.md | pi -p "Summarize this text"
```

### 模型选项

| 选项 | 说明 |
|--------|-------------|
| `--provider <name>` | 提供方（anthropic、openai、google 等） |
| `--model <pattern>` | 模型 pattern 或 ID（支持 `provider/id` 以及可选的 `:<thinking>`） |
| `--api-key <key>` | API key（覆盖环境变量） |
| `--thinking <level>` | `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `--models <patterns>` | 供 Ctrl+P 循环的逗号分隔 pattern |
| `--list-models [search]` | 列出可用模型 |

### 会话选项

| 选项 | 说明 |
|--------|-------------|
| `-c`, `--continue` | 继续最近一次会话 |
| `-r`, `--resume` | 浏览并选择会话 |
| `--session <path\|id>` | 使用指定会话文件或部分 UUID |
| `--fork <path\|id>` | 将指定会话文件或部分 UUID fork 到新会话 |
| `--session-dir <dir>` | 自定义会话存储目录 |
| `--no-session` | 临时模式（不保存） |
| `--name <name>`, `-n <name>` | 启动时设置会话显示名称 |

### 工具选项

| 选项 | 说明 |
|--------|-------------|
| `--tools <list>`, `-t <list>` | 对内置、extension 和自定义工具按名称白名单放行 |
| `--exclude-tools <list>`, `-xt <list>` | 对内置、extension 和自定义工具按名称禁用 |
| `--no-builtin-tools`, `-nbt` | 默认禁用内置工具，但保持 extension/自定义工具可用 |
| `--no-tools`, `-nt` | 默认禁用全部工具 |

可用的内置工具：`read`、`bash`、`powershell`（Windows）、`edit`、`write`、`grep`、`find`、`ls`

### 资源选项

| 选项 | 说明 |
|--------|-------------|
| `-e`, `--extension <source>` | 从路径、npm 或 git 加载 extension（可重复） |
| `--no-extensions` | 禁用 extension 发现 |
| `--skill <path>` | 加载 skill（可重复） |
| `--no-skills` | 禁用 skill 发现 |
| `--prompt-template <path>` | 加载 prompt template（可重复） |
| `--no-prompt-templates` | 禁用 prompt template 发现 |
| `--theme <path>` | 加载 theme（可重复） |
| `--no-themes` | 禁用 theme 发现 |
| `--no-context-files`, `-nc` | 禁用 AGENTS.md 和 CLAUDE.md 上下文文件发现 |

把 `--no-*` 与显式标志组合，即可精确加载所需内容并忽略 settings.json（例如 `--no-extensions -e ./my-ext.ts`）。

### 其他选项

| 选项 | 说明 |
|--------|-------------|
| `--system-prompt <text>` | 替换默认 prompt（上下文文件和 skills 仍会追加） |
| `--append-system-prompt <text>` | 追加到 system prompt |
| `--tui-mode <mode>` | TUI 模式：`regular`（默认）或实验性 `fullscreen` |
| `--use-theme <name[/name]>` | 为本次运行设置初始交互 theme，不改设置 |
| `--verbose` | 强制详细启动输出 |
| `-a`, `--approve` | 本次运行信任项目本地文件 |
| `-na`, `--no-approve` | 本次运行忽略项目本地文件 |
| `--` | 停止解析选项；其余参数视为 prompt 或 `@file` 输入 |
| `-h`, `--help` | 显示帮助 |
| `-v`, `--version` | 显示版本 |

### 文件参数

用 `@` 前缀把文件纳入消息：

```bash
pi @prompt.md "Answer this"
pi -p @screenshot.png "What's in this image?"
pi @code.ts @test.ts "Review these files"
```

### 示例

```bash
# Interactive with initial prompt
pi "List all .ts files in src/"

# Non-interactive
pi -p "Summarize this codebase"

# Prompt beginning with a dash
pi -p -- "- Summarize these points"

# Non-interactive with piped stdin
cat README.md | pi -p "Summarize this text"

# Named one-shot session
pi --name "release audit" -p "Audit this repository"

# Different model
pi --provider openai --model gpt-4o "Help me refactor"

# Model with provider prefix (no --provider needed)
pi --model openai/gpt-4o "Help me refactor"

# Model with thinking level shorthand
pi --model sonnet:high "Solve this complex problem"

# Limit model cycling
pi --models "claude-*,gpt-4o"

# Read-only mode
pi --tools read,grep,find,ls -p "Review the code"

# Disable one extension or built-in tool while keeping the rest available
pi --exclude-tools ask_question

# High thinking level
pi --thinking high "Solve this complex problem"
```

### 环境变量

| 变量 | 说明 |
|----------|-------------|
| `AI_AGENT` | CLI 和 RPC 入口会设为 `pi`，便于通用工具将子进程归属到 Pi |
| `PI_CODING_AGENT` | CLI 和 RPC 入口会设为 `true`，便于子进程检测自己运行在 Pi 内 |
| `PI_CODING_AGENT_DIR` | 覆盖配置目录（默认：`~/.pi/agent`） |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储目录（会被 `--session-dir` 覆盖） |
| `PI_PACKAGE_DIR` | 覆盖软件包目录（对 Nix/Guix 有用，因其 store 路径分词效果差） |
| `PI_OFFLINE` | 禁用启动时的网络操作，包括更新检查、软件包更新检查，以及安装/更新遥测 |
| `PI_SKIP_VERSION_CHECK` | 跳过启动时的 Pi 版本更新检查。这会阻止向 `pi.dev` 请求最新版本 |
| `PI_TELEMETRY` | 覆盖安装/更新遥测和提供方归因头。用 `1`/`true`/`yes` 启用，或 `0`/`false`/`no` 禁用。这不会禁用更新检查 |
| `PI_CACHE_RETENTION` | 设为 `long` 以延长 prompt cache（Anthropic：1 小时，OpenAI：24 小时） |
| `VISUAL`, `EDITOR` | 未设置 `externalEditor` 时，Ctrl+G 的后备外部编辑器；Windows 默认为 Notepad，其他平台为 `nano` |

由 LLM 可调用的 `bash` 和 `powershell` 工具运行的命令也会收到当前会话元数据：

| 变量 | 说明 |
|----------|-------------|
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 会话 JSONL 的绝对路径；临时会话不设置 |
| `PI_PROVIDER` | 当前选中的模型提供方 |
| `PI_MODEL` | 当前选中的模型 ID |
| `PI_REASONING_LEVEL` | 当前有效的 reasoning 级别 |

这些值在每条命令启动时解析。语义、示例以及自定义工具如何退出该注入见[环境变量](docs/environment-variables.zh.md#shell-tool-session-environment)。

---

## 贡献与开发

指南见 [CONTRIBUTING.zh.md](../../CONTRIBUTING.zh.md)，搭建、fork 与调试见 [docs/development.zh.md](docs/development.zh.md)。

## 许可证

MIT

## 另见

- [@earendil-works/pi-ai](https://www.npmjs.com/package/@earendil-works/pi-ai)：核心 LLM 工具包
- [@earendil-works/pi-agent-core](https://www.npmjs.com/package/@earendil-works/pi-agent-core)：Agent 框架
- [@earendil-works/pi-tui](https://www.npmjs.com/package/@earendil-works/pi-tui)：终端 UI 组件

<p align="center">
  <a href="https://pi.dev">pi.dev</a> 域名由下列各方慷慨捐赠
  <br /><br />
  <a href="https://exe.dev"><img src="docs/images/exy.png" alt="Exy mascot" width="48" /><br />exe.dev</a>
</p>
