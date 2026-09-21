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
本轮要加学习注释的四个文件：`packages/agent/src/agent.ts`、`packages/agent/src/agent-loop.ts`、`packages/agent/src/types.ts`、`packages/coding-agent/src/core/agent-session.ts`。
_Avoid_: 核心代码（未限定范围时）

**Agent 循环**:
agent-core 里从用户消息走到模型调用、工具执行、再决定是否下一轮的过程。入口是 `agentLoop` / `runAgentLoop`。
_Avoid_: Agent 运行时, harness

**Agent**:
agent-core 对外的有状态门面：持有消息、队列、订阅，并驱动 Agent 循环。
_Avoid_: AgentSession, coding agent

**AgentSession**:
coding-agent 里包住 Agent 的会话门面。交互 / print / RPC / SDK 四种模式共用它，并在之上做持久化、模型切换、compaction、分支。
_Avoid_: Session（harness 里另有同名类型）
