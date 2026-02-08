import { App, PluginSettingTab, Setting } from "obsidian";
import type ClipBookPlugin from "./main";

export interface ClipBookSettings {
	autoHideTimeout: number;      // seconds, 0 = never
	hideOnTabSwitch: boolean;     // re-mask on blur/tab switch
	defaultCollapsed: boolean;    // sections start collapsed
	quickAddDefaultMask: boolean; // mask checkbox default in quick-add
}

export const DEFAULT_SETTINGS: ClipBookSettings = {
	autoHideTimeout: 5,
	hideOnTabSwitch: true,
	defaultCollapsed: false,
	quickAddDefaultMask: true,
};

export class ClipBookSettingTab extends PluginSettingTab {
	plugin: ClipBookPlugin;

	constructor(app: App, plugin: ClipBookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Auto-hide revealed values")
			.setDesc("Re-mask revealed values after this duration")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("3", "3 seconds")
					.addOption("5", "5 seconds")
					.addOption("10", "10 seconds")
					.addOption("30", "30 seconds")
					.addOption("0", "Never")
					.setValue(String(this.plugin.settings.autoHideTimeout))
					.onChange(async (value) => {
						this.plugin.settings.autoHideTimeout = Number(value);
						await this.plugin.saveSettings();
					})
			);

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
