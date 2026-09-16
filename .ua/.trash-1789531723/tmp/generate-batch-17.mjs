import fs from "node:fs";

const UA_DIR = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua";
const extract = JSON.parse(fs.readFileSync(`${UA_DIR}/tmp/ua-file-extract-results-17.json`, "utf8"));
const brief = JSON.parse(fs.readFileSync(`${UA_DIR}/intermediate/batch-briefs/batch-17.json`, "utf8"));

const FILE_META = {
	"packages/ai/src/api/anthropic-messages.ts": {
		summary:
			"Anthropic Messages API 适配器：将内部对话转为 Claude 请求，解析 SSE，并处理工具调用、thinking、prompt cache 与 OAuth/Claude Code 兼容。",
		tags: ["api-handler", "provider", "streaming", "anthropic"],
		complexity: "complex",
		languageNotes: "自实现 SSE 行解码，避免依赖外部 event-source 库；OAuth 路径会改写工具名与 beta 头。",
	},
	"packages/ai/src/api/azure-openai-responses.ts": {
		summary:
			"Azure OpenAI Responses API 适配器：解析部署名与资源 URL，再复用 openai-responses-shared 处理流式输出。",
		tags: ["api-handler", "provider", "azure", "streaming"],
		complexity: "moderate",
	},
	"packages/ai/src/api/bedrock-converse-stream.ts": {
		summary:
			"AWS Bedrock Converse Stream 适配器：处理凭证/代理/区域、Claude 缓存与 thinking，并把内容块增量映射为内部事件。",
		tags: ["api-handler", "provider", "bedrock", "streaming"],
		complexity: "complex",
		languageNotes: "通过 Smithy middleware 注入自定义头并观察 HTTP 响应，而不是改 SDK 客户端构造参数。",
	},
	"packages/ai/src/api/cloudflare-ai-binding.ts": {
		summary:
			"把 Cloudflare Workers AI binding 的 fetch 包装成普通 FetchFunction，并用鉴权哨兵满足网关预认证请求。",
		tags: ["utility", "cloudflare", "fetch", "workers"],
		complexity: "simple",
		languageNotes: "AiBinding 用结构类型描述 env.AI，避免依赖尚未声明 fetch 的 @cloudflare/workers-types。",
	},
	"packages/ai/src/api/constrained-sampling.ts": {
		summary:
			"把工具 JSON Schema 收成供应商可接受的 strict 子集，并生成 grammar 约束采样所需的 input 属性与增量缓冲。",
		tags: ["validation", "serialization", "tools", "schema"],
		complexity: "moderate",
	},
	"packages/ai/src/api/github-copilot-headers.ts": {
		summary: "根据消息角色与是否含图，生成 GitHub Copilot 所需的 X-Initiator 与 Copilot-Vision-Request 头。",
		tags: ["utility", "headers", "copilot", "github"],
		complexity: "simple",
	},
	"packages/ai/src/api/google-generative-ai.ts": {
		summary:
			"Google Generative Language API 流式适配：构造客户端与请求，并按 Gemma/Gemini 型号映射 thinking 预算。",
		tags: ["api-handler", "provider", "google", "streaming"],
		complexity: "complex",
	},
	"packages/ai/src/api/google-shared.ts": {
		summary:
			"Google Generative AI 与 Vertex 共用层：消息/工具转换、thought signature、function calling 模式与重试。",
		tags: ["utility", "google", "serialization", "retry"],
		complexity: "complex",
	},
	"packages/ai/src/api/google-vertex.ts": {
		summary:
			"Google Vertex AI 适配器：解析项目/区域与 ADC 或 API key，复用 google-shared 做消息转换与流式解析。",
		tags: ["api-handler", "provider", "vertex", "streaming"],
		complexity: "complex",
	},
	"packages/ai/src/api/mistral-conversations.ts": {
		summary:
			"Mistral Chat/Conversations 流式适配：规范化工具调用 ID、组装 wire payload，并解析缓存 token 与 stop reason。",
		tags: ["api-handler", "provider", "mistral", "streaming"],
		complexity: "complex",
	},
	"packages/ai/src/api/openai-codex-responses.ts": {
		summary:
			"OpenAI Codex Responses 适配器：支持 SSE 与可复用 WebSocket 会话、zstd 压缩、重试与 service tier 计价。",
		tags: ["api-handler", "provider", "openai", "websocket"],
		complexity: "complex",
		languageNotes: "WebSocket 会话按 input 增量复用，连接超限或 previous_response 丢失时回退 SSE。",
	},
	"packages/ai/src/api/openai-completions.ts": {
		summary:
			"OpenAI Chat Completions 兼容层：检测多供应商 compat、注入 Anthropic 式 cache_control，并解析 reasoning details。",
		tags: ["api-handler", "provider", "openai", "streaming"],
		complexity: "complex",
		languageNotes: "detectCompat 用模型 id/baseUrl 区分 OpenAI、Claude、DeepSeek 等 Completions 方言。",
	},
	"packages/ai/src/api/openai-prompt-cache.ts": {
		summary: "将 OpenAI prompt cache key 截断到 64 个字符，避免超长 key 被接口拒绝。",
		tags: ["utility", "openai", "cache", "validation"],
		complexity: "simple",
	},
	"packages/ai/src/api/openai-responses-shared.ts": {
		summary:
			"OpenAI Responses API 共用实现：转换消息与工具，并把 Responses SSE 事件折叠为内部 AssistantMessage 流。",
		tags: ["serialization", "streaming", "openai", "utility"],
		complexity: "complex",
	},
	"packages/ai/src/api/openai-responses.ts": {
		summary:
			"OpenAI Responses API 适配器：创建客户端、处理 prompt cache 兼容与 grammar 工具，并委托 shared 解析流。",
		tags: ["api-handler", "provider", "openai", "streaming"],
		complexity: "moderate",
	},
	"packages/ai/src/api/openrouter-images.lazy.ts": {
		summary: "惰性加载 OpenRouter 图像生成实现，返回 ProviderImages 以免静态拉入完整适配器。",
		tags: ["barrel", "lazy-load", "images", "openrouter"],
		complexity: "simple",
		languageNotes: "动态 import() 推迟加载 openrouter-images.ts，降低非图像路径的打包体积。",
	},
	"packages/ai/src/api/openrouter-images.ts": {
		summary: "OpenRouter 图像生成适配器：构造 chat/completions 图像请求、解析 usage，并走统一重试与错误体。",
		tags: ["api-handler", "images", "openrouter", "provider"],
		complexity: "moderate",
	},
	"packages/ai/src/api/pi-messages.ts": {
		summary: "Pi 自有 Messages 协议客户端：把供应商事件流转成内部格式，并附带响应错误诊断与 rewrite 信息。",
		tags: ["api-handler", "streaming", "diagnostics", "pi"],
		complexity: "complex",
	},
	"packages/ai/src/api/simple-options.ts": {
		summary: "把 SimpleStreamOptions 收成各 API 共用的 StreamOptions，并按 context window 与 thinking budget 夹紧 token。",
		tags: ["utility", "options", "thinking", "token-budget"],
		complexity: "simple",
	},
	"packages/ai/src/api/transform-messages.ts": {
		summary: "统一消息预处理：降级不支持的图片、规范化工具调用 ID，并展开内部内容块供各供应商转换。",
		tags: ["serialization", "messages", "utility", "images"],
		complexity: "moderate",
	},
	"packages/ai/src/env-api-keys.ts": {
		summary: "按供应商从环境变量解析 API key，并检测 Vertex ADC 凭据是否存在（浏览器下惰性跳过 Node fs）。",
		tags: ["utility", "auth", "env", "provider"],
		complexity: "moderate",
		languageNotes: "Node 内置模块用动态 import 加载，避免 Vite/浏览器打包把 fs 打进前端。",
	},
	"packages/ai/src/image-models.ts": {
		summary: "从生成表 IMAGE_MODELS 建立图像模型注册表，并提供按供应商/模型 id 查询的只读 API。",
		tags: ["data-model", "images", "registry", "lookup"],
		complexity: "simple",
	},
	"packages/ai/src/images-api-registry.ts": {
		summary: "图像 API 提供方注册表：按 api 名登记 generateImages，并在调用时校验 model.api 是否匹配。",
		tags: ["registry", "images", "factory", "api-handler"],
		complexity: "simple",
	},
	"packages/ai/src/images.ts": {
		summary: "图像生成公共入口：副作用注册内置提供方后，按 model.api 分发给对应 ImagesApiProvider。",
		tags: ["entry-point", "images", "api-handler", "factory"],
		complexity: "simple",
	},
	"packages/ai/src/legacy-api-aliases.ts": {
		summary: "已废弃的按供应商命名 stream/streamSimple 别名，内部转调各 API 的 lazy 工厂以保持旧导入路径。",
		tags: ["barrel", "deprecated", "api-handler", "compatibility"],
		complexity: "simple",
		languageNotes: "别名全部标记 @deprecated，指向 @earendil-works/pi-ai/api/* 的直接导出。",
	},
};

const FN_SUMMARY = {
	"packages/ai/src/api/anthropic-messages.ts:getCacheControl":
		"按模型与环境解析 Anthropic cache_control（ttl/类型），决定是否给消息打 prompt cache 标记。",
	"packages/ai/src/api/anthropic-messages.ts:convertContentBlocks":
		"把内部内容块转成 Anthropic content 数组，处理文本、图片、thinking 与工具结果。",
	"packages/ai/src/api/anthropic-messages.ts:getAnthropicCompat":
		"根据模型 id/baseUrl 判断是否走 Claude Code 或第三方 Anthropic 兼容端点。",
	"packages/ai/src/api/anthropic-messages.ts:assertRequestAuth":
		"在发出请求前检查 API key 或已识别鉴权头，缺少凭据则抛出明确错误。",
	"packages/ai/src/api/anthropic-messages.ts:flushSseEvent":
		"把已缓冲的 SSE 字段冲刷成事件对象，供后续增量解析。",
	"packages/ai/src/api/anthropic-messages.ts:decodeSseLine":
		"解析单行 SSE（event/data/id），更新解码状态机。",
	"packages/ai/src/api/anthropic-messages.ts:nextLineBreakIndex":
		"在文本中定位下一处 CRLF/LF，供流式按行消费。",
	"packages/ai/src/api/anthropic-messages.ts:consumeLine":
		"从缓冲文本切出一行并交给 decodeSseLine，处理跨 chunk 半行。",
	"packages/ai/src/api/anthropic-messages.ts:stream":
		"向 Anthropic Messages 发起流式请求：组参、重试、解析 SSE，并输出 thinking/工具/用量事件。",
	"packages/ai/src/api/anthropic-messages.ts:mapThinkingLevelToEffort":
		"把内部 ThinkingLevel 映射为 Anthropic output effort 或兼容字段。",
	"packages/ai/src/api/anthropic-messages.ts:streamSimple":
		"用 buildBaseOptions 把 SimpleStreamOptions 收成完整选项后调用 stream。",
	"packages/ai/src/api/anthropic-messages.ts:createClient":
		"构造 Anthropic SDK 客户端，合并 User-Agent、Copilot 动态头与自定义 fetch。",
	"packages/ai/src/api/anthropic-messages.ts:getBetaFeatures":
		"按模型、OAuth 与工具能力收集 anthropic-beta 头（fine-grained streaming、prompt caching 等）。",
	"packages/ai/src/api/anthropic-messages.ts:buildParams":
		"把内部 context 转成 Messages 请求体：系统提示、工具、缓存标记与 deferred tools。",
	"packages/ai/src/api/anthropic-messages.ts:convertToolResult":
		"将 toolResult 消息转成 Anthropic tool_result 块，处理延迟加载与名称规范化。",
	"packages/ai/src/api/anthropic-messages.ts:convertMessages":
		"把变换后的对话转为 Anthropic messages，插入 thinking 签名并处理空 signature。",
	"packages/ai/src/api/anthropic-messages.ts:insertThinkingLevelMessages":
		"在转换后的消息序列中插入当前 effort 对应的 thinking 控制消息。",
	"packages/ai/src/api/anthropic-messages.ts:convertTools":
		"把内部 Tool 列表转为 Anthropic tools，可选 strict schema、eager streaming 与 defer_loading。",
	"packages/ai/src/api/anthropic-messages.ts:mapStopReason":
		"把 Anthropic stop_reason/stop_details 映射为内部 stop 语义。",

	"packages/ai/src/api/azure-openai-responses.ts:parseDeploymentNameMap":
		"解析环境或选项里的 Azure 部署名映射（模型 id → deployment）。",
	"packages/ai/src/api/azure-openai-responses.ts:stream":
		"对 Azure OpenAI Responses 发起流式请求，复用 processResponsesStream 解析事件。",
	"packages/ai/src/api/azure-openai-responses.ts:streamSimple":
		"将 SimpleStreamOptions 转为 Azure 选项后调用 stream。",
	"packages/ai/src/api/azure-openai-responses.ts:normalizeAzureBaseUrl":
		"规范化 Azure 资源 baseUrl（补协议、去尾斜杠、识别 cognitive.microsoft 形态）。",
	"packages/ai/src/api/azure-openai-responses.ts:resolveAzureConfig":
		"从模型与选项解析 resourceName、apiVersion、部署名与最终 baseUrl。",
	"packages/ai/src/api/azure-openai-responses.ts:createClient":
		"创建带 Azure 头与 User-Agent 的 OpenAI SDK 客户端。",
	"packages/ai/src/api/azure-openai-responses.ts:buildParams":
		"组装 Responses 请求体：部署名、消息/工具转换与 grammar 工具属性。",

	"packages/ai/src/api/bedrock-converse-stream.ts:stream":
		"调用 Bedrock ConverseStream：配置客户端/代理，转换消息，并把内容块事件推入内部流。",
	"packages/ai/src/api/bedrock-converse-stream.ts:formatBedrockError":
		"把 Bedrock/SDK 异常规范成可读的供应商错误文本。",
	"packages/ai/src/api/bedrock-converse-stream.ts:appendBedrockFailureDiagnostic":
		"在失败的 assistant 消息上附加 Bedrock 诊断（错误码、request id）。",
	"packages/ai/src/api/bedrock-converse-stream.ts:addCustomHeadersMiddleware":
		"向 Smithy 客户端注册中间件，注入非保留自定义请求头。",
	"packages/ai/src/api/bedrock-converse-stream.ts:addResponseHeadersMiddleware":
		"观察 Bedrock HTTP 响应头并回调 onResponse/onObserved。",
	"packages/ai/src/api/bedrock-converse-stream.ts:streamSimple":
		"夹紧 token/thinking 后把 SimpleStreamOptions 交给 stream。",
	"packages/ai/src/api/bedrock-converse-stream.ts:handleContentBlockStart":
		"处理 contentBlockStart：为文本、工具或 reasoning 块建立流式状态。",
	"packages/ai/src/api/bedrock-converse-stream.ts:handleContentBlockDelta":
		"处理 contentBlockDelta：追加文本/JSON/reasoning，必要时 parseStreamingJson。",
	"packages/ai/src/api/bedrock-converse-stream.ts:handleMetadata":
		"从 metadata 事件提取 usage 并计算费用。",
	"packages/ai/src/api/bedrock-converse-stream.ts:handleContentBlockStop":
		"结束一个内容块，冲刷缓冲并闭合工具参数。",
	"packages/ai/src/api/bedrock-converse-stream.ts:supportsAdaptiveThinking":
		"判断模型是否支持 Bedrock 自适应 thinking。",
	"packages/ai/src/api/bedrock-converse-stream.ts:supportsNativeXhighEffort":
		"判断模型是否原生支持 xhigh effort。",
	"packages/ai/src/api/bedrock-converse-stream.ts:mapThinkingLevelToEffort":
		"把 ThinkingLevel 映射为 Bedrock additionalModelRequestFields 中的 effort。",
	"packages/ai/src/api/bedrock-converse-stream.ts:isAnthropicClaudeModel":
		"根据模型 id/name 判断是否为 Bedrock 上的 Anthropic Claude。",
	"packages/ai/src/api/bedrock-converse-stream.ts:supportsPromptCaching":
		"结合模型与环境判断是否启用 Bedrock prompt cache。",
	"packages/ai/src/api/bedrock-converse-stream.ts:buildSystemPrompt":
		"构造带可选 cachePoint 的 system 数组，并清洗 surrogate。",
	"packages/ai/src/api/bedrock-converse-stream.ts:sanitizeBedrockDocument":
		"清洗文档/JSON 值，去掉 Bedrock 不接受的内容。",
	"packages/ai/src/api/bedrock-converse-stream.ts:convertToolResultContent":
		"把内部工具结果内容转成 Bedrock toolResult content 块。",
	"packages/ai/src/api/bedrock-converse-stream.ts:convertMessages":
		"将内部对话转为 Converse messages，处理图片、工具与 Claude 缓存点。",
	"packages/ai/src/api/bedrock-converse-stream.ts:convertToolConfig":
		"把 Tool 列表与 toolChoice 转为 Bedrock toolConfig，可选 strict schema。",
	"packages/ai/src/api/bedrock-converse-stream.ts:mapStopReason":
		"把 Bedrock stopReason 映射为内部 stop 语义。",
	"packages/ai/src/api/bedrock-converse-stream.ts:getConfiguredBedrockCredentials":
		"从 ProviderEnv 读取显式 AWS 访问密钥与 session token。",
	"packages/ai/src/api/bedrock-converse-stream.ts:getStandardBedrockEndpointRegion":
		"从自定义 baseUrl 解析标准 Bedrock 端点区域。",
	"packages/ai/src/api/bedrock-converse-stream.ts:shouldUseExplicitBedrockEndpoint":
		"判断是否必须设置显式 endpoint（自定义 URL、区域或 profile）。",
	"packages/ai/src/api/bedrock-converse-stream.ts:buildAdditionalModelRequestFields":
		"组装 thinking/effort 等 additionalModelRequestFields。",
	"packages/ai/src/api/bedrock-converse-stream.ts:createImageBlock":
		"把 mime+base64 转成 Bedrock image 内容块。",
	"packages/ai/src/api/bedrock-converse-stream.ts:bytesToBase64":
		"把 Uint8Array 分片拼接为 base64 字符串。",

	"packages/ai/src/api/cloudflare-ai-binding.ts:createAiBindingFetch":
		"校验 binding.fetch 存在后绑定为 FetchFunction，请求原样穿过 AI Gateway binding。",

	"packages/ai/src/api/constrained-sampling.ts:isStructuredSchema":
		"判断 schema 是否为 object/array 或带 properties/items 的结构化节点。",
	"packages/ai/src/api/constrained-sampling.ts:makeJsonSchemaNodeStrict":
		"就地收紧 JSON Schema 节点：禁用不支持关键字，补 required 与 additionalProperties:false。",
	"packages/ai/src/api/constrained-sampling.ts:makeStrictJsonSchema":
		"克隆工具 parameters 并转为供应商 constrained sampling 所需的 strict object schema。",
	"packages/ai/src/api/constrained-sampling.ts:getJsonSchemaToolParameters":
		"按 strict 标志返回原始或收紧后的工具 parameters。",
	"packages/ai/src/api/constrained-sampling.ts:getGrammarToolInput":
		"从工具 arguments 取出 grammar 绑定的 input 属性字符串。",
	"packages/ai/src/api/constrained-sampling.ts:appendGrammarToolInputJsonDelta":
		"把 grammar 工具的增量 input 包成 JSON 字段 delta，维护开关缓冲。",
	"packages/ai/src/api/constrained-sampling.ts:inferGrammarInputProperty":
		"从工具 schema 推断应作为 grammar 输入的属性名。",
	"packages/ai/src/api/constrained-sampling.ts:resolveJsonSchemaStrictSampling":
		"在供应商支持时为工具启用 strict JSON Schema 采样。",
	"packages/ai/src/api/constrained-sampling.ts:resolveGrammarConstrainedSampling":
		"在支持 OpenAI grammar tools 时解析 lark/regex 约束定义。",
	"packages/ai/src/api/constrained-sampling.ts:createGrammarToolInputProperties":
		"为工具列表生成 grammar input 属性映射，供请求体与流解析共用。",

	"packages/ai/src/api/github-copilot-headers.ts:inferCopilotInitiator":
		"根据最后一条消息角色判断 X-Initiator 是 user 还是 agent。",
	"packages/ai/src/api/github-copilot-headers.ts:hasCopilotVisionInput":
		"扫描 user/toolResult 内容是否包含 image 块。",
	"packages/ai/src/api/github-copilot-headers.ts:buildCopilotDynamicHeaders":
		"组装 X-Initiator、Openai-Intent 以及可选 Copilot-Vision-Request。",

	"packages/ai/src/api/google-generative-ai.ts:stream":
		"调用 Google Generative Language 流式接口，解析 candidates/thought 并映射 stop reason。",
	"packages/ai/src/api/google-generative-ai.ts:streamSimple":
		"夹紧 thinking level 后把 SimpleStreamOptions 交给 stream。",
	"packages/ai/src/api/google-generative-ai.ts:createClient":
		"用 API key、供应商头与 User-Agent 创建 GoogleGenAI 客户端。",
	"packages/ai/src/api/google-generative-ai.ts:buildParams":
		"组装 generateContent 参数：消息、工具、thinking config 与 function calling 模式。",
	"packages/ai/src/api/google-generative-ai.ts:getDisabledThinkingConfig":
		"为需要显式关闭 thinking 的型号返回 disabled thinkingConfig。",
	"packages/ai/src/api/google-generative-ai.ts:getThinkingLevel":
		"把内部 effort 映射为 Gemini thinkingLevel 枚举。",
	"packages/ai/src/api/google-generative-ai.ts:getGoogleBudget":
		"按型号与 ThinkingLevel 计算 thinkingBudget token 数。",

	"packages/ai/src/api/google-shared.ts:resolveGoogleThinkingLevel":
		"把调用方 thinking 选项解析为 Google 可发送的 level。",
	"packages/ai/src/api/google-shared.ts:isThinkingPart":
		"判断 Gemini part 是否为 thought/thinking 片段。",
	"packages/ai/src/api/google-shared.ts:retainThoughtSignature":
		"在后续请求中保留 thought signature，以满足 Gemini 工具回传要求。",
	"packages/ai/src/api/google-shared.ts:requiresToolCallId":
		"判断当前 Gemini 版本是否必须携带 tool call id。",
	"packages/ai/src/api/google-shared.ts:convertMessages":
		"把内部消息转为 Gemini contents，处理多模态 function response 与 signature。",
	"packages/ai/src/api/google-shared.ts:sanitizeForOpenApi":
		"去掉 Google 工具 schema 中 OpenAPI 不接受的字段。",
	"packages/ai/src/api/google-shared.ts:convertTools":
		"把内部 Tool 转为 Gemini functionDeclarations，可选 strict 采样。",
	"packages/ai/src/api/google-shared.ts:supportsGoogleStrictToolSampling":
		"判断模型是否支持 Google strict tool schema。",
	"packages/ai/src/api/google-shared.ts:mapToolChoice":
		"把内部 toolChoice 映射为 Gemini toolConfig。",
	"packages/ai/src/api/google-shared.ts:resolveGoogleFunctionCallingMode":
		"结合 strict 采样决定 AUTO/ANY/NONE 等 function calling 模式。",
	"packages/ai/src/api/google-shared.ts:mapStopReason":
		"把 Gemini finishReason 映射为内部 stop 语义。",
	"packages/ai/src/api/google-shared.ts:mapStopReasonString":
		"把字符串形式的 finishReason 规范化为内部枚举。",
	"packages/ai/src/api/google-shared.ts:retryGoogleRequest":
		"用 retryProviderRequest 包装 Google RPC/HTTP 调用。",

	"packages/ai/src/api/google-vertex.ts:stream":
		"调用 Vertex AI 流式 generateContent，复用 google-shared 解析 thought 与 stop。",
	"packages/ai/src/api/google-vertex.ts:streamSimple":
		"夹紧 thinking 后把 SimpleStreamOptions 交给 Vertex stream。",
	"packages/ai/src/api/google-vertex.ts:createClient":
		"优先 ADC，失败则回退 API key，创建 Vertex GoogleGenAI 客户端。",
	"packages/ai/src/api/google-vertex.ts:createClientWithApiKey":
		"用显式 API key 与 HTTP 选项构造 Vertex 客户端。",
	"packages/ai/src/api/google-vertex.ts:buildHttpOptions":
		"合并自定义头、User-Agent 与 Vertex 基址，生成 SDK httpOptions。",
	"packages/ai/src/api/google-vertex.ts:resolveProject":
		"从选项或 GOOGLE_CLOUD_PROJECT 等环境变量解析 GCP 项目。",
	"packages/ai/src/api/google-vertex.ts:buildParams":
		"组装 Vertex generateContent 参数，含 Gemini 3 thinking 与工具模式。",
	"packages/ai/src/api/google-vertex.ts:getDisabledThinkingConfig":
		"为需关闭 thinking 的 Vertex 型号返回 disabled 配置。",
	"packages/ai/src/api/google-vertex.ts:getGemini3ThinkingLevel":
		"把 effort 映射为 Gemini 3 的 thinkingLevel。",
	"packages/ai/src/api/google-vertex.ts:getGoogleBudget":
		"按 Vertex 型号计算 thinkingBudget。",

	"packages/ai/src/api/mistral-conversations.ts:stream":
		"对 Mistral 发起流式 chat/conversations 请求并消费事件。",
	"packages/ai/src/api/mistral-conversations.ts:streamSimple":
		"把 SimpleStreamOptions 转为 Mistral 选项后调用 stream。",
	"packages/ai/src/api/mistral-conversations.ts:createOutput":
		"初始化 assistant 输出占位（usage、内容块、stop）。",
	"packages/ai/src/api/mistral-conversations.ts:createMistralToolCallIdNormalizer":
		"创建工具调用 ID 规范化器，把超长/非法 id 收成 Mistral 可回传的短 id。",
	"packages/ai/src/api/mistral-conversations.ts:formatMistralError":
		"把 HTTP/JSON 错误体格式化为可读的 Mistral 错误。",
	"packages/ai/src/api/mistral-conversations.ts:requestMistralStream":
		"发送带重试的 Mistral 流式 HTTP 请求并返回 Response。",
	"packages/ai/src/api/mistral-conversations.ts:buildMistralHeaders":
		"组装 Authorization、User-Agent 与调用方覆盖头。",
	"packages/ai/src/api/mistral-conversations.ts:toMistralWirePayload":
		"把内部请求映射为 Mistral wire JSON（消息、工具、缓存）。",
	"packages/ai/src/api/mistral-conversations.ts:toMistralWireContentChunk":
		"将单个内容块转为 Mistral wire chunk（文本/图/thinking）。",
	"packages/ai/src/api/mistral-conversations.ts:parseMistralEvent":
		"解析 SSE 边界后的单个 Mistral 事件对象。",
	"packages/ai/src/api/mistral-conversations.ts:buildChatPayload":
		"组装 chat completions 形态的 payload（模型、消息、工具选择）。",
	"packages/ai/src/api/mistral-conversations.ts:getMistralCachedPromptTokens":
		"从 usage 或响应头提取 prompt cache 命中 token。",
	"packages/ai/src/api/mistral-conversations.ts:consumeChatStream":
		"消费 Mistral chat SSE，增量拼文本/工具参数并映射 stop。",
	"packages/ai/src/api/mistral-conversations.ts:toFunctionTools":
		"把内部 Tool 转为 Mistral function tools。",
	"packages/ai/src/api/mistral-conversations.ts:stripSymbolKeys":
		"去掉对象上的 symbol 键，避免进入 JSON 序列化。",
	"packages/ai/src/api/mistral-conversations.ts:toChatMessages":
		"把内部对话转为 Mistral chat messages，合并连续 tool results。",
	"packages/ai/src/api/mistral-conversations.ts:buildToolResultText":
		"把工具结果内容压成 Mistral 可接受的文本。",
	"packages/ai/src/api/mistral-conversations.ts:mapToolChoice":
		"把内部 toolChoice 映射为 Mistral tool_choice。",
	"packages/ai/src/api/mistral-conversations.ts:mapChatStopReason":
		"把 Mistral finish_reason 映射为内部 stop 语义。",

	"packages/ai/src/api/openai-codex-responses.ts:getRetryAfterDelayMs":
		"从 Retry-After 或错误体解析下次重试延迟，并校验上限。",
	"packages/ai/src/api/openai-codex-responses.ts:sleep":
		"可被 AbortSignal 取消的延迟等待，用于重试间隔。",
	"packages/ai/src/api/openai-codex-responses.ts:compressRequestBodyZstd":
		"在 Node 下用 zlib zstd 压缩 Codex 请求体。",
	"packages/ai/src/api/openai-codex-responses.ts:stream":
		"Codex Responses 主入口：SSE 或 WebSocket、重试、限流与 previous_response 回退。",
	"packages/ai/src/api/openai-codex-responses.ts:streamSimple":
		"把 SimpleStreamOptions 转为 Codex 选项后调用 stream。",
	"packages/ai/src/api/openai-codex-responses.ts:buildRequestBody":
		"组装 Codex Responses 请求体：消息、工具、service tier 与 deferred tools。",
	"packages/ai/src/api/openai-codex-responses.ts:getServiceTierCostMultiplier":
		"按 service tier 返回费用乘数。",
	"packages/ai/src/api/openai-codex-responses.ts:applyServiceTierPricing":
		"用乘数改写 usage 费用字段。",
	"packages/ai/src/api/openai-codex-responses.ts:processStream":
		"把 Codex SSE 交给 shared processResponsesStream 解析。",
	"packages/ai/src/api/openai-codex-responses.ts:extractCodexEventError":
		"从 Codex 事件中提取可重试/终端错误信息。",
	"packages/ai/src/api/openai-codex-responses.ts:getOrCreateWebSocketDebugStats":
		"按会话取出或初始化 WebSocket 调试计数。",
	"packages/ai/src/api/openai-codex-responses.ts:getOpenAICodexWebSocketDebugStats":
		"导出当前 WebSocket 调试统计快照。",
	"packages/ai/src/api/openai-codex-responses.ts:resetOpenAICodexWebSocketDebugStats":
		"清零 WebSocket 调试统计。",
	"packages/ai/src/api/openai-codex-responses.ts:closeOpenAICodexWebSocketSessions":
		"关闭并清理所有缓存的 Codex WebSocket 会话。",
	"packages/ai/src/api/openai-codex-responses.ts:getWebSocketConstructor":
		"解析全局或 ws 包的 WebSocket 构造器，兼容浏览器与 Node。",
	"packages/ai/src/api/openai-codex-responses.ts:scheduleSessionWebSocketExpiry":
		"为会话 WebSocket 安排过期关闭定时器。",
	"packages/ai/src/api/openai-codex-responses.ts:connectWebSocket":
		"建立 Codex WebSocket，完成握手并登记会话。",
	"packages/ai/src/api/openai-codex-responses.ts:acquireWebSocket":
		"复用未过期会话连接，否则新建；处理连接上限回退。",
	"packages/ai/src/api/openai-codex-responses.ts:extractWebSocketError":
		"从 WebSocket 错误事件提取可读原因。",
	"packages/ai/src/api/openai-codex-responses.ts:extractWebSocketCloseError":
		"把 close code/reason 转成 WebSocketCloseError。",
	"packages/ai/src/api/openai-codex-responses.ts:decodeWebSocketData":
		"把 WS 二进制/文本帧解码为字符串事件。",
	"packages/ai/src/api/openai-codex-responses.ts:getCachedWebSocketInputDelta":
		"计算相对上次请求的 input 增量，供会话复用。",
	"packages/ai/src/api/openai-codex-responses.ts:buildCachedWebSocketRequestBody":
		"在缓存会话上只发送 input delta 的精简请求体。",
	"packages/ai/src/api/openai-codex-responses.ts:processWebSocketStream":
		"消费 WebSocket 事件流并转成内部 AssistantMessage 事件。",
	"packages/ai/src/api/openai-codex-responses.ts:parseErrorResponse":
		"解析 Codex HTTP 错误响应体与状态。",
	"packages/ai/src/api/openai-codex-responses.ts:extractAccountId":
		"从 token 或响应头提取 Codex account id。",
	"packages/ai/src/api/openai-codex-responses.ts:buildBaseCodexHeaders":
		"组装 User-Agent、session 与账号相关的基础头。",
	"packages/ai/src/api/openai-codex-responses.ts:buildSSEHeaders":
		"在基础头上补充 SSE 所需的 Accept/压缩头。",
	"packages/ai/src/api/openai-codex-responses.ts:buildWebSocketHeaders":
		"在基础头上补充 WebSocket 握手头。",

	"packages/ai/src/api/openai-completions.ts:hasToolHistory":
		"判断上下文是否已有工具调用/结果历史。",
	"packages/ai/src/api/openai-completions.ts:getDeferredToolNames":
		"收集标记为延迟加载的工具名集合。",
	"packages/ai/src/api/openai-completions.ts:isOpenAIReasoningDetail":
		"判断对象是否为 OpenAI reasoning detail（含加密/摘要字段）。",
	"packages/ai/src/api/openai-completions.ts:parseLegacyEncryptedReasoningDetail":
		"解析旧版加密 reasoning detail 字符串。",
	"packages/ai/src/api/openai-completions.ts:appendOpenAIReasoningDetail":
		"把 reasoning detail 追加到 thinking 内容块。",
	"packages/ai/src/api/openai-completions.ts:stream":
		"Chat Completions 流式主循环：重试、解析 delta、grammar 工具与 compat 方言。",
	"packages/ai/src/api/openai-completions.ts:streamSimple":
		"把 SimpleStreamOptions 转为 Completions 选项后调用 stream。",
	"packages/ai/src/api/openai-completions.ts:createClient":
		"创建 OpenAI SDK 客户端，注入 Copilot 动态头与自定义 fetch。",
	"packages/ai/src/api/openai-completions.ts:buildParams":
		"按 compat 组装 chat.completions 请求：缓存、模板、工具与 thinking budget。",
	"packages/ai/src/api/openai-completions.ts:resolveClampedThinkingBudget":
		"按答案预留空间夹紧 thinking budget。",
	"packages/ai/src/api/openai-completions.ts:buildChatTemplateValues":
		"为兼容端点构造 chat_template_kwargs。",
	"packages/ai/src/api/openai-completions.ts:resolveChatTemplateKwargValue":
		"解析单个 chat template 参数（含 thinking budget 注入）。",
	"packages/ai/src/api/openai-completions.ts:getCompatCacheControl":
		"按 compat 方言返回应对系统/末条消息打的 cache_control。",
	"packages/ai/src/api/openai-completions.ts:addCacheControlToSystemPrompt":
		"给系统提示消息打上 Anthropic 风格 cache_control。",
	"packages/ai/src/api/openai-completions.ts:addCacheControlToLastConversationMessage":
		"给最后一条对话消息打 cache_control。",
	"packages/ai/src/api/openai-completions.ts:addCacheControlToLastTool":
		"给最后一个 tool definition 打 cache_control。",
	"packages/ai/src/api/openai-completions.ts:addCacheControlToTextContent":
		"把 cache_control 挂到文本 content 段上。",
	"packages/ai/src/api/openai-completions.ts:convertMessages":
		"把内部消息转为 chat.completions messages，处理 reasoning details 与 grammar input。",
	"packages/ai/src/api/openai-completions.ts:convertTools":
		"把 Tool 转为 Completions tools，解析 grammar 或 strict schema。",
	"packages/ai/src/api/openai-completions.ts:parseChunkUsage":
		"从 chunk.usage 解析 token 并计算费用。",
	"packages/ai/src/api/openai-completions.ts:mapStopReason":
		"把 Completions finish_reason 映射为内部 stop。",
	"packages/ai/src/api/openai-completions.ts:detectCompat":
		"根据模型 id 与 baseUrl 检测 Completions 兼容方言。",
	"packages/ai/src/api/openai-completions.ts:getCompat":
		"缓存并返回模型的 compat 描述（缓存、模板、工具能力）。",

	"packages/ai/src/api/openai-prompt-cache.ts:clampOpenAIPromptCacheKey":
		"将 prompt cache key 截到最多 64 个字符；undefined 原样返回。",

	"packages/ai/src/api/openai-responses-shared.ts:parseTextSignature":
		"解析内部文本 signature（id/phase），用于 thinking 块对齐。",
	"packages/ai/src/api/openai-responses-shared.ts:convertToolResultOutput":
		"把工具结果转为 Responses API 的 output 项。",
	"packages/ai/src/api/openai-responses-shared.ts:convertResponsesMessages":
		"将内部对话转为 Responses input items，处理跨供应商 tool call id。",
	"packages/ai/src/api/openai-responses-shared.ts:convertResponsesTools":
		"把 Tool 转为 Responses tools，含 grammar 与 strict schema。",
	"packages/ai/src/api/openai-responses-shared.ts:processResponsesStream":
		"消费 Responses SSE：文本/推理/工具增量、用量与最终 stop。",
	"packages/ai/src/api/openai-responses-shared.ts:mapStopReason":
		"把 Responses status/incomplete_reason 映射为内部 stop。",

	"packages/ai/src/api/openai-responses.ts:getCompat":
		"根据模型判断 Responses 端的 prompt cache 与会话亲和兼容性。",
	"packages/ai/src/api/openai-responses.ts:stream":
		"调用 OpenAI Responses 流式接口并交给 processResponsesStream。",
	"packages/ai/src/api/openai-responses.ts:streamSimple":
		"把 SimpleStreamOptions 转为 Responses 选项后调用 stream。",
	"packages/ai/src/api/openai-responses.ts:createClient":
		"创建 Responses 客户端，注入 Copilot 头、session 与 User-Agent。",
	"packages/ai/src/api/openai-responses.ts:buildParams":
		"组装 Responses 请求：消息/工具、cache key、grammar 与 deferred tools。",
	"packages/ai/src/api/openai-responses.ts:getServiceTierCostMultiplier":
		"按 Responses service tier 返回费用乘数。",
	"packages/ai/src/api/openai-responses.ts:applyServiceTierPricing":
		"把 service tier 乘数应用到 usage 费用。",

	"packages/ai/src/api/openrouter-images.lazy.ts:openrouterImagesApi":
		"返回惰性 ProviderImages，首次调用才动态导入 generateImages。",
	"packages/ai/src/api/openrouter-images.ts:generateImages":
		"向 OpenRouter 发送图像生成请求，解析图片与 usage，并统一重试/错误体。",
	"packages/ai/src/api/openrouter-images.ts:createClient":
		"创建带供应商头的 OpenRouter 图像请求客户端。",
	"packages/ai/src/api/openrouter-images.ts:buildParams":
		"把图像 context 转为 OpenRouter 请求体并清洗 unicode。",
	"packages/ai/src/api/openrouter-images.ts:parseUsage":
		"从响应 usage 提取图像计费 token/费用。",

	"packages/ai/src/api/pi-messages.ts:formatPiMessagesResponseError":
		"把 HTTP 状态与错误体格式化为 Pi Messages 错误文本。",
	"packages/ai/src/api/pi-messages.ts:createPiMessagesResponseError":
		"构造带 url/状态/诊断详情的 PiMessagesResponseError。",
	"packages/ai/src/api/pi-messages.ts:createEmptyUsage":
		"返回全零 usage 占位，供错误或空响应使用。",
	"packages/ai/src/api/pi-messages.ts:appendRewriteDiagnostic":
		"把 rewrite 诊断追加到 assistant 消息。",
	"packages/ai/src/api/pi-messages.ts:createEventConverter":
		"创建 Pi 事件到内部 AssistantMessageEvent 的转换器，含 JSON 修复解析。",
	"packages/ai/src/api/pi-messages.ts:createErrorEvent":
		"把异常转为带诊断的错误事件（区分 abort）。",
	"packages/ai/src/api/pi-messages.ts:stream":
		"请求 Pi Messages 端点，解析事件流并回传诊断。",
	"packages/ai/src/api/pi-messages.ts:streamSimple":
		"把 SimpleStreamOptions 交给 Pi Messages stream。",
	"packages/ai/src/api/pi-messages.ts:PiMessagesResponseError":
		"携带错误码与 diagnosticDetails 的 Pi Messages HTTP 响应错误。",

	"packages/ai/src/api/simple-options.ts:clampMaxTokensToContext":
		"按 context window 与安全余量夹紧 maxTokens。",
	"packages/ai/src/api/simple-options.ts:buildBaseOptions":
		"把 SimpleStreamOptions 展开为各 API 共用的 StreamOptions。",
	"packages/ai/src/api/simple-options.ts:clampReasoning":
		"把 xhigh/max reasoning 降为 high，避免超出多数供应商档位。",
	"packages/ai/src/api/simple-options.ts:thinkingBudgetForLevel":
		"按 ThinkingLevel 与自定义预算表返回 thinking token。",
	"packages/ai/src/api/simple-options.ts:clampThinkingBudgetToAnswerRoom":
		"保证 thinking 预算不会吃掉 MIN_ANSWER_TOKENS 的作答空间。",
	"packages/ai/src/api/simple-options.ts:adjustMaxTokensForThinking":
		"在模型上限内同时给出 maxTokens 与 thinkingBudget。",

	"packages/ai/src/api/transform-messages.ts:replaceImagesWithPlaceholder":
		"把内容中的图片块替换为占位文本。",
	"packages/ai/src/api/transform-messages.ts:downgradeUnsupportedImages":
		"当模型不支持视觉时，把历史图片降级为占位，避免请求被拒。",
	"packages/ai/src/api/transform-messages.ts:transformMessages":
		"统一预处理消息：降级图片、规范化 tool call id，供各供应商 convertMessages 使用。",

	"packages/ai/src/env-api-keys.ts:hasVertexAdcCredentials":
		"检测 GOOGLE_APPLICATION_CREDENTIALS 或默认 ADC 文件是否存在；浏览器永不缓存为有。",
	"packages/ai/src/env-api-keys.ts:getApiKeyEnvVars":
		"返回某供应商应检查的环境变量名列表。",
	"packages/ai/src/env-api-keys.ts:findEnvKeys":
		"列出当前 env 中该供应商已设置的 key 变量名。",
	"packages/ai/src/env-api-keys.ts:getEnvApiKey":
		"按优先级读取供应商 API key；Anthropic OAuth/auth token 有特殊跳过规则。",

	"packages/ai/src/image-models.ts:getImageModel":
		"按供应商与模型 id 返回生成表中的 ImagesModel。",
	"packages/ai/src/image-models.ts:getImageProviders":
		"返回已注册图像供应商 id 列表。",
	"packages/ai/src/image-models.ts:getImageModels":
		"返回某供应商下全部图像模型。",

	"packages/ai/src/images-api-registry.ts:wrapGenerateImages":
		"包装 generateImages，调用时校验 model.api 与登记的 api 一致。",
	"packages/ai/src/images-api-registry.ts:registerImagesApiProvider":
		"按 api 名登记图像提供方，可选 sourceId。",
	"packages/ai/src/images-api-registry.ts:getImagesApiProvider":
		"按 ImagesApi 取出已登记提供方。",

	"packages/ai/src/images.ts:generateImages":
		"公共图像生成入口：解析注册表中的提供方并委托 generateImages。",
};

const FILE_TAGS_DEFAULT = ["api-handler", "provider", "typescript"];

function keepFn(file, fn) {
	const len = fn.endLine - fn.startLine + 1;
	const exported = (file.exports || []).some((e) => e.name === fn.name);
	return exported || len >= 10;
}

function keepCls(file, cls) {
	const len = cls.endLine - cls.startLine + 1;
	const exported = (file.exports || []).some((e) => e.name === cls.name);
	return exported || cls.methods.length >= 2 || len >= 20;
}

function complexityForLines(len, nonEmptyFile) {
	if (len >= 80) return "complex";
	if (len >= 20) return "moderate";
	return "simple";
}

function fnTags(name, exported) {
	const tags = [];
	if (exported) tags.push("exports");
	if (name === "stream" || name === "streamSimple" || name === "generateImages") tags.push("api-handler", "streaming");
	else if (name.startsWith("convert") || name.startsWith("to") || name.startsWith("transform"))
		tags.push("serialization", "转换");
	else if (name.startsWith("create") || name.startsWith("build") || name.startsWith("make"))
		tags.push("factory");
	else if (name.startsWith("parse") || name.startsWith("decode") || name.startsWith("detect"))
		tags.push("parsing");
	else if (name.startsWith("map") || name.startsWith("resolve") || name.startsWith("infer"))
		tags.push("mapping");
	else if (name.startsWith("clamp") || name.startsWith("adjust") || name.startsWith("sanitize"))
		tags.push("validation", "utility");
	else tags.push("utility");
	if (name.toLowerCase().includes("header")) tags.push("headers");
	if (name.toLowerCase().includes("cache")) tags.push("cache");
	if (name.toLowerCase().includes("retry")) tags.push("retry");
	if (name.toLowerCase().includes("websocket") || name.toLowerCase().includes("webSocket")) tags.push("websocket");
	const uniq = [...new Set(tags)];
	while (uniq.length < 3) uniq.push("typescript");
	return uniq.slice(0, 5);
}

function importedTargets(src, results) {
	const imports = new Set(brief.batchImportData[src] || []);
	const targets = new Map();
	for (const f of results) {
		if (!imports.has(f.path)) continue;
		for (const e of f.exports || []) {
			if (!targets.has(e.name)) targets.set(e.name, []);
			targets.get(e.name).push(f.path);
		}
	}
	for (const n of brief.neighborMap[src] || []) {
		if (!imports.has(n.path)) continue;
		for (const s of n.symbols) {
			if (!targets.has(s)) targets.set(s, []);
			if (!targets.get(s).includes(n.path)) targets.get(s).push(n.path);
		}
	}
	return targets;
}

const neighborSymbolSet = new Set();
const neighborFileSet = new Set();
const importFileSet = new Set();
for (const [src, neighbors] of Object.entries(brief.neighborMap)) {
	for (const n of neighbors) {
		neighborFileSet.add(n.path);
		for (const s of n.symbols) neighborSymbolSet.add(s);
	}
}
for (const paths of Object.values(brief.batchImportData)) {
	for (const p of paths) importFileSet.add(p);
}

const nodes = [];
const edges = [];
const nodeIds = new Set();
const keptByFile = new Map();
const missing = [];

for (const file of extract.results) {
	const meta = FILE_META[file.path];
	if (!meta) throw new Error(`missing FILE_META ${file.path}`);
	const fileId = `file:${file.path}`;
	nodes.push({
		id: fileId,
		type: "file",
		name: file.path.split("/").pop(),
		filePath: file.path,
		summary: meta.summary,
		tags: meta.tags,
		complexity: meta.complexity,
		...(meta.languageNotes ? { languageNotes: meta.languageNotes } : {}),
	});
	nodeIds.add(fileId);

	const kept = [];
	for (const fn of file.functions || []) {
		if (!keepFn(file, fn)) continue;
		const key = `${file.path}:${fn.name}`;
		const summary = FN_SUMMARY[key];
		if (!summary) missing.push(key);
		const len = fn.endLine - fn.startLine + 1;
		const exported = (file.exports || []).some((e) => e.name === fn.name);
		const id = `function:${file.path}:${fn.name}`;
		nodes.push({
			id,
			type: "function",
			name: fn.name,
			filePath: file.path,
			lineRange: [fn.startLine, fn.endLine],
			summary: summary || `（缺失摘要）${fn.name}`,
			tags: fnTags(fn.name, exported),
			complexity: complexityForLines(len),
		});
		nodeIds.add(id);
		kept.push({ kind: "function", name: fn.name, id, exported });
		edges.push({
			source: fileId,
			target: id,
			type: "contains",
			direction: "forward",
			weight: 1.0,
		});
		if (exported) {
			edges.push({
				source: fileId,
				target: id,
				type: "exports",
				direction: "forward",
				weight: 0.8,
			});
		}
	}
	for (const cls of file.classes || []) {
		if (!keepCls(file, cls)) continue;
		const key = `${file.path}:${cls.name}`;
		const summary = FN_SUMMARY[key];
		if (!summary) missing.push(key);
		const len = cls.endLine - cls.startLine + 1;
		const exported = (file.exports || []).some((e) => e.name === cls.name);
		const id = `class:${file.path}:${cls.name}`;
		nodes.push({
			id,
			type: "class",
			name: cls.name,
			filePath: file.path,
			lineRange: [cls.startLine, cls.endLine],
			summary: summary || `（缺失摘要）${cls.name}`,
			tags: ["error-type", "diagnostics", exported ? "exports" : "internal"].filter(Boolean).slice(0, 5),
			complexity: complexityForLines(len),
		});
		nodeIds.add(id);
		kept.push({ kind: "class", name: cls.name, id, exported });
		edges.push({
			source: fileId,
			target: id,
			type: "contains",
			direction: "forward",
			weight: 1.0,
		});
		if (exported) {
			edges.push({
				source: fileId,
				target: id,
				type: "exports",
				direction: "forward",
				weight: 0.8,
			});
		}
	}
	keptByFile.set(file.path, kept);

	const imports = brief.batchImportData[file.path] || [];
	for (const target of imports) {
		edges.push({
			source: fileId,
			target: `file:${target}`,
			type: "imports",
			direction: "forward",
			weight: 0.7,
		});
	}
}

if (missing.length) {
	throw new Error(`missing FN_SUMMARY (${missing.length}):\n${missing.join("\n")}`);
}

const extraSummaries = Object.keys(FN_SUMMARY).filter((k) => {
	return !nodes.some((n) => n.id.endsWith(k.replace(/^.*\//, "")) && n.filePath && k.startsWith(n.filePath));
});
// unused FN_SUMMARY keys check
const usedKeys = new Set();
for (const file of extract.results) {
	for (const fn of file.functions || []) {
		if (keepFn(file, fn)) usedKeys.add(`${file.path}:${fn.name}`);
	}
	for (const cls of file.classes || []) {
		if (keepCls(file, cls)) usedKeys.add(`${file.path}:${cls.name}`);
	}
}
const unused = Object.keys(FN_SUMMARY).filter((k) => !usedKeys.has(k));
if (unused.length) {
	console.warn("unused FN_SUMMARY", unused);
}

const keptNameSet = new Map();
for (const [path, kept] of keptByFile) {
	keptNameSet.set(path, new Set(kept.map((k) => k.name)));
}

for (const file of extract.results) {
	const local = new Set((file.functions || []).map((f) => f.name));
	for (const c of file.classes || []) local.add(c.name);
	const targets = importedTargets(file.path, extract.results);
	const seen = new Set();
	const keptLocal = keptNameSet.get(file.path);
	for (const call of file.callGraph || []) {
		if (local.has(call.callee)) continue;
		const paths = targets.get(call.callee);
		if (!paths || paths.length !== 1) continue;
		if (!keptLocal.has(call.caller) && call.caller !== "constructor") continue;
		const key = `${call.caller}->${call.callee}@${paths[0]}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const source = keptLocal.has(call.caller)
			? `${keptByFile.get(file.path).find((k) => k.name === call.caller).kind}:${file.path}:${call.caller}`
			: null;
		if (!source) continue;
		const targetPath = paths[0];
		const targetKind = targetPath.includes(".ts") ? "function" : "function";
		edges.push({
			source,
			target: `function:${targetPath}:${call.callee}`,
			type: "calls",
			direction: "forward",
			weight: 0.8,
		});
	}
}

const expectedImports = Object.values(brief.batchImportData).reduce((s, a) => s + a.length, 0);
const importEdges = edges.filter((e) => e.type === "imports");
if (importEdges.length !== expectedImports) {
	throw new Error(`imports ${importEdges.length} !== expected ${expectedImports}`);
}

const filesSorted = extract.results.map((f) => f.path).sort();
const nodeCount = nodes.length;
const edgeCount = edges.length;

function groupsForParts(partCount) {
	const chunk = Math.ceil(filesSorted.length / partCount);
	const groups = [];
	for (let i = 0; i < filesSorted.length; i += chunk) {
		groups.push(filesSorted.slice(i, i + chunk));
	}
	return groups;
}

function fileOfId(id) {
	const n = nodes.find((x) => x.id === id);
	return n?.filePath;
}

function measureGroups(groups) {
	return groups.map((g) => {
		const partFiles = new Set(g);
		const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
		const partNodeIds = new Set(partNodes.map((n) => n.id));
		const partEdges = edges.filter((e) => {
			if (!partNodeIds.has(e.source)) return false;
			if (partNodeIds.has(e.target)) return true;
			if (e.target.startsWith("file:")) {
				const p = e.target.slice("file:".length);
				return importFileSet.has(p) || neighborFileSet.has(p);
			}
			const m = e.target.match(/^(function|class):(.+):([^:]+)$/);
			if (!m) return false;
			const symbol = m[3];
			const path = m[2];
			if (partFiles.has(path)) return true;
			return neighborSymbolSet.has(symbol);
		});
		return { nodes: partNodes.length, edges: partEdges.length };
	});
}

let parts = Math.max(1, Math.ceil(Math.max(nodeCount / 60, edgeCount / 120)));
let groups = groupsForParts(parts);
for (;;) {
	const measured = measureGroups(groups);
	const overflow = measured.some((m) => m.nodes > 60 || m.edges > 120);
	if (!overflow || parts >= filesSorted.length) break;
	parts += 1;
	groups = groupsForParts(parts);
}

function edgeTargetOk(edge, partNodeIds, partFiles) {
	if (partNodeIds.has(edge.source) === false) return "source-missing";
	if (partNodeIds.has(edge.target)) return null;
	if (edge.target.startsWith("file:")) {
		const p = edge.target.slice("file:".length);
		if (importFileSet.has(p) || neighborFileSet.has(p) || partFiles.has(p)) return null;
		return `file-target-not-known ${edge.target}`;
	}
	const m = edge.target.match(/^(function|class):(.+):([^:]+)$/);
	if (m) {
		const [, , path, symbol] = m;
		if (partFiles.has(path)) return null;
		if (neighborSymbolSet.has(symbol)) return null;
		// intra-batch symbol in another part: invalid
		return `cross-part-symbol ${edge.target}`;
	}
	return `unknown-target ${edge.target}`;
}

for (const existing of fs.readdirSync(`${UA_DIR}/intermediate`)) {
	if (/^batch-17(?:-part-\d+)?\.json$/.test(existing)) {
		fs.unlinkSync(`${UA_DIR}/intermediate/${existing}`);
	}
}

const written = [];
for (let i = 0; i < groups.length; i++) {
	const partFiles = new Set(groups[i]);
	const partNodes = nodes.filter((n) => partFiles.has(n.filePath));
	const partNodeIds = new Set(partNodes.map((n) => n.id));
	let partEdges = edges.filter((e) => partNodeIds.has(e.source));
	const dropped = [];
	partEdges = partEdges.filter((e) => {
		const err = edgeTargetOk(e, partNodeIds, partFiles);
		if (err) {
			if (err.startsWith("cross-part-symbol") && e.type === "calls") {
				dropped.push(e);
				return false;
			}
			if (err !== null) {
				dropped.push({ ...e, _err: err });
				return false;
			}
		}
		return true;
	});
	const hard = dropped.filter((e) => e._err && !String(e._err).startsWith("cross-part-symbol"));
	if (hard.length) {
		console.error(hard.slice(0, 20));
		throw new Error(`part ${i + 1} hard validation failures: ${hard.length}`);
	}
	const out = { nodes: partNodes, edges: partEdges };
	const name =
		groups.length === 1
			? `${UA_DIR}/intermediate/batch-17.json`
			: `${UA_DIR}/intermediate/batch-17-part-${i + 1}.json`;
	fs.writeFileSync(name, JSON.stringify(out, null, 2) + "\n");
	written.push({
		name,
		nodes: partNodes.length,
		edges: partEdges.length,
		files: groups[i],
		droppedCalls: dropped.filter((e) => !e._err || String(e._err).startsWith("cross-part-symbol")).length,
	});
}

const totalNodes = written.reduce((s, w) => s + w.nodes, 0);
const totalEdges = written.reduce((s, w) => s + w.edges, 0);
console.log(
	JSON.stringify(
		{
			parts: written.length,
			totalNodes,
			totalEdges,
			preSplitNodes: nodeCount,
			preSplitEdges: edgeCount,
			importEdges: importEdges.length,
			filesSkipped: extract.filesSkipped,
			written,
		},
		null,
		2,
	),
);
