# @earendil-works/pi-telemetry

> 本文为 [README.md](README.md) 的中文译本。

面向 pi 包的厂商无关 telemetry 契约与类型化 schema 工具。

本包提供：

- 显式的、基于 callback 的 `TelemetryContext` / `TelemetrySpan` 契约；
- 共享的 `NOOP_TELEMETRY_CONTEXT`；
- 参考实现 `InMemoryTelemetryContext`；
- 可序列化的 schema 定义，以及从中推断的 TypeScript 类型；
- 没有 exporter、没有全局 current-span 状态、也不依赖某个 telemetry backend。

应用可以使用内存参考实现，或为 OpenTelemetry、Sentry、日志或其他 backend 提供 adapter。Pi 包显式传递 telemetry context，并单独定义其领域 schema。

## 目录

- [安装](#安装)
- [Telemetry 概念](#telemetry-概念)
- [核心 Context API](#核心-context-api)
- [Adapter 约定](#adapter-约定)
- [No-op Context](#no-op-context)
- [内存参考 Adapter](#内存参考-adapter)
- [Adapter 符合性](#adapter-符合性)
- [类型化 Schema](#类型化-schema)
  - [启动与完成 Attribute](#启动与完成-attribute)
- [Schema 元数据](#schema-元数据)
- [Pi 包集成](#pi-包集成)
- [安全与可移植性](#安全与可移植性)
- [API 参考](#api-参考)
- [开发](#开发)
- [许可证](#许可证)

## 安装

```bash
npm install @earendil-works/pi-telemetry
```

## Telemetry 概念

Telemetry 描述程序运行时做了什么。本包用 span、attribute、event、status 以及显式 context 来建模这些工作：

| 概念 | 含义 |
|---|---|
| **Span** | 一次操作的计时记录，例如加载账户或发出 AI 请求。它在工作开始前开始，在工作结束时结束。 |
| **Parent and child spans** | 操作可以包含更小的操作。一个请求 span 可能包含一次 cache 查找和一次数据库查询。它们一起构成一棵树，显示时间花在哪里。 |
| **Attribute** | 附着在 span 上的具名事实，例如 `provider: "openai"`、`cache.hit: true` 或 `item_count: 12`。Attribute 描述该操作及其结果。 |
| **Event** | span 期间某个时刻的具名发生，例如 `retry.scheduled` 或 `cache.lookup`。Event 没有持续时间，也可以携带自己的 attribute。 |
| **Status** | 操作的结果：`ok` 或 `error`。error status 可以包含错误名和消息。 |
| **Context** | 标识新工作在 span 树中归属位置的句柄。从某个 context 启动 span，会使其成为该 context 的子 span。 |

例如，加载一个账户可能产生这样的 telemetry：

```text
example.account.load                         span
├─ attributes: account.id=123, found=true   facts about the span
├─ event: example.cache.lookup              occurrence during the span
│  └─ attribute: cache.hit=false            fact about the event
└─ status: ok                               final outcome
```

Span 是诊断数据，不是业务状态。记录它不得改变账户加载是否执行、成功、失败或被持久化。Adapter 把这些通用概念翻译成 OpenTelemetry、Sentry、日志或其他 backend 使用的对应概念。

## 核心 Context API

`TelemetryContext` 围绕一个 callback 启动 span。该 callback 收到一个 `TelemetrySpan`，它同时也是子 span 的显式父 context。

```typescript
import {
  NOOP_TELEMETRY_CONTEXT,
  type TelemetryContext,
} from '@earendil-works/pi-telemetry';

async function loadAccount(
  accountId: string,
  telemetryContext: TelemetryContext = NOOP_TELEMETRY_CONTEXT,
) {
  return telemetryContext.startSpan(
    {
      name: 'example.account.load',
      attributes: { 'example.account.id': accountId },
    },
    async (span) => {
      const account = await readAccount(accountId);
      span.setAttributes({ 'example.account.found': account !== undefined });
      return account;
    },
  );
}
```

把 callback 的 span 传给更底层的工作，以创建显式嵌套：

```typescript
return telemetryContext.startSpan({ name: 'example.parent' }, async (parentSpan) => {
  return parentSpan.startSpan({ name: 'example.child' }, async (childSpan) => {
    childSpan.addEvent('example.cache.lookup', { 'example.cache.hit': true });
    return performWork();
  });
});
```

没有公开的 `end()` 方法。`startSpan()` 负责结算，并在 callback 的值或 promise 结算之前保持 span 打开。对于用普通返回值表示的预期失败，显式设置 status：

```typescript
return telemetryContext.startSpan({ name: 'example.save' }, async (span) => {
  const result = await save();
  if (!result.ok) {
    span.setStatus({
      status: 'error',
      error: { name: 'SaveError', message: result.reason },
    });
  }
  return result;
});
```

## Adapter 约定

Adapter 实现 `TelemetryContext`，并把通用 API 桥接到其 backend。它必须：

- 创建子 span，并同步地、恰好一次地调用 callback；
- 保留 callback 的返回值与 rejection 值；同步抛出后返回以同一值 reject 的 promise；
- 在返回的 promise 结算之前保持原生 span 打开；
- 把正常完成视为 `ok`，把 throw/reject 视为 error，除非已显式设置 status；
- 使重复的 `setStatus()` 调用后写覆盖；
- 合并 `setAttributes()` 调用，后定义的值替换先前的值，并忽略 `undefined`；
- 使记录方法同步、被动、且不抛错；
- 忽略结算之后的调用；
- 原子地忽略失败的记录调用，压制 backend 失败，并且仍然恰好执行一次业务 callback。

Adapter 可以在内部激活 backend 原生的 ambient context 以做自动 instrumentation，但 pi 代码始终通过 `TelemetryContext` 参数传播父级。Exporter 缓冲、flush、采样、backend ID 以及 backend 特有的 context 对象都属于 adapter。使用 [adapter 符合性套件](#adapter-符合性) 检查这些可观察语义。

## No-op Context

当 telemetry 可选时使用 `NOOP_TELEMETRY_CONTEXT`：

```typescript
import { NOOP_TELEMETRY_CONTEXT } from '@earendil-works/pi-telemetry';

const result = await NOOP_TELEMETRY_CONTEXT.startSpan(
  { name: 'example.operation' },
  () => runOperation(),
);
```

No-op context：

- 同步调用 callback；
- 保留返回值和异步 rejection，并把同步 throw 转为以同一值 reject 的 promise；
- 使用一个共享的冻结惰性 span，嵌套 span 也是如此；
- 不检查也不保留 name、attribute、event 或 status。

## 内存参考 Adapter

`InMemoryTelemetryContext` 是与 backend 无关的参考实现。它适用于测试、本地诊断，以及有意要在没有 exporter 的情况下做进程内捕获的应用：

```typescript
import { InMemoryTelemetryContext } from '@earendil-works/pi-telemetry';

const telemetry = new InMemoryTelemetryContext();

await telemetry.startSpan(
  { name: 'example.operation', attributes: { input: 'demo' } },
  async (span) => {
    span.addEvent('example.started');
    span.setAttributes({ output_count: 3 });
  },
);

console.log(telemetry.getSpans());
```

`getSpans()` 按 span 启动顺序返回已分离的 snapshot。每个 `RecordedTelemetrySpan` 包含确定性的数字 ID、parent ID、合并后的 attribute、有序 event、最终 status、结算状态，以及确定性的结束序号。它不记录时间戳。

该 adapter 可以安全地当作普通 `TelemetryContext` 使用，但存储无界且仅在进程内。创建新实例以隔离测试或记录范围；除非调用方的数据策略允许，否则不要捕获敏感 attribute。

## Adapter 符合性

`@earendil-works/pi-telemetry/testing` 导出一套与 runner 无关、按组建模的符合性套件。fixture 提供一个新的 context，并将其 backend 已完成的 span 转成规范化的 `RecordedTelemetrySpan` snapshot：

```typescript
import {
  createTelemetryAdapterConformance,
  type TelemetryAdapterFixture,
} from '@earendil-works/pi-telemetry/testing';
import { describe, it } from 'vitest';

const conformance = createTelemetryAdapterConformance(async () => {
  const adapter = createMyTelemetryAdapter();
  return {
    context: adapter.context,
    getSpans: async () => adapter.normalizedSpans(),
    async [Symbol.asyncDispose]() {
      await adapter.close();
    },
  } satisfies TelemetryAdapterFixture;
});

for (const group of new Set(conformance.map((testCase) => testCase.group))) {
  describe(group, () => {
    for (const testCase of conformance.filter((candidate) => candidate.group === group)) {
      it(testCase.name, () => testCase.run());
    }
  });
}
```

该套件检查同步单次准入、结果与 rejection 同一性、自动与显式 status、attribute 合并、event 顺序、结算后的惰性调用、嵌套与并发的父子关系，以及对不可读 telemetry payload 失败的压制。`getSpans()` 可以在返回前 flush 异步 exporter。testing 子路径使用 Node 的断言 API；根 telemetry 包仍保持运行时无关。

## 类型化 Schema

底层 span API 有意接受开放的 name 和 attribute bag，以便 adapter 保持通用。领域包可以定义封闭、可序列化的 schema，并从中推断精确的 TypeScript 类型。

```typescript
import {
  createTypedSpanStarter,
  defineTelemetrySchema,
} from '@earendil-works/pi-telemetry';

export const EXAMPLE_TELEMETRY_SCHEMA = defineTelemetrySchema({
  version: 1,
  spans: {
    'example.read': {
      description: 'Read one resource',
      parents: { kind: 'any' },
      startAttributes: {
        'example.resource': {
          type: 'string',
          required: true,
          values: ['account', 'project'],
          description: 'Resource kind',
        },
      },
      endAttributes: {
        'example.item_count': {
          type: 'number',
          description: 'Number of returned items',
        },
      },
      events: {
        'example.cache': {
          description: 'Cache lookup result',
          attributes: {
            'example.cache.hit': {
              type: 'boolean',
              required: true,
              description: 'Whether the cache contained the resource',
            },
          },
        },
      },
      status: {
        default: 'ok',
        errorWhen: 'The read throws or returns an error result',
      },
    },
  },
} as const);

const startSpan = createTypedSpanStarter(
  telemetryContext,
  [EXAMPLE_TELEMETRY_SCHEMA],
);
```

该 starter 为每个 span 暴露一个 overload，并在编译期检查 name 与 attribute。联合类型的 name 必须在调用前收窄，以保持每个运行时 name 与其 attribute schema 的对应关系。其 callback 收到一个覆盖同一批 schema 的子 starter，并且已经绑定到该 callback 的 span：

```typescript
await startSpan(
  'example.read',
  { 'example.resource': 'account' },
  async (span, startChildSpan) => {
    span.addEvent('example.cache', { 'example.cache.hit': true });
    const accounts = await readAccounts();
    span.setAttributes({ 'example.item_count': accounts.length });

    await startChildSpan(
      'example.read',
      { 'example.resource': 'project' },
      async (childSpan) => {
        const projects = await readProjects();
        childSpan.setAttributes({ 'example.item_count': projects.length });
      },
    );

    return accounts;
  },
);
```

### 启动与完成 Attribute

`startAttributes` 和 `endAttributes` 描述某个 attribute 通常何时已知，而不是分开的运行时存储：

| Schema 字段 | 记录方式 | 是否必需 |
|---|---|---|
| `startAttributes` | 在创建 span 时通过类型化 starter 的 `attributes` 参数传入 | 每条定义显式设置 `required: true` 或 `false` |
| `endAttributes` | 随后通过 schema 范围 span 的 `setAttributes()` 方法添加 | 始终可选 |

两组都会成为同一 backend span 上的普通 attribute。没有单独的结束 attribute payload，也没有结束 callback。在前面的例子中，`example.resource` 在 `example.read` 启动时已知，而 `example.item_count` 只有在 `readAccounts()` 返回后才已知：

```typescript
await startSpan(
  'example.read',
  { 'example.resource': 'account' }, // required start attribute
  async (span) => {
    const accounts = await readAccounts();
    span.setAttributes({
      'example.item_count': accounts.length, // optional completion attribute
    });
    return accounts;
  },
); // resolving the callback settles the span
```

“End” 表示完成时的充实：结束 attribute 可以在 callback 仍活跃的任意时刻设置，在不可用时也可以省略。调用 `setAttributes()` 零次是合法的。这对早期失败、取消，以及并非每条路径都存在的提供方特有数据很重要。

重复的 `setAttributes()` 调用合并到同一个 attribute bag。同一 key 上后定义的值替换先前的值，`undefined` 被忽略。schema 范围的方法只接受当前 span 已声明的结束 attribute。

Attribute 不会结束 span。从 callback 返回、resolve、throw 或 reject 控制结算；`startSpan()` 执行真正的结束操作。结算之后的 adapter 调用是惰性的。

一个 starter 可以组合多个独立版本化的 schema：

```typescript
import { AGENT_TELEMETRY_SCHEMAS } from '@earendil-works/pi-agent-core';

const startAgentSpan = createTypedSpanStarter(
  telemetryContext,
  AGENT_TELEMETRY_SCHEMAS,
);
```

内联 schema 数组会自动保留其 tuple 类型。单独声明的数组应使用 `as const`。数组中字面量重复的 span name 会在编译期被拒绝；schema 在运行时不会被合并、检查或保留。

由 schema 推导的类型会拒绝缺失的必需 attribute、未知 key、无效的封闭集合值、未声明的 event，以及空 schema 上的 attribute。结束 attribute 始终是可选的充实；类型系统不要求必须调用 `setAttributes()`。

`defineTelemetrySchema()` 是一个类型化的恒等函数。它返回普通的 JSON 可序列化数据，不做运行时校验，也不强制 parent 规则。

## Schema 元数据

支持的 attribute 类型为：

- `string`、`number` 和 `boolean`；
- `string[]`、`number[]` 和 `boolean[]`。

Attribute 定义支持：

- `values`：标量值的封闭集合；
- `elementValues`：数组元素的封闭集合；
- `examples`：文档示例；
- `sensitive`：标记需要特殊处理的数据；
- `cardinality`：记录预期的 `low` 或 `high` 基数。

启动 attribute 与 event attribute 声明 `required`。结束 attribute 不声明；见 [启动与完成 Attribute](#启动与完成-attribute)。

Parent 元数据是描述性 schema 数据：

- `{ kind: 'any' }`：根 span 或任意调用方 span；
- `{ kind: 'root_or_external' }`：根 span，或 schema 之外由调用方拥有的 span；
- `{ kind: 'spans', spans: [...] }`：仅列出的 schema span。

Adapter 不需要理解 schema 对象。Instrumentation helper 和测试用它们保持发出的 name 与 attribute 一致。

## Pi 包集成

包的所有权有意拆分：

- `@earendil-works/pi-telemetry` 拥有厂商无关的契约、no-op 与内存参考 context、schema 工具，以及 adapter 符合性套件；
- `@earendil-works/pi-ai` 在提供方请求选项中接受并传播 `telemetryContext`，但不拥有 telemetry schema；
- `@earendil-works/pi-agent-core` 拥有并导出 pi AI 请求与 harness schema、它们合并后的只读 schema tuple，以及类型化 span helper。

```typescript
import {
  AGENT_TELEMETRY_SCHEMAS,
  AI_TELEMETRY_SCHEMA,
  HARNESS_TELEMETRY_SCHEMA,
  startAiSpan,
  startHarnessSpan,
} from '@earendil-works/pi-agent-core';
```

pi schema 使用 pi 拥有的 `pi.ai.*`、`pi.harness.*` 和 `pi.session.*` 名称。Adapter 可以把它们翻译成 backend 约定，但不得改变发出的 pi 词汇。

## 安全与可移植性

Telemetry 是进程内诊断，不是持久的应用状态。不要把 `TelemetryContext`、`TelemetrySpan` 或 backend 原生的 trace 对象持久化到记录、消息、snapshot 或延迟句柄中。

Attribute 值有意限制为原始标量和数组。领域 instrumentation 应避免 prompt、completion、tool 参数或输出、文件内容、提供方 payload、header、凭证，以及自由形式的错误细节，除非其 schema 与数据策略明确允许。

本包不使用 `AsyncLocalStorage` 或其他运行时特有的 ambient context API。它适用于 Node.js、Bun、浏览器和 worker；backend adapter 仍负责各自的运行时兼容性。

## API 参考

### 核心类型与值

| Export | 用途 |
|---|---|
| `TelemetryContext` | 启动由 callback 管理的子 span |
| `TelemetrySpan` | 记录 attribute、event 和 status；同时作为子 context |
| `SpanOptions` | Span name 与可选的启动 attribute |
| `SpanAttributes` / `AttributeValue` | 开放的 adapter 级 attribute bag 以及支持的值 |
| `SpanStatus` | 显式的 `ok` 或 `error` status |
| `NOOP_TELEMETRY_CONTEXT` | 用于关闭 telemetry 的共享被动 context |
| `InMemoryTelemetryContext` | 带确定性进程内记录的参考 adapter |
| `RecordedTelemetrySpan` | 规范化的已捕获 span snapshot |
| `RecordedTelemetryEvent` | 规范化的已捕获 event snapshot |

### Schema 定义与推断

| Export | 用途 |
|---|---|
| `defineTelemetrySchema()` | 用于可序列化 schema 数据的类型化恒等 helper |
| `createTypedSpanStarter()` | 把父 context 绑定到一个或多个 schema 词汇 |
| `TypedSpanStarter` | 带递归子绑定 callback 的精确 starter 类型 |
| `TelemetrySchemaDefinition` | 顶层 schema 形状 |
| `TelemetrySpanDefinition` | Span 元数据、parent、attribute、event 以及 status 规则 |
| `TelemetryAttributeType` | 支持的标量与数组类型名 |
| `TelemetryAttributeMetadata` | 描述、敏感性与基数元数据 |
| `TelemetryAttributeDefinition` | Attribute 类型、允许的值、示例与元数据 |
| `TelemetryStartAttributeDefinition` | 带是否必需的启动 attribute 定义 |
| `TelemetryEventAttributeDefinition` | 带是否必需的 event attribute 定义 |
| `TelemetryEventDefinition` | Event 描述与 attribute 定义 |
| `TelemetryParentDefinition` | 开放、外部根，或有限 schema-parent 规则 |
| `TelemetrySchemaSpanName` | 已声明 span name 的联合 |
| `TelemetrySchemaSpanStartAttributes` | 单个 span 精确推断的启动 attribute |
| `TelemetrySchemaSpanEndAttributes` | 单个 span 可选推断的结束 attribute |
| `TelemetrySchemaSpanEventName` | 单个 span 已声明 event 的联合 |
| `TelemetrySchemaSpanEventAttributes` | 单个 event 精确推断的 attribute |
| `SchemaTelemetrySpan` | 限制到单个 schema span 的 span 视图 |
| `TelemetrySchemaSpanUnion` | schema 中所有 span 的可判别联合 |
| `InferStartAttributes` | 从启动定义推断的必需与可选值 |
| `InferOptionalAttributes` | 从结束定义推断的可选值 |
| `InferEventAttributes` | 从 event 定义推断的必需与可选值 |
| `InferRequiredAndOptionalAttributes` | 用于带是否必需之定义的共享推断工具 |
| `ExactTelemetryAttributes` | 拒绝期望 attribute 集合之外的 key |

### Testing 子路径

| Export | 用途 |
|---|---|
| `createTelemetryAdapterConformance()` | 创建与 runner 无关的 adapter 符合性用例 |
| `TelemetryAdapterFixture` | 单个用例的新 context 与规范化 snapshot 读取器 |
| `TelemetryAdapterFixtureFactory` | 创建隔离的 fixture |
| `TelemetryAdapterConformanceCase` | 由测试 runner 执行的分组用例 |

## 开发

在本包目录下：

```bash
npm test
npm run build
```

仓库范围的类型检查、格式化、lint 和冒烟检查用以下命令运行：

```bash
npm run check
```

## 许可证

MIT
