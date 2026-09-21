/**
 * Built-in inline extensions shipped with the product binary.
 *
 * 随产品打包的内联扩展。目前只有隐藏的 llama.cpp，不参与用户发现列表。
 */

import type { InlineExtension } from "../core/extensions/types.ts";
import llamaExtension from "./llama/index.ts";

/**
 * Hidden llama.cpp factory; merged into CLI `MainOptions.extensionFactories`.
 *
 * 隐藏的 llama.cpp 工厂。它是内置列表的唯一项，额外工厂接在后面。
 */
export const builtInExtensions: InlineExtension[] = [{ name: "llama.cpp", factory: llamaExtension, hidden: true }];
