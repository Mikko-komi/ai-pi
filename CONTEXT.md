# Pi Agent Harness（学习用词汇）

本仓库是可扩展的终端 coding agent 及其底层运行时。这份 glossary 只服务本学习分支上的阅读约定，不描述实现细节。

## Language

**学习注释**:
本学习分支里给源码加的中文 JSDoc：保留英文，在同一块后面写中文职责与不变量；只写 `export` 的类型 / 函数 / 类头，不写类方法。
_Avoid_: 文档翻译, 产品注释, 中文 README, 逐条译英文, 方法级注释

**导出符号**:
带 `export` 的类型、函数、类。类上的方法不算。
_Avoid_: public 方法, 内部 class

**第一刀核心**:
已完成：`packages/agent/src/agent.ts`、`packages/agent/src/agent-loop.ts`、`packages/agent/src/types.ts`、`packages/coding-agent/src/core/agent-session.ts`。
_Avoid_: 核心代码（未限定范围时）

**第二刀核心**:
已完成：agent 的 stream / proxy / search、harness 门面与类型、coding-agent 的 SDK / SessionManager / ModelRuntime。
_Avoid_: 工具实现细节, telemetry schema 别名

**第三刀核心**:
已完成：`packages/coding-agent/src/core` 除 `tools/` 与 `export-html/` 外的导出符号。
_Avoid_: 工具实现, HTML 导出渲染

**第四刀核心**:
已完成：`packages/coding-agent/src/core/tools` 与 `export-html` 的导出符号。
_Avoid_: 类方法, 再导出

**第五刀核心**:
已完成：agent harness 的 compaction、execution、tools、utils，以及 config / events / hooks / Node 环境。
_Avoid_: session 持久化, runtime drive

**第六刀核心**:
已完成：agent harness 的 session 公共类型、commit / fork / memory、以及 jsonl 存储合同。
_Avoid_: testing 夹具, runtime drive

**第七刀核心**:
已完成：AgentHarness 门面剩余结果/事件类型、telemetry schema、runtime 公共入口（Harness / Lane / restore / transcript）。
_Avoid_: drive 内部过程

**第八刀核心**:
已完成：`packages/agent/src/harness/runtime/drive` 的过程导出。agent + coding-agent/src/core 的学习 JSDoc 到此结束。
_Avoid_: 测试夹具, 类方法, 再导出

**第九刀核心**:
已完成：pi-ai 的公共合同（types / Models / auth / utils / compat / faux），不含生成目录和各厂商 API 适配器。
_Avoid_: models.generated.ts, 厂商 *.models.ts, oauth 实现

**第十刀核心**:
已完成：coding-agent 进程入口、config / CLI / print·rpc·interactive 模式（不含 components）。
_Avoid_: TUI 组件, experimental CLI

**第十一刀核心**:
已完成：`packages/coding-agent/src/utils` 的导出符号。
_Avoid_: .d.ts, 再导出

**第十二刀核心**:
已完成：`packages/tui/src` 的导出符号（TUI 门面、按键、布局、组件）。
_Avoid_: 类方法, native 构建脚本

**第十三刀核心**:
已完成：`packages/chord/src` 的导出符号（facet / service / replicated state / delta）。
_Avoid_: 再导出, 测试夹具

**第十四刀核心**:
已完成：interactive TUI 组件与 llama 扩展导出。
_Avoid_: 类方法, experimental

**第十五刀核心**:
已完成：telemetry / protocol 公共合同，以及 pi-ai 剩余非适配器入口。
_Avoid_: 厂商 API 适配器, experimental

**第十六刀核心**:
已完成：`packages/server` 与 `packages/client` 的导出符号。
_Avoid_: 类方法, 再导出

**第十七刀核心**:
已完成：pi-ai 各厂商流式 API 适配器（anthropic / openai / google / bedrock 等）。
_Avoid_: *.models.ts 目录

**AgentHarness**:
agent-core 里按 lane 驱动持久化会话的门面，和旧的 `Agent` 循环并列，不替代 `AgentSession`。
_Avoid_: Agent, AgentSession

**Agent 循环**:
agent-core 里从用户消息走到模型调用、工具执行、再决定是否下一轮的过程。入口是 `agentLoop` / `runAgentLoop`。
_Avoid_: Agent 运行时, harness

**Agent**:
agent-core 对外的有状态门面：持有消息、队列、订阅，并驱动 Agent 循环。
_Avoid_: AgentSession, coding agent

**AgentSession**:
coding-agent 里包住 Agent 的会话门面。交互 / print / RPC / SDK 四种模式共用它，并在之上做持久化、模型切换、compaction、分支。
_Avoid_: Session（harness 里另有同名类型）
