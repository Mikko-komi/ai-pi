> 本文为 [extensions.md](extensions.md) 的中文译本。

> 可以让 pi 创建扩展。请它按你的用例构建一个。

# 扩展

扩展是用来增强 pi 行为的 TypeScript 模块。它们可以订阅生命周期事件、注册供 LLM 调用的自定义工具、添加命令，以及更多能力。

> **`/reload` 的放置位置：** 把扩展放到 `~/.pi/agent/extensions/`（全局）或 `.pi/extensions/`（项目本地）以便自动发现。`pi -e ./path.ts` 只适合快速测试。放在自动发现位置的扩展可以用 `/reload` 热重载。

**核心能力：**
- **自定义工具** - 通过 `pi.registerTool()` 注册 LLM 可调用的工具
- **事件拦截** - 拦截或修改工具调用、注入上下文、自定义压缩
- **用户交互** - 通过 `ctx.ui` 提示用户（select、confirm、input、notify）
- **自定义 UI 组件** - 通过 `ctx.ui.custom()` 使用完整 TUI 组件并接收键盘输入，用于复杂交互
- **自定义命令** - 通过 `pi.registerCommand()` 注册如 `/mycommand` 的命令
- **会话持久化** - 通过 `pi.appendEntry()` 存储重启后仍保留的状态
- **自定义渲染** - 控制工具调用/结果以及消息在 TUI 中的显示方式

**示例用例：**
- 权限门禁（在 `rm -rf`、`sudo` 等操作前确认）
- Git 检查点（每轮 stash，分支切换时恢复）
- 路径保护（阻止写入 `.env`、`node_modules/`）
- 自定义压缩（按你的方式摘要对话）
- 对话摘要（见 `summarize.ts` 示例）
- 交互式工具（提问、向导、自定义对话框）
- 有状态工具（待办列表、连接池）
- 外部集成（文件监视、webhook、CI 触发）
- 等待时的小游戏（见 `snake.ts` 示例）

可运行的实现见 [examples/extensions/](../examples/extensions/)。

## 目录

- [快速开始](#快速开始)
- [扩展位置](#扩展位置)
- [可用导入](#可用导入)
- [编写扩展](#编写扩展)
  - [扩展结构](#扩展结构)
- [事件](#事件)
  - [生命周期概览](#生命周期概览)
  - [资源事件](#资源事件)
  - [会话事件](#会话事件)
  - [Agent 事件](#agent-事件)
  - [模型事件](#模型事件)
  - [工具事件](#工具事件)
- [ExtensionContext](#extensioncontext)
- [ExtensionCommandContext](#extensioncommandcontext)
- [ExtensionAPI 方法](#extensionapi-方法)
- [状态管理](#状态管理)
- [自定义工具](#自定义工具)
  - [动态加载工具](#动态加载工具)
- [自定义 UI](#自定义-ui)
- [错误处理](#错误处理)
- [模式行为](#模式行为)
- [示例参考](#示例参考)

## 快速开始

创建 `~/.pi/agent/extensions/my-extension.ts`：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // React to events
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Dangerous!", "Allow rm -rf?");
      if (!ok) return { block: true, reason: "Blocked by user" };
    }
  });

  // Register a custom tool
  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone by name",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });

  // Register a command
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || "world"}!`, "info");
    },
  });
}
```

用 `--extension`（或 `-e`）标志测试：

```bash
pi -e ./my-extension.ts
```

## 扩展位置

> **安全：** 扩展以你的完整系统权限运行，可以执行任意代码。只从你信任的来源安装。

扩展会从受信任位置自动发现。项目本地的 `.pi/extensions` 条目仅在项目被信任后才会加载。

| 位置 | 范围 |
|----------|-------|
| `~/.pi/agent/extensions/*.ts` | 全局（所有项目） |
| `~/.pi/agent/extensions/*/index.ts` | 全局（子目录） |
| `.pi/extensions/*.ts` | 项目本地 |
| `.pi/extensions/*/index.ts` | 项目本地（子目录） |

也可通过 `settings.json` 添加额外路径：

```json
{
  "packages": [
    "npm:@foo/bar@1.0.0",
    "git:github.com/user/repo@v1"
  ],
  "extensions": [
    "/path/to/local/extension.ts",
    "/path/to/local/extension/dir"
  ]
}
```

要通过 npm 或 git 把扩展作为 pi 软件包分享，见 [packages.zh.md](packages.zh.md)。

## 可用导入

| 包 | 用途 |
|---------|---------|
| `@earendil-works/pi-coding-agent` | 扩展类型（`ExtensionAPI`、`ExtensionContext`、事件） |
| `typebox` | 工具参数的 schema 定义 |
| `@earendil-works/pi-ai` | AI 工具（用于 Google 兼容枚举的 `StringEnum`） |
| `@earendil-works/pi-tui` | 自定义渲染用的 TUI 组件 |

npm 依赖也可以用。在扩展旁边（或某个父目录）添加 `package.json`，运行 `npm install` 后，来自 `node_modules/` 的导入会自动解析。

对于用 `pi install` 安装的已分发 pi 软件包（npm 或 git），运行时依赖必须写在 `dependencies` 中。软件包安装默认使用生产安装（`npm install --omit=dev`），因此运行时拿不到 `devDependencies`；配置了 `npmCommand` 时，git 软件包为兼容包装器会使用普通 `install`。

Node.js 内置模块（`node:fs`、`node:path` 等）也可使用。

## 编写扩展

扩展导出一个接收 `ExtensionAPI` 的默认工厂函数。工厂可以是同步或异步的：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Subscribe to events
  pi.on("event_name", async (event, ctx) => {
    // ctx.ui for user interaction
    const ok = await ctx.ui.confirm("Title", "Are you sure?");
    ctx.ui.notify("Done!", "info");
    ctx.ui.setStatus("my-ext", "Processing...");  // Footer status
    ctx.ui.setWidget("my-ext", ["Line 1", "Line 2"]);  // Widget above editor (default)
  });

  // Register tools, commands, shortcuts, flags
  pi.registerTool({ ... });
  pi.registerCommand("name", { ... });
  pi.registerShortcut("ctrl+x", { ... });
  pi.registerFlag("my-flag", { ... });
}
```

扩展通过 [jiti](https://github.com/unjs/jiti) 加载，因此 TypeScript 无需编译即可使用。

如果工厂返回 `Promise`，pi 会在继续启动前等待它。这意味着异步初始化会在 `session_start`、`resources_discover` 之前完成，也会在通过 `pi.registerProvider()` 排队的提供方注册被刷新之前完成。

### 异步工厂函数

对一次性启动工作使用异步工厂，例如拉取远程配置或动态发现可用模型。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default async function (pi: ExtensionAPI) {
  const response = await fetch("http://localhost:1234/v1/models");
  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      name?: string;
      context_window?: number;
      max_tokens?: number;
    }>;
  };

  pi.registerProvider("local-openai", {
    baseUrl: "http://localhost:1234/v1",
    apiKey: "$LOCAL_OPENAI_API_KEY",
    api: "openai-completions",
    models: payload.data.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.context_window ?? 128000,
      maxTokens: model.max_tokens ?? 4096,
    })),
  });
}
```

这种模式会让拉取到的模型在正常启动期间可用，也对 `pi --list-models` 可见。

### 长生命周期资源与关闭

扩展工厂可能运行在从未启动会话的调用中。不要从工厂启动后台资源，例如进程、套接字、文件监视器或定时器。

把后台资源的启动推迟到 `session_start`，或推迟到真正需要该资源的命令/工具/事件。注册一个幂等的 `session_shutdown` 处理函数，用来关闭你启动的任何会话范围资源。

### 扩展结构

**单文件** - 最简单，适合小型扩展：

```
~/.pi/agent/extensions/
└── my-extension.ts
```

**带 index.ts 的目录** - 适合多文件扩展：

```
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts        # Entry point (exports default function)
    ├── tools.ts        # Helper module
    └── utils.ts        # Helper module
```

**带依赖的软件包** - 适合需要 npm 包的扩展：

```
~/.pi/agent/extensions/
└── my-extension/
    ├── package.json    # Declares dependencies and entry points
    ├── package-lock.json
    ├── node_modules/   # After npm install
    └── src/
        └── index.ts
```

```json
// package.json
{
  "name": "my-extension",
  "dependencies": {
    "zod": "^3.0.0",
    "chalk": "^5.0.0"
  },
  "pi": {
    "extensions": ["./src/index.ts"]
  }
}
```

在扩展目录中运行 `npm install` 后，来自 `node_modules/` 的导入会自动生效。

## 事件

### 生命周期概览

```
pi 启动
  │
  ├─► project_trust (仅用户/全局与 CLI 扩展，在项目资源加载前)
  ├─► session_start { reason: "startup" }
  └─► resources_discover { reason: "startup" }
      │
      ▼
用户发送提示 ─────────────────────────────────────────┐
  │                                                        │
  ├─► (先检查扩展命令，若找到则绕过)  │
  ├─► input (可拦截、转换或自行处理)          │
  ├─► (若未处理则展开 skill/模板)            │
  ├─► before_agent_start (可注入消息、修改系统提示)
  ├─► agent_start                                          │
  ├─► message_start / message_update / message_end         │
  │                                                        │
  │   ┌─── turn（LLM 调用工具期间会重复）───┐       │
  │   │                                            │       │
  │   ├─► turn_start                               │       │
  │   ├─► context (可修改消息)            │       │
  │   ├─► before_provider_headers (可变更请求头)     |
  │   ├─► before_provider_request (可检查或替换 payload)
  │   ├─► after_provider_response (状态码 + 响应头，在消费流之前)
  │   │                                            │       │
  │   │   LLM 响应，可能调用工具：            │       │
  │   │     ├─► tool_execution_start               │       │
  │   │     ├─► tool_call (可拦截)              │       │
  │   │     ├─► tool_execution_update              │       │
  │   │     ├─► tool_result (可修改)           │       │
  │   │     └─► tool_execution_end                 │       │
  │   │                                            │       │
  │   └─► turn_end                                 │       │
  │                                                        │
  ├─► agent_end                                            │
  └─► agent_settled (没有剩余的重试/压缩/后续消息)   │
                                                           │
用户发送另一条提示 ◄────────────────────────────────┘

/new（新会话）或 /resume（切换会话）
  ├─► session_before_switch (可取消)
  ├─► session_shutdown
  ├─► session_start { reason: "new" | "resume", previousSessionFile? }
  └─► resources_discover { reason: "startup" }

/fork 或 /clone
  ├─► session_before_fork (可取消)
  ├─► session_shutdown
  ├─► session_start { reason: "fork", previousSessionFile }
  └─► resources_discover { reason: "startup" }

/name 或 pi.setSessionName()
  └─► session_info_changed

/compact 或自动压缩
  ├─► session_before_compact (可取消或自定义)
  ├─► session_compact (成功)
  └─► session_compact_failed (失败或中止)

/tree 导航
  ├─► session_before_tree (可取消或自定义)
  └─► session_tree

/model 或 Ctrl+P（模型选择/循环切换）
  ├─► thinking_level_select (若模型变更会改变/钳制思考级别)
  └─► model_select

思考级别变更（设置、快捷键、pi.setThinkingLevel()）
  └─► thinking_level_select

退出（Ctrl+C、Ctrl+D、SIGHUP、SIGTERM）
  └─► session_shutdown
```

### 启动事件

#### project_trust

在 pi 决定是否信任带有动态配置（`.pi` 或 `.agents/skills`）的项目之前触发。它在启动期间运行，以及在会话替换（例如 `/resume`）进入当前进程尚未解析信任的 cwd 时运行。只有用户/全局扩展和 CLI `-e` 扩展会参与；项目本地扩展要到信任解析完成后才会加载。

```typescript
pi.on("project_trust", async (event, ctx) => {
  // event.cwd - current working directory
  // ctx has a limited trust context: cwd, mode, hasUI, and select/confirm/input/notify UI helpers
  if (await ctx.ui.confirm("Trust project?", event.cwd)) {
    return { trusted: "yes", remember: true };
  }
  return { trusted: "undecided" };
});
```

`project_trust` 处理函数必须返回 `{ trusted: "yes" | "no" | "undecided" }`。返回 `"yes"` 或 `"no"` 的用户/全局或 CLI 扩展会拥有该决定；第一个 yes/no 决定生效，并抑制内置信任提示。使用 `remember: true` 可持久化 yes/no 决定；否则只对当前进程生效。返回 `"undecided"` 则让后续处理函数或内置信任流程来决定。提示前请检查 `ctx.hasUI`。如果没有处理函数返回 yes/no，则继续正常信任解析：先应用已保存的 `trust.json` 决定，然后由 `defaultProjectTrust` 控制 pi 是询问、默认信任，还是默认拒绝。

### 资源事件

#### resources_discover

在 `session_start` 之后触发，以便扩展贡献额外的 skill、提示词和主题路径。
启动路径使用 `reason: "startup"`。重载使用 `reason: "reload"`。

```typescript
pi.on("resources_discover", async (event, _ctx) => {
  // event.cwd - current working directory
  // event.reason - "startup" | "reload"
  return {
    skillPaths: ["/path/to/skills"],
    promptPaths: ["/path/to/prompts"],
    themePaths: ["/path/to/themes"],
  };
});
```

### 会话事件

会话存储内部机制和 SessionManager API 见 [会话格式](session-format.zh.md)。

#### session_start

在会话启动、加载或重载时触发。

```typescript
pi.on("session_start", async (event, ctx) => {
  // event.reason - "startup" | "reload" | "new" | "resume" | "fork"
  // event.previousSessionFile - present for "new", "resume", and "fork"
  ctx.ui.notify(`Session: ${ctx.sessionManager.getSessionFile() ?? "ephemeral"}`, "info");
});
```

#### session_info_changed

当当前会话显示名称通过 `/name`、RPC 或 `pi.setSessionName()` 设置时触发。

```typescript
pi.on("session_info_changed", async (event, ctx) => {
  // event.name - current normalized name, or undefined if cleared
  ctx.ui.notify(`Session renamed: ${event.name ?? "(none)"}`, "info");
});
```

#### session_before_switch

在开始新会话（`/new`）或切换会话（`/resume`）之前触发。

```typescript
pi.on("session_before_switch", async (event, ctx) => {
  // event.reason - "new" or "resume"
  // event.targetSessionFile - session we're switching to (only for "resume")

  if (event.reason === "new") {
    const ok = await ctx.ui.confirm("Clear?", "Delete all messages?");
    if (!ok) return { cancel: true };
  }
});
```

切换或新建会话成功后，pi 会为旧扩展实例发出 `session_shutdown`，为新会话重载并重新绑定扩展，然后发出带 `reason: "new" | "resume"` 和 `previousSessionFile` 的 `session_start`。
在 `session_shutdown` 中做清理，然后在 `session_start` 中重新建立内存状态。

#### session_before_fork

通过 `/fork` 分叉或通过 `/clone` 克隆时触发。

```typescript
pi.on("session_before_fork", async (event, ctx) => {
  // event.entryId - ID of the selected entry
  // event.position - "before" for /fork, "at" for /clone
  return { cancel: true }; // Cancel fork/clone
  // OR
  return { skipConversationRestore: true }; // Reserved for future conversation restore control
});
```

分叉或克隆成功后，pi 会为旧扩展实例发出 `session_shutdown`，为新会话重载并重新绑定扩展，然后发出带 `reason: "fork"` 和 `previousSessionFile` 的 `session_start`。
在 `session_shutdown` 中做清理，然后在 `session_start` 中重新建立内存状态。

#### session_before_compact / session_compact / session_compact_failed

在压缩时触发。细节见 [compaction.zh.md](compaction.zh.md)。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // reason - "manual" (/compact), "threshold", or "overflow"
  // willRetry - whether the aborted turn is retried after compaction (overflow recovery)

  // Cancel:
  return { cancel: true };

  // Custom summary:
  return {
    compaction: {
      summary: "...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // Optional; included in session totals
    }
  };
});

pi.on("session_compact", async (event, ctx) => {
  // event.compactionEntry - the saved compaction
  // event.fromExtension - whether extension provided it
  // event.reason - "manual" (/compact), "threshold", or "overflow"
  // event.willRetry - whether the aborted turn is retried after compaction (overflow recovery)
});

pi.on("session_compact_failed", async (event, ctx) => {
  // event.reason - "manual" (/compact), "threshold", or "overflow"
  // event.errorMessage - present for non-abort failures
  // event.aborted - true for cancelled/aborted compactions
  // event.willRetry - whether the aborted turn would have retried after compaction
  // event.fromExtension - whether extension-provided compaction content was being used
});
```

#### session_before_tree / session_tree

在 `/tree` 导航时触发。树导航概念见 [会话](sessions.zh.md)。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;
  return { cancel: true };
  // OR provide custom summary:
  return {
    summary: {
      summary: "...",
      // usage: summaryResponse.usage, // Optional; included in session totals
      details: {},
    },
  };
});

pi.on("session_tree", async (event, ctx) => {
  // event.newLeafId, oldLeafId, summaryEntry, fromExtension
});
```

#### session_shutdown

在已启动的会话运行时被拆除之前触发。用它清理从 `session_start` 或其他会话范围钩子打开的资源。

```typescript
pi.on("session_shutdown", async (event, ctx) => {
  // event.reason - "quit" | "reload" | "new" | "resume" | "fork"
  // event.targetSessionFile - destination session for session replacement flows
  // Cleanup, save state, etc.
});
```

### Agent 事件

#### before_agent_start

用户提交提示之后、agent 循环之前触发。可以注入一条消息，和/或修改系统提示。

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  // event.prompt - user's prompt text
  // event.images - attached images (if any)
  // event.systemPrompt - current chained system prompt for this handler
  //   (includes changes from earlier before_agent_start handlers)
  // event.systemPromptOptions - structured options used to build the system prompt
  //   .customPrompt - any custom system prompt (from --system-prompt, SYSTEM.md, or custom templates)
  //   .selectedTools - tools currently active in the prompt
  //   .toolSnippets - one-line descriptions for each tool
  //   .promptGuidelines - custom guideline bullets
  //   .appendSystemPrompt - text from --append-system-prompt flags
  //   .cwd - working directory
  //   .contextFiles - AGENTS.md files and other loaded context files
  //   .skills - loaded skills

  return {
    // Inject a persistent message (stored in session, sent to LLM)
    message: {
      customType: "my-extension",
      content: "Additional context for the LLM",
      display: true,
    },
    // Replace the system prompt for this turn (chained across extensions)
    systemPrompt: event.systemPrompt + "\n\nExtra instructions for this turn...",
  };
});
```

`systemPromptOptions` 字段让扩展能访问 Pi 用来构建系统提示的同一套结构化数据。这样你可以检查 Pi 已经加载了什么——自定义提示、指南、工具摘要、上下文文件、skills——而不必重新发现资源或重新解析标志。当你的扩展需要在尊重用户配置的同时，对系统提示做深入、知情的修改时使用它。

在 `before_agent_start` 内部，`event.systemPrompt` 和 `ctx.getSystemPrompt()` 都反映截至当前处理函数的链式系统提示。后续的 `before_agent_start` 处理函数仍可以再次修改它。

#### agent_start / agent_end / agent_settled

`agent_start` 在底层 agent 运行开始时触发。`agent_end` 在该次运行结束时触发，但 Pi 仍可能自动重试、自动压缩并重试，或继续处理排队的后续消息。状态集成若需要知道 Pi 不会再自动继续运行，请使用 `agent_settled`。

```typescript
pi.on("agent_start", async (_event, ctx) => {});

pi.on("agent_end", async (event, ctx) => {
  // event.messages - messages from this low-level run
});

pi.on("agent_settled", async (_event, ctx) => {
  // ctx.isIdle() is true here unless another extension started a new run.
});
```

#### ui_prompt_start / ui_prompt_end

面向用户的阻塞式扩展 UI 提示的仅通知生命周期事件。它们环绕 `ctx.ui.select()`、`ctx.ui.confirm()`、`ctx.ui.input()`、`ctx.ui.editor()` 和 `ctx.ui.custom()` 触发，以便宿主/状态集成可以报告“等待用户”，而不仅仅是“运行中”。

嵌套或重叠的提示会合并为一段外层等待区间。处理函数按尽力而为调用，在显示或关闭提示前不会等待它们。

```typescript
pi.on("ui_prompt_start", async (event, ctx) => {
  // event.reason === "ui_prompt"
  // event.kind: "select" | "confirm" | "input" | "editor" | "custom"
  // event.title: prompt title when available
});

pi.on("ui_prompt_end", async (event, ctx) => {
  // Pi is no longer waiting on that UI prompt span.
});
```

#### turn_start / turn_end

每个 turn（一次 LLM 响应 + 工具调用）都会触发。

```typescript
pi.on("turn_start", async (event, ctx) => {
  // event.turnIndex, event.timestamp
});

pi.on("turn_end", async (event, ctx) => {
  // event.turnIndex, event.message, event.toolResults
});
```

#### message_start / message_update / message_end

在消息生命周期更新时触发。

- `message_start` 和 `message_end` 对 user、assistant 和 toolResult 消息触发。
- `message_update` 对 assistant 流式更新触发。
- `message_end` 处理函数可以返回 `{ message }` 来替换已定稿的消息。替换必须保持相同的 `role`。

```typescript
pi.on("message_start", async (event, ctx) => {
  // event.message
});

pi.on("message_update", async (event, ctx) => {
  // event.message
  // event.assistantMessageEvent (token-by-token stream event)
});

pi.on("message_end", async (event, ctx) => {
  if (event.message.role !== "assistant") return;

  return {
    message: {
      ...event.message,
      usage: {
        ...event.message.usage,
        cost: {
          ...event.message.usage.cost,
          total: 0.123,
        },
      },
    },
  };
});
```

#### tool_execution_start / tool_execution_update / tool_execution_end

在工具执行生命周期更新时触发。

在并行工具模式下：
- `tool_execution_start` 在预检阶段按 assistant 源顺序发出
- `tool_execution_update` 事件可能在多个工具之间交错
- `tool_execution_end` 在每个工具定稿后按完成顺序发出
- 最终的 `toolResult` 消息事件仍稍后按 assistant 源顺序发出

```typescript
pi.on("tool_execution_start", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args
});

pi.on("tool_execution_update", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.args, event.partialResult
});

pi.on("tool_execution_end", async (event, ctx) => {
  // event.toolCallId, event.toolName, event.result, event.isError
});
```

#### context

每次 LLM 调用之前触发。以非破坏性方式修改消息。消息类型见 [会话格式](session-format.zh.md)。

```typescript
pi.on("context", async (event, ctx) => {
  // event.messages - deep copy, safe to modify
  const filtered = event.messages.filter(m => !shouldPrune(m));
  return { messages: filtered };
});
```

#### before_provider_headers

在出站 HTTP 请求头组装完成后触发。用它添加、覆盖或删除请求头。

处理函数就地修改 `event.headers`。把某个键设为字符串即可添加或覆盖，设为 `null` 则删除。

```typescript
pi.on("before_provider_headers", (event, ctx) => {
  // Add or override — e.g. a session id for gateway tracing/attribution
  event.headers["x-session-id"] = ctx.sessionManager.getSessionId();

  // Drop a tracking header pi adds for this call
  event.headers["X-OpenRouter-Title"] = null;
});
```

每个提供方请求运行一次；重试会复用同一组请求头，而不会再次触发该钩子。

#### before_provider_request

在特定于提供方的 payload 构建完成后、请求即将发送之前触发。处理函数按扩展加载顺序运行。返回 `undefined` 则保持 payload 不变。返回任何其他值都会替换后续处理函数以及实际请求使用的 payload。

该钩子可以改写提供方级别的系统指令，或将其完全移除。这些 payload 级别的变更不会反映到 `ctx.getSystemPrompt()` 中，后者报告的是 Pi 的系统提示字符串，而不是最终序列化后的提供方 payload。

```typescript
pi.on("before_provider_request", (event, ctx) => {
  console.log(JSON.stringify(event.payload, null, 2));

  // Optional: replace payload
  // return { ...event.payload, temperature: 0 };
});
```

这主要用于调试提供方序列化和缓存行为。

#### after_provider_response

在收到 HTTP 响应之后、消费其流式响应体之前触发。处理函数按扩展加载顺序运行。

```typescript
pi.on("after_provider_response", (event, ctx) => {
  // event.status - HTTP status code
  // event.headers - normalized response headers
  if (event.status === 429) {
    console.log("rate limited", event.headers["retry-after"]);
  }
});
```

响应头的可用性取决于提供方和传输层。抽象了 HTTP 响应的提供方可能不会暴露响应头。

### 模型事件

#### model_select

当模型通过 `/model` 命令、模型循环切换（`Ctrl+P`）或会话恢复而改变时触发。

```typescript
pi.on("model_select", async (event, ctx) => {
  // event.model - newly selected model
  // event.previousModel - previous model (undefined if first selection)
  // event.source - "set" | "cycle" | "restore"

  const prev = event.previousModel
    ? `${event.previousModel.provider}/${event.previousModel.id}`
    : "none";
  const next = `${event.model.provider}/${event.model.id}`;

  ctx.ui.notify(`Model changed (${event.source}): ${prev} -> ${next}`, "info");
});
```

当活动模型变化时，用它更新 UI 元素（状态栏、页脚）或执行特定于模型的初始化。

#### thinking_level_select

思考级别变更时触发。这是仅通知事件；处理函数的返回值会被忽略。

```typescript
pi.on("thinking_level_select", async (event, ctx) => {
  // event.level - newly selected thinking level
  // event.previousLevel - previous thinking level

  ctx.ui.setStatus("thinking", `thinking: ${event.level}`);
});
```

当 `pi.setThinkingLevel()`、模型变更或内置思考级别控件改变当前思考级别时，用它更新扩展 UI。

### 工具事件

#### tool_call

在 `tool_execution_start` 之后、工具执行之前触发。**可以拦截。** 使用 `isToolCallEventType` 收窄类型并获得带类型的输入。

在 `tool_call` 运行之前，pi 会等待先前发出的 Agent 事件通过 `AgentSession` 排空。这意味着 `ctx.sessionManager` 已更新到当前 assistant 工具调用消息。

在默认的并行工具执行模式下，同一条 assistant 消息中的兄弟工具调用会按顺序预检，然后并发执行。不保证 `tool_call` 能在 `ctx.sessionManager` 中看到同一条 assistant 消息里兄弟工具的结果。

`event.input` 是可变的。就地修改它可以在执行前修补工具参数。

行为保证：
- 对 `event.input` 的修改会影响实际工具执行
- 后续 `tool_call` 处理函数能看到先前处理函数所做的修改
- 你的修改之后不会重新校验
- `tool_call` 的返回值通过 `{ block: true, reason?: string, terminate?: boolean }` 控制拦截
- `terminate` 仅适用于被拦截的调用；只有当该批次中每个已定稿结果都是 terminating 时，agent 才会提前停止

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  // event.toolName - "bash", "read", "write", "edit", etc.
  // event.toolCallId
  // event.input - tool parameters (mutable)

  // Built-in tools: no type params needed
  if (isToolCallEventType("bash", event)) {
    // event.input is { command: string; timeout?: number }
    event.input.command = `source ~/.profile\n${event.input.command}`;

    if (event.input.command.includes("rm -rf")) {
      return { block: true, reason: "Dangerous command", terminate: true };
    }
  }

  if (isToolCallEventType("read", event)) {
    // event.input is { path: string; offset?: number; limit?: number }
    console.log(`Reading: ${event.input.path}`);
  }
});
```

#### 为自定义工具输入添加类型

自定义工具应导出其输入类型：

```typescript
// my-extension.ts
export type MyToolInput = Static<typeof myToolSchema>;
```

对 `isToolCallEventType` 使用显式类型参数：

```typescript
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import type { MyToolInput } from "my-extension";

pi.on("tool_call", (event) => {
  if (isToolCallEventType<"my_tool", MyToolInput>("my_tool", event)) {
    event.input.action;  // typed
  }
});
```

#### tool_result

在工具执行完成后、`tool_execution_end` 以及最终工具结果消息事件发出之前触发。**可以修改结果。**

在并行工具模式下，`tool_result` 和 `tool_execution_end` 可能按工具完成顺序交错，而最终的 `toolResult` 消息事件仍稍后按 assistant 源顺序发出。

`tool_result` 处理函数像中间件一样链式运行：
- 处理函数按扩展加载顺序运行
- 每个处理函数看到的是先前处理函数变更后的最新结果
- 处理函数可以返回部分补丁（`content`、`details`、`isError` 或 `usage`）；省略的字段保留当前值

在处理函数内部对嵌套异步工作使用 `ctx.signal`。这样 Esc 可以取消模型调用、`fetch()` 以及扩展启动的其他可中止操作。

```typescript
import { isBashToolResult } from "@earendil-works/pi-coding-agent";

pi.on("tool_result", async (event, ctx) => {
  // event.toolName, event.toolCallId, event.input
  // event.content, event.details, event.isError, event.usage

  if (isBashToolResult(event)) {
    // event.details is typed as BashToolDetails
  }

  const response = await fetch("https://example.com/summarize", {
    method: "POST",
    body: JSON.stringify({ content: event.content }),
    signal: ctx.signal,
  });

  // Modify result:
  return { content: [...], details: {...}, isError: false, usage: nestedModelUsage };
});
```

### 用户 Bash 事件

#### user_bash

用户执行 `!` 或 `!!` 命令时触发。**可以拦截。**

```typescript
import { createLocalBashOperations } from "@earendil-works/pi-coding-agent";

pi.on("user_bash", (event, ctx) => {
  // event.command - the bash command
  // event.excludeFromContext - true if !! prefix
  // event.cwd - working directory

  // Option 1: Provide custom operations (e.g., SSH)
  return { operations: remoteBashOps };

  // Option 2: Wrap pi's built-in local bash backend
  const local = createLocalBashOperations();
  return {
    operations: {
      exec(command, cwd, options) {
        return local.exec(`source ~/.profile\n${command}`, cwd, options);
      }
    }
  };

  // Option 3: Full replacement - return result directly
  return { result: { output: "...", exitCode: 0, cancelled: false, truncated: false } };
});
```

### 输入事件

#### input

在收到用户输入时触发，发生在扩展命令检查之后、skill 和模板展开之前。该事件看到的是原始输入文本，因此 `/skill:foo` 和 `/template` 此时尚未展开。

**处理顺序：**
1. 先检查扩展命令（`/cmd`）——若找到，则运行处理函数并跳过 input 事件
2. 触发 `input` 事件——可以拦截、转换或自行处理
3. 若未处理：skill 命令（`/skill:name`）展开为 skill 内容
4. 若未处理：提示词模板（`/template`）展开为模板内容
5. 开始 agent 处理（`before_agent_start` 等）

```typescript
pi.on("input", async (event, ctx) => {
  // event.text - raw input (before skill/template expansion)
  // event.images - attached images, if any
  // event.source - "interactive" (typed), "rpc" (API), or "extension" (via sendUserMessage)
  // event.streamingBehavior - "steer" | "followUp" | undefined
  //   undefined when idle, "steer" for mid-stream interrupts,
  //   "followUp" for messages queued until the agent finishes

  // Transform: rewrite input before expansion
  if (event.text.startsWith("?quick "))
    return { action: "transform", text: `Respond briefly: ${event.text.slice(7)}` };

  // Handle: respond without LLM (extension shows its own feedback)
  if (event.text === "ping") {
    ctx.ui.notify("pong", "info");
    return { action: "handled" };
  }

  // Route by source: skip processing for extension-injected messages
  if (event.source === "extension") return { action: "continue" };

  // Intercept skill commands before expansion
  if (event.text.startsWith("/skill:")) {
    // Could transform, block, or let pass through
  }

  return { action: "continue" };  // Default: pass through to expansion
});
```

**结果：**
- `continue` - 原样放行（处理函数未返回任何内容时的默认值）
- `transform` - 修改文本/图片，然后继续到展开阶段
- `handled` - 完全跳过 agent（第一个返回该值的处理函数生效）

转换会在多个处理函数之间链式进行。面向 `streamingBehavior` 的路由见 [input-transform.ts](../examples/extensions/input-transform.ts) 和 [input-transform-streaming.ts](../examples/extensions/input-transform-streaming.ts)。

## ExtensionContext

所有处理函数都会收到 `ctx: ExtensionContext`。

### ctx.ui

用于用户交互的 UI 方法。完整细节见 [自定义 UI](#自定义-ui)。

### ctx.mode

当前运行模式：`"tui"`、`"rpc"`、`"json"` 或 `"print"`。用 `ctx.mode === "tui"` 保护仅终端功能，例如 `custom()`、组件工厂、终端输入和直接 TUI 渲染。

### ctx.hasUI

在 TUI 和 RPC 模式下为 `true`。在 print 模式（`-p`）和 JSON 模式下为 `false`。用它保护对话框方法（`select`、`confirm`、`input`、`editor`）以及在 TUI 和 RPC 模式下都可用的即发即弃方法（`notify`、`setStatus`、`setWidget`、`setTitle`、`setEditorText`）。在 RPC 模式下，部分 TUI 专用方法是空操作或返回默认值（见 [rpc.zh.md](rpc.zh.md#extension-ui-protocol)）。

### ctx.cwd

当前工作目录。

构造项目本地配置路径时，使用 `CONFIG_DIR_NAME`，不要硬编码 `.pi`。重新品牌化的发行版可能使用不同的配置目录名。

```typescript
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const projectConfigPath = join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json");
    // ...
  });
}
```

### ctx.isProjectTrusted()

返回当前会话上下文中项目本地信任是否处于活动状态。这包括临时信任决定和 CLI 信任覆盖，而不仅仅是全局信任存储中已保存的决定。

在读取只应在受信任项目中生效的项目本地扩展配置之前，使用此方法。

### ctx.sessionManager

对会话状态的只读访问。完整 SessionManager API 和条目类型见 [会话格式](session-format.zh.md)。

对于 `tool_call`，该状态在处理函数运行前已同步到当前 assistant 消息。在并行工具执行模式下，仍不保证包含同一条 assistant 消息中兄弟工具的结果。

```typescript
ctx.sessionManager.getEntries()             // All entries
ctx.sessionManager.getBranch()              // Current branch
ctx.sessionManager.buildContextEntries()    // Active branch entries with compaction applied
ctx.sessionManager.getLeafId()              // Current leaf entry ID
```

### ctx.modelRegistry / ctx.model / ctx.thinkingLevel / ctx.scopedModels

访问模型、提供方和已解析的鉴权。`ctx.modelRegistry.getProvider(id)` 返回有效的 pi-ai 提供方，而 `getProviderAuth(id)` 会解析其当前 API 密钥、请求头、base URL 以及提供方范围的环境，无需已加载的模型。`ctx.model` 是活动模型，`ctx.thinkingLevel` 是其当前有效思考级别。

`ctx.scopedModels` 是限定到当前会话的只读模型列表——与 `/scoped-models` 命令显示的集合相同。它在会话启动时根据 `--models` CLI 标志和 `enabledModels` 设置解析（用 minimatch 对照可用目录匹配 `provider/modelId` 或裸 `modelId`）。未配置范围时为空，表示所有可用模型都可使用。每项是 `{ model, thinkingLevel? }`，只有当某个模式固定了思考级别时才会设置 `thinkingLevel`（例如 `anthropic/*:high`）。用它填充与内置选择器镜像的模型选择器，而不是通过 `ctx.modelRegistry.getAvailable()` 枚举整个目录。

#### 流式模型调用

对 `reasoning` 这类与提供方无关的选项使用 `ctx.modelRegistry.streamSimple(model, context, options)`；对特定于 API 的选项使用 `stream()`。两者都使用已配置的提供方并解析鉴权，包括通过 `pi.registerProvider()` 注册的提供方。请使用这些方法，而不是 `pi-ai/compat` 的流式函数，后者看不到扩展注册的提供方。

两者都返回 `AssistantMessageEventStream`。迭代它可获得响应事件，await `.result()` 可获得最终消息。设置失败会产生错误事件和错误结果。

### ctx.signal

当前 agent 中止信号；没有活动 agent turn 时为 `undefined`。

用于扩展处理函数启动的可中止嵌套工作，例如：
- `fetch(..., { signal: ctx.signal })`
- 接受 `signal` 的模型调用
- 接受 `AbortSignal` 的文件或进程辅助函数

`ctx.signal` 通常在活动 turn 事件中有定义，例如 `tool_call`、`tool_result`、`message_update` 和 `turn_end`。
在空闲或非 turn 上下文中通常为 `undefined`，例如会话事件、扩展命令，以及 pi 空闲时触发的快捷键。

```typescript
pi.on("tool_result", async (event, ctx) => {
  const response = await fetch("https://example.com/api", {
    method: "POST",
    body: JSON.stringify(event),
    signal: ctx.signal,
  });

  const data = await response.json();
  return { details: data };
});
```

### ctx.isIdle() / ctx.abort() / ctx.hasPendingMessages()

控制流辅助方法。当 Pi 正在处理 agent 运行、自动重试、自动压缩重试或排队的后续操作时，`ctx.isIdle()` 为 false。

### ctx.shutdown()

请求优雅关闭 pi。

- **交互模式：** 推迟到 agent 变为空闲（处理完所有排队的转向和后续消息之后）。
- **RPC 模式：** 推迟到下一个空闲状态（完成当前命令响应后，等待下一条命令时）。
- **Print 模式：** 空操作。所有提示处理完后进程会自动退出。

退出前会向所有扩展发出 `session_shutdown` 事件。在所有上下文中都可用（事件处理函数、工具、命令、快捷键）。

```typescript
pi.on("tool_call", (event, ctx) => {
  if (isFatal(event.input)) {
    ctx.shutdown();
  }
});
```

### ctx.getContextUsage()

返回当前活动模型的上下文用量。优先使用最近一次 assistant usage，然后估算尾随消息的 token。

```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) {
  // ...
}
```

### ctx.compact()

触发压缩，不等待完成。用 `onComplete` 和 `onError` 做后续动作。

```typescript
ctx.compact({
  customInstructions: "Focus on recent changes",
  onComplete: (result) => {
    ctx.ui.notify("Compaction completed", "info");
  },
  onError: (error) => {
    ctx.ui.notify(`Compaction failed: ${error.message}`, "error");
  },
});
```

### ctx.getSystemPrompt()

返回 Pi 当前的系统提示字符串。

- 在 `before_agent_start` 期间，它反映当前 turn 到目前为止已链式应用的系统提示变更。
- 它不包含后续的 `context` 消息变更。
- 它不包含 `before_provider_request` 的 payload 改写。
- 如果后加载的扩展在你之后运行，它们仍可能改变最终发送的内容。

```typescript
pi.on("before_agent_start", (event, ctx) => {
  const prompt = ctx.getSystemPrompt();
  console.log(`System prompt length: ${prompt.length}`);
});
```

## ExtensionCommandContext

命令处理函数收到的是 `ExtensionCommandContext`，它在 `ExtensionContext` 之上扩展了会话控制方法。这些方法只在命令中可用，因为从事件处理函数调用它们可能导致死锁。

### ctx.getSystemPromptOptions()

返回 Pi 当前用来构建系统提示的基础输入。

```typescript
const options = ctx.getSystemPromptOptions();
const contextPaths = options.contextFiles?.map((file) => file.path) ?? [];
```

其形状和可变性与 `before_agent_start` 的 `event.systemPromptOptions` 相同：自定义提示、活动工具、工具摘要、提示指南、追加的系统提示文本、cwd、已加载的上下文文件和已加载的 skills。它可能包含完整的上下文文件内容，因此应将其视为敏感的扩展本地数据，避免通过命令列表、日志或自动补全元数据暴露。

这报告的是当前基础提示输入。它不包含每 turn 的 `before_agent_start` 链式系统提示变更、后续 `context` 事件的消息变更，也不包含 `before_provider_request` 的 payload 改写。

### ctx.waitForIdle()

等待 agent 完全稳定，包括自动重试、自动压缩重试和排队的后续操作：

```typescript
pi.registerCommand("my-cmd", {
  handler: async (args, ctx) => {
    await ctx.waitForIdle();
    // Agent is now idle, safe to modify session
  },
});
```

### ctx.newSession(options?)

创建新会话：

```typescript
const parentSession = ctx.sessionManager.getSessionFile();
const kickoff = "Continue in the replacement session";

const result = await ctx.newSession({
  parentSession,
  setup: async (sm) => {
    sm.appendMessage({
      role: "user",
      content: [{ type: "text", text: "Context from previous session..." }],
      timestamp: Date.now(),
    });
  },
  withSession: async (ctx) => {
    // Use only the replacement-session ctx here.
    await ctx.sendUserMessage(kickoff);
  },
});

if (result.cancelled) {
  // An extension cancelled the new session
}
```

选项：
- `parentSession`：记录到新会话头中的父会话文件
- `setup`：在 `withSession` 运行前修改新会话的 `SessionManager`
- `withSession`：针对全新的替换会话上下文运行切换后工作。不要使用捕获的旧 `pi` / 命令 `ctx`；见 [会话替换生命周期与易错点](#会话替换生命周期与易错点)。

### ctx.fork(entryId, options?)

从特定条目分叉，创建新的会话文件：

```typescript
const result = await ctx.fork("entry-id-123", {
  withSession: async (ctx) => {
    // Use only the replacement-session ctx here.
    ctx.ui.notify("Now in the forked session", "info");
  },
});
if (result.cancelled) {
  // An extension cancelled the fork
}

const cloneResult = await ctx.fork("entry-id-456", { position: "at" });
if (cloneResult.cancelled) {
  // An extension cancelled the clone
}
```

选项：
- `position`：`"before"`（默认）在选定的用户消息之前分叉，并把该提示恢复到编辑器中
- `position`：`"at"` 复制经过选定条目的活动路径，不恢复编辑器文本
- `withSession`：针对全新的替换会话上下文运行切换后工作。不要使用捕获的旧 `pi` / 命令 `ctx`；见 [会话替换生命周期与易错点](#会话替换生命周期与易错点)。

### ctx.navigateTree(targetId, options?)

导航到会话树中的不同位置。当 agent 响应、手动或自动压缩、或其他树导航正在进行时会拒绝，即使 `summarize: false` 也是如此。这些冲突会保持活动分支不变，并拒绝该 promise，而不是返回 `{ cancelled: true }`。等待当前操作完成（例如在命令处理函数中 `await ctx.waitForIdle()`）然后重试：

```typescript
const result = await ctx.navigateTree("entry-id-456", {
  summarize: true,
  customInstructions: "Focus on error handling changes",
  replaceInstructions: false, // true = replace default prompt entirely
  label: "review-checkpoint",
});
```

选项：
- `summarize`：是否为被放弃的分支生成摘要
- `customInstructions`：给摘要器的自定义指令
- `replaceInstructions`：若为 true，`customInstructions` 会完全替换默认提示，而不是追加
- `label`：附加到分支摘要条目的标签（若不做摘要则附加到目标条目）

### ctx.switchSession(sessionPath, options?)

切换到另一个会话文件：

```typescript
const result = await ctx.switchSession("/path/to/session.jsonl", {
  withSession: async (ctx) => {
    await ctx.sendUserMessage("Resume work in the replacement session");
  },
});
if (result.cancelled) {
  // An extension cancelled the switch via session_before_switch
}
```

选项：
- `withSession`：针对全新的替换会话上下文运行切换后工作。不要使用捕获的旧 `pi` / 命令 `ctx`；见 [会话替换生命周期与易错点](#会话替换生命周期与易错点)。

要发现可用会话，使用静态的 `SessionManager.list()` 或 `SessionManager.listAll()` 方法：

```typescript
import { SessionManager } from "@earendil-works/pi-coding-agent";

pi.registerCommand("switch", {
  description: "Switch to another session",
  handler: async (args, ctx) => {
    const sessions = await SessionManager.list(ctx.cwd);
    if (sessions.length === 0) return;
    const choice = await ctx.ui.select(
      "Pick session:",
      sessions.map(s => s.file),
    );
    if (choice) {
      await ctx.switchSession(choice, {
        withSession: async (ctx) => {
          ctx.ui.notify("Switched session", "info");
        },
      });
    }
  },
});
```

### 会话替换生命周期与易错点

`withSession` 收到的是全新的 `ReplacedSessionContext`，它在 `ExtensionCommandContext` 之上扩展了绑定到替换会话的异步 `sendMessage()` 和 `sendUserMessage()` 辅助方法。

生命周期与易错点：
- `withSession` 仅在旧会话已发出 `session_shutdown`、旧运行时已拆除、替换会话已重新绑定、且新扩展实例已收到 `session_start` 之后运行。
- 回调仍在原始闭包中执行，而不是在新扩展实例内部。这意味着你的旧扩展实例可能已经在 `withSession` 开始前完成了关闭清理。
- 捕获的旧 `pi` / 旧命令 `ctx` 的会话绑定对象在替换后会过期，使用时会抛错。会话绑定工作只使用传给 `withSession` 的 `ctx`。
- 先前取出的原始对象仍由你负责。例如，如果在替换前捕获 `const sm = ctx.sessionManager`，`sm` 仍是旧的 `SessionManager` 对象。替换后不要复用它。
- `withSession` 中的代码应假定被你的 `session_shutdown` 处理函数失效的任何状态都已经消失。只捕获能干净地在关闭后存活的普通数据，例如字符串、id 和序列化配置。

安全模式：

```typescript
pi.registerCommand("handoff", {
  handler: async (_args, ctx) => {
    const kickoff = "Continue from the replacement session";
    await ctx.newSession({
      withSession: async (ctx) => {
        await ctx.sendUserMessage(kickoff);
      },
    });
  },
});
```

不安全模式：

```typescript
pi.registerCommand("handoff", {
  handler: async (_args, ctx) => {
    const oldSessionManager = ctx.sessionManager;
    await ctx.newSession({
      withSession: async (_ctx) => {
        // stale old objects: do not do this
        oldSessionManager.getSessionFile();
        pi.sendUserMessage("wrong");
      },
    });
  },
});
```

### ctx.reload()

运行与 `/reload` 相同的重载流程。

```typescript
pi.registerCommand("reload-runtime", {
  description: "Reload extensions, skills, prompts, themes, and context files",
  handler: async (_args, ctx) => {
    await ctx.reload();
    return;
  },
});
```

重要行为：
- `await ctx.reload()` 会为当前扩展运行时发出 `session_shutdown`
- 然后重载资源，并发出 `reason: "reload"` 的 `session_start`，以及 reason 为 `"reload"` 的 `resources_discover`
- 当前正在运行的命令处理函数仍在旧调用帧中继续
- `await ctx.reload()` 之后的代码仍来自重载前的版本
- `await ctx.reload()` 之后的代码不得假定旧的内存扩展状态仍然有效
- 处理函数返回后，未来的命令/事件/工具调用会使用新的扩展版本

为了行为可预测，把重载视为该处理函数的终点（`await ctx.reload(); return;`）。

工具运行时使用的是 `ExtensionContext`，因此不能直接调用 `ctx.reload()`。用命令作为重载入口，然后暴露一个工具，把该命令作为后续用户消息排队。

LLM 可调用以触发重载的示例工具：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("reload-runtime", {
    description: "Reload extensions, skills, prompts, themes, and context files",
    handler: async (_args, ctx) => {
      await ctx.reload();
      return;
    },
  });

  pi.registerTool({
    name: "reload_runtime",
    label: "Reload Runtime",
    description: "Reload extensions, skills, prompts, themes, and context files",
    parameters: Type.Object({}),
    async execute() {
      pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
      return {
        content: [{ type: "text", text: "Queued /reload-runtime as a follow-up command." }],
      };
    },
  });
}
```

## ExtensionAPI 方法

### pi.on(event, handler)

订阅事件。事件类型和返回值见 [事件](#事件)。

### pi.registerTool(definition)

注册一个可供 LLM 调用的自定义工具。完整细节见 [自定义工具](#自定义工具)。

`pi.registerTool()` 在扩展加载期间和启动之后都可以使用。你可以在 `session_start`、命令处理函数或其他事件处理函数中调用它。新工具会在同一会话中立即刷新，因此会出现在 `pi.getAllTools()` 中，并且无需 `/reload` 即可被 LLM 调用。

使用 `pi.setActiveTools()` 在运行时启用或禁用工具（包括动态添加的工具）。

使用 `promptSnippet` 让自定义工具进入 `Available tools` 的一行条目，使用 `promptGuidelines` 在工具处于活动状态时把特定于工具的要点追加到默认 `Guidelines` 部分。

**重要：** `promptGuidelines` 要点会扁平追加到 `Guidelines` 部分，没有工具名前缀。每条指南必须点名它所指的工具——避免写 “Use this tool when...”，因为 LLM 无法分辨 “this” 指哪个工具。应写成 “Use my_tool when...”。

完整示例见 [dynamic-tools.ts](../examples/extensions/dynamic-tools.ts)。

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does",
  promptSnippet: "Summarize or transform text according to action",
  promptGuidelines: ["Use my_tool when the user asks to summarize previously generated text."],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    // Optional compatibility shim. Runs before schema validation.
    // Return the current schema shape, for example to fold legacy fields
    // into the modern parameter object.
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Stream progress
    onUpdate?.({ content: [{ type: "text", text: "Working..." }] });

    return {
      content: [{ type: "text", text: "Done" }],
      details: { result: "..." },
    };
  },

  // Optional: Custom rendering
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

### pi.sendMessage(message, options?)

向会话注入一条自定义消息。自定义消息会参与 LLM 上下文。对于不应发送给 LLM 的持久 TUI 专用内容，使用 [`pi.appendEntry()`](#piappendentrycustomtype-data) 配合 [`pi.registerEntryRenderer()`](#piregisterentryrenderercustomtype-renderer)。

```typescript
pi.sendMessage({
  customType: "my-extension",
  content: "Message text",
  display: true,
  details: { ... },
}, {
  triggerTurn: true,
  deliverAs: "steer",
});
```

**选项：**
- `deliverAs` - 投递模式：
  - `"steer"`（默认）- 在流式输出期间排队该消息。在当前 assistant turn 完成其工具调用之后、下一次 LLM 调用之前投递。
  - `"followUp"` - 等待 agent 完成。仅在 agent 没有更多工具调用时投递。
  - `"nextTurn"` - 排队到下一条用户提示。不中断也不触发任何操作。
- `triggerTurn: true` - 若 agent 空闲，立即触发一次 LLM 响应。仅适用于 `"steer"` 和 `"followUp"` 模式（对 `"nextTurn"` 忽略）。

### pi.sendUserMessage(content, options?)

向 agent 发送一条用户消息。与发送自定义消息的 `sendMessage()` 不同，这会发送一条看起来像用户键入的真实用户消息。总会触发一个 turn。

```typescript
// Simple text message
pi.sendUserMessage("What is 2+2?");

// With content array (text + images)
pi.sendUserMessage([
  { type: "text", text: "Describe this image:" },
  { type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } },
]);

// During streaming - must specify delivery mode
pi.sendUserMessage("Focus on error handling", { deliverAs: "steer" });
pi.sendUserMessage("And then summarize", { deliverAs: "followUp" });

// Opt in to extension command dispatch and skill/prompt template expansion
pi.sendUserMessage("/review src/index.ts", { expandPromptTemplates: true });
```

**选项：**
- `deliverAs` - agent 正在流式输出时必需：
  - `"steer"` - 排队该消息，在当前 assistant turn 完成其工具调用后投递
  - `"followUp"` - 等待 agent 完成所有工具
- `expandPromptTemplates` - 分发扩展命令，并展开 skill 命令和提示词模板。默认为 `false`。

未在流式输出时，消息会立即发送并触发新的 turn。正在流式输出但未指定 `deliverAs` 时会抛错。

完整示例见 [send-user-message.ts](../examples/extensions/send-user-message.ts)。

### pi.appendEntry(customType, data?)

持久化扩展数据。自定义条目**不**参与 LLM 上下文。在交互模式中，与 `pi.registerEntryRenderer()` 配对时，它们也可以渲染到聊天记录中。

```typescript
pi.appendEntry("my-state", { count: 42 });
pi.appendEntry("status-card", { title: "Indexed files", count: 17 });

// Restore on reload
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === "my-state") {
      // Reconstruct from entry.data
    }
  }
});
```

### pi.setSessionName(name)

设置会话显示名称（在会话选择器中显示，而不是第一条消息）。

```typescript
pi.setSessionName("Refactor auth module");
```

### pi.getSessionName()

获取当前会话名称（若已设置）。

```typescript
const name = pi.getSessionName();
if (name) {
  console.log(`Session: ${name}`);
}
```

### pi.setLabel(entryId, label)

为条目设置或清除标签。标签是用户定义的书签和导航标记（显示在 `/tree` 选择器中）。

```typescript
// Set a label
pi.setLabel(entryId, "checkpoint-before-refactor");

// Clear a label
pi.setLabel(entryId, undefined);

// Read labels via sessionManager
const label = ctx.sessionManager.getLabel(entryId);
```

标签会持久化在会话中，并在重启后保留。用它们在对话树中标记重要位置（turn、检查点）。

### pi.registerCommand(name, options)

注册一条命令。

如果多个扩展注册了相同的命令名，pi 会全部保留，并按加载顺序分配数字调用后缀，例如 `/review:1` 和 `/review:2`。

```typescript
pi.registerCommand("stats", {
  description: "Show session statistics",
  handler: async (args, ctx) => {
    const count = ctx.sessionManager.getEntries().length;
    ctx.ui.notify(`${count} entries`, "info");
  }
});
```

可选：为 `/command ...` 添加参数自动补全：

```typescript
import type { AutocompleteItem } from "@earendil-works/pi-tui";

pi.registerCommand("deploy", {
  description: "Deploy to an environment",
  getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
    const envs = ["dev", "staging", "prod"];
    const items = envs.map((e) => ({ value: e, label: e }));
    const filtered = items.filter((i) => i.value.startsWith(prefix));
    return filtered.length > 0 ? filtered : null;
  },
  handler: async (args, ctx) => {
    ctx.ui.notify(`Deploying: ${args}`, "info");
  },
});
```

### pi.getCommands()

获取当前会话中可通过 `prompt` 调用的斜杠命令。包括扩展命令、提示词模板和 skill 命令。
列表顺序与 RPC `get_commands` 一致：扩展在前，然后是模板，然后是 skills。

```typescript
const commands = pi.getCommands();
const bySource = commands.filter((command) => command.source === "extension");
const userScoped = commands.filter((command) => command.sourceInfo.scope === "user");
```

每项的形状如下：

```typescript
{
  name: string; // Invokable command name without the leading slash. May be suffixed like "review:1"
  description?: string;
  source: "extension" | "prompt" | "skill";
  sourceInfo: {
    path: string;
    source: string;
    scope: "user" | "project" | "temporary";
    origin: "package" | "top-level";
    baseDir?: string;
  };
}
```

把 `sourceInfo` 作为权威来源字段。不要从命令名或临时的路径解析来推断归属。

内置交互命令（如 `/model` 和 `/settings`）不包含在此。它们只在交互模式中处理，通过 `prompt` 发送时不会执行。

### pi.registerMessageRenderer(customType, renderer)

为带有你的 `customType` 的自定义消息注册自定义 TUI 渲染器。自定义消息通过 `pi.sendMessage()` 创建，并参与 LLM 上下文。见 [自定义 UI](#自定义-ui)。

### pi.registerMarkdownTransformer(transformer)

为普通用户文本、assistant 文本和思考块中的 Markdown 注册转换器。转换器按扩展加载顺序运行，每个转换器收到的是上一个转换器返回的 Markdown。链路完成后，Pi 用内置渲染器渲染转换后的内容。

转换器收到 Markdown 字符串以及包含以下内容的上下文：

- `messageType` — `"user"`、`"assistant"` 或 `"assistant-thinking"`
- `isStreaming` — 对部分 assistant 更新为 `true`；对用户消息、已定稿的 assistant 消息和恢复的消息为 `false`
- `availableWidth` — 转换后 Markdown 内容可用的精确终端列数

返回转换后的 Markdown：

```typescript
pi.registerMarkdownTransformer((markdown, { messageType, isStreaming }) => {
  if (isStreaming || messageType === "assistant-thinking") return markdown;
  return markdown.replaceAll("-->", "→");
});
```

如果某个转换器抛错，Pi 会保留到目前为止产生的 Markdown，并继续下一个转换器。该钩子仅用于显示：原始消息在会话和模型上下文中保持不变。它会在新用户消息、assistant 流式更新、恢复的会话消息以及终端宽度变化时运行，因此转换器应保持同步且开销低。

### pi.registerEntryRenderer(customType, renderer)

为带有你的 `customType` 的自定义条目注册自定义 TUI 渲染器。自定义条目通过 `pi.appendEntry()` 创建，不参与 LLM 上下文。

```typescript
import { Box, Text } from "@earendil-works/pi-tui";

pi.registerEntryRenderer("status-card", (entry, { expanded }, theme) => {
  const data = entry.data as { title: string; count: number };
  const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
  box.addChild(new Text(`${theme.bold(data.title)}: ${data.count}`));
  if (expanded) {
    box.addChild(new Text(theme.fg("dim", JSON.stringify(data, null, 2))));
  }
  return box;
});

pi.appendEntry("status-card", { title: "Indexed files", count: 17 });
```

### pi.registerShortcut(shortcut, options)

注册键盘快捷键。快捷键格式和内置快捷键见 [keybindings.zh.md](keybindings.zh.md)。

```typescript
pi.registerShortcut("ctrl+shift+p", {
  description: "Toggle plan mode",
  handler: async (ctx) => {
    ctx.ui.notify("Toggled!");
  },
});
```

### pi.registerFlag(name, options)

注册一个 CLI 标志。

```typescript
pi.registerFlag("plan", {
  description: "Start in plan mode",
  type: "boolean",
  default: false,
});

// Check value
if (pi.getFlag("plan")) {
  // Plan mode enabled
}
```

### pi.exec(command, args, options?)

执行一条 shell 命令。

```typescript
const result = await pi.exec("git", ["status"], { signal, timeout: 5000 });
// result.stdout, result.stderr, result.code, result.killed
```

### pi.getActiveTools() / pi.getAllTools() / pi.setActiveTools(names)

管理活动工具。这对内置工具和动态注册的工具都有效。`pi.getActiveTools()` 以 `string[]` 返回活动工具名；`pi.getAllTools()` 返回所有已配置工具的元数据。

```typescript
const active = pi.getActiveTools(); // ["read", "bash", ...]
const all = pi.getAllTools();
// all = [{
//   name: "read",
//   description: "Read file contents...",
//   parameters: ...,
//   promptGuidelines: ["Use read to examine files instead of cat or sed."],
//   sourceInfo: { path: "<builtin:read>", source: "builtin", scope: "temporary", origin: "top-level" }
// }, ...]
const builtinTools = all.filter((t) => t.sourceInfo.source === "builtin");
const extensionTools = all.filter((t) => t.sourceInfo.source !== "builtin" && t.sourceInfo.source !== "sdk");
pi.setActiveTools([...new Set([...active, "my_custom_tool"])]); // Keep current tools and enable my_custom_tool
pi.setActiveTools(["read", "bash"]); // Switch to read-only
```

`pi.getAllTools()` 返回 `name`、`description`、`parameters`、`promptGuidelines` 和 `sourceInfo`。

典型的 `sourceInfo.source` 值：
- `builtin` 表示内置工具
- `sdk` 表示通过 `createAgentSession({ customTools })` 传入的工具
- 扩展注册工具的扩展来源元数据

### pi.setModel(model)

设置当前会话的模型。该变更会记录到会话历史中，并在恢复该会话时还原，但不会改变新会话使用的已配置 `defaultProvider` 或 `defaultModel`。如果该模型提供方未配置鉴权，则返回 `false`。配置自定义模型见 [models.zh.md](models.zh.md)。

```typescript
const model = ctx.modelRegistry.find("anthropic", "claude-sonnet-4-5");
if (model) {
  const success = await pi.setModel(model);
  if (!success) {
    ctx.ui.notify("No API key for this model", "error");
  }
}
```

### pi.getThinkingLevel() / pi.setThinkingLevel(level)

获取当前思考级别。级别会被钳制到模型能力范围内（非推理模型始终使用 "off"）。变更会发出 `thinking_level_select`。

`pi.setThinkingLevel()` 会改变当前会话的思考级别。该变更会记录到会话历史中，并在恢复该会话时还原，但不会改变新会话使用的已配置默认值。

```typescript
const current = pi.getThinkingLevel();  // "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
pi.setThinkingLevel("high");
```

### pi.events

用于扩展之间通信的共享事件总线：

```typescript
pi.events.on("my:event", (data) => { ... });
pi.events.emit("my:event", { ... });
```

### pi.registerProvider(name, config)

动态注册或覆盖模型提供方。适用于代理、自定义端点或团队范围的模型配置。

在扩展工厂函数期间的调用会排队，并在 runner 初始化后应用。之后的调用——例如用户完成设置流程后从命令处理函数中调用——会立即生效，无需 `/reload`。

动态提供方可以实现 `refreshModels`。Pi 在模型刷新期间调用它，通过提供方同步发布返回的列表，并传入规范的凭证/已存储目录/网络/信号上下文。扩展通过带 generation 检查的 `context.publish({ persist: entry })` 决定是否持久化目录元数据；llama.cpp 这类实时服务器可以返回模型而不持久化它们。

`context.signal` 始终是具体的信号，提供方回调必须把它传给阻塞 I/O。公共的 `ModelRuntime.refresh()` 和 `ModelRegistry.refresh()` 调用接受可选信号，省略时没有截止时间；扩展和应用自行选择截止时间。即使提供方忽略该信号，取消也会停止调用方等待，但仍需要协作才能停止底层工作。

需要原生提供方鉴权、过滤、刷新或流行为的扩展可以注册来自 `@earendil-works/pi-ai` 的完整 `Provider`。该提供方会成为组合基座，`models.json` 覆盖仍会作用在它之上。

```typescript
import { createProvider, openAICompletionsApi } from "@earendil-works/pi-ai";

const provider = createProvider({
  id: "local-server",
  name: "Local Server",
  baseUrl: "http://localhost:8080/v1",
  auth: {
    apiKey: {
      name: "Local server setup",
      async login(interaction) {
        return {
          type: "api_key",
          key: await interaction.prompt({ type: "secret", message: "API key" }),
        };
      },
      async resolve({ credential }) {
        return credential?.key
          ? { auth: { apiKey: credential.key }, source: "stored API key" }
          : undefined;
      },
    },
  },
  models: [],
  api: openAICompletionsApi(),
});

pi.registerProvider(provider);

// Register a new provider with custom models
pi.registerProvider("my-proxy", {
  name: "My Proxy",
  baseUrl: "https://proxy.example.com",
  apiKey: "$PROXY_API_KEY",  // env var reference
  api: "anthropic-messages",
  models: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet (proxy)",
      reasoning: false,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 16384
    }
  ]
});

// Register a live llama.cpp catalog without persisting discovered models
pi.registerProvider("llama.cpp", {
  baseUrl: "http://localhost:8080/v1",
  apiKey: "local",
  api: "openai-completions",
  async refreshModels({ signal }) {
    const response = await fetch("http://localhost:8080/v1/models", { signal });
    const { data } = await response.json();
    return data.map(({ id }) => ({
      id,
      name: id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 16384
    }));
  }
});

// Override baseUrl for an existing provider (keeps all models)
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com"
});

// Register provider with OAuth support for /login
pi.registerProvider("corporate-ai", {
  baseUrl: "https://ai.corp.com",
  api: "openai-responses",
  models: [...],
  oauth: {
    name: "Corporate AI (SSO)",
    async login(callbacks) {
      // Custom OAuth flow
      callbacks.onAuth({ url: "https://sso.corp.com/..." });
      const code = await callbacks.onPrompt({ message: "Enter code:" });
      return { refresh: code, access: code, expires: Date.now() + 3600000 };
    },
    async refreshToken(credentials, signal) {
      signal.throwIfAborted();
      // Refresh logic
      return credentials;
    },
    getApiKey(credentials) {
      return credentials.access;
    }
  }
});
```

对象形式接受完整的 pi-ai `Provider`，包括原生 `auth`、`getModels`、`refreshModels`、`filterModels`、`stream` 和 `streamSimple` 行为。

**遗留配置选项：**
- `name` - 提供方在 `/login` 等 UI 中的显示名称。
- `baseUrl` - API 端点 URL。定义模型时必需。
- `apiKey` - API 密钥字面量、环境变量插值（`$ENV_VAR` 或 `${ENV_VAR}`），或以 `!command` 开头。定义模型时必需（除非提供了 `oauth`）。`$$` 转义 `$`，`$!` 转义字面量 `!` 而不触发命令执行。
- `api` - API 类型：`"anthropic-messages"`、`"openai-completions"`、`"openai-responses"` 等。
- `headers` - 请求中包含的自定义请求头。
- `authHeader` - 若为 true，自动添加 `Authorization: Bearer` 请求头。
- `models` - 模型定义数组。若提供，会替换该提供方的所有现有模型。模型定义可以设置 `baseUrl`，为该模型覆盖提供方端点。
- `refreshModels` - 异步动态发现回调。其返回的模型会替换扩展提供的模型。`context.stored` 包含已持久化的提供方快照；仅当更新后的目录数据应持久化时，才使用带 generation 检查的 `context.publish({ persist: entry })`。使用 `persist: null` 删除该快照。
- `oauth` - 用于 `/login` 支持的 OAuth 提供方配置。提供后，该提供方会出现在登录菜单中。
- `streamSimple` - 非标准 API 的自定义流式实现。

高级主题见 [custom-provider.zh.md](custom-provider.zh.md)：自定义流式 API、OAuth 细节、模型定义参考。

### pi.unregisterProvider(name)

移除先前注册的提供方及其模型。被该提供方覆盖的内置模型会恢复。如果该提供方未被注册，则无效果。

与 `registerProvider` 一样，在初始加载阶段之后调用会立即生效，因此不需要 `/reload`。

```typescript
pi.registerCommand("my-setup-teardown", {
  description: "Remove the custom proxy provider",
  handler: async (_args, _ctx) => {
    pi.unregisterProvider("my-proxy");
  },
});
```

## 状态管理

带状态的扩展应把状态存储在工具结果的 `details` 中，以便正确支持分支：

```typescript
export default function (pi: ExtensionAPI) {
  let items: string[] = [];

  // Reconstruct state from session
  pi.on("session_start", async (_event, ctx) => {
    items = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult") {
        if (entry.message.toolName === "my_tool") {
          items = entry.message.details?.items ?? [];
        }
      }
    }
  });

  pi.registerTool({
    name: "my_tool",
    // ...
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      items.push("new item");
      return {
        content: [{ type: "text", text: "Added" }],
        details: { items: [...items] },  // Store for reconstruction
      };
    },
  });
}
```

## 自定义工具

通过 `pi.registerTool()` 注册 LLM 可调用的工具。工具会出现在系统提示中，并可以有自定义渲染。

使用 `promptSnippet` 在默认系统提示的 `Available tools` 部分添加一行简短条目。若省略，自定义工具不会出现在该部分。

使用 `promptGuidelines` 向默认系统提示的 `Guidelines` 部分添加特定于工具的要点。这些要点仅在工具处于活动状态时包含（例如在 `pi.setActiveTools([...])` 之后）。

**重要：** `promptGuidelines` 要点会扁平追加到 `Guidelines` 部分，没有工具名前缀或分组。每条指南必须点名它所指的工具——避免写 “Use this tool when...”，因为 LLM 无法分辨 “this” 指哪个工具。应写成 “Use my_tool when...”。

注意：有些模型会在工具路径参数中带上 @ 前缀。内置工具在解析路径前会去掉前导 @。如果你的自定义工具接受路径，也应规范化前导 @。

如果你的自定义工具会变更文件，请使用 `withFileMutationQueue()`，以便它与内置 `edit` 和 `write` 使用同一套按文件排队。这很重要，因为工具调用默认并行运行。没有队列时，两个工具可能读到同一份旧文件内容、算出不同的更新，然后后写入的那个会覆盖另一个。

失败示例：你的自定义工具编辑 `foo.ts`，同时内置 `edit` 也在同一 assistant turn 中修改 `foo.ts`。如果你的工具不参与队列，两者都可能读到原始 `foo.ts`、分别应用变更，其中一次变更会丢失。

把真实目标文件路径传给 `withFileMutationQueue()`，而不是原始用户参数。先把它解析为绝对路径，相对于 `ctx.cwd` 或你的工具工作目录。对已存在的文件，该辅助函数会通过 `realpath()` 规范化，因此同一文件的符号链接别名共享一个队列。对新文件，它回退到已解析的绝对路径，因为还没有可以 `realpath()` 的目标。

在该目标路径上排队整个变更窗口。这包括读-改-写逻辑，而不仅仅是最后的写入。

```typescript
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
  const absolutePath = resolve(ctx.cwd, params.path);

  return withFileMutationQueue(absolutePath, async () => {
    await mkdir(dirname(absolutePath), { recursive: true });
    const current = await readFile(absolutePath, "utf8");
    const next = current.replace(params.oldText, params.newText);
    await writeFile(absolutePath, next, "utf8");

    return {
      content: [{ type: "text", text: `Updated ${params.path}` }],
      details: {},
    };
  });
}
```

### 工具定义

```typescript
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "What this tool does (shown to LLM)",
  promptSnippet: "List or add items in the project todo list",
  promptGuidelines: [
    "Use my_tool for todo planning instead of direct file edits when the user asks for a task list."
  ],
  parameters: Type.Object({
    action: StringEnum(["list", "add"] as const),  // Use StringEnum for Google compatibility
    text: Type.Optional(Type.String()),
  }),
  prepareArguments(args) {
    if (!args || typeof args !== "object") return args;
    const input = args as { action?: string; oldAction?: string };
    if (typeof input.oldAction === "string" && input.action === undefined) {
      return { ...input, action: input.oldAction };
    }
    return args;
  },

  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Check for cancellation
    if (signal?.aborted) {
      return { content: [{ type: "text", text: "Cancelled" }] };
    }

    // Stream progress updates
    onUpdate?.({
      content: [{ type: "text", text: "Working..." }],
      details: { progress: 50 },
    });

    // Run commands via pi.exec (captured from extension closure)
    const result = await pi.exec("some-command", [], { signal });

    // Return result
    return {
      content: [{ type: "text", text: "Done" }],  // Sent to LLM
      details: { data: result },                   // For rendering & state
      // usage: nestedModelResponse.usage,          // Optional nested LLM usage
      // Optional: stop after this tool batch when every finalized tool result
      // in the batch also returns terminate: true.
      terminate: true,
    };
  },

  // Optional: Custom rendering
  renderCall(args, theme, context) { ... },
  renderResult(result, options, theme, context) { ... },
});
```

**用量记账：** 如果工具发起了嵌套 LLM 调用，把它们合并后的 `Usage` 作为 `usage` 返回。Pi 会把它持久化到工具结果中，并计入页脚、`/session` 和 RPC 会话总量。`tool_result` 处理函数可以检查或替换该值。

**报告错误：** 要把工具执行标记为失败（在结果上设置 `isError: true` 并报告给 LLM），从 `execute` 抛出错误。返回值永远不会设置错误标志，无论你在返回对象中包含什么属性。

**提前终止：** 从 `execute()` 返回 `terminate: true`，提示当前工具批次之后应跳过自动后续 LLM 调用。只有当该批次中每个已定稿工具结果都是 terminating 时才会生效。最小示例见 [examples/extensions/structured-output.ts](../examples/extensions/structured-output.ts)，其中 agent 在最终的结构化输出工具调用上结束。

```typescript
// Correct: throw to signal an error
async execute(toolCallId, params) {
  if (!isValid(params.input)) {
    throw new Error(`Invalid input: ${params.input}`);
  }
  return { content: [{ type: "text", text: "OK" }], details: {} };
}
```

**重要：** 字符串枚举请使用 `@earendil-works/pi-ai` 的 `StringEnum`。`Type.Union`/`Type.Literal` 无法与 Google 的 API 一起工作。

**参数准备：** `prepareArguments(args)` 是可选的。若定义，它会在 schema 校验和 `execute()` 之前运行。当 pi 恢复旧会话、其中存储的工具调用参数不再匹配当前 schema 时，用它模拟旧的可接受输入形状。返回你希望对照 `parameters` 校验的对象。保持公开 schema 严格。不要只为了让旧的已恢复会话继续工作，就把已弃用的兼容字段加到 `parameters` 中。

示例：旧会话可能包含带顶层 `oldText` 和 `newText` 的 `edit` 工具调用，而当前 schema 只接受 `edits: [{ oldText, newText }]`。

```typescript
pi.registerTool({
  name: "edit",
  label: "Edit",
  description: "Edit a single file using exact text replacement",
  parameters: Type.Object({
    path: Type.String(),
    edits: Type.Array(
      Type.Object({
        oldText: Type.String(),
        newText: Type.String(),
      }),
    ),
  }),
  prepareArguments(args) {
    if (!args || typeof args !== "object") return args;

    const input = args as {
      path?: string;
      edits?: Array<{ oldText: string; newText: string }>;
      oldText?: unknown;
      newText?: unknown;
    };

    if (typeof input.oldText !== "string" || typeof input.newText !== "string") {
      return args;
    }

    return {
      ...input,
      edits: [...(input.edits ?? []), { oldText: input.oldText, newText: input.newText }],
    };
  },
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // params now matches the current schema
    return {
      content: [{ type: "text", text: `Applying ${params.edits.length} edit block(s)` }],
      details: {},
    };
  },
});
```

### 覆盖内置工具

扩展可以通过注册同名工具来覆盖内置工具（`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`）。发生这种情况时，交互模式会显示警告。

```bash
# Extension's read tool replaces built-in read
pi -e ./tool-override.ts
```

或者，使用 `--no-builtin-tools` 在不启用任何内置工具的情况下启动，同时保留扩展工具：
```bash
# No built-in tools, only extension tools
pi --no-builtin-tools -e ./my-extension.ts
```

完整示例见 [examples/extensions/tool-override.ts](../examples/extensions/tool-override.ts)，它用日志和访问控制覆盖 `read`。

**渲染：** 内置渲染器继承按槽位解析。执行覆盖和渲染覆盖相互独立。如果你的覆盖省略了 `renderCall`，则使用内置 `renderCall`。如果省略了 `renderResult`，则使用内置 `renderResult`。如果两者都省略，则自动使用内置渲染器（语法高亮、diff 等）。这让你可以为日志或访问控制包装内置工具，而不必重实现 UI。

**提示元数据：** `promptSnippet` 和 `promptGuidelines` 不会从内置工具继承。如果你的覆盖应保留这些提示指令，请在覆盖上显式定义它们。

**你的实现必须匹配精确的结果形状**，包括 `details` 类型。UI 和会话逻辑依赖这些形状来做渲染和状态跟踪。

内置工具实现：
- [read.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/read.ts) - `ReadToolDetails`
- [bash.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/bash.ts) - `BashToolDetails`
- [powershell.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/powershell.ts) - `PowerShellToolDetails`
- [edit.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/edit.ts)
- [write.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/write.ts)
- [grep.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/grep.ts) - `GrepToolDetails`
- [find.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/find.ts) - `FindToolDetails`
- [ls.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/ls.ts) - `LsToolDetails`

### 远程执行

内置工具支持可插拔 operations，用于委托给远程系统（SSH、容器等）：

```typescript
import { createReadTool, createBashTool, type ReadOperations } from "@earendil-works/pi-coding-agent";

// Create tool with custom operations
const remoteRead = createReadTool(cwd, {
  operations: {
    readFile: (path) => sshExec(remote, `cat ${path}`),
    access: (path) => sshExec(remote, `test -r ${path}`).then(() => {}),
  }
});

// Register, checking flag at execution time
pi.registerTool({
  ...remoteRead,
  async execute(id, params, signal, onUpdate, _ctx) {
    const ssh = getSshConfig();
    if (ssh) {
      const tool = createReadTool(cwd, { operations: createRemoteOps(ssh) });
      return tool.execute(id, params, signal, onUpdate);
    }
    return localRead.execute(id, params, signal, onUpdate);
  },
});
```

**Operations 接口：** `ReadOperations`、`WriteOperations`、`EditOperations`、`BashOperations`、`PowerShellOperations`、`LsOperations`、`GrepOperations`、`FindOperations`

对于 `user_bash`，扩展可以通过 `createLocalBashOperations()` 复用 pi 的本地 shell 后端，而不必重新实现本地进程启动、shell 解析和进程树终止。

`bash` 和 `powershell` 工具还支持 spawn hook，以便在执行前调整命令、cwd 或 env：

```typescript
import { createBashTool } from "@earendil-works/pi-coding-agent";

const bashTool = createBashTool(cwd, {
  spawnHook: ({ command, cwd, env }) => ({
    command: `source ~/.profile\n${command}`,
    cwd: `/mnt/sandbox${cwd}`,
    env: { ...env, CI: "1" },
  }),
});
```

`createBashTool()` 和 `createPowerShellTool()` 通过 `PI_SESSION_ID`、`PI_SESSION_FILE`、`PI_PROVIDER`、`PI_MODEL` 和 `PI_REASONING_LEVEL` 向命令暴露当前会话。注入发生在 `spawnHook` 之前，因此 hook 会在 `env` 中收到这些值，并在像上面那样展开现有环境时保留它们。设置 `exposeSessionEnvironment: false` 可禁用它们：

```typescript
const bashTool = createBashTool(cwd, {
  exposeSessionEnvironment: false,
});
```

变量语义见 [Shell 工具的会话环境](environment-variables.zh.md#shell-工具的会话环境)。带 `--ssh` 标志的完整 SSH 示例见 [examples/extensions/ssh.ts](../examples/extensions/ssh.ts)。

### 输出截断

**工具必须截断其输出**，以免淹没 LLM 上下文。过大的输出可能导致：
- 上下文溢出错误（提示过长）
- 压缩失败
- 模型性能下降

内置限制是 **50KB**（约 10k tokens）和 **2000 行**，以先达到者为准。使用导出的截断工具：

```typescript
import {
  truncateHead,      // Keep first N lines/bytes (good for file reads, search results)
  truncateTail,      // Keep last N lines/bytes (good for logs, command output)
  truncateLine,      // Truncate a single line to maxBytes with ellipsis
  formatSize,        // Human-readable size (e.g., "50KB", "1.5MB")
  DEFAULT_MAX_BYTES, // 50KB
  DEFAULT_MAX_LINES, // 2000
} from "@earendil-works/pi-coding-agent";

async execute(toolCallId, params, signal, onUpdate, ctx) {
  const output = await runCommand();

  // Apply truncation
  const truncation = truncateHead(output, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  let result = truncation.content;

  if (truncation.truncated) {
    // Write full output to temp file
    const tempFile = writeTempFile(output);

    // Inform the LLM where to find complete output
    result += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines`;
    result += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
    result += ` Full output saved to: ${tempFile}]`;
  }

  return { content: [{ type: "text", text: result }] };
}
```

**要点：**
- 对开头更重要的内容使用 `truncateHead`（搜索结果、文件读取）
- 对结尾更重要的内容使用 `truncateTail`（日志、命令输出）
- 输出被截断时，始终告知 LLM 并说明完整版本的位置
- 在工具描述中记录截断限制

用正确截断包装 `rg`（ripgrep）的完整示例见 [examples/extensions/truncated-tool.ts](../examples/extensions/truncated-tool.ts)。

### 多个工具

一个扩展可以注册多个共享状态的工具：

```typescript
export default function (pi: ExtensionAPI) {
  let connection = null;

  pi.registerTool({ name: "db_connect", ... });
  pi.registerTool({ name: "db_query", ... });
  pi.registerTool({ name: "db_close", ... });

  pi.on("session_shutdown", async () => {
    connection?.close();
  });
}
```

### 自定义渲染

工具可以提供 `renderCall` 和 `renderResult` 用于自定义 TUI 显示。完整组件 API 见 [tui.zh.md](tui.zh.md)，工具行如何组合见 [tool-execution.ts](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/interactive/components/tool-execution.ts)。

默认情况下，工具输出包裹在处理内边距和背景的 `Box` 中。已定义的 `renderCall` 或 `renderResult` 必须返回 `Component`。如果某个槽位渲染器未定义，`tool-execution.ts` 会对该槽位使用回退渲染。

当工具应渲染自己的外壳而不是使用默认 `Box` 时，设置 `renderShell: "self"`。这对需要完全控制边框或背景行为的工具很有用，例如必须在工具稳定后保持视觉稳定的大型预览。

```typescript
pi.registerTool({
  name: "my_tool",
  label: "My Tool",
  description: "Custom shell example",
  parameters: Type.Object({}),
  renderShell: "self",
  async execute() {
    return { content: [{ type: "text", text: "ok" }], details: undefined };
  },
  renderCall(args, theme, context) {
    return new Text(theme.fg("accent", "my custom shell"), 0, 0);
  },
});
```

`renderCall` 和 `renderResult` 各自收到一个 `context` 对象，包含：
- `args` - 当前工具调用参数
- `state` - `renderCall` 和 `renderResult` 之间共享的行本地状态
- `lastComponent` - 该槽位先前返回的组件（如有）
- `invalidate()` - 请求重新渲染此工具行
- `toolCallId`、`cwd`、`executionStarted`、`argsComplete`、`isPartial`、`expanded`、`showImages`、`isError`

跨槽位共享状态使用 `context.state`。当你想在多次渲染中复用并修改同一组件时，把槽位本地缓存放在返回的组件实例上。

#### renderCall

渲染工具调用或标题：

```typescript
import { Text } from "@earendil-works/pi-tui";

renderCall(args, theme, context) {
  const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
  let content = theme.fg("toolTitle", theme.bold("my_tool "));
  content += theme.fg("muted", args.action);
  if (args.text) {
    content += " " + theme.fg("dim", `"${args.text}"`);
  }
  text.setText(content);
  return text;
}
```

#### renderResult

渲染工具结果或输出：

```typescript
renderResult(result, { expanded, isPartial }, theme, context) {
  if (isPartial) {
    return new Text(theme.fg("warning", "Processing..."), 0, 0);
  }

  if (result.details?.error) {
    return new Text(theme.fg("error", `Error: ${result.details.error}`), 0, 0);
  }

  let text = theme.fg("success", "✓ Done");
  if (expanded && result.details?.items) {
    for (const item of result.details.items) {
      text += "\n  " + theme.fg("dim", item);
    }
  }
  return new Text(text, 0, 0);
}
```

如果某个槽位有意没有可见内容，返回一个空 `Component`，例如空的 `Container`。

#### 快捷键提示

使用 `keyHint()` 显示尊重活动快捷键配置的快捷键提示：

```typescript
import { keyHint } from "@earendil-works/pi-coding-agent";

renderResult(result, { expanded }, theme, context) {
  let text = theme.fg("success", "✓ Done");
  if (!expanded) {
    text += ` (${keyHint("app.tools.expand", "to expand")})`;
  }
  return new Text(text, 0, 0);
}
```

可用函数：
- `keyHint(keybinding, description)` - 格式化已配置的快捷键 id，例如 `"app.tools.expand"` 或 `"tui.select.confirm"`
- `keyText(keybinding)` - 返回快捷键 id 的原始已配置按键文本
- `rawKeyHint(key, description)` - 格式化原始按键字符串

使用带命名空间的快捷键 id：
- coding-agent id 使用 `app.*` 命名空间，例如 `app.tools.expand`、`app.editor.external`、`app.session.rename`
- 共享 TUI id 使用 `tui.*` 命名空间，例如 `tui.select.confirm`、`tui.select.cancel`、`tui.input.tab`

完整的快捷键 id 和默认值列表见 [keybindings.zh.md](keybindings.zh.md)。`keybindings.json` 使用相同的带命名空间 id。

自定义编辑器和 `ctx.ui.custom()` 组件会收到作为注入参数的 `keybindings: KeybindingsManager`。它们应直接使用该注入的管理器，而不是调用 `getKeybindings()` 或 `setKeybindings()`。

#### 最佳实践

- 对 `Text` 使用 padding `(0, 0)`。默认 Box 会处理内边距。
- 多行内容使用 `\n`。
- 处理 `isPartial` 以显示流式进度。
- 支持 `expanded` 以便按需查看细节。
- 保持默认视图紧凑。
- 在 `renderResult` 中读取 `context.args`，而不是把 args 复制到 `context.state`。
- 仅对必须在 call 和 result 槽位之间共享的数据使用 `context.state`。
- 当同一组件实例可以就地更新时，复用 `context.lastComponent`。
- 仅在默认带框外壳碍事时使用 `renderShell: "self"`。在 self-shell 模式下，工具负责自己的边框、内边距和背景。

#### 回退

如果某个槽位渲染器未定义或抛错：
- `renderCall`：显示工具名
- `renderResult`：显示来自 `content` 的原始文本

### 动态加载工具

扩展可以注册许多工具，同时只保持一小部分初始集合处于活动状态。然后工具可以在执行期间通过 `pi.setActiveTools()` 添加更多工具。Pi 会检测纯增量变更，把新可用的工具名记录到该工具结果上，并在下一次模型请求之前应用更新后的活动集合。

这适用于每个模型。支持原生延迟加载的模型会保留稳定的提示前缀，并在工具结果位置加载新定义。其他模型使用下面描述的回退。

生命周期是：

1. 用 `pi.registerTool()` 注册每个工具，使其出现在 `pi.getAllTools()` 中。
2. 保持加载器工具（例如 `search_tools`）处于活动状态，并让可搜索工具保持非活动。
3. 在加载器执行期间，调用 `pi.setActiveTools([...currentTools, ...matchingTools])`。变更必须是增量的：不要在同一次调用中移除当前活动工具。
4. Pi 在加载器的工具结果上记录添加了哪些工具。
5. 在下一次模型响应之前，Pi 在支持时使用原生延迟加载暴露新增定义，否则使用普通活动工具列表。

你不需要返回特定于提供方的工具引用，也不需要把加载器标记为特殊搜索工具。活动工具变更就是信号。传给 `pi.setActiveTools()` 的名称必须已经注册；未知名称会被忽略。

#### 支持原生延迟加载的模型

- **Anthropic**
  - **模型：** Sonnet、Opus、Fable 4.5 或更新版本（不含 Haiku）
  - **原生表示：** 延迟定义使用 `defer_loading`；加载点使用 `tool_reference` 内容。
- **Fireworks Messages API**
  - **原生表示：** 延迟定义使用 `defer_loading`；加载点使用 `tool_reference` 内容。
  - **加载器名称：** 使用 `ToolSearch` 或 `tool_search` 做前缀延迟。其他加载器名称仍可用，但 Fireworks 会把已加载的 schema 包含在初始工具前缀中，从而失去缓存收益。
  - 这不改变 API 路由：Fireworks GLM 模型和 Kimi K3 使用 Chat Completions，而不是 Messages。
- **OpenAI**
  - **模型：** `gpt-5.4` 及更新系列
  - **原生表示：** Pi 在加载点添加已完成的客户端 `tool_search_call` 和 `tool_search_output` 项。

对于已验证的自定义模型或代理，可以对 `anthropic-messages` 用 `compat.supportsToolReferences: true` 启用原生处理，或对 `openai-responses` 和 `openai-codex-responses` 用 `compat.supportsToolSearch: true`。除非端点和模型接受对应的原生协议，否则保持这些选项禁用。

#### 回退行为

对其余所有模型和提供方，动态激活仍然有效：Pi 会在下一次请求中正常发送完整的当前活动工具列表。模型可以调用新激活的工具，但添加它们的定义可能使提供方缓存的提示前缀失效。

当活动集合不是纯增量时，例如用一组工具替换另一组，Pi 也会使用这种安全回退。因此移除工具是有效的，但不会使用延迟加载。

为获得最佳缓存行为，让加载器工具在整个会话中保持活动，并添加工具而不是替换活动集合。还要注意，激活带有 `promptSnippet` 或 `promptGuidelines` 的工具会重建系统提示；即使提供方支持延迟 schema，该系统提示变更也可能使前缀失效。延迟加载的工具通常应依赖其工具 `description`，并省略仅在活动时才有的提示元数据。

#### 搜索工具示例

下面的扩展注册两个可搜索工具，把它们从初始活动集合中移除，并只保留 `search_tools` 作为它们的加载器。该示例使用简单的关键词匹配，但搜索实现可以使用 BM25、嵌入、远程目录或项目特定路由。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const SEARCHABLE_TOOL_NAMES = new Set(["lookup_weather", "search_issues"]);

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "lookup_weather",
    label: "Lookup Weather",
    description: "Look up the current weather for a city",
    parameters: Type.Object({ city: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: `Weather for ${params.city}: sunny` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "search_issues",
    label: "Search Issues",
    description: "Search project issues by keyword",
    parameters: Type.Object({ query: Type.String() }),
    async execute(_toolCallId, params) {
      return {
        content: [{ type: "text", text: `No open issues matching ${params.query}` }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "search_tools",
    label: "Search Tools",
    description: "Search for and enable tools relevant to a task",
    promptSnippet: "Search for additional tools when the active tools cannot perform the task",
    promptGuidelines: [
      "Use search_tools when a task requires a capability that is not currently available.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Capability or task to search for" }),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })),
    }),
    async execute(_toolCallId, params) {
      const terms = params.query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const matches = pi.getAllTools()
        .filter((tool) => SEARCHABLE_TOOL_NAMES.has(tool.name))
        .map((tool) => ({
          tool,
          score: terms.reduce(
            (score, term) =>
              score + (`${tool.name} ${tool.description}`.toLowerCase().includes(term) ? 1 : 0),
            0,
          ),
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, params.limit ?? 3)
        .map((match) => match.tool.name);

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: `No tools found for: ${params.query}` }],
          details: { matches: [] },
        };
      }

      const active = pi.getActiveTools();
      const added = matches.filter((name) => !active.includes(name));
      pi.setActiveTools([...new Set([...active, ...added])]);

      return {
        content: [{
          type: "text",
          text: added.length > 0
            ? `Loaded tools: ${added.join(", ")}`
            : `Matching tools already active: ${matches.join(", ")}`,
        }],
        details: { matches, added },
      };
    },
  });

  pi.on("session_start", () => {
    // Keep searchable tools registered but initially inactive. Preserve built-ins
    // and tools owned by other extensions, and keep the loader itself active.
    const initialTools = pi.getActiveTools().filter(
      (name) => !SEARCHABLE_TOOL_NAMES.has(name),
    );
    pi.setActiveTools([...new Set([...initialTools, "search_tools"])]);
  });
}
```

当 `search_tools` 添加匹配项时，模型会在紧接着的下一次请求中收到该定义。在具备原生能力的模型上，该定义锚定在搜索结果之后，而不改变初始工具 schema 前缀。在其他模型上，它会出现在同一次后续请求的普通工具列表中。

## 自定义 UI

扩展可以通过 `ctx.ui` 方法与用户交互，并自定义消息/工具的渲染方式。

**自定义组件见 [tui.zh.md](tui.zh.md)**，其中有可复制粘贴的模式：
- 选择对话框（SelectList）
- 带取消的异步操作（BorderedLoader）
- 设置开关（SettingsList）
- 状态指示器（setStatus）
- 流式输出期间的工作中消息、可见性和指示器（`setWorkingMessage`、`setWorkingVisible`、`setWorkingIndicator`）
- 编辑器上方/下方的 widget（setWidget）
- 叠在内置斜杠/路径补全之上的自动补全提供器（addAutocompleteProvider）
- 自定义页脚（setFooter）

### 对话框

```typescript
// Select from options
const choice = await ctx.ui.select("Pick one:", ["A", "B", "C"]);

// Confirm dialog
const ok = await ctx.ui.confirm("Delete?", "This cannot be undone");

// Text input
const name = await ctx.ui.input("Name:", "placeholder");

// Multi-line editor
const text = await ctx.ui.editor("Edit:", "prefilled text");

// Notification (non-blocking)
ctx.ui.notify("Done!", "info");  // "info" | "warning" | "error"
```

#### 带倒计时的限时对话框

对话框支持 `timeout` 选项，会以实时倒计时显示自动关闭：

```typescript
// Dialog shows "Title (5s)" → "Title (4s)" → ... → auto-dismisses at 0
const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { timeout: 5000 }
);

if (confirmed) {
  // User confirmed
} else {
  // User cancelled or timed out
}
```

**超时时的返回值：**
- `select()` 返回 `undefined`
- `confirm()` 返回 `false`
- `input()` 返回 `undefined`

#### 用 AbortSignal 手动关闭

若需要更多控制（例如区分超时和用户取消），使用 `AbortSignal`：

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const confirmed = await ctx.ui.confirm(
  "Timed Confirmation",
  "This dialog will auto-cancel in 5 seconds. Confirm?",
  { signal: controller.signal }
);

clearTimeout(timeoutId);

if (confirmed) {
  // User confirmed
} else if (controller.signal.aborted) {
  // Dialog timed out
} else {
  // User cancelled (pressed Escape or selected "No")
}
```

完整示例见 [examples/extensions/timed-confirm.ts](../examples/extensions/timed-confirm.ts)。

### Widget、状态与页脚

```typescript
// Status in footer (persistent until cleared)
ctx.ui.setStatus("my-ext", "Processing...");
ctx.ui.setStatus("my-ext", undefined);  // Clear

// Working loader (shown during streaming)
ctx.ui.setWorkingMessage("Thinking deeply...");
ctx.ui.setWorkingMessage();  // Restore default
ctx.ui.setWorkingVisible(false);  // Hide the built-in working loader row entirely
ctx.ui.setWorkingVisible(true);   // Show the built-in working loader row

// Working indicator (shown during streaming)
ctx.ui.setWorkingIndicator({ frames: [ctx.ui.theme.fg("accent", "●")] });  // Static dot
ctx.ui.setWorkingIndicator({
  frames: [
    ctx.ui.theme.fg("dim", "·"),
    ctx.ui.theme.fg("muted", "•"),
    ctx.ui.theme.fg("accent", "●"),
    ctx.ui.theme.fg("muted", "•"),
  ],
  intervalMs: 120,
});
ctx.ui.setWorkingIndicator({ frames: [] });  // Hide indicator
ctx.ui.setWorkingIndicator();  // Restore default spinner

// Widget above editor (default)
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"]);
// Widget below editor
ctx.ui.setWidget("my-widget", ["Line 1", "Line 2"], { placement: "belowEditor" });
ctx.ui.setWidget("my-widget", (tui, theme) => new Text(theme.fg("accent", "Custom"), 0, 0));
ctx.ui.setWidget("my-widget", undefined);  // Clear

// Custom footer (replaces built-in footer entirely)
ctx.ui.setFooter((tui, theme) => ({
  render(width) { return [theme.fg("dim", "Custom footer")]; },
  invalidate() {},
}));
ctx.ui.setFooter(undefined);  // Restore built-in footer

// Terminal title
ctx.ui.setTitle("pi - my-project");

// Editor text
ctx.ui.setEditorText("Prefill text");
const current = ctx.ui.getEditorText();

// Paste into editor (triggers paste handling, including collapse for large content)
ctx.ui.pasteToEditor("pasted content");

// Stack custom autocomplete behavior on top of the built-in provider
ctx.ui.addAutocompleteProvider((current) => ({
  triggerCharacters: ["#"],
  async getSuggestions(lines, line, col, options) {
    const beforeCursor = (lines[line] ?? "").slice(0, col);
    const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
    if (!match) {
      return current.getSuggestions(lines, line, col, options);
    }

    return {
      prefix: `#${match[1] ?? ""}`,
      items: [{ value: "#2983", label: "#2983", description: "Extension API for autocomplete" }],
    };
  },
  applyCompletion(lines, line, col, item, prefix) {
    return current.applyCompletion(lines, line, col, item, prefix);
  },
  shouldTriggerFileCompletion(lines, line, col) {
    return current.shouldTriggerFileCompletion?.(lines, line, col) ?? true;
  },
}));

// Tool output expansion
const wasExpanded = ctx.ui.getToolsExpanded();
ctx.ui.setToolsExpanded(true);
ctx.ui.setToolsExpanded(wasExpanded);

// Custom editor (vim mode, emacs mode, etc.)
ctx.ui.setEditorComponent((tui, theme, keybindings) => new VimEditor(tui, theme, keybindings));
const currentEditor = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent((tui, theme, keybindings) =>
  new WrappedEditor(tui, theme, keybindings, currentEditor?.(tui, theme, keybindings))
);
ctx.ui.setEditorComponent(undefined);  // Restore default editor

// Theme management (see themes.md for creating themes)
const themes = ctx.ui.getAllThemes();  // [{ name: "dark", path: "/..." | undefined }, ...]
const lightTheme = ctx.ui.getTheme("light");  // Load without switching
const result = ctx.ui.setTheme("light");  // Switch by name
if (!result.success) {
  ctx.ui.notify(`Failed: ${result.error}`, "error");
}
ctx.ui.setTheme(lightTheme!);  // Or switch by Theme object
ctx.ui.theme.fg("accent", "styled text");  // Access current theme
```

自定义工作中指示器帧会按原样渲染。如果需要颜色，请自己把颜色加到帧字符串中，例如使用 `ctx.ui.theme.fg(...)`。

### 自动补全提供器

使用 `ctx.ui.addAutocompleteProvider()` 把自定义自动补全逻辑叠在内置斜杠命令和路径提供器之上。为 `$` 这类自定义自然触发符设置 `triggerCharacters`。

典型模式：

- 检查光标前的文本
- 当匹配到你的扩展特定语法时返回自己的建议
- 否则委托给 `current.getSuggestions(...)`
- 除非需要自定义插入行为，否则委托 `applyCompletion(...)`

```typescript
pi.on("session_start", (_event, ctx) => {
  ctx.ui.addAutocompleteProvider((current) => ({
    triggerCharacters: ["#"],
    async getSuggestions(lines, cursorLine, cursorCol, options) {
      const line = lines[cursorLine] ?? "";
      const beforeCursor = line.slice(0, cursorCol);
      const match = beforeCursor.match(/(?:^|[ \t])#([^\s#]*)$/);
      if (!match) {
        return current.getSuggestions(lines, cursorLine, cursorCol, options);
      }

      return {
        prefix: `#${match[1] ?? ""}`,
        items: [
          { value: "#2983", label: "#2983", description: "Extension API for registering custom @ autocomplete providers" },
          { value: "#2753", label: "#2753", description: "Reload stale resource settings" },
        ],
      };
    },

    applyCompletion(lines, cursorLine, cursorCol, item, prefix) {
      return current.applyCompletion(lines, cursorLine, cursorCol, item, prefix);
    },

    shouldTriggerFileCompletion(lines, cursorLine, cursorCol) {
      return current.shouldTriggerFileCompletion?.(lines, cursorLine, cursorCol) ?? true;
    },
  }));
});
```

完整示例见 [github-issue-autocomplete.ts](../examples/extensions/github-issue-autocomplete.ts)，它用 `gh issue list` 预加载最新的未关闭 GitHub issue，并在本地过滤以实现快速 `#...` 补全。需要 GitHub CLI（`gh`）以及一个 GitHub 仓库检出。

### 自定义组件

对于复杂 UI，使用 `ctx.ui.custom()`。这会暂时用你的组件替换编辑器，直到调用 `done()`：

```typescript
import { Text, Component } from "@earendil-works/pi-tui";

const result = await ctx.ui.custom<boolean>((tui, theme, keybindings, done) => {
  const text = new Text("Press Enter to confirm, Escape to cancel", 1, 1);

  text.onKey = (key) => {
    if (key === "return") done(true);
    if (key === "escape") done(false);
    return true;
  };

  return text;
});

if (result) {
  // User pressed Enter
}
```

回调会收到：
- `tui` - TUI 实例（用于屏幕尺寸、焦点管理）
- `theme` - 当前主题，用于样式
- `keybindings` - 应用快捷键管理器（用于检查快捷键）
- `done(value)` - 调用以关闭组件并返回值

完整组件 API 见 [tui.zh.md](tui.zh.md)。

#### 覆盖层模式（实验性）

传入 `{ overlay: true }`，把组件渲染为叠在现有内容之上的浮动模态框，而不清空屏幕：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  { overlay: true }
);
```

对于高级定位（锚点、边距、百分比、响应式可见性），传入 `overlayOptions`。使用 `onHandle` 以编程方式控制焦点或可见性：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyOverlayComponent({ onClose: done }),
  {
    overlay: true,
    overlayOptions: { anchor: "top-right", width: "50%", margin: 2 },
    onHandle: (handle) => {
      handle.focus(); // focus this overlay and bring it to the visual front
      // handle.unfocus({ target: editorComponent }); // release input to a specific component
      // handle.setHidden(true/false); // toggle visibility
      // handle.hide(); // permanently remove
    }
  }
);
```

获得焦点且可见的覆盖层可以在临时的非覆盖层自定义 UI 关闭后重新夺取输入。如果你有意让另一个组件在覆盖层保持可见时继续接收输入，调用 `handle.unfocus({ target })`。传入 `{ target: null }` 会释放覆盖层，而不把焦点给另一个组件。

完整的 `OverlayOptions` 和 `OverlayHandle` API 见 [tui.zh.md](tui.zh.md)，示例见 [overlay-qa-tests.ts](../examples/extensions/overlay-qa-tests.ts)。

### 自定义编辑器

用自定义实现替换主输入编辑器（vim 模式、emacs 模式等）：

```typescript
import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

class VimEditor extends CustomEditor {
  private mode: "normal" | "insert" = "insert";

  handleInput(data: string): void {
    if (matchesKey(data, "escape") && this.mode === "insert") {
      this.mode = "normal";
      return;
    }
    if (this.mode === "normal" && data === "i") {
      this.mode = "insert";
      return;
    }
    super.handleInput(data);  // App keybindings + text editing
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) =>
      new VimEditor(tui, theme, keybindings)
    );
  });
}
```

**要点：**
- 继承 `CustomEditor`（而不是基类 `Editor`）以获得应用快捷键（escape 中止、ctrl+d、模型切换）
- 对你不处理的按键调用 `super.handleInput(data)`
- 自定义编辑器默认保留独立的工作中行。把 `{ embedWorkingStatus: true }` 作为 `CustomEditor` 构造函数的第四个参数传入，以使用内置的编辑器边框 spinner。
- 工厂从应用收到 `tui`、`theme` 和 `keybindings`
- 在 `setEditorComponent()` 之前使用 `ctx.ui.getEditorComponent()`，以包装先前配置的自定义编辑器
- 传入 `undefined` 以恢复默认：`ctx.ui.setEditorComponent(undefined)`

要与已经替换过编辑器的另一个扩展组合，在设置你的工厂之前先捕获先前的工厂：

```typescript
const previous = ctx.ui.getEditorComponent();
ctx.ui.setEditorComponent((tui, theme, keybindings) =>
  new MyEditor(tui, theme, keybindings, { base: previous?.(tui, theme, keybindings) })
);
```

带模式指示器的完整示例见 [tui.zh.md](tui.zh.md) 模式 7。

### 消息与条目渲染

为带有你的 `customType` 的消息注册自定义渲染器。对应当参与 LLM 上下文的内容使用消息渲染器：

```typescript
import { Text } from "@earendil-works/pi-tui";

pi.registerMessageRenderer("my-extension", (message, options, theme) => {
  const { expanded, outputPad } = options;
  let text = theme.fg("accent", `[${message.customType}] `);
  text += message.content;

  if (expanded && message.details) {
    text += "\n" + theme.fg("dim", JSON.stringify(message.details, null, 2));
  }

  return new Text(text, outputPad, 0);
});
```

消息通过 `pi.sendMessage()` 发送：

```typescript
pi.sendMessage({
  customType: "my-extension",  // Matches registerMessageRenderer
  content: "Status update",
  display: true,               // Show in TUI
  details: { ... },            // Available in renderer
});
```

对于不应发送给 LLM 的 TUI 专用内容，改为渲染自定义条目：

```typescript
pi.registerEntryRenderer("my-card", (entry, options, theme) => {
  return new Text(theme.fg("accent", JSON.stringify(entry.data)));
});

pi.appendEntry("my-card", { status: "done" });
```

### 主题颜色

所有渲染函数都会收到一个 `theme` 对象。创建自定义主题和完整调色板见 [themes.zh.md](themes.zh.md)。

```typescript
// Foreground colors
theme.fg("toolTitle", text)   // Tool names
theme.fg("accent", text)      // Highlights
theme.fg("success", text)     // Success (green)
theme.fg("error", text)       // Errors (red)
theme.fg("warning", text)     // Warnings (yellow)
theme.fg("muted", text)       // Secondary text
theme.fg("dim", text)         // Tertiary text

// Text styles
theme.bold(text)
theme.italic(text)
theme.strikethrough(text)
```

在自定义工具渲染器中做语法高亮：

```typescript
import { highlightCode, getLanguageFromPath } from "@earendil-works/pi-coding-agent";

// Highlight code with explicit language
const highlighted = highlightCode("const x = 1;", "typescript", theme);

// Auto-detect language from file path
const lang = getLanguageFromPath("/path/to/file.rs");  // "rust"
const highlighted = highlightCode(code, lang, theme);
```

## 错误处理

- 扩展错误会被记录，agent 继续运行
- `tool_call` 错误会拦截该工具（故障安全）
- 工具 `execute` 错误必须通过抛出信号；抛出的错误会被捕获，以 `isError: true` 报告给 LLM，然后继续执行

## 模式行为

| 模式 | `ctx.mode` | `ctx.hasUI` | 说明 |
|------|------------|-------------|-------|
| Interactive | `"tui"` | `true` | 带终端渲染的完整 TUI |
| RPC (`--mode rpc`) | `"rpc"` | `true` | 通过 JSON 协议提供对话框和通知；`custom()` 返回 `undefined`。见 [rpc.zh.md](rpc.zh.md) |
| JSON (`--mode json`) | `"json"` | `false` | 事件流输出到 stdout；UI 方法是空操作 |
| Print (`-p`) | `"print"` | `false` | 扩展会运行但不能提示 |

在使用 TUI 专用功能（`custom()`、组件工厂、终端输入）之前检查 `ctx.mode === "tui"`。在使用 TUI 和 RPC 模式都可用的对话框和通知方法之前检查 `ctx.hasUI`。

## 示例参考

所有示例都在 [examples/extensions/](../examples/extensions/)。

| 示例 | 说明 | 关键 API |
|---------|-------------|----------|
| **工具** |||
| `hello.ts` | 最小工具注册 | `registerTool` |
| `question.ts` | 带用户交互的工具 | `registerTool`、`ui.select` |
| `questionnaire.ts` | 多步向导工具 | `registerTool`、`ui.custom` |
| `todo.ts` | 带持久化的有状态工具 | `registerTool`、`appendEntry`、`renderResult`、会话事件 |
| `dynamic-tools.ts` | 启动后以及命令期间注册工具 | `registerTool`、`session_start`、`registerCommand` |
| `structured-output.ts` | 带 `terminate: true` 的最终结构化输出工具 | `registerTool`、terminating 工具结果 |
| `truncated-tool.ts` | 输出截断示例 | `registerTool`、`truncateHead` |
| `tool-override.ts` | 覆盖内置 read 工具 | `registerTool`（与内置同名） |
| **命令** |||
| `pirate.ts` | 按 turn 修改系统提示 | `registerCommand`、`before_agent_start` |
| `summarize.ts` | 对话摘要命令 | `registerCommand`、`ui.custom` |
| `handoff.ts` | 跨提供方模型交接 | `registerCommand`、`ui.editor`、`ui.custom` |
| `qna.ts` | 带自定义 UI 的问答 | `registerCommand`、`ui.custom`、`setEditorText` |
| `send-user-message.ts` | 注入用户消息 | `registerCommand`、`sendUserMessage` |
| `reload-runtime.ts` | 重载命令和 LLM 工具交接 | `registerCommand`、`ctx.reload()`、`sendUserMessage` |
| `shutdown-command.ts` | 优雅关闭命令 | `registerCommand`、`shutdown()` |
| **事件与门禁** |||
| `permission-gate.ts` | 拦截危险命令 | `on("tool_call")`、`ui.confirm` |
| `project-trust.ts` | 从用户/全局或 CLI 扩展决定或推迟项目信任 | `on("project_trust")`、信任 UI、必需的信任结果 |
| `protected-paths.ts` | 阻止写入特定路径 | `on("tool_call")` |
| `confirm-destructive.ts` | 确认会话变更 | `on("session_before_switch")`、`on("session_before_fork")` |
| `dirty-repo-guard.ts` | 在脏 git 仓库上警告 | `on("session_before_*")`、`exec` |
| `input-transform.ts` | 转换用户输入 | `on("input")` |
| `input-transform-streaming.ts` | 感知流式输出的输入转换 | `on("input")`、`streamingBehavior` |
| `model-status.ts` | 响应模型变更 | `on("model_select")`、`setStatus` |
| `provider-payload.ts` | 检查 payload 和提供方响应头 | `on("before_provider_request")`、`on("after_provider_response")` |
| `system-prompt-header.ts` | 显示系统提示信息 | `on("agent_start")`、`getSystemPrompt` |
| `claude-rules.ts` | 从文件加载规则 | `on("session_start")`、`on("before_agent_start")` |
| `prompt-customizer.ts` | 使用 `systemPromptOptions` 添加上下文感知的工具指导 | `on("before_agent_start")`、`BuildSystemPromptOptions` |
| `file-trigger.ts` | 文件监视器触发消息 | `sendMessage` |
| **压缩与会话** |||
| `custom-compaction.ts` | 自定义压缩摘要 | `on("session_before_compact")` |
| `trigger-compact.ts` | 手动触发压缩 | `compact()` |
| `git-checkpoint.ts` | 在 turn 上做 Git stash | `on("turn_start")`、`on("session_before_fork")`、`exec` |
| `git-merge-and-resolve.ts` | 拉取、合并并解决冲突 | `on("agent_end")`、`exec`、`sendUserMessage` |
| `auto-commit-on-exit.ts` | 关闭时提交 | `on("session_shutdown")`、`exec` |
| **UI 组件** |||
| `status-line.ts` | 页脚状态指示器 | `setStatus`、会话事件 |
| `working-indicator.ts` | 自定义流式输出的工作中指示器 | `setWorkingIndicator`、`registerCommand` |
| `github-issue-autocomplete.ts` | 通过预加载 `gh issue list` 的最近未关闭 issue，在内置自动补全之上添加 `#1234` issue 补全 | `addAutocompleteProvider`、`on("session_start")`、`exec` |
| `custom-footer.ts` | 完全替换页脚 | `registerCommand`、`setFooter` |
| `custom-header.ts` | 替换启动页头 | `on("session_start")`、`setHeader` |
| `modal-editor.ts` | Vim 风格模态编辑器 | `setEditorComponent`、`CustomEditor` |
| `rainbow-editor.ts` | 自定义编辑器样式 | `setEditorComponent` |
| `widget-placement.ts` | 编辑器上方/下方的 widget | `setWidget` |
| `overlay-test.ts` | 覆盖层组件 | 带 overlay 选项的 `ui.custom` |
| `overlay-qa-tests.ts` | 全面的覆盖层测试 | `ui.custom`、所有 overlay 选项 |
| `notify.ts` | 简单通知 | `ui.notify` |
| `timed-confirm.ts` | 带超时的对话框 | 带 timeout/signal 的 `ui.confirm` |
| `mac-system-theme.ts` | 自动切换主题 | `setTheme`、`exec` |
| **复杂扩展** |||
| `plan-mode/` | 完整的 plan mode 实现 | 所有事件类型、`registerCommand`、`registerShortcut`、`registerFlag`、`setStatus`、`setWidget`、`sendMessage`、`setActiveTools` |
| `preset.ts` | 可保存的预设（模型、工具、思考） | `registerCommand`、`registerShortcut`、`registerFlag`、`setModel`、`setActiveTools`、`setThinkingLevel`、`appendEntry` |
| `tools.ts` | 开关工具的 UI | `registerCommand`、`setActiveTools`、`SettingsList`、会话事件 |
| **远程与沙箱** |||
| `ssh.ts` | SSH 远程执行 | `registerFlag`、`on("user_bash")`、`on("before_agent_start")`、工具 operations |
| `interactive-shell.ts` | 持久 shell 会话 | `on("user_bash")` |
| `sandbox/` | 沙箱化工具执行 | 工具 operations |
| `gondolin/` | 把内置工具和 `!` 命令路由进 Gondolin micro-VM | 工具 operations、内置工具覆盖、`on("user_bash")` |
| `subagent/` | 生成子 agent | `registerTool`、`exec` |
| **游戏** |||
| `snake.ts` | 贪吃蛇游戏 | `registerCommand`、`ui.custom`、键盘处理 |
| `space-invaders.ts` | 太空侵略者游戏 | `registerCommand`、`ui.custom` |
| `doom-overlay/` | 覆盖层中的 Doom | 带 overlay 的 `ui.custom` |
| **提供方** |||
| `custom-provider-anthropic/` | 自定义 Anthropic 代理 | `registerProvider` |
| `custom-provider-gitlab-duo/` | GitLab Duo 集成 | 带 OAuth 的 `registerProvider` |
| **消息与通信** |||
| `message-renderer.ts` | 自定义消息渲染 | `registerMessageRenderer`、`sendMessage` |
| `entry-renderer.ts` | 仅 TUI 的自定义条目渲染 | `registerEntryRenderer`、`appendEntry` |
| `event-bus.ts` | 扩展间事件 | `pi.events` |
| **会话元数据** |||
| `session-name.ts` | 为选择器命名会话 | `setSessionName`、`getSessionName` |
| `bookmark.ts` | 为 /tree 给条目加书签 | `setLabel` |
| **杂项** |||
| `inline-bash.ts` | 工具调用中的内联 bash | `on("tool_call")` |
| `bash-spawn-hook.ts` | 在执行前调整 bash 命令、cwd 和 env | `createBashTool`、`spawnHook` |
| `with-deps/` | 带 npm 依赖的扩展 | 带 `package.json` 的软件包结构 |
