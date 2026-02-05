import { Plugin } from "obsidian";
import { ClipBookSettings, DEFAULT_SETTINGS } from "./settings";
import { parseClipBook } from "./parser";
import { renderClipBook } from "./ui/renderer";
import { ClipBookSettingTab } from "./ui/settings-tab";
import { registerCommands } from "./commands";

export default class ClipBookPlugin extends Plugin {
	settings: ClipBookSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ClipBookSettingTab(this.app, this));
		registerCommands(this);

		this.registerMarkdownCodeBlockProcessor("clipbook", (source, el, ctx) => {
			const data = parseClipBook(source, this.settings);
			renderClipBook(data, el, this.settings, this.app, ctx);
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
