/**
 * Lazy Bedrock Converse Stream loader that hides the Node-only AWS SDK from bundlers.
 *
 * 变量 specifier 挡住打包器。Bun 二进制用 setBedrockProviderModule 注入静态模块。
 */

import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

/**
 * Loads the bedrock implementation through a variable specifier so bundlers
 * (browser smoke, Bun compile) cannot follow the import into the Node-only
 * AWS SDK. The `.ts`/`.js` rewrite keeps the trick working from both source
 * and built output.
 */
const importNodeOnlyApi = (specifier: string): Promise<unknown> => {
	const runtimeSpecifier = import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier;
	return import(runtimeSpecifier);
};

let bedrockModuleOverride: ProviderStreams | undefined;

/**
 * Overrides the dynamically imported bedrock implementation. Used by the Bun
 * binary build, where the variable-specifier import cannot be bundled; the
 * build registers a statically imported module instead.
 *
 * 覆盖动态 import。测试和 Bun 打包用。设了之后 lazy 不再走变量 specifier。
 */
export function setBedrockProviderModule(module: ProviderStreams): void {
	bedrockModuleOverride = module;
}

/**
 * ProviderStreams factory for Bedrock Converse Stream.
 *
 * 优先用 override。没有则变量 specifier 动态 import。
 */
export const bedrockConverseStreamApi = (): ProviderStreams =>
	lazyApi(
		async () =>
			bedrockModuleOverride ?? ((await importNodeOnlyApi("./bedrock-converse-stream.ts")) as ProviderStreams),
	);
