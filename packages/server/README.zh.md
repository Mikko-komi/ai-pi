# @earendil-works/pi-server

> 本文为 [README.md](README.md) 的中文译本。

面向新的持久 Session 与 Agent Harness 接口的实验性本地 server。

当前切片支持 server 范围与 Session 范围的 facet-service 路由，以及多 presentation attachment。`RoutedServerServiceHost.attachClient()` 创建一个连接范围的 server service endpoint，只具备窄的 attachment 管理能力。`RoutedSessionHandle.attachClient()` 返回 presentation 范围的 Session capability。其 `invokeService()` 把不透明的 service/member envelope 转发到所选 Session endpoint；server 校验 attachment 路由，但不加载 facet 契约。

- server service 调用与 subscription 通过该连接的 `RoutedServerServiceAttachment` 不透明路由；
- 应用拥有的 `SessionDirectory` 把私有 catalog 投影为可复制的、对 presentation 安全的状态；
- 应用拥有的 `SessionManagement` 创建、移除、attach 和 detach Session，且不在业务结果中暴露路由 ID；
- 路由器安装或清除存活路由之后，attachment 变更带外发布；
- Session service 调用通过 `invokeService` 路由，服务端不解码业务 payload；
- service subscription 更新仍限定在发起请求的 attachment 范围内；
- 诸如 transcript 之类的应用观察作为普通 service 状态路由，没有 server 拥有的业务 schema。

一个 Session 可以有多个 presentation attachment。在同一连接上重复 `attach` 是幂等的；每次成功的 attachment 都有一个 server 生成的 `attachmentId`，仅作为路由控制数据下发。Session 请求携带 `{ serverId, sessionId, attachmentId }`，server 拒绝陈旧或不匹配的路由。丢失连接会使其本地响应 reject，但只有在已准入的 service 调用结算之后才释放其 attachment。host 决定何时在零 presentation 需求且 worker 本地 Harness 活动允许的情况下退役 worker。Server 关闭会关闭每个已路由的 Session handle，并释放其 worker 与 Session writer 所有权。

```ts
import { randomUUID } from "node:crypto";
import { MemorySessionRepo, type Session } from "@earendil-works/pi-agent-core";
import {
  type RoutedServerServiceHost,
  type RoutedSessionHandle,
  type ServerHost,
  SessionAmbiguousError,
  SessionNotFoundError,
} from "@earendil-works/pi-server";
import { createUnixServer, getUnixSocketPath } from "@earendil-works/pi-server/unix";

async function startServer(
  serverServices: RoutedServerServiceHost,
  openRoutedSession: (session: Session) => Promise<RoutedSessionHandle>,
) {
  const sessions = new MemorySessionRepo();
  const host: ServerHost = {
    serverServices,
    async resolveSession(sessionId, context) {
      const matches = (await sessions.list(undefined, context))
        .filter((metadata) => metadata.id === sessionId);
      if (matches.length === 0) {
        throw new SessionNotFoundError(`Unknown session: ${sessionId}`);
      }
      if (matches.length > 1) throw new SessionAmbiguousError();
      return matches[0];
    },
    async openSession(metadata, context) {
      const session = await sessions.open(metadata, context);
      try {
        return await openRoutedSession(session);
      } catch (error) {
        try {
          await session.close(context);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "Harness creation and Session cleanup failed",
          );
        }
        throw error;
      }
    },
  };

  const serverId = randomUUID();
  const server = createUnixServer(host, {
    serverId,
    path: getUnixSocketPath(serverId, "/run/user/1000/pi"),
  });
  await server.start();
  return server;
}
```

应用需提供必需的 server service host、有界的 Session resolver，以及路由化的 Session factory。Session discovery 与管理是应用拥有的 service；协议 server 只在路由 attachment 时向 resolver 询问 metadata。host 负责获取 worker 本地的 Session 与 Harness。失败会在该 worker 中清理。已打开的 JavaScript Session 与 Harness 都不会跨越进程边界。

`serverId` 是 launcher 提供的逻辑身份，不是 socket 地址。Unix preset 要求显式的物理 `path`；`getUnixSocketPath()` 从调用方选定的目录推导路径。选择一个短而私有的 runtime 目录，不要从无界的 home 目录路径推导路由。长生命周期的 launcher 在替换 server 进程时可以复用同一 ID 与 path。

`Server` 通过 `ServerListener` 组合 transport；对端认证仍是应用策略，实验性 Unix transport 并未实现。Unix 子模块提供 `createUnixListener()` 和 `createUnixServer()`。底层的路由 envelope 校验、CBOR 与 framing 来自 `@earendil-works/pi-protocol`；Chord 拥有 service-control 解析、错误码、snapshot 与更新，以及每个 subscription 的复制状态 encoder。

Server 与 worker 生命周期在公开 Pi protocol 之外管理。可替换的应用 server 把连接 attachment 转换成私有的 demand 更新；worker 把带 generation 标签的 demand 与权威的 Harness 活动结合起来。实验性 coordinator 只提供稳定路由，并报告通用的 server-generation 连接变更。
