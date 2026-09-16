#!/usr/bin/env python3
"""Emit batch-4 knowledge graph fragments."""
from __future__ import annotations

import json
import math
from pathlib import Path

UA_DIR = Path("/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua")
BRIEF = json.loads((UA_DIR / "intermediate/batch-briefs/batch-4.json").read_text())
IMPORTS: dict[str, list[str]] = BRIEF["batchImportData"]
NEIGHBOR_MAP: dict[str, list[dict]] = BRIEF["neighborMap"]

OUT_DIR = UA_DIR / "intermediate"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def N(
    id: str,
    type: str,
    name: str,
    summary: str,
    tags: list[str],
    complexity: str,
    filePath: str | None = None,
    lineRange: list[int] | None = None,
    languageNotes: str | None = None,
) -> dict:
    node = {
        "id": id,
        "type": type,
        "name": name,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }
    if filePath is not None:
        node["filePath"] = filePath
    if lineRange is not None:
        node["lineRange"] = lineRange
    if languageNotes is not None:
        node["languageNotes"] = languageNotes
    return node


def E(source: str, target: str, typ: str, weight: float) -> dict:
    return {
        "source": source,
        "target": target,
        "type": typ,
        "direction": "forward",
        "weight": weight,
    }


def file_id(path: str) -> str:
    return f"file:{path}"


def fn_id(path: str, name: str) -> str:
    return f"function:{path}:{name}"


def class_id(path: str, name: str) -> str:
    return f"class:{path}:{name}"


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

P_IMG = "packages/ai/src/images-models.ts"
P_CAT = "packages/ai/src/model-catalog.ts"
P_MOD = "packages/ai/src/models.ts"
P_ALL = "packages/ai/src/providers/all.ts"
P_BR_M = "packages/ai/src/providers/amazon-bedrock.models.ts"
P_BR = "packages/ai/src/providers/amazon-bedrock.ts"
P_AL_M = "packages/ai/src/providers/ant-ling.models.ts"
P_AL = "packages/ai/src/providers/ant-ling.ts"
P_AN_M = "packages/ai/src/providers/anthropic.models.ts"
P_AN = "packages/ai/src/providers/anthropic.ts"
P_AZ_M = "packages/ai/src/providers/azure-openai-responses.models.ts"
P_AZ = "packages/ai/src/providers/azure-openai-responses.ts"
P_BA_M = "packages/ai/src/providers/baseten.models.ts"
P_BA = "packages/ai/src/providers/baseten.ts"
P_CE_M = "packages/ai/src/providers/cerebras.models.ts"
P_CE = "packages/ai/src/providers/cerebras.ts"
P_CG_M = "packages/ai/src/providers/cloudflare-ai-gateway.models.ts"
P_CG = "packages/ai/src/providers/cloudflare-ai-gateway.ts"
P_CA = "packages/ai/src/providers/cloudflare-auth.ts"
P_CS = "packages/ai/src/providers/cloudflare-stream.ts"
P_CW_M = "packages/ai/src/providers/cloudflare-workers-ai.models.ts"
P_CW = "packages/ai/src/providers/cloudflare-workers-ai.ts"
P_DS_M = "packages/ai/src/providers/deepseek.models.ts"
P_DS = "packages/ai/src/providers/deepseek.ts"
P_FW_M = "packages/ai/src/providers/fireworks.models.ts"
P_FW = "packages/ai/src/providers/fireworks.ts"
P_GH_M = "packages/ai/src/providers/github-copilot.models.ts"
P_GH = "packages/ai/src/providers/github-copilot.ts"
P_GV_M = "packages/ai/src/providers/google-vertex.models.ts"
P_GV = "packages/ai/src/providers/google-vertex.ts"
P_GO_M = "packages/ai/src/providers/google.models.ts"

nodes: list[dict] = [
    N(
        file_id(P_IMG),
        "file",
        "images-models.ts",
        "图像生成侧的 provider/registry：定义 ImagesProvider 与 ImagesModels，解析认证后调用 generateImages，失败以 AssistantImages 错误结果返回。",
        ["图像生成", "registry", "认证", "factory"],
        "complex",
        P_IMG,
        languageNotes="与 chat 侧 Models 对称：独立的 provider 集合、CredentialStore 与 getAuth 合同。",
    ),
    N(
        class_id(P_IMG, "ImagesModelsImpl"),
        "class",
        "ImagesModelsImpl",
        "可变图像模型注册表：按 provider 查询/刷新目录，resolveProviderAuth 后转发 generateImages，异常转为 stopReason=error。",
        ["registry", "图像生成", "认证"],
        "complex",
        P_IMG,
        [97, 225],
    ),
    N(
        fn_id(P_IMG, "createImagesModels"),
        "function",
        "createImagesModels",
        "工厂函数：用可选 credentials/authContext 构造 ImagesModelsImpl。",
        ["factory", "图像生成", "registry"],
        "simple",
        P_IMG,
        [227, 229],
    ),
    N(
        fn_id(P_IMG, "createImagesProvider"),
        "function",
        "createImagesProvider",
        "由静态目录、可选 refreshModels 与 ImagesApi 组装 ImagesProvider；并发 refresh 合并为一次 in-flight 请求。",
        ["factory", "provider", "图像生成"],
        "moderate",
        P_IMG,
        [251, 275],
    ),
    N(
        file_id(P_CAT),
        "file",
        "model-catalog.ts",
        "为各 provider 的 *.models.ts 提供 ModelCatalog 类型，以及把按 API 分组的 JSON 目录展平为 id→Model 映射。",
        ["type-definition", "模型目录", "utility"],
        "simple",
        P_CAT,
        languageNotes="使用 const 类型参数把 JSON 分组键提升为 Model.id / Model.api。",
    ),
    N(
        fn_id(P_CAT, "flattenModelCatalog"),
        "function",
        "flattenModelCatalog",
        "把按 API 分组的模型对象合并成单一 ModelCatalog；provider 参数仅用于类型绑定。",
        ["utility", "模型目录", "serialization"],
        "simple",
        P_CAT,
        [22, 27],
    ),
    N(
        file_id(P_MOD),
        "file",
        "models.ts",
        "chat 模型运行时核心：Provider 注册、带 generation/abort 的目录刷新、认证登录与 stream/complete/deferred 调度；并重导出 ModelsError。",
        ["registry", "provider", "认证", "streaming"],
        "complex",
        P_MOD,
        languageNotes="refresh 用 generation 计数与 AbortController 作废过期写入；publication 链串行化 modelsStore 持久化。",
    ),
    N(
        fn_id(P_MOD, "mergeHeaders"),
        "function",
        "mergeHeaders",
        "合并 ProviderHeaders，按大小写不敏感覆盖同名头，供 getAuth/applyAuth 叠加请求头。",
        ["utility", "http-headers", "request"],
        "simple",
        P_MOD,
        [243, 257],
    ),
    N(
        class_id(P_MOD, "ModelsImpl"),
        "class",
        "ModelsImpl",
        "可变 Models 实现：管理 provider 与凭证、分阶段刷新并发布目录，以及 applyAuth 后的 stream/complete/deferred 入口。",
        ["registry", "认证", "streaming", "service"],
        "complex",
        P_MOD,
        [259, 746],
    ),
    N(
        fn_id(P_MOD, "createModels"),
        "function",
        "createModels",
        "工厂函数：用可选 CredentialStore、ModelsStore 与 AuthContext 构造 ModelsImpl。",
        ["factory", "registry", "entry-point"],
        "simple",
        P_MOD,
        [748, 750],
    ),
    N(
        fn_id(P_MOD, "createProvider"),
        "function",
        "createProvider",
        "由认证、静态/动态模型与单 API 或按 model.api 分发的 streams 组装 Provider；支持 restore/publish 事务与 deferred 响应。",
        ["factory", "provider", "streaming"],
        "complex",
        P_MOD,
        [775, 875],
    ),
    N(
        fn_id(P_MOD, "hasApi"),
        "function",
        "hasApi",
        "运行时收窄：当 model.api 等于给定 Api 时，把动态查出的 Model 收窄为该 API 的类型。",
        ["utility", "type-definition", "validation"],
        "simple",
        P_MOD,
        [887, 889],
    ),
    N(
        fn_id(P_MOD, "calculateCost"),
        "function",
        "calculateCost",
        "按模型费率与 usage 计算费用，支持阶梯定价，并对 Anthropic 1h cache write 按 2× input 计费。",
        ["utility", "cost", "pricing"],
        "moderate",
        P_MOD,
        [891, 911],
    ),
    N(
        fn_id(P_MOD, "getSupportedThinkingLevels"),
        "function",
        "getSupportedThinkingLevels",
        "根据 model.reasoning 与 thinkingLevelMap 返回可用 thinking level；无 reasoning 时仅 off。",
        ["utility", "reasoning", "validation"],
        "simple",
        P_MOD,
        [915, 924],
    ),
    N(
        fn_id(P_MOD, "clampThinkingLevel"),
        "function",
        "clampThinkingLevel",
        "把请求的 thinking level 钳到模型支持集：先向上再向下邻近查找，否则回退到第一个可用值。",
        ["utility", "reasoning", "validation"],
        "moderate",
        P_MOD,
        [926, 945],
    ),
    N(
        fn_id(P_MOD, "modelsAreEqual"),
        "function",
        "modelsAreEqual",
        "比较两个 Model 的 id 与 provider；任一方为空则返回 false。",
        ["utility", "equality", "validation"],
        "simple",
        P_MOD,
        [951, 957],
    ),
    N(
        file_id(P_ALL),
        "file",
        "all.ts",
        "内置 provider 聚合入口：从生成目录读取模型、构造全部 chat/image provider，并提供 builtinModels / builtinImagesModels。",
        ["entry-point", "barrel", "provider", "factory"],
        "moderate",
        P_ALL,
        languageNotes="重导出 radiusProvider；静态目录来自 models.generated.ts，时间戳来自 data/.manifest.json。",
    ),
    N(
        fn_id(P_ALL, "getBuiltinModel"),
        "function",
        "getBuiltinModel",
        "按 provider 与 modelId 从生成目录 MODELS 做类型安全查找。",
        ["模型目录", "lookup", "type-definition"],
        "simple",
        P_ALL,
        [61, 67],
    ),
    N(
        fn_id(P_ALL, "getBuiltinProviders"),
        "function",
        "getBuiltinProviders",
        "返回生成目录中出现过的 BuiltinProvider id 列表。",
        ["模型目录", "lookup", "provider"],
        "simple",
        P_ALL,
        [69, 71],
    ),
    N(
        fn_id(P_ALL, "getBuiltinModelDataGeneratedAt"),
        "function",
        "getBuiltinModelDataGeneratedAt",
        "解析模型数据 manifest 的 generatedAt，供调用方判断内置目录新鲜度。",
        ["模型目录", "metadata", "utility"],
        "simple",
        P_ALL,
        [74, 77],
    ),
    N(
        fn_id(P_ALL, "getBuiltinModels"),
        "function",
        "getBuiltinModels",
        "返回某内置 provider 在生成目录中的全部 Model；未知 provider 得到空数组。",
        ["模型目录", "lookup", "provider"],
        "simple",
        P_ALL,
        [79, 86],
    ),
    N(
        fn_id(P_ALL, "builtinProviders"),
        "function",
        "builtinProviders",
        "依次调用各内置工厂，返回一组全新构造的 chat Provider。",
        ["factory", "provider", "entry-point"],
        "moderate",
        P_ALL,
        [89, 132],
    ),
    N(
        fn_id(P_ALL, "builtinModels"),
        "function",
        "builtinModels",
        "createModels 后注册全部 builtinProviders，得到开箱即用的 MutableModels。",
        ["factory", "registry", "entry-point"],
        "simple",
        P_ALL,
        [135, 141],
    ),
    N(
        fn_id(P_ALL, "builtinImagesProviders"),
        "function",
        "builtinImagesProviders",
        "返回内置图像 provider 列表（当前仅 OpenRouter Images）。",
        ["factory", "图像生成", "provider"],
        "simple",
        P_ALL,
        [144, 146],
    ),
    N(
        fn_id(P_ALL, "builtinImagesModels"),
        "function",
        "builtinImagesModels",
        "createImagesModels 后注册全部内置图像 provider，得到 MutableImagesModels。",
        ["factory", "图像生成", "registry"],
        "simple",
        P_ALL,
        [149, 155],
    ),
]

# generated catalog files + provider factories
CATALOG_FILES = [
    (P_BR_M, "amazon-bedrock.models.ts", "AMAZON_BEDROCK_MODELS", "amazon-bedrock", "Amazon Bedrock"),
    (P_AL_M, "ant-ling.models.ts", "ANT_LING_MODELS", "ant-ling", "Ant Ling"),
    (P_AN_M, "anthropic.models.ts", "ANTHROPIC_MODELS", "anthropic", "Anthropic"),
    (P_AZ_M, "azure-openai-responses.models.ts", "AZURE_OPENAI_RESPONSES_MODELS", "azure-openai-responses", "Azure OpenAI Responses"),
    (P_BA_M, "baseten.models.ts", "BASETEN_MODELS", "baseten", "Baseten"),
    (P_CE_M, "cerebras.models.ts", "CEREBRAS_MODELS", "cerebras", "Cerebras"),
    (P_CG_M, "cloudflare-ai-gateway.models.ts", "CLOUDFLARE_AI_GATEWAY_MODELS", "cloudflare-ai-gateway", "Cloudflare AI Gateway"),
    (P_CW_M, "cloudflare-workers-ai.models.ts", "CLOUDFLARE_WORKERS_AI_MODELS", "cloudflare-workers-ai", "Cloudflare Workers AI"),
    (P_DS_M, "deepseek.models.ts", "DEEPSEEK_MODELS", "deepseek", "DeepSeek"),
    (P_FW_M, "fireworks.models.ts", "FIREWORKS_MODELS", "fireworks", "Fireworks"),
    (P_GH_M, "github-copilot.models.ts", "GITHUB_COPILOT_MODELS", "github-copilot", "GitHub Copilot"),
    (P_GV_M, "google-vertex.models.ts", "GOOGLE_VERTEX_MODELS", "google-vertex", "Google Vertex AI"),
    (P_GO_M, "google.models.ts", "GOOGLE_MODELS", "google", "Google Gemini"),
]

for path, name, const_name, pid, vendor in CATALOG_FILES:
    nodes.append(
        N(
            file_id(path),
            "file",
            name,
            f"由 generate-models.ts 生成的 {vendor} 静态目录：从 data JSON 经 flattenModelCatalog 得到 {const_name}。",
            ["自动生成", "模型目录", "data-model"],
            "simple",
            path,
            languageNotes="文件头禁止手改；应运行 npm run generate-models。",
        )
    )

nodes.extend(
    [
        N(
            file_id(P_BR),
            "file",
            "amazon-bedrock.ts",
            "Amazon Bedrock provider：支持 bearer token、AWS profile 或默认凭证链，经 bedrock-converse-stream API 出流。",
            ["provider", "认证", "aws"],
            "moderate",
            P_BR,
        ),
        N(
            fn_id(P_BR, "amazonBedrockProvider"),
            "function",
            "amazonBedrockProvider",
            "用 createProvider 组装 amazon-bedrock：自定义 AWS 认证与 Bedrock Converse Stream API。",
            ["factory", "provider", "aws"],
            "simple",
            P_BR,
            [82, 90],
        ),
        N(
            file_id(P_AL),
            "file",
            "ant-ling.ts",
            "Ant Ling provider：环境变量 API key + OpenAI completions 兼容流。",
            ["provider", "认证", "factory"],
            "simple",
            P_AL,
        ),
        N(
            fn_id(P_AL, "antLingProvider"),
            "function",
            "antLingProvider",
            "用 createProvider 组装 ant-ling：envApiKeyAuth 与 openAICompletionsApi。",
            ["factory", "provider", "认证"],
            "simple",
            P_AL,
            [6, 15],
        ),
        N(
            file_id(P_AN),
            "file",
            "anthropic.ts",
            "Anthropic provider：API key/环境 token 与 Claude Pro/Max OAuth，走 anthropic-messages API。",
            ["provider", "认证", "oauth"],
            "moderate",
            P_AN,
        ),
        N(
            fn_id(P_AN, "anthropicApiKeyAuth"),
            "function",
            "anthropicApiKeyAuth",
            "构建 Anthropic API key 认证：优先存储密钥，否则读 AUTH_TOKEN / OAUTH_TOKEN / API_KEY 环境变量。",
            ["认证", "api-key", "anthropic"],
            "moderate",
            P_AN,
            [9, 41],
        ),
        N(
            fn_id(P_AN, "anthropicProvider"),
            "function",
            "anthropicProvider",
            "用 createProvider 组装 anthropic：API key + lazyOAuth(loadAnthropicOAuth) 与 anthropicMessagesApi。",
            ["factory", "provider", "oauth"],
            "moderate",
            P_AN,
            [43, 59],
        ),
        N(
            file_id(P_AZ),
            "file",
            "azure-openai-responses.ts",
            "Azure OpenAI Responses provider：环境变量 API key + azure-openai-responses 流式 API。",
            ["provider", "认证", "azure"],
            "simple",
            P_AZ,
        ),
        N(
            fn_id(P_AZ, "azureOpenAIResponsesProvider"),
            "function",
            "azureOpenAIResponsesProvider",
            "用 createProvider 组装 azure-openai-responses：envApiKeyAuth 与 azureOpenAIResponsesApi。",
            ["factory", "provider", "azure"],
            "simple",
            P_AZ,
            [6, 14],
        ),
        N(
            file_id(P_BA),
            "file",
            "baseten.ts",
            "Baseten provider：环境变量 API key + OpenAI completions 兼容流。",
            ["provider", "认证", "factory"],
            "simple",
            P_BA,
        ),
        N(
            fn_id(P_BA, "basetenProvider"),
            "function",
            "basetenProvider",
            "用 createProvider 组装 baseten：envApiKeyAuth 与 openAICompletionsApi。",
            ["factory", "provider", "认证"],
            "simple",
            P_BA,
            [6, 15],
        ),
        N(
            file_id(P_CE),
            "file",
            "cerebras.ts",
            "Cerebras provider：环境变量 API key + OpenAI completions 兼容流。",
            ["provider", "认证", "factory"],
            "simple",
            P_CE,
        ),
        N(
            fn_id(P_CE, "cerebrasProvider"),
            "function",
            "cerebrasProvider",
            "用 createProvider 组装 cerebras：envApiKeyAuth 与 openAICompletionsApi。",
            ["factory", "provider", "认证"],
            "simple",
            P_CE,
            [6, 15],
        ),
        N(
            file_id(P_CG),
            "file",
            "cloudflare-ai-gateway.ts",
            "Cloudflare AI Gateway provider：固定挂载三种 API（Anthropic / OpenAI completions / Responses），避免目录抖动丢掉 completions。",
            ["provider", "cloudflare", "gateway"],
            "simple",
            P_CG,
        ),
        N(
            fn_id(P_CG, "cloudflareAIGatewayProvider"),
            "function",
            "cloudflareAIGatewayProvider",
            "用 createProvider 组装 cloudflare-ai-gateway：gateway 认证 + cloudflareStreams 包装的三套 API。",
            ["factory", "provider", "cloudflare"],
            "moderate",
            P_CG,
            [11, 27],
        ),
        N(
            file_id(P_CA),
            "file",
            "cloudflare-auth.ts",
            "Cloudflare Workers AI 与 AI Gateway 的 ApiKeyAuth：按字段合并存储凭证与环境中的 key/account/gateway。",
            ["认证", "cloudflare", "api-key"],
            "moderate",
            P_CA,
        ),
        N(
            fn_id(P_CA, "resolveValue"),
            "function",
            "resolveValue",
            "解析单个 Cloudflare 字段：凭证优先，缺失则回退 ctx.env；API key 读 credential.key，其余读 credential.env。",
            ["认证", "utility", "cloudflare"],
            "moderate",
            P_CA,
            [10, 29],
        ),
        N(
            fn_id(P_CA, "resolveCloudflareEnv"),
            "function",
            "resolveCloudflareEnv",
            "按 workers-ai / ai-gateway 收集 apiKey、accountId 与可选 gatewayId，缺任一必需项则返回 undefined。",
            ["认证", "cloudflare", "validation"],
            "moderate",
            P_CA,
            [31, 52],
        ),
        N(
            fn_id(P_CA, "cloudflareWorkersAIAuth"),
            "function",
            "cloudflareWorkersAIAuth",
            "Workers AI 登录/解析：提示 API key 与 account id，resolve 后以 apiKey 形式返回。",
            ["认证", "cloudflare", "api-key"],
            "moderate",
            P_CA,
            [54, 72],
        ),
        N(
            fn_id(P_CA, "cloudflareAIGatewayAuth"),
            "function",
            "cloudflareAIGatewayAuth",
            "AI Gateway 登录/解析：额外收集 gateway id，并把密钥放到 cf-aig-authorization，同时清空默认 Authorization/x-api-key。",
            ["认证", "cloudflare", "gateway"],
            "moderate",
            P_CA,
            [74, 103],
        ),
        N(
            file_id(P_CS),
            "file",
            "cloudflare-stream.ts",
            "在 dispatch 前把模型 baseUrl 中的 Cloudflare account/gateway 占位符替换为已解析 env。",
            ["streaming", "cloudflare", "utility"],
            "simple",
            P_CS,
        ),
        N(
            fn_id(P_CS, "resolveCloudflareModel"),
            "function",
            "resolveCloudflareModel",
            "用 ProviderEnv 替换模型 baseUrl 里的 {CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}；无变化则返回原模型。",
            ["utility", "cloudflare", "url"],
            "simple",
            P_CS,
            [6, 15],
        ),
        N(
            fn_id(P_CS, "cloudflareStreams"),
            "function",
            "cloudflareStreams",
            "包装 ProviderStreams 的 stream/streamSimple，在调用底层 API 前先 resolveCloudflareModel。",
            ["streaming", "cloudflare", "factory"],
            "simple",
            P_CS,
            [21, 28],
        ),
        N(
            file_id(P_CW),
            "file",
            "cloudflare-workers-ai.ts",
            "Cloudflare Workers AI provider：Workers AI 认证 + 经 cloudflareStreams 包装的 OpenAI completions。",
            ["provider", "cloudflare", "factory"],
            "simple",
            P_CW,
        ),
        N(
            fn_id(P_CW, "cloudflareWorkersAIProvider"),
            "function",
            "cloudflareWorkersAIProvider",
            "用 createProvider 组装 cloudflare-workers-ai：cloudflareWorkersAIAuth 与 cloudflareStreams(openAICompletionsApi)。",
            ["factory", "provider", "cloudflare"],
            "simple",
            P_CW,
            [7, 15],
        ),
        N(
            file_id(P_DS),
            "file",
            "deepseek.ts",
            "DeepSeek provider：环境变量 API key + OpenAI completions 兼容流。",
            ["provider", "认证", "factory"],
            "simple",
            P_DS,
        ),
        N(
            fn_id(P_DS, "deepseekProvider"),
            "function",
            "deepseekProvider",
            "用 createProvider 组装 deepseek：envApiKeyAuth 与 openAICompletionsApi。",
            ["factory", "provider", "认证"],
            "simple",
            P_DS,
            [6, 15],
        ),
        N(
            file_id(P_FW),
            "file",
            "fireworks.ts",
            "Fireworks provider：环境变量 API key，按模型分发 anthropic-messages 或 openai-completions。",
            ["provider", "认证", "factory"],
            "simple",
            P_FW,
        ),
        N(
            fn_id(P_FW, "fireworksProvider"),
            "function",
            "fireworksProvider",
            "用 createProvider 组装 fireworks：双 API map（Anthropic Messages + OpenAI completions）。",
            ["factory", "provider", "认证"],
            "simple",
            P_FW,
            [7, 19],
        ),
        N(
            file_id(P_GH),
            "file",
            "github-copilot.ts",
            "GitHub Copilot provider：token/OAuth，三 API 分发，并按 OAuth availableModelIds 过滤模型。",
            ["provider", "oauth", "认证"],
            "simple",
            P_GH,
        ),
        N(
            fn_id(P_GH, "githubCopilotProvider"),
            "function",
            "githubCopilotProvider",
            "用 createProvider 组装 github-copilot：env/OAuth 认证、filterModels 与 Anthropic/OpenAI completions/Responses 三 API。",
            ["factory", "provider", "oauth"],
            "moderate",
            P_GH,
            [9, 34],
        ),
        N(
            file_id(P_GV),
            "file",
            "google-vertex.ts",
            "Google Vertex AI provider：支持 API key、ADC 或服务账号文件，并要求 project/location；走 google-vertex API。",
            ["provider", "认证", "gcp"],
            "moderate",
            P_GV,
        ),
        N(
            fn_id(P_GV, "googleVertexProvider"),
            "function",
            "googleVertexProvider",
            "用 createProvider 组装 google-vertex：自定义 GCP 认证与 googleVertexApi。",
            ["factory", "provider", "gcp"],
            "simple",
            P_GV,
            [92, 100],
        ),
    ]
)

# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------

edges: list[dict] = []

# imports — 1:1 with batchImportData
import_edge_count = 0
for src, targets in IMPORTS.items():
    for dst in targets:
        edges.append(E(file_id(src), file_id(dst), "imports", 0.7))
        import_edge_count += 1

expected_imports = sum(len(v) for v in IMPORTS.values())
if import_edge_count != expected_imports:
    raise SystemExit(f"import mismatch: {import_edge_count} != {expected_imports}")

# contains + exports
CONTAINS_EXPORTS: list[tuple[str, str, bool]] = [
    (P_IMG, class_id(P_IMG, "ImagesModelsImpl"), False),
    (P_IMG, fn_id(P_IMG, "createImagesModels"), True),
    (P_IMG, fn_id(P_IMG, "createImagesProvider"), True),
    (P_CAT, fn_id(P_CAT, "flattenModelCatalog"), True),
    (P_MOD, fn_id(P_MOD, "mergeHeaders"), False),
    (P_MOD, class_id(P_MOD, "ModelsImpl"), False),
    (P_MOD, fn_id(P_MOD, "createModels"), True),
    (P_MOD, fn_id(P_MOD, "createProvider"), True),
    (P_MOD, fn_id(P_MOD, "hasApi"), True),
    (P_MOD, fn_id(P_MOD, "calculateCost"), True),
    (P_MOD, fn_id(P_MOD, "getSupportedThinkingLevels"), True),
    (P_MOD, fn_id(P_MOD, "clampThinkingLevel"), True),
    (P_MOD, fn_id(P_MOD, "modelsAreEqual"), True),
    (P_ALL, fn_id(P_ALL, "getBuiltinModel"), True),
    (P_ALL, fn_id(P_ALL, "getBuiltinProviders"), True),
    (P_ALL, fn_id(P_ALL, "getBuiltinModelDataGeneratedAt"), True),
    (P_ALL, fn_id(P_ALL, "getBuiltinModels"), True),
    (P_ALL, fn_id(P_ALL, "builtinProviders"), True),
    (P_ALL, fn_id(P_ALL, "builtinModels"), True),
    (P_ALL, fn_id(P_ALL, "builtinImagesProviders"), True),
    (P_ALL, fn_id(P_ALL, "builtinImagesModels"), True),
    (P_BR, fn_id(P_BR, "amazonBedrockProvider"), True),
    (P_AL, fn_id(P_AL, "antLingProvider"), True),
    (P_AN, fn_id(P_AN, "anthropicApiKeyAuth"), False),
    (P_AN, fn_id(P_AN, "anthropicProvider"), True),
    (P_AZ, fn_id(P_AZ, "azureOpenAIResponsesProvider"), True),
    (P_BA, fn_id(P_BA, "basetenProvider"), True),
    (P_CE, fn_id(P_CE, "cerebrasProvider"), True),
    (P_CG, fn_id(P_CG, "cloudflareAIGatewayProvider"), True),
    (P_CA, fn_id(P_CA, "resolveValue"), False),
    (P_CA, fn_id(P_CA, "resolveCloudflareEnv"), False),
    (P_CA, fn_id(P_CA, "cloudflareWorkersAIAuth"), True),
    (P_CA, fn_id(P_CA, "cloudflareAIGatewayAuth"), True),
    (P_CS, fn_id(P_CS, "resolveCloudflareModel"), True),
    (P_CS, fn_id(P_CS, "cloudflareStreams"), True),
    (P_CW, fn_id(P_CW, "cloudflareWorkersAIProvider"), True),
    (P_DS, fn_id(P_DS, "deepseekProvider"), True),
    (P_FW, fn_id(P_FW, "fireworksProvider"), True),
    (P_GH, fn_id(P_GH, "githubCopilotProvider"), True),
    (P_GV, fn_id(P_GV, "googleVertexProvider"), True),
]

for path, target, exported in CONTAINS_EXPORTS:
    edges.append(E(file_id(path), target, "contains", 1.0))
    if exported:
        edges.append(E(file_id(path), target, "exports", 0.8))

# in-batch / cross-batch calls
AUTH_CTX = "packages/ai/src/auth/context.ts"
AUTH_RES = "packages/ai/src/auth/resolve.ts"
AUTH_HELP = "packages/ai/src/auth/helpers.ts"
AUTH_OAUTH_LOAD = "packages/ai/src/auth/oauth/load.ts"
API_LAZY = "packages/ai/src/api/lazy.ts"
API_BEDROCK = "packages/ai/src/api/bedrock-converse-stream.lazy.ts"
API_OAI_C = "packages/ai/src/api/openai-completions.lazy.ts"
API_ANTH = "packages/ai/src/api/anthropic-messages.lazy.ts"
API_AZ = "packages/ai/src/api/azure-openai-responses.lazy.ts"
API_OAI_R = "packages/ai/src/api/openai-responses.lazy.ts"
API_GV = "packages/ai/src/api/google-vertex.lazy.ts"
ABORT = "packages/ai/src/utils/abort.ts"

CALLS: list[tuple[str, str]] = [
    # images-models
    (class_id(P_IMG, "ImagesModelsImpl"), fn_id(AUTH_CTX, "defaultProviderAuthContext")),
    (class_id(P_IMG, "ImagesModelsImpl"), fn_id(AUTH_RES, "resolveProviderAuth")),
    # models
    (class_id(P_MOD, "ModelsImpl"), fn_id(AUTH_CTX, "defaultProviderAuthContext")),
    (class_id(P_MOD, "ModelsImpl"), fn_id(AUTH_RES, "resolveProviderAuth")),
    (class_id(P_MOD, "ModelsImpl"), fn_id(API_LAZY, "lazyStream")),
    (class_id(P_MOD, "ModelsImpl"), fn_id(ABORT, "operationSignal")),
    (class_id(P_MOD, "ModelsImpl"), fn_id(ABORT, "raceWithAbortSignal")),
    (fn_id(P_MOD, "createProvider"), fn_id(API_LAZY, "lazyStream")),
    (fn_id(P_MOD, "clampThinkingLevel"), fn_id(P_MOD, "getSupportedThinkingLevels")),
    # all.ts internals
    (fn_id(P_ALL, "builtinModels"), fn_id(P_MOD, "createModels")),
    (fn_id(P_ALL, "builtinModels"), fn_id(P_ALL, "builtinProviders")),
    (fn_id(P_ALL, "builtinImagesModels"), fn_id(P_IMG, "createImagesModels")),
    (fn_id(P_ALL, "builtinImagesModels"), fn_id(P_ALL, "builtinImagesProviders")),
    (fn_id(P_ALL, "builtinImagesProviders"), fn_id("packages/ai/src/providers/openrouter-images.ts", "openrouterImagesProvider")),
    # builtinProviders → in-batch factories
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_BR, "amazonBedrockProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_AL, "antLingProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_AN, "anthropicProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_AZ, "azureOpenAIResponsesProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_BA, "basetenProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_CE, "cerebrasProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_CG, "cloudflareAIGatewayProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_CW, "cloudflareWorkersAIProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_DS, "deepseekProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_FW, "fireworksProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_GH, "githubCopilotProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id(P_GV, "googleVertexProvider")),
    # builtinProviders → other-batch factories (neighborMap)
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/google.ts", "googleProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/groq.ts", "groqProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/huggingface.ts", "huggingfaceProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/kimi-coding.ts", "kimiCodingProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/minimax.ts", "minimaxProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/minimax-cn.ts", "minimaxCnProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/mistral.ts", "mistralProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/moonshotai.ts", "moonshotaiProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/moonshotai-cn.ts", "moonshotaiCnProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/nvidia.ts", "nvidiaProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/openai.ts", "openaiProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/openai-codex.ts", "openaiCodexProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/opencode.ts", "opencodeProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/opencode-go.ts", "opencodeGoProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/openrouter.ts", "openrouterProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/qwen-token-plan.ts", "qwenTokenPlanProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/qwen-token-plan-cn.ts", "qwenTokenPlanCnProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/qwen-token-plan-individual.ts", "qwenTokenPlanIndividualProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/radius.ts", "radiusProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/together.ts", "togetherProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/vercel-ai-gateway.ts", "vercelAIGatewayProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/xai.ts", "xaiProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/xiaomi.ts", "xiaomiProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/xiaomi-token-plan-ams.ts", "xiaomiTokenPlanAmsProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/xiaomi-token-plan-cn.ts", "xiaomiTokenPlanCnProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/xiaomi-token-plan-sgp.ts", "xiaomiTokenPlanSgpProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/zai.ts", "zaiProvider")),
    (fn_id(P_ALL, "builtinProviders"), fn_id("packages/ai/src/providers/zai-coding-cn.ts", "zaiCodingCnProvider")),
    # catalog flatten (module-level)
    (file_id(P_BR_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_AL_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_AN_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_AZ_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_BA_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_CE_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_CG_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_CW_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_DS_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_FW_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_GH_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_GV_M), fn_id(P_CAT, "flattenModelCatalog")),
    (file_id(P_GO_M), fn_id(P_CAT, "flattenModelCatalog")),
    # provider factories → createProvider + apis/auth
    (fn_id(P_BR, "amazonBedrockProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_BR, "amazonBedrockProvider"), fn_id(API_BEDROCK, "bedrockConverseStreamApi")),
    (fn_id(P_AL, "antLingProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_AL, "antLingProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_AL, "antLingProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_AN, "anthropicProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_AN, "anthropicProvider"), fn_id(P_AN, "anthropicApiKeyAuth")),
    (fn_id(P_AN, "anthropicProvider"), fn_id(AUTH_HELP, "lazyOAuth")),
    (fn_id(P_AN, "anthropicProvider"), fn_id(AUTH_OAUTH_LOAD, "loadAnthropicOAuth")),
    (fn_id(P_AN, "anthropicProvider"), fn_id(API_ANTH, "anthropicMessagesApi")),
    (fn_id(P_AZ, "azureOpenAIResponsesProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_AZ, "azureOpenAIResponsesProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_AZ, "azureOpenAIResponsesProvider"), fn_id(API_AZ, "azureOpenAIResponsesApi")),
    (fn_id(P_BA, "basetenProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_BA, "basetenProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_BA, "basetenProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_CE, "cerebrasProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_CE, "cerebrasProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_CE, "cerebrasProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_CG, "cloudflareAIGatewayProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_CG, "cloudflareAIGatewayProvider"), fn_id(P_CA, "cloudflareAIGatewayAuth")),
    (fn_id(P_CG, "cloudflareAIGatewayProvider"), fn_id(P_CS, "cloudflareStreams")),
    (fn_id(P_CG, "cloudflareAIGatewayProvider"), fn_id(API_ANTH, "anthropicMessagesApi")),
    (fn_id(P_CG, "cloudflareAIGatewayProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_CG, "cloudflareAIGatewayProvider"), fn_id(API_OAI_R, "openAIResponsesApi")),
    (fn_id(P_CA, "resolveCloudflareEnv"), fn_id(P_CA, "resolveValue")),
    (fn_id(P_CA, "cloudflareWorkersAIAuth"), fn_id(P_CA, "resolveCloudflareEnv")),
    (fn_id(P_CA, "cloudflareAIGatewayAuth"), fn_id(P_CA, "resolveCloudflareEnv")),
    (fn_id(P_CS, "cloudflareStreams"), fn_id(P_CS, "resolveCloudflareModel")),
    (fn_id(P_CW, "cloudflareWorkersAIProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_CW, "cloudflareWorkersAIProvider"), fn_id(P_CA, "cloudflareWorkersAIAuth")),
    (fn_id(P_CW, "cloudflareWorkersAIProvider"), fn_id(P_CS, "cloudflareStreams")),
    (fn_id(P_CW, "cloudflareWorkersAIProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_DS, "deepseekProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_DS, "deepseekProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_DS, "deepseekProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_FW, "fireworksProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_FW, "fireworksProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_FW, "fireworksProvider"), fn_id(API_ANTH, "anthropicMessagesApi")),
    (fn_id(P_FW, "fireworksProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(AUTH_HELP, "envApiKeyAuth")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(AUTH_HELP, "lazyOAuth")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(AUTH_OAUTH_LOAD, "loadGitHubCopilotOAuth")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(API_ANTH, "anthropicMessagesApi")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(API_OAI_C, "openAICompletionsApi")),
    (fn_id(P_GH, "githubCopilotProvider"), fn_id(API_OAI_R, "openAIResponsesApi")),
    (fn_id(P_GV, "googleVertexProvider"), fn_id(P_MOD, "createProvider")),
    (fn_id(P_GV, "googleVertexProvider"), fn_id(API_GV, "googleVertexApi")),
]

for src, dst in CALLS:
    if src == dst:
        raise SystemExit(f"self-edge {src}")
    edges.append(E(src, dst, "calls", 0.8))

# uniqueness
seen_nodes = [n["id"] for n in nodes]
if len(seen_nodes) != len(set(seen_nodes)):
    dup = [i for i in seen_nodes if seen_nodes.count(i) > 1]
    raise SystemExit(f"duplicate node ids: {sorted(set(dup))}")

# required files
batch_files = [f["path"] for f in BRIEF["files"]]
file_nodes = {n["filePath"] for n in nodes if n["type"] == "file"}
missing = set(batch_files) - file_nodes
extra = file_nodes - set(batch_files)
if missing or extra:
    raise SystemExit(f"file node mismatch missing={missing} extra={extra}")

# ---------------------------------------------------------------------------
# Split + validate
# ---------------------------------------------------------------------------

node_ids = {n["id"] for n in nodes}
node_count = len(nodes)
edge_count = len(edges)

batch_import_paths = set()
for src, dsts in IMPORTS.items():
    batch_import_paths.add(src)
    batch_import_paths.update(dsts)

neighbor_paths = set()
neighbor_symbols: set[str] = set()
for src, neighs in NEIGHBOR_MAP.items():
    for neigh in neighs:
        neighbor_paths.add(neigh["path"])
        neighbor_symbols.update(neigh.get("symbols") or [])


def edge_target_ok(target: str, part_ids: set[str]) -> bool:
    if target in part_ids:
        return True
    if target.startswith("file:"):
        path = target[len("file:") :]
        return path in neighbor_paths or path in batch_import_paths
    if target.startswith("function:") or target.startswith("class:"):
        rest = target.split(":", 2)
        if len(rest) != 3:
            return False
        _kind, _path, symbol = rest
        return symbol in neighbor_symbols
    return False


def rewrite_target(target: str, part_ids: set[str]) -> str | None:
    """Keep valid targets; rewrite in-batch cross-part symbols to file:path."""
    if edge_target_ok(target, part_ids):
        return target
    if target.startswith("function:") or target.startswith("class:"):
        rest = target.split(":", 2)
        if len(rest) == 3:
            file_target = f"file:{rest[1]}"
            if edge_target_ok(file_target, part_ids):
                return file_target
    return None


def file_path_of(node: dict) -> str:
    return node["filePath"]


files_sorted = sorted(batch_files)
if node_count <= 60 and edge_count <= 120:
    parts_n = 1
else:
    parts_n = math.ceil(max(node_count / 60, edge_count / 120))

chunk = math.ceil(len(files_sorted) / parts_n)
file_groups: list[list[str]] = []
for i in range(parts_n):
    file_groups.append(files_sorted[i * chunk : (i + 1) * chunk])
file_groups = [g for g in file_groups if g]

written = []
total_n = 0
total_e = 0
dropped_calls = []

for idx, group in enumerate(file_groups, start=1):
    group_set = set(group)
    part_nodes = [n for n in nodes if n["filePath"] in group_set]
    part_ids = {n["id"] for n in part_nodes}
    part_edges = []
    for e in edges:
        if e["source"] not in part_ids:
            continue
        new_target = rewrite_target(e["target"], part_ids)
        if new_target is None:
            dropped_calls.append((idx, e["source"], e["target"], e["type"]))
            continue
        if new_target != e["target"]:
            e = {**e, "target": new_target}
        if e["source"] == e["target"]:
            dropped_calls.append((idx, e["source"], e["target"], "self"))
            continue
        part_edges.append(e)

    deduped = []
    seen_e = set()
    for e in part_edges:
        key = (e["source"], e["target"], e["type"])
        if key in seen_e:
            continue
        seen_e.add(key)
        deduped.append(e)
    part_edges = deduped

    # After drop, re-check remaining edges
    bad = []
    for e in part_edges:
        if e["source"] not in part_ids:
            bad.append(("source-missing", e))
        elif not edge_target_ok(e["target"], part_ids):
            bad.append(("target-invalid", e))
    if bad:
        raise SystemExit(f"part {idx} validation failed: {bad[:5]}")

    if parts_n == 1:
        out_path = OUT_DIR / "batch-4.json"
    else:
        out_path = OUT_DIR / f"batch-4-part-{idx}.json"
    out_path.write_text(json.dumps({"nodes": part_nodes, "edges": part_edges}, ensure_ascii=False, indent=2) + "\n")
    written.append(str(out_path.name))
    total_n += len(part_nodes)
    total_e += len(part_edges)

# Only drop calls/related that fail cross-part function validation; imports must never drop
dropped_imports = [d for d in dropped_calls if d[3] == "imports"]
if dropped_imports:
    raise SystemExit(f"dropped imports unexpectedly: {dropped_imports[:5]}")

print(json.dumps({
    "parts": written,
    "parts_n": len(file_groups),
    "nodes": total_n,
    "edges_written": total_e,
    "edges_defined": edge_count,
    "imports": import_edge_count,
    "dropped_non_import": len(dropped_calls),
    "file_groups": file_groups,
    "node_count_global": node_count,
}, ensure_ascii=False, indent=2))
for d in dropped_calls:
    print(f"DROPPED part={d[0]} {d[3]} {d[1]} -> {d[2]}")
