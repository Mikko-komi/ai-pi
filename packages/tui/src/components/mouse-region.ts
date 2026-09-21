/**
 * Mouse-handler wrapper that does not change child rendering.
 *
 * 包一层鼠标回调。子组件先处理，未处理才落到本层。
 */

import {
	type Component,
	dispatchMouseEvent,
	type TuiMouseDispatchResult,
	type TuiMouseEvent,
	type TuiMouseEventResult,
} from "../tui.ts";

/**
 * Mouse callback used when the wrapped child does not handle the event.
 *
 * 子组件没吃掉事件时的回调。返回值语义同 {@link Component.handleMouse}。
 */
export type MouseRegionHandler = (event: TuiMouseEvent) => TuiMouseEventResult | undefined;

/**
 * Adds mouse handling to an existing component without changing its rendering.
 *
 * 渲染原样子。invalidate 下传到 child。
 */
export class MouseRegion implements Component {
	private readonly child: Component;
	private readonly onMouse: MouseRegionHandler;

	constructor(child: Component, onMouse: MouseRegionHandler) {
		this.child = child;
		this.onMouse = onMouse;
	}

	render(width: number): string[] {
		return this.child.render(width);
	}

	handleMouse(event: TuiMouseEvent): TuiMouseDispatchResult | TuiMouseEventResult | undefined {
		const childResult = dispatchMouseEvent(this.child, event);
		return childResult ?? this.onMouse(event);
	}

	invalidate(): void {
		this.child.invalidate();
	}
}
