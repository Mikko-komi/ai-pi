/**
 * Layout-tree nodes that stacks and scroll views expose to the frame builder.
 *
 * 布局树节点。组件通过 {@link LAYOUT_NODE} 自报；没有符号就当叶子量高。
 */

import type { Component } from "./tui.ts";

/**
 * Well-known symbol a component implements to expose its layout node.
 *
 * 组件自报布局节点的符号。不是这个 symbol 的方法不算布局根。
 */
export const LAYOUT_NODE = Symbol.for("@earendil-works/pi-tui/layout-node");

/**
 * Terminal viewport size used by visibility predicates.
 *
 * 可见性谓词看到的视口。宽高都是格子数。
 */
export interface LayoutViewport {
	width: number;
	height: number;
}

/**
 * One child in a stack layout node, with flex constraints.
 *
 * 栈布局里的一个孩子。basis/grow/shrink 给 {@link allocateStackSizes}。
 */
export interface StackLayoutEntry {
	component: Component;
	basis?: number | "auto";
	grow?: number;
	shrink?: number;
	minSize?: number;
	maxSize?: number;
	visible?: (viewport: LayoutViewport) => boolean;
}

/**
 * Vertical or horizontal stack node with gap and cross-axis align.
 *
 * 栈节点。`type` 决定主轴；entries 已是当前孩子快照。
 */
export interface StackLayoutNode {
	type: "vstack" | "hstack";
	entries: readonly StackLayoutEntry[];
	gap: number;
	align: "stretch" | "start" | "center" | "end";
}

/**
 * Mutable scroll metrics the layout pass reads and writes.
 *
 * 滚动状态。`updateLayout` 必须在量完内容高后调用，才能钳 `scrollTop`。
 */
export interface ScrollLayoutState {
	readonly scrollTop: number;
	readonly primary: boolean;
	readonly overscroll: "chain" | "contain";
	readonly viewportHeight: number;
	getContentWidth(width: number): number;
	updateLayout(contentHeight: number, viewportHeight: number, requestRender: () => void): void;
}

/**
 * Scroll node: one child plus the {@link ScrollLayoutState} that clips it.
 *
 * 滚动节点。孩子在内容坐标系，父框是视口。
 */
export interface ScrollLayoutNode {
	type: "scroll";
	component: Component;
	state: ScrollLayoutState;
}

/**
 * Discriminated layout node: stack or scroll.
 *
 * 布局节点闭集。叶子组件不出现在这里。
 */
export type LayoutNode = StackLayoutNode | ScrollLayoutNode;

/**
 * Component that can produce a {@link LayoutNode} for the frame builder.
 *
 * 能自报布局的组件。方法必须同步、无副作用以外的 IO。
 */
export interface LayoutComponent extends Component {
	[LAYOUT_NODE](): LayoutNode;
}

/**
 * Read a component's layout node, or undefined if it is a leaf.
 *
 * 不是函数或没有挂这个 symbol 就当叶子。
 */
export function getLayoutNode(component: Component): LayoutNode | undefined {
	const candidate = component as Partial<LayoutComponent>;
	return typeof candidate[LAYOUT_NODE] === "function" ? candidate[LAYOUT_NODE]() : undefined;
}
