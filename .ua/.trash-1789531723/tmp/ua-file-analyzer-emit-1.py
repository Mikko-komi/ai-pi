#!/usr/bin/env python3
"""Emit batch-1 knowledge-graph fragments from extraction + semantic analysis."""
from __future__ import annotations

import json
import math
from pathlib import Path

UA_DIR = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
BRIEF = json.loads((UA_DIR / "intermediate/batch-briefs/batch-1.json").read_text())
IMPORTS: dict[str, list[str]] = BRIEF["batchImportData"]
NEIGHBOR_MAP: dict[str, list[dict]] = BRIEF["neighborMap"]

# node helpers
def file_node(path, name, summary, tags, complexity, languageNotes=None):
    n = {
        "id": f"file:{path}",
        "type": "file",
        "name": name,
        "filePath": path,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if languageNotes:
        n["languageNotes"] = languageNotes
    return n


def fn_node(path, name, start, end, summary, tags, complexity, languageNotes=None):
    n = {
        "id": f"function:{path}:{name}",
        "type": "function",
        "name": name,
        "filePath": path,
        "lineRange": [start, end],
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if languageNotes:
        n["languageNotes"] = languageNotes
    return n


def cl_node(path, name, start, end, summary, tags, complexity, languageNotes=None):
    n = {
        "id": f"class:{path}:{name}",
        "type": "class",
        "name": name,
        "filePath": path,
        "lineRange": [start, end],
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if languageNotes:
        n["languageNotes"] = languageNotes
    return n


def edge(src, tgt, typ, weight):
    return {"source": src, "target": tgt, "type": typ, "direction": "forward", "weight": weight}


nodes: list[dict] = []
extra_edges: list[dict] = []

# ---------------------------------------------------------------------------
# File + symbol nodes
# ---------------------------------------------------------------------------
P = {
    "agent_node": "packages/agent/src/node.ts",
    "bundler": "packages/chord/src/bundler.ts",
    "ctx": "packages/chord/src/context/index.ts",
    "chord_idx": "packages/chord/src/index.ts",
    "chord_node": "packages/chord/src/node.ts",
    "client": "packages/client/src/client.ts",
    "conn": "packages/client/src/connection.ts",
    "errors": "packages/client/src/errors.ts",
    "client_idx": "packages/client/src/index.ts",
    "promise": "packages/client/src/promise.ts",
    "transport": "packages/client/src/transport.ts",
    "types": "packages/client/src/types.ts",
    "unix": "packages/client/src/unix.ts",
    "cli": "packages/coding-agent/src/cli/experimental/cli.ts",
    "cmdopt": "packages/coding-agent/src/cli/experimental/command-options.ts",
    "cmd": "packages/coding-agent/src/cli/experimental/command.ts",
    "cmd_client": "packages/coding-agent/src/cli/experimental/commands/client.ts",
    "cmd_server": "packages/coding-agent/src/cli/experimental/commands/server.ts",
    "runtime": "packages/coding-agent/src/experimental/client-runtime.ts",
    "tui": "packages/coding-agent/src/experimental/client-tui.ts",
    "exp_client": "packages/coding-agent/src/experimental/client.ts",
    "exp_cmds": "packages/coding-agent/src/experimental/commands.ts",
    "coord_entry": "packages/coding-agent/src/experimental/coordinator-entry.ts",
    "coord": "packages/coding-agent/src/experimental/coordinator.ts",
    "bundled": "packages/coding-agent/src/experimental/plugins/bundled.ts",
    "pkg": "packages/coding-agent/src/experimental/plugins/package.ts",
    "proc": "packages/coding-agent/src/experimental/process.ts",
    "rauth": "packages/coding-agent/src/experimental/radius-auth.ts",
    "relay": "packages/coding-agent/src/experimental/radius-relay.ts",
    "server": "packages/coding-agent/src/experimental/server.ts",
    "acp": "packages/coding-agent/src/experimental/services/agent-controller-provider.ts",
    "ac": "packages/coding-agent/src/experimental/services/agent-controller.ts",
    "svc_conn": "packages/coding-agent/src/experimental/services/connection.ts",
}

# agent/node
nodes.append(file_node(
    P["agent_node"], "node.ts",
    "Node 运行时 barrel：再导出 NodeExecutionEnv 以及 @pi-agent-core 公共 API，供 experimental server 绑定本机执行环境。",
    ["barrel", "入口点", "node", "execution-env"],
    "simple",
    "仅做 export 转发，不包含实现。",
))

# chord/bundler
nodes.append(file_node(
    P["bundler"], "bundler.ts",
    "Chord Node bundler 的公开入口：再导出 bundleFacets / bundleFacetPackage 及对应类型，供插件打包使用。",
    ["barrel", "bundler", "plugin", "node"],
    "simple",
))

# chord/context
nodes += [
    file_node(
        P["ctx"], "index.ts",
        "实现 Chord Context：不可变键值链、AbortSignal 派生，以及可随 context 取消的 awaitWithContext。",
        ["context", "cancellation", "utility", "type-definition"],
        "moderate",
        "采用类似 Go context 的不可变派生：withContextValue / withAbortSignal / withCancel 返回新 Context，不修改父级。",
    ),
    fn_node(P["ctx"], "createContextKey", 58, 60,
            "用 Symbol token 创建冻结的 ContextKey，供 withContextValue 存取类型安全的上下文值。",
            ["factory", "context", "type-definition"], "simple"),
    fn_node(P["ctx"], "withContextValue", 63, 65,
            "从 parent 派生一层 ContextValue，覆盖或新增单个 key。",
            ["context", "factory", "immutable"], "simple"),
    fn_node(P["ctx"], "withAbortSignal", 71, 75,
            "把外部 AbortSignal 与父 context 信号用 AbortSignal.any 合并后写入新 context。",
            ["context", "cancellation", "abort-signal"], "simple"),
    fn_node(P["ctx"], "withoutAbortSignal", 78, 80,
            "派生一个清除了 AbortSignal 的 context，使后续 await 不再跟随父级取消。",
            ["context", "cancellation", "utility"], "simple"),
    fn_node(P["ctx"], "withCancel", 83, 92,
            "派生带独立 AbortController 的 context，并返回 cancel 回调。",
            ["context", "cancellation", "factory"], "simple"),
    fn_node(P["ctx"], "awaitWithContext", 98, 116,
            "等待 promise，同时在 context AbortSignal 触发时立刻 reject，并清理 listener。",
            ["context", "cancellation", "promise"], "moderate"),
    cl_node(P["ctx"], "BaseContext", 7, 14,
            "Context 抽象基类：约定 value/toString，并通过固定 key 暴露 abortSignal。",
            ["context", "abstract", "base-class"], "simple"),
    cl_node(P["ctx"], "EmptyContext", 16, 31,
            "空上下文实现：lookup 恒为 undefined，用作 BACKGROUND_CONTEXT / TODO_CONTEXT。",
            ["context", "sentinel", "immutable"], "simple"),
    cl_node(P["ctx"], "ContextValue", 33, 53,
            "单键覆盖的链表节点：本层命中则返回值，否则委托 parent.value。",
            ["context", "immutable", "linked-list"], "simple"),
]
extra_edges += [
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:createContextKey", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withContextValue", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withAbortSignal", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withoutAbortSignal", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withCancel", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:awaitWithContext", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"class:{P['ctx']}:BaseContext", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"class:{P['ctx']}:EmptyContext", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"class:{P['ctx']}:ContextValue", "contains", 1.0),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:createContextKey", "exports", 0.8),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withContextValue", "exports", 0.8),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withAbortSignal", "exports", 0.8),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withoutAbortSignal", "exports", 0.8),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:withCancel", "exports", 0.8),
    edge(f"file:{P['ctx']}", f"function:{P['ctx']}:awaitWithContext", "exports", 0.8),
    edge(f"class:{P['ctx']}:EmptyContext", f"class:{P['ctx']}:BaseContext", "inherits", 0.9),
    edge(f"class:{P['ctx']}:ContextValue", f"class:{P['ctx']}:BaseContext", "inherits", 0.9),
    edge(f"function:{P['ctx']}:withAbortSignal", f"function:{P['ctx']}:withContextValue", "calls", 0.8),
    edge(f"function:{P['ctx']}:withoutAbortSignal", f"function:{P['ctx']}:withContextValue", "calls", 0.8),
    edge(f"function:{P['ctx']}:withCancel", f"function:{P['ctx']}:withAbortSignal", "calls", 0.8),
]

# chord index / node
nodes.append(file_node(
    P["chord_idx"], "index.ts",
    "Chord 组合运行时的公共 barrel：导出 facet/service API、远程服务编解码与全部核心类型。",
    ["barrel", "入口点", "facet", "service"],
    "moderate",
    "纯再导出，实现分别在 api.ts、services/* 与 types.ts。",
))
nodes.append(file_node(
    P["chord_node"], "node.ts",
    "Chord Node 侧 barrel：导出 facet bundle loader、artifact 读取与清单格式常量。",
    ["barrel", "node", "plugin", "loader"],
    "simple",
))

# client.ts
nodes += [
    file_node(
        P["client"], "client.ts",
        "Pi 协议客户端：管理 Connection 生命周期、RPC request、服务目录与有序 service 订阅。",
        ["rpc", "client", "service", "protocol"],
        "complex",
    ),
    cl_node(P["client"], "Client", 62, 445,
            "面向调用方的协议客户端：握手、附件会话、request/subscribeService，以及连接态与 attachment 监听。",
            ["client", "rpc", "service", "lifecycle"], "complex"),
    fn_node(P["client"], "createClientServiceTransport", 448, 474,
            "把 Client.request / subscribeService 适配为 Chord RemoteServiceTransport。",
            ["adapter", "service", "factory"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['client']}", f"class:{P['client']}:Client", "contains", 1.0),
    edge(f"file:{P['client']}", f"function:{P['client']}:createClientServiceTransport", "contains", 1.0),
    edge(f"file:{P['client']}", f"class:{P['client']}:Client", "exports", 0.8),
    edge(f"file:{P['client']}", f"function:{P['client']}:createClientServiceTransport", "exports", 0.8),
    edge(f"class:{P['client']}:Client", f"class:{P['conn']}:Connection", "calls", 0.8),
    edge(f"class:{P['client']}:Client", f"function:{P['promise']}:createPromiseResolvers", "calls", 0.8),
    edge(f"class:{P['client']}:Client", f"function:{P['errors']}:toError", "calls", 0.8),
    edge(f"class:{P['client']}:Client", f"class:{P['errors']}:ServerError", "calls", 0.8),
    edge(f"class:{P['client']}:Client", f"class:{P['errors']}:DisconnectedError", "calls", 0.8),
    edge(f"class:{P['client']}:Client", f"class:{P['errors']}:ClientDisposedError", "calls", 0.8),
    edge(f"class:{P['client']}:Client", "function:packages/protocol/src/index.ts:isServerId", "calls", 0.8),
    edge(f"function:{P['client']}:createClientServiceTransport", f"class:{P['client']}:Client", "calls", 0.8),
]

# connection.ts
nodes += [
    file_node(
        P["conn"], "connection.ts",
        "字节传输之上的协议连接状态机：握手、分帧解码、send/fail，以及 connecting/connected/disconnected 生命周期。",
        ["connection", "protocol", "state-machine", "transport"],
        "complex",
    ),
    cl_node(P["conn"], "Connection", 41, 245,
            "封装 ByteTransportFactory：完成 hello 握手、按序发送 ClientMessage，并把关闭/错误归一成 DisconnectedError。",
            ["connection", "state-machine", "protocol"], "complex"),
]
extra_edges += [
    edge(f"file:{P['conn']}", f"class:{P['conn']}:Connection", "contains", 1.0),
    edge(f"file:{P['conn']}", f"class:{P['conn']}:Connection", "exports", 0.8),
    edge(f"class:{P['conn']}:Connection", f"function:{P['promise']}:createPromiseResolvers", "calls", 0.8),
    edge(f"class:{P['conn']}:Connection", f"function:{P['errors']}:toDisconnectedError", "calls", 0.8),
    edge(f"class:{P['conn']}:Connection", f"function:{P['errors']}:toError", "calls", 0.8),
    edge(f"class:{P['conn']}:Connection", f"class:{P['errors']}:ServerError", "calls", 0.8),
]

# errors.ts
nodes += [
    file_node(
        P["errors"], "errors.ts",
        "客户端错误类型：ServerError、DisconnectedError、ClientDisposedError，以及 unknown → Error 的归一化助手。",
        ["error-handling", "错误处理", "type-definition"],
        "simple",
    ),
    cl_node(P["errors"], "ServerError", 3, 11,
            "包装协议层 ProtocolError，保留 ProtocolErrorCode。",
            ["error-handling", "protocol", "rpc"], "simple"),
    cl_node(P["errors"], "DisconnectedError", 13, 18,
            "表示传输已断开；可携带 cause，供连接状态机统一失败路径。",
            ["error-handling", "connection", "transport"], "simple"),
    cl_node(P["errors"], "ClientDisposedError", 20, 25,
            "在 Client.dispose 之后继续调用 API 时抛出。",
            ["error-handling", "lifecycle", "client"], "simple"),
    fn_node(P["errors"], "toError", 27, 29,
            "把 unknown 收成 Error，非 Error 则 String() 包装。",
            ["error-handling", "utility", "normalization"], "simple"),
    fn_node(P["errors"], "toDisconnectedError", 31, 34,
            "把任意失败收成 DisconnectedError，已是该类型则原样返回。",
            ["error-handling", "utility", "connection"], "simple"),
]
extra_edges += [
    edge(f"file:{P['errors']}", f"class:{P['errors']}:ServerError", "contains", 1.0),
    edge(f"file:{P['errors']}", f"class:{P['errors']}:DisconnectedError", "contains", 1.0),
    edge(f"file:{P['errors']}", f"class:{P['errors']}:ClientDisposedError", "contains", 1.0),
    edge(f"file:{P['errors']}", f"function:{P['errors']}:toError", "contains", 1.0),
    edge(f"file:{P['errors']}", f"function:{P['errors']}:toDisconnectedError", "contains", 1.0),
    edge(f"file:{P['errors']}", f"class:{P['errors']}:ServerError", "exports", 0.8),
    edge(f"file:{P['errors']}", f"class:{P['errors']}:DisconnectedError", "exports", 0.8),
    edge(f"file:{P['errors']}", f"class:{P['errors']}:ClientDisposedError", "exports", 0.8),
    edge(f"file:{P['errors']}", f"function:{P['errors']}:toError", "exports", 0.8),
    edge(f"file:{P['errors']}", f"function:{P['errors']}:toDisconnectedError", "exports", 0.8),
    edge(f"function:{P['errors']}:toDisconnectedError", f"function:{P['errors']}:toError", "calls", 0.8),
]

# client index / promise / transport / types
nodes.append(file_node(
    P["client_idx"], "index.ts",
    "pi-client 包公共 barrel：再导出 Client、错误类型与连接/订阅相关类型。",
    ["barrel", "入口点", "client"],
    "simple",
))
nodes += [
    file_node(
        P["promise"], "promise.ts",
        "提供 createPromiseResolvers，在 TypeScript lib 升到 ES2024 前替代 Promise.withResolvers。",
        ["utility", "promise", "polyfill"],
        "simple",
        "注释标明待基线升级后删除。",
    ),
    fn_node(P["promise"], "createPromiseResolvers", 8, 16,
            "返回 {promise, resolve, reject}，供握手与 request 在类字段上挂起。",
            ["utility", "promise", "factory"], "simple"),
]
extra_edges += [
    edge(f"file:{P['promise']}", f"function:{P['promise']}:createPromiseResolvers", "contains", 1.0),
    edge(f"file:{P['promise']}", f"function:{P['promise']}:createPromiseResolvers", "exports", 0.8),
]
nodes.append(file_node(
    P["transport"], "transport.ts",
    "定义 ByteTransport / ByteTransportFactory / ByteTransportHandlers：有序字节块发送与单一终态回调。",
    ["type-definition", "transport", "interface"],
    "simple",
))
nodes.append(file_node(
    P["types"], "types.ts",
    "客户端公开类型：ConnectionState、ClientOptions、ServiceSubscription 与各类 listener 签名。",
    ["type-definition", "client", "service"],
    "simple",
))

# unix.ts
nodes += [
    file_node(
        P["unix"], "unix.ts",
        "Unix domain socket 传输：发现 *.sock 上的本地 server、探测握手，并实现带背压的 ByteTransport。",
        ["unix-socket", "transport", "discovery", "node"],
        "complex",
        "Windows 上直接拒绝；发现阶段限制并发探测数量。",
    ),
    fn_node(P["unix"], "discoverUnixServers", 37, 85,
            "扫描目录中的 serverId.sock，lstat 确认为 socket 后并发 probe，按 serverId 排序返回路由。",
            ["discovery", "unix-socket", "async"], "moderate"),
    fn_node(P["unix"], "createUnixTransportFactory", 88, 91,
            "校验选项后返回连接指定 path 的 ByteTransportFactory。",
            ["factory", "transport", "unix-socket"], "simple"),
    fn_node(P["unix"], "connectUnixSocket", 103, 145,
            "用 net.createConnection 建立 socket，接线 onData/onClose/onError，并在失败时 destroy。",
            ["transport", "unix-socket", "node"], "moderate"),
    fn_node(P["unix"], "probeUnixServer", 237, 286,
            "短生命周期 Client.connect 探测 socket 是否完成握手，超时或协议错误则视为不可达。",
            ["discovery", "probe", "client"], "moderate"),
    fn_node(P["unix"], "isErrorCode", 290, 299,
            "判断 unknown 是否为带指定 Node errno 的系统错误。",
            ["error-handling", "utility", "node"], "simple"),
    cl_node(P["unix"], "UnixByteTransport", 147, 235,
            "实现 ByteTransport：按块 write、限制 pending bytes，close 时 destroy socket。",
            ["transport", "unix-socket", "backpressure"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['unix']}", f"function:{P['unix']}:discoverUnixServers", "contains", 1.0),
    edge(f"file:{P['unix']}", f"function:{P['unix']}:createUnixTransportFactory", "contains", 1.0),
    edge(f"file:{P['unix']}", f"function:{P['unix']}:connectUnixSocket", "contains", 1.0),
    edge(f"file:{P['unix']}", f"function:{P['unix']}:probeUnixServer", "contains", 1.0),
    edge(f"file:{P['unix']}", f"function:{P['unix']}:isErrorCode", "contains", 1.0),
    edge(f"file:{P['unix']}", f"class:{P['unix']}:UnixByteTransport", "contains", 1.0),
    edge(f"file:{P['unix']}", f"function:{P['unix']}:discoverUnixServers", "exports", 0.8),
    edge(f"file:{P['unix']}", f"function:{P['unix']}:createUnixTransportFactory", "exports", 0.8),
    edge(f"function:{P['unix']}:discoverUnixServers", f"function:{P['unix']}:probeUnixServer", "calls", 0.8),
    edge(f"function:{P['unix']}:discoverUnixServers", f"function:{P['unix']}:isErrorCode", "calls", 0.8),
    edge(f"function:{P['unix']}:discoverUnixServers", "function:packages/protocol/src/index.ts:isServerId", "calls", 0.8),
    edge(f"function:{P['unix']}:createUnixTransportFactory", f"function:{P['unix']}:connectUnixSocket", "calls", 0.8),
    edge(f"function:{P['unix']}:connectUnixSocket", f"class:{P['unix']}:UnixByteTransport", "calls", 0.8),
    edge(f"function:{P['unix']}:probeUnixServer", f"class:{P['client']}:Client", "calls", 0.8),
]

# cli experimental
nodes.append(file_node(
    P["cli"], "cli.ts",
    "拼装 experimental 根 Command：挂上 server / client 子命令，缺省参数时返回用法错误。",
    ["cli", "entry-point", "experimental", "command"],
    "simple",
))
nodes += [
    file_node(
        P["cmdopt"], "command-options.ts",
        "共享 CLI 选项：解析 --auth-token/--auth-token-file，以及 unix:/radius: 的 --connect 地址。",
        ["cli", "validation", "auth", "transport"],
        "moderate",
    ),
    fn_node(P["cmdopt"], "parseAuthInput", 24, 38,
            "互斥校验 token 与 token-file，生成 AuthInput 或错误列表。",
            ["validation", "auth", "cli"], "moderate"),
    fn_node(P["cmdopt"], "parseTransportAddress", 40, 87,
            "把 --connect URL 解析为 unix path 或 radius serverId，拒绝非法协议与凭据。",
            ["validation", "transport", "cli"], "moderate"),
    fn_node(P["cmdopt"], "parseAuth", 96, 101,
            "从 ParsedCommandInput 读取鉴权选项并委托 parseAuthInput。",
            ["cli", "auth", "adapter"], "simple"),
    fn_node(P["cmdopt"], "unsupportedOptions", 103, 106,
            "当残留未知 argv 时返回“实验命令尚不支持现有 CLI 选项”的错误。",
            ["cli", "validation", "error-handling"], "simple"),
]
extra_edges += [
    edge(f"file:{P['cmdopt']}", f"function:{P['cmdopt']}:parseAuthInput", "contains", 1.0),
    edge(f"file:{P['cmdopt']}", f"function:{P['cmdopt']}:parseTransportAddress", "contains", 1.0),
    edge(f"file:{P['cmdopt']}", f"function:{P['cmdopt']}:parseAuth", "contains", 1.0),
    edge(f"file:{P['cmdopt']}", f"function:{P['cmdopt']}:unsupportedOptions", "contains", 1.0),
    edge(f"file:{P['cmdopt']}", f"function:{P['cmdopt']}:parseAuth", "exports", 0.8),
    edge(f"file:{P['cmdopt']}", f"function:{P['cmdopt']}:unsupportedOptions", "exports", 0.8),
    edge(f"function:{P['cmdopt']}:parseAuth", f"function:{P['cmdopt']}:parseAuthInput", "calls", 0.8),
    edge(f"function:{P['cmdopt']}:parseTransportAddress", "function:packages/protocol/src/index.ts:isServerId", "calls", 0.8),
]
nodes += [
    file_node(
        P["cmd"], "command.ts",
        "无第三方依赖的 CLI 框架：选项解析、子命令路由、build/action 两阶段执行。",
        ["cli", "parser", "framework", "experimental"],
        "moderate",
        "刻意不依赖 commander，以便实验命令与发布 CLI 隔离。",
    ),
    fn_node(P["cmd"], "valueOption", 24, 30,
            "构造带自定义 parse 的命名选项描述符。",
            ["cli", "factory", "parser"], "simple"),
    fn_node(P["cmd"], "stringOption", 32, 37,
            "valueOption 的字符串快捷封装。",
            ["cli", "factory", "parser"], "simple"),
    fn_node(P["cmd"], "flagOption", 39, 41,
            "构造布尔 flag 选项（出现即为 true）。",
            ["cli", "factory", "parser"], "simple"),
    cl_node(P["cmd"], "Command", 73, 225,
            "可嵌套命令：注册 option/subcommand，parse 校验 argv，execute 调用 builder 与 action。",
            ["cli", "parser", "command"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['cmd']}", f"function:{P['cmd']}:valueOption", "contains", 1.0),
    edge(f"file:{P['cmd']}", f"function:{P['cmd']}:stringOption", "contains", 1.0),
    edge(f"file:{P['cmd']}", f"function:{P['cmd']}:flagOption", "contains", 1.0),
    edge(f"file:{P['cmd']}", f"class:{P['cmd']}:Command", "contains", 1.0),
    edge(f"file:{P['cmd']}", f"function:{P['cmd']}:valueOption", "exports", 0.8),
    edge(f"file:{P['cmd']}", f"function:{P['cmd']}:stringOption", "exports", 0.8),
    edge(f"file:{P['cmd']}", f"function:{P['cmd']}:flagOption", "exports", 0.8),
    edge(f"file:{P['cmd']}", f"class:{P['cmd']}:Command", "exports", 0.8),
    edge(f"function:{P['cmd']}:stringOption", f"function:{P['cmd']}:valueOption", "calls", 0.8),
]
nodes.append(file_node(
    P["cmd_client"], "client.ts",
    "定义 experimental client 子命令：连接、会话选择、模型/插件与 prompt，并回调 context.runClient。",
    ["cli", "command", "client", "experimental"],
    "moderate",
))
nodes.append(file_node(
    P["cmd_server"], "server.ts",
    "定义 experimental server 子命令：serverId、sessionDir、模型与插件包，并回调 context.runServer。",
    ["cli", "command", "server", "experimental"],
    "moderate",
))

# client-runtime
nodes += [
    file_node(
        P["runtime"], "client-runtime.ts",
        "打开 experimental 客户端运行时：发现或激活 Unix/Radius server，挂上 server/session 服务源并支持重连。",
        ["client", "runtime", "service", "experimental"],
        "complex",
    ),
    fn_node(P["runtime"], "openClientRuntime", 53, 183,
            "按 ClientCommand 解析路由、建立 Client 与服务源，自动激活本地 server，并返回可 dispose 的 ClientRuntime。",
            ["factory", "client", "runtime", "lifecycle"], "complex"),
    fn_node(P["runtime"], "activateBuiltinClientServices", 186, 223,
            "打开 server/session 命名空间，绑定 SessionDirectory/Management/Plugins/Models/AgentController/Transcript。",
            ["service", "activation", "client"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['runtime']}", f"function:{P['runtime']}:openClientRuntime", "contains", 1.0),
    edge(f"file:{P['runtime']}", f"function:{P['runtime']}:activateBuiltinClientServices", "contains", 1.0),
    edge(f"file:{P['runtime']}", f"function:{P['runtime']}:openClientRuntime", "exports", 0.8),
    edge(f"file:{P['runtime']}", f"function:{P['runtime']}:activateBuiltinClientServices", "exports", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['unix']}:discoverUnixServers", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['unix']}:createUnixTransportFactory", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"class:{P['client']}:Client", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['server']}:resolveServerDirectory", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['server']}:resolveSessionDirectory", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['server']}:activateServer", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['relay']}:createRadiusClientTransportFactory", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"class:{P['relay']}:RadiusClientReconnect", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"class:{P['rauth']}:RadiusRelayAuthResolver", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['svc_conn']}:createServerServiceSource", "calls", 0.8),
    edge(f"function:{P['runtime']}:openClientRuntime", f"function:{P['svc_conn']}:createSessionServiceSource", "calls", 0.8),
    edge(f"function:{P['runtime']}:activateBuiltinClientServices", "class:packages/coding-agent/src/experimental/services/sessions.ts:SessionDirectory", "calls", 0.8),
    edge(f"function:{P['runtime']}:activateBuiltinClientServices", "class:packages/coding-agent/src/experimental/services/sessions.ts:SessionManagement", "calls", 0.8),
]

# client-tui
nodes += [
    file_node(
        P["tui"], "client-tui.ts",
        "experimental 交互 TUI：基于复制的 main-lane snapshot 渲染聊天、斜杠命令、会话选择与主题。",
        ["tui", "component", "client", "experimental"],
        "complex",
    ),
    cl_node(P["tui"], "ExperimentalClientTui", 91, 627,
            "实现 TUI Component：组装 viewport/editor/slash-command，驱动 AgentController 与 PresentationUI。",
            ["tui", "component", "client"], "complex"),
    fn_node(P["tui"], "prepareClientSession", 629, 725,
            "打开 runtime、列举或创建 session，加载 presentation plugin artifacts，返回 PreparedClientSession。",
            ["session", "client", "plugin"], "moderate"),
    fn_node(P["tui"], "runClientTui", 727, 795,
            "创建 interactive TUI 与 ExperimentalClientTui，处理会话选择后进入主循环。",
            ["entry-point", "tui", "client"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['tui']}", f"class:{P['tui']}:ExperimentalClientTui", "contains", 1.0),
    edge(f"file:{P['tui']}", f"function:{P['tui']}:prepareClientSession", "contains", 1.0),
    edge(f"file:{P['tui']}", f"function:{P['tui']}:runClientTui", "contains", 1.0),
    edge(f"file:{P['tui']}", f"class:{P['tui']}:ExperimentalClientTui", "exports", 0.8),
    edge(f"file:{P['tui']}", f"function:{P['tui']}:runClientTui", "exports", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", f"function:{P['tui']}:prepareClientSession", "calls", 0.8),
    edge(f"function:{P['tui']}:runClientTui", f"class:{P['tui']}:ExperimentalClientTui", "calls", 0.8),
    edge(f"function:{P['tui']}:prepareClientSession", f"function:{P['runtime']}:openClientRuntime", "calls", 0.8),
    edge(f"function:{P['tui']}:runClientTui", f"function:{P['runtime']}:openClientRuntime", "calls", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", "function:packages/tui/src/index.ts:setKeybindings", "calls", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", "function:packages/coding-agent/src/modes/interactive/chat-viewport.ts:createChatViewport", "calls", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", "function:packages/coding-agent/src/modes/interactive/tui-renderer.ts:createInteractiveTui", "calls", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", "class:packages/coding-agent/src/experimental/client-tui-chat.ts:ExperimentalChatView", "calls", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", "class:packages/coding-agent/src/core/keybindings.ts:KeybindingsManager", "calls", 0.8),
    edge(f"function:{P['tui']}:prepareClientSession", f"function:{P['bundled']}:createPresentationFacetLoaders", "calls", 0.8),
    edge(f"class:{P['tui']}:ExperimentalClientTui", "class:packages/tui/src/index.ts:Component", "implements", 0.9),
]

# experimental client + commands
nodes += [
    file_node(
        P["exp_client"], "client.ts",
        "无 TUI 的 experimental 客户端：发现 session、attach，或对选中 session 发送 prompt 并收集 assistant 文本。",
        ["client", "cli", "session", "experimental"],
        "moderate",
    ),
    fn_node(P["exp_client"], "runClient", 25, 117,
            "打开 runtime、按 sessionId/continue/resume/prompt 分流：列表、attach 或 prompt 并订阅 Transcript。",
            ["client", "session", "orchestration"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['exp_client']}", f"function:{P['exp_client']}:runClient", "contains", 1.0),
    edge(f"file:{P['exp_client']}", f"function:{P['exp_client']}:runClient", "exports", 0.8),
    edge(f"function:{P['exp_client']}:runClient", f"function:{P['runtime']}:openClientRuntime", "calls", 0.8),
    edge(f"function:{P['exp_client']}:runClient", f"function:{P['runtime']}:activateBuiltinClientServices", "calls", 0.8),
]
nodes += [
    file_node(
        P["exp_cmds"], "commands.ts",
        "experimental CLI 分发：feature flag 开启后把 server/client 转到前台 server 或 TUI/无头 client。",
        ["cli", "entry-point", "experimental", "dispatch"],
        "moderate",
        "文件头注明发布入口不得 import 本模块。",
    ),
    fn_node(P["exp_cmds"], "runServerCommand", 11, 65,
            "启动前台 server，打印 socket 与 Radius 状态，直到 SIGINT/SIGTERM 或 runtime.closed。",
            ["server", "cli", "lifecycle"], "moderate"),
    fn_node(P["exp_cmds"], "runClientCommand", 67, 90,
            "TTY 无 prompt 时走 TUI，否则 runClient 并流式打印 text_delta 或 session 列表。",
            ["client", "cli", "tui"], "moderate"),
    fn_node(P["exp_cmds"], "runExperimentalCommand", 93, 106,
            "检查实验开关与 argv[0]，执行 cli.execute，把错误打到 stderr。",
            ["cli", "entry-point", "dispatch"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['exp_cmds']}", f"function:{P['exp_cmds']}:runServerCommand", "contains", 1.0),
    edge(f"file:{P['exp_cmds']}", f"function:{P['exp_cmds']}:runClientCommand", "contains", 1.0),
    edge(f"file:{P['exp_cmds']}", f"function:{P['exp_cmds']}:runExperimentalCommand", "contains", 1.0),
    edge(f"file:{P['exp_cmds']}", f"function:{P['exp_cmds']}:runExperimentalCommand", "exports", 0.8),
    edge(f"function:{P['exp_cmds']}:runServerCommand", f"function:{P['server']}:startForegroundServer", "calls", 0.8),
    edge(f"function:{P['exp_cmds']}:runClientCommand", f"function:{P['tui']}:runClientTui", "calls", 0.8),
    edge(f"function:{P['exp_cmds']}:runClientCommand", f"function:{P['exp_client']}:runClient", "calls", 0.8),
    edge(f"function:{P['exp_cmds']}:runExperimentalCommand", f"function:{P['exp_cmds']}:runServerCommand", "calls", 0.8),
    edge(f"function:{P['exp_cmds']}:runExperimentalCommand", f"function:{P['exp_cmds']}:runClientCommand", "calls", 0.8),
    edge(f"function:{P['exp_cmds']}:runExperimentalCommand", "function:packages/coding-agent/src/core/experimental.ts:areExperimentalFeaturesEnabled", "calls", 0.8),
]

# coordinator
nodes.append(file_node(
    P["coord_entry"], "coordinator-entry.ts",
    "coordinator 内部进程入口：校验 INTERNAL_PROCESS_ENV 角色后调用 runCoordinatorProcess。",
    ["entry-point", "coordinator", "process", "experimental"],
    "simple",
    "shebang 为 node；必须由 spawnInternalProcess 带 coordinator 角色拉起。",
))
nodes += [
    file_node(
        P["coord"], "coordinator.ts",
        "实验 coordinator：Unix 控制/公共 socket 上的不透明消息路由器，登记 server 与 peer 并在空闲后退出。",
        ["coordinator", "router", "unix-socket", "process"],
        "complex",
        "刻意不解析 Pi/session/worker 载荷，只做 JSON-line 转发。",
    ),
    cl_node(P["coord"], "CoordinatorConnection", 43, 181,
            "server 侧控制连接：注册、收发 routed message、跟踪 peer，并在被替换时 resolve replaced。",
            ["coordinator", "connection", "client"], "moderate"),
    fn_node(P["coord"], "ensureCoordinator", 187, 199,
            "尝试连接已有 coordinator；失败则 spawn 子进程并轮询控制 socket 直至就绪。",
            ["coordinator", "lifecycle", "process-spawn"], "moderate"),
    fn_node(P["coord"], "connectSocket", 201, 215,
            "对 Unix path 做一次性 connect，成功 resolve Socket，失败 reject。",
            ["unix-socket", "utility", "connection"], "moderate"),
    fn_node(P["coord"], "attachJsonLineReader", 227, 249,
            "按行缓冲 UTF-8 JSON，超 MAX_CONTROL_LINE_BYTES 或非法 JSON 则 destroy。",
            ["protocol", "parser", "unix-socket"], "moderate"),
    fn_node(P["coord"], "runCoordinatorProcess", 301, 313,
            "校验 argv 中的 public/control path，注册信号，然后进入 main 监听循环。",
            ["entry-point", "coordinator", "process"], "moderate"),
    fn_node(P["coord"], "main", 315, 328,
            "清理陈旧 socket、listen 控制/公共端点、收紧权限，并安排空闲关闭。",
            ["coordinator", "lifecycle", "unix-socket"], "moderate"),
    fn_node(P["coord"], "acceptControlConnection", 330, 370,
            "接受控制连接：解析 register_server / register_peer / routed message。",
            ["coordinator", "connection", "router"], "moderate"),
    fn_node(P["coord"], "registerServer", 372, 397,
            "登记（或替换）当前 server peer，并向其回写已连接 peer 列表。",
            ["coordinator", "registry", "server"], "moderate"),
    fn_node(P["coord"], "registerPeer", 399, 418,
            "登记 routed peer，并向 server 广播 peer_connected。",
            ["coordinator", "registry", "peer"], "moderate"),
    fn_node(P["coord"], "handleRoutedMessage", 424, 442,
            "按 to 字段把 payload 转给目标 peer 或当前 server。",
            ["coordinator", "router", "message"], "moderate"),
    fn_node(P["coord"], "acceptPublicConnection", 444, 473,
            "把公共 socket 与当前 server endpoint 对接成双向字节管道。",
            ["coordinator", "proxy", "unix-socket"], "moderate"),
    fn_node(P["coord"], "scheduleEmptyShutdown", 491, 500,
            "在无连接宽限期后调用 shutdownCoordinator。",
            ["coordinator", "lifecycle", "timer"], "simple"),
    fn_node(P["coord"], "shutdownCoordinator", 508, 517,
            "关闭监听器与现存连接，清理 socket 文件后退出进程。",
            ["coordinator", "lifecycle", "shutdown"], "simple"),
    fn_node(P["coord"], "attachRoutedLineReader", 523, 547,
            "为 routed peer 读取 JSON-line 并回调，超限或坏帧则断开。",
            ["protocol", "parser", "unix-socket"], "moderate"),
    fn_node(P["coord"], "listen", 549, 563,
            "让 net.Server listen 指定 Unix path，错误则 reject。",
            ["unix-socket", "lifecycle", "server"], "moderate"),
    fn_node(P["coord"], "removeStaleSocket", 574, 596,
            "若 path 上残留无主 socket 则 unlink，避免 EADDRINUSE。",
            ["unix-socket", "cleanup", "filesystem"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['coord']}", f"class:{P['coord']}:CoordinatorConnection", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:ensureCoordinator", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:connectSocket", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:attachJsonLineReader", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:runCoordinatorProcess", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:main", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:acceptControlConnection", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:registerServer", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:registerPeer", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:handleRoutedMessage", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:acceptPublicConnection", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:scheduleEmptyShutdown", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:shutdownCoordinator", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:attachRoutedLineReader", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:listen", "contains", 1.0),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:removeStaleSocket", "contains", 1.0),
    edge(f"file:{P['coord']}", f"class:{P['coord']}:CoordinatorConnection", "exports", 0.8),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:ensureCoordinator", "exports", 0.8),
    edge(f"file:{P['coord']}", f"function:{P['coord']}:runCoordinatorProcess", "exports", 0.8),
    edge(f"class:{P['coord']}:CoordinatorConnection", f"function:{P['coord']}:connectSocket", "calls", 0.8),
    edge(f"class:{P['coord']}:CoordinatorConnection", f"function:{P['coord']}:attachJsonLineReader", "calls", 0.8),
    edge(f"function:{P['coord']}:ensureCoordinator", f"function:{P['coord']}:connectSocket", "calls", 0.8),
    edge(f"function:{P['coord']}:ensureCoordinator", f"function:{P['proc']}:spawnInternalProcess", "calls", 0.8),
    edge(f"function:{P['coord']}:runCoordinatorProcess", f"function:{P['coord']}:main", "calls", 0.8),
    edge(f"function:{P['coord']}:runCoordinatorProcess", f"function:{P['coord']}:shutdownCoordinator", "calls", 0.8),
    edge(f"function:{P['coord']}:main", f"function:{P['coord']}:removeStaleSocket", "calls", 0.8),
    edge(f"function:{P['coord']}:main", f"function:{P['coord']}:listen", "calls", 0.8),
    edge(f"function:{P['coord']}:main", f"function:{P['coord']}:scheduleEmptyShutdown", "calls", 0.8),
    edge(f"function:{P['coord']}:acceptControlConnection", f"function:{P['coord']}:registerServer", "calls", 0.8),
    edge(f"function:{P['coord']}:acceptControlConnection", f"function:{P['coord']}:registerPeer", "calls", 0.8),
    edge(f"function:{P['coord']}:acceptControlConnection", f"function:{P['coord']}:handleRoutedMessage", "calls", 0.8),
    edge(f"function:{P['coord']}:scheduleEmptyShutdown", f"function:{P['coord']}:shutdownCoordinator", "calls", 0.8),
    edge(f"file:{P['coord_entry']}", f"function:{P['coord']}:runCoordinatorProcess", "depends_on", 0.6),
    edge(f"file:{P['coord_entry']}", f"function:{P['proc']}:consumeInternalProcessRole", "depends_on", 0.6),
]

# bundled plugins
nodes += [
    file_node(
        P["bundled"], "bundled.ts",
        "从 facet bundle manifest/artifact 构造 session 与 presentation FacetLoader，并解析插件 API external。",
        ["plugin", "loader", "facet", "experimental"],
        "simple",
    ),
    fn_node(P["bundled"], "createSessionPluginFacetLoader", 12, 15,
            "把多个 manifest 编成 combineFacetLoaders；空列表返回 undefined。",
            ["plugin", "factory", "loader"], "simple"),
    fn_node(P["bundled"], "createOptionalSessionFacetLoader", 17, 30,
            "仅当 manifest 含 session entry 时加载 bundle，否则返回空 facets。",
            ["plugin", "loader", "session"], "moderate"),
    fn_node(P["bundled"], "createPresentationFacetData", 32, 36,
            "把 artifact 列表编码为可经服务复制的 presentationFacetBundles JSON。",
            ["plugin", "serialization", "presentation"], "simple"),
    fn_node(P["bundled"], "createPresentationFacetLoaders", 39, 49,
            "从服务下发的 presentation 数据重建 artifact loader 列表。",
            ["plugin", "factory", "loader"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createSessionPluginFacetLoader", "contains", 1.0),
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createOptionalSessionFacetLoader", "contains", 1.0),
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createPresentationFacetData", "contains", 1.0),
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createPresentationFacetLoaders", "contains", 1.0),
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createSessionPluginFacetLoader", "exports", 0.8),
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createPresentationFacetData", "exports", 0.8),
    edge(f"file:{P['bundled']}", f"function:{P['bundled']}:createPresentationFacetLoaders", "exports", 0.8),
    edge(f"function:{P['bundled']}:createSessionPluginFacetLoader", f"function:{P['bundled']}:createOptionalSessionFacetLoader", "calls", 0.8),
]

# package.ts
nodes += [
    file_node(
        P["pkg"], "package.ts",
        "持久化并构建 server/session 的插件包配置：读写 profile JSON，调用 bundleFacetPackage 产出 artifact。",
        ["plugin", "package", "persistence", "bundler"],
        "moderate",
    ),
    fn_node(P["pkg"], "restoreServerPluginPackageProfile", 21, 34,
            "按配置写入或读回 plugin-packages-<serverId>.json，空配置则删除文件。",
            ["plugin", "persistence", "server"], "moderate"),
    fn_node(P["pkg"], "readSessionPluginPackageProfile", 37, 43,
            "读取单个 durable session 上显式选择的插件包路径。",
            ["plugin", "persistence", "session"], "simple"),
    fn_node(P["pkg"], "removeSessionPluginPackageProfile", 46, 52,
            "删除已销毁 session 对应的插件 profile。",
            ["plugin", "persistence", "cleanup"], "simple"),
    fn_node(P["pkg"], "writeSessionPluginPackageProfile", 55, 66,
            "把规范化后的包路径写入 session 级 profile。",
            ["plugin", "persistence", "session"], "moderate"),
    fn_node(P["pkg"], "createServerPluginPackage", 69, 97,
            "为单个包路径返回可重复 build() 的 ConfiguredServerPluginPackage，内部串行 bundle。",
            ["plugin", "factory", "bundler"], "moderate"),
    fn_node(P["pkg"], "readPluginPackageProfile", 99, 131,
            "解析 profile JSON，校验版本与 packagePaths，非法结构返回 undefined 或抛错。",
            ["plugin", "validation", "persistence"], "moderate"),
    fn_node(P["pkg"], "writePluginPackageProfile", 133, 147,
            "把版本化 profile（含可选 sessionPath）写成 JSON 文件。",
            ["plugin", "persistence", "filesystem"], "moderate"),
    fn_node(P["pkg"], "normalizePluginPackagePaths", 149, 158,
            "resolve 去重后冻结包路径列表，拒绝空字符串。",
            ["plugin", "validation", "utility"], "simple"),
]
extra_edges += [
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:restoreServerPluginPackageProfile", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:readSessionPluginPackageProfile", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:removeSessionPluginPackageProfile", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:writeSessionPluginPackageProfile", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:createServerPluginPackage", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:readPluginPackageProfile", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:writePluginPackageProfile", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:normalizePluginPackagePaths", "contains", 1.0),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:restoreServerPluginPackageProfile", "exports", 0.8),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:readSessionPluginPackageProfile", "exports", 0.8),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:removeSessionPluginPackageProfile", "exports", 0.8),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:writeSessionPluginPackageProfile", "exports", 0.8),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:createServerPluginPackage", "exports", 0.8),
    edge(f"file:{P['pkg']}", f"function:{P['pkg']}:normalizePluginPackagePaths", "exports", 0.8),
    edge(f"function:{P['pkg']}:restoreServerPluginPackageProfile", f"function:{P['pkg']}:readPluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['pkg']}:restoreServerPluginPackageProfile", f"function:{P['pkg']}:writePluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['pkg']}:restoreServerPluginPackageProfile", f"function:{P['pkg']}:normalizePluginPackagePaths", "calls", 0.8),
    edge(f"function:{P['pkg']}:readSessionPluginPackageProfile", f"function:{P['pkg']}:readPluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['pkg']}:writeSessionPluginPackageProfile", f"function:{P['pkg']}:writePluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['pkg']}:writeSessionPluginPackageProfile", f"function:{P['pkg']}:normalizePluginPackagePaths", "calls", 0.8),
]

# process.ts
nodes += [
    file_node(
        P["proc"], "process.ts",
        "内部进程工具：用 __PI_INTERNAL_SPAWN 标记角色，在 Node/Bun 下统一 spawn/终止 coordinator、server、session-worker。",
        ["process-spawn", "进程管理", "experimental", "utility"],
        "moderate",
        "编译后的 Bun 可执行文件不能再指定外部 entryUrl。",
    ),
    fn_node(P["proc"], "isDirectInternalProcessEntry", 11, 18,
            "判断当前 argv[1] 是否直接执行了给定 moduleUrl（排除 Bun binary / bundled Node）。",
            ["process", "detection", "entry-point"], "simple"),
    fn_node(P["proc"], "getInternalProcessRole", 21, 26,
            "读取并校验 INTERNAL_PROCESS_ENV，非法角色抛错。",
            ["process", "validation", "env"], "simple"),
    fn_node(P["proc"], "consumeInternalProcessRole", 29, 33,
            "读取角色后从 env 删除，避免子孙进程继承。",
            ["process", "lifecycle", "env"], "simple"),
    fn_node(P["proc"], "spawnInternalProcess", 41, 70,
            "detached spawn 同源可执行文件，注入角色 env；源码模式额外挂 source-resolver。",
            ["process-spawn", "factory", "node"], "moderate"),
    fn_node(P["proc"], "terminateInternalProcess", 73, 81,
            "对仍存活的 child 发 SIGKILL 并等待 exit/error。",
            ["process", "lifecycle", "termination"], "simple"),
    fn_node(P["proc"], "defaultEntryUrl", 83, 97,
            "按角色解析入口 URL：bundled Node 走 dist/bundle，否则指向同目录 ts/js。",
            ["process", "resolution", "entry-point"], "moderate"),
    fn_node(P["proc"], "encodeControlLine", 101, 105,
            "把消息 JSON.stringify 成单行并校验不超过 MAX_CONTROL_LINE_BYTES。",
            ["protocol", "serialization", "control-plane"], "simple"),
]
extra_edges += [
    edge(f"file:{P['proc']}", f"function:{P['proc']}:isDirectInternalProcessEntry", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:getInternalProcessRole", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:consumeInternalProcessRole", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:spawnInternalProcess", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:terminateInternalProcess", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:defaultEntryUrl", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:encodeControlLine", "contains", 1.0),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:isDirectInternalProcessEntry", "exports", 0.8),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:getInternalProcessRole", "exports", 0.8),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:consumeInternalProcessRole", "exports", 0.8),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:spawnInternalProcess", "exports", 0.8),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:terminateInternalProcess", "exports", 0.8),
    edge(f"file:{P['proc']}", f"function:{P['proc']}:encodeControlLine", "exports", 0.8),
    edge(f"function:{P['proc']}:consumeInternalProcessRole", f"function:{P['proc']}:getInternalProcessRole", "calls", 0.8),
    edge(f"function:{P['proc']}:spawnInternalProcess", f"function:{P['proc']}:defaultEntryUrl", "calls", 0.8),
    edge(f"function:{P['proc']}:defaultEntryUrl", "function:packages/coding-agent/src/config.ts:getPackageDir", "calls", 0.8),
]

# radius-auth
nodes += [
    file_node(
        P["rauth"], "radius-auth.ts",
        "每次中继连接重新解析 Radius 凭据：显式 token/file，或从 ModelRuntime 读取已登录的 radius auth。",
        ["auth", "认证", "radius", "experimental"],
        "moderate",
    ),
    cl_node(P["rauth"], "RadiusRelayAuthResolver", 16, 66,
            "解析 gateway URL 与 token；离线模式拒绝；required 时缺少凭据会提示 /login radius。",
            ["auth", "resolver", "radius"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['rauth']}", f"class:{P['rauth']}:RadiusRelayAuthResolver", "contains", 1.0),
    edge(f"file:{P['rauth']}", f"class:{P['rauth']}:RadiusRelayAuthResolver", "exports", 0.8),
    edge(f"class:{P['rauth']}:RadiusRelayAuthResolver", "function:packages/ai/src/providers/radius-config.ts:normalizeRadiusGatewayUrl", "calls", 0.8),
    edge(f"class:{P['rauth']}:RadiusRelayAuthResolver", "class:packages/coding-agent/src/core/model-runtime.ts:ModelRuntime", "calls", 0.8),
    edge(f"class:{P['rauth']}:RadiusRelayAuthResolver", "function:packages/coding-agent/src/cli/auth-command.ts:getAuthCredential", "calls", 0.8),
    edge(f"class:{P['rauth']}:RadiusRelayAuthResolver", "function:packages/coding-agent/src/utils/paths.ts:resolvePath", "calls", 0.8),
]

# radius-relay
nodes += [
    file_node(
        P["relay"], "radius-relay.ts",
        "Radius WebSocket 中继：服务端 RadiusRelayHost 多路复用连接，客户端工厂与自动重连，以及二进制 data frame 编解码。",
        ["radius", "relay", "websocket", "transport"],
        "complex",
    ),
    cl_node(P["relay"], "RadiusRelayHost", 104, 312,
            "维持已认证的 host WebSocket，把入站连接交给 Server.accept，断线指数退避重连。",
            ["relay", "websocket", "server", "lifecycle"], "complex"),
    fn_node(P["relay"], "createRadiusClientTransportFactory", 314, 330,
            "解析 auth 后打开 client 子协议 WebSocket，返回 RadiusClientByteTransport 工厂。",
            ["factory", "transport", "radius"], "moderate"),
    cl_node(P["relay"], "RadiusClientReconnect", 344, 402,
            "监听 Client 连接/附件变化，在断开后按指数退避调用 reconnect。",
            ["reconnect", "client", "lifecycle"], "moderate"),
    cl_node(P["relay"], "RelayServerByteConnection", 404, 435,
            "host 侧单条中继连接的 ByteTransport 适配：send 分片、close 带 optional final chunk。",
            ["transport", "relay", "adapter"], "moderate"),
    cl_node(P["relay"], "RadiusClientByteTransport", 437, 494,
            "client 侧 WebSocket ByteTransport：入站拆 frame，出站编码 connectionId。",
            ["transport", "websocket", "client"], "moderate"),
    cl_node(P["relay"], "OrderedWebSocketWriter", 496, 536,
            "串行化 WebSocket send，避免并发 write 打乱帧序。",
            ["websocket", "backpressure", "queue"], "moderate"),
    fn_node(P["relay"], "parseHostControlMessage", 557, 590,
            "解析 host 控制 JSON（open/close/error 等），非法结构返回错误。",
            ["protocol", "parser", "relay"], "moderate"),
    fn_node(P["relay"], "encodeRelayDataFrame", 592, 603,
            "把 connectionId + payload 编码为带版本/类型头的二进制帧。",
            ["protocol", "serialization", "relay"], "moderate"),
    fn_node(P["relay"], "parseRelayDataFrame", 605, 616,
            "校验并拆出 data frame 的 connectionId 与 payload。",
            ["protocol", "parser", "relay"], "moderate"),
    fn_node(P["relay"], "defaultWebSocketFactory", 626, 635,
            "用 undici WebSocket 建立带 Authorization 头的连接。",
            ["websocket", "factory", "radius"], "simple"),
    fn_node(P["relay"], "openRadiusRelayWebSocket", 637, 681,
            "打开中继 WebSocket，等待 open，并把 close/error 映射为可取消的 Promise。",
            ["websocket", "lifecycle", "radius"], "moderate"),
    fn_node(P["relay"], "delay", 696, 716,
            "可 AbortSignal 取消的延迟；unref 定时器以免挂住进程。",
            ["utility", "cancellation", "timer"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['relay']}", f"class:{P['relay']}:RadiusRelayHost", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:createRadiusClientTransportFactory", "contains", 1.0),
    edge(f"file:{P['relay']}", f"class:{P['relay']}:RadiusClientReconnect", "contains", 1.0),
    edge(f"file:{P['relay']}", f"class:{P['relay']}:RelayServerByteConnection", "contains", 1.0),
    edge(f"file:{P['relay']}", f"class:{P['relay']}:RadiusClientByteTransport", "contains", 1.0),
    edge(f"file:{P['relay']}", f"class:{P['relay']}:OrderedWebSocketWriter", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:parseHostControlMessage", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:encodeRelayDataFrame", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:parseRelayDataFrame", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:defaultWebSocketFactory", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:openRadiusRelayWebSocket", "contains", 1.0),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:delay", "contains", 1.0),
    edge(f"file:{P['relay']}", f"class:{P['relay']}:RadiusRelayHost", "exports", 0.8),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:createRadiusClientTransportFactory", "exports", 0.8),
    edge(f"file:{P['relay']}", f"class:{P['relay']}:RadiusClientReconnect", "exports", 0.8),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:encodeRelayDataFrame", "exports", 0.8),
    edge(f"file:{P['relay']}", f"function:{P['relay']}:parseRelayDataFrame", "exports", 0.8),
    edge(f"function:{P['relay']}:createRadiusClientTransportFactory", f"function:{P['relay']}:openRadiusRelayWebSocket", "calls", 0.8),
    edge(f"function:{P['relay']}:createRadiusClientTransportFactory", f"class:{P['rauth']}:RadiusRelayAuthResolver", "calls", 0.8),
    edge(f"function:{P['relay']}:openRadiusRelayWebSocket", f"function:{P['relay']}:defaultWebSocketFactory", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusRelayHost", f"function:{P['relay']}:openRadiusRelayWebSocket", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusRelayHost", f"function:{P['relay']}:parseHostControlMessage", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusRelayHost", f"function:{P['relay']}:encodeRelayDataFrame", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusRelayHost", f"function:{P['relay']}:parseRelayDataFrame", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusRelayHost", f"function:{P['relay']}:delay", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusClientReconnect", f"class:{P['client']}:Client", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusClientByteTransport", f"function:{P['relay']}:encodeRelayDataFrame", "calls", 0.8),
    edge(f"class:{P['relay']}:RadiusClientByteTransport", f"function:{P['relay']}:parseRelayDataFrame", "calls", 0.8),
]

# server.ts
nodes += [
    file_node(
        P["server"], "server.ts",
        "experimental server 生命周期：目录/锁、激活或复用 Unix server、拉起 coordinator/worker、可选 Radius 中继。",
        ["server", "lifecycle", "experimental", "orchestration"],
        "complex",
    ),
    fn_node(P["server"], "resolveServerDirectory", 54, 56,
            "解析 PI_SERVER_DIR 或 ~/.pi/server 为绝对 server 目录。",
            ["path", "config", "server"], "simple"),
    fn_node(P["server"], "ensurePrivateServerDirectory", 58, 67,
            "创建 0700 目录并校验属主为当前 POSIX uid。",
            ["security", "filesystem", "server"], "simple"),
    fn_node(P["server"], "resolveSessionDirectory", 69, 71,
            "解析 sessionDir 或 <agentDir>/experimental/sessions。",
            ["path", "session", "config"], "simple"),
    fn_node(P["server"], "acquireServerProfile", 84, 126,
            "在共享目录里锁定并持久化 default/requested serverId。",
            ["lock", "server", "persistence"], "moderate"),
    fn_node(P["server"], "activateServer", 145, 198,
            "确保目录与 profile 后连接已有 socket，否则 spawn server 进程并轮询至可连。",
            ["server", "activation", "process-spawn"], "moderate"),
    fn_node(P["server"], "acquireServerActivation", 200, 213,
            "对单个 serverId 的激活文件加锁，防止并发拉起。",
            ["lock", "server", "concurrency"], "moderate"),
    fn_node(P["server"], "connect", 215, 242,
            "用 Unix transport 建 Client 并完成握手，失败则 dispose。",
            ["client", "unix-socket", "server"], "moderate"),
    cl_node(P["server"], "ServerLifetime", 248, 321,
            "跟踪连接数/worker 数，在空闲超时后 stop 已启动的 server。",
            ["lifecycle", "server", "idle-timeout"], "moderate"),
    fn_node(P["server"], "startServerBackend", 376, 518,
            "装配 SessionWorkerManager、插件包、experimental services 与 Unix listener。",
            ["server", "orchestration", "plugin"], "complex"),
    fn_node(P["server"], "startServer", 521, 707,
            "完整启动：coordinator、backend、RadiusRelayHost，并返回可 close 的 runtime。",
            ["server", "orchestration", "lifecycle"], "complex"),
    fn_node(P["server"], "startForegroundServer", 710, 729,
            "前台包装 startServer，供 CLI 阻塞运行直至 close。",
            ["server", "cli", "lifecycle"], "moderate"),
    fn_node(P["server"], "parseServerModelOptions", 731, 754,
            "解析内部进程传入的 provider/model JSON。",
            ["parser", "config", "model"], "moderate"),
    fn_node(P["server"], "runServerProcess", 757, 785,
            "内部 server 进程入口：消费角色、解析参数并 startServer。",
            ["entry-point", "server", "process"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['server']}", f"function:{P['server']}:resolveServerDirectory", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:ensurePrivateServerDirectory", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:resolveSessionDirectory", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:acquireServerProfile", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:activateServer", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:acquireServerActivation", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:connect", "contains", 1.0),
    edge(f"file:{P['server']}", f"class:{P['server']}:ServerLifetime", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:startServerBackend", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:startServer", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:startForegroundServer", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:parseServerModelOptions", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:runServerProcess", "contains", 1.0),
    edge(f"file:{P['server']}", f"function:{P['server']}:resolveServerDirectory", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:ensurePrivateServerDirectory", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:resolveSessionDirectory", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:acquireServerProfile", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:activateServer", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:acquireServerActivation", "exports", 0.8),
    edge(f"file:{P['server']}", f"class:{P['server']}:ServerLifetime", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:startServer", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:startForegroundServer", "exports", 0.8),
    edge(f"file:{P['server']}", f"function:{P['server']}:runServerProcess", "exports", 0.8),
    edge(f"function:{P['server']}:resolveServerDirectory", "function:packages/coding-agent/src/utils/paths.ts:resolvePath", "calls", 0.8),
    edge(f"function:{P['server']}:resolveSessionDirectory", "function:packages/coding-agent/src/utils/paths.ts:resolvePath", "calls", 0.8),
    edge(f"function:{P['server']}:resolveSessionDirectory", "function:packages/coding-agent/src/config.ts:getAgentDir", "calls", 0.8),
    edge(f"function:{P['server']}:acquireServerProfile", "function:packages/protocol/src/index.ts:isServerId", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", f"function:{P['server']}:ensurePrivateServerDirectory", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", f"function:{P['server']}:acquireServerProfile", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", f"function:{P['server']}:acquireServerActivation", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", f"function:{P['server']}:connect", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", f"function:{P['proc']}:spawnInternalProcess", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", f"function:{P['proc']}:terminateInternalProcess", "calls", 0.8),
    edge(f"function:{P['server']}:activateServer", "function:packages/server/src/transports/unix/index.ts:getUnixSocketPath", "calls", 0.8),
    edge(f"function:{P['server']}:connect", f"class:{P['client']}:Client", "calls", 0.8),
    edge(f"function:{P['server']}:connect", f"function:{P['unix']}:createUnixTransportFactory", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"function:{P['server']}:startServerBackend", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"function:{P['coord']}:ensureCoordinator", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"class:{P['coord']}:CoordinatorConnection", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"class:{P['relay']}:RadiusRelayHost", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"class:{P['rauth']}:RadiusRelayAuthResolver", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"function:{P['bundled']}:createPresentationFacetData", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"function:{P['pkg']}:restoreServerPluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", f"function:{P['pkg']}:createServerPluginPackage", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", "function:packages/coding-agent/src/experimental/services/server.ts:createExperimentalServerServices", "calls", 0.8),
    edge(f"function:{P['server']}:startServer", "class:packages/coding-agent/src/experimental/session-worker-manager.ts:SessionWorkerManager", "calls", 0.8),
    edge(f"function:{P['server']}:startForegroundServer", f"function:{P['server']}:startServer", "calls", 0.8),
    edge(f"function:{P['server']}:runServerProcess", f"function:{P['server']}:startServer", "calls", 0.8),
    edge(f"function:{P['server']}:runServerProcess", f"function:{P['proc']}:consumeInternalProcessRole", "calls", 0.8),
    edge(f"function:{P['server']}:startServerBackend", f"function:{P['pkg']}:readSessionPluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['server']}:startServerBackend", f"function:{P['pkg']}:writeSessionPluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['server']}:startServerBackend", f"function:{P['pkg']}:removeSessionPluginPackageProfile", "calls", 0.8),
    edge(f"function:{P['server']}:startServerBackend", f"function:{P['bundled']}:createSessionPluginFacetLoader", "calls", 0.8),
]

# agent-controller-provider
nodes += [
    file_node(
        P["acp"], "agent-controller-provider.ts",
        "把 worker 拥有的 AgentLane 适配成 presentation-safe 的 AgentController：prompt/steer/compact/navigate 等。",
        ["adapter", "service", "agent", "factory"],
        "moderate",
    ),
    fn_node(P["acp"], "createAgentController", 11, 74,
            "闭包包装 lane 操作，统一把成功/失败映射为 AgentOperationResponse 或 AgentQueueResponse。",
            ["factory", "adapter", "agent"], "moderate"),
    fn_node(P["acp"], "toOperationResponse", 76, 85,
            "从 OperationResultRecord/SuspendedRun 提取 operationId，失败时带上 error。",
            ["adapter", "error-handling", "agent"], "simple"),
    fn_node(P["acp"], "toAgentError", 91, 105,
            "把 harness _tag 错误码映射为稳定的 AgentOperationError.code。",
            ["error-handling", "adapter", "agent"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['acp']}", f"function:{P['acp']}:createAgentController", "contains", 1.0),
    edge(f"file:{P['acp']}", f"function:{P['acp']}:toOperationResponse", "contains", 1.0),
    edge(f"file:{P['acp']}", f"function:{P['acp']}:toAgentError", "contains", 1.0),
    edge(f"file:{P['acp']}", f"function:{P['acp']}:createAgentController", "exports", 0.8),
    edge(f"function:{P['acp']}:createAgentController", f"function:{P['acp']}:toOperationResponse", "calls", 0.8),
    edge(f"function:{P['acp']}:createAgentController", f"function:{P['acp']}:toAgentError", "calls", 0.8),
]

# agent-controller.ts
nodes.append(file_node(
    P["ac"], "agent-controller.ts",
    "定义 AgentController Chord service 契约：prompt/abort/steer/followUp/compact/navigate 及请求响应类型。",
    ["type-definition", "service", "agent", "api-contract"],
    "simple",
    "用 defineService 注册为 pi.agent-controller，实现在 provider 与 worker 侧。",
))

# services/connection.ts
nodes += [
    file_node(
        P["svc_conn"], "connection.ts",
        "把 pi-client 适配为 Chord RemoteServiceSource：server 连接态与 session attachment 的复制状态及绑定生命周期。",
        ["service", "adapter", "connection", "session"],
        "complex",
    ),
    cl_node(P["svc_conn"], "RoutedServiceBinding", 45, 106,
            "按路由是否 bound 延迟激活 RemoteServiceBinding，并在 dispose 时解绑。",
            ["service", "binding", "lifecycle"], "moderate"),
    cl_node(P["svc_conn"], "ServerServiceSourceImpl", 108, 183,
            "server 级服务源：catalogue/open，并把 Client 连接态发布为 ReplicatedState。",
            ["service", "server", "state"], "moderate"),
    cl_node(P["svc_conn"], "SessionServiceSourceImpl", 185, 351,
            "session 级服务源：跟随 attachment 变化 rebind，提供 whenAttached/whenDetached。",
            ["service", "session", "state"], "complex"),
    fn_node(P["svc_conn"], "createServerServiceSource", 354, 356,
            "构造 ServerServiceSourceImpl 的工厂。",
            ["factory", "service", "server"], "simple"),
    fn_node(P["svc_conn"], "createSessionServiceSource", 359, 361,
            "构造 SessionServiceSourceImpl 的工厂。",
            ["factory", "service", "session"], "simple"),
    fn_node(P["svc_conn"], "toServerConnectionState", 373, 388,
            "把 Client 连接状态与重试次数映射为可复制的 ServerConnectionState。",
            ["adapter", "state", "connection"], "moderate"),
]
extra_edges += [
    edge(f"file:{P['svc_conn']}", f"class:{P['svc_conn']}:RoutedServiceBinding", "contains", 1.0),
    edge(f"file:{P['svc_conn']}", f"class:{P['svc_conn']}:ServerServiceSourceImpl", "contains", 1.0),
    edge(f"file:{P['svc_conn']}", f"class:{P['svc_conn']}:SessionServiceSourceImpl", "contains", 1.0),
    edge(f"file:{P['svc_conn']}", f"function:{P['svc_conn']}:createServerServiceSource", "contains", 1.0),
    edge(f"file:{P['svc_conn']}", f"function:{P['svc_conn']}:createSessionServiceSource", "contains", 1.0),
    edge(f"file:{P['svc_conn']}", f"function:{P['svc_conn']}:toServerConnectionState", "contains", 1.0),
    edge(f"file:{P['svc_conn']}", f"function:{P['svc_conn']}:createServerServiceSource", "exports", 0.8),
    edge(f"file:{P['svc_conn']}", f"function:{P['svc_conn']}:createSessionServiceSource", "exports", 0.8),
    edge(f"function:{P['svc_conn']}:createServerServiceSource", f"class:{P['svc_conn']}:ServerServiceSourceImpl", "calls", 0.8),
    edge(f"function:{P['svc_conn']}:createSessionServiceSource", f"class:{P['svc_conn']}:SessionServiceSourceImpl", "calls", 0.8),
    edge(f"class:{P['svc_conn']}:ServerServiceSourceImpl", f"function:{P['svc_conn']}:toServerConnectionState", "calls", 0.8),
    edge(f"class:{P['svc_conn']}:ServerServiceSourceImpl", f"function:{P['client']}:createClientServiceTransport", "calls", 0.8),
    edge(f"class:{P['svc_conn']}:SessionServiceSourceImpl", f"function:{P['client']}:createClientServiceTransport", "calls", 0.8),
    edge(f"class:{P['svc_conn']}:ServerServiceSourceImpl", f"class:{P['svc_conn']}:RoutedServiceBinding", "calls", 0.8),
    edge(f"class:{P['svc_conn']}:SessionServiceSourceImpl", f"class:{P['svc_conn']}:RoutedServiceBinding", "calls", 0.8),
]

# CLI command files call Command / parseAuth (in-batch)
extra_edges += [
    edge(f"file:{P['cli']}", f"class:{P['cmd']}:Command", "depends_on", 0.6),
    edge(f"file:{P['cmd_client']}", f"class:{P['cmd']}:Command", "depends_on", 0.6),
    edge(f"file:{P['cmd_client']}", f"function:{P['cmdopt']}:parseAuth", "depends_on", 0.6),
    edge(f"file:{P['cmd_server']}", f"class:{P['cmd']}:Command", "depends_on", 0.6),
    edge(f"file:{P['cmd_server']}", f"function:{P['cmdopt']}:parseAuth", "depends_on", 0.6),
    edge(f"file:{P['cmd_server']}", "function:packages/protocol/src/index.ts:isServerId", "depends_on", 0.6),
]


def node_file_path(n: dict) -> str:
    return n.get("filePath") or ""


# Import edges: 1:1 with batchImportData
import_edges = []
for src, targets in IMPORTS.items():
    for tgt in targets:
        import_edges.append(edge(f"file:{src}", f"file:{tgt}", "imports", 0.7))

expected_imports = sum(len(v) for v in IMPORTS.values())
if len(import_edges) != expected_imports:
    raise SystemExit(f"import edge count {len(import_edges)} != {expected_imports}")

# Dedup extra edges by (source, target, type)
seen = set()
deduped = []
for e in extra_edges:
    key = (e["source"], e["target"], e["type"])
    if key in seen:
        continue
    if e["source"] == e["target"]:
        continue
    seen.add(key)
    deduped.append(e)
extra_edges = deduped

all_edges = import_edges + extra_edges

# Verify every file in batch has a file node
batch_files = [f["path"] for f in BRIEF["files"]]
file_ids = {n["id"] for n in nodes if n["type"] == "file"}
missing_files = [p for p in batch_files if f"file:{p}" not in file_ids]
if missing_files:
    raise SystemExit(f"missing file nodes: {missing_files}")

# Duplicate IDs
ids = [n["id"] for n in nodes]
if len(ids) != len(set(ids)):
    from collections import Counter
    dups = [k for k, v in Counter(ids).items() if v > 1]
    raise SystemExit(f"duplicate node ids: {dups}")

short_tags = [n["id"] for n in nodes if not (3 <= len(n["tags"]) <= 5)]
if short_tags:
    raise SystemExit(f"tags must be 3-5: {short_tags}")

node_count = len(nodes)
edge_count = len(all_edges)
parts = math.ceil(max(node_count / 60, edge_count / 120))
# Keep parts large enough that sequential chunks stay under limits
# Recalculate upward if a sequential chunk would overflow
files_sorted = sorted(batch_files)
while True:
    group_size = math.ceil(len(files_sorted) / parts)
    overflow = False
    for i in range(parts):
        chunk = files_sorted[i * group_size : (i + 1) * group_size]
        if not chunk:
            continue
        chunk_set = set(chunk)
        part_nodes = [n for n in nodes if node_file_path(n) in chunk_set]
        part_ids = {n["id"] for n in part_nodes}
        part_edges = [e for e in all_edges if e["source"] in part_ids]
        if len(part_nodes) > 60 or len(part_edges) > 120:
            overflow = True
            break
    if not overflow:
        break
    parts += 1
    if parts > 20:
        raise SystemExit("could not split under limits")

group_size = math.ceil(len(files_sorted) / parts)

# Neighbor + import path sets for validation
neighbor_files = set()
neighbor_symbols: dict[str, set[str]] = {}  # path -> symbols
for src, neighs in NEIGHBOR_MAP.items():
    for n in neighs:
        neighbor_files.add(n["path"])
        neighbor_symbols.setdefault(n["path"], set()).update(n.get("symbols") or [])
import_targets = set()
for ts in IMPORTS.values():
    import_targets.update(ts)
allowed_file_targets = neighbor_files | import_targets | set(batch_files)

out_dir = UA_DIR / "intermediate"
written = []
total_n = 0
total_e = 0

for k in range(1, parts + 1):
    chunk = files_sorted[(k - 1) * group_size : k * group_size]
    if not chunk:
        continue
    chunk_set = set(chunk)
    part_nodes = [n for n in nodes if node_file_path(n) in chunk_set]
    part_ids = {n["id"] for n in part_nodes}
    part_edges = [e for e in all_edges if e["source"] in part_ids]

    failures = []
    for e in part_edges:
        for end in ("source", "target"):
            ref = e[end]
            if ref in part_ids:
                continue
            if ref.startswith("file:"):
                path = ref[len("file:") :]
                if path in allowed_file_targets:
                    continue
                failures.append((e, end, ref, "unknown file target"))
                continue
            if ref.startswith("function:") or ref.startswith("class:"):
                # function:<path>:<symbol>  — path may contain colons? not here
                rest = ref.split(":", 2)
                if len(rest) != 3:
                    failures.append((e, end, ref, "bad symbol id"))
                    continue
                _, path, symbol = rest
                # in-batch symbol in another part is OK if that file is in batch
                # BUT protocol says: symbol must be in neighbor.symbols OR in this part
                if path in neighbor_symbols and symbol in neighbor_symbols[path]:
                    continue
                # allow in-batch cross-part symbols (same analysis batch)
                if path in batch_files:
                    continue
                failures.append((e, end, ref, "symbol not in neighborMap or batch"))
                continue
            failures.append((e, end, ref, "unrecognized id"))

    if failures:
        msg = "\n".join(f"  {f[1]} {f[2]} ({f[3]}) edge={f[0]}" for f in failures[:20])
        raise SystemExit(f"validation failed for part {k} ({len(failures)} issues):\n{msg}")

    payload = {"nodes": part_nodes, "edges": part_edges}
    if parts == 1:
        out = out_dir / "batch-1.json"
    else:
        out = out_dir / f"batch-1-part-{k}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    written.append((out.name, len(part_nodes), len(part_edges), chunk))
    total_n += len(part_nodes)
    total_e += len(part_edges)

print(f"parts={len(written)} nodes={total_n} edges={total_e} imports={len(import_edges)}")
for name, nn, ee, chunk in written:
    print(f"  {name}: nodes={nn} edges={ee} files={len(chunk)}")
    for p in chunk:
        print(f"    - {p}")
