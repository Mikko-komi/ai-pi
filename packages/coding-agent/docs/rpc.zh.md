> 本文为 [rpc.md](rpc.md) 的中文译本。

# RPC 模式

RPC 模式通过 stdin/stdout 上的 JSON 协议，让 coding agent 以无界面方式运行。适合把 agent 嵌入其他应用、IDE 或自定义 UI。

**给 Node.js/TypeScript 用户的说明**：如果你在构建 Node.js 应用，可以考虑直接使用 `@earendil-works/pi-coding-agent` 中的 `AgentSession`，而不是再拉起一个子进程。API 见 [`src/core/agent-session.ts`](../src/core/agent-session.ts)。若需要基于子进程的 TypeScript 客户端，见 [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts)。

## 启动 RPC 模式

```bash
pi --mode rpc [options]
```

常用选项：
- `--provider <name>`：设置 LLM 提供方（anthropic、openai、google 等）
- `--model <pattern>`：模型 pattern 或 ID（支持 `provider/id`，以及可选的 `:<thinking>`）
- `--name <name>` / `-n <name>`：启动时设置会话显示名称
- `--no-session`：关闭会话持久化
- `--session-dir <path>`：自定义会话存储目录

## 协议概览

- **命令**：发到 stdin 的 JSON 对象，每行一条
- **响应**：带 `type: "response"` 的 JSON 对象，表示命令成功或失败
- **事件**：agent 事件以 JSON 行的形式流式写到 stdout

所有命令都支持可选的 `id` 字段，用于请求/响应关联。若提供了 `id`，对应响应会带上同一个 `id`。`bash_execution_update` 事件也会包含其来源 `bash` 命令的 `id`。

### 分帧

RPC 模式使用严格的 JSONL 语义，仅以 LF（`\n`）作为记录分隔符。

这对客户端意味着：
- 只按 `\n` 拆分记录
- 可以接受可选的 `\r\n` 输入，方法是去掉末尾的 `\r`
- 不要使用会把 Unicode 分隔符也当成换行的通用行读取器

特别地，Node 的 `readline` 不符合 RPC 模式协议：它还会按 `U+2028` 和 `U+2029` 拆分，而这两个字符在 JSON 字符串里是合法的。

## 命令

### 提示

#### prompt

向 agent 发送一条用户提示。命令响应会在提示被接受、入队或处理后发出。接受之后，事件会继续异步流式输出。

```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

带图片：
```json
{"type": "prompt", "message": "What's in this image?", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

**流式进行中**：如果 agent 已经在流式输出，必须指定 `streamingBehavior` 才能把消息入队：

```json
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
```

- `"steer"`：在 agent 运行时把消息入队。当前助手回合执行完工具调用后、下一次 LLM 调用前投递。
- `"followUp"`：等到 agent 结束后再处理。仅在 agent 停止时投递。

如果 agent 正在流式输出且未指定 `streamingBehavior`，该命令会返回错误。

**扩展命令**：如果消息是扩展命令（例如 `/mycommand`），即使正在流式输出也会立即执行。扩展命令通过 `pi.sendMessage()` 自行管理与 LLM 的交互。

**输入展开**：skill 命令（`/skill:name`）和 prompt 模板（`/template`）会在发送/入队前展开。

响应：
```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true}
```

`success: true` 表示提示已被接受、入队或立即处理。`success: false` 表示提示在接受前就被拒绝。接受之后的失败会通过正常的事件和消息流报告，而不会对同一个请求 id 再发一条 `response`。

`images` 字段是可选的。每张图片使用 `ImageContent` 格式：`{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`。

#### steer

在 agent 运行时入队一条转向消息。当前助手回合执行完工具调用后、下一次 LLM 调用前投递。skill 命令和 prompt 模板会被展开。不允许扩展命令（请改用 `prompt`）。

```json
{"type": "steer", "message": "Stop and do this instead"}
```

带图片：
```json
{"type": "steer", "message": "Look at this instead", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` 字段是可选的。每张图片使用 `ImageContent` 格式（与 `prompt` 相同）。

响应：
```json
{"type": "response", "command": "steer", "success": true}
```

如何控制转向消息的处理方式，见 [set_steering_mode](#set_steering_mode)。

#### follow_up

入队一条跟进消息，在 agent 结束后处理。仅当 agent 没有更多工具调用或转向消息时才投递。skill 命令和 prompt 模板会被展开。不允许扩展命令（请改用 `prompt`）。

```json
{"type": "follow_up", "message": "After you're done, also do this"}
```

带图片：
```json
{"type": "follow_up", "message": "Also check this image", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` 字段是可选的。每张图片使用 `ImageContent` 格式（与 `prompt` 相同）。

响应：
```json
{"type": "response", "command": "follow_up", "success": true}
```

如何控制跟进消息的处理方式，见 [set_follow_up_mode](#set_follow_up_mode)。

#### abort

中止当前操作，并等到会话空闲后再响应。

```json
{"type": "abort"}
```

响应：
```json
{"type": "response", "command": "abort", "success": true}
```

#### clear_queue

移除已入队的转向消息和跟进消息，并返回它们的文本。

```json
{"type": "clear_queue"}
```

响应：
```json
{
  "type": "response",
  "command": "clear_queue",
  "success": true,
  "data": {
    "steering": ["Change direction"],
    "followUp": ["Summarize when finished"]
  }
}
```

若要实现交互式 Esc 行为，先发 `clear_queue` 再发 `abort`，然后把返回的文本还原到客户端编辑器。若队列消息仍留在会话中，`abort` 会继续处理它们。

#### new_session

开始一个全新会话。可被 `session_before_switch` 扩展事件处理器取消。

```json
{"type": "new_session"}
```

可选地带上父会话跟踪：
```json
{"type": "new_session", "parentSession": "/path/to/parent-session.jsonl"}
```

响应：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": false}}
```

如果扩展取消了操作：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": true}}
```

### 状态

#### get_state

获取当前会话状态。

```json
{"type": "get_state"}
```

响应：
```json
{
  "type": "response",
  "command": "get_state",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isStreaming": false,
    "isCompacting": false,
    "steeringMode": "all",
    "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "sessionName": "my-feature-work",
    "autoCompactionEnabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

`model` 字段是完整的 [Model](#model) 对象，或为 `null`。`sessionName` 字段是通过 `set_session_name` 设置的显示名称；未设置时省略。

#### get_messages

获取对话中的全部消息。

```json
{"type": "get_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_messages",
  "success": true,
  "data": {"messages": [...]}
}
```

消息是 `AgentMessage` 对象（见[消息类型](#message-types)）。

### 模型

#### set_model

切换到指定模型。

```json
{"type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514"}
```

响应包含完整的 [Model](#model) 对象：
```json
{
  "type": "response",
  "command": "set_model",
  "success": true,
  "data": {...}
}
```

#### cycle_model

循环到下一个可用模型。若只有一个可用模型，`data` 为 `null`。

```json
{"type": "cycle_model"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_model",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isScoped": false
  }
}
```

`model` 字段是完整的 [Model](#model) 对象。

#### get_available_models

列出全部已配置模型。

```json
{"type": "get_available_models"}
```

响应包含完整 [Model](#model) 对象的数组：
```json
{
  "type": "response",
  "command": "get_available_models",
  "success": true,
  "data": {
    "models": [...]
  }
}
```

### Thinking

#### set_thinking_level

为支持推理/thinking 的模型设置 thinking 级别。

```json
{"type": "set_thinking_level", "level": "high"}
```

级别：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`

`"xhigh"` 和 `"max"` 仅在当前所选模型支持时才会暴露。部分模型（包括 GPT-5.6）会同时暴露两者。

响应：
```json
{"type": "response", "command": "set_thinking_level", "success": true}
```

#### cycle_thinking_level

在可用 thinking 级别之间循环。若模型不支持 thinking，`data` 为 `null`。

```json
{"type": "cycle_thinking_level"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_thinking_level",
  "success": true,
  "data": {"level": "high"}
}
```

#### get_available_thinking_levels

列出当前模型支持的 thinking 级别。对不支持推理的模型返回 `["off"]`。

```json
{"type": "get_available_thinking_levels"}
```

响应：
```json
{
  "type": "response",
  "command": "get_available_thinking_levels",
  "success": true,
  "data": {
    "levels": ["off", "minimal", "low", "medium", "high"]
  }
}
```

### 队列模式

#### set_steering_mode

控制来自 `steer` 的转向消息如何投递。

```json
{"type": "set_steering_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：当前助手回合执行完工具调用后，投递全部转向消息
- `"one-at-a-time"`：每个已完成的助手回合只投递一条转向消息（默认）

响应：
```json
{"type": "response", "command": "set_steering_mode", "success": true}
```

#### set_follow_up_mode

控制来自 `follow_up` 的跟进消息如何投递。

```json
{"type": "set_follow_up_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：agent 结束时投递全部跟进消息
- `"one-at-a-time"`：每次 agent 完成后只投递一条跟进消息（默认）

响应：
```json
{"type": "response", "command": "set_follow_up_mode", "success": true}
```

### 压缩

#### compact

手动压缩对话上下文，以降低 token 用量。

```json
{"type": "compact"}
```

带自定义指令：
```json
{"type": "compact", "customInstructions": "Focus on code changes"}
```

响应：
```json
{
  "type": "response",
  "command": "compact",
  "success": true,
  "data": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  }
}
```

`estimatedTokensAfter` 是压缩刚结束后、对重建消息上下文的启发式估算，不是提供方精确的 token 计数。`usage` 报告生成摘要的那次或那些 LLM 调用；自定义压缩处理器可能会省略它。

#### set_auto_compaction

在上下文即将满时，启用或禁用自动压缩。

```json
{"type": "set_auto_compaction", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_compaction", "success": true}
```

### 重试

#### set_auto_retry

在瞬时错误（过载、限流、5xx）时启用或禁用自动重试。

```json
{"type": "set_auto_retry", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_retry", "success": true}
```

#### abort_retry

中止进行中的重试（取消延迟并停止再试）。

```json
{"type": "abort_retry"}
```

响应：
```json
{"type": "response", "command": "abort_retry", "success": true}
```

### Bash

#### bash

执行一条 shell 命令，并把输出加入对话上下文。命令运行期间，输出以 `bash_execution_update` 事件流式发出；响应包含最终结果。

```json
{"id": "req-1", "type": "bash", "command": "ls -la"}
```

带上 `id`，以便把流式 `bash_execution_update` 事件与这条命令关联起来。

响应：
```json
{
  "id": "req-1",
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "total 48\ndrwxr-xr-x ...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": false
  }
}
```

如果输出被截断，会包含 `fullOutputPath`：
```json
{
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "truncated output...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": true,
    "fullOutputPath": "/tmp/pi-bash-abc123.log"
  }
}
```

**bash 结果如何到达 LLM：**

`bash` 命令会立即执行并返回 `BashResult`。在内部会创建一条 `BashExecutionMessage`，并存入 agent 的消息状态。

当下一次 `prompt` 命令发出时，全部消息（包括 `BashExecutionMessage`）会在发给 LLM 前被转换。`BashExecutionMessage` 会转成如下格式的 `UserMessage`：

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

这意味着：
1. Bash 输出会在**下一次 prompt** 时进入 LLM 上下文，而不是立刻进入
2. 可以在一次 prompt 之前执行多条 bash 命令；全部输出都会被包含

#### abort_bash

中止正在运行的 bash 命令。

```json
{"type": "abort_bash"}
```

响应：
```json
{"type": "response", "command": "abort_bash", "success": true}
```

### 会话

#### get_session_stats

获取 token 用量、费用统计，以及当前上下文窗口用量。

```json
{"type": "get_session_stats"}
```

响应：
```json
{
  "type": "response",
  "command": "get_session_stats",
  "success": true,
  "data": {
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "userMessages": 5,
    "assistantMessages": 5,
    "toolCalls": 12,
    "toolResults": 12,
    "totalMessages": 22,
    "tokens": {
      "input": 50000,
      "output": 10000,
      "cacheRead": 40000,
      "cacheWrite": 5000,
      "total": 105000
    },
    "cost": 0.45,
    "contextUsage": {
      "tokens": 60000,
      "contextWindow": 200000,
      "percent": 30
    }
  }
}
```

`tokens` 和 `cost` 包含整个会话中的助手消息、工具上报的用量，以及压缩/分支摘要的生成。`contextUsage` 是实际用于压缩和页脚显示的当前上下文窗口估算。

没有模型或上下文窗口时会省略 `contextUsage`。压缩刚结束后，在新的压缩后助手回复提供有效用量数据之前，`contextUsage.tokens` 和 `contextUsage.percent` 为 `null`。

#### export_html

将会话导出为 HTML 文件。

```json
{"type": "export_html"}
```

指定自定义路径：
```json
{"type": "export_html", "outputPath": "/tmp/session.html"}
```

响应：
```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": {"path": "/tmp/session.html"}
}
```

#### switch_session

加载另一个会话文件。可被 `session_before_switch` 扩展事件处理器取消。

```json
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
```

响应：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": false}}
```

如果扩展取消了切换：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": true}}
```

#### fork

从活动分支上的一条先前用户消息创建新分叉。可被 `session_before_fork` 扩展事件处理器取消。返回被分叉消息的文本。

```json
{"type": "fork", "entryId": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": false}
}
```

如果扩展取消了分叉：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": true}
}
```

#### clone

把当前活动分支在当前位置复制到一个新会话。可被 `session_before_fork` 扩展事件处理器取消。

```json
{"type": "clone"}
```

响应：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": false}
}
```

如果扩展取消了克隆：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": true}
}
```

#### get_fork_messages

获取可用于分叉的用户消息。

```json
{"type": "get_fork_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_fork_messages",
  "success": true,
  "data": {
    "messages": [
      {"entryId": "abc123", "text": "First prompt..."},
      {"entryId": "def456", "text": "Second prompt..."}
    ]
  }
}
```

#### get_entries

按追加顺序获取全部会话条目（不含会话页眉）。会话是带稳定 id 的只追加树，因此条目 id 可以作为持久游标：把你见过的最后一条条目 id 作为 `since` 传入，就能只取严格位于其后的条目，即使客户端重启也一样。与 `get_messages` 不同，这会包含压缩前的历史以及已放弃的分支。

```json
{"type": "get_entries"}
```

带游标：
```json
{"type": "get_entries", "since": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "get_entries",
  "success": true,
  "data": {
    "entries": [
      {"type": "message", "id": "def456", "parentId": "abc123", "timestamp": "...", "message": {"role": "user", "...": "..."}}
    ],
    "leafId": "def456"
  }
}
```

`leafId` 是当前叶子条目的 id（空会话为 `null`），因此客户端可以一次往返判断活动分支是否移动。如果 `since` 匹配不到任何条目 id，响应为 `success: false`。

#### get_tree

以条目树的形式获取会话。每个节点是 `{entry, children, label?, labelTimestamp?}`。格式正确的会话只有一个根；父链断开的孤立条目也会作为根出现。

```json
{"type": "get_tree"}
```

响应：
```json
{
  "type": "response",
  "command": "get_tree",
  "success": true,
  "data": {
    "tree": [
      {
        "entry": {"type": "message", "id": "abc123", "parentId": null, "...": "..."},
        "children": [
          {"entry": {"type": "message", "id": "def456", "parentId": "abc123", "...": "..."}, "children": []}
        ]
      }
    ],
    "leafId": "def456"
  }
}
```

#### get_last_assistant_text

获取最后一条助手消息的文本内容。

```json
{"type": "get_last_assistant_text"}
```

响应：
```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": {"text": "The assistant's response..."}
}
```

如果没有助手消息，返回 `{"text": null}`。

#### set_session_name

为当前会话设置显示名称。该名称会出现在会话列表中，便于识别会话。

```json
{"type": "set_session_name", "name": "my-feature-work"}
```

响应：
```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

当前会话名可通过 `get_state` 的 `sessionName` 字段获得。若要在启动 RPC 模式时设置初始名称，向 `pi --mode rpc` 进程传入 `--name <name>` 或 `-n <name>`。

### 命令

#### get_commands

获取可用命令（扩展命令、prompt 模板和 skill）。可通过 `prompt` 命令，在名称前加 `/` 来调用。

```json
{"type": "get_commands"}
```

响应：
```json
{
  "type": "response",
  "command": "get_commands",
  "success": true,
  "data": {
    "commands": [
      {"name": "session-name", "description": "Set or clear session name", "source": "extension", "path": "/home/user/.pi/agent/extensions/session.ts"},
      {"name": "fix-tests", "description": "Fix failing tests", "source": "prompt", "location": "project", "path": "/home/user/myproject/.pi/agent/prompts/fix-tests.md"},
      {"name": "skill:brave-search", "description": "Web search via Brave API", "source": "skill", "location": "user", "path": "/home/user/.pi/agent/skills/brave-search/SKILL.md"}
    ]
  }
}
```

每条命令包含：
- `name`：命令名（用 `/name` 调用）
- `description`：人类可读说明（扩展命令可选）
- `source`：命令种类：
  - `"extension"`：在扩展中通过 `pi.registerCommand()` 注册
  - `"prompt"`：从 prompt 模板 `.md` 文件加载
  - `"skill"`：从 skill 目录加载（名称带 `skill:` 前缀）
- `location`：加载来源（可选，扩展没有该字段）：
  - `"user"`：用户级（`~/.pi/agent/`）
  - `"project"`：项目级（`./.pi/agent/`）
  - `"path"`：通过 CLI 或设置指定的显式路径
- `path`：命令源文件的绝对路径（可选）

**说明**：内置 TUI 命令（`/settings`、`/hotkeys` 等）不包含在内。它们只在交互模式中处理；若通过 `prompt` 发送，不会执行。

## 事件

agent 运行期间，事件以 JSON 行流式写到 stdout。事件通常不带 `id` 字段；当来源 `bash` 命令提供了 `id` 时，`bash_execution_update` 会包含该 `id`。

### 事件类型

| 事件 | 说明 |
|-------|-------------|
| `agent_start` | agent 开始处理 |
| `agent_end` | 一次底层 agent 运行完成（之后仍可能跟着重试、压缩或已入队的续跑） |
| `agent_settled` | agent 运行已完全落定；不再有自动重试、压缩重试或已入队的续跑 |
| `turn_start` | 新回合开始 |
| `turn_end` | 回合完成（包含助手消息和工具结果） |
| `message_start` | 消息开始 |
| `message_update` | 流式更新（text/thinking/toolcall delta） |
| `message_end` | 消息完成 |
| `bash_execution_update` | 直接 RPC bash 命令的输出块 |
| `tool_execution_start` | 工具开始执行 |
| `tool_execution_update` | 工具执行进度（流式输出） |
| `tool_execution_end` | 工具完成 |
| `queue_update` | 待处理的转向/跟进队列发生变化 |
| `compaction_start` | 压缩开始 |
| `compaction_end` | 压缩完成 |
| `auto_retry_start` | 自动重试开始（瞬时错误之后） |
| `auto_retry_end` | 自动重试完成（成功或最终失败） |
| `summarization_retry_scheduled` | 为瞬时的压缩或分支摘要错误安排重试 |
| `summarization_retry_attempt_start` | 重试的摘要请求开始 |
| `summarization_retry_finished` | 摘要重试循环完成 |
| `extension_error` | 扩展抛出错误 |

### agent_start

在 agent 开始处理一条提示时发出。

```json
{"type": "agent_start"}
```

### agent_end

在一次底层 agent 运行完成时发出。包含本次运行生成的全部消息。若 `willRetry` 为 true，接下来会进行自动重试。

```json
{
  "type": "agent_end",
  "messages": [...],
  "willRetry": false
}
```

### agent_settled

在完整的会话级运行落定后发出。此时 Pi 不会再通过重试、压缩重试或已入队的跟进消息自动继续。

```json
{"type": "agent_settled"}
```

### turn_start / turn_end

一个回合由一次助手回复，以及由此产生的工具调用和结果组成。

```json
{"type": "turn_start"}
```

```json
{
  "type": "turn_end",
  "message": {...},
  "toolResults": [...]
}
```

### message_start / message_end

在消息开始和完成时发出。`message` 字段包含一条 `AgentMessage`。

```json
{"type": "message_start", "message": {...}}
{"type": "message_end", "message": {...}}
```

### message_update（流式）

在助手消息流式输出期间发出。包含一条 delta 事件，不含累积消息快照。

```json
{
  "type": "message_update",
  "usage": {
    "input": 100,
    "output": 1,
    "cacheRead": 0,
    "cacheWrite": 0,
    "totalTokens": 101,
    "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "total": 0}
  },
  "assistantMessageEvent": {
    "type": "text_delta",
    "contentIndex": 0,
    "delta": "Hello "
  }
}
```

`assistantMessageEvent` 字段包含下列 delta 类型之一：

| 类型 | 说明 |
|------|-------------|
| `text_start` | 文本内容块开始 |
| `text_delta` | 文本内容块 |
| `text_end` | 文本内容块结束 |
| `thinking_start` | thinking 块开始 |
| `thinking_delta` | thinking 内容块 |
| `thinking_end` | thinking 块结束 |
| `toolcall_start` | 工具调用开始（包含 `id` 和 `toolName`） |
| `toolcall_delta` | 工具调用参数块 |
| `toolcall_end` | 工具调用结束（包含完整 `toolCall` 对象） |

流式文本响应示例：
```json
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_start","contentIndex":0}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":" world"}}
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"text_end","contentIndex":0,"content":"Hello world"}}
```

顶层 `usage` 字段包含提供方报告的最新累积用量。当提供方在流式期间不上报用量时，它可能一直保持为零，直到完成。

开始一次工具调用的示例：
```json
{"type":"message_update","usage":{...},"assistantMessageEvent":{"type":"toolcall_start","contentIndex":1,"id":"call_abc123","toolName":"write"}}
```

`message_update` 有意省略了以前的累积 `message` 字段，以及
`assistantMessageEvent.partial`。需要实时部分消息的客户端必须用 `message_start`
和后续事件，按 `contentIndex` 自行组装。以 `message_end.message`
为权威结果。对工具调用，`toolcall_start` 提供调用 `id` 和 `toolName`；
用 `toolcall_delta.delta` 缓冲参数。`toolcall_end.toolCall` 包含已完成的
调用。

### bash_execution_update

直接 `bash` 命令的每个输出块发出一次。`id` 与命令的 `id` 匹配，便于客户端把输出关联到正确命令。

事件会在命令运行期间流式发出全部输出，即使最终 `bash` 响应的 `output` 被截断也是如此。

```json
{
  "type": "bash_execution_update",
  "id": "req-1",
  "delta": "total 48\n"
}
```

### tool_execution_start / tool_execution_update / tool_execution_end

在工具开始、流式报告进度、以及执行完成时发出。

```json
{
  "type": "tool_execution_start",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": {"command": "ls -la"}
}
```

执行期间，`tool_execution_update` 事件会流式发出部分结果（例如 bash 输出到达时）：

```json
{
  "type": "tool_execution_update",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "args": {"command": "ls -la"},
  "partialResult": {
    "content": [{"type": "text", "text": "partial output so far..."}],
    "details": {"truncation": null, "fullOutputPath": null}
  }
}
```

完成时：

```json
{
  "type": "tool_execution_end",
  "toolCallId": "call_abc123",
  "toolName": "bash",
  "result": {
    "content": [{"type": "text", "text": "total 48\n..."}],
    "details": {...}
  },
  "isError": false
}
```

用 `toolCallId` 关联事件。`tool_execution_update` 中的 `partialResult` 包含截至目前的累积输出（不只是 delta），因此客户端每次更新时直接替换显示即可。

### queue_update

待处理的转向或跟进队列发生变化时发出。

```json
{
  "type": "queue_update",
  "steering": ["Focus on error handling"],
  "followUp": ["After that, summarize the result"]
}
```

### compaction_start / compaction_end

压缩运行时发出，无论是手动还是自动。

```json
{"type": "compaction_start", "reason": "threshold"}
```

`reason` 字段为 `"manual"`、`"threshold"` 或 `"overflow"`。

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

如果 `reason` 是 `"overflow"` 且压缩成功，`willRetry` 为 `true`，agent 会自动重试该提示。

如果压缩被中止，`result` 为 `null`，`aborted` 为 `true`。

如果压缩失败（例如 API 配额用尽），`result` 为 `null`，`aborted` 为 `false`，`errorMessage` 包含错误描述。

### auto_retry_start / auto_retry_end

瞬时错误（过载、限流、5xx）触发自动重试时发出。

```json
{
  "type": "auto_retry_start",
  "attempt": 1,
  "maxAttempts": 3,
  "delayMs": 2000,
  "errorMessage": "529 {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"Overloaded\"}}"
}
```

```json
{
  "type": "auto_retry_end",
  "success": true,
  "attempt": 2
}
```

最终失败时（超过最大重试次数）：
```json
{
  "type": "auto_retry_end",
  "success": false,
  "attempt": 3,
  "finalError": "529 overloaded_error: Overloaded"
}
```

### summarization_retry_scheduled / summarization_retry_attempt_start / summarization_retry_finished

压缩或分支摘要在瞬时提供方错误后重试时发出。这些事件使用与自动助手回合重试相同的重试设置。

```json
{
  "type": "summarization_retry_scheduled",
  "attempt": 1,
  "maxAttempts": 3,
  "delayMs": 2000,
  "errorMessage": "terminated"
}
```

```json
{
  "type": "summarization_retry_attempt_start",
  "source": "compaction",
  "reason": "threshold"
}
```

对分支摘要，`source` 为 `"branchSummary"`，且没有 `reason`。

```json
{
  "type": "summarization_retry_finished"
}
```

### extension_error

扩展抛出错误时发出。

```json
{
  "type": "extension_error",
  "extensionPath": "/path/to/extension.ts",
  "event": "tool_call",
  "error": "Error message..."
}
```

## 扩展 UI 协议

扩展可以通过 `ctx.ui.select()`、`ctx.ui.confirm()` 等请求用户交互。在 RPC 模式中，这些调用会转成叠在基础命令/事件流之上的请求/响应子协议。

扩展 UI 方法分两类：

- **对话框方法**（`select`、`confirm`、`input`、`editor`）：在 stdout 上发出 `extension_ui_request`，并阻塞到客户端在 stdin 上发回带匹配 `id` 的 `extension_ui_response`。
- **即发即弃方法**（`notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text`）：在 stdout 上发出 `extension_ui_request`，但不期望响应。客户端可以展示这些信息，也可以忽略。

如果对话框方法带有 `timeout` 字段，超时后 agent 端会用默认值自动解析。客户端不必自己跟踪超时。

部分 `ExtensionUIContext` 方法在 RPC 模式中不受支持或会降级，因为它们需要直接访问 TUI：
- `custom()` 返回 `undefined`
- `setWorkingMessage()`、`setWorkingIndicator()`、`setFooter()`、`setHeader()`、`setEditorComponent()`、`setToolsExpanded()` 是空操作
- `getEditorText()` 返回 `""`
- `getToolsExpanded()` 返回 `false`
- `pasteToEditor()` 委托给 `setEditorText()`（没有粘贴/折叠处理）
- `getAllThemes()` 返回 `[]`
- `getTheme()` 返回 `undefined`
- `setTheme()` 返回 `{ success: false, error: "..." }`

说明：在 RPC 模式中，`ctx.mode` 为 `"rpc"`，`ctx.hasUI` 为 `true`，因为对话框和即发即弃方法可通过扩展 UI 子协议工作。要用 `ctx.mode === "tui"` 来保护需要真实终端的 TUI 专属功能，例如 `custom()`。

### 扩展 UI 请求（stdout）

所有请求都有 `type: "extension_ui_request"`、唯一的 `id`，以及 `method` 字段。

#### select

提示用户从列表中选择。带 `timeout` 字段的对话框方法会包含以毫秒计的超时；若客户端未及时响应，agent 会用 `undefined` 自动解析。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-1",
  "method": "select",
  "title": "Allow dangerous command?",
  "options": ["Allow", "Block"],
  "timeout": 10000
}
```

期望响应：`extension_ui_response`，带 `value`（所选选项字符串）或 `cancelled: true`。

#### confirm

提示用户做是/否确认。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-2",
  "method": "confirm",
  "title": "Clear session?",
  "message": "All messages will be lost.",
  "timeout": 5000
}
```

期望响应：`extension_ui_response`，带 `confirmed: true/false` 或 `cancelled: true`。

#### input

提示用户输入自由文本。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

期望响应：`extension_ui_response`，带 `value`（输入的文本）或 `cancelled: true`。

#### editor

打开多行文本编辑器，可带预填内容。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

期望响应：`extension_ui_response`，带 `value`（编辑后的文本）或 `cancelled: true`。

#### notify

显示一条通知。即发即弃，不期望响应。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` 字段为 `"info"`、`"warning"` 或 `"error"`。省略时默认为 `"info"`。

#### setStatus

设置或清除页脚/状态栏中的一条状态。即发即弃。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

发送 `statusText: undefined`（或省略该字段）即可清除该 key 对应的状态条目。

#### setWidget

设置或清除显示在编辑器上方或下方的 widget（文本行块）。即发即弃。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-7",
  "method": "setWidget",
  "widgetKey": "my-ext",
  "widgetLines": ["--- My Widget ---", "Line 1", "Line 2"],
  "widgetPlacement": "aboveEditor"
}
```

发送 `widgetLines: undefined`（或省略该字段）即可清除 widget。`widgetPlacement` 字段为 `"aboveEditor"`（默认）或 `"belowEditor"`。RPC 模式只支持字符串数组；组件工厂会被忽略。

#### setTitle

设置终端窗口/标签标题。即发即弃。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

#### set_editor_text

设置输入编辑器中的文本。即发即弃。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

### 扩展 UI 响应（stdin）

只有对话框方法（`select`、`confirm`、`input`、`editor`）需要发送响应。`id` 必须与请求匹配。

#### 值响应（select、input、editor）

```json
{"type": "extension_ui_response", "id": "uuid-1", "value": "Allow"}
```

#### 确认响应（confirm）

```json
{"type": "extension_ui_response", "id": "uuid-2", "confirmed": true}
```

#### 取消响应（任意对话框）

关闭任意对话框方法。扩展会收到 `undefined`（对 select/input/editor）或 `false`（对 confirm）。

```json
{"type": "extension_ui_response", "id": "uuid-3", "cancelled": true}
```

## 错误处理

失败的命令会返回 `success: false` 的响应：

```json
{
  "type": "response",
  "command": "set_model",
  "success": false,
  "error": "Model not found: invalid/model"
}
```

解析错误：

```json
{
  "type": "response",
  "command": "parse",
  "success": false,
  "error": "Failed to parse command: Unexpected token..."
}
```

## 类型

源文件：
- [`packages/ai/src/types.ts`](../../ai/src/types.ts) - `Model`、`UserMessage`、`AssistantMessage`、`ToolResultMessage`
- [`packages/agent/src/types.ts`](../../agent/src/types.ts) - `AgentMessage`、`AgentEvent`
- [`src/core/messages.ts`](../src/core/messages.ts) - `BashExecutionMessage`
- [`src/modes/json-event.ts`](../src/modes/json-event.ts) - `JsonAgentSessionEvent`
- [`src/modes/rpc/rpc-types.ts`](../src/modes/rpc/rpc-types.ts) - RPC 命令/响应类型，以及扩展 UI 请求/响应类型

### Model

```json
{
  "id": "claude-sonnet-4-20250514",
  "name": "Claude Sonnet 4",
  "api": "anthropic-messages",
  "provider": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "reasoning": true,
  "input": ["text", "image"],
  "contextWindow": 200000,
  "maxTokens": 16384,
  "cost": {
    "input": 3.0,
    "output": 15.0,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  }
}
```

### UserMessage

```json
{
  "role": "user",
  "content": "Hello!",
  "timestamp": 1733234567890,
  "attachments": []
}
```

`content` 字段可以是字符串，也可以是 `TextContent`/`ImageContent` 块数组。

### AssistantMessage

```json
{
  "role": "assistant",
  "content": [
    {"type": "text", "text": "Hello! How can I help?"},
    {"type": "thinking", "thinking": "User is greeting me..."},
    {"type": "toolCall", "id": "call_123", "name": "bash", "arguments": {"command": "ls"}}
  ],
  "api": "anthropic-messages",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "usage": {
    "input": 100,
    "output": 50,
    "cacheRead": 0,
    "cacheWrite": 0,
    "cost": {"input": 0.0003, "output": 0.00075, "cacheRead": 0, "cacheWrite": 0, "total": 0.00105}
  },
  "stopReason": "stop",
  "timestamp": 1733234567890
}
```

停止原因：`"stop"`、`"length"`、`"toolUse"`、`"error"`、`"aborted"`

### ToolResultMessage

```json
{
  "role": "toolResult",
  "toolCallId": "call_123",
  "toolName": "bash",
  "content": [{"type": "text", "text": "total 48\ndrwxr-xr-x ..."}],
  "usage": {
    "input": 100,
    "output": 50,
    "cacheRead": 0,
    "cacheWrite": 0,
    "totalTokens": 150,
    "cost": {"input": 0.0003, "output": 0.00075, "cacheRead": 0, "cacheWrite": 0, "total": 0.00105}
  },
  "isError": false,
  "timestamp": 1733234567890
}
```

`usage` 是可选的，报告工具内部完成的嵌套 LLM 工作。存在时会计入会话 token 和费用总量。

### BashExecutionMessage

由 `bash` RPC 命令创建（不是由 LLM 工具调用创建）：

```json
{
  "role": "bashExecution",
  "command": "ls -la",
  "output": "total 48\ndrwxr-xr-x ...",
  "exitCode": 0,
  "cancelled": false,
  "truncated": false,
  "fullOutputPath": null,
  "timestamp": 1733234567890
}
```

### Attachment

```json
{
  "id": "img1",
  "type": "image",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "content": "base64-encoded-data...",
  "extractedText": null,
  "preview": null
}
```

## 示例：基础客户端（Python）

```python
import subprocess
import json

proc = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True
)

def send(cmd):
    proc.stdin.write(json.dumps(cmd) + "\n")
    proc.stdin.flush()

def read_events():
    for line in proc.stdout:
        yield json.loads(line)

# Send prompt
send({"type": "prompt", "message": "Hello!"})

# Process events
for event in read_events():
    if event.get("type") == "message_update":
        delta = event.get("assistantMessageEvent", {})
        if delta.get("type") == "text_delta":
            print(delta["delta"], end="", flush=True)
    
    if event.get("type") == "agent_end":
        print()
        break
```

## 示例：交互式客户端（Node.js）

完整的交互式示例见 [`test/rpc-example.ts`](../test/rpc-example.ts)，带类型的客户端实现见 [`src/modes/rpc/rpc-client.ts`](../src/modes/rpc/rpc-client.ts)。

扩展 UI 协议的完整处理示例见 [`examples/rpc-extension-ui.ts`](../examples/rpc-extension-ui.ts)，它与 [`examples/extensions/rpc-demo.ts`](../examples/extensions/rpc-demo.ts) 扩展配对使用。

```javascript
const { spawn } = require("child_process");
const { StringDecoder } = require("string_decoder");

const agent = spawn("pi", ["--mode", "rpc", "--no-session"]);

function attachJsonlReader(stream, onLine) {
    const decoder = new StringDecoder("utf8");
    let buffer = "";

    stream.on("data", (chunk) => {
        buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);

        while (true) {
            const newlineIndex = buffer.indexOf("\n");
            if (newlineIndex === -1) break;

            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            onLine(line);
        }
    });

    stream.on("end", () => {
        buffer += decoder.end();
        if (buffer.length > 0) {
            onLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
        }
    });
}

attachJsonlReader(agent.stdout, (line) => {
    const event = JSON.parse(line);

    if (event.type === "message_update") {
        const { assistantMessageEvent } = event;
        if (assistantMessageEvent.type === "text_delta") {
            process.stdout.write(assistantMessageEvent.delta);
        }
    }
});

// Send prompt
agent.stdin.write(JSON.stringify({ type: "prompt", message: "Hello" }) + "\n");

// Abort on Ctrl+C
process.on("SIGINT", () => {
    agent.stdin.write(JSON.stringify({ type: "abort" }) + "\n");
});
```
