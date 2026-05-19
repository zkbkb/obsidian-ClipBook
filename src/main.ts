import { Plugin } from "obsidian";
import { parseClipBook } from "./parser";
import { renderClipBook, hideAllRevealed } from "./ui/renderer";
import {
	ClipBookSettings,
	DEFAULT_SETTINGS,
	ClipBookSettingTab,
} from "./settings";
import { registerCommands } from "./commands";

function isSettingsRecord(
	value: unknown
): value is Partial<Record<keyof ClipBookSettings, unknown>> {
	return value != null && typeof value === "object" && !Array.isArray(value);
}

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
		const hideOnBlur = () => {
			if (this.settings.hideOnTabSwitch) hideAllRevealed();
		};
		this.registerDomEvent(activeWindow, "blur", hideOnBlur);
		this.registerEvent(
			this.app.workspace.on("window-open", (_workspaceWindow, win) => {
				this.registerDomEvent(win, "blur", hideOnBlur);
			})
		);
	}

	async loadSettings() {
		const saved = (await this.loadData()) as unknown;
		const overrides: Partial<ClipBookSettings> = {};
		if (isSettingsRecord(saved)) {
			if (typeof saved.defaultMasked === "boolean") overrides.defaultMasked = saved.defaultMasked;
			if (typeof saved.autoHideTimeout === "number" && saved.autoHideTimeout >= 0) overrides.autoHideTimeout = saved.autoHideTimeout;
			if (typeof saved.hideOnTabSwitch === "boolean") overrides.hideOnTabSwitch = saved.hideOnTabSwitch;
			if (typeof saved.defaultCollapsed === "boolean") overrides.defaultCollapsed = saved.defaultCollapsed;
			if (typeof saved.quickAddDefaultMask === "boolean") overrides.quickAddDefaultMask = saved.quickAddDefaultMask;
		}
		this.settings = { ...DEFAULT_SETTINGS, ...overrides };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
