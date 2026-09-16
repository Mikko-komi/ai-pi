import fs from "node:fs";

const UA_DIR = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua";
const extract = JSON.parse(fs.readFileSync(`${UA_DIR}/tmp/ua-file-extract-results-15.json`, "utf8"));
const brief = JSON.parse(fs.readFileSync(`${UA_DIR}/intermediate/batch-briefs/batch-15.json`, "utf8"));

const byPath = Object.fromEntries(extract.results.map((r) => [r.path, r]));

function fnMeta(path, name) {
	const f = (byPath[path].functions || []).find((x) => x.name === name);
	if (!f) throw new Error(`missing function ${path}:${name}`);
	return { startLine: f.startLine, endLine: f.endLine };
}

function classMeta(path, name) {
	const c = (byPath[path].classes || []).find((x) => x.name === name);
	if (!c) throw new Error(`missing class ${path}:${name}`);
	return { startLine: c.startLine, endLine: c.endLine };
}

const fileNodes = {
	"packages/coding-agent/src/experimental/cli.ts": {
		summary: "实验 CLI 入口：先跑 experimental 命令，未处理则回退到主 CLI main。",
		tags: ["入口点", "cli", "experimental"],
		complexity: "simple",
	},
	"packages/coding-agent/src/index.ts": {
		summary: "coding-agent 公共 API barrel，再导出 session、工具、扩展、模式与 TUI 组件。",
		tags: ["entry-point", "barrel", "sdk"],
		complexity: "moderate",
		languageNotes: "大量 TypeScript 再导出，自身无实现逻辑。",
	},
	"packages/coding-agent/src/main.ts": {
		summary: "编码代理 CLI 主入口：解析参数、迁移、鉴权与项目信任，再启动 interactive/print/rpc 模式。",
		tags: ["入口点", "cli", "orchestrator"],
		complexity: "complex",
	},
	"packages/coding-agent/src/migrations.ts": {
		summary: "启动时一次性迁移：auth.json、session 目录、prompts/bin 与扩展弃用检查。",
		tags: ["migration", "startup", "兼容"],
		complexity: "complex",
	},
	"packages/coding-agent/src/modes/index.ts": {
		summary: "运行模式 barrel，再导出 InteractiveMode、print/rpc 入口与 RPC 协议类型。",
		tags: ["barrel", "modes", "re-export"],
		complexity: "simple",
	},
	"packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts": {
		summary: "交互模式模型目录刷新协调器：合并并发 refresh，并让各调用方独立取消。",
		tags: ["model-catalog", "concurrency", "cancellation"],
		complexity: "simple",
	},
	"packages/coding-agent/src/modes/interactive/theme/theme-json.ts": {
		summary: "用 TypeBox 校验用户主题 JSON，避免把 ~17MB 校验依赖打进仅用内置主题的路径。",
		tags: ["validation", "theme", "typebox"],
		complexity: "moderate",
		languageNotes: "校验与 theme.ts 拆开，避免无谓加载 typebox。",
	},
	"packages/coding-agent/src/modes/json-event.ts": {
		summary: "把 AgentSession 事件转成 print/rpc 可序列化的 JSON 事件。",
		tags: ["serialization", "json", "event-handler"],
		complexity: "simple",
	},
	"packages/coding-agent/src/modes/print-mode.ts": {
		summary: "单次 print 模式：发送 prompt，输出最终文本或 JSON 事件流后退出。",
		tags: ["cli-mode", "print", "json-stream"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/modes/rpc/jsonl.ts": {
		summary: "JSONL 编解码：序列化单行 JSON，并从流按行读取回调。",
		tags: ["jsonl", "serialization", "streaming"],
		complexity: "simple",
	},
	"packages/coding-agent/src/modes/rpc/rpc-client.ts": {
		summary: "RPC 客户端：spawn `--mode rpc` 子进程，用 JSONL 封装 prompt、session 与模型操作。",
		tags: ["rpc", "client", "jsonl"],
		complexity: "complex",
	},
	"packages/coding-agent/src/modes/rpc/rpc-mode.ts": {
		summary: "无头 RPC 服务循环：读 stdin 命令、接管 stdout，输出事件、响应与扩展 UI 请求。",
		tags: ["rpc", "server", "cli-mode"],
		complexity: "complex",
	},
	"packages/coding-agent/src/modes/rpc/rpc-types.ts": {
		summary: "RPC 协议类型：stdin 命令、stdout 响应/事件、扩展 UI 请求与会话状态。",
		tags: ["type-definition", "rpc", "protocol"],
		complexity: "complex",
		languageNotes: "仅 TypeScript 类型联合，无运行时实现。",
	},
	"packages/coding-agent/src/package-manager-cli.ts": {
		summary: "config/package CLI：扩展安装卸载、模型目录刷新，以及托管/npm/Windows 自更新。",
		tags: ["cli", "package-manager", "self-update"],
		complexity: "complex",
	},
	"packages/coding-agent/src/rpc-entry.ts": {
		summary: "RPC 进程入口：设置进程标题与环境后，强制以 `--mode rpc` 调用 main。",
		tags: ["入口点", "rpc", "cli"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/abort.ts": {
		summary: "AbortSignal 辅助：提取 abort reason，并让 Promise 与 signal 竞态。",
		tags: ["utility", "abort", "cancellation"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/child-process.ts": {
		summary: "跨平台 spawn/spawnSync，以及带 idle timeout 的子进程等待与流清理。",
		tags: ["utility", "child-process", "spawn"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/utils/frontmatter.ts": {
		summary: "解析或剥离文档开头的 YAML frontmatter，供 skill/prompt 加载使用。",
		tags: ["utility", "frontmatter", "parsing"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/git.ts": {
		summary: "解析 git URL/SCP 源，拆出 host、path、ref，并拦截不安全安装路径。",
		tags: ["utility", "git", "validation"],
		complexity: "complex",
	},
	"packages/coding-agent/src/utils/json.ts": {
		summary: "去掉 JSON 中的 // 行注释，同时保留字符串字面量。",
		tags: ["utility", "json", "parsing"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/management-http.ts": {
		summary: "管理端 HTTP fetch：超时、可重试状态码，并组合父级 AbortSignal。",
		tags: ["utility", "http", "retry"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/utils/paths.ts": {
		summary: "路径规范化、cwd 相对路径、Windows/WSL 路径，以及云同步忽略属性标记。",
		tags: ["utility", "paths", "filesystem"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/utils/pi-user-agent.ts": {
		summary: "构造 pi 管理请求使用的 User-Agent 字符串。",
		tags: ["utility", "http", "user-agent"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/shell.ts": {
		summary: "解析 bash/PowerShell 配置、净化二进制输出，并跟踪/杀掉脱离的子进程树。",
		tags: ["utility", "shell", "process"],
		complexity: "complex",
	},
	"packages/coding-agent/src/utils/sleep.ts": {
		summary: "可被 AbortSignal 取消的 sleep Promise。",
		tags: ["utility", "async", "abort"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/text.ts": {
		summary: "检测并剥离 UTF-8 BOM，供配置/迁移读取使用。",
		tags: ["utility", "text", "bom"],
		complexity: "simple",
	},
	"packages/coding-agent/src/utils/version-check.ts": {
		summary: "查询最新 pi release、比较 semver，并格式化版本检查错误。",
		tags: ["utility", "versioning", "update-check"],
		complexity: "moderate",
	},
	"packages/coding-agent/src/utils/windows-self-update.ts": {
		summary: "Windows 自更新时隔离已加载的原生依赖，并清理隔离目录，避免文件锁。",
		tags: ["utility", "windows", "self-update"],
		complexity: "moderate",
	},
};

const symbols = [
	// main.ts
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "readPipedStdin",
		exported: false,
		summary: "非 TTY 时读取管道 stdin 全文；交互终端返回 undefined。",
		tags: ["cli", "stdin", "io"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "resolveAppMode",
		exported: false,
		summary: "根据 CLI 参数与 stdin/stdout TTY 状态选择 interactive、print 或 rpc 模式。",
		tags: ["cli", "mode", "routing"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "runAuthCommand",
		exported: false,
		summary: "处理 auth 子命令：解析参数、创建 ModelRuntime、校验或打印 provider 凭据。",
		tags: ["cli", "auth", "credentials"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "prepareInitialMessage",
		exported: false,
		summary: "组合 CLI 初始提示、@file 参数与 stdin，并按设置自动缩放图片。",
		tags: ["cli", "prompt", "files"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "resolveSessionPath",
		exported: false,
		summary: "把 session 参数解析为本地 jsonl 路径，支持精确 ID、前缀与文件路径。",
		tags: ["session", "path-resolution", "cli"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "promptConfirm",
		exported: false,
		summary: "用 readline 向用户确认 yes/no，默认接受空输入为是。",
		tags: ["cli", "prompt", "interactive"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "validateForkFlags",
		exported: false,
		summary: "校验 --fork 与 --session/--continue/--resume/--no-session 互斥。",
		tags: ["cli", "validation", "session"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "validateSessionIdFlags",
		exported: false,
		summary: "校验 session 相关 flag 互斥，并验证自定义 session ID 格式。",
		tags: ["cli", "validation", "session"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "createSessionManager",
		exported: true,
		summary: "按 CLI 意图创建、打开、fork、继续或列出 SessionManager。",
		tags: ["session", "factory", "cli"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "buildSessionOptions",
		exported: false,
		summary: "组装 createAgentSession 的模型、thinking、compaction 与工具选项。",
		tags: ["session", "config", "factory"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/main.ts",
		name: "main",
		exported: true,
		summary: "CLI 主流程：迁移、鉴权、信任、构建 runtime，再进入 interactive/print/rpc。",
		tags: ["入口点", "cli", "orchestrator"],
		complexity: "complex",
	},

	// migrations.ts
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "migrateAuthToAuthJson",
		exported: true,
		summary: "把旧 oauth.json 与 settings.json apiKeys 合并写入 auth.json。",
		tags: ["migration", "auth", "filesystem"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "migrateSessionsFromAgentRoot",
		exported: true,
		summary: "将 agent 根目录 jsonl session 迁到按 cwd 分桶的 sessions 目录。",
		tags: ["migration", "session", "filesystem"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "migrateCommandsToPrompts",
		exported: false,
		summary: "把 commands 目录重命名为 prompts，避免覆盖已有 prompts。",
		tags: ["migration", "prompts", "filesystem"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "migrateKeybindingsConfigFile",
		exported: false,
		summary: "迁移按键绑定配置文件到当前 schema。",
		tags: ["migration", "keybindings", "config"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "migrateToolsToBin",
		exported: false,
		summary: "将旧 tools 目录内容迁到 bin，供可执行工具安装使用。",
		tags: ["migration", "tools", "filesystem"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "checkDeprecatedExtensionDirs",
		exported: false,
		summary: "扫描已弃用扩展目录并收集警告文案。",
		tags: ["migration", "extensions", "deprecation"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "migrateExtensionSystem",
		exported: false,
		summary: "对全局与项目扩展目录执行弃用检查。",
		tags: ["migration", "extensions", "deprecation"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "showDeprecationWarnings",
		exported: true,
		summary: "把迁移收集的弃用警告打印到 stderr。",
		tags: ["migration", "cli", "diagnostics"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/migrations.ts",
		name: "runMigrations",
		exported: true,
		summary: "按顺序执行全部启动时一次性迁移并返回弃用警告。",
		tags: ["migration", "startup", "orchestrator"],
		complexity: "simple",
	},

	// model-catalog-refresh
	{
		kind: "class",
		path: "packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts",
		name: "ModelCatalogRefreshCoordinator",
		exported: false,
		summary: "按 ModelRuntime 合并并发目录刷新，并在无等待者时 abort 进行中的请求。",
		tags: ["coordinator", "concurrency", "model-catalog"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts",
		name: "refreshModelCatalogs",
		exported: true,
		summary: "导出入口，委托 coordinator 共享交互模式的全量模型目录刷新。",
		tags: ["model-catalog", "api", "cancellation"],
		complexity: "simple",
	},

	// theme-json
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/interactive/theme/theme-json.ts",
		name: "validateThemeJson",
		exported: true,
		summary: "用编译后的 TypeBox schema 校验主题 JSON，汇总缺失颜色与其它错误。",
		tags: ["validation", "theme", "schema"],
		complexity: "moderate",
	},

	// json-event
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/json-event.ts",
		name: "toJsonAssistantMessageEvent",
		exported: false,
		summary: "将 assistant 消息事件裁剪为可 JSON 序列化的字段集合。",
		tags: ["serialization", "json", "assistant"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/json-event.ts",
		name: "toJsonEvent",
		exported: true,
		summary: "把 AgentSession 事件映射为 print/rpc 使用的 JsonAgentSessionEvent。",
		tags: ["serialization", "json", "event-handler"],
		complexity: "simple",
	},

	// print-mode
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/print-mode.ts",
		name: "runPrintMode",
		exported: true,
		summary: "单次运行：发 prompt、写文本或 JSON 事件，处理信号后释放 runtime。",
		tags: ["cli-mode", "print", "orchestrator"],
		complexity: "moderate",
	},

	// jsonl
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/rpc/jsonl.ts",
		name: "serializeJsonLine",
		exported: true,
		summary: "将任意值序列化为带换行的单行 JSON。",
		tags: ["jsonl", "serialization", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/rpc/jsonl.ts",
		name: "attachJsonlLineReader",
		exported: true,
		summary: "给可读流挂 JSONL 行读取器，返回卸载函数。",
		tags: ["jsonl", "streaming", "io"],
		complexity: "moderate",
	},

	// rpc-client
	{
		kind: "class",
		path: "packages/coding-agent/src/modes/rpc/rpc-client.ts",
		name: "RpcClient",
		exported: true,
		summary: "spawn RPC 子进程并用 JSONL 请求/响应封装 prompt、session、模型与 bash 操作。",
		tags: ["rpc", "client", "process"],
		complexity: "complex",
	},

	// rpc-mode
	{
		kind: "function",
		path: "packages/coding-agent/src/modes/rpc/rpc-mode.ts",
		name: "runRpcMode",
		exported: true,
		summary: "无头 RPC 循环：绑定 session、处理 stdin 命令、输出事件与扩展 UI 请求。",
		tags: ["rpc", "server", "orchestrator"],
		complexity: "complex",
	},

	// package-manager-cli
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "getActiveManagedInstallRoot",
		exported: false,
		summary: "从环境变量或 managed-install.json 解析当前托管安装根目录。",
		tags: ["self-update", "paths", "managed-install"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "runManagedNpmCi",
		exported: false,
		summary: "在托管暂存目录执行 npm ci 安装发行工件。",
		tags: ["self-update", "npm", "child-process"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "verifyManagedRelease",
		exported: false,
		summary: "spawn 校验托管 release 目录中的版本是否匹配预期。",
		tags: ["self-update", "verification", "child-process"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "activateManagedRelease",
		exported: false,
		summary: "原子切换托管安装 current 指针到新 release 并清理旧目录。",
		tags: ["self-update", "filesystem", "managed-install"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "cleanupManagedStaging",
		exported: false,
		summary: "删除托管安装根下的暂存目录。",
		tags: ["self-update", "cleanup", "filesystem"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "cleanupManagedInstall",
		exported: true,
		summary: "加锁后清理托管安装暂存，供主 CLI 启动时调用。",
		tags: ["self-update", "cleanup", "lock"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "runManagedSelfUpdate",
		exported: false,
		summary: "下载、校验并激活托管发行版，完成加锁自更新。",
		tags: ["self-update", "managed-install", "download"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "getPackageCommandUsage",
		exported: false,
		summary: "返回 install/remove/update/list 的用法字符串。",
		tags: ["cli", "help", "package-manager"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "printConfigCommandHelp",
		exported: false,
		summary: "打印 config 子命令帮助到 stdout。",
		tags: ["cli", "help", "config"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "printPackageCommandHelp",
		exported: false,
		summary: "打印 package 子命令的详细帮助与示例。",
		tags: ["cli", "help", "package-manager"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "parsePackageCommand",
		exported: false,
		summary: "解析 install/remove/update/list 参数、目标与 flag。",
		tags: ["cli", "parsing", "package-manager"],
		complexity: "complex",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "refreshModelCatalogs",
		exported: false,
		summary: "用 ModelRuntime 强制刷新模型目录，15 秒超时。",
		tags: ["model-catalog", "package-manager", "network"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "printSelfUpdateUnavailable",
		exported: false,
		summary: "打印当前安装方式无法自更新的说明与可执行文件位置。",
		tags: ["self-update", "cli", "help"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "printSelfUpdateNote",
		exported: false,
		summary: "用 TUI Markdown 渲染自更新发行说明。",
		tags: ["self-update", "markdown", "cli"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "getSelfUpdatePlan",
		exported: false,
		summary: "查询最新 pi release，比较版本后决定是否执行自更新。",
		tags: ["self-update", "versioning", "planning"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "runSelfUpdate",
		exported: false,
		summary: "按 SelfUpdateCommand 步骤 spawn 外部包管理器完成更新。",
		tags: ["self-update", "child-process", "npm"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "createCommandSettingsManager",
		exported: false,
		summary: "为 config/package 命令构建 SettingsManager、资源加载与项目信任上下文。",
		tags: ["settings", "trust", "factory"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "handleConfigCommand",
		exported: true,
		summary: "处理 config 子命令：选择、打开或列出配置文件。",
		tags: ["cli", "config", "api-handler"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/package-manager-cli.ts",
		name: "handlePackageCommand",
		exported: true,
		summary: "处理 install/remove/update/list 与自更新，含托管安装与 Windows 隔离。",
		tags: ["cli", "package-manager", "self-update"],
		complexity: "complex",
	},

	// abort
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/abort.ts",
		name: "operationSignal",
		exported: true,
		summary: "若 signal 未 abort 则返回它，否则返回 undefined。",
		tags: ["abort", "utility", "signal"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/abort.ts",
		name: "raceWithAbortSignal",
		exported: true,
		summary: "让 operation 与 AbortSignal 竞态，abort 时拒绝并清理监听器。",
		tags: ["abort", "async", "cancellation"],
		complexity: "moderate",
	},

	// child-process
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/child-process.ts",
		name: "spawnProcess",
		exported: true,
		summary: "跨平台异步 spawn，优先使用 cross-spawn。",
		tags: ["child-process", "spawn", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/child-process.ts",
		name: "spawnProcessSync",
		exported: true,
		summary: "跨平台同步 spawnSync。",
		tags: ["child-process", "spawn", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/child-process.ts",
		name: "waitForChildProcess",
		exported: true,
		summary: "等待子进程退出，含 idle timeout、stdout/stderr 收集与清理。",
		tags: ["child-process", "async", "timeout"],
		complexity: "moderate",
	},

	// frontmatter
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/frontmatter.ts",
		name: "extractFrontmatter",
		exported: false,
		summary: "从文档开头提取 YAML frontmatter 原文与剩余正文。",
		tags: ["frontmatter", "parsing", "yaml"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/frontmatter.ts",
		name: "parseFrontmatter",
		exported: true,
		summary: "解析 YAML frontmatter 为对象，并返回去掉头部的正文。",
		tags: ["frontmatter", "parsing", "yaml"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/frontmatter.ts",
		name: "stripFrontmatter",
		exported: true,
		summary: "去掉 frontmatter，只返回正文。",
		tags: ["frontmatter", "utility", "text"],
		complexity: "simple",
	},

	// git
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/git.ts",
		name: "splitRef",
		exported: false,
		summary: "从 HTTPS/SCP git URL 拆出仓库地址与可选 ref。",
		tags: ["git", "parsing", "url"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/git.ts",
		name: "hasUnsafeGitInstallPart",
		exported: false,
		summary: "检测 git 路径片段中的 `..`、绝对路径等不安全成分。",
		tags: ["git", "security", "validation"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/git.ts",
		name: "buildGitSource",
		exported: false,
		summary: "组装规范化 GitSource，并校验 path/ref 安全性。",
		tags: ["git", "factory", "validation"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/git.ts",
		name: "parseGenericGitUrl",
		exported: false,
		summary: "解析非 hosted-git-info 覆盖的通用 git URL。",
		tags: ["git", "parsing", "url"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/git.ts",
		name: "parseGitUrl",
		exported: true,
		summary: "解析 npm 风格 git 源为可 clone 的 GitSource，失败返回 undefined。",
		tags: ["git", "parsing", "package-source"],
		complexity: "moderate",
	},

	// json
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/json.ts",
		name: "stripJsonComments",
		exported: true,
		summary: "去掉 JSON 中的 // 注释，保留双引号字符串内容。",
		tags: ["json", "parsing", "utility"],
		complexity: "simple",
	},

	// management-http
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/management-http.ts",
		name: "fetchWithRetry",
		exported: true,
		summary: "带尝试超时、可重试 HTTP 状态码与组合 AbortSignal 的 fetch。",
		tags: ["http", "retry", "network"],
		complexity: "moderate",
	},

	// paths
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "canonicalizePath",
		exported: true,
		summary: "realpath 规范化路径，失败则回退原路径。",
		tags: ["paths", "filesystem", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "getFileRevision",
		exported: true,
		summary: "用 mtime/size 生成文件修订戳，供缓存失效判断。",
		tags: ["paths", "cache", "filesystem"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "isLocalPath",
		exported: true,
		summary: "判断字符串是否为本地路径而非 git/http 源。",
		tags: ["paths", "validation", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "normalizeWindowsShellPath",
		exported: true,
		summary: "把 /mnt/c/... 或 \\wsl$ 风格路径转成 Windows 盘符路径。",
		tags: ["paths", "windows", "wsl"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "normalizePath",
		exported: true,
		summary: "展开 ~、file:// 与 Windows/WSL 路径，得到规范化路径字符串。",
		tags: ["paths", "normalization", "utility"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "resolvePath",
		exported: true,
		summary: "相对 baseDir 解析并规范化路径。",
		tags: ["paths", "resolution", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "getCwdRelativePath",
		exported: true,
		summary: "在目标位于 cwd 下时返回相对路径，否则返回 undefined。",
		tags: ["paths", "cwd", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "formatPathRelativeToCwdOrAbsolute",
		exported: true,
		summary: "优先格式化为相对 cwd 的 POSIX 路径，否则用绝对路径。",
		tags: ["paths", "display", "cwd"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/paths.ts",
		name: "markPathIgnoredByCloudSync",
		exported: true,
		summary: "给路径打上 Dropbox/iCloud 等云同步忽略扩展属性。",
		tags: ["paths", "cloud-sync", "xattr"],
		complexity: "simple",
	},

	// pi-user-agent
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/pi-user-agent.ts",
		name: "getPiUserAgent",
		exported: true,
		summary: "返回 `pi-coding-agent/<version>` 形式的 User-Agent。",
		tags: ["http", "user-agent", "utility"],
		complexity: "simple",
	},

	// shell
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "findExecutableOnPath",
		exported: false,
		summary: "在 PATH 上查找可执行文件，Windows 走 where.exe。",
		tags: ["shell", "path", "lookup"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "getShellConfig",
		exported: true,
		summary: "解析 bash/sh 可执行文件与参数，支持自定义路径与 WSL 旧路径。",
		tags: ["shell", "bash", "config"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "getPowerShellConfig",
		exported: true,
		summary: "查找 pwsh 或 powershell.exe 并返回启动参数。",
		tags: ["shell", "powershell", "config"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "getShellEnv",
		exported: true,
		summary: "构造把 agent binDir 前置到 PATH 的 shell 环境变量。",
		tags: ["shell", "env", "path"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "sanitizeBinaryOutput",
		exported: true,
		summary: "过滤会让 terminal 宽度计算崩溃的控制字符与格式字符。",
		tags: ["shell", "sanitization", "display"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "trackDetachedChildPid",
		exported: true,
		summary: "登记脱离的子进程 PID，便于退出时统一清理。",
		tags: ["shell", "process", "tracking"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "untrackDetachedChildPid",
		exported: true,
		summary: "从脱离子进程跟踪集合中移除 PID。",
		tags: ["shell", "process", "tracking"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "killTrackedDetachedChildren",
		exported: true,
		summary: "杀掉所有已跟踪的脱离子进程树。",
		tags: ["shell", "process", "cleanup"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/shell.ts",
		name: "killProcessTree",
		exported: true,
		summary: "按平台杀掉进程树（Windows taskkill / POSIX 进程组）。",
		tags: ["shell", "process", "cleanup"],
		complexity: "moderate",
	},

	// sleep / text / version-check / windows
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/sleep.ts",
		name: "sleep",
		exported: true,
		summary: "可被 AbortSignal 取消的延时 Promise。",
		tags: ["async", "abort", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/text.ts",
		name: "splitBom",
		exported: true,
		summary: "若内容以 UTF-8 BOM 开头则拆成 BOM 与正文。",
		tags: ["text", "bom", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/text.ts",
		name: "stripBom",
		exported: true,
		summary: "剥离 UTF-8 BOM 后返回正文。",
		tags: ["text", "bom", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/version-check.ts",
		name: "formatVersionCheckError",
		exported: true,
		summary: "把版本检查失败的 Error/cause 格式化为可读错误串。",
		tags: ["versioning", "errors", "diagnostics"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/version-check.ts",
		name: "comparePackageVersions",
		exported: true,
		summary: "用 semver 比较两个包版本，无效版本排后。",
		tags: ["versioning", "semver", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/version-check.ts",
		name: "isNewerPackageVersion",
		exported: true,
		summary: "判断候选版本是否比当前版本更新。",
		tags: ["versioning", "semver", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/version-check.ts",
		name: "getLatestPiRelease",
		exported: true,
		summary: "请求 installer API 获取最新 pi release 元数据。",
		tags: ["versioning", "http", "release"],
		complexity: "moderate",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/version-check.ts",
		name: "getLatestPiVersion",
		exported: true,
		summary: "返回最新 pi 版本号字符串，或在失败时为 undefined。",
		tags: ["versioning", "http", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/version-check.ts",
		name: "checkForNewPiVersion",
		exported: true,
		summary: "若远程版本更新则返回新版本号，否则 undefined。",
		tags: ["versioning", "update-check", "utility"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/windows-self-update.ts",
		name: "getQuarantineRoot",
		exported: false,
		summary: "计算 Windows 自更新隔离目录路径。",
		tags: ["windows", "self-update", "paths"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/windows-self-update.ts",
		name: "getLoadedSharedObjectsInPackageDir",
		exported: false,
		summary: "从 process.report 找出包目录内已加载的原生共享库。",
		tags: ["windows", "native-modules", "diagnostics"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/windows-self-update.ts",
		name: "cleanupWindowsSelfUpdateQuarantine",
		exported: true,
		summary: "删除 Windows 自更新隔离根目录。",
		tags: ["windows", "self-update", "cleanup"],
		complexity: "simple",
	},
	{
		kind: "function",
		path: "packages/coding-agent/src/utils/windows-self-update.ts",
		name: "quarantineWindowsNativeDependencies",
		exported: true,
		summary: "把已加载的原生依赖移出包目录，避免 npm 更新时文件锁。",
		tags: ["windows", "self-update", "native-modules"],
		complexity: "simple",
	},
];

const nodes = [];
const edges = [];
const nodeIds = new Set();

for (const [filePath, meta] of Object.entries(fileNodes)) {
	const id = `file:${filePath}`;
	const name = filePath.split("/").pop();
	const node = {
		id,
		type: "file",
		name,
		filePath,
		summary: meta.summary,
		tags: meta.tags,
		complexity: meta.complexity,
	};
	if (meta.languageNotes) node.languageNotes = meta.languageNotes;
	nodes.push(node);
	nodeIds.add(id);
}

for (const sym of symbols) {
	const loc = sym.kind === "class" ? classMeta(sym.path, sym.name) : fnMeta(sym.path, sym.name);
	const id = `${sym.kind}:${sym.path}:${sym.name}`;
	nodes.push({
		id,
		type: sym.kind,
		name: sym.name,
		filePath: sym.path,
		lineRange: [loc.startLine, loc.endLine],
		summary: sym.summary,
		tags: sym.tags,
		complexity: sym.complexity,
	});
	nodeIds.add(id);
	edges.push({
		source: `file:${sym.path}`,
		target: id,
		type: "contains",
		direction: "forward",
		weight: 1.0,
	});
	if (sym.exported) {
		edges.push({
			source: `file:${sym.path}`,
			target: id,
			type: "exports",
			direction: "forward",
			weight: 0.8,
		});
	}
}

let importCount = 0;
for (const [filePath, imports] of Object.entries(brief.batchImportData)) {
	for (const target of imports) {
		if (target === filePath) continue;
		edges.push({
			source: `file:${filePath}`,
			target: `file:${target}`,
			type: "imports",
			direction: "forward",
			weight: 0.7,
		});
		importCount++;
	}
}

function call(source, target) {
	edges.push({
		source,
		target,
		type: "calls",
		direction: "forward",
		weight: 0.8,
	});
}

// Intra-batch calls that remain in the same alpha chunk (parts of 10 files).
// Part1 files: experimental..jsonl
call("function:packages/coding-agent/src/main.ts:runAuthCommand", "function:packages/coding-agent/src/main.ts:main".replace("main.ts:main", "cli/args.ts:parseArgs"));

// Fix: I accidentally started a bad call. Remove and do proper ones below.
edges.pop();

// Cross-batch calls from main (neighborMap symbols)
const M = "packages/coding-agent/src";
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-command.ts:printAuthCommandHelp`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-command.ts:parseAuthCommand`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-command.ts:getAuthCommandName`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-command.ts:getAuthCommandUsage`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-command.ts:validateAuthCommandArgs`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/args.ts:parseArgs`);
call(`function:${M}/main.ts:runAuthCommand`, `class:${M}/core/model-runtime.ts:ModelRuntime`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/credential-print.ts:resolveCredentialForPrint`);
call(`function:${M}/main.ts:runAuthCommand`, `class:${M}/core/auth-storage.ts:AuthStorage`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-check.ts:createAuthCheckModelRuntime`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-check.ts:checkProviderAuth`);
call(`function:${M}/main.ts:runAuthCommand`, `function:${M}/cli/auth-check.ts:getProviderCredential`);

call(`function:${M}/main.ts:prepareInitialMessage`, `function:${M}/cli/initial-message.ts:buildInitialMessage`);
call(`function:${M}/main.ts:prepareInitialMessage`, `function:${M}/cli/file-processor.ts:processFileArguments`);

call(`function:${M}/main.ts:validateSessionIdFlags`, `function:${M}/core/session-manager.ts:assertValidSessionId`);
call(`function:${M}/main.ts:createSessionManager`, `function:${M}/cli/session-picker.ts:selectSession`);
call(`function:${M}/main.ts:createSessionManager`, `class:${M}/core/session-manager.ts:SessionManager`);
call(`function:${M}/main.ts:buildSessionOptions`, `function:${M}/core/model-resolver.ts:resolveCliModel`);

call(`function:${M}/main.ts:main`, `function:${M}/cli/args.ts:parseArgs`);
call(`function:${M}/main.ts:main`, `function:${M}/cli/args.ts:printHelp`);
call(`function:${M}/main.ts:main`, `function:${M}/cli/list-models.ts:listModels`);
call(`function:${M}/main.ts:main`, `function:${M}/cli/startup-ui.ts:shouldRunFirstTimeSetup`);
call(`function:${M}/main.ts:main`, `function:${M}/cli/startup-ui.ts:showFirstTimeSetup`);
call(`function:${M}/main.ts:main`, `function:${M}/core/export-html/index.ts:exportFromFile`);
call(`function:${M}/main.ts:main`, `function:${M}/core/http-dispatcher.ts:applyHttpProxySettings`);
call(`function:${M}/main.ts:main`, `function:${M}/core/http-dispatcher.ts:configureHttpDispatcher`);
call(`function:${M}/main.ts:main`, `function:${M}/core/output-guard.ts:takeOverStdout`);
call(`function:${M}/main.ts:main`, `function:${M}/core/output-guard.ts:restoreStdout`);
call(`function:${M}/main.ts:main`, `function:${M}/core/agent-session-runtime.ts:createAgentSessionRuntime`);
call(`function:${M}/main.ts:main`, `function:${M}/core/agent-session-services.ts:createAgentSessionServices`);
call(`function:${M}/main.ts:main`, `function:${M}/core/agent-session-services.ts:createAgentSessionFromServices`);
call(`function:${M}/main.ts:main`, `function:${M}/core/settings-diagnostics.ts:collectSettingsDiagnostics`);
call(`function:${M}/main.ts:main`, `function:${M}/core/settings-diagnostics.ts:deduplicateDiagnostics`);
call(`function:${M}/main.ts:main`, `class:${M}/core/settings-manager.ts:SettingsManager`);
call(`function:${M}/main.ts:main`, `function:${M}/core/timings.ts:resetTimings`);
call(`function:${M}/main.ts:main`, `function:${M}/core/timings.ts:printTimings`);
call(`function:${M}/main.ts:main`, `function:${M}/core/trust-manager.ts:hasTrustRequiringProjectResources`);
call(`function:${M}/main.ts:main`, `function:${M}/core/session-cwd.ts:getMissingSessionCwdIssue`);
call(`function:${M}/main.ts:main`, `function:${M}/core/auth-guidance.ts:formatNoModelsAvailableMessage`);
call(`function:${M}/main.ts:main`, `function:${M}/core/project-trust.ts:resolveProjectTrusted`);
call(`function:${M}/main.ts:main`, `function:${M}/cli/project-trust.ts:createProjectTrustContext`);
call(`function:${M}/main.ts:main`, `function:${M}/core/model-resolver.ts:resolveModelScope`);
call(`function:${M}/main.ts:main`, `function:${M}/modes/interactive/theme/theme.ts:setThemeJsonValidator`);
call(`function:${M}/main.ts:main`, `function:${M}/modes/interactive/theme/theme.ts:initTheme`);
call(`function:${M}/main.ts:main`, `function:${M}/config.ts:expandTildePath`);

// Intra-batch same-part (part 1)
call(`function:${M}/main.ts:main`, `function:${M}/migrations.ts:runMigrations`);
call(`function:${M}/main.ts:main`, `function:${M}/migrations.ts:showDeprecationWarnings`);
call(`function:${M}/main.ts:main`, `function:${M}/modes/print-mode.ts:runPrintMode`);
call(`function:${M}/main.ts:main`, `function:${M}/modes/interactive/theme/theme-json.ts:validateThemeJson`);
call(`function:${M}/main.ts:prepareInitialMessage`, `function:${M}/main.ts:readPipedStdin`.replace("prepareInitialMessage", "x"));
edges.pop();

call(`function:${M}/modes/print-mode.ts:runPrintMode`, `function:${M}/modes/json-event.ts:toJsonEvent`);
call(`function:${M}/modes/print-mode.ts:runPrintMode`, `function:${M}/core/output-guard.ts:writeRawStdout`);
call(`function:${M}/modes/print-mode.ts:runPrintMode`, `function:${M}/core/output-guard.ts:waitForRawStdoutBackpressure`);
call(`function:${M}/modes/print-mode.ts:runPrintMode`, `function:${M}/core/output-guard.ts:flushRawStdout`);

call(`function:${M}/modes/json-event.ts:toJsonEvent`, `function:${M}/modes/json-event.ts:toJsonAssistantMessageEvent`);

call(`function:${M}/migrations.ts:migrateAuthToAuthJson`, `function:${M}/config.ts:getAgentDir`);
call(`function:${M}/migrations.ts:migrateSessionsFromAgentRoot`, `function:${M}/config.ts:getAgentDir`);
call(`function:${M}/migrations.ts:migrateKeybindingsConfigFile`, `function:${M}/core/keybindings.ts:migrateKeybindingsConfig`);

call(`function:${M}/modes/interactive/model-catalog-refresh.ts:refreshModelCatalogs`, `class:${M}/modes/interactive/model-catalog-refresh.ts:ModelCatalogRefreshCoordinator`);

// Part 2 intra + cross
call(`class:${M}/modes/rpc/rpc-client.ts:RpcClient`, `function:${M}/modes/rpc/jsonl.ts:attachJsonlLineReader`);
call(`class:${M}/modes/rpc/rpc-client.ts:RpcClient`, `function:${M}/modes/rpc/jsonl.ts:serializeJsonLine`);

call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/core/output-guard.ts:takeOverStdout`);
call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/core/output-guard.ts:writeRawStdout`);
call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/core/output-guard.ts:waitForRawStdoutBackpressure`);
call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/core/output-guard.ts:flushRawStdout`);
call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/modes/rpc/jsonl.ts:serializeJsonLine`);
call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/modes/rpc/jsonl.ts:attachJsonlLineReader`);
call(`function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`, `function:${M}/modes/json-event.ts:toJsonEvent`);

call(`function:${M}/package-manager-cli.ts:getActiveManagedInstallRoot`, `function:${M}/utils/paths.ts:canonicalizePath`);
call(`function:${M}/package-manager-cli.ts:getActiveManagedInstallRoot`, `function:${M}/utils/paths.ts:getCwdRelativePath`);
call(`function:${M}/package-manager-cli.ts:getActiveManagedInstallRoot`, `function:${M}/config.ts:getPackageDir`);
call(`function:${M}/package-manager-cli.ts:runManagedNpmCi`, `function:${M}/utils/child-process.ts:waitForChildProcess`);
call(`function:${M}/package-manager-cli.ts:runManagedNpmCi`, `function:${M}/utils/child-process.ts:spawnProcess`);
call(`function:${M}/package-manager-cli.ts:verifyManagedRelease`, `function:${M}/utils/child-process.ts:spawnProcessSync`);
call(`function:${M}/package-manager-cli.ts:refreshModelCatalogs`, `class:${M}/core/model-runtime.ts:ModelRuntime`);
call(`function:${M}/package-manager-cli.ts:getSelfUpdatePlan`, `function:${M}/utils/version-check.ts:getLatestPiRelease`);
call(`function:${M}/package-manager-cli.ts:getSelfUpdatePlan`, `function:${M}/utils/version-check.ts:formatVersionCheckError`);
call(`function:${M}/package-manager-cli.ts:getSelfUpdatePlan`, `function:${M}/utils/version-check.ts:isNewerPackageVersion`);
call(`function:${M}/package-manager-cli.ts:runSelfUpdate`, `function:${M}/utils/child-process.ts:spawnProcess`);
call(`function:${M}/package-manager-cli.ts:handleConfigCommand`, `function:${M}/cli/config-selector.ts:selectConfig`);
call(`function:${M}/package-manager-cli.ts:createCommandSettingsManager`, `class:${M}/core/settings-manager.ts:SettingsManager`);
call(`function:${M}/package-manager-cli.ts:createCommandSettingsManager`, `function:${M}/cli/project-trust.ts:createProjectTrustContext`);
call(`function:${M}/package-manager-cli.ts:createCommandSettingsManager`, `function:${M}/core/project-trust.ts:resolveProjectTrusted`);
call(`function:${M}/package-manager-cli.ts:createCommandSettingsManager`, `function:${M}/core/trust-manager.ts:hasTrustRequiringProjectResources`);
call(`function:${M}/package-manager-cli.ts:createCommandSettingsManager`, `class:${M}/core/trust-manager.ts:ProjectTrustStore`);
call(`function:${M}/package-manager-cli.ts:handlePackageCommand`, `class:${M}/core/package-manager.ts:DefaultPackageManager`);

// Part 3
call(`function:${M}/utils/version-check.ts:getLatestPiRelease`, `function:${M}/utils/management-http.ts:fetchWithRetry`);
call(`function:${M}/utils/version-check.ts:getLatestPiRelease`, `function:${M}/utils/pi-user-agent.ts:getPiUserAgent`);
call(`function:${M}/utils/version-check.ts:getLatestPiVersion`, `function:${M}/utils/version-check.ts:getLatestPiRelease`);
call(`function:${M}/utils/version-check.ts:checkForNewPiVersion`, `function:${M}/utils/version-check.ts:getLatestPiRelease`);
call(`function:${M}/utils/version-check.ts:checkForNewPiVersion`, `function:${M}/utils/version-check.ts:isNewerPackageVersion`);
call(`function:${M}/utils/version-check.ts:isNewerPackageVersion`, `function:${M}/utils/version-check.ts:comparePackageVersions`);

call(`function:${M}/utils/windows-self-update.ts:quarantineWindowsNativeDependencies`, `function:${M}/utils/paths.ts:getCwdRelativePath`);
call(`function:${M}/utils/windows-self-update.ts:cleanupWindowsSelfUpdateQuarantine`, `function:${M}/utils/windows-self-update.ts:getQuarantineRoot`);
call(`function:${M}/utils/windows-self-update.ts:quarantineWindowsNativeDependencies`, `function:${M}/utils/windows-self-update.ts:getQuarantineRoot`);
call(`function:${M}/utils/windows-self-update.ts:quarantineWindowsNativeDependencies`, `function:${M}/utils/windows-self-update.ts:getLoadedSharedObjectsInPackageDir`);

call(`function:${M}/utils/frontmatter.ts:parseFrontmatter`, `function:${M}/utils/frontmatter.ts:extractFrontmatter`);
call(`function:${M}/utils/frontmatter.ts:stripFrontmatter`, `function:${M}/utils/frontmatter.ts:parseFrontmatter`);
call(`function:${M}/utils/frontmatter.ts:extractFrontmatter`, `function:${M}/utils/text.ts:stripBom`);
call(`function:${M}/utils/git.ts:parseGitUrl`, `function:${M}/utils/git.ts:parseGenericGitUrl`);
call(`function:${M}/utils/git.ts:parseGenericGitUrl`, `function:${M}/utils/git.ts:splitRef`);
call(`function:${M}/utils/git.ts:buildGitSource`, `function:${M}/utils/git.ts:hasUnsafeGitInstallPart`);
call(`function:${M}/utils/paths.ts:resolvePath`, `function:${M}/utils/paths.ts:normalizePath`);
call(`function:${M}/utils/paths.ts:normalizePath`, `function:${M}/utils/paths.ts:normalizeWindowsShellPath`);
call(`function:${M}/utils/paths.ts:getCwdRelativePath`, `function:${M}/utils/paths.ts:resolvePath`);
call(`function:${M}/utils/paths.ts:formatPathRelativeToCwdOrAbsolute`, `function:${M}/utils/paths.ts:getCwdRelativePath`);
call(`function:${M}/utils/paths.ts:markPathIgnoredByCloudSync`, `function:${M}/utils/child-process.ts:spawnProcessSync`);
call(`function:${M}/utils/shell.ts:getShellConfig`, `function:${M}/utils/shell.ts:findExecutableOnPath`);
call(`function:${M}/utils/shell.ts:getPowerShellConfig`, `function:${M}/utils/shell.ts:findExecutableOnPath`);
call(`function:${M}/utils/shell.ts:getShellEnv`, `function:${M}/config.ts:getBinDir`);
call(`function:${M}/utils/shell.ts:killTrackedDetachedChildren`, `function:${M}/utils/shell.ts:killProcessTree`);
call(`function:${M}/utils/text.ts:stripBom`, `function:${M}/utils/text.ts:splitBom`);

// Additional intra-batch calls used by main (cross-part; keep as function targets —
// validation allows neighborMap symbols OR same-part nodes. These same-batch
// targets will be checked after split.)
call(`function:${M}/main.ts:main`, `function:${M}/package-manager-cli.ts:cleanupManagedInstall`);
call(`function:${M}/main.ts:main`, `function:${M}/package-manager-cli.ts:handlePackageCommand`);
call(`function:${M}/main.ts:main`, `function:${M}/package-manager-cli.ts:handleConfigCommand`);
call(`function:${M}/main.ts:main`, `function:${M}/modes/rpc/rpc-mode.ts:runRpcMode`);
call(`function:${M}/main.ts:main`, `function:${M}/utils/windows-self-update.ts:cleanupWindowsSelfUpdateQuarantine`);
call(`function:${M}/main.ts:main`, `function:${M}/utils/paths.ts:normalizePath`);
call(`function:${M}/main.ts:resolveSessionPath`, `function:${M}/utils/paths.ts:resolvePath`);
call(`function:${M}/main.ts:buildSessionOptions`.replace("buildSessionOptions", "resolveCliPaths"), `function:${M}/utils/paths.ts:isLocalPath`);
// resolveCliPaths was not emitted as a node (9 lines, not exported). Drop that last call.
edges.pop();

call(`function:${M}/package-manager-cli.ts:handlePackageCommand`, `function:${M}/utils/windows-self-update.ts:cleanupWindowsSelfUpdateQuarantine`);
call(`function:${M}/package-manager-cli.ts:handlePackageCommand`, `function:${M}/utils/windows-self-update.ts:quarantineWindowsNativeDependencies`);

// Dedup edges
const edgeKey = (e) => `${e.source}|${e.target}|${e.type}`;
const seen = new Set();
const deduped = [];
for (const e of edges) {
	const k = edgeKey(e);
	if (seen.has(k)) continue;
	if (e.source === e.target) continue;
	seen.add(k);
	deduped.push(e);
}

const allNodes = nodes;
const allEdges = deduped;

const expectedImports = Object.values(brief.batchImportData).reduce((n, a) => n + a.length, 0);
const actualImports = allEdges.filter((e) => e.type === "imports").length;
if (actualImports !== expectedImports) {
	throw new Error(`import edges ${actualImports} !== expected ${expectedImports}`);
}

const missingFiles = brief.files.map((f) => f.path).filter((p) => !fileNodes[p]);
if (missingFiles.length) throw new Error(`missing file nodes: ${missingFiles.join(",")}`);

// Split
const filePaths = brief.files.map((f) => f.path).sort();

const neighborPaths = new Set();
const neighborSymbols = new Set();
for (const [src, neighbors] of Object.entries(brief.neighborMap)) {
	neighborPaths.add(src);
	for (const n of neighbors) {
		neighborPaths.add(n.path);
		for (const s of n.symbols || []) {
			neighborSymbols.add(`${n.path}:${s}`);
		}
	}
}
for (const [src, imports] of Object.entries(brief.batchImportData)) {
	neighborPaths.add(src);
	for (const p of imports) neighborPaths.add(p);
}

function targetOk(target, partNodeIds) {
	if (partNodeIds.has(target)) return true;
	if (target.startsWith("file:")) {
		const p = target.slice("file:".length);
		return neighborPaths.has(p);
	}
	const m = target.match(/^(function|class):(.+):([^:]+)$/);
	if (m) {
		const [, , path, symbol] = m;
		return neighborSymbols.has(`${path}:${symbol}`);
	}
	return false;
}

function partition(parts, edges) {
	const chunkSize = Math.ceil(filePaths.length / parts);
	const written = [];
	const failed = [];
	for (let i = 0; i < parts; i++) {
		const partFiles = new Set(filePaths.slice(i * chunkSize, (i + 1) * chunkSize));
		const partNodes = allNodes.filter((n) => partFiles.has(n.filePath));
		const partNodeIds = new Set(partNodes.map((n) => n.id));
		const partEdges = [];
		for (const e of edges) {
			if (!partNodeIds.has(e.source)) continue;
			if (!targetOk(e.target, partNodeIds)) {
				failed.push({ part: i + 1, edge: e, reason: `target not in part nodes / neighborMap: ${e.target}` });
				continue;
			}
			partEdges.push(e);
		}
		written.push({ k: i + 1, nodes: partNodes, edges: partEdges, files: [...partFiles] });
	}
	return { written, failed };
}

let workingEdges = allEdges;
let written;
for (let iter = 0; iter < 6; iter++) {
	const nodeCount = allNodes.length;
	const edgeCount = workingEdges.length;
	const parts = nodeCount <= 60 && edgeCount <= 120 ? 1 : Math.ceil(Math.max(nodeCount / 60, edgeCount / 120));
	const result = partition(parts, workingEdges);
	const keptKeys = new Set();
	for (const part of result.written) {
		for (const e of part.edges) keptKeys.add(edgeKey(e));
	}
	workingEdges = workingEdges.filter((e) => keptKeys.has(edgeKey(e)));
	written = result.written;
	const nextParts =
		nodeCount <= 60 && workingEdges.length <= 120 ? 1 : Math.ceil(Math.max(nodeCount / 60, workingEdges.length / 120));
	if (nextParts === parts) {
		if (result.failed.length && workingEdges.length !== result.written.reduce((n, p) => n + p.edges.length, 0)) {
			continue;
		}
		break;
	}
}

const finalFailed = [];
for (const part of written) {
	const partNodeIds = new Set(part.nodes.map((n) => n.id));
	for (const e of part.edges) {
		if (!targetOk(e.target, partNodeIds)) {
			finalFailed.push({ part: part.k, edge: e, reason: `target not in part nodes / neighborMap: ${e.target}` });
		}
	}
}
if (finalFailed.length) {
	console.error(JSON.stringify(finalFailed, null, 2));
	throw new Error(`${finalFailed.length} edges failed validation`);
}

const parts = written.length;

const outDir = `${UA_DIR}/intermediate`;
const totalNodes = written.reduce((n, p) => n + p.nodes.length, 0);
const totalEdges = written.reduce((n, p) => n + p.edges.length, 0);

if (parts === 1) {
	fs.writeFileSync(`${outDir}/batch-15.json`, JSON.stringify({ nodes: written[0].nodes, edges: written[0].edges }, null, 2));
	console.log(JSON.stringify({ parts: 1, files: ["batch-15.json"], totalNodes, totalEdges, importCount: actualImports, filesSkipped: [] }, null, 2));
} else {
	const names = [];
	for (const part of written) {
		const name = `batch-15-part-${part.k}.json`;
		fs.writeFileSync(`${outDir}/${name}`, JSON.stringify({ nodes: part.nodes, edges: part.edges }, null, 2));
		names.push({ name, nodes: part.nodes.length, edges: part.edges.length, files: part.files.length });
	}
	console.log(JSON.stringify({ parts, files: names, totalNodes, totalEdges, importCount: actualImports, filesSkipped: [] }, null, 2));
}
