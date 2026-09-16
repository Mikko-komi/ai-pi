> 本文为 [compaction.md](compaction.md) 的中文译本。

# 压缩与分支摘要

LLM 的上下文窗口有限。对话过长时，Pi 用压缩来摘要较旧内容，同时保留近期工作。本页同时介绍自动压缩和分支摘要。

**源文件**（[pi](https://github.com/earendil-works/pi)）：
- [`packages/coding-agent/src/core/compaction/compaction.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) - 自动压缩逻辑
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) - 分支摘要
- [`packages/coding-agent/src/core/compaction/utils.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) - 共享工具（文件跟踪、序列化）
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - 条目类型（`CompactionEntry`、`BranchSummaryEntry`）
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) - 扩展事件类型

项目中的 TypeScript 定义可查看 `node_modules/@earendil-works/pi-coding-agent/dist/`。

## 概述

Pi 有两种摘要机制：

| 机制 | 触发 | 用途 |
|-----------|---------|---------|
| 压缩 | 上下文超过阈值，或 `/compact` | 摘要旧消息以释放上下文 |
| 分支摘要 | `/tree` 导航 | 切换分支时保留上下文 |

两者使用相同的结构化摘要格式，并累计跟踪文件操作。压缩和分支摘要请求使用新的路由会话 ID；在提供方支持时禁用 prompt 缓存写入，因为这些一次性 prompt 不太可能被复用。

## 压缩

### 何时触发

自动压缩在以下条件触发：

```
contextTokens > contextWindow - reserveTokens
```

默认情况下，`reserveTokens` 为 16384 token（可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置）。这为 LLM 回复留出空间。

在多轮 agent 运行中，Pi 在工具完成且结果已追加之后、开始下一次助手回复之前检查该阈值。若越过阈值，Pi 在同一 agent 运行内压缩，然后用摘要和保留的消息继续。若已完成的工具批次结束了本次运行，且没有排队消息需要另一次回复，则跳过这次轮次间检查。Pi 也会在新的用户 prompt 之前，以及底层 agent 运行结束后检查该阈值。

也可以用 `/compact [instructions]` 手动触发，可选说明用于聚焦摘要。

### 工作方式

1. **找切割点**：从最新消息向前走，累计 token 估算，直到达到 `keepRecentTokens`（默认 20k，可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置）
2. **提取消息**：收集从上一个保留边界（或会话开始）到切割点的消息
3. **生成摘要**：用结构化格式调用 LLM 做摘要；若已有上一份摘要，则作为迭代上下文传入
4. **追加条目**：保存带摘要和 `firstKeptEntryId` 的 `CompactionEntry`
5. **重建上下文**：会话为下一次请求重建上下文，使用摘要 + 从 `firstKeptEntryId` 起的消息

```
压缩前：

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               messagesToSummarize            保留的消息
                                   ↑
                          firstKeptEntryId（条目 4）

压缩后（追加新条目）：

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                 不发给 LLM                         发给 LLM
                                                         ↑
                                              从 firstKeptEntryId 开始

LLM 看到的内容：

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    prompt   来自 cmp          从 firstKeptEntryId 起的消息
```

重复压缩时，被摘要的区间从上一次压缩的保留边界（`firstKeptEntryId`）开始，而不是从压缩条目本身开始；若该保留条目在路径中找不到，则回退到上一次压缩之后的条目。这样会把上次压缩后仍保留的消息也纳入下一轮摘要。Pi 还会在写入新的 `CompactionEntry` 之前，从重建的会话上下文重新计算 `tokensBefore`，使 token 计数反映实际被替换的压缩前上下文。

### 拆分轮次

一个“轮次”从用户消息开始，包含直到下一条用户消息之前的全部助手回复和工具调用。通常，压缩在轮次边界切割。

当单个轮次超过 `keepRecentTokens` 时，切割点会落在轮次中间的一条助手消息上。这就是“拆分轮次”：

```
拆分轮次（单个巨大轮次超出预算）：

  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘
                                                      └── 保留 (7-8)

  isSplitTurn = true
  messagesToSummarize = []  （之前没有完整轮次）
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

对拆分轮次，Pi 生成两份摘要并合并：
1. **历史摘要**：之前的上下文（若有）
2. **轮次前缀摘要**：拆分轮次的前半部分

### 切割点规则

有效切割点为：
- 用户消息
- 助手消息
- BashExecution 消息
- 自定义消息（custom_message、branch_summary）

永远不要在工具结果处切割（它们必须与对应的工具调用待在一起）。

### CompactionEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface CompactionEntry<T = unknown> {
  type: "compaction";
  id: string;
  parentId: string;
  timestamp: number;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  usage?: Usage;       // 生成摘要的 LLM 用量
  fromHook?: boolean;  // 由扩展提供时为 true（遗留字段名）
  details?: T;         // 实现相关数据
}

// 默认压缩把这些放进 details（来自 compaction.ts）：
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

扩展可以在 `details` 中存储任何可 JSON 序列化的数据。默认压缩跟踪文件操作，但自定义扩展实现可以使用自己的结构。生成的摘要和扩展提供的摘要在可用时会存储其 LLM `usage`，以便会话总量包含摘要工作。

实现见 [`prepareCompaction()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) 和 [`compact()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)。若要直接以编程方式摘要，`generateSummary()` 返回摘要文本，`generateSummaryWithUsage()` 返回 `{ text, usage }`。

## 分支摘要

### 何时触发

用 `/tree` 导航到另一分支时，Pi 会提议摘要你即将离开的工作。这会把离开分支的上下文注入新分支。

### 工作方式

1. **找共同祖先**：旧位置与新位置共享的最深节点
2. **收集条目**：从旧叶子走回共同祖先
3. **按预算准备**：按 token 预算纳入消息（从最新开始）
4. **生成摘要**：用结构化格式调用 LLM
5. **追加条目**：在导航点保存 `BranchSummaryEntry`

```
导航前的树：

         ┌─ B ─ C ─ D（旧叶子，即将放弃）
    A ───┤
         └─ E ─ F（目标）

共同祖先：A
要摘要的条目：B、C、D

带摘要导航后：

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [B,C,D 的摘要]（新叶子）
```

### 累计文件跟踪

压缩和分支摘要都累计跟踪文件。生成摘要时，pi 从以下位置提取文件操作：
- 正在被摘要的消息中的工具调用
- 之前的压缩或分支摘要 `details`（若有）

这意味着文件跟踪会跨多次压缩或嵌套分支摘要累计，保留已读和已修改文件的完整历史。

### BranchSummaryEntry 结构

定义于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: "branch_summary";
  id: string;
  parentId: string;
  timestamp: number;
  summary: string;
  fromId: string;      // 导航出发的条目
  usage?: Usage;       // 生成摘要的 LLM 用量
  fromHook?: boolean;  // 由扩展提供时为 true（遗留字段名）
  details?: T;         // 实现相关数据
}

// 默认分支摘要把这些放进 details（来自 branch-summarization.ts）：
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

与压缩相同，扩展可以在 `details` 中存储自定义数据。

实现见 [`collectEntriesForBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、[`prepareBranchEntries()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) 和 [`generateBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)。

## 摘要格式

压缩和分支摘要使用相同的结构化格式：

```markdown
## Goal
[What the user is trying to accomplish]

## Constraints & Preferences
- [Requirements mentioned by user]

## Progress
### Done
- [x] [Completed tasks]

### In Progress
- [ ] [Current work]

### Blocked
- [Issues, if any]

## Key Decisions
- **[Decision]**: [Rationale]

## Next Steps
1. [What should happen next]

## Critical Context
- [Data needed to continue]

<read-files>
path/to/file1.ts
path/to/file2.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### 消息序列化

摘要前，消息通过 [`serializeConversation()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) 序列化为文本：

```
[User]: What they said
[Assistant thinking]: Internal reasoning
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

这能避免模型把它当成要继续的对话。

序列化时，工具结果截断到 2000 个字符。超出部分替换为标明截断字符数的标记。这把摘要请求控制在合理的 token 预算内，因为工具结果（尤其来自 `read` 和 `bash`）通常是上下文体积的最大来源。

## 通过扩展自定义摘要

扩展可以拦截并自定义压缩和分支摘要。事件类型定义见 [`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)。

### session_before_compact

在自动压缩或 `/compact` 之前触发。可以取消或提供自定义摘要。见类型文件中的 `SessionBeforeCompactEvent` 和 `CompactionPreparation`。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - 要摘要的消息
  // preparation.turnPrefixMessages - 拆分轮次前缀（若 isSplitTurn）
  // preparation.previousSummary - 上一次压缩摘要
  // preparation.fileOps - 提取出的文件操作
  // preparation.tokensBefore - 压缩前的上下文 token
  // preparation.firstKeptEntryId - 保留消息的起点
  // preparation.settings - 应用模型覆盖后的有效设置

  // branchEntries - 当前分支上的全部条目（用于自定义状态）
  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // willRetry - 压缩后是否重试被中止的轮次（溢出恢复）
  // signal - AbortSignal（传给 LLM 调用）

  // 取消：
  return { cancel: true };

  // 自定义摘要：
  return {
    compaction: {
      summary: "Your summary...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // 可选；计入会话总量
      details: { /* custom data */ },
    }
  };
});
```

#### 把消息转成文本

若要用自己的模型生成摘要，使用 `serializeConversation` 把消息转成文本：

```typescript
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;
  
  // 把 AgentMessage[] 转成 Message[]，再序列化为文本
  const conversationText = serializeConversation(
    convertToLlm(preparation.messagesToSummarize)
  );
  // 返回：
  // [User]: message text
  // [Assistant thinking]: thinking content
  // [Assistant]: response text
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: output text

  // 再发给你的模型做摘要
  const { summary, usage } = await myModel.summarize(conversationText);
  
  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage,
    }
  };
});
```

使用不同模型的完整示例见 [custom-compaction.ts](../examples/extensions/custom-compaction.ts)。

### session_compact_failed

在手动或自动压缩失败或被中止时触发。对需要把 `session_before_compact` 尝试与最终结果配对的遥测扩展很有用。

```typescript
pi.on("session_compact_failed", async (event, ctx) => {
  const { reason, errorMessage, aborted, willRetry, fromExtension } = event;
  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // errorMessage - 非中止失败时存在
  // aborted - 取消/中止的压缩为 true
  // willRetry - 被中止的轮次在压缩后是否本应重试
  // fromExtension - 当时是否正在使用扩展提供的压缩内容
});
```

### session_before_tree

在 `/tree` 导航之前触发。无论用户是否选择摘要都会触发。可以取消导航或提供自定义摘要。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId - 导航目标
  // preparation.oldLeafId - 当前位置（即将放弃）
  // preparation.commonAncestorId - 共享祖先
  // preparation.entriesToSummarize - 将被摘要的条目
  // preparation.userWantsSummary - 用户是否选择摘要

  // 完全取消导航：
  return { cancel: true };

  // 提供自定义摘要（仅当 userWantsSummary 为 true 时使用）：
  if (preparation.userWantsSummary) {
    return {
      summary: {
        summary: "Your summary...",
        // usage: summaryResponse.usage, // 可选；计入会话总量
        details: { /* custom data */ },
      }
    };
  }
});
```

见类型文件中的 `SessionBeforeTreeEvent` 和 `TreePreparation`。

## 设置

在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置压缩：

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 设置项 | 默认值 | 说明 |
|---------|---------|-------------|
| `enabled` | `true` | 启用自动压缩 |
| `reserveTokens` | `16384` | 为 LLM 回复预留的 token |
| `keepRecentTokens` | `20000` | 保留的近期 token（不摘要） |

用 `"enabled": false` 禁用自动压缩。仍可用 `/compact` 手动压缩。

### 按模型覆盖

使用 `compaction.modelOverrides` 为不同模型调整 token 预算：

```json
{
  "compaction": {
    "reserveTokens": 16384,
    "keepRecentTokens": 20000,
    "modelOverrides": {
      "some-provider/big-model": {
        "reserveTokens": 400000
      }
    }
  }
}
```

对拥有 1M 上下文窗口的模型，该覆盖会在超过 600K token 时触发压缩，并保留普通的 20000 近期 token。其他模型仍使用普通的 16384 token 预留。`reserveTokens` 也会影响摘要输出上限（受模型最大输出 token 限制）；它不只是触发阈值。

键是精确、区分大小写的 `provider/modelId` 值，包括模型 ID 内的斜杠。每个 `reserveTokens` 和 `keepRecentTokens` 值独立回退：模型覆盖 → 普通设置 → 内置默认。值必须是非负安全整数。匹配模型覆盖中的无效值会在读取时报错；只有省略的字段才回退到普通设置。模型覆盖条目必须是对象。普通 token 设置无效会在读取时报错，即使活动模型有有效覆盖。只有省略的普通值才使用内置默认。`enabled` 仍是全局的，不按模型区分。

这些解析后的值用于手动压缩、全部自动阈值检查、溢出恢复，以及扩展可见的 `preparation.settings`。切换模型会影响后续检查和压缩，但不会改普通设置。已在进行中的压缩使用该次操作捕获的模型和设置。分支摘要设置不受影响。

覆盖在全局和项目设置中都有效。文件在查找前递归合并，因此全局的模型专用值优先于项目级回退；项目必须覆盖该模型条目才能更改。详情见 [settings.zh.md](settings.zh.md#按模型覆盖压缩设置)。
