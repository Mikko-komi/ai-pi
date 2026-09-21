/**
 * Simple text input component for extensions.
 *
 * 扩展用的单行输入。可选倒计时，到点当取消。
 */

import { Container, type Focusable, getKeybindings, Input, Spacer, Text, type TUI } from "@earendil-works/pi-tui";
import { theme } from "../theme/theme.ts";
import { CountdownTimer } from "./countdown-timer.ts";
import { DynamicBorder } from "./dynamic-border.ts";
import { keyHint } from "./keybinding-hints.ts";

/**
 * Optional timeout for {@link ExtensionInputComponent}.
 *
 * 输入框附加项。`timeout` 要同时有 `tui` 才会倒计时。
 */
export interface ExtensionInputOptions {
	tui?: TUI;
	timeout?: number;
}

/**
 * Bordered single-line input used by extension prompts.
 *
 * 扩展弹出的单行输入。焦点转给内部 Input；Enter 提交，Esc 取消。
 */
export class ExtensionInputComponent extends Container implements Focusable {
	private input: Input;
	private onSubmitCallback: (value: string) => void;
	private onCancelCallback: () => void;
	private titleText: Text;
	private baseTitle: string;
	private countdown: CountdownTimer | undefined;

	// Focusable implementation - propagate to input for IME cursor positioning
	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.input.focused = value;
	}

	constructor(
		title: string,
		_placeholder: string | undefined,
		onSubmit: (value: string) => void,
		onCancel: () => void,
		opts?: ExtensionInputOptions,
	) {
		super();

		this.onSubmitCallback = onSubmit;
		this.onCancelCallback = onCancel;
		this.baseTitle = title;

		this.addChild(new DynamicBorder());
		this.addChild(new Spacer(1));

		this.titleText = new Text(theme.fg("accent", title), 1, 0);
		this.addChild(this.titleText);
		this.addChild(new Spacer(1));

		if (opts?.timeout && opts.timeout > 0 && opts.tui) {
			this.countdown = new CountdownTimer(
				opts.timeout,
				opts.tui,
				(s) => this.titleText.setText(theme.fg("accent", `${this.baseTitle} (${s}s)`)),
				() => this.onCancelCallback(),
			);
		}

		this.input = new Input();
		this.addChild(this.input);
		this.addChild(new Spacer(1));
		this.addChild(
			new Text(`${keyHint("tui.select.confirm", "submit")}  ${keyHint("tui.select.cancel", "cancel")}`, 1, 0),
		);
		this.addChild(new Spacer(1));
		this.addChild(new DynamicBorder());
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (kb.matches(keyData, "tui.select.confirm") || keyData === "\n") {
			this.onSubmitCallback(this.input.getValue());
		} else if (kb.matches(keyData, "tui.select.cancel")) {
			this.onCancelCallback();
		} else {
			this.input.handleInput(keyData);
		}
	}

	dispose(): void {
		this.countdown?.dispose();
	}
}
