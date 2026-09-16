#!/usr/bin/env python3
"""Generate batch-3 knowledge graph fragments."""
from __future__ import annotations

import json
import math
from pathlib import Path

UA_DIR = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
BRIEF = json.loads((UA_DIR / "intermediate/batch-briefs/batch-3.json").read_text())
IMPORTS: dict[str, list[str]] = BRIEF["batchImportData"]
NEIGHBOR_MAP: dict[str, list[dict]] = BRIEF["neighborMap"]

nodes: list[dict] = []
edges: list[dict] = []
seen_ids: set[str] = set()


def add_node(n: dict) -> None:
    if n["id"] in seen_ids:
        raise SystemExit(f"duplicate node id: {n['id']}")
    seen_ids.add(n["id"])
    nodes.append(n)


def add_edge(e: dict) -> None:
    if e["source"] == e["target"]:
        raise SystemExit(f"self-edge: {e}")
    edges.append(e)


def file_node(
    path: str,
    summary: str,
    tags: list[str],
    complexity: str,
    language_notes: str | None = None,
) -> None:
    n = {
        "id": f"file:{path}",
        "type": "file",
        "name": path.rsplit("/", 1)[-1],
        "filePath": path,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if language_notes:
        n["languageNotes"] = language_notes
    add_node(n)


def fn_node(
    path: str,
    name: str,
    start: int,
    end: int,
    summary: str,
    tags: list[str],
    complexity: str | None = None,
    language_notes: str | None = None,
    exported: bool = False,
) -> None:
    span = end - start + 1
    if complexity is None:
        complexity = "simple" if span < 50 else "moderate" if span <= 200 else "complex"
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
    if language_notes:
        n["languageNotes"] = language_notes
    add_node(n)
    add_edge(
        {
            "source": f"file:{path}",
            "target": f"function:{path}:{name}",
            "type": "contains",
            "direction": "forward",
            "weight": 1.0,
        }
    )
    if exported:
        add_edge(
            {
                "source": f"file:{path}",
                "target": f"function:{path}:{name}",
                "type": "exports",
                "direction": "forward",
                "weight": 0.8,
            }
        )


def class_node(
    path: str,
    name: str,
    start: int,
    end: int,
    summary: str,
    tags: list[str],
    complexity: str,
    exported: bool = False,
    language_notes: str | None = None,
) -> None:
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
    if language_notes:
        n["languageNotes"] = language_notes
    add_node(n)
    add_edge(
        {
            "source": f"file:{path}",
            "target": f"class:{path}:{name}",
            "type": "contains",
            "direction": "forward",
            "weight": 1.0,
        }
    )
    if exported:
        add_edge(
            {
                "source": f"file:{path}",
                "target": f"class:{path}:{name}",
                "type": "exports",
                "direction": "forward",
                "weight": 0.8,
            }
        )


def calls(src: str, dst: str) -> None:
    add_edge({"source": src, "target": dst, "type": "calls", "direction": "forward", "weight": 0.8})


def depends_on(src_file: str, dst_file: str) -> None:
    add_edge(
        {
            "source": f"file:{src_file}",
            "target": f"file:{dst_file}",
            "type": "depends_on",
            "direction": "forward",
            "weight": 0.6,
        }
    )


# ---------------------------------------------------------------------------
# API lazy wrappers
# ---------------------------------------------------------------------------
LAZY_APIS = [
    (
        "packages/ai/src/api/anthropic-messages.lazy.ts",
        "anthropicMessagesApi",
        "Anthropic Messages",
        "./anthropic-messages.ts",
    ),
    (
        "packages/ai/src/api/azure-openai-responses.lazy.ts",
        "azureOpenAIResponsesApi",
        "Azure OpenAI Responses",
        "./azure-openai-responses.ts",
    ),
    (
        "packages/ai/src/api/google-generative-ai.lazy.ts",
        "googleGenerativeAIApi",
        "Google Generative AI",
        "./google-generative-ai.ts",
    ),
    (
        "packages/ai/src/api/google-vertex.lazy.ts",
        "googleVertexApi",
        "Google Vertex",
        "./google-vertex.ts",
    ),
    (
        "packages/ai/src/api/mistral-conversations.lazy.ts",
        "mistralConversationsApi",
        "Mistral Conversations",
        "./mistral-conversations.ts",
    ),
    (
        "packages/ai/src/api/openai-codex-responses.lazy.ts",
        "openAICodexResponsesApi",
        "OpenAI Codex Responses",
        "./openai-codex-responses.ts",
    ),
    (
        "packages/ai/src/api/openai-completions.lazy.ts",
        "openAICompletionsApi",
        "OpenAI Completions",
        "./openai-completions.ts",
    ),
    (
        "packages/ai/src/api/openai-responses.lazy.ts",
        "openAIResponsesApi",
        "OpenAI Responses",
        "./openai-responses.ts",
    ),
    (
        "packages/ai/src/api/pi-messages.lazy.ts",
        "piMessagesApi",
        "pi-messages",
        "./pi-messages.ts",
    ),
]

for path, name, label, _impl in LAZY_APIS:
    file_node(
        path,
        f"导出 `{name}`，用 `lazyApi` 在首次 stream 时再动态 import {label} 的 API 实现。",
        ["惰性加载", "api-wrapper", "factory"],
        "simple",
        "单行工厂：`() => lazyApi(() => import(\"./…\"))`，把实现模块挡在 bundler 静态图之外。",
    )
    fn_node(
        path,
        name,
        4,
        4,
        f"返回延迟加载的 {label} `ProviderStreams`。",
        ["factory", "惰性加载", "api-wrapper"],
        exported=True,
    )
    calls(f"function:{path}:{name}", "function:packages/ai/src/api/lazy.ts:lazyApi")

# bedrock (special)
BEDROCK = "packages/ai/src/api/bedrock-converse-stream.lazy.ts"
file_node(
    BEDROCK,
    "Bedrock Converse Stream 的惰性入口：用变量 specifier 动态 import Node-only AWS SDK，并允许 Bun 构建注入静态模块。",
    ["惰性加载", "api-wrapper", "factory", "node-only"],
    "simple",
    "变量 specifier 阻止 bundler 跟踪进 AWS SDK；`setBedrockProviderModule` 给无法打包动态 import 的 Bun binary 用。",
)
fn_node(
    BEDROCK,
    "setBedrockProviderModule",
    22,
    24,
    "覆盖默认的动态 Bedrock 实现，供 Bun 二进制静态注册模块。",
    ["factory", "bun", "覆盖点"],
    exported=True,
)
fn_node(
    BEDROCK,
    "bedrockConverseStreamApi",
    26,
    30,
    "返回 Bedrock Converse Stream 的 `lazyApi` 包装，优先使用注入模块。",
    ["factory", "惰性加载", "api-wrapper"],
    exported=True,
)
calls(f"function:{BEDROCK}:bedrockConverseStreamApi", "function:packages/ai/src/api/lazy.ts:lazyApi")

# lazy.ts
LAZY = "packages/ai/src/api/lazy.ts"
file_node(
    LAZY,
    "惰性 API 基础设施：同步返回 `AssistantMessageEventStream`，把动态 import 与 setup 失败转成 stream error event。",
    ["惰性加载", "factory", "stream", "基础设施"],
    "moderate",
    "setup 在 stream 背后异步执行；load 失败不会抛出到调用方，而是终止 outer stream。",
)
fn_node(
    LAZY,
    "createSetupErrorMessage",
    4,
    23,
    "把 setup/load 异常转成带 `stopReason: error` 的 `AssistantMessage`。",
    ["error-handling", "stream", "工具函数"],
)
fn_node(
    LAZY,
    "lazyStream",
    46,
    61,
    "立即返回 outer stream，并把异步 setup 的事件转发进去；失败则推 error event。",
    ["stream", "惰性加载", "factory"],
    exported=True,
    language_notes="调用方拿到的是同步 EventStream，auth/module load 在 then/catch 里完成。",
)
fn_node(
    LAZY,
    "lazyApi",
    73,
    98,
    "把动态 import 的 `ProviderStreams` 包成延迟执行的 stream/streamSimple，并可按需挂上 deferred 能力。",
    ["factory", "惰性加载", "api-wrapper"],
    exported=True,
)
calls(f"function:{LAZY}:lazyStream", "class:packages/ai/src/utils/event-stream.ts:AssistantMessageEventStream")

# ---------------------------------------------------------------------------
# auth core
# ---------------------------------------------------------------------------
CTX = "packages/ai/src/auth/context.ts"
file_node(
    CTX,
    "提供默认 `AuthContext`：从 `process.env` 读环境变量，经 `node:fs` 检查文件（浏览器中恒为 false）。",
    ["认证", "context", "基础设施"],
    "simple",
    "用变量 specifier 动态 import `node:fs/promises` 与 `node:os`，避免 browser bundler 解析 Node builtin。",
)
fn_node(
    CTX,
    "defaultProviderAuthContext",
    23,
    45,
    "构造默认认证上下文：trim 后的 env 查询，以及支持 `~` 展开的 fileExists。",
    ["认证", "factory", "context"],
    exported=True,
)

STORE = "packages/ai/src/auth/credential-store.ts"
file_node(
    STORE,
    "默认内存 `CredentialStore`：按 `Provider.id` 存一条凭证，并用 per-provider Promise 链串行化写入。",
    ["认证", "data-model", "credential-store"],
    "moderate",
    "modify/delete 走 enqueue，保证 refresh 与 login 不会并发双写同一 provider。",
)
class_node(
    STORE,
    "InMemoryCredentialStore",
    9,
    67,
    "实现 `CredentialStore`：Map 存凭证，enqueue 用 Promise 链 + abort 竞态串行化 per-provider 任务。",
    ["认证", "data-model", "in-memory"],
    "moderate",
    exported=True,
    language_notes="写入失败仍保留 chain tail，避免后续任务被先前 rejection 卡死。",
)
calls(f"class:{STORE}:InMemoryCredentialStore", "function:packages/ai/src/utils/abort.ts:operationSignal")
calls(f"class:{STORE}:InMemoryCredentialStore", "function:packages/ai/src/utils/abort.ts:raceWithAbortSignal")

HELP = "packages/ai/src/auth/helpers.ts"
file_node(
    HELP,
    "Provider 认证工厂：标准 env API key 解析，以及把 OAuth 实现挡在动态 import 后的 `lazyOAuth`。",
    ["认证", "factory", "惰性加载"],
    "moderate",
)
fn_node(
    HELP,
    "envApiKeyAuth",
    9,
    31,
    "生成标准 `ApiKeyAuth`：stored key 优先，否则依次解析 env；并带 secret prompt 的 login。",
    ["认证", "api-key", "factory"],
    exported=True,
)
fn_node(
    HELP,
    "lazyOAuth",
    40,
    59,
    "包装动态加载的 `OAuthAuth`，首次 login/refresh/toAuth 才执行 `input.load()`。",
    ["认证", "oauth", "惰性加载", "factory"],
    exported=True,
)

# ---------------------------------------------------------------------------
# oauth implementations
# ---------------------------------------------------------------------------
ANTH = "packages/ai/src/auth/oauth/anthropic.ts"
file_node(
    ANTH,
    "Anthropic Claude Pro/Max 的 authorization-code OAuth：本机 callback server、手动贴 code，以及 refresh。",
    ["oauth", "认证", "anthropic", "cli-only"],
    "complex",
    "CLIENT_ID 以 atob 混淆；callback 与 manual_code prompt 竞态，谁先到谁赢。",
)
fn_node(ANTH, "getNodeApis", 38, 50, "缓存并动态 import `node:http.createServer`，避免顶层 Node 依赖。", ["oauth", "node-only", "惰性加载"])
fn_node(ANTH, "parseAuthorizationInput", 52, 80, "从 redirect URL、query 或 `code#state` 文本解析 authorization code/state。", ["oauth", "parsing", "validation"])
fn_node(ANTH, "formatErrorDetails", 82, 97, "递归展开 token 错误对象，拼出可诊断的错误详情字符串。", ["error-handling", "oauth", "diagnostics"])
fn_node(ANTH, "startCallbackServer", 99, 168, "在 53692 端口起 loopback HTTP server，校验 state 并返回成功/失败 HTML。", ["oauth", "http-server", "callback"], complexity="moderate")
fn_node(ANTH, "postJson", 170, 188, "带 timeout 的 JSON POST，供 token 交换与 refresh 使用。", ["oauth", "http-client", "token"])
fn_node(ANTH, "exchangeAuthorizationCode", 190, 232, "用 authorization code + PKCE verifier 换 access/refresh token。", ["oauth", "token", "pkce"])
fn_node(ANTH, "loginAnthropic", 234, 312, "完整 Anthropic 登录：PKCE、打开授权页、callback/手动 code 竞态，再换票。", ["oauth", "login", "anthropic"], complexity="moderate")
fn_node(ANTH, "refreshAnthropicToken", 317, 353, "用 refresh token 向 Claude token 端点续期，并提前 5 分钟过期。", ["oauth", "refresh", "token"])
calls(f"function:{ANTH}:startCallbackServer", "function:packages/ai/src/auth/oauth/oauth-page.ts:oauthSuccessHtml")
calls(f"function:{ANTH}:startCallbackServer", "function:packages/ai/src/auth/oauth/oauth-page.ts:oauthErrorHtml")
calls(f"function:{ANTH}:loginAnthropic", "function:packages/ai/src/auth/oauth/pkce.ts:generatePKCE")
calls(f"function:{ANTH}:loginAnthropic", f"function:{ANTH}:startCallbackServer")
calls(f"function:{ANTH}:loginAnthropic", f"function:{ANTH}:exchangeAuthorizationCode")
calls(f"function:{ANTH}:exchangeAuthorizationCode", f"function:{ANTH}:postJson")
calls(f"function:{ANTH}:refreshAnthropicToken", f"function:{ANTH}:postJson")

DEV = "packages/ai/src/auth/oauth/device-code.ts"
file_node(
    DEV,
    "RFC 8628 device-code 轮询内核：可取消 sleep、pending/slow_down/timeout，供多个 OAuth provider 复用。",
    ["oauth", "device-code", "utility"],
    "moderate",
    "slow_down 优先采用服务端 interval，避免 WSL/VM 时钟漂移导致永远提前轮询。",
)
fn_node(DEV, "abortableSleep", 26, 44, "可被 AbortSignal 取消的 sleep，取消时以指定错误信息 reject。", ["utility", "abort", "oauth"], exported=True)
fn_node(DEV, "pollOAuthDeviceCodeFlow", 46, 98, "按 RFC 8628 轮询 device-code，处理 pending、slow_down、失败与超时。", ["oauth", "device-code", "polling"], exported=True, complexity="moderate")
calls(f"function:{DEV}:pollOAuthDeviceCodeFlow", f"function:{DEV}:abortableSleep")

GH = "packages/ai/src/auth/oauth/github-copilot.ts"
file_node(
    GH,
    "GitHub Copilot OAuth：device-code 登录、企业域、token 刷新，并拉取/启用 Copilot 模型目录。",
    ["oauth", "认证", "github-copilot", "device-code"],
    "complex",
    "登录后会对照内置 GITHUB_COPILOT_MODELS 尝试 enable 未配置模型；toAuth 按 token 推导 proxy baseUrl。",
)
fn_node(GH, "normalizeDomain", 41, 50, "规范化 GitHub Enterprise 域名，去掉协议与多余路径。", ["oauth", "parsing", "github-copilot"])
fn_node(GH, "getUrls", 52, 62, "按域名拼出 GitHub device-code / token 端点 URL。", ["oauth", "github-copilot", "config"])
fn_node(GH, "getGitHubCopilotBaseUrl", 78, 87, "从 Copilot token 或企业域推导请求用的 proxy baseUrl。", ["oauth", "github-copilot", "routing"])
fn_node(GH, "parseGitHubCopilotModelCatalog", 93, 133, "解析 Copilot 模型目录，按 picker/policy 过滤并可选回退到内置模型表。", ["oauth", "parsing", "catalog"])
fn_node(GH, "fetchWithRateLimitRetry", 135, 166, "带 Retry-After / rate-limit 等待的 fetch，避免 429 立刻失败。", ["http-client", "retry", "rate-limit"])
fn_node(GH, "fetchGitHubCopilotModels", 168, 195, "用 Copilot token 拉取模型目录并交给 catalog parser。", ["oauth", "catalog", "http-client"])
fn_node(GH, "startDeviceFlow", 206, 261, "向 GitHub 申请 device code，并规范化 verification URI。", ["oauth", "device-code", "login"], complexity="moderate")
fn_node(GH, "pollForGitHubAccessToken", 263, 311, "轮询 GitHub device-code 直到拿到 access/refresh token。", ["oauth", "device-code", "polling"])
fn_node(GH, "refreshGitHubCopilotAccessToken", 313, 348, "用 refresh token 换新的 GitHub/Copilot access token。", ["oauth", "refresh", "token"])
fn_node(GH, "refreshGitHubCopilotToken", 353, 367, "刷新 token 后顺带拉取最新模型目录，供 login/refresh 复用。", ["oauth", "refresh", "catalog"])
fn_node(GH, "enableGitHubCopilotModel", 373, 408, "对单个模型调用 Copilot policy API，尝试启用 picker。", ["oauth", "catalog", "http-client"])
fn_node(GH, "enableGitHubCopilotModels", 414, 432, "批量启用一组 Copilot 模型 id，并收集成功项。", ["oauth", "catalog", "batch"])
fn_node(GH, "loginGitHubCopilot", 434, 485, "可选企业域 → device flow → 换 Copilot token → 启用内置模型。", ["oauth", "login", "github-copilot"], complexity="moderate")
calls(f"function:{GH}:pollForGitHubAccessToken", f"function:{DEV}:pollOAuthDeviceCodeFlow")
calls(f"function:{GH}:fetchWithRateLimitRetry", "function:packages/ai/src/utils/sleep.ts:sleep")
calls(f"function:{GH}:loginGitHubCopilot", f"function:{GH}:startDeviceFlow")
calls(f"function:{GH}:loginGitHubCopilot", f"function:{GH}:pollForGitHubAccessToken")
calls(f"function:{GH}:refreshGitHubCopilotToken", f"function:{GH}:refreshGitHubCopilotAccessToken")
calls(f"function:{GH}:refreshGitHubCopilotToken", f"function:{GH}:fetchGitHubCopilotModels")
calls(f"function:{GH}:enableGitHubCopilotModels", f"function:{GH}:enableGitHubCopilotModel")

KIMI = "packages/ai/src/auth/oauth/kimi-coding.ts"
file_node(
    KIMI,
    "Kimi Code 订阅 OAuth：对 auth.kimi.com 走 RFC 8628 device grant，access token 作为 Bearer 调 coding API。",
    ["oauth", "认证", "kimi", "device-code"],
    "complex",
)
fn_node(KIMI, "trustedHttpUrl", 59, 68, "只接受 http(s) URL，拒绝 javascript/data 等不可信 verification URI。", ["validation", "security", "oauth"])
fn_node(KIMI, "startDeviceAuthorization", 70, 118, "向 Kimi OAuth host 申请 device authorization，并校验返回的 URI。", ["oauth", "device-code", "login"])
fn_node(KIMI, "parseTokenResponse", 120, 140, "把 token JSON 规范成 access/refresh/expires。", ["oauth", "parsing", "token"])
fn_node(KIMI, "pollForToken", 142, 208, "轮询 Kimi token 端点直到授权完成或失败。", ["oauth", "device-code", "polling"], complexity="moderate")
fn_node(KIMI, "refreshToken", 214, 265, "带有限次重试的 refresh；对可重试失败先 sleep 再 POST。", ["oauth", "refresh", "retry"], complexity="moderate")
fn_node(KIMI, "loginKimiCoding", 267, 279, "读取可覆盖的 OAuth host，启动 device 授权并轮询换票。", ["oauth", "login", "kimi"])
calls(f"function:{KIMI}:pollForToken", f"function:{DEV}:pollOAuthDeviceCodeFlow")
calls(f"function:{KIMI}:refreshToken", "function:packages/ai/src/utils/sleep.ts:sleep")
calls(f"function:{KIMI}:loginKimiCoding", f"function:{KIMI}:startDeviceAuthorization")
calls(f"function:{KIMI}:loginKimiCoding", f"function:{KIMI}:pollForToken")

LOAD = "packages/ai/src/auth/oauth/load.ts"
file_node(
    LOAD,
    "OAuth 流程加载器：默认用变量 specifier 动态 import 各 provider 实现，Bun 二进制可通过 register 注入静态模块。",
    ["oauth", "惰性加载", "factory", "barrel"],
    "moderate",
    "与 bedrock lazy wrapper 相同的 `.ts`/`.js` rewrite，避免 bundler 把 Node-only OAuth 拉进浏览器包。",
)
fn_node(LOAD, "registerBundledOAuthFlowLoaders", 27, 29, "注册静态打包的 OAuth loader，供独立 Bun 二进制绕过动态 import。", ["oauth", "factory", "bun"], exported=True)
fn_node(LOAD, "loadAnthropicOAuth", 31, 34, "加载 Anthropic OAuthAuth，优先走 bundled loader。", ["oauth", "惰性加载", "factory"], exported=True)
fn_node(LOAD, "loadOpenAICodexOAuth", 36, 39, "加载 OpenAI Codex OAuthAuth。", ["oauth", "惰性加载", "factory"], exported=True)
fn_node(LOAD, "loadGitHubCopilotOAuth", 41, 44, "加载 GitHub Copilot OAuthAuth。", ["oauth", "惰性加载", "factory"], exported=True)
fn_node(LOAD, "loadOpenRouterOAuth", 46, 49, "加载 OpenRouter OAuthAuth。", ["oauth", "惰性加载", "factory"], exported=True)
fn_node(LOAD, "loadKimiCodingOAuth", 51, 54, "加载 Kimi Coding OAuthAuth。", ["oauth", "惰性加载", "factory"], exported=True)
fn_node(LOAD, "loadXaiOAuth", 56, 59, "加载 xAI OAuthAuth。", ["oauth", "惰性加载", "factory"], exported=True)
fn_node(LOAD, "loadRadiusOAuth", 61, 68, "按 gateway 选项创建或加载 Radius OAuthAuth。", ["oauth", "惰性加载", "factory"], exported=True)
for dest in (
    ANTH,
    "packages/ai/src/auth/oauth/openai-codex.ts",
    GH,
    "packages/ai/src/auth/oauth/openrouter.ts",
    KIMI,
    "packages/ai/src/auth/oauth/xai.ts",
    "packages/ai/src/auth/oauth/radius.ts",
):
    depends_on(LOAD, dest)

PAGE = "packages/ai/src/auth/oauth/oauth-page.ts"
file_node(
    PAGE,
    "OAuth loopback 回调页 HTML：成功/失败模板，含转义与内嵌 logo，供本机 callback server 返回。",
    ["oauth", "html", "ui"],
    "moderate",
)
fn_node(PAGE, "renderPage", 12, 92, "渲染深色主题的 OAuth 结果页，对 title/heading/message/details 做 HTML escape。", ["html", "oauth", "rendering"], complexity="moderate")
fn_node(PAGE, "oauthSuccessHtml", 94, 100, "生成登录成功回调页 HTML。", ["html", "oauth", "success"], exported=True)
fn_node(PAGE, "oauthErrorHtml", 102, 109, "生成登录失败回调页 HTML，可附带 details。", ["html", "oauth", "error-handling"], exported=True)
calls(f"function:{PAGE}:oauthSuccessHtml", f"function:{PAGE}:renderPage")
calls(f"function:{PAGE}:oauthErrorHtml", f"function:{PAGE}:renderPage")

CODEX = "packages/ai/src/auth/oauth/openai-codex.ts"
file_node(
    CODEX,
    "OpenAI Codex / ChatGPT OAuth：浏览器 PKCE + 本机 1455 回调，以及可选 device-code 登录与 refresh。",
    ["oauth", "认证", "openai-codex", "cli-only"],
    "complex",
    "node:http/crypto 延迟绑定，禁止改成顶层 import，以免破坏 browser/Vite 构建。",
)
fn_node(CODEX, "parseAuthorizationInput", 73, 101, "从 redirect URL 或粘贴文本解析 Codex authorization code。", ["oauth", "parsing", "validation"])
fn_node(CODEX, "decodeJwt", 103, 113, "解码 access token JWT payload，供提取 account id。", ["oauth", "jwt", "parsing"])
fn_node(CODEX, "fetchWithLoginCancellation", 115, 124, "可随登录 AbortSignal 取消的 fetch 包装。", ["http-client", "abort", "oauth"])
fn_node(CODEX, "readTokenResponse", 126, 147, "读取并校验 token 响应，失败时带上 body 文本。", ["oauth", "token", "parsing"])
fn_node(CODEX, "exchangeAuthorizationCode", 149, 169, "用 code + PKCE verifier 向 auth.openai.com 换 token。", ["oauth", "token", "pkce"])
fn_node(CODEX, "refreshAccessToken", 171, 189, "用 refresh token 续期 Codex access token。", ["oauth", "refresh", "token"])
fn_node(CODEX, "startOpenAICodexDeviceAuth", 191, 233, "启动 Codex device-auth，拿到 user code 与 deviceAuthId。", ["oauth", "device-code", "login"])
fn_node(CODEX, "pollOpenAICodexDeviceAuth", 235, 291, "轮询 Codex device-auth token 端点直到完成。", ["oauth", "device-code", "polling"], complexity="moderate")
fn_node(CODEX, "createAuthorizationFlow", 293, 312, "生成 PKCE + state，并拼出浏览器授权 URL。", ["oauth", "pkce", "login"])
fn_node(CODEX, "startLocalOAuthServer", 320, 394, "在 1455 端口起 Codex 回调 server，校验 state 并展示结果页。", ["oauth", "http-server", "callback"], complexity="moderate")
fn_node(CODEX, "credentialsFromToken", 403, 416, "从 token 响应提取 account id 并做成 `OAuthCredential`。", ["oauth", "credential", "parsing"])
fn_node(CODEX, "loginOpenAICodexDeviceCode", 427, 443, "device-code 路径的 Codex 登录。", ["oauth", "login", "device-code"])
fn_node(CODEX, "loginOpenAICodex", 445, 506, "浏览器 PKCE 登录：本机回调与手动贴 code 竞态后换票。", ["oauth", "login", "pkce"], complexity="moderate")
calls(f"function:{CODEX}:createAuthorizationFlow", "function:packages/ai/src/auth/oauth/pkce.ts:generatePKCE")
calls(f"function:{CODEX}:startLocalOAuthServer", f"function:{PAGE}:oauthSuccessHtml")
calls(f"function:{CODEX}:startLocalOAuthServer", f"function:{PAGE}:oauthErrorHtml")
calls(f"function:{CODEX}:pollOpenAICodexDeviceAuth", f"function:{DEV}:pollOAuthDeviceCodeFlow")
calls(f"function:{CODEX}:loginOpenAICodex", f"function:{CODEX}:createAuthorizationFlow")
calls(f"function:{CODEX}:loginOpenAICodex", f"function:{CODEX}:startLocalOAuthServer")
calls(f"function:{CODEX}:loginOpenAICodexDeviceCode", f"function:{CODEX}:startOpenAICodexDeviceAuth")
calls(f"function:{CODEX}:loginOpenAICodexDeviceCode", f"function:{CODEX}:pollOpenAICodexDeviceAuth")

OR = "packages/ai/src/auth/oauth/openrouter.ts"
file_node(
    OR,
    "OpenRouter PKCE OAuth：授权码换成永久用户 API key；ephemeral 端口回调与手动粘贴 redirect 竞态。",
    ["oauth", "认证", "openrouter", "cli-only"],
    "complex",
    "交换结果是长期 API key 而非会过期的 access/refresh 对。",
)
fn_node(OR, "parseAuthorizationInput", 52, 67, "从 redirect URL 或 query 文本取出 OpenRouter authorization code。", ["oauth", "parsing", "validation"])
fn_node(OR, "errorDetail", 69, 78, "从 token 错误 JSON 提取可读的 error / description。", ["error-handling", "oauth", "diagnostics"])
fn_node(OR, "exchangeAuthorizationCode", 80, 133, "用 code + PKCE verifier 向 OpenRouter 换永久 API key。", ["oauth", "token", "pkce"], complexity="moderate")
fn_node(OR, "startCallbackServer", 135, 240, "在 ephemeral 端口起一次性回调 server，成功则直接完成 key exchange。", ["oauth", "http-server", "callback"], complexity="moderate")
fn_node(OR, "loginOpenRouter", 242, 299, "启动 PKCE 登录：打开授权页，回调与手动 code 竞态后换 key。", ["oauth", "login", "openrouter"], complexity="moderate")
calls(f"function:{OR}:loginOpenRouter", "function:packages/ai/src/auth/oauth/pkce.ts:generatePKCE")
calls(f"function:{OR}:loginOpenRouter", f"function:{OR}:startCallbackServer")
calls(f"function:{OR}:startCallbackServer", f"function:{PAGE}:oauthSuccessHtml")
calls(f"function:{OR}:startCallbackServer", f"function:{PAGE}:oauthErrorHtml")
calls(f"function:{OR}:startCallbackServer", f"function:{OR}:exchangeAuthorizationCode")

PKCE = "packages/ai/src/auth/oauth/pkce.ts"
file_node(
    PKCE,
    "基于 Web Crypto 的 PKCE 工具：生成 verifier 与 SHA-256 challenge，Node 20+ 与浏览器通用。",
    ["oauth", "pkce", "utility", "crypto"],
    "simple",
    "只用 Web Crypto（getRandomValues + subtle.digest），不依赖 node:crypto。",
)
fn_node(PKCE, "generatePKCE", 21, 34, "生成 32 字节 verifier 及其 S256 challenge。", ["oauth", "pkce", "crypto"], exported=True)

RAD = "packages/ai/src/auth/oauth/radius.ts"
file_node(
    RAD,
    "Radius gateway OAuth：发现授权端点后可选浏览器 PKCE 或 device-code，token API 落在配置的 gateway 上。",
    ["oauth", "认证", "radius", "cli-only"],
    "complex",
    "node:http 延迟绑定；模型目录由 Radius provider 负责，本文件只做登录。",
)
fn_node(RAD, "loadRadiusOAuthDiscovery", 49, 66, "从 gateway `/v1/oauth` 发现浏览器 authorization endpoint。", ["oauth", "discovery", "http-client"])
fn_node(RAD, "readOAuthResponseError", 84, 100, "把失败的 OAuth HTTP 响应解析成带 status/oauthError 的错误。", ["error-handling", "oauth", "diagnostics"])
fn_node(RAD, "requestOAuthToken", 102, 140, "向 gateway token 端点 POST，返回规范化 credential。", ["oauth", "token", "http-client"])
fn_node(RAD, "startOAuthCallbackServer", 147, 218, "在 1456 端口起 Radius 回调 server，校验 state 并展示结果页。", ["oauth", "http-server", "callback"], complexity="moderate")
fn_node(RAD, "loginWithBrowser", 220, 269, "浏览器 PKCE 登录：打开发现到的 authorize URL，等 callback 后换票。", ["oauth", "login", "pkce"], complexity="moderate")
fn_node(RAD, "requestDeviceAuthorization", 271, 303, "向 gateway 申请 device authorization。", ["oauth", "device-code", "http-client"])
fn_node(RAD, "loginWithDeviceCode", 305, 350, "device-code 登录：展示 user code 并轮询 token。", ["oauth", "login", "device-code"])
fn_node(RAD, "createRadiusOAuth", 357, 403, "按 gateway URL 构造 `OAuthAuth`，login 时让用户选 browser 或 device-code。", ["oauth", "factory", "radius"], exported=True)
calls(f"function:{RAD}:createRadiusOAuth", "function:packages/ai/src/providers/radius-config.ts:normalizeRadiusGatewayUrl")
calls(f"function:{RAD}:loginWithBrowser", f"function:{PKCE}:generatePKCE")
calls(f"function:{RAD}:loginWithBrowser", f"function:{RAD}:startOAuthCallbackServer")
calls(f"function:{RAD}:loginWithBrowser", f"function:{RAD}:requestOAuthToken")
calls(f"function:{RAD}:startOAuthCallbackServer", f"function:{PAGE}:oauthSuccessHtml")
calls(f"function:{RAD}:startOAuthCallbackServer", f"function:{PAGE}:oauthErrorHtml")
calls(f"function:{RAD}:loginWithDeviceCode", f"function:{DEV}:pollOAuthDeviceCodeFlow")
calls(f"function:{RAD}:loginWithDeviceCode", f"function:{RAD}:requestDeviceAuthorization")
calls(f"function:{RAD}:requestOAuthToken", f"function:{RAD}:readOAuthResponseError")

XAI = "packages/ai/src/auth/oauth/xai.ts"
file_node(
    XAI,
    "xAI SuperGrok / X Premium 的 device-code OAuth：校验 verification URI，轮询 token 并支持 refresh。",
    ["oauth", "认证", "xai", "device-code"],
    "complex",
)
fn_node(XAI, "validateVerificationUri", 51, 62, "校验 xAI verification URI 必须是可信 http(s) URL。", ["validation", "security", "oauth"])
fn_node(XAI, "postForm", 64, 98, "向 xAI OAuth 端点 POST form，并解析 JSON body。", ["http-client", "oauth", "token"])
fn_node(XAI, "parseDeviceCode", 108, 126, "校验 device-code 响应字段并规范化 interval/expiry。", ["oauth", "parsing", "device-code"])
fn_node(XAI, "credentialsFromTokenResponse", 128, 143, "从 token JSON 构造 `OAuthCredential`，过期时间含 5 分钟 skew。", ["oauth", "credential", "parsing"])
fn_node(XAI, "requestDeviceCode", 145, 159, "向 xAI 申请 device code。", ["oauth", "device-code", "login"])
fn_node(XAI, "pollForTokens", 161, 199, "轮询 xAI token 端点直到授权完成。", ["oauth", "device-code", "polling"])
fn_node(XAI, "loginXai", 201, 211, "发起 device-code 登录并轮询换票。", ["oauth", "login", "xai"])
fn_node(XAI, "refreshXaiToken", 213, 227, "用 refresh token 续期 xAI access token。", ["oauth", "refresh", "token"])
calls(f"function:{XAI}:pollForTokens", f"function:{DEV}:pollOAuthDeviceCodeFlow")
calls(f"function:{XAI}:loginXai", f"function:{XAI}:requestDeviceCode")
calls(f"function:{XAI}:loginXai", f"function:{XAI}:pollForTokens")
calls(f"function:{XAI}:refreshXaiToken", f"function:{XAI}:postForm")
calls(f"function:{XAI}:requestDeviceCode", f"function:{XAI}:postForm")

RES = "packages/ai/src/auth/resolve.ts"
file_node(
    RES,
    "`Models` / `ImagesModels` 共用的认证解析：stored credential 独占 provider，OAuth 用双重检查锁刷新。",
    ["认证", "resolution", "oauth", "error-handling"],
    "moderate",
    "过期 token 在 CredentialStore.modify 锁内再检查一次，避免并发双刷新。",
)
class_node(
    RES,
    "ModelsError",
    26,
    34,
    "带 `ModelsErrorCode` 的 Error，把 cause 细节折叠进 message 供 UI 只展示 `error.message`。",
    ["error-handling", "认证", "data-model"],
    "simple",
    exported=True,
)
fn_node(
    RES,
    "resolveProviderAuth",
    50,
    61,
    "对外入口：接上 abort signal 后解析 provider 的 request auth。",
    ["认证", "resolution", "entry-point"],
    exported=True,
)
fn_node(RES, "resolveProviderAuthWithSignal", 63, 110, "按 override apiKey → stored oauth/api_key → ambient env 的优先级解析认证。", ["认证", "resolution", "oauth"])
fn_node(RES, "resolveStoredOAuth", 127, 179, "对快过期的 OAuth 凭证做双重检查锁刷新，再 `toAuth` 成 request auth。", ["认证", "oauth", "refresh"], complexity="moderate")
fn_node(RES, "resolveApiKey", 181, 193, "调用 `ApiKeyAuth.resolve`，失败包装为 `ModelsError(\"auth\")`。", ["认证", "api-key", "error-handling"])
fn_node(RES, "readCredential", 195, 205, "从 store 读凭证，存储失败包装为 `ModelsError(\"auth\")`。", ["认证", "credential-store", "error-handling"])
calls(f"function:{RES}:resolveProviderAuth", "function:packages/ai/src/utils/abort.ts:operationSignal")
calls(f"function:{RES}:resolveProviderAuth", "function:packages/ai/src/utils/abort.ts:raceWithAbortSignal")
calls(f"function:{RES}:resolveProviderAuth", f"function:{RES}:resolveProviderAuthWithSignal")
calls(f"function:{RES}:resolveProviderAuthWithSignal", f"function:{RES}:resolveStoredOAuth")
calls(f"function:{RES}:resolveProviderAuthWithSignal", f"function:{RES}:resolveApiKey")
calls(f"function:{RES}:resolveProviderAuthWithSignal", f"function:{RES}:readCredential")

TYPES = "packages/ai/src/auth/types.ts"
file_node(
    TYPES,
    "认证领域类型：`ModelAuth`、凭证、`CredentialStore`、login 交互，以及 `ApiKeyAuth`/`OAuthAuth`/`ProviderAuth`。",
    ["type-definition", "认证", "data-model"],
    "complex",
    "纯类型模块，无运行时导出；`OAuthAuth` 把 refresh 与 toAuth 拆开以便 Models 持有刷新锁。",
)

BUN = "packages/ai/src/bun-oauth.ts"
file_node(
    BUN,
    "把各 OAuth 实现静态注册进 bundled loader，供独立 Bun 二进制绕过动态 import。",
    ["oauth", "bun", "entry-point", "factory"],
    "simple",
)
fn_node(
    BUN,
    "registerBunOAuthFlows",
    11,
    21,
    "把 7 个内置 OAuth 流程交给 `registerBundledOAuthFlowLoaders`。",
    ["oauth", "bun", "factory"],
    exported=True,
)
calls(f"function:{BUN}:registerBunOAuthFlows", f"function:{LOAD}:registerBundledOAuthFlowLoaders")

CLI = "packages/ai/src/cli.ts"
file_node(
    CLI,
    "`@earendil-works/pi-ai` 的小 CLI：列出带 OAuth 的内置 provider，并把 login 结果写入 `auth.json`。",
    ["entry-point", "cli", "oauth", "认证"],
    "moderate",
)
fn_node(CLI, "answerPrompt", 31, 43, "用 readline 回答 select 或文本/secret 的 `AuthPrompt`。", ["cli", "prompt", "交互"])
fn_node(CLI, "login", 45, 77, "跑指定 provider 的 OAuth login，打印 auth_url/device_code，并持久化凭证。", ["cli", "oauth", "login"])
fn_node(CLI, "main", 79, 114, "解析 `login`/`list`/`help` 子命令；login 可交互选择 provider。", ["entry-point", "cli", "command"], complexity="simple")
calls(f"function:{CLI}:login", f"function:{CLI}:answerPrompt")
calls(f"function:{CLI}:main", f"function:{CLI}:login")

COMPAT = "packages/ai/src/compat.ts"
file_node(
    COMPAT,
    "旧全局 pi-ai API 兼容层：惰性 API 注册表、`stream`/`complete`、env API key 注入，以及 catalog 只读别名。",
    ["兼容层", "api-registry", "entry-point", "stream"],
    "complex",
    "模块加载时注册内置 API；新代码应改用 `createModels()`。本模块随 ModelManager 迁移删除。",
)
fn_node(COMPAT, "wrapStream", 102, 112, "校验 model.api 后转调底层 stream。", ["validation", "stream", "adapter"])
fn_node(COMPAT, "wrapStreamSimple", 114, 124, "校验 model.api 后转调底层 streamSimple。", ["validation", "stream", "adapter"])
fn_node(COMPAT, "registerApiProvider", 126, 138, "把某个 API 的 stream 对注册进全局 api-registry。", ["api-registry", "factory", "兼容层"], exported=True)
fn_node(COMPAT, "getApiProvider", 140, 142, "按 api id 取出已注册的 stream 实现。", ["api-registry", "lookup"], exported=True)
fn_node(COMPAT, "getApiProviders", 144, 146, "列出全部已注册 API provider。", ["api-registry", "lookup"], exported=True)
fn_node(COMPAT, "unregisterApiProviders", 148, 154, "按 sourceId 卸载一批 API provider（测试/扩展覆盖用）。", ["api-registry", "teardown"], exported=True)
fn_node(COMPAT, "registerFauxProvider", 160, 176, "注册可编排的 faux provider，返回带 unregister 的测试夹具。", ["test", "factory", "faux"], exported=True)
fn_node(COMPAT, "registerBuiltInApiProviders", 198, 205, "把 10 个惰性内置 API 填进 registry，不覆盖已有条目。", ["api-registry", "bootstrap", "惰性加载"], exported=True)
fn_node(COMPAT, "resetApiProviders", 207, 211, "清空 registry 并重新注册内置 API。", ["api-registry", "teardown", "test"], exported=True)
fn_node(COMPAT, "stream", 250, 264, "兼容入口：优先走 builtin provider，必要时注入 env API key 再 stream。", ["stream", "兼容层", "entry-point"], exported=True)
fn_node(COMPAT, "complete", 266, 273, "对 `stream()` 取 `result()`，返回完整 AssistantMessage。", ["stream", "兼容层"], exported=True)
fn_node(COMPAT, "streamSimple", 275, 289, "`stream` 的 simple-options 版本。", ["stream", "兼容层", "entry-point"], exported=True)
fn_node(COMPAT, "completeSimple", 291, 298, "对 `streamSimple()` 取 `result()`。", ["stream", "兼容层"], exported=True)
calls(f"function:{COMPAT}:registerApiProvider", f"function:{COMPAT}:wrapStream")
calls(f"function:{COMPAT}:registerApiProvider", f"function:{COMPAT}:wrapStreamSimple")
calls(f"function:{COMPAT}:registerFauxProvider", "function:packages/ai/src/providers/faux.ts:createFauxCore")
calls(f"function:{COMPAT}:registerFauxProvider", f"function:{COMPAT}:registerApiProvider")
calls(f"function:{COMPAT}:registerBuiltInApiProviders", f"function:{COMPAT}:registerApiProvider")
calls(f"function:{COMPAT}:registerBuiltInApiProviders", f"function:{COMPAT}:getApiProvider")
calls(f"function:{COMPAT}:resetApiProviders", f"function:{COMPAT}:registerBuiltInApiProviders")
calls(f"function:{COMPAT}:stream", "function:packages/ai/src/env-api-keys.ts:getEnvApiKey")
calls(f"function:{COMPAT}:streamSimple", "function:packages/ai/src/env-api-keys.ts:getEnvApiKey")
calls(f"function:{COMPAT}:complete", f"function:{COMPAT}:stream")
calls(f"function:{COMPAT}:completeSimple", f"function:{COMPAT}:streamSimple")
for path, name, _label, _impl in LAZY_APIS:
    calls(f"function:{COMPAT}:registerBuiltInApiProviders", f"function:{path}:{name}")
calls(f"function:{COMPAT}:registerBuiltInApiProviders", f"function:{BEDROCK}:bedrockConverseStreamApi")

EXT = "packages/ai/src/compat/extension-oauth-types.ts"
file_node(
    EXT,
    "coding-agent 扩展兼容用的遗留 OAuth 回调类型（prompt/device-code/select），并再导出 `OAuthCredentials`。",
    ["type-definition", "兼容层", "oauth", "extension"],
    "simple",
)

# ---------------------------------------------------------------------------
# imports (must equal sum of batchImportData lengths)
# ---------------------------------------------------------------------------
import_edges = 0
for src, targets in IMPORTS.items():
    for dest in targets:
        add_edge(
            {
                "source": f"file:{src}",
                "target": f"file:{dest}",
                "type": "imports",
                "direction": "forward",
                "weight": 0.7,
            }
        )
        import_edges += 1

expected_imports = sum(len(v) for v in IMPORTS.values())
if import_edges != expected_imports:
    raise SystemExit(f"import edge mismatch: {import_edges} != {expected_imports}")

# ---------------------------------------------------------------------------
# split
# ---------------------------------------------------------------------------
node_count = len(nodes)
edge_count = len(edges)
print(f"TOTAL nodes={node_count} edges={edge_count} imports={import_edges}")

files = sorted({n["filePath"] for n in nodes if n.get("filePath")})
if node_count <= 60 and edge_count <= 120:
    parts = 1
else:
    parts = math.ceil(max(node_count / 60, edge_count / 120))

chunk = math.ceil(len(files) / parts)
file_groups: list[list[str]] = []
for i in range(parts):
    file_groups.append(files[i * chunk : (i + 1) * chunk])
file_groups = [g for g in file_groups if g]

# neighbor / import path sets for validation
neighbor_paths = set()
neighbor_symbols: dict[str, set[str]] = {}
for src, neighs in NEIGHBOR_MAP.items():
    for n in neighs:
        neighbor_paths.add(n["path"])
        neighbor_symbols.setdefault(n["path"], set()).update(n.get("symbols") or [])
import_paths = set()
for src, dests in IMPORTS.items():
    import_paths.add(src)
    import_paths.update(dests)
batch_file_paths = set(IMPORTS.keys()) | set(files)


def edge_ok(e: dict, part_ids: set[str]) -> tuple[bool, str]:
    def ok(ref: str) -> tuple[bool, str]:
        if ref in part_ids:
            return True, ""
        if ref.startswith("file:"):
            p = ref[len("file:") :]
            if p in neighbor_paths or p in import_paths or p in batch_file_paths:
                return True, ""
            return False, f"unknown file ref {ref}"
        if ref.startswith("function:") or ref.startswith("class:"):
            _, path, symbol = ref.split(":", 2)
            if symbol in neighbor_symbols.get(path, set()):
                return True, ""
            # same-batch symbol in another part: allowed only if we can see it as neighbor
            if path in batch_file_paths:
                # same-batch cross-part function/class — not in neighborMap
                return False, f"cross-part same-batch symbol {ref}"
            return False, f"unknown symbol ref {ref}"
        return False, f"bad ref {ref}"

    s_ok, s_why = ok(e["source"])
    if not s_ok:
        return False, f"source {s_why}"
    t_ok, t_why = ok(e["target"])
    if not t_ok:
        return False, f"target {t_why}"
    return True, ""


out_dir = UA_DIR / "intermediate"
written = []
dropped_calls = 0

if parts == 1:
    payload = {"nodes": nodes, "edges": edges}
    dest = out_dir / "batch-3.json"
    dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    written.append((dest.name, len(nodes), len(edges)))
else:
    for idx, group in enumerate(file_groups, start=1):
        group_set = set(group)
        part_nodes = [n for n in nodes if n.get("filePath") in group_set]
        part_ids = {n["id"] for n in part_nodes}
        part_edges = []
        failed = []
        for e in edges:
            if e["source"] not in part_ids:
                continue
            ok, why = edge_ok(e, part_ids)
            if not ok:
                # Drop only same-batch cross-part calls/depends that cannot validate;
                # imports should always validate via batchImportData.
                if e["type"] in {"calls", "depends_on"}:
                    dropped_calls += 1
                    continue
                failed.append((e, why))
            else:
                part_edges.append(e)
        if failed:
            raise SystemExit(
                f"part {idx} validation failed:\n"
                + "\n".join(f"  {e['type']} {e['source']} -> {e['target']}: {why}" for e, why in failed[:20])
            )
        dest = out_dir / f"batch-3-part-{idx}.json"
        dest.write_text(json.dumps({"nodes": part_nodes, "edges": part_edges}, ensure_ascii=False, indent=2) + "\n")
        written.append((dest.name, len(part_nodes), len(part_edges)))

print("parts", parts, "chunk", chunk)
print("dropped_unvalidatable", dropped_calls)
for name, nc, ec in written:
    print(f"wrote {name} nodes={nc} edges={ec}")
print("files", len(files), files)
