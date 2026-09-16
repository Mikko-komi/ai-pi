> 本文为 [containerization.md](containerization.md) 的中文译本。

# 容器化

Pi 默认以全部权限运行，但有时你需要更精细地控制 Pi 可以写入哪些目录，以及它拥有哪些访问权限。

大致有两种做法。你可以
1. 把整个 `pi` 进程放进隔离环境，或
2. 在宿主机运行 `pi`，并把工具执行路由进隔离环境。

## 选择一种模式

| 模式 | 隔离对象 | 最适合 | 说明 |
| --- | --- | --- | --- |
| Gondolin 扩展 | 内置工具和 `!` 命令 | 本地微虚拟机隔离，同时把鉴权留在宿主机 | 见 [`examples/extensions/gondolin/`](../examples/extensions/gondolin/)。 |
| 普通 Docker | 整个 `pi` 进程在本地容器中 | 简单的本地隔离 | 提供方 API key 会进入容器。 |
| OpenShell | 整个 `pi` 进程在策略可控的沙箱中 | 本地或远程托管沙箱 | 需要 OpenShell gateway |
| Docker Sandboxes | 整个 `pi` 进程在托管沙箱中 | 本地隔离，提供方密钥留在宿主机 | 需要 Docker Sandboxes（`sbx`）。 |

扩展在 `pi` 进程运行的位置执行。如果在宿主机运行 `pi` 并使用工具路由扩展，其他自定义扩展工具仍在宿主机上运行，除非它们也把自己的操作委托出去。

## Gondolin

[Gondolin](https://github.com/earendil-works/gondolin) 是本地 Linux 微虚拟机。
当你希望 `pi` 留在宿主机、但把所有内置工具路由进虚拟机时，使用[示例扩展](../examples/extensions/gondolin)。

设置：

```bash
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

从你要挂载的项目运行：

```bash
cd /path/to/project
pi -e ~/.pi/agent/extensions/gondolin
```

该扩展把宿主机 cwd 挂载到虚拟机中的 `/workspace`，并覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find` 和 `ls`。
用户的 `!` 命令也会路由进虚拟机。
`/workspace` 下的文件更改会写回宿主机。

要求：`@earendil-works/gondolin` 需要 Node.js >= 23.6.0，以及 QEMU（需通过包管理器安装）。

## 普通 Docker

当你想要最简单的本地容器边界时，把整个 `pi` 进程放进 Docker。

`Dockerfile.pi`：

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

构建并运行：

```bash
docker build -t pi-sandbox -f Dockerfile.pi .

docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

`-v "$PWD:/workspace"` 把当前目录挂载到容器内的 /workspace，因此 Docker 内对 `/workspace` 的读写会直接作用于宿主机文件，与 Gondolin 示例类似。

如果希望设置和会话只存在于容器内，请为 `/root/.pi/agent` 使用命名卷。挂载宿主机的 `~/.pi/agent` 会把宿主机鉴权和会话文件暴露给容器。

## OpenShell

当你需要带文件系统、进程、网络、凭证和推理控制的策略可控沙箱时，使用 [NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview)。
OpenShell 可以通过由 Docker、Podman 或虚拟机运行时支撑的本地 gateway 运行沙箱，也可以通过远程 Kubernetes gateway 运行。

每个沙箱都需要一个活动的 gateway。
创建沙箱前先注册并选择一个：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

在 OpenShell 沙箱中启动 `pi`：

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

在这种模式中，整个 `pi` 进程运行在沙箱内。
内置工具、`!` 命令和扩展工具都在 OpenShell 边界内执行。

如果 gateway 是远程的，项目文件不会从宿主机绑定挂载，因此沙箱中的写入不会反映到你的机器上。
在沙箱内克隆仓库，或使用 OpenShell 文件传输命令：

```bash
openshell sandbox upload pi-sandbox ./repo /workspace
openshell sandbox download pi-sandbox /workspace/repo ./repo-out
```

OpenShell 提供方可以把原始模型 API key 留在沙箱外。
配置了推理路由后，沙箱内的代码可以调用 `https://inference.local`，gateway 会在上游注入已配置的提供方凭证。
如果你希望模型流量走这条路由，请把 Pi 配置为使用对应的 OpenAI 兼容或 Anthropic 兼容端点。

## Docker Sandboxes

[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) 是 Docker 提供的托管沙箱运行时，把整个 `pi` 进程放进沙箱。
它是[没有内置沙箱](security.zh.md#没有内置沙箱)所指向的容器边界之一。

与上面的普通 Docker 模式不同，提供方凭证不会传入容器。
沙箱收到的是哨兵值，`sbx` 代理在出站到 `api.anthropic.com` 时替换为真实凭证。
凭证在创建时绑定，因此请在创建沙箱之前把凭证存到宿主机。

对于 Claude Pro/Max 订阅，在装有 Claude Code 的机器上运行 `claude setup-token`，然后把结果存到宿主机。
如果已经绑定了 `anthropic` secret，请先移除：否则代理会在 Bearer token 旁边再加一个 `x-api-key` 头，Anthropic 会拒绝该请求。
`sbx secret set-custom` 从 stdin 读取 token，因此它不会进入 shell 历史。

```bash
sbx secret rm anthropic

sbx secret set-custom \
  --host api.anthropic.com \
  --env ANTHROPIC_OAUTH_TOKEN \
  --placeholder 'sk-ant-oat01-{rand}'
```

沙箱得到的是 OAuth 形态的占位符，而不是真实 token；代理在出站到该主机时替换它。`ANTHROPIC_OAUTH_TOKEN` 是 Pi 已经会读取、并且优先于 API key 的变量，因此不需要额外配置 Pi。

如果用的是 API key，改为用 `sbx secret set anthropic` 存储。该套件同样把它接成代理在出站时替换的哨兵值。

凭证存好后，从你要挂载的项目启动 `pi`：

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

该套件把 `pi` 预置进镜像，因此沙箱启动时无需安装任何东西，当前目录就是沙箱工作区。

不要在沙箱内鉴权：那里的 `/login` 会把真实 token 写入容器，从而破坏代理模型。

脚本化用法同样如此：

```bash
sbx exec <sandbox-name> -- pi -p "list the failing tests"
```

完整的凭证矩阵、故障排除和固定版本方式见[套件文档](https://github.com/docker/sbx-kits-contrib/tree/main/pi)。
