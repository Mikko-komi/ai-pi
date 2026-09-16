> 本文为 [index.md](index.md) 的中文译本。

# Pi 文档

Pi 是精简的终端 coding harness。核心保持小巧，通过 TypeScript 扩展、skills、提示词模板、主题和 pi 软件包进行扩展。

## 快速开始

用 npm 安装 Pi：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

`--ignore-scripts` 会在安装时禁用依赖的生命周期脚本。普通 npm 安装不需要安装脚本。

在 Linux 或 macOS 上，也可以使用安装器：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

要卸载 Pi 本身，对 curl 安装和 npm 安装都使用 npm：

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

若用 pnpm、Yarn 或 Bun 安装，请使用对应的全局卸载命令：`pnpm remove -g @earendil-works/pi-coding-agent`、`yarn global remove @earendil-works/pi-coding-agent`，或 `bun uninstall -g @earendil-works/pi-coding-agent`。

然后在项目目录中运行：

```bash
pi
```

订阅类提供方用 `/login` 鉴权，或在启动 Pi 之前设置如 `ANTHROPIC_API_KEY` 这样的 API key。

完整的首次运行流程见[快速开始](quickstart.zh.md)。

## 从这里开始

- [快速开始](quickstart.zh.md) - 安装、鉴权，并跑通第一次会话。
- [使用 Pi](usage.zh.md) - 交互模式、斜杠命令、上下文文件和 CLI 参考。
- [提供方](providers.zh.md) - 内置提供方的订阅与 API key 设置。
- [llama.cpp](llama-cpp.zh.md) - 运行本地 router，并用 `/llama` 管理模型。
- [安全](security.zh.md) - 项目信任、沙箱边界与漏洞报告。
- [容器化](containerization.zh.md) - 用 Gondolin、Docker 或 OpenShell 为 Pi 做沙箱。
- [设置](settings.zh.md) - 全局与项目设置。
- [快捷键](keybindings.zh.md) - 默认快捷键与自定义按键绑定。
- [会话](sessions.zh.md) - 会话管理、分支与树导航。
- [压缩](compaction.zh.md) - 上下文压缩与分支摘要。

## 自定义

- [扩展](extensions.zh.md) - 用于工具、命令、事件和自定义 UI 的 TypeScript 模块。
- [Skills](skills.zh.md) - 可按需复用的 Agent Skills。
- [提示词模板](prompt-templates.zh.md) - 通过斜杠命令展开的可复用提示。
- [主题](themes.zh.md) - 内置与自定义终端主题。
- [Pi 软件包](packages.zh.md) - 打包并分享扩展、skills、提示词和主题。
- [自定义模型](models.zh.md) - 为受支持的提供方 API 添加模型条目。
- [自定义提供方](custom-provider.zh.md) - 实现自定义 API 与 OAuth 流程。

## 编程方式使用

- [SDK](sdk.zh.md) - 在 Node.js 应用中嵌入 Pi。
- [RPC 模式](rpc.zh.md) - 通过 stdin/stdout JSONL 集成。
- [JSON 事件流模式](json.zh.md) - 带结构化事件的 print 模式。
- [TUI 组件](tui.zh.md) - 为扩展构建自定义终端 UI。

## 参考

- [环境变量](environment-variables.zh.md) - Pi 进程配置，以及 bash 工具可用的会话元数据。
- [会话格式](session-format.zh.md) - JSONL 会话文件格式、条目类型和 SessionManager API。

## 平台设置

- [Windows](windows.zh.md)
- [Android 上的 Termux](termux.zh.md)
- [tmux](tmux.zh.md)
- [终端设置](terminal-setup.zh.md)
- [Shell 别名](shell-aliases.zh.md)

## 开发

- [开发](development.zh.md) - 本地设置、项目结构和调试。
