> 本文为 [quickstart.md](quickstart.md) 的中文译本。

# 快速开始

本页带你从安装走到一次有用的首次 Pi 会话。

## 安装

Pi 以 npm 包分发：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 会在安装时禁用依赖的生命周期脚本。普通 npm 安装不需要安装脚本。

<a id="uninstall"></a>

### 卸载

使用当初安装 Pi 的包管理器。curl 安装器会全局使用 npm，因此 curl 安装和 npm 安装都用 npm 卸载：

```bash
# curl installer or npm install -g
npm uninstall -g @earendil-works/pi-coding-agent

# pnpm
pnpm remove -g @earendil-works/pi-coding-agent

# Yarn
yarn global remove @earendil-works/pi-coding-agent

# Bun
bun uninstall -g @earendil-works/pi-coding-agent
```

卸载 Pi 会把设置、凭证、会话和已安装的 pi 软件包留在 `~/.pi/agent/`。

然后在你希望它处理的项目目录中启动 Pi：

```bash
cd /path/to/project
pi
```

## 鉴权

Pi 可以通过 `/login` 使用订阅提供方，也可以通过环境变量或 auth 文件使用 API key 提供方。

### 方式 1：订阅登录

启动 Pi 并运行：

```text
/login
```

然后选择提供方。内置订阅登录包括 Claude Pro/Max、ChatGPT Plus/Pro（Codex）和 GitHub Copilot。

### 方式 2：API key

启动 Pi 之前设置 API key：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

也可以运行 `/login` 并选择 API key 提供方，把密钥存到 `~/.pi/agent/auth.json`。

全部受支持的提供方、环境变量和云提供方设置见[提供方](providers.zh.md)。

## 第一次会话

Pi 启动后，输入请求并按 Enter：

```text
Summarize this repository and tell me how to run its checks.
```

默认情况下，Pi 给模型四个工具：

- `read` - 读文件
- `write` - 创建或覆盖文件
- `edit` - 修补文件
- `bash` - 运行 shell 命令

其他内置只读工具（`grep`、`find`、`ls`）可通过工具选项使用。Pi 在你的当前工作目录中运行，并可以修改那里的文件。如果希望方便回滚，请使用 git 或其他检查点工作流。

## 给 Pi 项目说明

Pi 在启动时加载上下文文件。添加 `AGENTS.md` 告诉它如何在项目中工作：

```markdown
# Project Instructions

- Run `npm run check` after code changes.
- Do not run production migrations locally.
- Keep responses concise.
```

Pi 会加载：

- `~/.pi/agent/AGENTS.md` 作为全局说明
- 父目录和当前目录中的 `AGENTS.md` 或 `CLAUDE.md`

如果某目录包含 `AGENTS.override.md`，Pi 会加载它，而不是该目录中的 `AGENTS.md` 或 `CLAUDE.md`。

更改上下文文件后重启 Pi，或运行 `/reload`。

## 常见尝试

### 引用文件

在编辑器中输入 `@` 对文件做模糊搜索，或在命令行传入文件：

```bash
pi @README.md "Summarize this"
pi @src/app.ts @src/app.test.ts "Review these together"
```

图片或文本可以用 Ctrl+V 粘贴（Windows 上为 Alt+V）；在支持的终端中也可以把图片拖进去。

### 运行 shell 命令

在交互模式中：

```text
!npm run lint
```

命令输出会发给模型。用 `!!command` 运行命令，但不把它的输出加入模型上下文。

### 切换模型

用 `/model` 或 Ctrl+L 为当前会话选择模型。在模型选择器中按 Ctrl+S，把高亮的模型保存为启动默认值。用 `/thinking` 为当前会话选择 thinking 级别，或在该选择器中按 Ctrl+S 保存启动默认 thinking 级别。用 Shift+Tab 循环 thinking 级别。用 Ctrl+P / Shift+Ctrl+P 在范围内的模型间循环。

### 稍后再继续

会话会自动保存：

```bash
pi -c                  # Continue most recent session
pi -r                  # Browse previous sessions
pi --name "my task"    # Set session display name at startup
pi --session <path|id> # Open a specific session
```

在 Pi 内部，用 `/resume`、`/new`、`/tree`、`/fork` 和 `/clone` 管理会话。

### 非交互模式

用于一次性提示：

```bash
pi -p "Summarize this codebase"
cat README.md | pi -p "Summarize this text"
pi -p @screenshot.png "What's in this image?"
```

用 `--mode json` 输出 JSON 事件，或用 `--mode rpc` 做进程集成。

## 下一步

- [使用 Pi](usage.zh.md) - 交互模式、斜杠命令、会话、上下文文件和 CLI 参考。
- [提供方](providers.zh.md) - 鉴权与模型设置。
- [设置](settings.zh.md) - 全局与项目配置。
- [快捷键](keybindings.zh.md) - 快捷键与自定义。
- [Pi 软件包](packages.zh.md) - 安装共享的扩展、skills、提示词和主题。

平台说明：[Windows](windows.zh.md)、[Termux](termux.zh.md)、[tmux](tmux.zh.md)、[终端设置](terminal-setup.zh.md)、[Shell 别名](shell-aliases.zh.md)。
