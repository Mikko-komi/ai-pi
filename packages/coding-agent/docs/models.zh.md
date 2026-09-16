> 本文为 [models.md](models.md) 的中文译本。

# 自定义模型

通过 `~/.pi/agent/models.json` 添加自定义提供方和模型（Ollama、vLLM、LM Studio、代理）。

## 目录

- [最小示例](#最小示例)
- [完整示例](#完整示例)
- [受支持的 API](#受支持的-api)
- [提供方配置](#提供方配置)
- [模型配置](#模型配置)
- [覆盖内置提供方](#覆盖内置提供方)
- [按模型覆盖](#按模型覆盖)
- [Anthropic Messages 兼容性](#anthropic-messages-兼容性)
- [OpenAI 兼容性](#openai-兼容性)

## 最小示例

对于本地模型（Ollama、LM Studio、vLLM），每个模型只需 `id`：

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "llama3.1:8b" },
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

`apiKey` 是占位值，因为 Ollama 会忽略它。pi 仍把模型视为需要鉴权后才会出现在 `/model` 中，因此无密钥的本地服务器应保留一个占位值、用 `/login` 为该提供方保存密钥，或在选择模型时传入 `--api-key`。

部分 OpenAI 兼容服务器不理解推理能力模型所用的 `developer` 角色。对这些提供方，将 `compat.supportsDeveloperRole` 设为 `false`，pi 就会把系统提示作为 `system` 消息发送。若服务器也不支持 `reasoning_effort`，同样将 `compat.supportsReasoningEffort` 设为 `false`。

可在提供方级别设置 `compat` 以应用于全部模型，或在模型级别覆盖特定模型。这常见于 Ollama、vLLM、SGLang 以及类似的 OpenAI 兼容服务器。

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        {
          "id": "gpt-oss:20b",
          "reasoning": true
        }
      ]
    }
  }
}
```

## 完整示例

需要特定值时覆盖默认值：

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        {
          "id": "llama3.1:8b",
          "name": "Llama 3.1 8B (Local)",
          "reasoning": false,
          "input": ["text"],
          "contextWindow": 128000,
          "maxTokens": 32000,
          "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
        }
      ]
    }
  }
}
```

每次打开 `/model` 时都会重新加载该文件。可在会话中编辑，无需重启。

## Google AI Studio 示例

使用带 `baseUrl` 的 `google-generative-ai`，从 Google AI Studio 添加模型，包括自定义 Gemma 4 条目：

```json
{
  "providers": {
    "my-google": {
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
      "api": "google-generative-ai",
      "apiKey": "$GEMINI_API_KEY",
      "models": [
        {
          "id": "gemma-4-31b-it",
          "name": "Gemma 4 31B",
          "input": ["text", "image"],
          "contextWindow": 262144,
          "reasoning": true
        }
      ]
    }
  }
}
```

向 `google-generative-ai` API 类型添加自定义模型时必须提供 `baseUrl`。

## 受支持的 API

| API | 说明 |
|-----|-------------|
| `openai-completions` | OpenAI Chat Completions（兼容性最好） |
| `openai-responses` | OpenAI Responses API |
| `anthropic-messages` | Anthropic Messages API |
| `google-generative-ai` | Google Generative AI |

在提供方级别设置 `api`（作为全部模型的默认值），或在模型级别设置（按模型覆盖）。

## 提供方配置

| 字段 | 说明 |
|-------|-------------|
| `baseUrl` | API 端点 URL |
| `api` | API 类型（见上文） |
| `apiKey` | 可选的 API 密钥配置（见下方值解析）。鉴权由 `/login`/`auth.json` 或 CLI `--api-key` 提供时省略此项。 |
| `oauth` | 动态 OAuth 提供方类型。当前支持 `"radius"`；需要网关 `baseUrl`。 |
| `headers` | 自定义请求头（见下方值解析） |
| `authHeader` | 设为 `true` 以自动添加 `Authorization: Bearer <apiKey>` |
| `models` | 模型配置数组 |
| `modelOverrides` | 对此提供方上内置或扩展注册模型的按模型覆盖 |

带 `models` 的提供方中，非内置提供方配置需要 `baseUrl`，并在提供方或模型级别提供 `api`。加载文件不要求 `apiKey`：当通过 `/login`/`auth.json`、CLI `--api-key` 或提供方 `apiKey` 配置鉴权后，模型才可用。若未配置鉴权，模型会加载，但在 `/model` 和 `--list-models` 中仍不可用。

### 值解析

`apiKey` 和 `headers` 字段支持命令执行、环境变量插值和字面量：

- **Shell 命令：** 以 `"!command"` 开头时，将整个值作为命令执行并使用 stdout
  ```json
  "apiKey": "!security find-generic-password -ws 'anthropic'"
  "apiKey": "!op read 'op://vault/item/credential'"
  ```
- **环境变量插值：** `"$ENV_VAR"` 或 `"${ENV_VAR}"` 使用该变量的值。插值可出现在更长的字面量中。
  ```json
  "apiKey": "$MY_API_KEY"
  "apiKey": "${KEY_PREFIX}_${KEY_SUFFIX}"
  ```
  `$FOO_BAR` 是变量 `FOO_BAR`；当 `BAR` 是字面文本时使用 `${FOO}_BAR`。缺失的环境变量会使该值无法解析。
- **转义：** `"$$"` 输出字面 `"$"`；`"$!"` 输出字面 `"!"` 且不触发命令执行。
  ```json
  "apiKey": "$$literal-dollar-prefix"
  "apiKey": "$!literal-bang-prefix"
  ```
- **字面量：** 直接使用。纯大写字符串如 `MY_API_KEY` 是字面量；环境变量请用 `$MY_API_KEY`。
  ```json
  "apiKey": "sk-..."
  ```

对 `models.json`，shell 命令在请求时解析。pi 有意不对任意命令应用内置 TTL、过期复用或恢复逻辑。不同命令需要不同的缓存和失败策略，pi 无法推断正确策略。

若命令较慢、昂贵、受速率限制，或应在瞬时失败时继续使用先前值，请自行包装脚本或命令，实现所需的缓存或 TTL 行为。

`/model` 的可用性检查只看已配置的鉴权是否存在，不会执行 shell 命令。

### 自定义请求头

```json
{
  "providers": {
    "custom-proxy": {
      "baseUrl": "https://proxy.example.com/v1",
      "apiKey": "$MY_API_KEY",
      "api": "anthropic-messages",
      "headers": {
        "x-portkey-api-key": "$PORTKEY_API_KEY",
        "x-secret": "!op read 'op://vault/item/secret'"
      },
      "models": [...]
    }
  }
}
```

## 模型配置

| 字段 | 必需 | 默认值 | 说明 |
|-------|----------|---------|-------------|
| `id` | 是 | — | 模型标识符（传给 API） |
| `name` | 否 | `id` | 人类可读的模型标签。用于匹配（`--model` 模式），并作为次要模型详情文本显示。 |
| `api` | 否 | 提供方的 `api` | 覆盖此模型的提供方 API |
| `reasoning` | 否 | `false` | 支持扩展 thinking |
| `thinkingLevelMap` | 否 | 省略 | 将 pi thinking 级别映射到提供方值，并标记不支持的级别（见下文） |
| `input` | 否 | `["text"]` | 输入类型：`["text"]` 或 `["text", "image"]` |
| `contextWindow` | 否 | `128000` | 上下文窗口大小（token） |
| `maxTokens` | 否 | `16384` | 最大输出 token 数 |
| `samplingParams` | 否 | 省略 | 原样合并进每个请求体的采样参数（见下文） |
| `cost` | 否 | 全为零 | 每百万 token 费率，可选请求级输入计价档位 |
| `compat` | 否 | 提供方 `compat` | 提供方兼容性覆盖。两者都设置时与提供方级 `compat` 合并。 |

一个费用档位提供完整的替代费率集；当总输入用量（`input + cacheRead + cacheWrite`）超过 `inputTokensAbove` 时，该档位应用于整个请求。多个档位同时匹配时，取最高阈值。

```json
{
  "cost": {
    "input": 5,
    "output": 30,
    "cacheRead": 0.5,
    "cacheWrite": 6.25,
    "tiers": [
      {
        "inputTokensAbove": 272000,
        "input": 10,
        "output": 45,
        "cacheRead": 1,
        "cacheWrite": 12.5
      }
    ]
  }
}
```

当前行为：
- `/model`、`--list-models` 和交互式页脚按模型 `id` 显示条目。
- 配置的 `name` 用于模型匹配和次要模型详情文本。它不会替换页脚/状态栏中的模型 id。

### 采样参数

`samplingParams` 是自由形式对象，在 pi 自身设置的字段之后原样合并进该模型的每个请求体，因此其键优先生效。用它发送 pi 未建模的采样参数——包括服务器特有的参数，如 llama.cpp 的 `min_p` 或 vLLM 的 `top_k`：

```json
{
  "id": "deepseek-v4-flash",
  "samplingParams": {
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 0,
    "min_p": 0.0
  }
}
```

仅 OpenAI 兼容 API 会应用它（`openai-completions`、`openai-responses`、`azure-openai-responses`）；其他 API 会忽略。键会覆盖 pi 的具名请求字段（例如此处的 `temperature` 键优先于请求级 temperature），因此宜将其作为该模型采样参数的唯一来源。在 `modelOverrides` 中，`samplingParams` 按键与基础模型的值合并。

此处也可以放固定的 thinking token 上限，但它不会跟随 `thinkingBudgets`，也不会为答案预留空间。为此请优先使用 `compat.thinkingTokenBudgetField`（或别名 `supportsThinkingTokenBudget`）。

### Thinking 级别映射

在模型上使用 `thinkingLevelMap` 描述该模型特有的 thinking 控制。键是 pi thinking 级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`。映射可以有空洞；例如，模型可以暴露 `high` 和 `max` 而不暴露 `xhigh`。

值为三态：

| 值 | 含义 |
|-------|---------|
| 省略 | 到 `high` 为止的标准级别使用提供方的默认映射；扩展的 `xhigh` 和 `max` 级别不受支持 |
| 字符串 | 该级别受支持，并将此值发给提供方 |
| `null` | 该级别不受支持，会被隐藏/跳过/钳制掉 |

仅支持 off、high 和 max 推理的模型示例：

```json
{
  "id": "deepseek-v4-pro",
  "reasoning": true,
  "thinkingLevelMap": {
    "minimal": null,
    "low": null,
    "medium": null,
    "high": "high",
    "xhigh": null,
    "max": "max"
  }
}
```

thinking 无法关闭的模型示例：

```json
{
  "id": "always-thinking-model",
  "reasoning": true,
  "thinkingLevelMap": {
    "off": null
  }
}
```

迁移：使用 `compat.reasoningEffortMap` 的旧配置应将该映射移到模型级 `thinkingLevelMap`。不应出现在 UI 中的级别使用 `null`。

## 覆盖内置提供方

通过代理路由内置提供方，无需重新定义模型：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1"
    }
  }
}
```

全部内置 Anthropic 模型仍然可用。现有的 OAuth 或 API 密钥鉴权继续有效。

要将自定义模型合并进内置提供方，请包含 `models` 数组：

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "https://my-proxy.example.com/v1",
      "apiKey": "$ANTHROPIC_API_KEY",
      "api": "anthropic-messages",
      "models": [...]
    }
  }
}
```

合并语义：
- 保留内置模型。
- 自定义模型按提供方内的 `id` 更新或插入。
- 若自定义模型 `id` 与内置模型 `id` 相同，自定义模型替换该内置模型。
- 若自定义模型 `id` 是新的，则与内置模型并列添加。

## 按模型覆盖

使用 `modelOverrides` 自定义内置模型和匹配的扩展注册模型，而无需替换提供方的完整模型列表。

```json
{
  "providers": {
    "openrouter": {
      "modelOverrides": {
        "anthropic/claude-sonnet-4": {
          "name": "Claude Sonnet 4 (Bedrock Route)",
          "compat": {
            "openRouterRouting": {
              "only": ["amazon-bedrock"]
            }
          }
        }
      }
    }
  }
}
```

`modelOverrides` 对每个模型支持这些字段：`name`、`reasoning`、`thinkingLevelMap`、`input`、`cost`（部分）、`contextWindow`、`maxTokens`、`samplingParams`（按键合并）、`headers`、`compat`。

直连 OpenAI 的 GPT-5.6 Sol、Terra 和 Luna 默认使用 `272000` 上下文窗口，以使请求停留在 OpenAI 的短上下文计价档。若要选用 OpenAI 的 1.05M 上下文窗口，请为你使用的每个模型提高该值：

```json
{
  "providers": {
    "openai": {
      "modelOverrides": {
        "gpt-5.6-sol": {
          "contextWindow": 1050000
        }
      }
    }
  }
}
```

该覆盖会保留内置定价元数据。总输入 token 超过 272K 的请求，整单使用 GPT-5.6 的长上下文费率。需要时对 `gpt-5.6-terra` 或 `gpt-5.6-luna` 应用相同覆盖。

行为说明：
- `modelOverrides` 应用于内置提供方模型和匹配的扩展注册提供方模型。
- 未知模型 ID 会被忽略。
- 可将提供方级 `baseUrl`/`headers` 与 `modelOverrides` 组合使用。
- 覆盖 `name` 只改变模型匹配和次要详情文本；页脚和主模型列表仍显示模型 `id`。
- 若提供方也定义了 `models`，自定义模型在内置覆盖之后合并。相同 `id` 的自定义模型会替换被覆盖后的内置模型条目。

## Anthropic Messages 兼容性

对使用 `api: "anthropic-messages"` 的提供方或代理，用 `compat` 控制 Anthropic 特有的请求兼容性。

默认情况下 pi 会为每个工具发送 `eager_input_streaming: true`。若代理或 Anthropic 兼容后端拒绝该字段，将 `supportsEagerToolInputStreaming` 设为 `false`。Pi 将省略 `tools[].eager_input_streaming`，并在启用工具的请求上改发旧的 `fine-grained-tool-streaming-2025-05-14` beta 头。

部分 Anthropic 模型需要自适应 thinking（`thinking.type: "adaptive"` 加上 `output_config.effort`），而不是旧的基于预算的 thinking 负载。内置模型会自动设置此项。对路由到这些模型的自定义提供方或别名，将 `forceAdaptiveThinking` 设为 `true`。

支持按轮 effort 的 Claude 模型使用 `supportsMidConvoEffort`。Pi 随后会持久化每次响应的提供方 effort，在后续请求中重建仅含 effort 的系统消息，并发送带 `prefix_mismatch_behavior: "drop_block"` 的 thinking 绑定控制，以避免过期的已签名 thinking 前缀导致持续 400 响应。仅对忠实 Anthropic Messages 传输上的确切受支持 Claude 模型设置此项；不要为仅模仿 Messages 形态的 API 启用。

部分 Anthropic 兼容提供方会发出签名为空的 thinking 块，并在回放时仍期望它们。仅对这些提供方将 `allowEmptySignature` 设为 `true`；真正的 Anthropic 会拒绝空的 thinking 签名。

内置 Anthropic 模型在其模型元数据中启用 `supportsStrictTools`。自定义 Anthropic 兼容模型在其端点接受严格 JSON Schema 工具定义时必须将其设为 `true`。

```json
{
  "providers": {
    "anthropic-proxy": {
      "baseUrl": "https://proxy.example.com",
      "api": "anthropic-messages",
      "apiKey": "$ANTHROPIC_PROXY_KEY",
      "compat": {
        "supportsEagerToolInputStreaming": false,
        "supportsLongCacheRetention": true,
        "forceAdaptiveThinking": true,
        "allowEmptySignature": true
      },
      "models": [
        {
          "id": "claude-opus-4-7",
          "reasoning": true,
          "input": ["text", "image"]
        }
      ]
    }
  }
}
```

| 字段 | 说明 |
|-------|-------------|
| `supportsEagerToolInputStreaming` | 提供方是否接受按工具的 `eager_input_streaming`。默认：`true`。设为 `false` 以省略该字段，并在启用工具的请求上使用旧的细粒度工具流式 beta 头。 |
| `supportsLongCacheRetention` | 缓存保留为 `long` 时，提供方是否接受 Anthropic 长缓存保留（`cache_control.ttl: "1h"`）。默认：`true`。 |
| `sendSessionAffinityHeaders` | 启用缓存时是否根据会话 id 发送 `x-session-affinity`。默认：对已知提供方自动检测。 |
| `supportsCacheControlOnTools` | 提供方是否接受工具定义上的 Anthropic 风格 `cache_control` 标记。默认：`true`。 |
| `forceAdaptiveThinking` | 是否为此模型发送自适应 thinking（`thinking.type: "adaptive"` 加上 `output_config.effort`）。内置自适应模型会自动设置此项。默认：`false`。 |
| `supportsMidConvoEffort` | 该确切 Claude 模型传输是否支持按轮 effort 系统消息和 thinking 绑定控制。启用后，Pi 会持久化原生 effort 级别，并始终发送 `drop_block`。默认：`false`。 |
| `allowEmptySignature` | 是否将空的 thinking 签名回放为 `signature: ""`，而不是把 thinking 转成文本。默认：`false`。 |
| `supportsStrictTools` | 提供方是否接受严格 JSON Schema 工具定义。默认：`false`；内置 Anthropic 模型在生成的元数据中启用它。 |

## OpenAI 兼容性

对部分兼容 OpenAI 的提供方，使用 `compat` 字段。

- 提供方级 `compat` 为该提供方下全部模型提供默认值。
- 模型级 `compat` 覆盖该模型的提供方级值。

```json
{
  "providers": {
    "local-llm": {
      "baseUrl": "http://localhost:8080/v1",
      "api": "openai-completions",
      "compat": {
        "supportsUsageInStreaming": false,
        "maxTokensField": "max_tokens"
      },
      "models": [...]
    }
  }
}
```

| 字段 | 说明 |
|-------|-------------|
| `supportsStore` | 提供方支持 `store` 字段 |
| `supportsDeveloperRole` | 使用 `developer` 还是 `system` 角色 |
| `supportsReasoningEffort` | 是否支持 `reasoning_effort` 参数 |
| `supportsUsageInStreaming` | 是否支持 `stream_options: { include_usage: true }`（默认：`true`） |
| `supportsFinishReason` | 流式响应是否包含 `finish_reason`。为 `false` 时，pi 在流结束时推断 `stop` 或 `toolUse`。默认：`true`。 |
| `maxTokensField` | 使用 `max_completion_tokens` 或 `max_tokens` |
| `requiresToolResultName` | 在工具结果消息上包含 `name` |
| `requiresAssistantAfterToolResult` | 在工具结果之后、用户消息之前插入一条 assistant 消息 |
| `requiresThinkingAsText` | 将 thinking 块转为纯文本 |
| `requiresReasoningContentOnAssistantMessages` | 启用推理时，在所有回放的 assistant 消息上包含空的 `reasoning_content` |
| `thinkingFormat` | 使用 `reasoning_effort`、`openrouter`、`deepseek`、`together`、`baseten`、`zai`、`qwen`、`chat-template` 或 `qwen-chat-template` thinking 参数 |
| `chatTemplateKwargs` | `thinkingFormat: "chat-template"` 的 `chat_template_kwargs` 值；用 `{ "$var": "thinking.enabled" }`、`{ "$var": "thinking.effort" }` 或 `{ "$var": "thinking.budget" }` 表示由 pi 控制的 thinking 值 |
| `chatTemplateArgs` | `thinkingFormat: "baseten"` 的 `chat_template_args` 值；用 `{ "$var": "thinking.enabled" }`、`{ "$var": "thinking.effort" }` 或 `{ "$var": "thinking.budget" }` 表示由 pi 控制的 thinking 值 |
| `thinkingTokenBudgetField` | 用于根据 `thinkingBudgets` 限制推理 token 的顶层请求字段，会钳制以便至少为答案保留 1024 token。`"thinking_token_budget"`（vLLM）、`"thinking_budget"`（Qwen/DashScope/SGLang）、`"thinking_budget_tokens"`（llama.cpp）。默认关闭；不会设在生成的目录上。 |
| `supportsThinkingTokenBudget` | `thinkingTokenBudgetField: "thinking_token_budget"`（vLLM）的别名。优先使用 `thinkingTokenBudgetField`。默认：`false`。 |
| `cacheControlFormat` | 在系统提示、最后一个工具定义，以及最后一条 user、assistant 或工具结果文本内容上使用 Anthropic 风格的 `cache_control` 标记。当前仅支持 `anthropic`。 |
| `sendSessionAffinityHeaders` | 对 `openai-completions`，启用缓存时根据会话 id 发送会话亲和请求头。默认：`false`。 |
| `sessionAffinityFormat` | 对 `openai-completions` 和 `openai-responses`，会话亲和请求头格式：`openai` 发送 `session_id`/`x-client-request-id`（completions 还会发 `x-session-affinity`），`openai-nosession` 省略含下划线的 `session_id` 头，`openrouter` 发送 `x-session-id`。不影响 `prompt_cache_key` 请求体参数。默认：自动检测。 |
| `supportsStrictMode` | 提供方是否接受严格 JSON Schema 函数工具定义。默认值取决于 API；内置 OpenAI 模型带有显式能力元数据。 |
| `supportsOpenAIGrammarTools` | OpenAI 兼容 API 是否发出自定义 Lark/regex 语法工具。为 `false` 时，语法约束工具回退为普通函数工具。默认：`false`；内置模型目录为 OpenAI、OpenAI Codex、Azure OpenAI、GitHub Copilot、opencode 和 Cloudflare AI Gateway 上的 GPT-5+ 模型启用它。 |
| `deferredToolsMode` | 使用提供方特有的延迟工具序列化。当前仅支持 `"kimi"`，用于 Kimi 的 OpenAI 兼容 Chat Completions 格式。 |
| `supportsLongCacheRetention` | 缓存保留为 `long` 时，提供方是否接受长缓存保留：GPT-5.6+ Responses 模型用 `prompt_cache_options.ttl: "30m"`，较早的 OpenAI 模型用 `prompt_cache_retention: "24h"`，当 `cacheControlFormat` 为 `anthropic` 时用 `cache_control.ttl: "1h"`。默认：`true`。 |
| `openRouterRouting` | OpenRouter 提供方路由偏好。该对象原样放在 [OpenRouter API 请求](https://openrouter.ai/docs/guides/routing/provider-selection) 的 `provider` 字段中。 |
| `vercelGatewayRouting` | Vercel AI Gateway 的提供方选择路由配置（`only`、`order`） |

`openrouter` 使用 `reasoning: { effort }`。`together` 使用 `reasoning: { enabled }`，并在启用 `supportsReasoningEffort` 时也发送 `reasoning_effort`。`qwen` 使用顶层 `enable_thinking`。对需要 `chat_template_kwargs.enable_thinking` 和 `preserve_thinking` 的本地 Qwen 兼容服务器，使用 `qwen-chat-template`。对需要可配置 `chat_template_kwargs` 的 vLLM/Hugging Face 聊天模板，使用 `chat-template`，例如 DeepSeek V3.x 模板用 `chatTemplateKwargs: { "thinking": { "$var": "thinking.enabled" } }`。对通过 `chat_template_args` 暴露开关、并可选支持顶层 `reasoning_effort` 的提供方，使用 `thinkingFormat: "baseten"` 配合 `chatTemplateArgs`。

`thinkingTokenBudgetField` 独立于 `thinkingFormat`。不要在生成的 Qwen 目录上启用它：这些模型已经发送 `reasoning_effort`，而 DashScope 会拒绝同时使用 `thinking_budget` 和 `reasoning_effort`。

`cacheControlFormat: "anthropic"` 用于通过文本内容和工具定义上的 `cache_control` 标记暴露 Anthropic 风格 prompt 缓存的 OpenAI 兼容提供方。

示例：

```json
{
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "$OPENROUTER_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "openrouter/anthropic/claude-3.5-sonnet",
          "name": "OpenRouter Claude 3.5 Sonnet",
          "compat": {
            "openRouterRouting": {
              "allow_fallbacks": true,
              "require_parameters": false,
              "data_collection": "deny",
              "zdr": true,
              "enforce_distillable_text": false,
              "order": ["anthropic", "amazon-bedrock", "google-vertex"],
              "only": ["anthropic", "amazon-bedrock"],
              "ignore": ["gmicloud", "friendli"],
              "quantizations": ["fp16", "bf16"],
              "sort": {
                "by": "price",
                "partition": "model"
              },
              "max_price": {
                "prompt": 10,
                "completion": 20
              },
              "preferred_min_throughput": {
                "p50": 100,
                "p90": 50
              },
              "preferred_max_latency": {
                "p50": 1,
                "p90": 3,
                "p99": 5
              }
            }
          }
        }
      ]
    }
  }
}
```

Vercel AI Gateway 示例：

```json
{
  "providers": {
    "vercel-ai-gateway": {
      "baseUrl": "https://ai-gateway.vercel.sh/v1",
      "apiKey": "$AI_GATEWAY_API_KEY",
      "api": "openai-completions",
      "models": [
        {
          "id": "moonshotai/kimi-k2.5",
          "name": "Kimi K2.5 (Fireworks via Vercel)",
          "reasoning": true,
          "input": ["text", "image"],
          "cost": { "input": 0.6, "output": 3, "cacheRead": 0, "cacheWrite": 0 },
          "contextWindow": 262144,
          "maxTokens": 262144,
          "compat": {
            "vercelGatewayRouting": {
              "only": ["fireworks", "novita"],
              "order": ["fireworks", "novita"]
            }
          }
        }
      ]
    }
  }
}
```
