# @earendil-works/pi-protocol

> 本文为 [README.md](README.md) 的中文译本。

面向实验性 Pi protocol 的运行时无关路由 envelope、CBOR 编码，以及字节流 framing。

协议版本 `8` 定义：

- 用于标识逻辑 `serverId` 的版本 handshake；
- 显式的 server 与 Session 请求目标；
- 带不透明 strict-JSON payload、可关联的请求与响应；
- 请求取消、不透明 subscription 更新，以及带外 attachment 变更；
- 非空的不透明错误码，以及有界的 transport 消息。

server 目标包含 `{ serverId }`；Session 目标包含 `{ serverId, sessionId, attachmentId }`。组合路由把调用限定到一个逻辑 server、一个持久 Session，以及一个存活的 presentation attachment。管理侧的 `attach()` 与 `detach()` 不返回路由标识符；server 在带外 `attachment` 消息中发布所选的存活路由。断开连接只会在已准入的调用结算之后，释放该 presentation 的 attachment。

Chord 拥有这些 envelope 内部承载的 payload 语义：`{ serviceId, instance?, member, args }` 调用、`$chord.service` 控制词汇、service catalogue、subscription snapshot 与更新、service 错误码，以及用于复制状态的独立 Delta path codec。`pi-protocol` 校验每个不透明 payload 是 strict JSON，但不校验也不导出其 Chord 语法。客户端与服务端在 service adapter 边界通过 `@earendil-works/chord` 解析这些值。

Session-directory 状态、管理结果、transcript、model、plugin，以及所有其他应用值，都仍是不透明的 service 数据。真正的 `Session` 和 `AgentHarness` 仍是进程内对象。Server 与 Session 调用被不透明地路由到其所属的 provider，由 Chord 与应用在那里校验并调用。

Server 与 worker 的生命周期有意不纳入此公开协议。实验性本地 coordinator 只是一个不透明的消息路由器；每个可替换的 server 进程拥有私有的生命周期协议。

每个线上 frame 由四字节无符号大端 payload 长度后跟一个定长 CBOR item 组成。`encodeClientMessage()` 和 `encodeServerMessage()` 校验并编码完整 frame。`ClientMessageDecoder` 和 `ServerMessageDecoder` 接受任意的流分片与合并。

```ts
import {
  PROTOCOL_VERSION,
  encodeClientMessage,
  ServerMessageDecoder,
  type ClientHello,
} from "@earendil-works/pi-protocol";

const hello: ClientHello = { type: "hello", version: PROTOCOL_VERSION };
transport.send(encodeClientMessage(hello));

const decoder = new ServerMessageDecoder({ maxFrameLength: 1024 * 1024 });
for (const message of decoder.push(incomingChunk)) handleServerMessage(message);
decoder.end();
```

所有 envelope schema 拒绝未知对象属性，codec 会递归拒绝非 JSON 的不透明 payload，包括非有限数字、字节数组、`undefined`、prototype 和环。Envelope 违规、畸形 CBOR 以及无效 framing 会抛出 `ProtocolValidationError`。针对特定 payload 的 adapter 必须在解码后自行做语义校验。Transport 必须保持字节顺序。实验性 transport 未实现对端认证和经认证的 service context。

默认限制为每个 CBOR payload/frame 16 MiB、1,000,000 个数组元素或 map 条目，以及 64 层嵌套 item。该协议是实验性的，没有兼容性保证。
