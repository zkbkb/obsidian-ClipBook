import { Plugin } from "obsidian";
import { parseClipBook } from "./parser";
import { renderClipBook, hideAllRevealed } from "./ui/renderer";
import {
	ClipBookSettings,
	DEFAULT_SETTINGS,
	ClipBookSettingTab,
} from "./settings";
import { registerCommands } from "./commands";

export default class ClipBookPlugin extends Plugin {
	settings!: ClipBookSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ClipBookSettingTab(this.app, this));
		registerCommands(this);

		this.registerMarkdownCodeBlockProcessor(
			"clipbook",
			(source, el, ctx) => {
				const data = parseClipBook(source);
				renderClipBook(data, el, this.settings, ctx, this.app);
			}
		);

		// Blur-based auto-hide: re-mask all revealed values on tab/window switch
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (this.settings.hideOnTabSwitch) hideAllRevealed();
			})
		);
		this.registerDomEvent(window, "blur", () => {
			if (this.settings.hideOnTabSwitch) hideAllRevealed();
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ClipBookSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
