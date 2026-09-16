import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const UA_DIR = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua";
const brief = JSON.parse(readFileSync(join(UA_DIR, "intermediate/batch-briefs/batch-11.json"), "utf8"));
const extract = JSON.parse(readFileSync(join(UA_DIR, "tmp/ua-file-extract-results-11.json"), "utf8"));

const neighborPaths = new Set();
const neighborSymbols = new Set();
for (const [src, neighbors] of Object.entries(brief.neighborMap || {})) {
	neighborPaths.add(src);
	for (const n of neighbors) {
		neighborPaths.add(n.path);
		for (const s of n.symbols || []) {
			neighborSymbols.add(`${n.path}:${s}`);
		}
	}
}
for (const [src, targets] of Object.entries(brief.batchImportData || {})) {
	neighborPaths.add(src);
	for (const t of targets) neighborPaths.add(t);
}

function fileNode(idPath, name, summary, tags, complexity, languageNotes) {
	const node = {
		id: `file:${idPath}`,
		type: "file",
		name,
		filePath: idPath,
		summary,
		tags,
		complexity,
	};
	if (languageNotes) node.languageNotes = languageNotes;
	return node;
}

function fnNode(filePath, name, lineRange, summary, tags, complexity, languageNotes) {
	const node = {
		id: `function:${filePath}:${name}`,
		type: "function",
		name,
		filePath,
		lineRange,
		summary,
		tags,
		complexity,
	};
	if (languageNotes) node.languageNotes = languageNotes;
	return node;
}

function classNode(filePath, name, lineRange, summary, tags, complexity, languageNotes) {
	const node = {
		id: `class:${filePath}:${name}`,
		type: "class",
		name,
		filePath,
		lineRange,
		summary,
		tags,
		complexity,
	};
	if (languageNotes) node.languageNotes = languageNotes;
	return node;
}

function edge(source, target, type, weight) {
	return { source, target, type, direction: "forward", weight };
}

const P = {
	bedrock: "packages/ai/src/bedrock-provider.ts",
	oauth: "packages/ai/src/oauth.ts",
	bunCli: "packages/coding-agent/src/bun/cli.ts",
	restore: "packages/coding-agent/src/bun/restore-sandbox-env.ts",
	runtimeSetup: "packages/coding-agent/src/bun/runtime-setup.ts",
	sandbox: "packages/coding-agent/src/bun/sandbox-env-setup.ts",
	cli: "packages/coding-agent/src/cli.ts",
	args: "packages/coding-agent/src/cli/args.ts",
	authCheck: "packages/coding-agent/src/cli/auth-check.ts",
	authCmd: "packages/coding-agent/src/cli/auth-command.ts",
	cred: "packages/coding-agent/src/cli/credential-print.ts",
	initMsg: "packages/coding-agent/src/cli/initial-message.ts",
	listModels: "packages/coding-agent/src/cli/list-models.ts",
	trust: "packages/coding-agent/src/cli/project-trust.ts",
	setup: "packages/coding-agent/src/cli/setup.ts",
	config: "packages/coding-agent/src/config.ts",
	runtime: "packages/coding-agent/src/core/agent-session-runtime.ts",
	services: "packages/coding-agent/src/core/agent-session-services.ts",
	session: "packages/coding-agent/src/core/agent-session.ts",
	guidance: "packages/coding-agent/src/core/auth-guidance.ts",
	storage: "packages/coding-agent/src/core/auth-storage.ts",
	bash: "packages/coding-agent/src/core/bash-executor.ts",
	compaction: "packages/coding-agent/src/core/compaction/index.ts",
	defaults: "packages/coding-agent/src/core/defaults.ts",
	diagnostics: "packages/coding-agent/src/core/diagnostics.ts",
	eventBus: "packages/coding-agent/src/core/event-bus.ts",
	exec: "packages/coding-agent/src/core/exec.ts",
	html: "packages/coding-agent/src/core/export-html/index.ts",
	ext: "packages/coding-agent/src/core/extensions/index.ts",
};

const nodes = [
	fileNode(
		P.bedrock,
		"bedrock-provider.ts",
		"将 Bedrock Converse 的 stream/streamSimple 打包为 bedrockProviderModule，供 Bun 运行时注入到 pi-ai compat 层。",
		["barrel", "provider", "bedrock", "entry-point"],
		"simple",
		"薄封装：只转发 stream API，不实现协议细节。",
	),
	fileNode(
		P.oauth,
		"oauth.ts",
		"为 coding-agent 扩展声明提供 OAuth 相关类型的 type-only 兼容入口，从 extension-oauth-types 再导出。",
		["type-definition", "oauth", "barrel"],
		"simple",
		"仅 export type，运行时无代码。",
	),
	fileNode(
		P.bunCli,
		"cli.ts",
		"Bun 编译入口：先恢复 sandbox 环境并完成 runtime 注入，再转入通用 CLI。",
		["entry-point", "bun", "cli"],
		"simple",
	),
	fileNode(
		P.restore,
		"restore-sandbox-env.ts",
		"在 Bun 编译二进制于 sandbox 中 process.env 为空时，从 /proc/self/environ 恢复环境变量。",
		["utility", "bun", "sandbox", "workaround"],
		"simple",
		"规避 oven-sh/bun#27802；需与 ai 包 provider-env 查找逻辑保持同步。",
	),
	fileNode(
		P.runtimeSetup,
		"runtime-setup.ts",
		"设置进程标题、屏蔽 Node 警告，并注册 Bun OAuth 流程与 Bedrock provider module。",
		["entry-point", "bun", "runtime", "oauth"],
		"simple",
	),
	fileNode(
		P.sandbox,
		"sandbox-env-setup.ts",
		"在其他模块读取环境变量之前立即调用 restoreSandboxEnv。",
		["entry-point", "bun", "sandbox"],
		"simple",
	),
	fileNode(
		P.cli,
		"cli.ts",
		"Node/通用 CLI 入口：执行 setupCli 后把 argv 交给 main。",
		["entry-point", "cli"],
		"simple",
	),
	fileNode(
		P.args,
		"args.ts",
		"解析 coding-agent CLI 参数并打印帮助，覆盖模型、会话、工具、扩展、主题与输出模式。",
		["cli", "validation", "entry-point"],
		"complex",
	),
	fileNode(
		P.authCheck,
		"auth-check.ts",
		"检查指定 provider/model 的认证就绪状态，并提供打印凭证用的 ModelRuntime 工厂。",
		["cli", "auth", "validation"],
		"moderate",
	),
	fileNode(
		P.authCmd,
		"auth-command.ts",
		"解析并校验 pi auth 子命令（check / print-api-key / print-bearer-token），并提取 API key 或 Bearer token。",
		["cli", "auth", "validation"],
		"moderate",
	),
	fileNode(
		P.cred,
		"credential-print.ts",
		"为 print-api-key / print-bearer-token 解析唯一可用凭证，必要时经 ModelRuntime.getAuth 刷新 OAuth。",
		["cli", "auth", "credentials"],
		"moderate",
	),
	fileNode(
		P.initMsg,
		"initial-message.ts",
		"把 stdin、@file 文本/图片与首条 CLI 消息拼成非交互模式的初始 prompt。",
		["cli", "utility", "prompt"],
		"simple",
	),
	fileNode(
		P.listModels,
		"list-models.ts",
		"列出可用模型，支持模糊搜索，并以对齐表格输出上下文窗口、max-out、thinking 与图片能力。",
		["cli", "models", "utility"],
		"moderate",
	),
	fileNode(
		P.trust,
		"project-trust.ts",
		"构造 ProjectTrustContext，在交互 TUI 下用启动选择器/输入框完成项目信任决策。",
		["cli", "security", "project-trust"],
		"moderate",
	),
	fileNode(
		P.setup,
		"setup.ts",
		"设置进程标题与 PI_CODING_AGENT/AI_AGENT 环境，并在 provider SDK 发请求前配置 undici HTTP dispatcher。",
		["cli", "entry-point", "http"],
		"simple",
	),
	fileNode(
		P.config,
		"config.ts",
		"检测安装方式与自更新命令，并解析包资源路径与用户配置目录（agent/auth/models/sessions 等）。",
		["config", "paths", "install", "utility"],
		"complex",
		"同时覆盖 Bun 编译二进制、bundled Node 与 npm/pnpm/yarn 全局安装路径差异。",
	),
	fileNode(
		P.runtime,
		"agent-session-runtime.ts",
		"拥有当前 AgentSession 及其 cwd 绑定服务，负责切换/新建/fork/导入会话时的拆卸与重建。",
		["service", "session", "lifecycle"],
		"complex",
	),
	fileNode(
		P.services,
		"agent-session-services.ts",
		"按有效 cwd 创建 ModelRuntime、SettingsManager 与 ResourceLoader，再据此构造 AgentSession。",
		["factory", "service", "session"],
		"complex",
	),
	fileNode(
		P.session,
		"agent-session.ts",
		"所有运行模式共享的会话核心：提示、工具、compaction、bash、模型切换、扩展绑定与会话树导航。",
		["service", "session", "lifecycle", "entry-point"],
		"complex",
		"interactive/print/rpc 共用此类，I/O 由各 mode 叠加。",
	),
	fileNode(
		P.guidance,
		"auth-guidance.ts",
		"生成无模型、未选模型或缺少 API key 时的登录帮助文案，指向 providers/models 文档。",
		["utility", "auth", "cli"],
		"simple",
	),
	fileNode(
		P.storage,
		"auth-storage.ts",
		"以 auth.json 实现 CredentialStore：文件锁、只读视图、内存后端，以及一次性同步读取。",
		["data-model", "auth", "persistence", "singleton"],
		"complex",
		"写入使用 mode 0o600；共享读状态避免重复解析同一 auth.json。",
	),
	fileNode(
		P.bash,
		"bash-executor.ts",
		"通过可插拔 BashOperations 执行命令，支持流式输出、取消、截断与超额输出落临时文件。",
		["service", "shell", "streaming"],
		"moderate",
	),
	fileNode(
		P.compaction,
		"index.ts",
		"compaction / 分支摘要工具的 barrel，再导出 branch-summarization、compaction 与 utils。",
		["barrel", "compaction"],
		"simple",
	),
	fileNode(
		P.defaults,
		"defaults.ts",
		"定义默认 thinking level（medium）及可选档位列表。",
		["config", "defaults", "thinking"],
		"simple",
	),
	fileNode(
		P.diagnostics,
		"diagnostics.ts",
		"定义扩展/skill/prompt/theme 资源冲突与诊断消息的类型。",
		["type-definition", "diagnostics"],
		"simple",
	),
	fileNode(
		P.eventBus,
		"event-bus.ts",
		"基于 EventEmitter 的频道式事件总线，处理器错误隔离，并提供 clear。",
		["utility", "event-handler", "factory"],
		"simple",
	),
	fileNode(
		P.exec,
		"exec.ts",
		"为扩展与自定义工具提供带 timeout/AbortSignal 的 spawn 封装，返回 stdout/stderr/code。",
		["utility", "shell", "process"],
		"moderate",
		"先 SIGTERM，5 秒后 SIGKILL；用 waitForChildProcess 避免继承 stdio 挂起。",
	),
	fileNode(
		P.html,
		"index.ts",
		"将会话 JSONL 导出为带主题变量的 HTML，可预渲染自定义工具输出。",
		["serialization", "export", "html"],
		"complex",
	),
	fileNode(
		P.ext,
		"index.ts",
		"扩展系统公共 barrel：再导出 loader、ExtensionRunner、事件/工具类型与 defineTool 守卫。",
		["barrel", "extensions", "type-definition", "entry-point"],
		"moderate",
		"大量 type/value 再导出，供 AgentSession 与各 mode 单一入口引用。",
	),

	fnNode(P.restore, "restoreSandboxEnv", [19, 36], "当 Bun sandbox 下 process.env 为空时，从 /proc/self/environ 回填键值。", ["utility", "bun", "sandbox"], "simple"),

	fnNode(P.args, "isValidThinkingLevel", [62, 64], "判断字符串是否为合法 ThinkingLevel。", ["validation", "utility"], "simple"),
	fnNode(P.args, "normalizeSessionName", [66, 69], "修剪会话名，空字符串视为未设置。", ["utility", "validation"], "simple"),
	fnNode(P.args, "parseArgs", [71, 249], "扫描 argv，填充 Args（模型、会话、工具、扩展、未知 flag 与诊断）。", ["cli", "validation", "parser"], "complex"),
	fnNode(P.args, "printHelp", [251, 447], "打印 CLI 用法、环境变量与扩展自定义 flag。", ["cli", "documentation"], "moderate"),

	fnNode(P.authCheck, "checkProviderAuth", [22, 53], "按 --provider/--model 校验认证，返回 ready/not_ready/invalid。", ["auth", "validation", "cli"], "moderate"),
	fnNode(P.authCheck, "getProviderCredential", [55, 64], "读取已存 OAuth access 或经 ModelRuntime 解析出的凭证字符串。", ["auth", "credentials"], "simple"),
	fnNode(P.authCheck, "createAuthCheckModelRuntime", [66, 73], "创建不联网、不刷新的内存 ModelRuntime，专供 auth check。", ["factory", "auth"], "simple"),

	classNode(P.authCmd, "AuthCommandError", [16, 16], "auth 子命令参数或状态错误。", ["error", "auth", "cli"], "simple"),
	fnNode(P.authCmd, "getAuthCommandName", [24, 26], "把 AuthCommandKind 映射为用户可见命令名。", ["utility", "cli"], "simple"),
	fnNode(P.authCmd, "getAuthCommandUsage", [28, 30], "返回对应 auth 子命令的 usage 字符串。", ["utility", "cli"], "simple"),
	fnNode(P.authCmd, "isAuthCommandHelp", [32, 37], "判断 argv 是否为 auth help / --help。", ["cli", "validation"], "simple"),
	fnNode(P.authCmd, "printAuthCommandHelp", [39, 46], "向 stdout 打印 auth 子命令用法。", ["cli", "documentation"], "simple"),
	fnNode(P.authCmd, "parseAuthCommand", [48, 96], "解析 auth check/print-api-key/print-bearer-token 及其 flag。", ["cli", "parser", "auth"], "moderate"),
	fnNode(P.authCmd, "validateAuthCommandArgs", [98, 118], "要求 --provider 或 --model，并拒绝未知 flag 与多余位置参数。", ["validation", "auth", "cli"], "moderate"),
	fnNode(P.authCmd, "getAuthCredential", [120, 126], "从 AuthResult 提取 apiKey 或 Authorization Bearer token。", ["auth", "credentials"], "simple"),

	fnNode(P.cred, "resolveCredentialForPrint", [17, 87], "解析并校验唯一可打印凭证；OAuth 走 getAuth 以刷新即将过期的 token。", ["auth", "credentials", "cli"], "moderate"),

	fnNode(P.initMsg, "buildInitialMessage", [20, 43], "合并 stdin、文件文本与首条消息，并透传初始图片。", ["utility", "prompt", "cli"], "simple"),

	fnNode(P.listModels, "formatTokenCount", [14, 24], "把 token 数量格式化为 K/M 可读形式。", ["utility", "formatting"], "simple"),
	fnNode(P.listModels, "listModels", [29, 115], "拉取可用模型，可选模糊过滤后打印对齐表格。", ["cli", "models"], "moderate"),

	fnNode(P.trust, "createProjectTrustContext", [7, 62], "组装项目信任 UI 回调（select/input/confirm），非交互模式返回 undefined。", ["factory", "security", "project-trust"], "moderate"),

	fnNode(P.setup, "setupCli", [4, 13], "设置进程身份环境变量并配置 HTTP dispatcher。", ["cli", "entry-point", "http"], "simple"),

	fnNode(P.config, "makeSelfUpdateCommand", [58, 68], "把安装/卸载步骤合成带 display 的 SelfUpdateCommand。", ["utility", "install"], "simple"),
	fnNode(P.config, "detectInstallMethod", [78, 99], "根据 Bun 二进制标记与路径片段判断 npm/pnpm/yarn/bun 安装方式。", ["detection", "install"], "moderate"),
	fnNode(P.config, "getInferredNpmInstall", [101, 118], "从 package 目录形状推断 npm 全局 root/prefix（Windows 自定义 prefix 不推断）。", ["install", "paths"], "simple"),
	fnNode(P.config, "getSelfUpdateCommandForMethod", [120, 192], "按安装方式生成自更新命令（含 npm/pnpm/yarn/bun）。", ["install", "update"], "complex"),
	fnNode(P.config, "readCommandOutput", [194, 209], "同步执行命令并返回 stdout，失败则 undefined。", ["utility", "process"], "simple"),
	fnNode(P.config, "getGlobalPackageRoots", [211, 254], "查询各包管理器全局 node_modules 根路径。", ["install", "paths"], "moderate"),
	fnNode(P.config, "normalizeExistingPathForComparison", [256, 273], "规范化已存在路径，可选解析 symlink。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getEntrypointPackageDir", [285, 296], "从当前模块 URL 向上查找入口包目录。", ["paths", "utility"], "simple"),
	fnNode(P.config, "isSelfUpdatePathWritable", [298, 307], "检测安装路径是否可写以决定能否自动自更新。", ["install", "validation"], "simple"),
	fnNode(P.config, "isManagedByGlobalPackageManager", [309, 318], "判断当前安装是否位于全局包管理器 root 下。", ["install", "validation"], "simple"),
	fnNode(P.config, "getSelfUpdateCommand", [320, 331], "仅当全局安装且路径可写时返回自更新命令。", ["install", "update"], "simple"),
	fnNode(P.config, "getSelfUpdateUnavailableInstruction", [333, 351], "生成无法自动更新时的人工操作说明。", ["install", "update"], "simple"),
	fnNode(P.config, "getUpdateInstruction", [353, 360], "优先返回可执行更新命令，否则返回不可用说明。", ["install", "update"], "simple"),
	fnNode(P.config, "findNodePackageDir", [372, 387], "从 startDir 向上寻找 package.json，并跳过 dist 套娃。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getPackageDir", [389, 401], "解析包资源根目录，支持 PI_PACKAGE_DIR 与 Bun 二进制 execPath。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getThemesDir", [409, 417], "返回随包装运的主题目录。", ["paths", "themes"], "simple"),
	fnNode(P.config, "getExportTemplateDir", [425, 432], "返回 HTML 导出模板目录。", ["paths", "export"], "simple"),
	fnNode(P.config, "getPackageJsonPath", [435, 437], "返回包装运 package.json 路径。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getReadmePath", [440, 442], "返回包装运 README 路径。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getDocsPath", [445, 447], "返回包装运 docs 目录。", ["paths", "documentation"], "simple"),
	fnNode(P.config, "getExamplesPath", [450, 452], "返回包装运 examples 目录。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getChangelogPath", [455, 457], "返回包装运 CHANGELOG 路径。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getInteractiveAssetsDir", [465, 472], "返回交互模式静态资源目录。", ["paths", "assets"], "simple"),
	fnNode(P.config, "getBundledInteractiveAssetPath", [475, 477], "拼接交互模式打包资源文件路径。", ["paths", "assets"], "simple"),
	fnNode(P.config, "expandTildePath", [511, 513], "对用户路径做 normalizePath（当前实现不单独展开 ~）。", ["paths", "utility"], "simple"),
	fnNode(P.config, "getShareViewerUrl", [518, 521], "生成会话分享查看器 URL（可用 PI_SHARE_VIEWER_URL 覆盖）。", ["utility", "share"], "simple"),
	fnNode(P.config, "getAgentDir", [528, 534], "解析用户 agent 配置目录，优先环境变量再回落到 ~/.pi/agent。", ["paths", "config"], "simple"),
	fnNode(P.config, "getCustomThemesDir", [537, 539], "返回用户自定义主题目录。", ["paths", "themes"], "simple"),
	fnNode(P.config, "getModelsPath", [542, 544], "返回 models.json 路径。", ["paths", "models"], "simple"),
	fnNode(P.config, "getAuthPath", [547, 549], "返回 auth.json 路径。", ["paths", "auth"], "simple"),
	fnNode(P.config, "getSettingsPath", [552, 554], "返回 settings.json 路径。", ["paths", "config"], "simple"),
	fnNode(P.config, "getToolsDir", [557, 559], "返回用户 tools 目录。", ["paths", "tools"], "simple"),
	fnNode(P.config, "getBinDir", [562, 564], "返回托管二进制（fd/rg）目录。", ["paths", "tools"], "simple"),
	fnNode(P.config, "getPromptsDir", [567, 569], "返回 prompt templates 目录。", ["paths", "prompts"], "simple"),
	fnNode(P.config, "getSessionsDir", [572, 574], "返回 sessions 目录。", ["paths", "session"], "simple"),
	fnNode(P.config, "getDebugLogPath", [577, 579], "返回调试日志文件路径。", ["paths", "logging"], "simple"),

	fnNode(P.runtime, "extractUserMessageText", [56, 65], "从字符串或多段 content 中拼接用户文本。", ["utility", "messages"], "simple"),
	classNode(P.runtime, "SessionImportFileNotFoundError", [46, 54], "/import 引用的 JSONL 路径不存在时抛出，携带 filePath。", ["error", "session", "import"], "simple"),
	classNode(
		P.runtime,
		"AgentSessionRuntime",
		[74, 414],
		"持有当前会话与 cwd 服务，实现 switch/new/fork/import 的 shutdown、重建与 rebind。",
		["service", "session", "lifecycle"],
		"complex",
	),
	fnNode(P.runtime, "createAgentSessionRuntime", [422, 440], "用 factory 创建初始 runtime，并保存 factory 供后续会话替换复用。", ["factory", "session"], "simple"),

	fnNode(P.services, "applyExtensionFlagValues", [82, 128], "把 CLI 未知 flag 写入扩展 runtime，未知或缺值则记入 diagnostics。", ["validation", "extensions"], "moderate"),
	fnNode(P.services, "createAgentSessionServices", [135, 193], "按 cwd 组装 ModelRuntime、SettingsManager、ResourceLoader 并注册扩展 provider。", ["factory", "service", "session"], "moderate"),
	fnNode(P.services, "createAgentSessionFromServices", [202, 221], "用已创建服务调用 createAgentSession，使会话选项可先对 cwd 解析。", ["factory", "session"], "simple"),

	fnNode(P.session, "parseSkillBlock", [132, 141], "从用户消息解析 <skill name location> 块，失败返回 null。", ["parser", "skills"], "simple"),
	classNode(
		P.session,
		"AgentSession",
		[306, 3552],
		"会话生命周期门面：prompt/steer、工具注册、compaction、bash、模型/thinking 循环、扩展与导出。",
		["service", "session", "lifecycle"],
		"complex",
	),

	fnNode(P.guidance, "getProviderLoginHelp", [6, 12], "返回 /login 说明及 providers.md、models.md 路径。", ["utility", "auth", "documentation"], "simple"),
	fnNode(P.guidance, "formatNoModelsAvailableMessage", [14, 16], "拼接“无可用模型”与登录帮助。", ["utility", "auth"], "simple"),
	fnNode(P.guidance, "formatNoModelSelectedMessage", [18, 20], "拼接“未选模型”与 /model 提示。", ["utility", "auth"], "simple"),
	fnNode(P.guidance, "formatNoApiKeyFoundMessage", [22, 25], "按 provider 名生成缺少 API key 的提示。", ["utility", "auth"], "simple"),

	classNode(P.storage, "FileAuthStorageBackend", [49, 201], "对 auth.json 做同步/异步文件锁读写，创建时使用 0o600。", ["persistence", "auth", "locking"], "complex"),
	classNode(P.storage, "ReadOnlyAuthStorage", [203, 290], "只读 CredentialStore，拒绝 modify/delete。", ["auth", "persistence", "readonly"], "moderate"),
	classNode(P.storage, "InMemoryAuthStorageBackend", [292, 322], "内存锁后端，串行化异步 withLockAsync。", ["auth", "in-memory", "locking"], "simple"),
	classNode(P.storage, "AuthStorage", [327, 490], "CredentialStore 实现：解析 auth.json、热重载、按 provider 读写删除。", ["auth", "persistence", "data-model"], "complex"),
	fnNode(P.storage, "readStoredCredential", [496, 506], "同步读取 auth.json 中某 provider 的原始凭证，不解析 command 配置值。", ["auth", "utility"], "simple"),

	fnNode(P.bash, "executeBashWithOperations", [50, 156], "用 BashOperations.exec 跑命令，流式清理输出并在超额时写入临时文件。", ["shell", "streaming", "service"], "moderate"),

	fnNode(P.eventBus, "createEventBus", [12, 33], "创建带错误隔离的 emit/on/clear 事件总线。", ["factory", "event-handler"], "simple"),

	fnNode(P.exec, "execCommand", [34, 107], "spawn 命令并收集输出，支持 abort 与超时杀进程。", ["shell", "process", "utility"], "moderate"),

	fnNode(P.html, "parseColor", [43, 61], "解析 #RRGGBB 或 rgb() 为 RGB 分量。", ["utility", "color"], "simple"),
	fnNode(P.html, "deriveExportColors", [81, 106], "由主题基色推导导出 HTML 的对比/高亮色。", ["theming", "export"], "moderate"),
	fnNode(P.html, "generateThemeVars", [111, 128], "生成导出页 CSS 变量，必要时从基色派生。", ["theming", "export"], "simple"),
	fnNode(P.html, "generateHtml", [143, 175], "读取导出模板并注入会话 JSON 与主题变量。", ["export", "html", "serialization"], "moderate"),
	fnNode(P.html, "preRenderCustomTools", [183, 230], "用 ToolHtmlRenderer 预渲染扩展工具调用/结果 HTML。", ["export", "extensions", "html"], "moderate"),
	fnNode(P.html, "exportSessionToHtml", [236, 282], "从 SessionManager 导出当前会话 HTML，可选预渲染自定义工具。", ["export", "html", "session"], "moderate"),
	fnNode(P.html, "exportFromFile", [288, 316], "打开任意会话 JSONL 并导出 HTML（无 AgentState）。", ["export", "html", "cli"], "moderate"),
];

const exportedIds = new Set([
	`function:${P.restore}:restoreSandboxEnv`,
	`function:${P.args}:isValidThinkingLevel`,
	`function:${P.args}:normalizeSessionName`,
	`function:${P.args}:parseArgs`,
	`function:${P.args}:printHelp`,
	`function:${P.authCheck}:checkProviderAuth`,
	`function:${P.authCheck}:getProviderCredential`,
	`function:${P.authCheck}:createAuthCheckModelRuntime`,
	`class:${P.authCmd}:AuthCommandError`,
	`function:${P.authCmd}:getAuthCommandName`,
	`function:${P.authCmd}:getAuthCommandUsage`,
	`function:${P.authCmd}:isAuthCommandHelp`,
	`function:${P.authCmd}:printAuthCommandHelp`,
	`function:${P.authCmd}:parseAuthCommand`,
	`function:${P.authCmd}:validateAuthCommandArgs`,
	`function:${P.authCmd}:getAuthCredential`,
	`function:${P.cred}:resolveCredentialForPrint`,
	`function:${P.initMsg}:buildInitialMessage`,
	`function:${P.listModels}:listModels`,
	`function:${P.trust}:createProjectTrustContext`,
	`function:${P.setup}:setupCli`,
	`function:${P.config}:detectInstallMethod`,
	`function:${P.config}:getSelfUpdateCommand`,
	`function:${P.config}:getSelfUpdateUnavailableInstruction`,
	`function:${P.config}:getUpdateInstruction`,
	`function:${P.config}:findNodePackageDir`,
	`function:${P.config}:getPackageDir`,
	`function:${P.config}:getThemesDir`,
	`function:${P.config}:getExportTemplateDir`,
	`function:${P.config}:getPackageJsonPath`,
	`function:${P.config}:getReadmePath`,
	`function:${P.config}:getDocsPath`,
	`function:${P.config}:getExamplesPath`,
	`function:${P.config}:getChangelogPath`,
	`function:${P.config}:getInteractiveAssetsDir`,
	`function:${P.config}:getBundledInteractiveAssetPath`,
	`function:${P.config}:expandTildePath`,
	`function:${P.config}:getShareViewerUrl`,
	`function:${P.config}:getAgentDir`,
	`function:${P.config}:getCustomThemesDir`,
	`function:${P.config}:getModelsPath`,
	`function:${P.config}:getAuthPath`,
	`function:${P.config}:getSettingsPath`,
	`function:${P.config}:getToolsDir`,
	`function:${P.config}:getBinDir`,
	`function:${P.config}:getPromptsDir`,
	`function:${P.config}:getSessionsDir`,
	`function:${P.config}:getDebugLogPath`,
	`function:${P.runtime}:createAgentSessionRuntime`,
	`class:${P.runtime}:SessionImportFileNotFoundError`,
	`class:${P.runtime}:AgentSessionRuntime`,
	`function:${P.services}:createAgentSessionServices`,
	`function:${P.services}:createAgentSessionFromServices`,
	`function:${P.session}:parseSkillBlock`,
	`class:${P.session}:AgentSession`,
	`function:${P.guidance}:getProviderLoginHelp`,
	`function:${P.guidance}:formatNoModelsAvailableMessage`,
	`function:${P.guidance}:formatNoModelSelectedMessage`,
	`function:${P.guidance}:formatNoApiKeyFoundMessage`,
	`class:${P.storage}:FileAuthStorageBackend`,
	`class:${P.storage}:ReadOnlyAuthStorage`,
	`class:${P.storage}:InMemoryAuthStorageBackend`,
	`class:${P.storage}:AuthStorage`,
	`function:${P.storage}:readStoredCredential`,
	`function:${P.bash}:executeBashWithOperations`,
	`function:${P.eventBus}:createEventBus`,
	`function:${P.exec}:execCommand`,
	`function:${P.html}:exportSessionToHtml`,
	`function:${P.html}:exportFromFile`,
]);

for (const n of nodes) {
	if (!Array.isArray(n.tags) || n.tags.length === 0) {
		throw new Error(`empty tags: ${n.id}`);
	}
	const extras = ["typescript", "coding-agent", "source"];
	for (const t of extras) {
		if (n.tags.length >= 3) break;
		if (!n.tags.includes(t)) n.tags.push(t);
	}
	if (n.tags.length < 3 || n.tags.length > 5) {
		throw new Error(`tag count ${n.tags.length} for ${n.id}: ${n.tags}`);
	}
}

const edges = [];

for (const [filePath, imports] of Object.entries(brief.batchImportData)) {
	for (const target of imports) {
		edges.push(edge(`file:${filePath}`, `file:${target}`, "imports", 0.7));
	}
}

for (const n of nodes) {
	if (n.type === "function" || n.type === "class") {
		edges.push(edge(`file:${n.filePath}`, n.id, "contains", 1.0));
		if (exportedIds.has(n.id)) {
			edges.push(edge(`file:${n.filePath}`, n.id, "exports", 0.8));
		}
	}
}

const calls = [
	[`function:${P.authCheck}:checkProviderAuth`, `function:${P.authCmd}:validateAuthCommandArgs`],
	[`function:${P.authCheck}:checkProviderAuth`, `function:packages/coding-agent/src/core/model-resolver.ts:resolveCliModel`],
	[`function:${P.authCheck}:getProviderCredential`, `function:${P.authCmd}:getAuthCredential`],
	[`function:${P.authCheck}:createAuthCheckModelRuntime`, `class:packages/coding-agent/src/core/model-runtime.ts:ModelRuntime`],
	[`function:${P.cred}:resolveCredentialForPrint`, `function:${P.authCmd}:validateAuthCommandArgs`],
	[`function:${P.cred}:resolveCredentialForPrint`, `function:${P.authCmd}:getAuthCredential`],
	[`function:${P.cred}:resolveCredentialForPrint`, `function:packages/coding-agent/src/core/model-resolver.ts:resolveCliModel`],
	[`function:${P.listModels}:listModels`, `function:${P.guidance}:formatNoModelsAvailableMessage`],
	[`function:${P.listModels}:listModels`, `function:packages/tui/src/index.ts:fuzzyFilter`],
	[`function:${P.trust}:createProjectTrustContext`, `function:packages/coding-agent/src/cli/startup-ui.ts:showStartupSelector`],
	[`function:${P.trust}:createProjectTrustContext`, `function:packages/coding-agent/src/cli/startup-ui.ts:showStartupInput`],
	[`function:${P.setup}:setupCli`, `function:packages/coding-agent/src/core/http-dispatcher.ts:configureHttpDispatcher`],
	[`function:${P.guidance}:getProviderLoginHelp`, `function:${P.config}:getDocsPath`],
	[`function:${P.config}:readCommandOutput`, `function:packages/coding-agent/src/utils/child-process.ts:spawnProcessSync`],
	[`function:${P.config}:getPackageDir`, `function:packages/coding-agent/src/utils/paths.ts:normalizePath`],
	[`function:${P.config}:expandTildePath`, `function:packages/coding-agent/src/utils/paths.ts:normalizePath`],
	[`function:${P.services}:createAgentSessionServices`, `function:${P.config}:getAgentDir`],
	[`function:${P.services}:createAgentSessionServices`, `function:packages/coding-agent/src/utils/paths.ts:resolvePath`],
	[`function:${P.services}:createAgentSessionServices`, `class:packages/coding-agent/src/core/model-runtime.ts:ModelRuntime`],
	[`function:${P.services}:createAgentSessionServices`, `class:packages/coding-agent/src/core/settings-manager.ts:SettingsManager`],
	[`function:${P.services}:createAgentSessionServices`, `class:packages/coding-agent/src/core/resource-loader.ts:DefaultResourceLoader`],
	[`function:${P.services}:createAgentSessionFromServices`, `function:packages/coding-agent/src/core/sdk.ts:createAgentSession`],
	[`function:${P.runtime}:createAgentSessionRuntime`, `function:packages/coding-agent/src/core/session-cwd.ts:assertSessionCwdExists`],
	[`class:${P.runtime}:AgentSessionRuntime`, `function:packages/coding-agent/src/core/extensions/runner.ts:emitSessionShutdownEvent`],
	[`class:${P.runtime}:AgentSessionRuntime`, `class:packages/coding-agent/src/core/session-manager.ts:SessionManager`],
	[`class:${P.session}:AgentSession`, `function:${P.bash}:executeBashWithOperations`],
	[`class:${P.session}:AgentSession`, `function:${P.html}:exportSessionToHtml`],
	[`class:${P.session}:AgentSession`, `function:${P.guidance}:formatNoApiKeyFoundMessage`],
	[`class:${P.session}:AgentSession`, `function:${P.guidance}:formatNoModelSelectedMessage`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/export-html/tool-renderer.ts:createToolHtmlRenderer`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/extensions/runner.ts:emitSessionShutdownEvent`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/prompt-templates.ts:expandPromptTemplate`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/session-export.ts:exportSessionToJsonl`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/session-manager.ts:getLatestCompactionEntry`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/system-prompt.ts:buildSystemPrompt`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/tools/bash.ts:createLocalBashOperations`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/tools/index.ts:createAllToolDefinitions`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:createToolDefinitionFromAgentTool`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/usage-totals.ts:addUsageToTotals`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/core/usage-totals.ts:createUsageTotals`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/utils/frontmatter.ts:stripFrontmatter`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/utils/sleep.ts:sleep`],
	[`class:${P.session}:AgentSession`, `function:packages/coding-agent/src/utils/tool-result-images.ts:normalizeToolResultImages`],
	[`class:${P.storage}:FileAuthStorageBackend`, `function:${P.config}:getAgentDir`],
	[`class:${P.storage}:FileAuthStorageBackend`, `function:packages/coding-agent/src/utils/paths.ts:normalizePath`],
	[`class:${P.storage}:ReadOnlyAuthStorage`, `function:${P.config}:getAgentDir`],
	[`class:${P.storage}:ReadOnlyAuthStorage`, `function:packages/coding-agent/src/core/resolve-config-value.ts:resolveConfigValue`],
	[`class:${P.storage}:AuthStorage`, `function:${P.config}:getAgentDir`],
	[`class:${P.storage}:AuthStorage`, `function:packages/coding-agent/src/core/resolve-config-value.ts:resolveConfigValue`],
	[`class:${P.storage}:AuthStorage`, `function:packages/coding-agent/src/utils/paths.ts:getFileRevision`],
	[`function:${P.storage}:readStoredCredential`, `function:${P.config}:getAgentDir`],
	[`function:${P.storage}:readStoredCredential`, `function:packages/coding-agent/src/utils/text.ts:stripBom`],
	[`function:${P.storage}:readStoredCredential`, `function:packages/coding-agent/src/utils/paths.ts:normalizePath`],
	[`function:${P.bash}:executeBashWithOperations`, `function:packages/coding-agent/src/core/tools/truncate.ts:truncateTail`],
	[`function:${P.bash}:executeBashWithOperations`, `function:packages/coding-agent/src/utils/ansi.ts:stripAnsi`],
	[`function:${P.bash}:executeBashWithOperations`, `function:packages/coding-agent/src/utils/shell.ts:sanitizeBinaryOutput`],
	[`function:${P.exec}:execCommand`, `function:packages/coding-agent/src/utils/child-process.ts:waitForChildProcess`],
	[`function:${P.html}:generateHtml`, `function:${P.config}:getExportTemplateDir`],
	[`function:${P.html}:generateThemeVars`, `function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getResolvedThemeColors`],
	[`function:${P.html}:generateThemeVars`, `function:packages/coding-agent/src/modes/interactive/theme/theme.ts:getThemeExportColors`],
	[`function:${P.html}:exportFromFile`, `class:packages/coding-agent/src/core/session-manager.ts:SessionManager`],
	[`function:${P.html}:exportSessionToHtml`, `class:packages/coding-agent/src/core/session-manager.ts:SessionManager`],
	[`function:${P.html}:exportFromFile`, `function:packages/coding-agent/src/utils/paths.ts:resolvePath`],
];

for (const [source, target] of calls) {
	if (source === target) continue;
	edges.push(edge(source, target, "calls", 0.8));
}

edges.push(edge(`file:${P.ext}`, "file:packages/coding-agent/src/core/extensions/loader.ts", "depends_on", 0.6));
edges.push(edge(`file:${P.ext}`, "file:packages/coding-agent/src/core/extensions/runner.ts", "depends_on", 0.6));

const ids = new Set(nodes.map((n) => n.id));
if (ids.size !== nodes.length) {
	const seen = new Map();
	for (const n of nodes) {
		seen.set(n.id, (seen.get(n.id) || 0) + 1);
	}
	throw new Error(`duplicate node ids: ${[...seen.entries()].filter(([, c]) => c > 1).map(([id]) => id)}`);
}

const expectedFiles = brief.files.map((f) => f.path).sort();
const fileNodes = nodes.filter((n) => n.type === "file").map((n) => n.filePath).sort();
if (JSON.stringify(expectedFiles) !== JSON.stringify(fileNodes)) {
	throw new Error(`file node mismatch\nexpected ${expectedFiles}\ngot ${fileNodes}`);
}

const importCount = Object.values(brief.batchImportData).reduce((n, arr) => n + arr.length, 0);
const importEdges = edges.filter((e) => e.type === "imports");
if (importEdges.length !== importCount) {
	throw new Error(`imports ${importEdges.length} !== expected ${importCount}`);
}

const extractByPath = new Map(extract.results.map((r) => [r.path, r]));
for (const n of nodes) {
	if (n.type !== "function" && n.type !== "class") continue;
	const r = extractByPath.get(n.filePath);
	if (!r) throw new Error(`no extract for ${n.filePath}`);
	const pool = n.type === "function" ? r.functions : r.classes;
	const hit = (pool || []).find((x) => x.name === n.name);
	if (!hit) throw new Error(`symbol ${n.id} not in extract`);
	if (hit.startLine !== n.lineRange[0] || hit.endLine !== n.lineRange[1]) {
		throw new Error(`lineRange mismatch ${n.id} extract=${hit.startLine}-${hit.endLine} node=${n.lineRange}`);
	}
}

const nodeCount = nodes.length;
const edgeCount = edges.length;
let parts = nodeCount <= 60 && edgeCount <= 120 ? 1 : Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));

const filesSorted = [...expectedFiles];

function groupsForParts(p) {
	const chunkSize = Math.ceil(filesSorted.length / p);
	const groups = [];
	for (let i = 0; i < filesSorted.length; i += chunkSize) {
		groups.push(filesSorted.slice(i, i + chunkSize));
	}
	return groups;
}

function partFits(groups) {
	return groups.every((group) => {
		const fileSet = new Set(group);
		const partNodes = nodes.filter((n) => nodeAllowed(n, fileSet));
		const partIds = new Set(partNodes.map((n) => n.id));
		const partEdges = edges.filter((e) => partIds.has(e.source));
		return partNodes.length <= 60 && partEdges.length <= 120;
	});
}

function nodeAllowed(n, fileSet) {
	return fileSet.has(n.filePath);
}

let fileGroups = groupsForParts(parts);
while (!partFits(fileGroups) && parts < filesSorted.length) {
	parts += 1;
	fileGroups = groupsForParts(parts);
}

function targetOk(target, partNodeIds) {
	if (partNodeIds.has(target)) return true;
	const mFile = /^file:(.+)$/.exec(target);
	if (mFile) return neighborPaths.has(mFile[1]) || brief.batchImportData[mFile[1]];
	const mSym = /^(function|class):(.+):([^:]+)$/.exec(target);
	if (mSym) {
		const path = mSym[2];
		const name = mSym[3];
		if (partNodeIds.has(target)) return true;
		if (ids.has(target)) return true;
		return neighborSymbols.has(`${path}:${name}`) || neighborPaths.has(path);
	}
	return false;
}

const outDir = join(UA_DIR, "intermediate");
mkdirSync(outDir, { recursive: true });
for (const name of readdirSync(outDir)) {
	if (/^batch-11(?:-part-\d+)?\.json$/.test(name)) {
		unlinkSync(join(outDir, name));
	}
}

const written = [];
if (parts === 1) {
	const payload = { nodes, edges };
	const dest = join(outDir, "batch-11.json");
	writeFileSync(dest, JSON.stringify(payload, null, 2) + "\n");
	written.push({ file: dest, nodes: nodes.length, edges: edges.length });
} else {
	for (let i = 0; i < fileGroups.length; i++) {
		const fileSet = new Set(fileGroups[i]);
		const partNodes = nodes.filter((n) => nodeAllowed(n, fileSet));
		const partIds = new Set(partNodes.map((n) => n.id));
		const partEdges = edges.filter((e) => partIds.has(e.source));
		const bad = [];
		for (const e of partEdges) {
			if (!targetOk(e.target, partIds)) {
				bad.push(`${e.source} -> ${e.target} (${e.type})`);
			}
		}
		if (bad.length) {
			throw new Error(`part ${i + 1} validation failed:\n${bad.join("\n")}`);
		}
		const dest = join(outDir, `batch-11-part-${i + 1}.json`);
		writeFileSync(dest, JSON.stringify({ nodes: partNodes, edges: partEdges }, null, 2) + "\n");
		written.push({
			file: dest,
			files: fileGroups[i],
			nodes: partNodes.length,
			edges: partEdges.length,
		});
	}
}

console.log(JSON.stringify({
	scriptCompleted: extract.scriptCompleted,
	filesAnalyzed: extract.filesAnalyzed,
	filesSkipped: extract.filesSkipped,
	nodeCount,
	edgeCount,
	parts,
	importEdges: importEdges.length,
	contains: edges.filter((e) => e.type === "contains").length,
	exports: edges.filter((e) => e.type === "exports").length,
	calls: edges.filter((e) => e.type === "calls").length,
	written,
}, null, 2));
