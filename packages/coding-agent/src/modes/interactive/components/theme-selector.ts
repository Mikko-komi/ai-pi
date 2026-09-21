/**
 * Theme picker that previews the highlighted row.
 *
 * 主题选择列表。光标移动就预览，确认才提交，取消还原。
 */

import { Container, type SelectItem, SelectList, type SelectListLayoutOptions } from "@earendil-works/pi-tui";
import { getAvailableThemes, getSelectListTheme } from "../theme/theme.ts";
import { DynamicBorder } from "./dynamic-border.ts";

const THEME_SELECT_LIST_LAYOUT: SelectListLayoutOptions = {
	minPrimaryColumnWidth: 12,
	maxPrimaryColumnWidth: 32,
};

/**
 * Component that renders a theme selector
 *
 * 带边框的主题列表。当前主题预选并标 `(current)`。
 */
export class ThemeSelectorComponent extends Container {
	private selectList: SelectList;
	private onPreview: (themeName: string) => void;

	constructor(
		currentTheme: string,
		onSelect: (themeName: string) => void,
		onCancel: () => void,
		onPreview: (themeName: string) => void,
	) {
		super();
		this.onPreview = onPreview;

		// Get available themes and create select items
		const themes = getAvailableThemes();
		const themeItems: SelectItem[] = themes.map((name) => ({
			value: name,
			label: name,
			description: name === currentTheme ? "(current)" : undefined,
		}));

		// Add top border
		this.addChild(new DynamicBorder());

		// Create selector
		this.selectList = new SelectList(themeItems, 10, getSelectListTheme(), THEME_SELECT_LIST_LAYOUT);

		// Preselect current theme
		const currentIndex = themes.indexOf(currentTheme);
		if (currentIndex !== -1) {
			this.selectList.setSelectedIndex(currentIndex);
		}

		this.selectList.onSelect = (item) => {
			onSelect(item.value);
		};

		this.selectList.onCancel = () => {
			onCancel();
		};

		this.selectList.onSelectionChange = (item) => {
			this.onPreview(item.value);
		};

		this.addChild(this.selectList);

		// Add bottom border
		this.addChild(new DynamicBorder());
	}

	getSelectList(): SelectList {
		return this.selectList;
	}
}
