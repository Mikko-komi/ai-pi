# @earendil-works/pi-session-backend-sqlite-node

> 本文为 [README.md](README.md) 的中文译本。

面向 `@earendil-works/pi-agent-core` 的 Node `node:sqlite` Session backend。

```ts
import { BACKGROUND_CONTEXT } from "@earendil-works/pi-agent-core";
import {
  createNodeSqliteFactory,
  SqliteSessionRepo,
} from "@earendil-works/pi-session-backend-sqlite-node";

const repository = new SqliteSessionRepo({
  directory: "/var/lib/pi/sessions",
  databaseFactory: createNodeSqliteFactory(),
});

const session = await repository.create({}, BACKGROUND_CONTEXT);
const main = await session.createBranch("main", null, BACKGROUND_CONTEXT);
await main.appendMessage(
  { role: "user", content: "hello", timestamp: Date.now() },
  BACKGROUND_CONTEXT,
);
await session.close(BACKGROUND_CONTEXT);
await repository.close(BACKGROUND_CONTEXT);
```

默认布局在 `directory` 下为每个 Session 创建一个文件。仅含 ASCII 字母、数字、`_` 和 `-` 的 ID 保留 `{sessionId}.sqlite`；其他 ID 使用其 UTF-16 code unit 的 `~` 前缀 base64url 编码。持久 ID 不变；返回/列出的 metadata 包含规范物理路径。传入 `databasePath` 可把多个 Session 放进一个受支持的共享容器；需要时会创建其父目录。

database factory 区分有意创建、不创建的读写打开，以及不创建的只读打开。Session 的 `open()` 与删除会拒绝配置仓库之外的 metadata，并且从不创建缺失的数据库。列出是只读且尽力而为的。fork 有意允许外部源 metadata 路径：它只读打开那个确切已存在的容器，从不把同 ID 的活跃本地 Session 替换进去。

保证每个 Session 只有一个可写所有者的是 host 生命周期，而不是本 backend。在另一进程中直接打开同一 Session 进行写入不受支持。仓库会拒绝同一 ID 上重叠的本地 create/open/fork/delete 所有权，但不实现跨进程 lease、lock、fence、heartbeat 或 takeover。host 必须在删除前关闭 worker。

对同一仓库中已打开源的 fork，会把其 snapshot 排到该源的 commit 队列上。任何其他源（包括被存活 Session worker 持有打开的源）使用独立的只读连接和一次延迟的 WAL 事务；在该 snapshot 仍打开时，后续 worker commit 仍可能完成。共享容器删除只移除所选 Session 的行。仓库 close 会等待每个已打开 Session 的清理尝试完成后再报告错误。本包不导出 search service 或 FTS 索引；搜索是单独的 S3 projection。
