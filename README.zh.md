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

> 新贡献者提交的 issue 和 PR 默认会被自动关闭。维护者每天会审阅被自动关闭的 issue。见 [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md)。

# Pi Agent Harness

这里是 Pi agent harness 项目的仓库，也包括我们可自行扩展的 coding agent。

* **[@earendil-works/pi-coding-agent](packages/coding-agent)**：交互式 coding agent CLI
* **[@earendil-works/pi-agent-core](packages/agent)**：带 tool calling 与状态管理的 agent 运行时
* **[@earendil-works/pi-ai](packages/ai)**：统一的多提供方 LLM API（OpenAI、Anthropic、Google 等）

了解更多：

* 访问 [pi.dev](https://pi.dev)（项目网站与演示）
* 阅读[文档](https://pi.dev/docs/latest)；也可以直接让 agent 解释自己

## 全部软件包

| 软件包 | 说明 |
|---------|-------------|
| **[@earendil-works/chord](packages/chord)** | 独立的应用组合运行时：服务、复制状态、RPC 与插件 |
| **[@earendil-works/pi-telemetry](packages/telemetry)** | 厂商无关的遥测契约、参考适配器、符合性测试与类型化 schema |
| **[@earendil-works/pi-ai](packages/ai)** | 统一的多提供方 LLM API（OpenAI、Anthropic、Google 等） |
| **[@earendil-works/pi-agent-core](packages/agent)** | 带 tool calling 与状态管理的 agent 运行时 |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | 交互式 coding agent CLI |
| **[@earendil-works/pi-tui](packages/tui)** | 带差分渲染的终端 UI 库 |

Slack / 聊天自动化与工作流见 [earendil-works/pi-chat](https://github.com/earendil-works/pi-chat)。

## 权限与容器化

Pi 没有内置权限系统来限制文件系统、进程、网络或凭证访问。默认情况下，它以启动它的用户和进程的权限运行。

若需要更强隔离，请将 Pi 容器化或放入沙箱。见 [packages/coding-agent/docs/containerization.zh.md](packages/coding-agent/docs/containerization.zh.md) 中的三种模式：

- **Gondolin 扩展**：`pi` 与提供方鉴权留在宿主机，把内置工具和 `!` 命令路由进本地 Linux 微虚拟机。
- **普通 Docker**：把整个 `pi` 进程放进本地容器，做简单隔离。
- **OpenShell**：把整个 `pi` 进程放进策略可控的沙箱。

## 贡献

贡献指南见 [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md)，项目规则（人类与 agent 均适用）见 [AGENTS.zh.md](AGENTS.zh.md)。Pi 的长期规划也可在 [RFCs](https://rfc.earendil.com/keyword/pi/) 中找到。

## 开发

```bash
npm install --ignore-scripts  # 安装全部依赖，不运行生命周期脚本
npm run build         # 刷新模型数据，然后构建所有包
npm run build:offline # 使用已有模型数据重建，不访问网络
npm run check         #  lint、格式化与类型检查
./test.sh            # 运行测试（无 API key 时跳过依赖 LLM 的测试）
./pi-test.sh         # 从源码运行 pi（可在任意目录执行）
```

## 从 release 源码构建独立二进制

GitHub release 包含带版本号的源码归档，并由该 release 的 `SHA256SUMS` 覆盖校验。解压后运行与官方独立二进制相同的构建脚本：

```bash
VERSION="<release-version>"
tar -xzf "pi-${VERSION}-source.tar.gz"
cd "pi-${VERSION}"
./scripts/build-binaries.sh --offline-model-data --platform linux-x64 --out "$PWD/out"
```

归档里包含 release 模型数据和原生预构建产物。`--offline-model-data` 使用这些模型数据，不刷新提供方目录。脚本会安装依赖并构建可执行文件及其运行时资源；若依赖已就绪，可传 `--skip-install`。

## 供应链加固

我们把 npm 依赖变更当作经过审阅的代码变更。

- 直接外部依赖钉死到精确版本。内部 workspace 包仍使用版本范围。
- `.npmrc` 设置 `save-exact=true` 和 `min-release-age=2`，避免解析时用上当天刚发布的依赖。
- `package-lock.json` 是依赖的事实来源。除非设置 `PI_ALLOW_LOCKFILE_CHANGE=1`，pre-commit 会拦截误提交的 lockfile。
- `npm run check` 会校验钉死的直接依赖、原生 TypeScript import 兼容性，以及生成的 coding-agent shrinkwrap。
- 发布的 CLI 包包含从根 lockfile 生成的 `packages/coding-agent/npm-shrinkwrap.json`，为 npm 用户钉死传递依赖。
- Release 冒烟测试使用 `npm run release:local`：在打 tag 前于仓库外构建、打包，并做隔离的 npm / Bun 安装。
- 本地 release 安装、文档中的 npm 安装，以及 `pi update --self` 在支持时使用 `--ignore-scripts`。
- CI 使用 `npm ci --ignore-scripts`；另有定时 GitHub workflow 运行 `npm audit --omit=dev` 和 `npm audit signatures --omit=dev`。
- Shrinkwrap 生成对依赖生命周期脚本有显式白名单；带生命周期脚本的新依赖在审阅前会让检查失败。

## 分享你的开源 coding agent 会话

若你用 Pi 或其他 coding agent 做开源工作，请分享会话。

公开的 OSS 会话数据能用真实任务、工具使用、失败与修复来改进 coding agent，而不是玩具基准。

完整说明见 [这篇 X 帖](https://x.com/badlogicgames/status/2037811643774652911)。

发布会话请用 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。按其 README 配置即可：需要 Hugging Face 账号、Hugging Face CLI 和 `pi-share-hf`。

也可以看[这个视频](https://x.com/badlogicgames/status/2041151967695634619)，里面演示了我如何发布 `pi-mono` 会话。

我定期发布自己的 `pi-mono` 工作会话：

- [Hugging Face 上的 badlogicgames/pi-mono](https://huggingface.co/datasets/badlogicgames/pi-mono)

## 许可证

MIT

<p align="center">
  <a href="https://pi.dev">pi.dev</a> 域名由下列各方慷慨捐赠
  <br /><br />
  <a href="https://exe.dev"><img src="packages/coding-agent/docs/images/exy.png" alt="Exy mascot" width="48" /><br />exe.dev</a>
</p>
