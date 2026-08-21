import { Plugin } from "obsidian";
import { parseClipBook } from "./parser";
import { renderClipBook } from "./ui/renderer";
import { RevealRegistry } from "./ui/reveal-registry";
import {
	ClipBookSettings,
	ClipBookSettingTab,
	normalizeSettings,
} from "./settings";
import { registerCommands } from "./commands";

export default class ClipBookPlugin extends Plugin {
	settings!: ClipBookSettings;
	private readonly reveals = new RevealRegistry();

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ClipBookSettingTab(this.app, this));
		registerCommands(this);

		this.registerMarkdownCodeBlockProcessor("clipbook", (source, el, ctx) => {
			renderClipBook(parseClipBook(source), {
				app: this.app,
				ctx,
				containerEl: el,
				settings: this.settings,
				reveals: this.reveals,
			});
		});

		// Blur-based auto-hide: re-mask everything on tab or window switch.
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () =>
				this.hideRevealedIfEnabled()
			)
		);
		this.registerBlurHandler(window);
		// Popout windows are separate `window` objects and do not surface their
		// blur events on the main one.
		this.registerEvent(
			this.app.workspace.on("window-open", (_workspaceWindow, win) =>
				this.registerBlurHandler(win)
			)
		);
	}

	onunload() {
		this.reveals.clear();
	}

	async loadSettings() {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private registerBlurHandler(win: Window): void {
		this.registerDomEvent(win, "blur", () => this.hideRevealedIfEnabled());
	}

	private hideRevealedIfEnabled(): void {
		if (this.settings.hideOnTabSwitch) this.reveals.hideAll();
	}
}
