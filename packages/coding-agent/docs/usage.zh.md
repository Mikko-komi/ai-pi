> 本文为 [usage.md](usage.md) 的中文译本。

# 使用 Pi

本页汇总不适合放进快速开始页的日常用法细节。

## 交互模式

<p align="center"><img src="images/interactive-mode.png" alt="交互模式" width="600"></p>

界面有四个主要区域：

- **启动页眉** - 快捷键、已加载的上下文文件、prompt 模板、skill 和扩展
- **消息** - 用户消息、助手回复、工具调用、工具结果、通知、错误和扩展 UI
- **编辑器** - 输入区域；边框颜色表示当前 thinking 级别
- **页脚** - 工作目录、会话名、token/缓存用量、费用、上下文用量和当前模型。总量包含助手回复、工具上报的用量，以及摘要生成。

编辑器可被内置 UI（例如 `/settings`）或自定义扩展 UI 临时替换。

### 编辑器功能

| 功能 | 用法 |
|---------|-----|
| 文件引用 | 输入 `@` 对项目文件做模糊搜索 |
| 路径补全 | 按 Tab 补全路径 |
| 多行输入 | Shift+Enter；Windows Terminal 上为 Ctrl+Enter |
| 复制回复 | Ctrl+X 在 `/tree` 中复制选中的消息；否则复制最后一条助手消息；当 `fullscreenCopyOnSelect` 禁用时，复制全屏中的活动文本选区 |
| 图片 | 用 Ctrl+V 粘贴（Windows 上为 Alt+V），或拖入终端 |
| Shell 命令 | `!command` 运行并把输出发给模型 |
| 隐藏 Shell 命令 | `!!command` 运行但不把输出发给模型 |
| 外部编辑器 | Ctrl+G 打开 `externalEditor`、`$VISUAL`、`$EDITOR`、Windows 上为 Notepad，其他平台为 `nano` |

全部快捷键与自定义见[快捷键](keybindings.zh.md)。

## 斜杠命令

在编辑器中输入 `/` 打开命令补全。扩展可以注册自定义命令，skill 以 `/skill:name` 提供，prompt 模板通过 `/templatename` 展开。

| 命令 | 说明 |
|---------|-------------|
| `/login`、`/logout` | 管理 OAuth 或 API 密钥凭证 |
| [`/llama`](llama-cpp.zh.md) | 下载、加载和卸载 llama.cpp router 模型 |
| `/model` | 切换模型；在选择器中按 Ctrl+S 保存启动默认值 |
| `/thinking` | 切换 thinking 级别；在选择器中按 Ctrl+S 保存启动默认值 |
| `/scoped-models` | 启用/禁用用于 Ctrl+P 循环的模型 |
| `/settings` | 主题、消息投递、传输及其他偏好 |
| `/resume` | 从以往会话中挑选 |
| `/new` | 开始新会话 |
| `/name <name>` | 设置会话显示名称 |
| `/session` | 显示会话文件、ID、消息、token 和费用 |
| `/tree` | 跳到会话中的任意点并从那里继续 |
| `/trust` | 保存项目信任决定，供后续会话使用 |
| `/fork` | 从之前的用户消息创建新会话 |
| `/clone` | 把当前活动分支复制到新会话 |
| `/compact [prompt]` | 手动压缩上下文，可选自定义说明 |
| `/copy` | 把最后一条助手消息复制到剪贴板 |
| `/export [file]` | 将会话导出为 HTML 或 JSONL |
| `/import <file>` | 从 JSONL 文件导入并恢复会话 |
| `/share` | 上传为私有 GitHub gist，并给出可分享的 HTML 链接 |
| `/reload` | 重新加载快捷键、扩展、skill、prompt、主题和上下文文件 |
| `/hotkeys` | 显示全部键盘快捷键 |
| `/changelog` | 显示版本历史 |
| `/quit` | 退出 pi |

## 消息队列

agent 仍在工作时也可以提交消息：

- **Enter** 排队一条转向消息，在当前助手轮次执行完其工具调用后投递。
- **Alt+Enter** 排队一条后续消息，在 agent 完成全部工作后投递。
- **Escape** 中止并把已排队消息恢复到编辑器。
- **Alt+Up** 把已排队消息取回编辑器。

在 Windows Terminal 上，Alt+Enter 默认是全屏。若希望 pi 收到该快捷键，按[终端设置](terminal-setup.zh.md)重新映射。

在[设置](settings.zh.md)中用 `steeringMode` 和 `followUpMode` 配置投递方式。

## 会话

会话自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。

```bash
pi -c                  # 继续最近的会话
pi -r                  # 浏览并选择会话
pi --no-session        # 临时模式；不保存
pi --name "my task"    # 启动时设置会话显示名称
pi --session <path|id> # 使用指定会话文件或会话 ID
pi --fork <path|id>    # 将会话分叉到新的会话文件
```

有用的会话命令：

- `/session` 显示当前会话文件和 ID。
- `/tree` 在文件内会话树中导航，并可摘要已放弃的分支。
- `/fork` 从更早的用户消息创建新会话。
- `/clone` 把当前活动分支复制到新的会话文件。
- `/compact` 摘要较旧消息以释放上下文。

详情见[会话](sessions.zh.md)和[压缩](compaction.zh.md)。

## 上下文文件

Pi 启动时从以下位置加载 `AGENTS.md` 或 `CLAUDE.md`：

- `~/.pi/agent/AGENTS.md` 作为全局说明
- 从当前工作目录向上遍历的父目录
- 当前目录

若某目录包含 `AGENTS.override.md`，Pi 会加载它，而不是该目录中的 `AGENTS.md` 或 `CLAUDE.md`。其他目录的上下文文件仍正常分层。

用上下文文件记录项目约定、命令、安全规则和偏好。用 `--no-context-files` 或 `-nc` 禁用加载。

### 系统提示文件

用以下文件替换默认系统提示：

- 项目级：`.pi/SYSTEM.md`
- 全局：`~/.pi/agent/SYSTEM.md`

在任一位置使用 `APPEND_SYSTEM.md` 可追加到默认提示而不替换它。

### 项目信任

交互式启动时，若项目文件夹包含项目本地设置、资源或项目 `.agents/skills`，且 `~/.pi/agent/trust.json` 中没有该文件夹或其父文件夹的已保存决定，pi 会先询问是否信任。信任项目后，pi 可以加载 `.pi/settings.json` 和 `.pi` 资源、安装缺失的项目软件包，并执行项目扩展。

做出信任决定之前，pi 只加载上下文文件、用户/全局扩展和 CLI `-e` 扩展，以便它们能处理 `project_trust` 事件。项目本地扩展、由项目软件包管理的扩展以及项目设置，只在项目被信任后加载。切换到另一个 cwd 的会话、且当前进程尚未解析该目录的信任时，同样适用这一拆分。

非交互模式（`-p`、`--mode json` 和 `--mode rpc`）不显示信任提示。没有适用的已保存信任决定时，它们使用全局设置中的 `defaultProjectTrust`：`ask`（默认）和 `never` 会忽略这些项目资源，`always` 则信任它们。传入 `--approve`/`-a` 或 `--no-approve`/`-na` 可覆盖本次运行的项目信任。

若没有扩展或已保存决定适用，由 `defaultProjectTrust` 控制回退行为。在 `~/.pi/agent/settings.json` 中设为 `"ask"`、`"always"` 或 `"never"`，或用 `/settings` 更改。

`pi config` 和软件包命令使用同一套项目信任流程，但 `pi update` 从不提示。传入 `--approve` 可为本条命令信任项目本地设置，或传入 `--no-approve` 忽略它们。

在交互模式使用 `/trust` 可为后续会话保存项目信任决定，包括对直接父文件夹的信任。它只写入 `~/.pi/agent/trust.json`；当前会话不会重新加载，因此需重启 pi 后更改才生效。


## 导出与分享会话

使用 `/export [file]` 将会话写成 HTML。

使用 `/share` 上传私有 GitHub gist，并得到可分享的 HTML 链接。

若你用 pi 做开源工作，并希望发布会话供模型、prompt、工具和评估研究使用，见 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。它会把会话发布到 Hugging Face datasets。

## CLI 参考

```bash
pi [options] [--] [@files...] [messages...]
```

### 软件包命令

```bash
pi install <source> [-l]     # 安装软件包，-l 表示项目本地
pi remove <source> [-l]      # 移除软件包
pi uninstall <source> [-l]   # remove 的别名
pi update [source|self|pi]   # 只更新 pi，或更新单个软件包来源
pi update --all              # 更新 pi 和软件包；核对已固定的 git ref
pi update --extensions       # 只更新软件包；核对已固定的 git ref
pi update --models           # 只刷新模型目录
pi update --self             # 只更新 pi
pi update --extension <src>  # 更新单个软件包
pi list                      # 列出已安装软件包
pi config                    # 启用/禁用软件包资源
```

这些命令用于管理 pi 软件包，`pi update` 也可以更新 pi CLI 本身。要卸载 pi 本身，见[快速开始](quickstart.zh.md#卸载)。`pi config` 和项目软件包命令接受 `--approve`/`--no-approve`，为本条命令信任或忽略项目本地设置。`pi update` 从不为项目信任提示。

软件包来源和安全说明见 [Pi 软件包](packages.zh.md)。

### 模式

| 标志 | 说明 |
|------|-------------|
| 默认 | 交互模式 |
| `-p`、`--print` | 打印回复后退出 |
| `--mode json` | 以 JSON 行输出全部事件；见 [JSON 模式](json.zh.md) |
| `--mode rpc` | 通过 stdin/stdout 的 RPC 模式；见 [RPC 模式](rpc.zh.md) |
| `--export <in> [out]` | 将会话导出为 HTML |

打印模式下，pi 也会读取管道传入的 stdin，并合并到初始 prompt：

```bash
cat README.md | pi -p "Summarize this text"
```

### 模型选项

| 选项 | 说明 |
|--------|-------------|
| `--provider <name>` | 提供方，例如 `anthropic`、`openai` 或 `google` |
| `--model <pattern>` | 模型模式或 ID；支持 `provider/id` 和可选的 `:<thinking>` |
| `--api-key <key>` | API 密钥，覆盖环境变量 |
| `--thinking <level>` | `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` |
| `--models <patterns>` | 用于 Ctrl+P 循环的逗号分隔模式 |
| `--list-models [search]` | 列出可用模型 |

### 会话选项

| 选项 | 说明 |
|--------|-------------|
| `-c`、`--continue` | 继续最近的会话 |
| `-r`、`--resume` | 浏览并选择会话 |
| `--session <path\|id>` | 使用指定会话文件或部分 UUID |
| `--fork <path\|id>` | 将会话文件或部分 UUID 分叉到新会话 |
| `--session-dir <dir>` | 自定义会话存储目录 |
| `--no-session` | 临时模式；不保存 |
| `--name <name>`、`-n <name>` | 启动时设置会话显示名称 |

### 工具选项

| 选项 | 说明 |
|--------|-------------|
| `--tools <list>`、`-t <list>` | 仅允许指定的内置、扩展和自定义工具 |
| `--exclude-tools <list>`、`-xt <list>` | 禁用指定的内置、扩展和自定义工具 |
| `--no-builtin-tools`、`-nbt` | 禁用内置工具，但保留扩展/自定义工具 |
| `--no-tools`、`-nt` | 禁用全部工具 |

内置工具：`read`、`bash`、`powershell`（Windows）、`edit`、`write`、`grep`、`find`、`ls`。

### 资源选项

| 选项 | 说明 |
|--------|-------------|
| `-e`、`--extension <source>` | 从路径、npm 或 git 加载扩展；可重复 |
| `--no-extensions` | 禁用扩展发现 |
| `--skill <path>` | 加载 skill；可重复 |
| `--no-skills` | 禁用 skill 发现 |
| `--prompt-template <path>` | 加载 prompt 模板；可重复 |
| `--no-prompt-templates` | 禁用 prompt 模板发现 |
| `--theme <path>` | 加载主题；可重复 |
| `--no-themes` | 禁用主题发现 |
| `--no-context-files`、`-nc` | 禁用 `AGENTS.md` 和 `CLAUDE.md` 发现 |

把 `--no-*` 与显式标志组合，可精确加载所需内容并忽略设置。例如：

```bash
pi --no-extensions -e ./my-extension.ts
```

### 其他选项

| 选项 | 说明 |
|--------|-------------|
| `--system-prompt <text>` | 替换默认提示；上下文文件和 skill 仍会追加 |
| `--append-system-prompt <text>` | 追加到系统提示 |
| `--tui-mode <mode>` | TUI 模式：`regular`（默认）或实验性 `fullscreen` |
| `--use-theme <name[/name]>` | 为本轮运行设置初始交互主题，不改设置 |
| `--verbose` | 强制详细启动 |
| `-a`、`--approve` | 本次运行信任项目本地文件 |
| `-na`、`--no-approve` | 本次运行忽略项目本地文件 |
| `--` | 停止解析选项；其余参数作为 prompt 或 `@file` 输入 |
| `-h`、`--help` | 显示帮助 |
| `-v`、`--version` | 显示版本 |

在 `fullscreen` 模式下，transcript 在终端视口内滚动，而排队消息、工作状态、扩展控件、编辑器和页脚固定在底部。鼠标/触控板输入滚动指针下方的区域；键盘视口动作始终可用。内联图片在支持 Kitty graphics protocol 的终端中可用，包括 Kitty 和 Ghostty。在 iTerm2 中它们渲染为文本占位符，因为其内联图片协议无法在应用自管滚动期间删除或裁剪放置。在 `regular` 模式下，pi 使用主屏幕和终端自管回滚，iTerm2 内联图片仍正常渲染。终端相关设置与变通见[终端设置](terminal-setup.zh.md)。

在 `/settings` 中设置 **TUI mode** 可立即在 `regular` 与 `fullscreen` 之间切换，并选择后续会话的默认值。**Fullscreen exit output** 控制退出全屏时是打印最终 transcript，还是恢复之前的屏幕并只打印会话恢复提示。

### 文件参数

用 `@` 前缀把文件包含进消息：

```bash
pi @prompt.md "Answer this"
pi -p @screenshot.png "What's in this image?"
pi @code.ts @test.ts "Review these files"
```

### 示例

```bash
# 带初始 prompt 的交互
pi "List all .ts files in src/"

# 非交互
pi -p "Summarize this codebase"

# 以短横线开头的 prompt
pi -p -- "- Summarize these points"

# 非交互，并从管道读取 stdin
cat README.md | pi -p "Summarize this text"

# 命名的一次性会话
pi --name "release audit" -p "Audit this repository"

# 不同模型
pi --provider openai --model gpt-4o "Help me refactor"

# 带提供方前缀的模型
pi --model openai/gpt-4o "Help me refactor"

# 带 thinking 级别简写的模型
pi --model sonnet:high "Solve this complex problem"

# 限制模型循环
pi --models "claude-*,gpt-4o"

# 只读模式
pi --tools read,grep,find,ls -p "Review the code"

# 禁用某个扩展或内置工具，其余保持可用
pi --exclude-tools ask_question
```

## 设计原则

Pi 保持核心精简，把工作流相关行为推到扩展、skill、prompt 模板和软件包中。

它有意不内置 MCP、子 agent、权限弹窗、plan 模式、待办或后台 bash。你可以自行构建或安装这些工作流作为扩展或软件包，或使用容器和 tmux 等外部工具。

完整理由见[这篇博文](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)。
