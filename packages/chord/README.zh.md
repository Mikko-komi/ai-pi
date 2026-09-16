# @earendil-works/chord

> 本文为 [README.md](README.md) 的中文译本。

Chord 是面向由插件/扩展组装的系统的应用组合运行时。它提供 facet、service、复制状态，以及可插拔的远程 service 边界。它作为独立包在 Pi monorepo 中开发，但不是 Pi 包：它不依赖任何其他 Pi workspace 包，也可被无关应用使用。

## Chord 的用途

同一个应用功能可能需要在多个环境中运行：例如 agent worker、终端 UI，以及远程 WebUI。Chord 提供通用机制，让这类扩展既能让人写得舒服，也能让 agent 写得舒服。

设计由几块相互关联的部分组成：

- **Plugin** 是同步的 setup 单元，声明它们提供和需要的 service。每个插件声明完自己的形状后，host 校验完整依赖图，绑定 service，先激活 provider 再激活 consumer，并按相反依赖顺序释放资源。这些单元称为 *facet*。

- **Facet** 是插件的组成部分。每个 facet 单独打包，并在它应当运行的进程或环境中运行。你可以用 facet 把一个插件拆成需要加载到不同进程和环境中的若干块（例如 backend、browser、TUI 等）。

- **Service** 是带类型的稳定 token，要么有一个 provider（**singleton**），要么有动态 keyed 实例（**keyed**）。service 可以是进程内的、带无限制 JavaScript 契约，也可以远程暴露。当 provider 断开或被替换时，consumer 仍保留稳定的 facade。

- **复制状态** 向本地和远程已连接的 consumer 暴露权威状态。Producer 变更被跟踪的 `state` proxy 并调用 `publish(context)`；consumer 收到完整的不可变值。Chord 在每次发布时 flush 一个已解码的 operation batch，而每条远程 client/state 流拥有独立的 path-codec 状态。Replica 在断开或替换后变为未就绪，直到被重新 hydrate。

- **Delta tracking** 在 flush 时从被跟踪的纯 JSON 推导紧凑 operation。它在不保留变更历史的前提下保留字符串 append/前端截断以及数组 append 行为，支持持久的 base batch，并在应用不受信任的 operation 时进行校验。

- **远程 service source** 通告 facet host 之外可用的 service，并为其 facet 所需的 service 打开 binding。Binding 通过应用提供的 adapter 承载逻辑调用和 subscription。Chord 要求参数、结果、snapshot、更新和 catalogue 都是 strict JSON，但不规定 framing、路由、transport 或应用线上 envelope。`JsonRepresentation<T>` 为带未知 payload 的应用数据推导出线上安全的类型，`isJsonValue()` 在 adapter 边界校验收到的值。对称 RPC peer 计划作为该边界的一种可选实现。

- **Context** Chord 提供类似 Go 的 context 系统，用于取消以及调用范围的应用值。应用可以通过这些值携带权限或 telemetry，而 Chord 本身不依赖这两者。

当前运行时从 `@earendil-works/chord` 导出 service token、singleton 与 keyed provider、远程 binding、复制状态、facet host 以及 facet loader。从包根导入公开类型和通用运行时 API。Context 常量和函数位于 `@earendil-works/chord/context`，因为它们的通用名称不应污染根 API。
Chord 拥有的标识符使用 `chord.*` 命名空间，其保留的 service 前缀是 `$chord.*`。

## 远程 service adapter

Chord 拥有与 transport 无关的 service 线上语法。Consumer adapter 使用 `createServiceCatalogueCall()`、`createServiceSubscribeCall()` 和 `createServiceUnsubscribeCall()` 发起 `$chord.service` 控制调用。`createRemoteServiceEndpoint()` 为一个 provider consumer 处理这些调用，包括 subscription 的激活与清理。`parseServiceCall()`、`parseServiceCatalogue()` 以及 decoded/wire 的 snapshot 与 update parser，在 adapter 建立 strict-JSON 边界之后校验 Chord 语义。`RemoteServiceErrorCode` 和 `REMOTE_SERVICE_ERROR_CODES` 定义可以跨越该边界的 service 错误。

复制状态 operation 在每个 subscription 上，于 provider 侧使用一个 `createServiceStateEncoder()`，于 consumer 侧使用一个 `createServiceStateDecoder()`。这些 registry 为每个 instance/member state 创建独立的 Delta path 字典，并在替换、不可用、关闭或重新 hydration 时重置。应用可以把这些值放进任意路由、请求、响应或事件 envelope；Chord 不规定那层外层协议。

## 跟踪 JSON delta

从 `@earendil-works/chord/delta` 导入独立的 delta 原语：

```ts
import { apply, track } from "@earendil-works/chord/delta";

const changes = track({ output: "", count: 0 });
changes.flush(); // opening base batch
changes.state.output += "done\n";
changes.state.count += 1;

const ops = changes.flush();
const replica = apply({ output: "", count: 0 }, ops);
```

第一次 flush 始终是完整的 base batch。后续 flush 包含基于 path 的变更。`applyImmutable()` 在保留先前 replica revision 的同时应用这些 batch。`replicatedState(initial)` 直接使用 tracking：

```ts
const status = env.replicatedState({ output: "", count: 0 });
status.state.output += "done\n";
status.state.count += 1;
status.publish(context);
```

`publish()` flush 一次；远程连接管道为每一对 client/state 独立编码该 operation batch。字符串赋值把纯 append 和滚动窗口移动保留为 append 与前端截断 operation；无关的重写回退为 set。插入到被跟踪 state 中的值归 tracker 所有，之后必须只通过 `state` 变更。关于 mutation、数组、生命周期和 consumer 所有权规则，见 [Delta 指南](src/delta/README.md)。

## 打包与加载 facet

`@earendil-works/chord/bundler` 使用 esbuild 把 ESM 或 TypeScript 应用入口变成独立的、内容寻址的 CommonJS 文件。包级 API 从 `package.json` 读取插件身份和构建设置，然后应用 host 应用提供的 facet 路径约定：

```json
{
  "name": "@example/my-plugin",
  "version": "1.0.0",
  "type": "module",
  "peerDependencies": {
    "@earendil-works/chord": "^0.84.4"
  },
  "chord": {
    "facets": {
      "worker": "./src/custom-worker.ts",
      "presentation": false
    }
  }
}
```

```ts
import { bundleFacetPackage } from "@earendil-works/chord/bundler";

await bundleFacetPackage({
	packagePath: "/path/to/my-plugin",
	outdir: "/application-owned/plugin-builds/my-plugin",
	defaultFacets: {
		worker: "src/worker.ts",
		presentation: "src/presentation.ts",
	},
});
```

已有的约定文件会成为入口，除非 `chord.facets` 覆盖或禁用它们。peer dependency 会被 externalize，并在加载时相对 host 解析。Chord 从不安装依赖，也不跑包的生命周期脚本。`bundleFacets()` 仍作为更底层的 API 提供给已经有显式插件身份和入口映射的调用方。

输出目录为每个入口包含一个 `.cjs` 文件，外加 `chord-facets.json`。通过仅 Node 可用的 loader 加载一个由应用选定的入口：

```ts
import { createFacetBundleLoader } from "@earendil-works/chord/node";

const loader = createFacetBundleLoader({
	manifestPath: "/application-owned/plugin-builds/my-plugin/chord-facets.json",
	entry: "worker",
	resolveExternal: (specifier) => import.meta.resolve(specifier),
});
const loaded = await loader.load();
```

每次 `load()` 校验 SHA-256 完整性，并用 `node:vm` 直接编译 CommonJS 正文，而不是把插件放进 Node 的 CommonJS 或 ESM 模块缓存。External 由 host 解析，并通过受限的 `require` 加载；esbuild 会把动态 import 降级，使它们走同一路径。释放已退役的 generation 会放开 loader 的 facet 引用，从而在插件自有资源也消失后，让已编译代码可以被垃圾回收。

为了传输到另一个 Node host，`readFacetBundleArtifact()` 把一个已校验的 manifest 入口连同其源打包，`createFacetBundleArtifactLoader()` 物化新的临时 generation，并相对接收方 host 解析 external。

要 reload：加载一个候选，把它的 facet 传给 `FacetHost.reload()`，失败时释放候选，并且只在成功切换后再释放已退役的 `LoadedFacets`。host 在旧 provider 仍保持路由的同时激活并校验候选，然后直接替换每个 singleton，中间没有不可用区间。因此在普通 reload 期间，稳定的 service handle 不会断开。keyed 实例仍绑定到具体 incarnation，替换会得到新的 generation。bundler 在替换先前输出之前先写完一个完整的临时目录，因此 loader 不会观察到半成品 generation。

更广的 RPC 与 generation 加载架构见 [PLANNING.md](PLANNING.md)。
