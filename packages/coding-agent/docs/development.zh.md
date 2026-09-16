> 本文为 [development.md](development.md) 的中文译本。

# 开发

更多指南见 [AGENTS.md](https://github.com/earendil-works/pi/blob/main/AGENTS.md)。

## 设置

```bash
git clone https://github.com/earendil-works/pi
cd pi
npm install
npm run build
```

从源码运行：

```bash
/path/to/pi/pi-test.sh
```

该脚本可在任意目录执行。Pi 会保持调用者的当前工作目录。

<a id="experimental-remote-harness"></a>

### 实验性远程 harness

远程 harness 的服务端/客户端集成仅供开发使用。在仓库中这样运行：

```bash
PI_EXPERIMENTAL=1 ./pi-test.sh server
PI_EXPERIMENTAL=1 ./pi-test.sh client
```

`PI_SERVER_DIR` 覆盖服务器配置文件与 socket 目录（默认：`~/.pi/server`）。省略 `--server-id` 时，`PI_SERVER_ID` 选择逻辑服务器 ID。

`client` 和 `experimental/plugin` 包的子路径只在 checkout 中的 `source` 条件下解析。它们的实现以及 server/client 命令不会包含在 npm 包和独立二进制中。`pi-client`、`pi-protocol` 和 `pi-server` 是 coding-agent 的开发依赖，不是运行时依赖。本地 SDK 和 stdio RPC API 不变。

## Fork / 更换品牌

通过 `package.json` 配置：

```json
{
  "piConfig": {
    "name": "pi",
    "configDir": ".pi"
  }
}
```

为你的 fork 修改 `name`、`configDir` 和 `bin` 字段。这会影响 CLI 横幅、配置路径和环境变量名。

## 路径解析

三种执行模式：npm 安装、独立二进制、从源码用 tsx 运行。

包内资源**始终使用 `src/config.ts`**：

```typescript
import { getPackageDir, getThemeDir } from "./config.js";
```

不要直接用 `__dirname` 解析包内资源。

## 调试命令

`/debug`（隐藏）写入 `~/.pi/agent/pi-debug.log`：
- 带 ANSI 码的已渲染 TUI 行
- 最近发送给 LLM 的消息

## 测试

```bash
./test.sh                         # 运行非 LLM 测试（不需要 API key）
npm test                          # 运行全部测试
npm test -- test/specific.test.ts # 运行指定测试
```

### 已发布软件包冒烟测试

构建后运行 `npm run check:package-install`。它会打包公开软件包，并仅将 coding-agent 作为直接依赖安装到仓库外的临时目录。本地 tarball 覆盖会选中已声明的传递依赖，而不安装仅用于开发的软件包。该检查会验证 SDK import 和 CLI 启动，不需要凭证或模型请求。

`npm run check` 还会检查运行时依赖声明，并拒绝通过 import 把被排除的开发源码拉进软件包构建。

## 项目结构

```
packages/
  ai/           # LLM 提供方抽象
  agent/        # Agent 循环与消息类型
  tui/          # 终端 UI 组件
  coding-agent/ # CLI 与交互模式
```
