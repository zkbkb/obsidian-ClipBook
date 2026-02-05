import { App, PluginSettingTab, Setting } from "obsidian";
import type ClipBookPlugin from "../main";

export class ClipBookSettingTab extends PluginSettingTab {
	plugin: ClipBookPlugin;

	constructor(app: App, plugin: ClipBookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// — Masking —
		containerEl.createEl("h3", { text: "Masking" });

		new Setting(containerEl)
			.setName("Mask all values by default")
			.setDesc(
				"When enabled, all values are masked unless explicitly shown. " +
				"The ! prefix in the source still forces masking when this is off."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.defaultMasked)
					.onChange(async (value) => {
						this.plugin.settings.defaultMasked = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-hide revealed values")
			.setDesc(
				"Automatically re-mask revealed values after a delay."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoHideEnabled)
					.onChange(async (value) => {
						this.plugin.settings.autoHideEnabled = value;
						await this.plugin.saveSettings();
						// Show/hide the delay setting
						delaySetting.settingEl.toggle(value);
					})
			);

		const delaySetting = new Setting(containerEl)
			.setName("Auto-hide delay")
			.setDesc("Seconds before a revealed value is re-masked.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 30, 1)
					.setValue(this.plugin.settings.autoHideDelay / 1000)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.autoHideDelay = value * 1000;
						await this.plugin.saveSettings();
					})
			);

		// Only show delay slider when auto-hide is enabled
		delaySetting.settingEl.toggle(this.plugin.settings.autoHideEnabled);

		// — Display —
		containerEl.createEl("h3", { text: "Display" });

		new Setting(containerEl)
			.setName("Collapsible sections")
			.setDesc(
				"Click section headers to collapse or expand their entries."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.collapsibleSections)
					.onChange(async (value) => {
						this.plugin.settings.collapsibleSections = value;
						await this.plugin.saveSettings();
					})
			);

		// — Info —
		containerEl.createEl("h3", { text: "Note" });
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "Changes apply to newly rendered blocks. Re-open notes or switch views to see updates on existing blocks.",
		});
	}
}
