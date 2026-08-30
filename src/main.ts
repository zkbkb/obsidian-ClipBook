import { Component, Plugin } from "obsidian";
import { parseClipBook } from "./parser";
import { renderClipBook } from "./ui/renderer";
import { RevealRegistry } from "./ui/reveal-registry";
import { CollapseRegistry } from "./ui/collapse-state";
import { ClipboardGuard } from "./clipboard";
import {
	ClipBookSettings,
	ClipBookSettingTab,
	normalizeSettings,
} from "./settings";
import { registerCommands } from "./commands";

export default class ClipBookPlugin extends Plugin {
	override settings!: ClipBookSettings;
	private readonly reveals = new RevealRegistry();
	private readonly collapse = new CollapseRegistry();
	private readonly clipboard = new ClipboardGuard(window);
	private readonly blurHandlers = new Map<Window, Component>();

	override async onload() {
		await this.loadSettings();
		this.addSettingTab(new ClipBookSettingTab(this.app, this));
		registerCommands(this, {
			app: this.app,
			reveals: this.reveals,
			clipboard: this.clipboard,
			settings: () => this.settings,
		});

		this.registerMarkdownCodeBlockProcessor("clipbook", (source, el, ctx) => {
			renderClipBook(parseClipBook(source), {
				app: this.app,
				ctx,
				containerEl: el,
				settings: this.settings,
				reveals: this.reveals,
				collapse: this.collapse,
				clipboard: this.clipboard,
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
		this.registerEvent(
			this.app.workspace.on("window-close", (_workspaceWindow, win) =>
				this.releaseBlurHandler(win)
			)
		);
	}

	override onunload() {
		this.reveals.clear();
		this.collapse.clear();
		// Leaving a scheduled wipe behind would clear the clipboard from a
		// plugin that is no longer running.
		this.clipboard.cancel();
		this.blurHandlers.clear();
	}

	async loadSettings() {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * One child component per window, rather than registering on the plugin
	 * itself: closing a popout releases its listener there and then, instead of
	 * retaining the dead window and its document until the plugin unloads.
	 */
	private registerBlurHandler(win: Window): void {
		if (this.blurHandlers.has(win)) return;
		const handler = this.addChild(new Component());
		handler.registerDomEvent(win, "blur", () => this.hideRevealedIfEnabled());
		this.blurHandlers.set(win, handler);
	}

	private releaseBlurHandler(win: Window): void {
		const handler = this.blurHandlers.get(win);
		if (!handler) return;
		this.blurHandlers.delete(win);
		this.removeChild(handler);
	}

	private hideRevealedIfEnabled(): void {
		if (this.settings.hideOnTabSwitch) this.reveals.hideAll();
	}
}
