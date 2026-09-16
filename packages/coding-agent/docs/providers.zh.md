> 本文为 [providers.md](providers.md) 的中文译本。

# 提供方

Pi 通过 OAuth 支持基于订阅的提供方，并通过环境变量或鉴权文件支持 API 密钥提供方。内置目录随 pi 一起发布；已配置的提供方可能刷新更新的目录，并缓存到 `~/.pi/agent/models-store.json` 供离线使用。

## 目录

- [订阅](#订阅)
- [API 密钥](#api-密钥)
- [鉴权文件](#鉴权文件)
- [云提供方](#云提供方)
- [llama.cpp](#llamacpp)
- [自定义提供方](#自定义提供方)
- [解析顺序](#解析顺序)

## 订阅

在交互模式使用 `/login`，然后选择提供方：

- ChatGPT Plus/Pro (Codex)
- Claude Pro/Max
- GitHub Copilot
- xAI（Grok/X 订阅）
- OpenRouter（OAuth 签发的 API 密钥，从 OpenRouter 额度计费）
- Radius

使用 `/logout` 清除凭证。令牌存储在 `~/.pi/agent/auth.json`，过期后会自动刷新。OpenRouter 则签发用户可控的 API 密钥，不会自动过期。

### OpenAI Codex

- 需要 ChatGPT Plus 或 Pro 订阅
- 由 OpenAI 官方背书：[Codex for OSS](https://developers.openai.com/community/codex-for-oss)

### Claude Pro/Max

Anthropic 订阅鉴权对 Claude Pro/Max 账户有效。第三方 harness 用量来自[额外用量](https://claude.ai/settings/usage)，按 token 计费，不计入 Claude 套餐限额。

### GitHub Copilot

- 按 Enter 使用 github.com，或输入你的 GitHub Enterprise Server 域名
- 若出现 “model not supported”，在 VS Code 中启用：Copilot Chat → 模型选择器 → 选择模型 → “Enable”

### xAI（Grok/X 订阅）

- 运行 `/login xai`，然后选择 **Use a subscription**
- `XAI_API_KEY` 仍可通过 **Use an API key** 使用

### OpenRouter

- 运行 `/login openrouter`，然后选择 **Sign in with OpenRouter** 打开 OpenRouter PKCE 授权流程
- 授权会创建用户可控的 OpenRouter API 密钥，从你的 OpenRouter 额度计费
- 在远程/无头机器上（例如通过 SSH），浏览器无法到达回环回调；请把最终重定向 URL（或授权码）粘贴到登录提示中
- `OPENROUTER_API_KEY` 仍可通过 **Use an API key** 使用

### Radius

Radius 是动态的 `pi-messages` 网关。`/login radius` 把 OAuth 令牌存入 `auth.json`；网关目录独立刷新，并缓存到 `models-store.json`。自定义 Radius 网关可在 `models.json` 中用 `"oauth": "radius"` 和网关 `baseUrl` 声明。

## API 密钥

### 环境变量或鉴权文件

在交互模式使用 `/login` 并选择提供方，把 API 密钥存入 `auth.json`，或通过环境变量设置凭证：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

| 提供方 | 环境变量 | `auth.json` 键 |
|----------|----------------------|------------------|
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic` |
| Ant Ling | `ANT_LING_API_KEY` | `ant-ling` |
| Azure OpenAI Responses | `AZURE_OPENAI_API_KEY` | `azure-openai-responses` |
| OpenAI | `OPENAI_API_KEY` | `openai` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek` |
| NVIDIA NIM | `NVIDIA_API_KEY` | `nvidia` |
| Google Gemini | `GEMINI_API_KEY` | `google` |
| Amazon Bedrock | `AWS_BEARER_TOKEN_BEDROCK` | `amazon-bedrock` |
| Mistral | `MISTRAL_API_KEY` | `mistral` |
| Groq | `GROQ_API_KEY` | `groq` |
| Cerebras | `CEREBRAS_API_KEY` | `cerebras` |
| Cloudflare AI Gateway | `CLOUDFLARE_API_KEY`（另需 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_GATEWAY_ID`） | `cloudflare-ai-gateway` |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY`（另需 `CLOUDFLARE_ACCOUNT_ID`） | `cloudflare-workers-ai` |
| xAI | `XAI_API_KEY` | `xai` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` |
| ZAI Coding Plan (Global) | `ZAI_API_KEY` | `zai` |
| ZAI Coding Plan (China) | `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` |
| OpenCode Zen | `OPENCODE_API_KEY` | `opencode` |
| OpenCode Go | `OPENCODE_API_KEY` | `opencode-go` |
| Radius | `RADIUS_API_KEY` | `radius` |
| Hugging Face | `HF_TOKEN` | `huggingface` |
| Fireworks | `FIREWORKS_API_KEY` | `fireworks` |
| Together AI | `TOGETHER_API_KEY` | `together` |
| Baseten | `BASETEN_API_KEY` | `baseten` |
| Kimi For Coding | `KIMI_API_KEY` | `kimi-coding` |
| MiniMax | `MINIMAX_API_KEY` | `minimax` |
| MiniMax (China) | `MINIMAX_CN_API_KEY` | `minimax-cn` |
| Qwen Token Plan（现有目录） | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan` |
| Qwen Token Plan (Individual) | `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan-individual` |
| Qwen Token Plan (China) | `QWEN_TOKEN_PLAN_CN_API_KEY` | `qwen-token-plan-cn` |
| Xiaomi MiMo | `XIAOMI_API_KEY` | `xiaomi` |
| Xiaomi MiMo Token Plan (China) | `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` |
| Xiaomi MiMo Token Plan (Amsterdam) | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` |
| Xiaomi MiMo Token Plan (Singapore) | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` |

环境变量和 `auth.json` 键的参考：[`packages/ai/src/env-api-keys.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/env-api-keys.ts) 中的 [`const envMap`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/env-api-keys.ts)。

#### 鉴权文件

把凭证存在 `~/.pi/agent/auth.json`：

```json
{
  "anthropic": { "type": "api_key", "key": "sk-ant-..." },
  "ant-ling": { "type": "api_key", "key": "..." },
  "openai": { "type": "api_key", "key": "sk-..." },
  "deepseek": { "type": "api_key", "key": "sk-..." },
  "nvidia": { "type": "api_key", "key": "nvapi-..." },
  "google": { "type": "api_key", "key": "..." },
  "opencode": { "type": "api_key", "key": "..." },
  "opencode-go": { "type": "api_key", "key": "..." },
  "together": { "type": "api_key", "key": "..." },
  "qwen-token-plan":  { "type": "api_key", "key": "sk-sp-..." },
  "qwen-token-plan-individual": { "type": "api_key", "key": "sk-sp-..." },
  "qwen-token-plan-cn": { "type": "api_key", "key": "sk-sp-..." },
  "xiaomi": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-cn":  { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-ams": { "type": "api_key", "key": "..." },
  "xiaomi-token-plan-sgp": { "type": "api_key", "key": "..." }
}
```

`qwen-token-plan-individual` 与 `qwen-token-plan` 使用同一国际端点和 `QWEN_TOKEN_PLAN_API_KEY`，但选择器只列出 Individual 订阅文档中的模型。现有提供方保留更广的目录以保持向后兼容。使用 `auth.json` 时，把凭证存在你所选提供方的键下；环境变量由两个国际提供方共享。

该文件以 `0600` 权限创建（仅用户可读写）。鉴权文件中的凭证优先于环境变量。

API 密钥凭证也可以包含提供方范围的环境值。解析凭证键、提供方/模型请求头，以及 Cloudflare 账户 ID、Azure OpenAI 设置、Vertex 项目/位置、Bedrock 设置、`PI_CACHE_RETENTION` 和 `HTTP_PROXY`/`HTTPS_PROXY` 等提供方配置时，这些值优先于进程环境变量。

```json
{
  "cloudflare-ai-gateway": {
    "type": "api_key",
    "key": "$CLOUDFLARE_API_KEY",
    "env": {
      "CLOUDFLARE_API_KEY": "...",
      "CLOUDFLARE_ACCOUNT_ID": "account-id",
      "CLOUDFLARE_GATEWAY_ID": "gateway-id"
    }
  }
}
```

当 pi 应使用与项目 shell 环境不同的提供方设置时，使用这种方式。

### 密钥解析

`key` 字段支持命令执行、环境插值和字面量：

- **Shell 命令：** 以 `"!command"` 开头时，把整个值当作命令执行，并使用 stdout（在进程生命周期内缓存）
  ```json
  { "type": "api_key", "key": "!security find-generic-password -ws 'anthropic'" }
  { "type": "api_key", "key": "!op read 'op://vault/item/credential'" }
  ```
- **环境插值：** `"$ENV_VAR"` 或 `"${ENV_VAR}"` 使用该变量的值。插值也可出现在更大的字面量中。
  ```json
  { "type": "api_key", "key": "$MY_ANTHROPIC_KEY" }
  { "type": "api_key", "key": "${KEY_PREFIX}_${KEY_SUFFIX}" }
  ```
  `$FOO_BAR` 是变量 `FOO_BAR`；当 `BAR` 是字面文本时使用 `${FOO}_BAR`。缺失的环境变量会使该值无法解析。
- **转义：** `"$$"` 产出字面 `"$"`；`"$!"` 产出字面 `"!"` 且不触发命令执行。
  ```json
  { "type": "api_key", "key": "$$literal-dollar-prefix" }
  { "type": "api_key", "key": "$!literal-bang-prefix" }
  ```
- **字面值：** 直接使用。纯大写字符串如 `MY_API_KEY` 是字面量；环境变量请用 `$MY_API_KEY`。
  ```json
  { "type": "api_key", "key": "sk-ant-..." }
  { "type": "api_key", "key": "public" }
  ```

`/login` 之后的 OAuth 凭证也存在这里，并自动管理。

## 云提供方

### Azure OpenAI

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# 也支持：https://your-resource.cognitiveservices.azure.com
# 也支持：https://your-resource.openai.azure.com
# 根端点会自动规范为 /openai/v1
# 或用资源名代替 base URL
export AZURE_OPENAI_RESOURCE_NAME=your-resource

# 可选
export AZURE_OPENAI_API_VERSION=2024-02-01
export AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-4=my-gpt4,gpt-4o=my-gpt4o
```

### Amazon Bedrock

使用 `/login amazon-bedrock` 存储 Bedrock API 密钥，或配置下面某一种环境 AWS 凭证来源：

```bash
# 选项 1：AWS Profile
export AWS_PROFILE=your-profile

# 选项 2：IAM 密钥
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...

# 选项 3：Bearer Token
export AWS_BEARER_TOKEN_BEDROCK=...

# 可选区域（默认为 us-east-1）
export AWS_REGION=us-west-2
```

也支持 ECS 任务角色（`AWS_CONTAINER_CREDENTIALS_*`）和 IRSA（`AWS_WEB_IDENTITY_TOKEN_FILE`）。

```bash
pi --provider amazon-bedrock --model us.anthropic.claude-sonnet-4-20250514-v1:0
```

对 ID 中包含可识别模型名的 Claude 模型（基础模型和系统定义的推理配置），会自动启用 prompt 缓存。对应用推理配置（其 ARN 不含模型名），设置 `AWS_BEDROCK_FORCE_CACHE=1` 以启用缓存点：

```bash
export AWS_BEDROCK_FORCE_CACHE=1
pi --provider amazon-bedrock --model arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/abc123
```

若连接到 Bedrock API 代理，可使用以下环境变量：

```bash
# 设置 Bedrock 代理 URL（标准 AWS SDK 环境变量）
export AWS_ENDPOINT_URL_BEDROCK_RUNTIME=https://my.corp.proxy/bedrock

# 若代理不需要鉴权则设置
export AWS_BEDROCK_SKIP_AUTH=1

# 若代理只支持 HTTP/1.1 则设置
export AWS_BEDROCK_FORCE_HTTP1=1
```

### Cloudflare AI Gateway

`CLOUDFLARE_API_KEY` 可通过 `/login` 设置。账户 ID 和网关 slug 可作为环境变量设置，或写在 `auth.json` 中 API 密钥凭证的 `env` 对象里。

```bash
export CLOUDFLARE_API_KEY=...           # 或使用 /login
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...        # 在 dash.cloudflare.com → AI → AI Gateway 创建
pi --provider cloudflare-ai-gateway --model "claude-sonnet-4-5"
```

通过 Cloudflare AI Gateway 路由到 OpenAI、Anthropic 和 Workers AI。Workers AI 使用 Unified API（`/compat`）和带前缀的模型 ID（`workers-ai/@cf/...`）。OpenAI 使用 OpenAI 透传路由（`/openai`）和原生 OpenAI 模型 ID，例如 `gpt-5.1`。Anthropic 使用 Anthropic 透传路由（`/anthropic`）和原生 Anthropic 模型 ID，例如 `claude-sonnet-4-5`。

AI Gateway 鉴权把 `CLOUDFLARE_API_KEY` 用作 `cf-aig-authorization`。上游鉴权可以是：

| 模式 | 请求鉴权 | 上游鉴权 |
|------|--------------|---------------|
| Workers AI | 仅 Cloudflare token | Cloudflare 原生 |
| 统一计费 | 仅 Cloudflare token | Cloudflare 处理上游鉴权并扣除额度 |
| 存储的 BYOK | 仅 Cloudflare token | Cloudflare 注入 AI Gateway 控制台中存储的提供方密钥 |
| 内联 BYOK | Cloudflare token 加上游 `Authorization` 头 | 请求提供上游提供方密钥 |

日常使用 pi 时，优先选择统一计费或存储的 BYOK。内联 BYOK 需要为 Cloudflare AI Gateway 提供方额外配置上游 `Authorization` 头，例如通过 `models.json` 的提供方/模型覆盖。

### Cloudflare Workers AI

`CLOUDFLARE_API_KEY` 可通过 `/login` 设置。`CLOUDFLARE_ACCOUNT_ID` 可作为环境变量设置，或写在 `auth.json` 中 API 密钥凭证的 `env` 对象里。

```bash
export CLOUDFLARE_API_KEY=...           # 或使用 /login
export CLOUDFLARE_ACCOUNT_ID=...
pi --provider cloudflare-workers-ai --model "@cf/moonshotai/kimi-k2.6"
```

Pi 会自动设置 `x-session-affinity`，以便享受[前缀缓存](https://developers.cloudflare.com/workers-ai/features/prompt-caching/)折扣。

### Google Vertex AI

使用 Application Default Credentials：

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1
```

或将 `GOOGLE_APPLICATION_CREDENTIALS` 设为服务账号密钥文件。

## llama.cpp

Pi 支持 llama.cpp router 服务器。用 `/login llama.cpp` 配置，用 `/llama` 管理已加载模型，用 `/model` 选择已加载模型。

服务器设置、模型目录布局、环境变量和命令用法见 [llama.cpp](llama-cpp.zh.md)。

## 自定义提供方

**通过 models.json：** 添加 Ollama、LM Studio、vLLM，或任何使用受支持 API 的提供方（OpenAI Completions、OpenAI Responses、Anthropic Messages、Google Generative AI）。见 [models.zh.md](models.zh.md)。

**通过扩展：** 对需要自定义 API 实现或 OAuth 流程的提供方，创建一个扩展。见 [custom-provider.zh.md](custom-provider.zh.md) 和 [examples/extensions/custom-provider-gitlab-duo](../examples/extensions/custom-provider-gitlab-duo/)。

## 解析顺序

解析提供方凭证时：

1. CLI `--api-key` 标志
2. `auth.json` 条目（API 密钥或 OAuth 令牌）
3. 环境变量
4. `models.json` 中的自定义提供方密钥
