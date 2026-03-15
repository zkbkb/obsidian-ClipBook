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
		const saved: unknown = await this.loadData();
		const overrides: Partial<ClipBookSettings> = {};
		if (saved != null && typeof saved === "object" && !Array.isArray(saved)) {
			const obj = saved as Record<string, unknown>;
			if (typeof obj.defaultMasked === "boolean") overrides.defaultMasked = obj.defaultMasked;
			if (typeof obj.autoHideTimeout === "number" && obj.autoHideTimeout >= 0) overrides.autoHideTimeout = obj.autoHideTimeout;
			if (typeof obj.hideOnTabSwitch === "boolean") overrides.hideOnTabSwitch = obj.hideOnTabSwitch;
			if (typeof obj.defaultCollapsed === "boolean") overrides.defaultCollapsed = obj.defaultCollapsed;
			if (typeof obj.quickAddDefaultMask === "boolean") overrides.quickAddDefaultMask = obj.quickAddDefaultMask;
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, overrides);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
