import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ClipBookPlugin from "./main";

// A type alias rather than an interface so `normalizeSettings` can write to it
// through a string index signature without casting.
export type ClipBookSettings = {
	defaultMasked: boolean;       // mask all values, not just !-prefixed
	autoHideTimeout: number;      // seconds, 0 = never
	hideOnTabSwitch: boolean;     // re-mask on blur/tab switch
	defaultCollapsed: boolean;    // sections start collapsed
	quickAddDefaultMask: boolean; // mask checkbox default in quick-add
	clipboardClearTimeout: number; // seconds before a copied secret is cleared, 0 = never
};

export const DEFAULT_SETTINGS: ClipBookSettings = {
	defaultMasked: false,
	autoHideTimeout: 5,
	hideOnTabSwitch: true,
	defaultCollapsed: false,
	quickAddDefaultMask: true,
	clipboardClearTimeout: 0,
};

/**
 * Coerce whatever `loadData()` returns into valid settings, discarding anything
 * of the wrong shape. Driven by `DEFAULT_SETTINGS` so that adding a setting
 * means touching the interface and the defaults, and nothing else.
 */
export function normalizeSettings(saved: unknown): ClipBookSettings {
	const settings: ClipBookSettings = { ...DEFAULT_SETTINGS };
	if (saved === null || typeof saved !== "object" || Array.isArray(saved)) {
		return settings;
	}

	const stored = saved as Record<string, unknown>;
	const target: Record<string, unknown> = settings;
	for (const key of Object.keys(DEFAULT_SETTINGS)) {
		const value = stored[key];
		if (typeof value !== typeof target[key]) continue;
		if (typeof value === "number" && !(Number.isFinite(value) && value >= 0)) {
			continue;
		}
		target[key] = value;
	}
	return settings;
}

/** A pair of settings: an on/off toggle and the delay it enables. */
interface DurationField {
	inputEl: HTMLInputElement;
	read: () => number;
	write: (seconds: number) => void;
	fallback: number;
}

interface DurationOptions {
	name: string;
	desc: string;
	delayName: string;
	delayDesc: string;
	read: () => number;
	write: (seconds: number) => void;
	fallback: number;
}

export class ClipBookSettingTab extends PluginSettingTab {
	plugin: ClipBookPlugin;
	private durationFields: DurationField[] = [];

	constructor(app: App, plugin: ClipBookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** A delay left empty or nonsensical on the way out falls back to its default. */
	override hide(): void {
		let repaired = false;
		for (const field of this.durationFields) {
			// Zero means the feature is off; there is no delay to validate.
			if (field.read() === 0) continue;
			const seconds = parseInt(field.inputEl.value, 10);
			if (Number.isFinite(seconds) && seconds >= 1) continue;
			field.write(field.fallback);
			repaired = true;
		}
		if (!repaired) return;

		this.plugin.saveSettings().catch((error) => {
			console.error("ClipBook: Failed to save settings.", error);
			new Notice("Failed to save settings.");
		});
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.durationFields = [];

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

		this.addDurationSetting(containerEl, {
			name: "Auto-hide revealed values",
			desc: "Automatically re-mask revealed values after a delay.",
			delayName: "Auto-hide delay (s)",
			delayDesc: "Seconds before a revealed value is re-masked.",
			read: () => this.plugin.settings.autoHideTimeout,
			write: (seconds) => {
				this.plugin.settings.autoHideTimeout = seconds;
			},
			fallback: DEFAULT_SETTINGS.autoHideTimeout,
		});

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

		this.addDurationSetting(containerEl, {
			name: "Clear the clipboard after copying",
			desc:
				"Empty the clipboard a while after a masked value is copied, so a " +
				"secret does not sit there for the rest of the day. Only ever " +
				"clears the value ClipBook put there, and only where the platform " +
				"allows reading the clipboard back.",
			delayName: "Clear the clipboard after (s)",
			delayDesc: "Seconds before a copied masked value is cleared.",
			read: () => this.plugin.settings.clipboardClearTimeout,
			write: (seconds) => {
				this.plugin.settings.clipboardClearTimeout = seconds;
			},
			fallback: 45,
		});

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

	/**
	 * A toggle plus the delay it controls, stored as one number where zero means
	 * off. The delay row hides with the toggle, and the last non-zero value is
	 * remembered so switching off and on again does not lose it.
	 */
	private addDurationSetting(
		containerEl: HTMLElement,
		options: DurationOptions
	): void {
		const enabled = options.read() > 0;
		let lastDelay = enabled ? options.read() : options.fallback;

		new Setting(containerEl)
			.setName(options.name)
			.setDesc(options.desc)
			.addToggle((toggle) =>
				toggle.setValue(enabled).onChange(async (value) => {
					options.write(value ? lastDelay : 0);
					await this.plugin.saveSettings();
					delaySetting.settingEl.toggle(value);
				})
			);

		const delaySetting = new Setting(containerEl)
			.setName(options.delayName)
			.setDesc(options.delayDesc)
			.addText((text) => {
				this.durationFields.push({
					inputEl: text.inputEl,
					read: options.read,
					write: options.write,
					fallback: options.fallback,
				});
				text
					.setPlaceholder(String(options.fallback))
					.setValue(String(lastDelay))
					.onChange(async (raw) => {
						const seconds = parseInt(raw, 10);
						if (!Number.isFinite(seconds) || seconds < 1) return;
						lastDelay = seconds;
						options.write(seconds);
						await this.plugin.saveSettings();
					});
			});

		delaySetting.settingEl.toggle(enabled);
	}
}
