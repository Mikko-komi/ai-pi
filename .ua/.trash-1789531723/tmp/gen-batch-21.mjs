import { writeFileSync, mkdirSync } from "node:fs";

const F = (filePath, extra) => ({
	filePath,
	...extra,
});

const file = (path, name, summary, tags, complexity, languageNotes) =>
	F(path, {
		id: `file:${path}`,
		type: "file",
		name,
		summary,
		tags,
		complexity,
		...(languageNotes ? { languageNotes } : {}),
	});

const fn = (path, name, lineRange, summary, tags, complexity, languageNotes) =>
	F(path, {
		id: `function:${path}:${name}`,
		type: "function",
		name,
		lineRange,
		summary,
		tags,
		complexity,
		...(languageNotes ? { languageNotes } : {}),
	});

const cls = (path, name, lineRange, summary, tags, complexity, languageNotes) =>
	F(path, {
		id: `class:${path}:${name}`,
		type: "class",
		name,
		lineRange,
		summary,
		tags,
		complexity,
		...(languageNotes ? { languageNotes } : {}),
	});

const edge = (source, target, type, weight) => ({
	source,
	target,
	type,
	direction: "forward",
	weight,
});

const P = {
	api: "packages/chord/src/api.ts",
	delta: "packages/chord/src/delta/index.ts",
	host: "packages/chord/src/facets/host.ts",
	loader: "packages/chord/src/facets/loader.ts",
	json: "packages/chord/src/json.ts",
	bundleLoader: "packages/chord/src/node/bundle-loader.ts",
	bundle: "packages/chord/src/node/bundle.ts",
	manifest: "packages/chord/src/node/manifest.ts",
	pkg: "packages/chord/src/node/package.ts",
	consumer: "packages/chord/src/services/consumer.ts",
	errors: "packages/chord/src/services/errors.ts",
	handle: "packages/chord/src/services/handle.ts",
	instances: "packages/chord/src/services/instances.ts",
	loopback: "packages/chord/src/services/loopback.ts",
	provider: "packages/chord/src/services/provider.ts",
	stateCodec: "packages/chord/src/services/state-codec.ts",
	stateInternals: "packages/chord/src/services/state-internals.ts",
	state: "packages/chord/src/services/state.ts",
	wire: "packages/chord/src/services/wire.ts",
	types: "packages/chord/src/types.ts",
	context: "packages/chord/src/context/index.ts",
};

const nodes = [
	file(
		P.api,
		"api.ts",
		"Chord 面向应用的公开工厂入口：创建 facet host、组合 loader，以及定义 service、远程绑定与复制状态。",
		["入口点", "工厂", "facet", "service"],
		"moderate",
	),
	fn(P.api, "createFacetHost", [19, 27], "用 FacetKernel 激活一整代 facet，并返回冻结的 host 句柄（services/reload/dispose）。", ["工厂", "生命周期", "facet"], "simple"),
	fn(P.api, "createStaticFacetLoader", [29, 36], "把已有 facet 列表包装成不做清理的静态 FacetLoader。", ["工厂", "加载器", "facet"], "simple"),
	fn(P.api, "combineFacetLoaders", [38, 64], "顺序组合多个 FacetLoader；加载失败时按逆序 dispose，成功后共享统一清理。", ["加载器", "组合", "生命周期"], "moderate"),
	fn(P.api, "defineFacet", [66, 68], "原样返回 Facet，供调用方做显式类型标注。", ["工厂", "类型定义", "facet"], "simple"),
	fn(P.api, "defineService", [77, 82], "校验非空且非 $chord. 保留前缀后，冻结生成 Service 身份（local 默认 false）。", ["工厂", "校验", "service"], "simple"),
	fn(P.api, "createRemoteServiceBinding", [84, 86], "构造 RemoteServiceBindingImpl，作为消费端远程服务绑定入口。", ["工厂", "远程服务", "绑定"], "simple"),
	fn(P.api, "replicatedState", [88, 90], "用初始对象创建 MutableReplicatedStateImpl，供服务实现暴露可复制状态。", ["工厂", "状态同步", "service"], "simple"),

	file(
		P.delta,
		"index.ts",
		"Chord 的 JSON 增量层：对纯 JSON 做 flush 时差量跟踪，并提供 apply、不可变 apply 以及 wire 编解码。",
		["增量", "序列化", "状态同步", "校验"],
		"complex",
		"用元组动词 r/s/d/a/t/p 表示替换、赋值、删除、追加、截断与数组拼接；WireOp 另含路径字典与省略路径。",
	),
	fn(P.delta, "isReplace", [64, 64], "判断一条 Op/WireOp 是否为根替换动词 r。", ["工具函数", "增量", "分类"], "simple"),
	fn(P.delta, "isBase", [70, 70], "判断一批操作是否以根替换开头，用作完整快照/恢复点判定。", ["工具函数", "增量", "分类"], "simple"),
	fn(P.delta, "overlap", [81, 104], "用 indexOf 探测求 a 后缀与 b 前缀的最长重叠，失败则返回 0 以免错误截断。", ["工具函数", "字符串", "增量"], "moderate"),
	fn(P.delta, "cloneJson", [130, 146], "深拷贝严格 JSON，保留 null 原型对象并只复制自有可枚举数据属性。", ["工具函数", "克隆", "json"], "simple"),
	fn(P.delta, "jsonEqual", [168, 187], "结构化比较两个 JsonValue，按数组下标或对象自有键递归相等。", ["工具函数", "比较", "json"], "moderate"),
	fn(P.delta, "diffString", [205, 227], "把字符串变化编成追加 a、截断 t 或整值 s，优先识别后缀追加与重叠。", ["增量", "字符串", "diff"], "moderate"),
	fn(P.delta, "diffValue", [229, 252], "按缺失/类型分发到字符串、数组、对象 diff 或整值替换。", ["增量", "diff", "分发"], "moderate"),
	fn(P.delta, "diffObject", [254, 271], "对普通对象逐键 diff；遇到保留段名则整对象替换以免原型污染。", ["增量", "对象", "安全"], "simple"),
	fn(P.delta, "diffArray", [273, 313], "用公共前后缀压缩数组变化为 p 拼接，否则保留下标编辑并只改尾部长短。", ["增量", "数组", "diff"], "moderate"),
	fn(P.delta, "walkDirty", [315, 363], "沿脏节点树只 diff 变更子树，处理整值脏、数组 append/diff/replace。", ["增量", "脏标记", "diff"], "moderate"),
	fn(P.delta, "syncInto", [387, 400], "把脏子树同步进 baseline：append 只推入新元素，其余走 syncChild。", ["增量", "基线", "同步"], "simple"),
	fn(P.delta, "syncChild", [402, 420], "按脏节点把单个子段写回 baseline，必要时克隆或递归 syncInto。", ["增量", "基线", "同步"], "simple"),
	fn(P.delta, "cloneOp", [422, 433], "克隆一条 Op 的 JSON 载荷，避免后续突变共享批次。", ["工具函数", "克隆", "增量"], "simple"),
	fn(
		P.delta,
		"track",
		[435, 749],
		"对根对象建立 Proxy 跟踪器，记录脏树并在 flush 时产出最小 Op 批次，支持 rebase/discard。",
		["工厂", "增量", "代理", "状态同步"],
		"complex",
		"插入值会被收养；调用方不得在 Proxy 外突变同一对象。",
	),
	cls(P.delta, "UnsafePathError", [766, 775], "路径段为 __proto__/constructor/prototype 或非法下标时抛出的安全错误。", ["错误处理", "安全", "路径"], "simple"),
	fn(P.delta, "assertValidOp", [785, 819], "校验已解码 Op 的动词、元数与路径形状，未知动词直接失败。", ["校验", "增量", "安全"], "moderate"),
	fn(P.delta, "assertValidWireOp", [828, 889], "按 wire 文法校验 WireOp，允许路径 id、短形式与 # 字典定义。", ["校验", "增量", "编解码"], "moderate"),
	fn(P.delta, "assertSafePath", [891, 899], "拒绝保留段名与非负整数以外的数组下标，防止原型污染与超大稀疏数组。", ["校验", "安全", "路径"], "simple"),
	cls(P.delta, "PathError", [922, 929], "apply/decode 无法解析路径或路径 id 时抛出的错误。", ["错误处理", "路径", "增量"], "simple"),
	fn(P.delta, "apply", [938, 940], "把已解码 Op 应用到可变 JSON，根替换时返回新根。", ["增量", "应用", "入口点"], "simple"),
	fn(P.delta, "applyOps", [942, 1011], "就地执行 r/s/d/a/t/p：用 defineProperty 写入并校验安全路径与数组下标。", ["增量", "应用", "可变"], "moderate"),
	fn(P.delta, "applyImmutable", [1014, 1026], "沿路径拷贝容器后应用单条 op，保持上一版本结构共享且不被突变。", ["增量", "不可变", "应用"], "simple"),
	fn(P.delta, "copyContainers", [1028, 1064], "浅拷贝路径上的数组/对象容器，供不可变 apply 隔离旧快照。", ["增量", "克隆", "不可变"], "moderate"),
	fn(P.delta, "resolveValue", [1066, 1077], "只沿自有属性解析路径，禁止继承 getter 与原型链逃逸。", ["工具函数", "路径", "安全"], "simple"),
	fn(P.delta, "encoder", [1105, 1192], "创建有状态 Encoder：第二次出现的路径才 intern，同批相邻相同路径可省略。", ["编解码", "压缩", "工厂"], "moderate"),
	fn(P.delta, "decoder", [1198, 1267], "创建有状态 Decoder：展开路径 id 与短形式，遇 r 清空字典作为恢复点。", ["编解码", "解压", "工厂"], "moderate"),

	file(
		P.host,
		"host.ts",
		"Facet 运行时内核：同步 setup、校验依赖、装配本地/远程 provider，并按拓扑顺序激活与热替换。",
		["内核", "生命周期", "facet", "依赖注入"],
		"complex",
		"用分代状态机（setup/assembling/connecting/activating/reloading）保证 handle 在 reload 时不断开。",
	),
	cls(P.host, "FacetLifecycle", [59, 143], "单个 facet 的 setup/active/dispose 状态机，登记 effect、观察与激活回调。", ["生命周期", "状态机", "facet"], "moderate"),
	cls(P.host, "LocalKeyedServiceRegistry", [154, 217], "为本地 keyed service 分配 generation 并委托 InstanceDirectory 观察实例。", ["注册表", "keyed-service", "本地"], "moderate"),
	cls(P.host, "HostServiceSlots", [219, 277], "宿主侧 singleton/keyed 槽位：用 ServiceSlot 包装实现并在观察时按实例绑定。", ["绑定", "service", "句柄"], "moderate"),
	cls(P.host, "StagedServiceSpawner", [287, 321], "setup 期暂存 keyed 实例，connect 后再交给本地 registry 或远程 provider。", ["工厂", "keyed-service", "分阶段"], "moderate"),
	cls(P.host, "FacetKernel", [340, 794], "私有宿主内核：装配 provider、绑定内外服务、按拓扑激活/reload/dispose 整代 facet。", ["内核", "生命周期", "编排"], "complex"),
	fn(P.host, "disposeFacetRecords", [796, 806], "逆序 dispose 一组 FacetRuntime，收集但不中断后续清理错误。", ["生命周期", "清理", "facet"], "simple"),
	fn(P.host, "validateFacets", [808, 856], "检查服务提供唯一性与模式匹配，构建依赖图后返回拓扑激活顺序。", ["校验", "依赖", "拓扑"], "moderate"),
	fn(P.host, "topologicalOrder", [858, 880], "Kahn 算法排序 facet；若有剩余入度则报依赖环。", ["拓扑", "依赖", "算法"], "moderate"),

	file(P.loader, "loader.ts", "加载结果清理辅助：并行 settle 所有 LoadedFacets.dispose 并收集拒绝原因。", ["加载器", "清理", "工具函数"], "simple"),
	fn(P.loader, "disposeLoadedFacets", [3, 6], "对已加载条目 allSettled dispose，只返回 rejected 的 reason。", ["清理", "加载器", "生命周期"], "simple"),

	file(P.json, "json.ts", "运行时判定未知值是否为有限、无环、仅普通对象的严格 JSON。", ["校验", "json", "类型守卫"], "simple"),
	fn(P.json, "isJsonValue", [4, 6], "对外类型守卫：用祖先集合启动深度受限的严格 JSON 检查。", ["类型守卫", "json", "校验"], "simple"),
	fn(P.json, "check", [8, 50], "递归检查数组稠密性、普通对象原型、可枚举数据属性，并拒绝环与过深嵌套。", ["校验", "json", "递归"], "moderate"),

	file(
		P.bundleLoader,
		"bundle-loader.ts",
		"在 Node 中读取、校验并 VM 执行 facet bundle：支持磁盘清单与可传输 artifact 两代加载。",
		["加载器", "打包", "安全", "node"],
		"complex",
	),
	fn(P.bundleLoader, "readFacetBundleManifest", [44, 53], "读 JSON 清单并交给 validateManifest 做版本与条目校验。", ["加载器", "清单", "校验"], "simple"),
	fn(P.bundleLoader, "readFacetBundleArtifact", [56, 81], "从磁盘清单取出一条目标、校验完整性并组装可传输 artifact。", ["加载器", "artifact", "完整性"], "moderate"),
	fn(P.bundleLoader, "createFacetBundleArtifactLoader", [84, 131], "物化 artifact 到临时目录后委托 bundle loader，dispose 时删除目录。", ["工厂", "加载器", "artifact"], "moderate"),
	fn(P.bundleLoader, "createFacetBundleLoader", [134, 169], "按清单条目读源、校验 SRI，用 VM 编译 CommonJS 并抽出 Facet。", ["工厂", "加载器", "vm"], "moderate"),
	fn(P.bundleLoader, "executeCommonJsModule", [171, 203], "compileFunction 执行 bundle，只解析声明的 external 与内置模块。", ["执行", "commonjs", "沙箱"], "moderate"),
	fn(P.bundleLoader, "toRequireSpecifier", [205, 216], "把解析后的 URL/路径转成 createRequire 可用的 specifier。", ["工具函数", "模块", "解析"], "simple"),
	fn(P.bundleLoader, "facetsFromModule", [245, 267], "从 default 导出收集带 id/setup 的 Facet，并拒绝重复 ID。", ["校验", "facet", "加载器"], "moderate"),
	fn(P.bundleLoader, "validateArtifact", [269, 307], "校验 artifact 格式版本、入口与 source map，并复用清单校验与 SRI。", ["校验", "artifact", "完整性"], "moderate"),
	fn(P.bundleLoader, "materializeArtifact", [309, 323], "把 artifact 的源、清单与可选 source map 写到临时目录。", ["物化", "artifact", "文件系统"], "simple"),
	fn(P.bundleLoader, "resolveExternalTarget", [325, 335], "用宿主 resolver 或包内相对 URL 解析 external specifier。", ["解析", "模块", "external"], "simple"),
	fn(P.bundleLoader, "validatePackageSpecifier", [337, 351], "拒绝相对路径、协议与穿越段，只允许规范 npm 包名。", ["校验", "安全", "模块"], "simple"),
	fn(P.bundleLoader, "validateManifest", [353, 412], "校验清单 format/version、plugin 身份、条目 file/integrity/externalImports。", ["校验", "清单", "安全"], "moderate"),

	file(
		P.bundle,
		"bundle.ts",
		"用 esbuild 把每个不透明 facet 入口打成内容寻址的独立 CommonJS，并原子替换输出目录。",
		["打包", "esbuild", "构建", "node"],
		"complex",
	),
	fn(P.bundle, "bundleFacets", [39, 79], "校验选项后并行打包各入口，写 chord-facets.json 并以目录替换提交结果。", ["打包", "入口点", "构建"], "moderate"),
	fn(P.bundle, "bundleEntry", [81, 158], "对单入口跑 esbuild，计算 SHA-256 integrity 并记录 externalImports。", ["打包", "esbuild", "完整性"], "moderate"),
	fn(P.bundle, "validateOptions", [160, 174], "校验 plugin id、入口映射与 outdir 等打包选项。", ["校验", "打包", "配置"], "simple"),
	fn(P.bundle, "replaceDirectory", [176, 192], "先写入临时目录再 rename 替换目标，失败时清理临时树。", ["文件系统", "原子替换", "打包"], "simple"),

	file(
		P.manifest,
		"manifest.ts",
		"定义 facet bundle / artifact 的格式常量、版本号与 TypeScript 清单形状。",
		["类型定义", "清单", "常量", "打包"],
		"simple",
	),

	file(
		P.pkg,
		"package.ts",
		"从 package.json 与 chord 配置解析插件元数据，合并约定入口后调用 bundleFacets。",
		["打包", "package-json", "配置", "node"],
		"complex",
	),
	fn(P.pkg, "bundleFacetPackage", [30, 50], "读包元数据、解析入口与 peer/external，再委托 bundleFacets 产出插件包。", ["打包", "入口点", "插件"], "moderate"),
	fn(P.pkg, "readFacetPackageMetadata", [52, 98], "定位 package.json，解析 name/version、peerDependencies 与 chord 配置。", ["解析", "package-json", "元数据"], "moderate"),
	fn(P.pkg, "parsePeerDependencies", [100, 109], "把 peerDependencies 对象校验为排序后的包名列表。", ["解析", "依赖", "校验"], "simple"),
	fn(P.pkg, "parseChordConfiguration", [111, 154], "解析 package.json 的 chord.facets/external/sourceMap，拒绝未知字段。", ["解析", "配置", "校验"], "moderate"),
	fn(P.pkg, "resolveFacetEntries", [156, 197], "合并默认约定与配置入口，false 可关闭约定，最终必须至少一条。", ["解析", "入口", "打包"], "moderate"),
	fn(P.pkg, "resolvePackageEntry", [204, 217], "把相对源路径解析到包目录内，拒绝绝对路径与目录穿越。", ["安全", "路径", "校验"], "simple"),

	file(
		P.consumer,
		"consumer.ts",
		"远程服务消费端：按 allowlist 订阅 snapshot/update，用代理 facade 调用方法并复制状态。",
		["远程服务", "绑定", "消费端", "代理"],
		"complex",
	),
	cls(P.consumer, "MemberSlot", [24, 138], "单个成员槽：方法走 transport.invoke，状态走 ReplicatedStateReplica，并强制尾部 Context。", ["绑定", "代理", "远程服务"], "moderate"),
	cls(P.consumer, "ServiceFacade", [140, 233], "实例级代理门面：按 snapshot 安装成员、转发状态更新并惰性创建 MemberSlot。", ["代理", "快照", "远程服务"], "moderate"),
	cls(P.consumer, "KeyedBinding", [247, 423], "keyed 服务绑定：用 InstanceDirectory 管理代际实例，并订阅 spawned/replaced/closed。", ["keyed-service", "绑定", "订阅"], "complex"),
	cls(P.consumer, "RemoteServiceBindingImpl", [425, 634], "公开绑定实现：use/observe/ready/rebind/dispose，串行化订阅启动与断连。", ["绑定", "远程服务", "生命周期"], "complex"),
	fn(P.consumer, "validateMembers", [636, 645], "把 snapshot 成员列表建成 name→kind 映射，拒绝重复名。", ["校验", "快照", "成员"], "simple"),

	file(P.errors, "errors.ts", "远程服务稳定错误码表与 RemoteServiceError，供 provider/consumer 共享判定。", ["错误处理", "远程服务", "类型定义"], "simple"),
	fn(P.errors, "isRemoteServiceErrorCode", [14, 16], "类型守卫：字符串是否属于 REMOTE_SERVICE_ERROR_CODES。", ["类型守卫", "错误处理", "校验"], "simple"),
	cls(P.errors, "RemoteServiceError", [18, 26], "带稳定 code 字段的远程服务 Error，用于 allowlist/模式/成员不匹配等。", ["错误处理", "远程服务", "异常"], "simple"),

	file(P.handle, "handle.ts", "宿主拥有实现、消费者持有受守卫 Proxy 视图的 ServiceSlot，断开后访问会失败。", ["句柄", "代理", "绑定", "service"], "moderate"),
	cls(P.handle, "ServiceSlot", [9, 40], "可变实现槽：bind/unbind 切换目标，view 返回带访问断言的 Proxy。", ["句柄", "绑定", "代理"], "moderate"),
	cls(P.handle, "ServiceView", [42, 69], "服务根视图：按属性惰性包装对象/函数成员为 ValueView。", ["代理", "句柄", "视图"], "moderate"),
	cls(P.handle, "ValueView", [71, 109], "可调用或可导航的成员视图，apply/get 时重新 resolve 当前实现。", ["代理", "句柄", "视图"], "moderate"),

	file(P.instances, "instances.ts", "keyed 实例目录：管理代际条目、观察者任务与可取消 Context。", ["keyed-service", "生命周期", "观察者"], "moderate"),
	cls(
		P.instances,
		"InstanceDirectory",
		[18, 143],
		"拥有 keyed 实例寿命：insert/replace/remove，ready 后为每个观察者启动可取消任务。",
		["目录", "keyed-service", "生命周期"],
		"moderate",
	),

	file(P.loopback, "loopback.ts", "把 RemoteServiceProvider 适配成同进程 RemoteServiceTransport，语义与远程一致。", ["传输", "loopback", "远程服务"], "simple"),
	fn(P.loopback, "createLoopbackServiceTransport", [5, 17], "转发 invoke/subscribe 到本地 provider，不改变远程服务语义。", ["工厂", "传输", "loopback"], "simple"),

	file(
		P.provider,
		"provider.ts",
		"远程服务提供端：登记 singleton/keyed 实现，处理 invoke/subscribe，并发布状态与实例更新。",
		["远程服务", "提供端", "订阅", "目录"],
		"complex",
	),
	cls(
		P.provider,
		"RemoteServiceProvider",
		[77, 500],
		"按目录提供/撤回/替换实现，校验远程可暴露成员，并向订阅者推送 snapshot 与增量。",
		["提供端", "远程服务", "生命周期"],
		"complex",
	),
	fn(P.provider, "createRemoteServiceEndpoint", [502, 538], "为单个远程消费者托管 $chord.service 控制面与普通 invoke。", ["工厂", "端点", "控制面"], "moderate"),
	fn(P.provider, "validateRemoteServiceImplementation", [540, 542], "公开校验入口：委托 classify，忽略返回的成员分类。", ["校验", "远程服务", "实现"], "simple"),
	fn(P.provider, "classifyRemoteServiceImplementation", [544, 570], "只接受数据属性上的方法或已登记复制状态，否则抛类型错误。", ["校验", "远程服务", "分类"], "moderate"),

	file(
		P.stateCodec,
		"state-codec.ts",
		"按订阅内每个复制状态成员维护成对 encoder/decoder，把 snapshot/update 在 Op 与 WireOp 间转换。",
		["编解码", "状态同步", "订阅"],
		"moderate",
	),
	cls(P.stateCodec, "StateCodecRegistry", [27, 58], "按实例地址+成员名登记有状态编解码器，支持 reset 与按实例删除。", ["注册表", "编解码", "状态同步"], "moderate"),
	fn(P.stateCodec, "createServiceStateEncoder", [60, 88], "创建订阅级 Encoder：快照重建字典，update 按类型编码或清理。", ["工厂", "编解码", "状态同步"], "moderate"),
	fn(P.stateCodec, "createServiceStateDecoder", [90, 118], "创建订阅级 Decoder：与 encoder 对称地展开 snapshot/update。", ["工厂", "编解码", "状态同步"], "moderate"),
	fn(P.stateCodec, "encodeInstance", [120, 132], "为实例中每个 state 成员分配 encoder 并编码其 ops。", ["编解码", "快照", "实例"], "simple"),
	fn(P.stateCodec, "decodeInstance", [134, 146], "为实例中每个 state 成员分配 decoder 并解码其 ops。", ["编解码", "快照", "实例"], "simple"),

	file(P.stateInternals, "state-internals.ts", "用 WeakMap 把复制状态对象挂到内部 sequence/publish/subscribe，供 provider 发现。", ["状态同步", "内部", "注册表"], "simple"),
	fn(P.stateInternals, "registerReplicatedStateInternals", [13, 15], "把内部源登记到 WeakMap，避免泄漏到公开 API。", ["注册表", "状态同步", "内部"], "simple"),
	fn(P.stateInternals, "getReplicatedStateInternals", [17, 20], "按对象取出内部源；非对象返回 undefined。", ["注册表", "状态同步", "内部"], "simple"),

	file(P.state, "state.ts", "可变复制状态与只读副本：用 delta tracker 发布 ops，按序号 hydrate/update。", ["状态同步", "增量", "发布订阅"], "moderate"),
	cls(P.state, "MutableReplicatedStateImpl", [6, 57], "可写端：track 突变，publish 刷新 ops 并通知源监听与值监听。", ["状态同步", "发布", "可变"], "moderate"),
	cls(P.state, "ReplicatedStateReplica", [60, 129], "只读副本：必须先收到 base hydrate，序号必须连续否则 clear。", ["状态同步", "副本", "订阅"], "moderate"),
	fn(P.state, "serviceDeliveryContext", [132, 135], "合成投递使用的 BACKGROUND_CONTEXT，尚无投递级取消。", ["上下文", "投递", "内部"], "simple"),

	file(
		P.wire,
		"wire.ts",
		"远程服务控制面呼叫与 catalogue/snapshot/update 的解析校验，区分解码 Op 与 WireOp。",
		["编解码", "校验", "控制面", "远程服务"],
		"complex",
	),
	fn(P.wire, "createServiceCatalogueCall", [54, 56], "构造 $chord.service/catalogue 控制呼叫。", ["工厂", "控制面", "catalogue"], "simple"),
	fn(P.wire, "createServiceSubscribeCall", [58, 60], "构造带 subscriptionId/serviceId/mode 的 subscribe 控制呼叫。", ["工厂", "控制面", "订阅"], "simple"),
	fn(P.wire, "createServiceUnsubscribeCall", [62, 64], "构造按 subscriptionId 取消订阅的控制呼叫。", ["工厂", "控制面", "订阅"], "simple"),
	fn(P.wire, "decodeServiceControlCall", [66, 87], "识别 $chord.service 控制呼叫；形状不符返回 undefined。", ["控制面", "解析", "远程服务"], "moderate"),
	fn(P.wire, "parseServiceCall", [89, 97], "校验普通 ServiceCall 的必选键、id 与可选 instance。", ["校验", "解析", "呼叫"], "simple"),
	fn(P.wire, "parseServiceCatalogue", [99, 111], "校验目录数组：唯一 serviceId 与合法 mode。", ["校验", "解析", "catalogue"], "simple"),
	fn(P.wire, "parseServiceSubscriptionSnapshot", [113, 116], "按已解码 Op 文法校验订阅快照。", ["校验", "快照", "增量"], "simple"),
	fn(P.wire, "parseWireServiceSubscriptionSnapshot", [118, 121], "按 WireOp 文法校验线上订阅快照。", ["校验", "快照", "编解码"], "simple"),
	fn(P.wire, "parseServiceProviderUpdate", [123, 126], "按已解码 Op 文法校验 provider 更新。", ["校验", "更新", "增量"], "simple"),
	fn(P.wire, "parseWireServiceProviderUpdate", [128, 131], "按 WireOp 文法校验线上 provider 更新。", ["校验", "更新", "编解码"], "simple"),
	fn(P.wire, "assertProviderUpdate", [142, 171], "按 type 分发校验 state/unavailable/replaced/spawned/closed 形状。", ["校验", "更新", "分发"], "moderate"),
	fn(P.wire, "assertInstance", [173, 195], "校验实例 snapshot 的地址与 method/state 成员，并对 ops 调用 assertOp。", ["校验", "快照", "实例"], "moderate"),
	fn(P.wire, "assertKeys", [212, 222], "断言对象恰好包含必选键且无未知键。", ["校验", "形状", "工具函数"], "simple"),

	file(
		P.types,
		"types.ts",
		"Chord 核心类型：Context、JsonValue、Service/Facet 契约，以及远程调用与复制状态的快照形状。",
		["类型定义", "契约", "远程服务", "facet"],
		"complex",
		"RemoteServiceContract 用条件类型把非 JSON 方法参数/返回值与非法成员从契约中排除。",
	),
];

const exported = [
	[P.api, "createFacetHost"],
	[P.api, "createStaticFacetLoader"],
	[P.api, "combineFacetLoaders"],
	[P.api, "defineFacet"],
	[P.api, "defineService"],
	[P.api, "createRemoteServiceBinding"],
	[P.api, "replicatedState"],
	[P.delta, "isReplace"],
	[P.delta, "isBase"],
	[P.delta, "overlap"],
	[P.delta, "track"],
	[P.delta, "UnsafePathError", "class"],
	[P.delta, "assertValidOp"],
	[P.delta, "assertValidWireOp"],
	[P.delta, "assertSafePath"],
	[P.delta, "PathError", "class"],
	[P.delta, "apply"],
	[P.delta, "applyImmutable"],
	[P.delta, "encoder"],
	[P.delta, "decoder"],
	[P.host, "FacetKernel", "class"],
	[P.loader, "disposeLoadedFacets"],
	[P.json, "isJsonValue"],
	[P.bundleLoader, "readFacetBundleManifest"],
	[P.bundleLoader, "readFacetBundleArtifact"],
	[P.bundleLoader, "createFacetBundleArtifactLoader"],
	[P.bundleLoader, "createFacetBundleLoader"],
	[P.bundle, "bundleFacets"],
	[P.pkg, "bundleFacetPackage"],
	[P.consumer, "RemoteServiceBindingImpl", "class"],
	[P.errors, "isRemoteServiceErrorCode"],
	[P.errors, "RemoteServiceError", "class"],
	[P.handle, "ServiceSlot", "class"],
	[P.instances, "InstanceDirectory", "class"],
	[P.loopback, "createLoopbackServiceTransport"],
	[P.provider, "RemoteServiceProvider", "class"],
	[P.provider, "createRemoteServiceEndpoint"],
	[P.provider, "validateRemoteServiceImplementation"],
	[P.stateCodec, "createServiceStateEncoder"],
	[P.stateCodec, "createServiceStateDecoder"],
	[P.stateInternals, "registerReplicatedStateInternals"],
	[P.stateInternals, "getReplicatedStateInternals"],
	[P.state, "MutableReplicatedStateImpl", "class"],
	[P.state, "ReplicatedStateReplica", "class"],
	[P.state, "serviceDeliveryContext"],
	[P.wire, "createServiceCatalogueCall"],
	[P.wire, "createServiceSubscribeCall"],
	[P.wire, "createServiceUnsubscribeCall"],
	[P.wire, "decodeServiceControlCall"],
	[P.wire, "parseServiceCall"],
	[P.wire, "parseServiceCatalogue"],
	[P.wire, "parseServiceSubscriptionSnapshot"],
	[P.wire, "parseWireServiceSubscriptionSnapshot"],
	[P.wire, "parseServiceProviderUpdate"],
	[P.wire, "parseWireServiceProviderUpdate"],
];

const batchImportData = {
	[P.api]: [P.host, P.loader, P.consumer, P.state, P.types],
	[P.delta]: [P.types],
	[P.host]: [P.context, P.consumer, P.handle, P.instances, P.loopback, P.provider, P.state, P.types],
	[P.loader]: [P.types],
	[P.json]: [P.types],
	[P.bundleLoader]: [P.manifest, P.types],
	[P.bundle]: [P.manifest],
	[P.manifest]: [],
	[P.pkg]: [P.bundle],
	[P.consumer]: [P.context, P.delta, P.errors, P.handle, P.instances, P.state, P.types],
	[P.errors]: [],
	[P.handle]: [],
	[P.instances]: [P.context, P.types],
	[P.loopback]: [P.provider, P.types],
	[P.provider]: [P.errors, P.stateInternals, P.state, P.wire, P.types],
	[P.stateCodec]: [P.delta, P.wire, P.types],
	[P.stateInternals]: [P.delta, P.types],
	[P.state]: [P.context, P.delta, P.stateInternals, P.types],
	[P.wire]: [P.delta, P.types],
	[P.types]: [P.delta, P.provider],
};

const edges = [];

for (const [from, targets] of Object.entries(batchImportData)) {
	for (const to of targets) {
		edges.push(edge(`file:${from}`, `file:${to}`, "imports", 0.7));
	}
}

const nodeById = new Map(nodes.map((n) => [n.id, n]));
for (const n of nodes) {
	if (n.type === "function" || n.type === "class") {
		edges.push(edge(`file:${n.filePath}`, n.id, "contains", 1.0));
	}
}

const idFor = (path, name, kind) => (kind === "class" ? `class:${path}:${name}` : `function:${path}:${name}`);
for (const [path, name, kind] of exported) {
	const id = idFor(path, name, kind);
	if (!nodeById.has(id)) throw new Error(`missing exported node ${id}`);
	edges.push(edge(`file:${path}`, id, "exports", 0.8));
}

const calls = [
	[`function:${P.api}:combineFacetLoaders`, `function:${P.loader}:disposeLoadedFacets`],
	[`function:${P.api}:createFacetHost`, `class:${P.host}:FacetKernel`],
	[`function:${P.json}:isJsonValue`, `function:${P.json}:check`],
	[`function:${P.host}:validateFacets`, `function:${P.host}:topologicalOrder`],
	[`class:${P.host}:FacetKernel`, `function:${P.host}:validateFacets`],
	[`class:${P.host}:FacetKernel`, `function:${P.host}:disposeFacetRecords`],
	[`class:${P.host}:LocalKeyedServiceRegistry`, `class:${P.instances}:InstanceDirectory`],
	[`class:${P.host}:HostServiceSlots`, `class:${P.handle}:ServiceSlot`],
	[`class:${P.host}:FacetKernel`, `function:${P.loopback}:createLoopbackServiceTransport`],
	[`class:${P.host}:FacetKernel`, `function:${P.provider}:validateRemoteServiceImplementation`],
	[`function:${P.bundleLoader}:readFacetBundleManifest`, `function:${P.bundleLoader}:validateManifest`],
	[`function:${P.bundleLoader}:readFacetBundleArtifact`, `function:${P.bundleLoader}:readFacetBundleManifest`],
	[`function:${P.bundleLoader}:createFacetBundleArtifactLoader`, `function:${P.bundleLoader}:createFacetBundleLoader`],
	[`function:${P.bundleLoader}:createFacetBundleLoader`, `function:${P.bundleLoader}:readFacetBundleManifest`],
	[`function:${P.bundleLoader}:createFacetBundleLoader`, `function:${P.bundleLoader}:executeCommonJsModule`],
	[`function:${P.bundleLoader}:createFacetBundleLoader`, `function:${P.bundleLoader}:facetsFromModule`],
	[`function:${P.bundle}:bundleFacets`, `function:${P.bundle}:bundleEntry`],
	[`function:${P.bundle}:bundleFacets`, `function:${P.bundle}:validateOptions`],
	[`function:${P.bundle}:bundleFacets`, `function:${P.bundle}:replaceDirectory`],
	[`function:${P.pkg}:bundleFacetPackage`, `function:${P.bundle}:bundleFacets`],
	[`function:${P.pkg}:bundleFacetPackage`, `function:${P.pkg}:readFacetPackageMetadata`],
	[`function:${P.pkg}:readFacetPackageMetadata`, `function:${P.pkg}:parseChordConfiguration`],
	[`class:${P.consumer}:ServiceFacade`, `function:${P.consumer}:validateMembers`],
	[`class:${P.consumer}:RemoteServiceBindingImpl`, `function:${P.context}:awaitWithContext`],
	[`class:${P.consumer}:MemberSlot`, `class:${P.state}:ReplicatedStateReplica`],
	[`class:${P.consumer}:KeyedBinding`, `class:${P.instances}:InstanceDirectory`],
	[`class:${P.consumer}:KeyedBinding`, `function:${P.state}:serviceDeliveryContext`],
	[`function:${P.loopback}:createLoopbackServiceTransport`, `class:${P.provider}:RemoteServiceProvider`],
	[`function:${P.provider}:createRemoteServiceEndpoint`, `function:${P.wire}:decodeServiceControlCall`],
	[`function:${P.provider}:validateRemoteServiceImplementation`, `function:${P.provider}:classifyRemoteServiceImplementation`],
	[`function:${P.provider}:classifyRemoteServiceImplementation`, `function:${P.stateInternals}:getReplicatedStateInternals`],
	[`function:${P.stateCodec}:createServiceStateEncoder`, `function:${P.delta}:encoder`],
	[`function:${P.stateCodec}:createServiceStateDecoder`, `function:${P.delta}:decoder`],
	[`function:${P.stateCodec}:createServiceStateEncoder`, `function:${P.stateCodec}:encodeInstance`],
	[`function:${P.stateCodec}:createServiceStateDecoder`, `function:${P.stateCodec}:decodeInstance`],
	[`class:${P.state}:MutableReplicatedStateImpl`, `function:${P.delta}:track`],
	[`class:${P.state}:MutableReplicatedStateImpl`, `function:${P.delta}:applyImmutable`],
	[`class:${P.state}:MutableReplicatedStateImpl`, `function:${P.stateInternals}:registerReplicatedStateInternals`],
	[`class:${P.state}:ReplicatedStateReplica`, `function:${P.delta}:isBase`],
	[`class:${P.state}:ReplicatedStateReplica`, `function:${P.delta}:applyImmutable`],
	[`function:${P.wire}:parseServiceSubscriptionSnapshot`, `function:${P.delta}:assertValidOp`],
	[`function:${P.wire}:parseWireServiceSubscriptionSnapshot`, `function:${P.delta}:assertValidWireOp`],
	[`function:${P.wire}:parseServiceProviderUpdate`, `function:${P.delta}:assertValidOp`],
	[`function:${P.wire}:parseWireServiceProviderUpdate`, `function:${P.delta}:assertValidWireOp`],
	[`function:${P.wire}:parseServiceProviderUpdate`, `function:${P.wire}:assertProviderUpdate`],
	[`function:${P.delta}:apply`, `function:${P.delta}:applyOps`],
	[`function:${P.delta}:applyImmutable`, `function:${P.delta}:applyOps`],
	[`function:${P.delta}:applyImmutable`, `function:${P.delta}:copyContainers`],
	[`function:${P.delta}:applyOps`, `function:${P.delta}:assertValidOp`],
	[`function:${P.delta}:decoder`, `function:${P.delta}:assertValidWireOp`],
];

function pathOfNodeId(id) {
	if (id.startsWith("file:")) return id.slice(5);
	const m = /^(function|class):(.+):([^:]+)$/.exec(id);
	return m ? m[2] : null;
}

function symbolOfNodeId(id) {
	const m = /^(function|class):(.+):([^:]+)$/.exec(id);
	return m ? m[3] : null;
}

const importCount = Object.values(batchImportData).reduce((n, a) => n + a.length, 0);
const importEdges = edges.filter((e) => e.type === "imports").length;
if (importEdges !== importCount) {
	throw new Error(`imports ${importEdges} !== expected ${importCount}`);
}

const files = [...new Set(nodes.map((n) => n.filePath))].sort();
const neighborSymbols = new Set([
	"BACKGROUND_CONTEXT",
	"TODO_CONTEXT",
	"createContextKey",
	"withContextValue",
	"withAbortSignal",
	"withoutAbortSignal",
	"withCancel",
	"awaitWithContext",
]);
const importTargets = new Set(Object.values(batchImportData).flat());
const neighborPaths = new Set([P.context, ...importTargets, ...Object.keys(batchImportData)]);
const knownIds = new Set(nodes.map((n) => n.id));

function fileRefOk(id) {
	if (!id.startsWith("file:")) return false;
	return neighborPaths.has(id.slice("file:".length));
}

function symbolRefOk(id) {
	const symbol = symbolOfNodeId(id);
	return symbol !== null && neighborSymbols.has(symbol);
}

function chunkSizeFor(p) {
	return Math.ceil(files.length / p);
}

function partFiles(p, partIndex) {
	const size = chunkSizeFor(p);
	return files.slice((partIndex - 1) * size, partIndex * size);
}

function filePartMap(p) {
	const map = new Map();
	for (let k = 1; k <= p; k++) {
		for (const f of partFiles(p, k)) map.set(f, k);
	}
	return map;
}

function callAllowed(source, target) {
	if (source === target) return false;
	if (!knownIds.has(source) && !symbolRefOk(source)) return false;
	return knownIds.has(target) || fileRefOk(target) || symbolRefOk(target);
}

function partStats(p) {
	const partMap = filePartMap(p);
	const trial = [
		...edges,
		...calls.filter(([s, t]) => callAllowed(s, t)).map(([s, t]) => edge(s, t, "calls", 0.8)),
	];
	return Array.from({ length: p }, (_, i) => {
		const set = new Set(partFiles(p, i + 1));
		const pNodes = nodes.filter((n) => set.has(n.filePath));
		const ids = new Set(pNodes.map((n) => n.id));
		const pEdges = trial.filter((e) => ids.has(e.source));
		return { nodes: pNodes.length, edges: pEdges.length };
	});
}

let parts = Math.ceil(Math.max(nodes.length / 60, (edges.length + calls.length) / 120));
if (parts < 1) parts = 1;
while (parts < 8 && partStats(parts).some((s) => s.nodes > 60 || s.edges > 120)) {
	parts += 1;
}

const partMap = filePartMap(parts);
let droppedCalls = 0;
for (const [source, target] of calls) {
	if (callAllowed(source, target)) {
		edges.push(edge(source, target, "calls", 0.8));
	} else {
		droppedCalls += 1;
	}
}

const outDir = "/Users/elex-mb0203/MyWork/agent-projects/ai-pi/.ua/intermediate";
mkdirSync(outDir, { recursive: true });

const written = [];
if (parts === 1) {
	writeFileSync(`${outDir}/batch-21.json`, JSON.stringify({ nodes, edges }, null, 2) + "\n");
	written.push({ file: "batch-21.json", nodes: nodes.length, edges: edges.length });
} else {
	for (let k = 1; k <= parts; k++) {
		const set = new Set(partFiles(parts, k));
		if (set.size === 0) continue;
		const pNodes = nodes.filter((n) => set.has(n.filePath));
		const ids = new Set(pNodes.map((n) => n.id));
		const pEdges = edges.filter((e) => ids.has(e.source));
		for (const e of pEdges) {
			const okSource = ids.has(e.source);
			const okTarget =
				ids.has(e.target) || knownIds.has(e.target) || fileRefOk(e.target) || symbolRefOk(e.target);
			if (!okSource || !okTarget) {
				throw new Error(`part ${k} invalid edge ${e.source} -> ${e.target} sourceOk=${okSource} targetOk=${okTarget}`);
			}
		}
		writeFileSync(`${outDir}/batch-21-part-${k}.json`, JSON.stringify({ nodes: pNodes, edges: pEdges }, null, 2) + "\n");
		written.push({ file: `batch-21-part-${k}.json`, nodes: pNodes.length, edges: pEdges.length, files: [...set] });
	}
}

console.log(
	JSON.stringify(
		{
			nodeCount: nodes.length,
			edgeCount: edges.length,
			importEdges,
			droppedCalls,
			parts,
			partStats: partStats(parts),
			written,
		},
		null,
		2,
	),
);

