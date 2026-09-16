> 本文为 [README.md](README.md) 的中文译本。

# @earendil-works/pi-ai

统一的 LLM API，提供 Provider 集合、自动鉴权解析、token 与费用追踪，以及简单的上下文持久化和会话中途切换到其他 Model。

**说明**：本库只收录支持工具调用（function calling）的 Model，因为这对 agentic 工作流至关重要。

## 目录

- [支持的 Provider](#支持的-provider)
- [安装](#安装)
- [快速开始](#快速开始)
- [Provider 与 Model](#provider-与-model)
  - [Provider Factory](#provider-factory)
  - [全部内置 Provider](#全部内置-provider)
  - [查询 Model](#查询-model)
  - [静态目录读取](#静态目录读取)
  - [动态 Provider](#动态-provider)
- [鉴权](#鉴权)
  - [鉴权如何解析](#鉴权如何解析)
  - [转换请求头](#转换请求头)
  - [凭证存储](#凭证存储)
  - [环境变量](#环境变量)
- [工具](#工具)
  - [定义工具](#定义工具)
  - [处理工具调用](#处理工具调用)
  - [用部分 JSON 流式传输工具调用](#用部分-json-流式传输工具调用)
  - [校验工具参数](#校验工具参数)
  - [完整事件参考](#完整事件参考)
  - [紧凑的 Assistant Message Frame](#紧凑的-assistant-message-frame)
- [图像输入](#图像输入)
- [图像生成](#图像生成)
- [Thinking/Reasoning](#thinkingreasoning)
  - [统一接口](#统一接口streamsimplecompletesimple)
  - [Provider 特定选项](#provider-特定选项streamcomplete)
  - [流式传输 Thinking 内容](#流式传输-thinking-内容)
- [停止原因](#停止原因)
- [错误处理](#错误处理)
  - [中止请求](#中止请求)
  - [中止后继续](#中止后继续)
  - [调试 Provider 载荷](#调试-provider-载荷)
- [自定义 Provider](#自定义-provider)
  - [createProvider()](#createprovider)
  - [直接调用 API 实现](#直接调用-api-实现)
  - [OpenAI 兼容性设置](#openai-兼容性设置)
- [用于测试的 Faux Provider](#用于测试的-faux-provider)
- [跨 Provider 交接](#跨-provider-交接)
- [上下文序列化](#上下文序列化)
- [浏览器用法](#浏览器用法)
- [打包与 Tree Shaking](#打包与-tree-shaking)
- [OAuth Provider](#oauth-provider)
  - [Vertex AI](#vertex-ai)
  - [CLI 登录](#cli-登录)
  - [程序化 OAuth](#程序化-oauth)
- [从旧的全局 API 迁移](#从旧的全局-api-迁移)
- [开发](#开发)
- [许可证](#许可证)

## 支持的 Provider

- **OpenAI**
- **Ant Ling**
- **Azure OpenAI (Responses)**
- **OpenAI Codex**（ChatGPT Plus/Pro 订阅，需要 OAuth，见下文）
- **DeepSeek**
- **NVIDIA NIM**
- **Anthropic**
- **Google**
- **Vertex AI**（通过 Vertex AI 使用 Gemini）
- **Mistral**
- **Groq**
- **Cerebras**
- **Cloudflare AI Gateway**
- **Cloudflare Workers AI**
- **xAI**
- **OpenRouter**
- **Vercel AI Gateway**
- **ZAI Coding Plan (Global)**（另有独立的中国区 Provider）
- **MiniMax**（另有独立的中国区 Provider）
- **Together AI**
- **Baseten**
- **Hugging Face**
- **Moonshot AI**（另有独立的中国区 Provider）
- **GitHub Copilot**（需要 OAuth，见下文）
- **Amazon Bedrock**
- **OpenCode Zen**
- **OpenCode Go**
- **Fireworks**（使用 OpenAI 与 Anthropic 兼容 API）
- **Kimi For Coding**（Moonshot AI 订阅端点，使用 Anthropic 兼容 API）
- **Qwen Token Plan**（独立的 Individual 目录与现有目录，另有独立的中国区 Provider）
- **Xiaomi MiMo**（默认使用 API 计费端点，另有面向 `cn`/`ams`/`sgp` 区域的独立 Token Plan Provider）
- **任意 OpenAI 兼容 API**：Ollama、vLLM、LM Studio 等。

## 安装

```bash
npm install @earendil-works/pi-ai
```

TypeBox 导出从 `@earendil-works/pi-ai` 再导出：`Type`、`Static` 和 `TSchema`。

## 快速开始

你构建一个由 Provider 组成的 `Models` 集合，并通过它进行流式调用。最快的起步方式是注册所有内置 Provider；关心包体积的应用则应单独注册所需 Provider（见 [Provider Factory](#provider-factory) 与 [打包与 Tree Shaking](#打包与-tree-shaking)）。

```typescript
import { Type, type Context, type Tool } from '@earendil-works/pi-ai';
import { builtinModels } from '@earendil-works/pi-ai/providers/all';

// A Models collection with every built-in provider registered
const models = builtinModels();

// Sync lookup against the collection
const model = models.getModel('openai', 'gpt-4o-mini')!;

// Define tools with TypeBox schemas for type safety and validation
const tools: Tool[] = [{
  name: 'get_time',
  description: 'Get the current time',
  parameters: Type.Object({
    timezone: Type.Optional(Type.String({ description: 'Optional timezone (e.g., America/New_York)' }))
  })
}];

// Build a conversation context (easily serializable and transferable between models)
const context: Context = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: 'What time is it?', timestamp: Date.now() }],
  tools
};

// Option 1: Streaming with all event types.
// Auth resolves through the provider (OPENAI_API_KEY from the environment here).
const s = models.stream(model, context);

for await (const event of s) {
  switch (event.type) {
    case 'start':
      console.log(`Starting with ${event.partial.model}`);
      break;
    case 'text_start':
      console.log('\n[Text started]');
      break;
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'text_end':
      console.log('\n[Text ended]');
      break;
    case 'thinking_start':
      console.log('[Model is thinking...]');
      break;
    case 'thinking_delta':
      process.stdout.write(event.delta);
      break;
    case 'thinking_end':
      console.log('[Thinking complete]');
      break;
    case 'toolcall_start':
      console.log(`\n[Tool call started: index ${event.contentIndex}]`);
      break;
    case 'toolcall_delta':
      // Partial tool arguments are being streamed
      const partialCall = event.partial.content[event.contentIndex];
      if (partialCall.type === 'toolCall') {
        console.log(`[Streaming args for ${partialCall.name}]`);
      }
      break;
    case 'toolcall_end':
      console.log(`\nTool called: ${event.toolCall.name}`);
      console.log(`Arguments: ${JSON.stringify(event.toolCall.arguments)}`);
      break;
    case 'done':
      console.log(`\nFinished: ${event.reason}`);
      break;
    case 'error':
      console.error(`Error: ${event.error.errorMessage}`);
      break;
  }
}

// Get the final message after streaming, add it to the context
const finalMessage = await s.result();
context.messages.push(finalMessage);

// Handle tool calls if any
const toolCalls = finalMessage.content.filter(b => b.type === 'toolCall');
for (const call of toolCalls) {
  const result = call.name === 'get_time'
    ? new Date().toLocaleString('en-US', {
        timeZone: call.arguments.timezone || 'UTC',
        dateStyle: 'full',
        timeStyle: 'long'
      })
    : 'Unknown tool';

  // Add tool result to context (supports text and images)
  context.messages.push({
    role: 'toolResult',
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: 'text', text: result }],
    isError: false,
    timestamp: Date.now()
  });
}

// Continue if there were tool calls
if (toolCalls.length > 0) {
  const continuation = await models.complete(model, context);
  context.messages.push(continuation);
  console.log('After tool execution:', continuation.content);
}

console.log(`Total tokens: ${finalMessage.usage.input} in, ${finalMessage.usage.output} out`);
console.log(`Cost: $${finalMessage.usage.cost.total.toFixed(4)}`);

// Option 2: Get complete response without streaming
const response = await models.complete(model, context);

for (const block of response.content) {
  if (block.type === 'text') {
    console.log(block.text);
  } else if (block.type === 'toolCall') {
    console.log(`Tool: ${block.name}(${JSON.stringify(block.arguments)})`);
  }
}
```

本 README 其余代码片段均假定已按此方式设置好 `models` 集合（并已注册相关 Provider）。

## Provider 与 Model

**Provider** 是运行时单元：它拥有自己的 Model 目录、鉴权（API key 解析、OAuth 流程）以及流式行为。`Models` 集合持有各个 Provider，并把每个请求路由到拥有该 Model 的 Provider。

Provider 内部共享 **API 实现**（线上协议）：Anthropic Model 使用 `anthropic-messages`，OpenAI 使用 `openai-responses`，而 xAI、Groq、Cerebras、OpenRouter 以及大多数其他 Provider 共享 `openai-completions`。混合 API 的 Provider（GitHub Copilot、OpenCode Zen）按 Model 分发。

### Provider Factory

对于只需要特定 Provider 的应用，每个内置 Provider 都有一个 factory，各自作为子路径导入，只拉取该 Provider 的目录：

```typescript
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter';
import { amazonBedrockProvider } from '@earendil-works/pi-ai/providers/amazon-bedrock';
// ...one module per provider in the Supported Providers list

const models = createModels();
models.setProvider(anthropicProvider());
models.setProvider(openrouterProvider());
```

Provider factory 导入各自的 Model 目录和一个惰性 API 包装器。它们不会导入其他 Provider。配合打包器的 code splitting，SDK 实现（`@anthropic-ai/sdk`、`openai`、`@google/genai` 等）会留在惰性 chunk 中，仅在首次请求该 API 的 Model 时加载。

### 全部内置 Provider

对于想要全部功能的应用（如快速开始所示）：

```typescript
import { builtinModels } from '@earendil-works/pi-ai/providers/all';

const models = builtinModels(); // a Models collection with every built-in provider registered
```

这会导入所有目录以及每一个内置 Provider factory。这是重量级、显式的入口。`builtinModels()` 接受与 `createModels()` 相同的选项（`credentials`、`authContext`）；如果你想把它们注册到自己的集合上，`builtinProviders()` 会返回 Provider 数组。

### 查询 Model

读取是同步的，返回最近一次已知的列表：

```typescript
const providers = models.getProviders();           // registered Provider objects
const provider = models.getProvider('anthropic');  // one provider

const all = models.getModels();                    // every model across providers
const anthropicModels = models.getModels('anthropic');
const model = models.getModel('anthropic', 'claude-sonnet-4-5');

for (const m of anthropicModels) {
  console.log(`${m.id}: ${m.name}`);
  console.log(`  API: ${m.api}`);
  console.log(`  Context: ${m.contextWindow} tokens`);
  console.log(`  Vision: ${m.input.includes('image')}`);
  console.log(`  Reasoning: ${m.reasoning}`);
}
```

动态列出的 Model 类型为 `Model<Api>`。当你需要 API 特定的选项类型时，用 `hasApi()` guard 收窄：

```typescript
import { hasApi } from '@earendil-works/pi-ai';

const m = models.getModel('anthropic', 'claude-sonnet-4-5');
if (m && hasApi(m, 'anthropic-messages')) {
  // m: Model<'anthropic-messages'> — stream options fully typed
  models.stream(m, context, { thinkingEnabled: true, thinkingBudgetTokens: 2048 });
}
```

### 静态目录读取

对于希望使用生成的内置目录、并获得完整字面量类型（Provider 与 Model ID 可自动补全）、且不依赖任何集合的工具：

```typescript
import { getBuiltinModel, getBuiltinModels, getBuiltinProviders } from '@earendil-works/pi-ai/providers/all';

const model = getBuiltinModel('openai', 'gpt-4o-mini'); // typed Model<'openai-responses'>
const providers = getBuiltinProviders();
const anthropic = getBuiltinModels('anthropic');
```

### 动态 Provider

Provider 可以拥有动态 Model 列表（例如 llama.cpp 服务器、实时的 OpenRouter 列表）。读取保持同步；拉取是显式的异步动词：

```typescript
// getModels() returns the last-known list (empty before the first refresh)
await models.refresh({ providers: ['llamacpp'] }); // refresh one provider
await models.refresh();                            // refresh all providers concurrently, best-effort
const fresh = models.getModel('llamacpp', 'qwen3-30b');
```

静态内置 Provider 对 `refresh()` 是空操作。构建动态 Provider 见 [createProvider()](#createprovider)。

## 鉴权

每个 Provider 拥有自己的鉴权：API key 如何解析（已存储凭证、环境变量、以及 AWS profile 或 gcloud ADC 这类环境来源），以及在支持的情况下的 OAuth 登录/刷新流程。

### 鉴权如何解析

当你调用 `models.stream()` 时，集合通过拥有该 Model 的 Provider 解析鉴权，并将其合并进请求。显式的按请求取值始终优先：

```typescript
// Resolved through the provider (env var, stored credential, OAuth token):
await models.complete(model, context);

// Explicit key wins over anything the provider would resolve:
await models.complete(model, context, { apiKey: 'sk-explicit' });
```

你可以在不发起请求的情况下检查解析结果。传入 Provider ID 以获得 Provider 范围的鉴权，或传入 Model 以包含其静态 `model.headers`：

```typescript
const providerAuth = await models.getAuth(model.provider);
const modelAuth = await models.getAuth(model);

if (modelAuth) {
  console.log(`configured via ${modelAuth.source}`); // e.g. "ANTHROPIC_API_KEY", "OAuth", "stored credential"
  console.log(modelAuth.auth.headers);              // Provider auth headers + model.headers
} else {
  console.log('not configured');
}
```

两个重载都会解析凭证，并在必要时刷新过期的 OAuth，可能返回由鉴权派生的 `apiKey`、`headers` 或 `baseUrl`。对未配置的 Provider，`getAuth()` 解析为 `undefined`；当确实出了问题时会以 `ModelsError` 拒绝（`"oauth"`：token 刷新失败，凭证保留以便重新登录；`"auth"`：key 解析或凭证存储失败）。请求路径会把同样的失败以流错误的形式暴露出来。

`getAuth()`、`checkAuth()`、`getAvailable()`、login 和 logout 通过其现有选项或 interaction 对象接受可选的调用方取消，未提供 signal 时保持无界。Provider 的 `login`、`ApiKeyAuth.check`、`ApiKeyAuth.resolve` 和 `OAuthAuth.refresh` 实现始终会收到一个具体的 signal，并且必须在阻塞工作中遵守它。

### 转换请求头

`Models.stream()`、`complete()`、`streamSimple()` 和 `completeSimple()` 接受一个仅属于 Models 的 `transformHeaders` 选项。它在 Provider 鉴权、`model.headers` 以及显式 `options.headers` 合并之后、Provider 分发之前运行一次：

```typescript
const response = await models.completeSimple(model, context, {
  headers: { "X-Client": "my-app" },
  transformHeaders: async (headers) => ({
    ...headers,
    "X-Request-ID": crypto.randomUUID(),
  }),
});
```

顺序为：

```text
provider auth headers -> model.headers -> explicit options.headers -> transformHeaders -> Provider.stream*()
```

Header 名称按不区分大小写合并。显式 header 会覆盖鉴权/Model header，transform 拥有最终控制权；对某个 header 返回 `null` 会抑制支持删除的较低层默认值。

`transformHeaders` 属于 `Models`，不属于 `Provider`。`Models` 实现必须消费它，并在调用 `Provider.stream*()` 之前将其移除。Provider 实现继续接收普通的 `ApiStreamOptions` 或 `SimpleStreamOptions`，从不自行处理该 transform。请使用此选项，而不是在 `stream*()` 之前调用 `getAuth(model)`，后者会把请求鉴权解析两次。

### 凭证存储

已存储的凭证（交互式输入的 API key、OAuth token）存放在 `CredentialStore` 中——每个 Provider 一条带类型标签的凭证。pi-ai 自带内存默认实现；应用可注入持久化存储：

```typescript
import { createModels, type CredentialStore } from '@earendil-works/pi-ai';

const models = createModels({ credentials: myFileBackedStore });
// builtinModels() takes the same options:
// const models = builtinModels({ credentials: myFileBackedStore });
```

契约很小：`read(providerId)`、用于非秘密 `{ providerId, type }` 元数据的 `list()`、`modify(providerId, fn)`（唯一的写入路径——序列化的读-改-写），以及 `delete(providerId)`。每个操作都接受可选的取消选项。枚举不得解析秘密或执行已配置的 key 命令。OAuth token 刷新在 `modify` 内部运行，因此并发请求和进程不会对已轮换的 token 双重刷新。已存储的凭证*拥有*其 Provider：仅在没有存储任何内容时才会查阅环境变量，刷新失败也绝不会静默回退到环境变量 key。

API-key 凭证使用与 pi 的 `auth.json` 相同的判别符，并可携带 Provider 范围的 env/config 值：

```typescript
const credential = {
  type: 'api_key',
  key: '...',
  env: {
    CLOUDFLARE_ACCOUNT_ID: 'account-id',
    CLOUDFLARE_GATEWAY_ID: 'gateway-id'
  }
} as const;
```

### 环境变量

内置 Provider 解析这些环境变量（Node.js；在浏览器中请显式传入 `apiKey`）：

| Provider | Environment Variable(s) |
|----------|------------------------|
| OpenAI | `OPENAI_API_KEY` |
| Ant Ling | `ANT_LING_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_BASE_URL` (e.g. `https://{resource}.ai.azure.com`) or `AZURE_OPENAI_RESOURCE_NAME`. Supports `*.openai.azure.com`, `*.cognitiveservices.azure.com` and `*.ai.azure.com`; root endpoints auto-normalize to `/openai/v1`. Optional: `AZURE_OPENAI_API_VERSION` (default `v1`), `AZURE_OPENAI_DEPLOYMENT_NAME_MAP`. |
| Anthropic | `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| Google | `GEMINI_API_KEY` |
| Vertex AI | `GOOGLE_CLOUD_API_KEY` or `GOOGLE_CLOUD_PROJECT` (or `GCLOUD_PROJECT`) + `GOOGLE_CLOUD_LOCATION` + ADC |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| Cloudflare AI Gateway | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_GATEWAY_ID` |
| Cloudflare Workers AI | `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` |
| xAI | `XAI_API_KEY` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Baseten | `BASETEN_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |
| ZAI Coding Plan (Global) | `ZAI_API_KEY` |
| ZAI Coding Plan (China) | `ZAI_CODING_CN_API_KEY` |
| MiniMax (Global) | `MINIMAX_API_KEY` |
| MiniMax (China) | `MINIMAX_CN_API_KEY` |
| Moonshot AI / Moonshot AI (China) | `MOONSHOT_API_KEY` |
| Hugging Face | `HF_TOKEN` |
| OpenCode Zen / OpenCode Go | `OPENCODE_API_KEY` |
| Kimi For Coding | `KIMI_API_KEY` |
| Qwen Token Plan (existing catalog) | `QWEN_TOKEN_PLAN_API_KEY` |
| Qwen Token Plan (Individual) | `QWEN_TOKEN_PLAN_API_KEY` |
| Qwen Token Plan (China) | `QWEN_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo (API billing) | `XIAOMI_API_KEY` |
| Xiaomi MiMo Token Plan (China) | `XIAOMI_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo Token Plan (Amsterdam) | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` |
| Xiaomi MiMo Token Plan (Singapore) | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |

`qwen-token-plan-individual` 与 `qwen-token-plan` 共享国际端点以及
`QWEN_TOKEN_PLAN_API_KEY`。Individual Provider 只暴露 Individual 订阅文档中的 Model，而现有 Provider 保留更广的目录以保持向后兼容。
已存储的凭证仍按 Provider 划分范围，因此请把 key 保存在你注册的 Provider ID 下。

Amazon Bedrock 解析环境中的 AWS 凭证（`AWS_PROFILE`、access key 对、`AWS_BEARER_TOKEN_BEDROCK`、ECS task role、web identity token）；其 Provider 自有的登录流程支持 bearer token、AWS profile 以及现有凭证链。Vertex AI 解析显式 key，或 gcloud Application Default Credentials 加上 project/location，并带有面向 API key、ADC 和服务账号文件的 Provider 自有登录流程。

## 工具

工具让 LLM 能与外部系统交互。本库使用 TypeBox schema 做类型安全的工具定义，并利用 TypeBox 内置校验器与值转换工具自动校验。TypeBox schema 可以作为普通 JSON 序列化与反序列化，适合分布式系统。

### 定义工具

```typescript
import { Type, type Tool, StringEnum } from '@earendil-works/pi-ai';

// Define tool parameters with TypeBox
const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: Type.Object({
    location: Type.String({ description: 'City name or coordinates' }),
    units: StringEnum(['celsius', 'fahrenheit'], { default: 'celsius' })
  })
};

// Note: For Google API compatibility, use StringEnum helper instead of Type.Enum
// Type.Enum generates anyOf/const patterns that Google doesn't support

const bookMeetingTool: Tool = {
  name: 'book_meeting',
  description: 'Schedule a meeting',
  parameters: Type.Object({
    title: Type.String({ minLength: 1 }),
    startTime: Type.String({ format: 'date-time' }),
    endTime: Type.String({ format: 'date-time' }),
    attendees: Type.Array(Type.String({ format: 'email' }), { minItems: 1 })
  })
};
```

### 工具的约束采样

工具可以选择启用 Provider 侧的约束采样。对于 JSON-schema 工具，`strict: 'prefer'` 在支持时使用 Provider 侧的严格 schema 强制，否则回退到普通工具调用。`strict: 'require'` 在当前 Provider/Model 无法兑现时会使请求失败。设置 `constrainedSampling: false` 可显式退出；其行为与省略该字段相同。

```typescript
const strictTool: Tool = {
  name: 'edit_file',
  description: 'Edit a file',
  parameters: Type.Object({
    path: Type.String(),
    content: Type.String()
  }, { additionalProperties: false }),
  constrainedSampling: { type: 'json_schema', strict: 'prefer' }
};
```

严格 JSON-schema 约束采样支持 OpenAI、Anthropic、受支持的 Amazon Bedrock Converse Model、Mistral，以及通过 Google Generative AI 和 Vertex 适配器的 Gemini 3 工具调用。Google 使用 `VALIDATED` function-calling 模式（或在显式请求时使用 `ANY`）；更早的 Gemini 版本对 `strict: 'prefer'` 会回退，并拒绝 `strict: 'require'`，因为它们不强制 required 参数。Bedrock 的严格工具能力由 Model 的 structured-output 元数据生成；自定义 Bedrock Model 可以覆盖 `compat.supportsStrictMode`。OpenAI Responses 和 Chat Completions 也可以用 OpenAI Lark 或 regex grammar 变体发出语法约束的自定义工具。如果提供了多个 OpenAI 变体，优先使用 Lark 而不是 regex。当当前 Model 支持 grammar 工具时会强制语法约束；否则工具回退到普通的 function/JSON-schema 处理。Grammar 工具能力是 Model 元数据：生成的目录为会透传 OpenAI 自定义工具的端点上的 GPT-5+ Model 设置 `compat.supportsOpenAIGrammarTools`（OpenAI、OpenAI Codex、Azure OpenAI Responses、GitHub Copilot、opencode 和 Cloudflare AI Gateway）。OpenAI 会拒绝 pre-GPT-5 Model 上的 `type: "custom"` 工具，而会规范化工具 schema 的网关（例如 OpenRouter）会破坏它们，因此该标志在其他地方保持关闭。自定义 Model 定义可以通过 `compat` 选择加入。具备 grammar 能力的 Model 会拒绝没有非空受支持变体的 grammar 配置。原生 grammar 工具必须有一个对象参数 schema，且恰好有一个 required 的 string 属性：

```typescript
const patchTool: Tool = {
  name: 'apply_patch',
  description: 'Apply a patch',
  parameters: Type.Object({
    input: Type.String()
  }, { additionalProperties: false }),
  constrainedSampling: {
    type: 'grammar',
    variants: {
      openai_lark: 'start: /.+/s'
    }
  }
};
```

### 处理工具调用

工具结果使用 content block，可以同时包含文本和图像：

```typescript
import { readFileSync } from 'fs';

const context: Context = {
  messages: [{ role: 'user', content: 'What is the weather in London?', timestamp: Date.now() }],
  tools: [weatherTool]
};

const response = await models.complete(model, context);

// Check for tool calls in the response
for (const block of response.content) {
  if (block.type === 'toolCall') {
    // Execute your tool with the arguments
    // See "Validating Tool Arguments" section for validation
    const result = await executeWeatherApi(block.arguments);

    // Add tool result with text content
    context.messages.push({
      role: 'toolResult',
      toolCallId: block.id,
      toolName: block.name,
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: false,
      timestamp: Date.now()
    });
  }
}

// Tool results can also include images (for vision-capable models)
const imageBuffer = readFileSync('chart.png');
context.messages.push({
  role: 'toolResult',
  toolCallId: 'tool_xyz',
  toolName: 'generate_chart',
  content: [
    { type: 'text', text: 'Generated chart showing temperature trends' },
    { type: 'image', data: imageBuffer.toString('base64'), mimeType: 'image/png' }
  ],
  isError: false,
  timestamp: Date.now()
});
```

### 用部分 JSON 流式传输工具调用

流式过程中，工具调用参数会随着到达而逐步解析。这可以在完整参数可用之前进行实时 UI 更新：

```typescript
const s = models.stream(model, context);

for await (const event of s) {
  if (event.type === 'toolcall_delta') {
    const toolCall = event.partial.content[event.contentIndex];

    // toolCall.arguments contains partially parsed JSON during streaming
    // This allows for progressive UI updates
    if (toolCall.type === 'toolCall' && toolCall.arguments) {
      // BE DEFENSIVE: arguments may be incomplete
      // Example: Show file path being written even before content is complete
      if (toolCall.name === 'write_file' && toolCall.arguments.path) {
        console.log(`Writing to: ${toolCall.arguments.path}`);

        // Content might be partial or missing
        if (toolCall.arguments.content) {
          console.log(`Content preview: ${toolCall.arguments.content.substring(0, 100)}...`);
        }
      }
    }
  }

  if (event.type === 'toolcall_end') {
    // Here toolCall.arguments is complete (but not yet validated)
    const toolCall = event.toolCall;
    console.log(`Tool completed: ${toolCall.name}`, toolCall.arguments);
  }
}
```

**关于部分工具参数的重要说明：**

- 在 `toolcall_delta` 事件期间，`arguments` 包含对部分 JSON 的尽力解析
- 字段可能缺失或不完整——使用前务必检查是否存在
- 字符串值可能在单词中间被截断
- 数组可能不完整
- 嵌套对象可能只填充了一部分
- 至少，`arguments` 会是空对象 `{}`，绝不会是 `undefined`
- Google Provider 不支持 function call 流式传输。你只会收到一个带有完整参数的 `toolcall_delta` 事件。

### 校验工具参数

在实现自己的工具执行循环时，使用 `validateToolCall` 在把参数传给工具之前进行校验：

```typescript
import { validateToolCall, type Tool } from '@earendil-works/pi-ai';

const tools: Tool[] = [weatherTool, calculatorTool];
const s = models.stream(model, { messages, tools });

for await (const event of s) {
  if (event.type === 'toolcall_end') {
    const toolCall = event.toolCall;

    try {
      // Validate arguments against the tool's schema (throws on invalid args)
      const validatedArgs = validateToolCall(tools, toolCall);
      const result = await executeMyTool(toolCall.name, validatedArgs);
      // ... add tool result to context
    } catch (error) {
      // Validation failed - return error as tool result so model can retry
      context.messages.push({
        role: 'toolResult',
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        content: [{ type: 'text', text: error.message }],
        isError: true,
        timestamp: Date.now()
      });
    }
  }
}
```

### 完整事件参考

成功的生成遵循 `start → updates* → done`。生成开始后的失败遵循 `start → updates* → error`。请求准备可能在生成开始前失败，此时流中只有 `error`；在 `start` 之前，`done` 和 update 事件都是无效的。当请求鉴权缺失时，直接的 API `streamSimple()` 调用会同步抛出。

每个非终止事件的 `partial` 都是共享的、到目前为止的实时响应辅助对象。它有意不是事件时刻的快照：Provider 可能随着生成推进而变更同一条消息和 content block，包括当较旧事件仍在流队列中等待时。处理事件时再检查它，不要把它当作历史状态保留。文本和普通 thinking block 在发出其 `*_start` 事件时为空，并且只通过匹配的 `*_delta` 事件增长，直到权威的 `*_end`；redacted thinking 可能在 start 时就已完整，并且不发出 delta。`toolcall_start` 时的工具调用参数因 Provider 而异；`toolcall_delta` 携带后续 JSON 更新。

assistant 消息生成期间发出的全部流式事件：

| 事件类型 | 说明 | 关键属性 |
|------------|-------------|----------------|
| `start` | 流开始 | `partial`：初始 assistant 消息结构 |
| `text_start` | 文本 block 开始 | `contentIndex`：在 content 数组中的位置 |
| `text_delta` | 收到文本 chunk | `delta`：新文本，`contentIndex`：位置 |
| `text_end` | 文本 block 完成 | `content`：完整文本，`contentIndex`：位置 |
| `thinking_start` | thinking block 开始 | `contentIndex`：在 content 数组中的位置 |
| `thinking_delta` | 收到 thinking chunk | `delta`：新文本，`contentIndex`：位置 |
| `thinking_end` | thinking block 完成 | `content`：完整 thinking，`contentIndex`：位置 |
| `toolcall_start` | 工具调用开始 | `contentIndex`：在 content 数组中的位置 |
| `toolcall_delta` | 工具参数流式传输中 | `delta`：JSON chunk，`partial.content[contentIndex].arguments`：部分解析的参数 |
| `toolcall_end` | 工具调用完成 | `toolCall`：完整但尚未做 schema 校验的工具调用，含 `id`、`name`、`arguments` |
| `done` | 流完成 | `reason`：停止原因（"stop"、"length"、"toolUse"），`message`：最终 assistant 消息 |
| `error` | 发生错误 | `reason`：错误类型（"error" 或 "aborted"），`error`：带部分内容的 AssistantMessage |

不同 content block 的流式事件不保证连续。Provider 可能在同一个上游 chunk 中发出文本、thinking 和工具调用的 delta，pi 也可能交错地抛出对应事件，例如 `text_start`、`text_delta`、`toolcall_start`、`text_delta`、`toolcall_delta`。消费者必须用 `contentIndex` 把每个 delta/end 事件关联到其 block，并且不得假设某个 block 的 `*_start`/`*_delta`/`*_end` 序列不会被其他 block 的事件打断。

### 紧凑的 Assistant Message Frame

`AssistantMessageFrameEncoder` 把一条流转换成紧凑、可持久化的 `AssistantMessageFrame` 值。每个流创建一个 encoder，并按顺序喂入每一个事件。encoder 理解 `partial` 是实时的：如果某个 block-start 事件是在 Provider 已经排队后续 delta 之后才被消费的，则只对当前 block 快照一次，已被覆盖的排队 text/thinking delta 不会产生重复 frame。它只保留每个打开 block 的计数器，以及临时的、用于同步已经推进的工具调用所需的原始前缀。它从不为每个 token 克隆不断增长的完整 partial。

start frame 包含消息元数据，content 为空。text 和 thinking frame 在权威的 end frame 之前，每个已生成字符最多存储一次。当其 start 事件被消费时已经推进的工具调用，会在普通 delta 恢复之前使用一个紧凑的 JSON checkpoint。终止性的 `done` 和 `error` 事件不产生 frame，因为最终消息结算是分开的。因此生成前的 `error` 不会产生任何 frame。

`reduceAssistantMessageFrames()` 是规范的纯 reducer。它重建文本、thinking 和工具调用参数，包括通过 `contentIndex` 识别的交错 block，并拒绝畸形序列。它对可迭代对象做单次遍历，没有 start frame 时返回 `undefined`。End frame 用 Provider 权威的已完成内容和元数据替换 block。reducer 不会对照 TypeBox schema 校验工具参数；执行前请调用 `validateToolCall`。

```typescript
import {
  AssistantMessageFrameEncoder,
  reduceAssistantMessageFrames,
  type AssistantMessageFrame,
} from '@earendil-works/pi-ai';

const encoder = new AssistantMessageFrameEncoder();
const frames: AssistantMessageFrame[] = [];
for await (const event of s) {
  const frame = encoder.encode(event);
  if (frame) frames.push(frame);
}

const reconstructedPartial = reduceAssistantMessageFrames(frames);
const finalMessage = await s.result(); // Persist terminal settlement separately.
```

encoder 会拒绝重复的 start、start 之前的 update、start 之前的 `done`、终止事件之后的事件、重复的 block start，以及 block 种类不匹配。start 之前的 `error` 是有效的，且不返回 frame。

## 图像输入

具备视觉能力的 Model 可以处理图像。你可以通过 `input` 属性检查 Model 是否支持图像。如果把图像传给不支持视觉的 Model，它们会被静默忽略。

```typescript
import { readFileSync } from 'fs';

const model = models.getModel('openai', 'gpt-4o-mini')!;

// Check if model supports images
if (model.input.includes('image')) {
  console.log('Model supports vision');
}

const imageBuffer = readFileSync('image.png');
const base64Image = imageBuffer.toString('base64');

const response = await models.complete(model, {
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      { type: 'image', data: base64Image, mimeType: 'image/png' }
    ],
    timestamp: Date.now()
  }]
});

// Access the response
for (const block of response.content) {
  if (block.type === 'text') {
    console.log(block.text);
  }
}
```

## 图像生成

图像生成使用与文本/聊天生成分离的 API 表面，并镜像聊天侧的设计：`ImagesModels` 集合持有 `ImagesProvider`，读取是同步的，鉴权通过拥有该 Model 的 Provider 解析。图像生成是一次性 API：`generateImages()` 等待 Provider 响应并返回最终的 `AssistantImages` 结果——不要为此使用聊天/流式 API。

### 基础图像生成

```typescript
import { builtinImagesModels } from '@earendil-works/pi-ai/providers/all';

// Every built-in image-generation provider; accepts the same options as createModels()
const imagesModels = builtinImagesModels();

const model = imagesModels.getModel('openrouter', 'google/gemini-2.5-flash-image')!;

// Auth resolves through the provider (OPENROUTER_API_KEY here); explicit apiKey wins
const result = await imagesModels.generateImages(model, {
  input: [{ type: 'text', text: 'Generate a red circle on a plain white background.' }]
});

for (const block of result.output) {
  if (block.type === 'text') {
    console.log(block.text);
  } else if (block.type === 'image') {
    console.log(block.mimeType);
    console.log(block.data.substring(0, 32));
  }
}
```

与聊天侧一样，你可以从部件构建集合：`createImagesModels({ credentials?, authContext? })`、来自 `@earendil-works/pi-ai/providers/openrouter-images` 的 `openrouterImagesProvider()` factory，以及用于自定义图像 Provider 的 `createImagesProvider({ id, auth, models, refreshModels?, api })`（动态列表使用 `imagesModels.refresh(provider?)`）。失败从不会 reject——它们返回带有 `stopReason: "error"` 的 `AssistantImages`。集合的 Provider 范围 `getAuth(providerId)` 与聊天侧完全一样。

旧的全局 API（`getImageModel()` / `getImageModels()` / `getImageProviders()` / `generateImages()`）仍可在 [compat 入口](#从旧的全局-api-迁移) 上使用：

```typescript
import { getImageModel, generateImages } from '@earendil-works/pi-ai/compat';

const model = getImageModel('openrouter', 'google/gemini-2.5-flash-image');
const result = await generateImages(model, {
  input: [{ type: 'text', text: 'Generate a red circle on a plain white background.' }]
}, {
  apiKey: process.env.OPENROUTER_API_KEY
});
```

部分 Model 也支持图像输入：

```typescript
import { readFileSync } from 'fs';

const imageBuffer = readFileSync('input.png');
const result = await imagesModels.generateImages(model, {
  input: [
    { type: 'text', text: 'Create a variation of this image with a blue background.' },
    { type: 'image', data: imageBuffer.toString('base64'), mimeType: 'image/png' }
  ]
});
```

在 Model 元数据上检查能力：

```typescript
console.log(model.input);   // ['text', 'image']
console.log(model.output);  // ['image'] or ['image', 'text']
```

### 说明与限制

- 图像 Model 位于 `ImagesModels` 集合中，聊天 Model 位于 `Models` 集合中；两者是分离的表面。
- 使用 `generateImages()`，而不是聊天/流式 API。
- 图像生成 Model 不参与工具调用。
- 输出返回在 `AssistantImages.output` 中，可以同时包含 base64 编码的 `ImageContent` block 和 `TextContent` block。
- 有些 Model 只返回图像，有些返回图像加文本。检查 `model.output`。
- 有些 Model 接受图像输入，有些只做 text-to-image。检查 `model.input`。
- 与流式 API 一样，图像生成支持 `apiKey`、`signal`、`headers`、`onPayload` 和 `onResponse` 等选项，结果可能包含 `stopReason`、`responseId` 和 `usage`。
- 如果你希望 Model 在对话中分析图像或调用工具，请对支持图像输入的 Model 使用常规聊天 API。
- 目前，图像生成仅通过一个 Provider 可用：OpenRouter。

## Thinking/Reasoning

许多 Model 支持 thinking/reasoning 能力，可以展示其内部思考过程。你可以通过 `reasoning` 属性检查 Model 是否支持 reasoning。如果把 reasoning 选项传给不支持 reasoning 的 Model，它们会被静默忽略。

### 统一接口（streamSimple/completeSimple）

```typescript
// Many models across providers support thinking/reasoning
const model = models.getModel('anthropic', 'claude-sonnet-4-5')!;
// or models.getModel('openai', 'gpt-5-mini');
// or models.getModel('google', 'gemini-2.5-flash');
// or models.getModel('xai', 'grok-4.6');

// Check if model supports reasoning
if (model.reasoning) {
  console.log('Model supports reasoning/thinking');
}

// Use the simplified reasoning option
const response = await models.completeSimple(model, {
  messages: [{ role: 'user', content: 'Solve: 2x + 5 = 13', timestamp: Date.now() }]
}, {
  reasoning: 'medium'  // 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
});

// Access thinking and text blocks
for (const block of response.content) {
  if (block.type === 'thinking') {
    console.log('Thinking:', block.thinking);
  } else if (block.type === 'text') {
    console.log('Response:', block.text);
  }
}
```

`xhigh` 和 `max` 是 Model 特定的、需显式选择的级别。使用 `getSupportedThinkingLevels(model)` 判断具体 Model 是否暴露其中任一级别；例如 GPT-5.6 可以同时暴露两者。

### Provider 特定选项（stream/complete）

`models.stream()`/`complete()` 接受所属 API 的完整选项集。使用 `hasApi()` 把动态查找的 Model 收窄到其 API，以获得完整的选项类型：

```typescript
import { hasApi } from '@earendil-works/pi-ai';

// OpenAI Reasoning (o1, o3, gpt-5)
const openaiModel = models.getModel('openai', 'gpt-5-mini')!;
if (hasApi(openaiModel, 'openai-responses')) {
  await models.complete(openaiModel, context, {
    reasoningEffort: 'medium',
    reasoningSummary: 'detailed'  // OpenAI Responses API only
  });
}

// Anthropic Thinking
const anthropicModel = models.getModel('anthropic', 'claude-sonnet-4-5')!;
if (hasApi(anthropicModel, 'anthropic-messages')) {
  await models.complete(anthropicModel, context, {
    thinkingEnabled: true,
    thinkingBudgetTokens: 8192  // Optional token limit
  });
}

// Google Gemini Thinking
const googleModel = models.getModel('google', 'gemini-2.5-flash')!;
if (hasApi(googleModel, 'google-generative-ai')) {
  await models.complete(googleModel, context, {
    thinking: {
      enabled: true,
      budgetTokens: 8192  // -1 for dynamic, 0 to disable
    }
  });
}
```

### 流式传输 Thinking 内容

流式时，thinking 内容通过特定事件送达：

```typescript
const s = models.streamSimple(model, context, { reasoning: 'high' });

for await (const event of s) {
  switch (event.type) {
    case 'thinking_start':
      console.log('[Model started thinking]');
      break;
    case 'thinking_delta':
      process.stdout.write(event.delta);  // Stream thinking content
      break;
    case 'thinking_end':
      console.log('\n[Thinking complete]');
      break;
  }
}
```

## 停止原因

每条 `AssistantMessage` 都包含一个 `stopReason` 字段，表明生成如何结束：

- `"pending"` - 仅出现在部分消息中，当我们还不知道 stop reason 会是什么时
- `"stop"` - 这是 Model 在本轮将产生的最终消息
- `"length"` - 输出达到最大 token 限制
- `"toolUse"` - Model 正在调用工具，并期望工具结果
- `"error"` - 生成过程中发生错误
- `"aborted"` - 请求通过 abort signal 被取消

`AssistantMessage` 也可能包含 `responseId`，这是底层 API 暴露时的 Provider 特定上游响应或消息标识符。不要假定它在所有 Provider 上都始终存在。

## 错误处理

流返回之后的请求失败从不会 throw：当请求以错误结束（包括中止和工具调用校验错误）时，流式 API 会发出 error 事件，最终消息携带细节。准备失败可能在没有 `start` 的情况下发出 `error`；生成开始后的失败会发出 `start`、任何已观察到的 update，然后是 `error`。当请求鉴权缺失时，直接的 API `streamSimple()` 调用会同步抛出：

```typescript
// In streaming
for await (const event of s) {
  if (event.type === 'error') {
    // event.reason is either "error" or "aborted"
    // event.error is the AssistantMessage with partial content
    console.error(`Error (${event.reason}):`, event.error.errorMessage);
    console.log('Partial content:', event.error.content);
  }
}

// The final message will have the error details
const message = await s.result();
if (message.stopReason === 'error' || message.stopReason === 'aborted') {
  console.error('Request failed:', message.errorMessage);
  // message.content contains any partial content received before the error
  // message.usage contains partial token counts and costs
}
```

使用 Provider 集合时，鉴权失败（OAuth 刷新失败、未知 Provider）会以带有 `stopReason: "error"` 的流错误出现。直接的 API `streamSimple()` 调用在缺少所需鉴权时则改为同步抛出。

### 中止请求

abort signal 允许你取消进行中的请求。被中止的请求具有 `stopReason === 'aborted'`：

```typescript
const controller = new AbortController();

// Abort after 2 seconds
setTimeout(() => controller.abort(), 2000);

const s = models.stream(model, {
  messages: [{ role: 'user', content: 'Write a long story', timestamp: Date.now() }]
}, {
  signal: controller.signal
});

for await (const event of s) {
  if (event.type === 'text_delta') {
    process.stdout.write(event.delta);
  } else if (event.type === 'error') {
    // event.reason tells you if it was "error" or "aborted"
    console.log(`${event.reason === 'aborted' ? 'Aborted' : 'Error'}:`, event.error.errorMessage);
  }
}

// Get results (may be partial if aborted)
const response = await s.result();
if (response.stopReason === 'aborted') {
  console.log('Request was aborted:', response.errorMessage);
  console.log('Partial content received:', response.content);
  console.log('Tokens used:', response.usage);
}
```

### 中止后继续

被中止的消息可以加入对话上下文，并在后续请求中继续：

```typescript
const context = {
  messages: [
    { role: 'user', content: 'Explain quantum computing in detail', timestamp: Date.now() }
  ]
};

// First request gets aborted after 2 seconds
const controller1 = new AbortController();
setTimeout(() => controller1.abort(), 2000);

const partial = await models.complete(model, context, { signal: controller1.signal });

// Add the partial response to context
context.messages.push(partial);
context.messages.push({ role: 'user', content: 'Please continue', timestamp: Date.now() });

// Continue the conversation
const continuation = await models.complete(model, context);
```

### 调试 Provider 载荷

使用 `onPayload` 回调检查发送给 Provider 的请求载荷。这对调试请求格式问题或 Provider 校验错误很有用。

```typescript
const response = await models.complete(model, context, {
  onPayload: (payload) => {
    console.log('Provider payload:', JSON.stringify(payload, null, 2));
  }
});
```

`stream`、`complete`、`streamSimple` 和 `completeSimple` 都支持该回调。

## 自定义 Provider

### createProvider()

`createProvider()` 从部件构建 Provider：身份、鉴权、Model 列表和 API 实现。用于本地推理服务器、代理，或任何 OpenAI/Anthropic 兼容端点：

```typescript
import { createModels, createProvider, envApiKeyAuth, type Model } from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';

const ollamaModel: Model<'openai-completions'> = {
  id: 'llama-3.1-8b',
  name: 'Llama 3.1 8B (Ollama)',
  api: 'openai-completions',
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000
};

const ollama = createProvider({
  id: 'ollama',
  name: 'Ollama',
  baseUrl: 'http://localhost:11434/v1',
  // Every provider declares auth; keyless local servers resolve as configured with no key.
  auth: { apiKey: { name: 'Ollama', resolve: async () => ({ auth: {} }) } },
  models: [ollamaModel],
  api: openAICompletionsApi(),
});

const models = createModels();
models.setProvider(ollama);

await models.complete(models.getModel('ollama', 'llama-3.1-8b')!, context);
```

对于带真实 key 的 Provider，`envApiKeyAuth(displayName, envVars)` 给出标准行为（已存储凭证优先，然后是第一个已设置的环境变量）：

```typescript
const proxy = createProvider({
  id: 'my-proxy',
  auth: { apiKey: envApiKeyAuth('My proxy API key', ['MY_PROXY_API_KEY']) },
  models: [/* ... */],
  api: openAICompletionsApi(),
});
```

混合 API 的 Provider 传入以 `model.api` 为键的 map；每个 Model 分发到其 API 的实现：

```typescript
import { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy';
import { openAIResponsesApi } from '@earendil-works/pi-ai/api/openai-responses.lazy';

const gateway = createProvider({
  id: 'my-gateway',
  auth: { apiKey: envApiKeyAuth('Gateway key', ['GATEWAY_API_KEY']) },
  models: [/* models with api: 'anthropic-messages' or 'openai-responses' */],
  api: {
    'anthropic-messages': anthropicMessagesApi(),
    'openai-responses': openAIResponsesApi(),
  },
});
```

Provider 范围的端点或请求变换属于 Provider 的 API 实现：包装你作为 `api` 传入的 `ProviderStreams`，使每个请求在分发前都经过该变换。Cloudflare Provider 就是这样做的，以便从已解析的 Provider env 物化 account/gateway 端点占位符：

```typescript
function tenantStreams(streams: ProviderStreams): ProviderStreams {
  const withTenant = (model: Model<Api>) => ({ ...model, baseUrl: model.baseUrl.replace('{tenant}', tenantId) });
  return {
    stream: (model, context, options) => streams.stream(withTenant(model), context, options),
    streamSimple: (model, context, options) => streams.streamSimple(withTenant(model), context, options),
  };
}

const tenantGateway = createProvider({
  id: 'tenant-gateway',
  auth: { apiKey: envApiKeyAuth('Gateway key', ['GATEWAY_API_KEY']) },
  models: [/* ... */],
  api: tenantStreams(openAICompletionsApi()),
});
```

动态 Model 列表使用 `fetchModels`。`Models.refresh()` 刷新每一个已配置的动态 Provider，并传入其有效的 API-key 或已刷新的 OAuth 凭证。`ModelsStore` 持久化动态目录；两个 store 默认都是内存实现。其 `read`、`write` 和 `delete` 操作接受可选取消，`Models` 把这些等待绑定到 Provider 的 refresh signal。

```typescript
const models = createModels({ credentials, modelsStore });
const llamacpp = createProvider({
  id: 'llamacpp',
  auth: { apiKey: { name: 'llama.cpp', resolve: async () => ({ auth: {} }) } },
  models: [],
  fetchModels: async ({ signal }) => fetchModelsFromServer('http://localhost:8080', signal),
  api: openAICompletionsApi(),
});

models.setProvider(llamacpp);
const result = await models.refresh({ signal });
if (result.aborted) console.log('refresh cancelled');
for (const [provider, error] of result.errors) console.error(provider, error);
```

省略可选 signal 时，`Models.refresh()` 是无界的。Provider 始终收到具体的 `RefreshModelsContext.signal`，并且必须在网络请求和其他阻塞工作中遵守它。当调用方提供 signal 时，即使自定义 Provider 不配合，`Models.refresh()` 也会在取消后立即返回 `aborted: true`；Provider 仍必须遵守该 signal 以停止其底层工作。

使用 `models.refresh({ providers: ['openrouter'] })` 将工作限制到选定的 Provider，使用 `models.refresh({ allowNetwork: false })` 在不访问网络的情况下恢复已持久化的目录，或使用 `models.refresh({ force: true })` 绕过 Provider 新鲜度检查。Model 读取保持同步，返回最近一次恢复或刷新的列表。

`createProvider()` 会自动处理动态发布与持久化。手写的 `Provider.refreshModels()` 实现会收到只读的 `context.stored` 快照，并通过 `context.publish({ persist?, update? })` 发布。省略 `persist` 以保持存储不变，传入 `ModelsStoreEntry` 以写入，或传入 `persist: null` 以删除。发布会做 generation 检查；把同步的内存目录变更放在 `update` 中，而不是在发布前变更状态。

自定义 Model 可以携带 `headers`（例如位于机器人检测之后的代理）和 `compat` 标志。`Models.getAuth(model)` 包含这些 Model header，流式方法在显式请求 header 和 `transformHeaders` 之前合并它们。见 [OpenAI 兼容性设置](#openai-兼容性设置)。

一些 OpenAI 兼容服务器不理解用于具备 reasoning 能力的 Model 的 `developer` 角色。对这些 Provider，将 `compat.supportsDeveloperRole` 设为 `false`，以便系统提示作为 `system` 消息发送。如果服务器也不支持 `reasoning_effort`，也将 `compat.supportsReasoningEffort` 设为 `false`。这通常适用于 Ollama、vLLM、SGLang 以及类似的 OpenAI 兼容服务器。

使用 Model 级的 `thinkingLevelMap` 描述 Model 特定的 thinking 控制。键是 pi 的 thinking 级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`）。直到 `high` 的缺失标准级别使用 Provider 默认值；`xhigh` 和 `max` 需显式选择，并要求非 null 的 map 条目。字符串值会发送给 Provider，`null` 标记该级别不受支持，map 可以跳过某些级别。

```typescript
const ollamaReasoningModel: Model<'openai-completions'> = {
  id: 'gpt-oss:20b',
  name: 'GPT-OSS 20B (Ollama)',
  api: 'openai-completions',
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  reasoning: true,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 131072,
  maxTokens: 32000,
  thinkingLevelMap: {
    minimal: null,
    low: null,
    medium: null,
    high: 'high',
    xhigh: null,
  },
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  }
};
```

### 直接调用 API 实现

API 实现可以单独导入。每个模块恰好导出带有该 API 完整选项类型的 `stream` 和 `streamSimple`。直接调用会绕过 Provider 鉴权——请显式传入 `apiKey`：

```typescript
import { stream } from '@earendil-works/pi-ai/api/anthropic-messages';

const s = stream(claudeModel, context, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  thinkingEnabled: true,
  thinkingBudgetTokens: 2048,
});
```

内置 API 实现位于 `./api/<api-id>`：

| API id | 选项类型 |
|--------|--------------|
| `anthropic-messages` | `AnthropicOptions` |
| `openai-completions` | `OpenAICompletionsOptions` |
| `openai-responses` | `OpenAIResponsesOptions` |
| `openai-codex-responses` | `OpenAICodexResponsesOptions` |
| `azure-openai-responses` | `AzureOpenAIResponsesOptions` |
| `google-generative-ai` | `GoogleOptions` |
| `google-vertex` | `GoogleVertexOptions` |
| `mistral-conversations` | `MistralOptions` |
| `bedrock-converse-stream` | `BedrockOptions` |

导入实现模块会加载其 SDK。`./api/<id>.lazy` 包装器（由 Provider factory 使用）在运行时或打包器支持动态 import chunking 时，将该加载推迟到首次请求。旧版本的遗留原始 API 子路径（`./anthropic`、`./google`、`./mistral`、`./openai-completions` 等）已被移除；请使用 `@earendil-works/pi-ai/api/<api-id>`。

### OpenAI 兼容性设置

`openai-completions` API 被许多 Provider 以细微差异实现。默认情况下，本库会根据 `baseUrl` 为一小组已知的 OpenAI 兼容 Provider（Cerebras、xAI、Chutes、DeepSeek、NVIDIA NIM、Together AI、zAi、OpenCode、Cloudflare Workers AI 等）自动检测兼容性设置。对于自定义代理或未知端点，你可以通过 `compat` 字段覆盖这些设置。对于 `openai-responses` Model，compat 字段支持 Responses 特定标志。

```typescript
interface OpenAICompletionsCompat {
  supportsStore?: boolean;           // Whether provider supports the `store` field (default: true)
  supportsDeveloperRole?: boolean;   // Whether provider supports `developer` role vs `system` (default: true)
  supportsReasoningEffort?: boolean; // Whether provider supports `reasoning_effort` (default: true)
  supportsUsageInStreaming?: boolean; // Whether provider supports `stream_options: { include_usage: true }` (default: true)
  supportsStrictMode?: boolean;      // Whether provider supports `strict` in tool definitions (default: true)
  supportsOpenAIGrammarTools?: boolean; // Whether to emit OpenAI custom Lark/regex grammar tools; false falls back to normal function tools (default: false; the generated catalog enables it for capable models)
  sendSessionAffinityHeaders?: boolean; // Send session-affinity data from `sessionId` (default: true for OpenRouter, false otherwise)
  sessionAffinityFormat?: 'openai' | 'openai-nosession' | 'openrouter'; // Format for session affinity: 'openai' uses `prompt_cache_key`, `session_id`, `x-client-request-id`, and `x-session-affinity`; 'openai-nosession' uses `prompt_cache_key`, `x-client-request-id`, and `x-session-affinity`; 'openrouter' uses `x-session-id` (default: auto-detected)
  maxTokensField?: 'max_completion_tokens' | 'max_tokens';  // Which field name to use (default: max_completion_tokens)
  requiresToolResultName?: boolean;  // Whether tool results require the `name` field (default: false)
  requiresAssistantAfterToolResult?: boolean; // Whether tool results must be followed by an assistant message (default: false)
  requiresThinkingAsText?: boolean;  // Whether thinking blocks must be converted to text (default: false)
  requiresReasoningContentOnAssistantMessages?: boolean; // Whether all replayed assistant messages must include empty reasoning_content when reasoning is enabled (default: auto-detected for DeepSeek)
  thinkingFormat?: 'openai' | 'openrouter' | 'deepseek' | 'together' | 'baseten' | 'zai' | 'qwen' | 'chat-template' | 'qwen-chat-template' | 'string-thinking' | 'ant-ling'; // Format for reasoning param: 'openai' uses reasoning_effort, 'openrouter' uses reasoning: { effort }, 'deepseek' uses thinking: { type } plus reasoning_effort when supported, 'together' uses reasoning: { enabled } plus reasoning_effort when supported, 'baseten' uses configurable chat_template_args plus reasoning_effort when supported, 'zai' uses thinking: { type }, 'qwen' uses enable_thinking, 'chat-template' uses configurable chat_template_kwargs, 'qwen-chat-template' uses chat_template_kwargs.enable_thinking and preserve_thinking, 'string-thinking' uses top-level thinking, 'ant-ling' uses reasoning: { effort } only for mapped efforts (default: openai)
  chatTemplateKwargs?: Record<string, string | number | boolean | null | { '$var': 'thinking.enabled' | 'thinking.effort' | 'thinking.budget'; omitWhenOff?: boolean }>; // chat_template_kwargs values; use $var for pi-controlled thinking values
  chatTemplateArgs?: Record<string, string | number | boolean | null | { '$var': 'thinking.enabled' | 'thinking.effort' | 'thinking.budget'; omitWhenOff?: boolean }>; // chat_template_args values for thinkingFormat: 'baseten'; use $var for pi-controlled thinking values
  thinkingTokenBudgetField?: 'thinking_token_budget' | 'thinking_budget' | 'thinking_budget_tokens'; // Top-level field that caps reasoning tokens from thinkingBudgets (vLLM / Qwen / llama.cpp). Off by default.
  supportsThinkingTokenBudget?: boolean; // Alias for thinkingTokenBudgetField: 'thinking_token_budget' (vLLM). Prefer thinkingTokenBudgetField. Default: false.
  cacheControlFormat?: 'anthropic';  // Anthropic-style cache_control on system prompt, last tool, and last user/assistant text content
  openRouterRouting?: OpenRouterRouting; // OpenRouter routing preferences (default: {})
  vercelGatewayRouting?: VercelGatewayRouting; // Vercel AI Gateway routing preferences (default: {})
}

interface OpenAIResponsesCompat {
  supportsDeveloperRole?: boolean;   // Whether provider supports `developer` role vs `system` (default: true)
  sessionAffinityFormat?: 'openai' | 'openai-nosession' | 'openrouter'; // Session-affinity header format: 'openai' sends `session_id` and `x-client-request-id`; 'openai-nosession' sends `x-client-request-id`; 'openrouter' sends `x-session-id`. Does not affect the `prompt_cache_key` body param (default: auto-detected)
  supportsLongCacheRetention?: boolean; // Whether provider supports `prompt_cache_retention: "24h"` (default: true)
  supportsStrictMode?: boolean;      // Whether provider supports strict JSON-schema function tools (default: false; enabled in metadata for built-in OpenAI models)
  supportsOpenAIGrammarTools?: boolean; // Whether to emit OpenAI custom Lark/regex grammar tools; false falls back to normal function tools (default: false; the generated catalog enables it for capable models)
}
```

当启用 prompt caching 时，OpenRouter 请求会从 `sessionId` 发送 `x-session-id`。除非 `sendSessionAffinityHeaders` 显式为 false，Chat Completions 和 Anthropic Messages 都会自动检测 OpenRouter 端点。在 Anthropic 兼容 Model 上，`sessionAffinityFormat: "openrouter"` 选择 `x-session-id`；未设置时使用现有的 `x-session-affinity` 格式。显式请求 header 优先于生成的 header。

如果未设置 `compat`，本库回退到基于 URL 的检测。如果部分设置了 `compat`，未指定的字段使用检测到的默认值。这对以下情况有用：

- **LiteLLM 代理**：可能不支持 `store` 字段
- **自定义推理服务器**：可能使用非标准字段名
- **自托管端点**：可能有不同的功能支持

## 用于测试的 Faux Provider

`fauxProvider()` 构建一个内存中的 Provider，带有脚本化响应用于测试和演示：

```typescript
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxThinking,
  fauxToolCall,
} from '@earendil-works/pi-ai';

const faux = fauxProvider({
  tokensPerSecond: 50 // optional
});

const models = createModels();
models.setProvider(faux.provider);

const model = faux.getModel();
const context = {
  messages: [{ role: 'user', content: 'Summarize package.json and then call echo', timestamp: Date.now() }]
};

faux.setResponses([
  fauxAssistantMessage([
    fauxThinking('Need to inspect package metadata first.'),
    fauxToolCall('echo', { text: 'package.json' })
  ], { stopReason: 'toolUse' })
]);

const first = await models.complete(model, context, {
  sessionId: 'session-1',
  cacheRetention: 'short'
});
context.messages.push(first);

context.messages.push({
  role: 'toolResult',
  toolCallId: first.content.find((block) => block.type === 'toolCall')!.id,
  toolName: 'echo',
  content: [{ type: 'text', text: 'package.json contents here' }],
  isError: false,
  timestamp: Date.now()
});

faux.setResponses([
  fauxAssistantMessage([
    fauxThinking('Now I can summarize the tool output.'),
    fauxText('Here is the summary.')
  ])
]);

const s = models.stream(model, context);
for await (const event of s) {
  console.log(event.type);
}

// Optional: multiple faux models for model-switching tests
const multiModel = fauxProvider({
  provider: 'faux-multi',
  models: [
    { id: 'faux-fast', reasoning: false },
    { id: 'faux-thinker', reasoning: true }
  ]
});
models.setProvider(multiModel.provider);
const thinker = multiModel.getModel('faux-thinker');

console.log(thinker?.reasoning);
console.log(faux.getPendingResponseCount());
console.log(faux.state.callCount);
```

说明：

- 响应按请求开始顺序从队列中消费。
- 如果队列为空，faux Provider 返回带有 `errorMessage: "No more faux responses queued"` 的 assistant 错误消息。
- 使用 `faux.setResponses([...])` 替换剩余队列，使用 `faux.appendResponses([...])` 追加更多响应。
- `faux.models` 暴露所有 faux Model。`faux.getModel()` 返回第一个，`faux.getModel(id)` 返回指定的一个。
- 使用 `fauxAssistantMessage(...)` 编写脚本化的 assistant 回复。使用 `fauxText(...)`、`fauxThinking(...)` 和 `fauxToolCall(...)` 构建 content block，而无需手动填写底层字段。
- 用量按大约每 4 个字符 1 个 token 估算。当存在 `sessionId` 且 `cacheRetention` 不是 `"none"` 时，会自动模拟 prompt cache 的读和写。
- 工具调用参数通过 `toolcall_delta` chunk 增量流式传输。
- 默认情况下，每个流式 chunk 在各自的 microtask 上发出。设置 `tokensPerSecond` 可按实时节奏投放 chunk。
- 预期用法是每个 handle 一条确定性的脚本化流程。如果需要独立的并发流程，请创建带有不同 `provider` id 的独立 faux Provider。

## 跨 Provider 交接

本库支持在同一对话中在不同 LLM Provider 之间无缝交接。这允许你在对话中途切换 Model，同时保留上下文，包括 thinking block、工具调用和工具结果。

当来自一个 Provider 的消息被发送到另一个 Provider 时，本库会自动转换它们以保持兼容：

- **User 和 tool result 消息**原样传递
- **来自同一 Provider/API 的 assistant 消息**原样保留
- **来自不同 Provider 的 assistant 消息**会将其 thinking block 转换为带 `<thinking>` 标签的文本
- **工具调用和常规文本**原样保留

```typescript
import { createModels, type Context } from '@earendil-works/pi-ai';
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';
import { googleProvider } from '@earendil-works/pi-ai/providers/google';

const models = createModels();
models.setProvider(anthropicProvider());
models.setProvider(openaiProvider());
models.setProvider(googleProvider());

const context: Context = { messages: [] };

// Start with Claude
const claude = models.getModel('anthropic', 'claude-sonnet-4-5')!;
context.messages.push({ role: 'user', content: 'What is 25 * 18?', timestamp: Date.now() });
context.messages.push(await models.completeSimple(claude, context, { reasoning: 'medium' }));

// Switch to GPT-5 - it will see Claude's thinking as <thinking> tagged text
const gpt5 = models.getModel('openai', 'gpt-5-mini')!;
context.messages.push({ role: 'user', content: 'Is that calculation correct?', timestamp: Date.now() });
context.messages.push(await models.complete(gpt5, context));

// Switch to Gemini
const gemini = models.getModel('google', 'gemini-2.5-flash')!;
context.messages.push({ role: 'user', content: 'What was the original question?', timestamp: Date.now() });
const geminiResponse = await models.complete(gemini, context);
```

所有 Provider 都能处理来自其他 Provider 的消息——文本、工具调用和结果（包括图像）、thinking block（转换为带标签的文本），以及带有部分内容的被中止消息。这使灵活工作流成为可能：从快速 Model 开始，切换到更强的 Model 做复杂推理，或在 Provider 中断时保持连续性。

## 上下文序列化

`Context` 对象可以用标准 JSON 方法轻松序列化与反序列化，便于持久化对话、实现聊天历史，或在服务之间转移上下文：

```typescript
const context: Context = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [
    { role: 'user', content: 'What is TypeScript?', timestamp: Date.now() }
  ]
};

const model = models.getModel('openai', 'gpt-4o-mini')!;
const response = await models.complete(model, context);
context.messages.push(response);

// Serialize the entire context
const serialized = JSON.stringify(context);

// Save to database, localStorage, file, etc.
localStorage.setItem('conversation', serialized);

// Later: deserialize and continue the conversation
const restored: Context = JSON.parse(localStorage.getItem('conversation')!);
restored.messages.push({ role: 'user', content: 'Tell me more about its type system', timestamp: Date.now() });

// Continue with any model
const newModel = models.getModel('anthropic', 'claude-3-5-haiku-20241022')!;
const continuation = await models.complete(newModel, restored);
```

Model 也是普通的可序列化数据——不附着函数或实现——因此持久化“这次对话用的是哪个 Model”只需一次 `JSON.stringify`。

> **说明**：如果上下文包含图像（如图像输入一节所示编码为 base64），这些也会被序列化。

## 浏览器用法

本库支持浏览器环境。核心入口和 Provider factory 没有副作用，可以干净地打包。浏览器中没有环境变量，因此请显式传入 API key——或注入 `CredentialStore`（例如基于 localStorage），让 Provider 鉴权从已存储凭证解析：

```typescript
import { createModels } from '@earendil-works/pi-ai';
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic';

const models = createModels();
models.setProvider(anthropicProvider());

const model = models.getModel('anthropic', 'claude-3-5-haiku-20241022')!;
const response = await models.complete(model, {
  messages: [{ role: 'user', content: 'Hello!', timestamp: Date.now() }]
}, {
  apiKey: 'your-api-key'
});
```

> **安全警告**：在前端代码中暴露 API key 是危险的。任何人都可以提取并滥用你的 key。这种方法只应用于内部工具或演示。对于生产应用，请使用后端代理，把 API key 保存在安全处。

浏览器兼容性说明：

- Amazon Bedrock（`bedrock-converse-stream`）在浏览器环境中不受支持。它仍可能出现在 Model 列表中；调用会在运行时失败。
- OAuth 登录流程仅限 Node。它们通过打包器不透明的 import 惰性加载，因此注册具备 OAuth 能力的 Provider 不会把仅限 Node 的代码拉进浏览器包——只有实际登录才会。
- 如果 web 应用需要 Bedrock 或基于 OAuth 的鉴权，请使用服务端代理或后端服务。

## 打包与 Tree Shaking

为获得较小的包，只导入你需要的 Provider：

```typescript
import { createModels } from '@earendil-works/pi-ai';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';

const models = createModels();
models.setProvider(openaiProvider());
```

规则：

- `@earendil-works/pi-ai` 是核心入口，不会导入内置目录、Provider factory 或 SDK 实现。
- `@earendil-works/pi-ai/providers/<provider>` 只导入该 Provider 的目录和惰性 API 包装器。
- `@earendil-works/pi-ai/providers/all` 导入每一个内置 Provider factory 以及所有目录。仅在你需要完整内置集合时使用。
- 配合 code splitting，Provider SDK 留在惰性 chunk 中，并在首次请求时加载。
- 没有 code splitting 时，打包器会把可达的惰性 API 实现折叠进单一包。单 Provider 包随后包含该 Provider 的 SDK；`providers/all` 包含所有静态可见的 SDK。Bedrock 是例外：其 AWS SDK 实现通过打包器不透明的仅限 Node 的 import 加载。
- 直接导入 `@earendil-works/pi-ai/api/<api-id>` 会立即加载该 API 实现及其 SDK。

在新的打包应用中避免 `@earendil-works/pi-ai/compat`；它保留旧的全局 API，并导入完整的内置目录表面。

对于单文件 Node ESM 包，一些 SDK 依赖内部仍可能使用动态的 CommonJS `require()`。如果看到诸如 `Dynamic require of "child_process" is not supported` 的错误，请向包添加 Node `require` shim。使用 esbuild：

```bash
esbuild app.js --bundle --platform=node --format=esm \
  --banner:js='import { createRequire } from "module";const require = createRequire(import.meta.url);' \
  --outfile=app.bundle.js
```

这仅用于 Node 包；不是浏览器或 Cloudflare Workers 的变通办法。

Bedrock 仅限 Node。像其他 Provider 一样添加它：

```typescript
import { createModels } from '@earendil-works/pi-ai';
import { amazonBedrockProvider } from '@earendil-works/pi-ai/providers/amazon-bedrock';

const models = createModels();
models.setProvider(amazonBedrockProvider());
```

在正常的 Node 包用法和 code-split 包中，Bedrock 会惰性加载其 AWS SDK 实现。对于必须包含 Bedrock 支持的独立单文件包，请显式注册实现模块：

```typescript
import { setBedrockProviderModule } from '@earendil-works/pi-ai/api/bedrock-converse-stream.lazy';
import { bedrockProviderModule } from '@earendil-works/pi-ai/bedrock-provider';

setBedrockProviderModule(bedrockProviderModule);
```

该显式覆盖会打包 AWS SDK。没有它时，Bedrock 的不透明运行时 import 期望包的 Bedrock 实现文件在运行时可用。

### Provider 范围的环境覆盖

在流选项中传入 `env`，将 Provider 配置限定到一次请求。`env` 中的值优先于进程环境变量，用于 Provider 鉴权与配置，例如 Cloudflare account ID、Azure OpenAI 设置、Vertex project/location、Bedrock 设置、`PI_CACHE_RETENTION`，以及 `HTTP_PROXY`/`HTTPS_PROXY`。

```typescript
const models = builtinModels();
const model = models.getModel('cloudflare-ai-gateway', 'workers-ai/@cf/moonshotai/kimi-k2.6')!;

const response = await models.complete(model, context, {
  env: {
    CLOUDFLARE_API_KEY: '...',
    CLOUDFLARE_ACCOUNT_ID: 'account-id',
    CLOUDFLARE_GATEWAY_ID: 'gateway-id'
  }
});
```

当一个进程需要对每次请求使用不同的 Provider 设置，或环境变量不应泄漏进 Provider 调用时，使用此方式。

## OAuth Provider

若干 Provider 支持用 OAuth 鉴权，而不是静态 API key：

- **Anthropic**（Claude Pro/Max 订阅）
- **OpenAI Codex**（ChatGPT Plus/Pro 订阅，可访问 GPT-5.x Codex Model）
- **GitHub Copilot**（Copilot 订阅）
- **OpenRouter**（铸造用户可控 API key 的 OAuth PKCE）

这些 Provider 各自在 `provider.auth.oauth` 上携带 `OAuthAuth`，包含三个操作：`login(interaction)` 使用与 Provider 无关的 `AuthInteraction.prompt()`/`notify()` 协议并返回凭证，`refresh(credential, signal)` 在适用时刷新即将过期的凭证，`toAuth(credential)` 派生请求鉴权（GitHub Copilot 的按账号 base URL 来自这里）。Provider 登录交互和刷新调用始终携带具体的 abort signal。刷新是自动的：`models.getAuth(providerId)` 和请求路径在凭证存储锁下刷新过期 token，因此并发请求和进程不会双重刷新。OpenRouter 的 OAuth 流程改为返回永久 API key，因此其 refresh 操作是空操作。

```typescript
import { createModels } from '@earendil-works/pi-ai';
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic';

const models = createModels({ credentials: myStore }); // persistent CredentialStore
models.setProvider(anthropicProvider());

// Login: Models drives the flow and persists the credential
await models.login('anthropic', 'oauth', {
  prompt: async (p) => {
    // p.type: 'text' | 'secret' | 'select' | 'manual_code'
    // manual_code prompts race a local callback server; p.signal aborts them when the server wins
    return await askUser(p.message);
  },
  notify: (event) => {
    // event.type: 'info' | 'auth_url' | 'device_code' | 'progress'
    if (event.type === 'info') {
      console.log(event.message);
      for (const link of event.links ?? []) console.log(`${link.label ?? 'More information'}: ${link.url}`);
    }
    if (event.type === 'auth_url') console.log(`Open: ${event.url}`);
    if (event.type === 'device_code') console.log(`Code: ${event.userCode} at ${event.verificationUri}`);
    if (event.type === 'progress') console.log(event.message);
  },
});

// From here on, requests resolve and refresh the token automatically
const model = models.getModel('anthropic', 'claude-sonnet-4-5')!;
await models.complete(model, context);

// Logout
await models.logout('anthropic');
```

### Vertex AI

Vertex AI Model 支持 Google Cloud API key 或 Application Default Credentials（ADC）。其 Provider 自有的 API-key 登录流程可以配置任一方法：

- **API key**：设置 `GOOGLE_CLOUD_API_KEY`，或在调用选项中传入 `apiKey`。
- **本地开发（ADC）**：运行 `gcloud auth application-default login`
- **CI/生产（ADC）**：设置 `GOOGLE_APPLICATION_CREDENTIALS` 指向服务账号 JSON key 文件

使用 ADC 时，还要设置 `GOOGLE_CLOUD_PROJECT`（或 `GCLOUD_PROJECT`）和 `GOOGLE_CLOUD_LOCATION`。你也可以在调用选项中传入 `project`/`location`。使用 `GOOGLE_CLOUD_API_KEY` 时，不需要 `project` 和 `location`。

```bash
# Local (uses your user credentials)
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT="my-project"
export GOOGLE_CLOUD_LOCATION="us-central1"

# CI/Production (service account key file)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

官方文档：[Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)

### CLI 登录

最快的鉴权方式：

```bash
npx @earendil-works/pi-ai login              # interactive provider selection
npx @earendil-works/pi-ai login anthropic    # login to specific provider
npx @earendil-works/pi-ai list               # list available providers
```

凭证会保存到当前目录的 `auth.json`。

### 程序化 OAuth

内置的登录与刷新流程是私有的 Provider 实现。使用 Provider 自有的 `OAuthAuth`，它与 `CredentialStore` 组合，并通过 `Models` 获得加锁的自动刷新。`@earendil-works/pi-ai/oauth` 入口只保留 coding-agent 扩展 OAuth 兼容性所需的类型声明。

Provider 说明：

**OpenAI Codex**：需要 ChatGPT Plus 或 Pro 订阅。提供对 GPT-5.x Codex Model 的访问，带有扩展的上下文窗口和 reasoning 能力。除非 `cacheRetention` 为 `"none"`，当流选项中提供了 `sessionId` 时，本库会自动处理基于会话的 prompt caching。你可以在流选项中将 `transport` 设为 `"sse"`、`"websocket"` 或 `"auto"`，以选择 Codex Responses 传输。当使用 WebSocket 且带有 `sessionId` 并启用了 cache retention 时，连接按会话复用，并在 5 分钟无活动后过期。完成后调用 `cleanupSessionResources(sessionId)`，以免池化连接让进程保持存活。

**Azure OpenAI (Responses)**：仅使用 Responses API。设置 `AZURE_OPENAI_API_KEY`，以及 `AZURE_OPENAI_BASE_URL` 或 `AZURE_OPENAI_RESOURCE_NAME`。`AZURE_OPENAI_BASE_URL` 同时支持 `https://<resource>.openai.azure.com` 和 `https://<resource>.cognitiveservices.azure.com`；根端点会自动规范化为 `.../openai/v1`。如需覆盖 API 版本，使用 `AZURE_OPENAI_API_VERSION`（默认为 `v1`）。默认将 deployment 名称当作 Model ID；用 `azureDeploymentName` 或 `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` 覆盖，格式为逗号分隔的 `model-id=deployment` 对（例如 `gpt-4o-mini=my-deployment,gpt-4o=prod`）。有意不支持旧的基于 deployment 的 URL。

**GitHub Copilot**：如果出现 "The requested model is not supported" 错误，请在 VS Code 中手动启用该 Model：打开 Copilot Chat，点击 Model 选择器，选择该 Model（警告图标），然后点击 "Enable"。

## 从旧的全局 API 迁移

旧版本暴露了一个全局 API：通过全局注册表按 `model.api` 分发的 `stream()`/`complete()`、同步的 `getModel()`/`getModels()`/`getProviders()` 目录读取、`registerApiProvider()`、`getEnvApiKey()`，以及按 API 的惰性流函数。该表面原样保留在 **compat 入口** 上：

```typescript
// Before
import { getModel, complete } from '@earendil-works/pi-ai';

// After (verbatim behavior, one import-path change)
import { getModel, complete } from '@earendil-works/pi-ai/compat';
```

Compat 是根入口的严格超集，因此一个文件可以整份切换其导入路径。它将在未来版本中移除；请迁移到 `createModels()` + Provider factory：

| 旧 | 新 |
|-----|-----|
| `getModel('openai', 'gpt-4o-mini')` | `models.getModel('openai', 'gpt-4o-mini')` or `getBuiltinModel()` from `providers/all` |
| `getModels('anthropic')` / `getProviders()` | `models.getModels('anthropic')` / `models.getProviders()` or `getBuiltin*` |
| `stream(model, ctx, opts)` (env-key injection) | `models.stream(model, ctx, opts)` (provider auth resolution) |
| `registerApiProvider({ api, stream, streamSimple })` | `createProvider({ id, auth, models, api })` + `models.setProvider()` |
| `getEnvApiKey('openai')` | `await models.getAuth(model.provider)` |
| `streamAnthropic(model, ctx, opts)` | `stream` from `@earendil-works/pi-ai/api/anthropic-messages`, or a provider in a collection |
| `registerFauxProvider()` | `fauxProvider()` + `models.setProvider()` |

## 开发

### 添加新的 Provider

添加新的 LLM Provider 需要改动多个文件。分层布局：API 实现位于 `src/api/`，Provider factory 位于 `src/providers/`，稳定的生成目录包装器位于 `src/providers/<id>.models.ts`，`src/models.generated.ts` 注册它们。此清单覆盖所有必要步骤：

#### 1. 核心类型（`src/types.ts`）

- 如果是新 API，将 API 标识符加入 `KnownApi`（例如 `"bedrock-converse-stream"`）
- 将 Provider 名称加入 `KnownProvider`（例如 `"amazon-bedrock"`）
- 将选项类型加入 `ApiOptionsMap`

#### 2. API 实现（`src/api/<api-id>.ts`，仅当是新 API 时）

创建一个新的 API 实现文件（例如 `bedrock-converse-stream.ts`），恰好导出 `stream` 和 `streamSimple`，外加：

- 扩展 `StreamOptions` 的选项接口（例如 `BedrockOptions`）
- 将 `Context` 转换为 Provider 格式的消息转换函数
- 如果 Provider 支持工具，则做工具转换
- 响应解析，以发出标准化事件（`text`、`tool_call`、`thinking`、`usage`、`stop`）

添加惰性包装器 `src/api/<api-id>.lazy.ts`（通过 `lazyApi()` 得到 `<name>Api()`），以便 Provider 可以引用该实现而不导入其 SDK。在 `src/index.ts` 中添加任何应从 `@earendil-works/pi-ai` 保持可用的根级 `export type` 再导出。

#### 3. Model 生成（`scripts/generate-models.ts`、`scripts/generate-image-models.ts`）

- 添加从 Provider 源（例如 models.dev API）拉取并解析 Model 的逻辑
- 通过 `scripts/generate-models.ts` 将具备聊天/工具能力的 Provider Model 数据映射到标准化的 `Model` 接口；hydration 按 API 分组被忽略的 `src/providers/data/<id>.json` 值，而稳定的 `src/providers/<id>.models.ts` 包装器直接从这些 JSON key 派生精确的 Model/API 类型
- 通过 `scripts/generate-image-models.ts` 将图像生成 Provider 的 Model 数据映射到标准化的 `ImagesModel` 接口
- 处理 Provider 特定的差异（定价格式、能力标志、Model ID 变换）

#### 4. Provider Factory（`src/providers/<id>.ts`）

- 用 `createProvider()` 连接目录 + 鉴权 + 惰性 API 包装器
- 鉴权：标准 key Provider 使用 `envApiKeyAuth`，环境鉴权（AWS profile、ADC）使用自定义 `ApiKeyAuth`，存在 OAuth 流程时使用 `lazyOAuth`
- 在 `src/providers/all.ts` 中注册该 factory
- 如果是新 API：在 `src/compat.ts` 的内置列表中注册它，并在 `package.json` 中添加包的子路径导出

#### 5. 测试（`test/`）

创建或更新测试文件以覆盖新 Provider：

- `stream.test.ts` - 基础流式与工具使用
- `tokens.test.ts` - Token 用量报告
- `abort.test.ts` - 请求取消
- `empty.test.ts` - 空消息处理
- `context-overflow.test.ts` - 上下文超限错误
- `image-limits.test.ts` - 图像支持（如适用）
- `unicode-surrogate.test.ts` - Unicode 处理
- `tool-call-without-result.test.ts` - 孤立的工具调用
- `image-tool-result.test.ts` - 工具结果中的图像
- `total-tokens.test.ts` - Token 计数准确性
- `cross-provider-handoff.test.ts` - 跨 Provider 上下文回放
- `providers.test.ts` - Provider 列表与鉴权解析

对于 `cross-provider-handoff.test.ts`，至少添加一对 Provider/Model。如果 Provider 暴露多个 Model 家族（例如 GPT 和 Claude），每个家族至少添加一对。

对于非标准鉴权的 Provider（AWS、Google Vertex），创建类似 `bedrock-utils.ts` 的工具，带有凭证检测辅助函数。

#### 6. Coding Agent 集成（`../coding-agent/`）

更新 `src/core/model-resolver.ts`：

- 在 `DEFAULT_MODELS` 中为该 Provider 添加默认 Model ID

更新 `src/cli/args.ts`：

- 在帮助文本中添加环境变量文档

更新 `README.md`：

- 将该 Provider 加入 Provider 部分，并附带设置说明

#### 7. 文档

更新 `packages/ai/README.md`：

- 加入支持的 Provider 表
- 记录任何 Provider 特定选项或鉴权要求
- 将环境变量加入环境变量一节

#### 8. Changelog

在 `packages/ai/CHANGELOG.md` 的 `## [Unreleased]` 下添加条目：

```markdown
### Added
- Added support for [Provider Name] provider ([#PR](link) by [@author](link))
```

## 许可证

MIT
