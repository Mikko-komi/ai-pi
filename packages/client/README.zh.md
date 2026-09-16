# @earendil-works/pi-client

> 本文为 [README.md](README.md) 的中文译本。

面向实验性 Pi service protocol 的传输无关客户端。

```ts
import { Client, type ByteTransportFactory } from "@earendil-works/pi-client";

const transportFactory: ByteTransportFactory = async (handlers) => {
  // Connect using WebSocket, Unix socket, or another ordered byte transport.
  return {
    async send(chunk) {
      // Deliver bytes in invocation order and honor backpressure.
    },
    close() {},
  };
};

const client = await Client.connect({
  serverId: "01234567-89ab-4def-8123-456789abcdef",
  transportFactory,
});
const result = await client.request(
  { serverId: client.hello.serverId },
  { serviceId: "example.service", member: "read", args: [] },
);
```

客户端会校验物理 endpoint 报告的逻辑 `serverId` 是否符合预期。Server 范围的请求携带该 ID；每个 Session 请求携带完整的存活目标 `{ serverId, sessionId, attachmentId }`。组合的持久地址防止跨 server 或跨 session 误路由；server 生成的 attachment ID 会在切换或重新 attach 之后拒绝延迟到达的 frame。

类型化的 server 与 Session API 由应用拥有的 Chord service binding 提供。`createClientServiceTransport()` 把延迟解析的 server 或 Session 路由适配为 Chord transport；`request()` 和 `subscribeService()` 仍是其底层原语。客户端使用 Chord 的 service-control parser 以及按 subscription 的 state decoder；`pi-protocol` 只校验路由 envelope 与 strict-JSON 边界。service subscription 返回完整的 provider snapshot；binding 安装它，然后调用 `start()` 以释放 hydration 期间缓冲的更新。`Client` 会按序应用带外 attachment 变更，但有意不构造类型化的 service proxy，也不解释应用契约。

应用观察 API（例如 coding agent 的 `Transcript`）是普通的 Chord service。客户端不解释它们的 snapshot 或更新。

断开或销毁时，挂起的请求在本地 reject，但已接受的工作仍可能在远端完成，之后才释放 attachment。客户端会清除其存活的 attachment 路由。它从不自动重连或重放请求。断开后，调用 `reconnect()`，再次通过应用的管理 service 做 attach，并且只显式重做已知安全的操作。

实验性本地 coordinator 只提供稳定的 endpoint 并转发流量。可替换的 server 进程在公开客户端协议之外拥有 Session 与 worker 生命周期。

按如下方式调用 transport handler：

- `handlers.onData(chunk)` 用于入站字节；
- `handlers.onClose()` 用于有序的终端关闭；
- `handlers.onError(error)` 用于 transport 失败。

transport factory 在每次尝试时创建一条新的已认证连接。请求按 ID 关联；server 失败以 `ServerError` 暴露。

## Unix domain socket

Node.js 与 Bun 的消费方可以使用单独的 Unix transport：

```ts
import { Client } from "@earendil-works/pi-client";
import { createUnixTransportFactory } from "@earendil-works/pi-client/unix";

const client = new Client({
  serverId: "01234567-89ab-4def-8123-456789abcdef",
  transportFactory: createUnixTransportFactory({ path: "/tmp/pi.sock" }),
});
await client.connect();
```

Unix discovery 扫描一个显式的物理路由目录，从文件名推导每个预期的 server ID，并通过现有 handshake 校验：

```ts
import { discoverUnixServers } from "@earendil-works/pi-client/unix";

const routes = await discoverUnixServers({ directory: "/run/user/1000/pi" });
// [{ serverId: "...", path: "/run/user/1000/pi/<serverId>.sock" }]
```

畸形条目、非 socket、陈旧或无响应的 endpoint，以及 server ID 不匹配都会被忽略。Discovery 是只读的，最多并发探测 16 个 socket。意外的文件系统和 socket 错误会使 discovery reject。传入 `timeoutMs` 可覆盖默认探测超时。

`ClientOptions.maxFrameLength` 限制协议 payload。`maxPendingBytes` 限制排队的 Unix transport 输出。在两端配置匹配的限制。
