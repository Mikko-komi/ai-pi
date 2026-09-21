/**
 * Fullscreen chat layout: scrolling transcript plus a fixed input dock.
 *
 * 全屏聊天布局。transcript 可滚，输入坞（pending/status/editor/footer）钉在底部。
 */

import { type Component, ScrollView, type ScrollViewScrollbar, VStack } from "@earendil-works/pi-tui";

/**
 * Slots for {@link createChatViewport}.
 *
 * 视口插槽。document 进 ScrollView；其余进底部 dock，可按需缩到 0。
 */
export interface ChatViewportOptions {
	readonly document: Component;
	readonly pendingMessages: Component;
	readonly status: Component;
	readonly editor: Component;
	readonly footer: Component;
	readonly widgetsAbove?: Component;
	readonly widgetsBelow?: Component;
	readonly scrollbar?: ScrollViewScrollbar;
	readonly scrollbarTrackStyle?: (text: string) => string;
	readonly scrollbarThumbStyle?: (text: string) => string;
}

/**
 * Assembled fullscreen chat tree.
 *
 * 拼好的全屏树。`root` 给 TUI 挂载；`transcript` 仍可被模式层滚动控制。
 */
export interface ChatViewport {
	readonly root: Component;
	readonly transcript: ScrollView;
}

/**
 * Shared fullscreen transcript and fixed input-dock layout.
 *
 * 拼 transcript + dock。transcript follow=end；editor 最小高度 3，其余 dock 子项可缩没。
 */
export function createChatViewport(options: ChatViewportOptions): ChatViewport {
	const transcript = new ScrollView(options.document, {
		follow: "end",
		primary: true,
		overscroll: "chain",
		scrollbar: options.scrollbar ?? "auto",
		...(options.scrollbarTrackStyle === undefined ? {} : { scrollbarTrackStyle: options.scrollbarTrackStyle }),
		...(options.scrollbarThumbStyle === undefined ? {} : { scrollbarThumbStyle: options.scrollbarThumbStyle }),
	});
	const dock = new VStack([
		{ component: options.pendingMessages, shrink: 1, minSize: 0 },
		{ component: options.status, shrink: 1, minSize: 0 },
		...(options.widgetsAbove === undefined ? [] : [{ component: options.widgetsAbove, shrink: 1, minSize: 0 }]),
		{ component: options.editor, shrink: 1, minSize: 3 },
		...(options.widgetsBelow === undefined ? [] : [{ component: options.widgetsBelow, shrink: 1, minSize: 0 }]),
		{ component: options.footer, shrink: 1, minSize: 0 },
	]);
	return {
		transcript,
		root: new VStack([
			{ component: transcript, basis: 0, grow: 1, shrink: 1, minSize: 1 },
			{ component: dock, basis: "auto", grow: 0, shrink: 1, minSize: 1 },
		]),
	};
}
