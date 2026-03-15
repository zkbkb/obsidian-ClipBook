import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ClipBookPlugin from "./main";

export interface ClipBookSettings {
	defaultMasked: boolean;       // mask all values, not just !-prefixed
	autoHideTimeout: number;      // seconds, 0 = never
	hideOnTabSwitch: boolean;     // re-mask on blur/tab switch
	defaultCollapsed: boolean;    // sections start collapsed
	quickAddDefaultMask: boolean; // mask checkbox default in quick-add
}

export const DEFAULT_SETTINGS: ClipBookSettings = {
	defaultMasked: false,
	autoHideTimeout: 5,
	hideOnTabSwitch: true,
	defaultCollapsed: false,
	quickAddDefaultMask: true,
};

export class ClipBookSettingTab extends PluginSettingTab {
	plugin: ClipBookPlugin;
	private delayInputEl: HTMLInputElement | null = null;

	constructor(app: App, plugin: ClipBookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		if (!this.delayInputEl) return;
		// If auto-hide is disabled, nothing to validate
		if (this.plugin.settings.autoHideTimeout === 0) return;
		// If delay input is empty/invalid on exit, reset to default 5s
		const num = parseInt(this.delayInputEl.value, 10);
		if (isNaN(num) || num < 1) {
			this.plugin.settings.autoHideTimeout = DEFAULT_SETTINGS.autoHideTimeout;
			this.plugin.saveSettings().catch(() => {
				new Notice("Clipbook: failed to save settings.");
			});
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Mask all values by default")
			.setDesc(
				"When enabled, all values are masked — not just those with the `!` prefix"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultMasked)
					.onChange(async (value) => {
						this.plugin.settings.defaultMasked = value;
						await this.plugin.saveSettings();
					})
			);

		const autoHideEnabled = this.plugin.settings.autoHideTimeout > 0;
		// Remember last non-zero delay so toggling off/on doesn't lose it
		let lastDelay = autoHideEnabled
			? this.plugin.settings.autoHideTimeout
			: DEFAULT_SETTINGS.autoHideTimeout;

		new Setting(containerEl)
			.setName("Auto-hide revealed values")
			.setDesc(
				"Automatically re-mask revealed values after a delay."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(autoHideEnabled)
					.onChange(async (value) => {
						this.plugin.settings.autoHideTimeout = value
							? lastDelay
							: 0;
						await this.plugin.saveSettings();
						delaySetting.settingEl.toggle(value);
					})
			);

		const delaySetting = new Setting(containerEl)
			.setName("Auto-hide delay (s)")
			.setDesc("Seconds before a revealed value is re-masked.")
			.addText((text) => {
				this.delayInputEl = text.inputEl;
				text
					.setPlaceholder("5")
					.setValue(String(lastDelay))
					.onChange(async (raw) => {
						const num = parseInt(raw, 10);
						if (isNaN(num) || num < 1) return;
						lastDelay = num;
						this.plugin.settings.autoHideTimeout = num;
						await this.plugin.saveSettings();
					});
			});

		delaySetting.settingEl.toggle(autoHideEnabled);

		new Setting(containerEl)
			.setName("Hide on tab switch")
			.setDesc(
				"Re-mask all revealed values when switching to another tab or window"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.hideOnTabSwitch)
					.onChange(async (value) => {
						this.plugin.settings.hideOnTabSwitch = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Sections start collapsed")
			.setDesc("Whether sections are collapsed by default in reading view")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultCollapsed)
					.onChange(async (value) => {
						this.plugin.settings.defaultCollapsed = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Mask new entries by default")
			.setDesc(
				"Whether the mask checkbox is checked by default in the quick-add form"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.quickAddDefaultMask)
					.onChange(async (value) => {
						this.plugin.settings.quickAddDefaultMask = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
