import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type ClipBookPlugin from "./main";
import {
	DEFAULT_SETTINGS,
	DelayMemory,
	DurationDecl,
	SETTING_DECLS,
	SettingDecl,
	ToggleDecl,
	delayFor,
	enabledKey,
	readControl,
	writeControl,
} from "./settings-defs";

export type { ClipBookSettings } from "./settings-defs";
export { DEFAULT_SETTINGS, normalizeSettings } from "./settings-defs";

/** A delay field drawn by the `display()` fallback, kept for `hide()`. */
interface DurationField {
	inputEl: HTMLInputElement;
	decl: DurationDecl;
}

export class ClipBookSettingTab extends PluginSettingTab {
	plugin: ClipBookPlugin;

	/**
	 * The last non-zero delay for each duration, so switching one off and on
	 * again does not lose it. An instance field rather than a `display()`
	 * closure: on 1.13 the tab is built from definitions and `display()` never
	 * runs, so there is no closure to hold it.
	 */
	private readonly lastDelay: DelayMemory = new Map();

	/** Only ever filled by the `display()` fallback — see `hide()`. */
	private durationFields: DurationField[] = [];

	constructor(app: App, plugin: ClipBookPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// --- Obsidian 1.13 and later: rendered from these definitions ----------

	/**
	 * Settings described rather than drawn. Obsidian renders them itself and,
	 * more to the point, indexes them: a tab that only implements `display()`
	 * cannot be found from the settings search box.
	 */
	override getSettingDefinitions(): SettingDefinitionItem[] {
		return SETTING_DECLS.flatMap((decl) => this.define(decl));
	}

	private define(decl: SettingDecl): SettingDefinitionItem[] {
		if (decl.kind === "toggle") {
			return [
				{
					name: decl.name,
					desc: decl.desc,
					control: {
						type: "toggle",
						key: decl.key,
						defaultValue: DEFAULT_SETTINGS[decl.key],
					},
				},
			];
		}

		// One stored number, two rows: the switch owns "is this on at all",
		// the delay owns "for how long". The switch has no field of its own,
		// hence the synthetic key.
		return [
			{
				name: decl.name,
				desc: decl.desc,
				control: {
					type: "toggle",
					key: enabledKey(decl.key),
					defaultValue: DEFAULT_SETTINGS[decl.key] > 0,
				},
			},
			{
				name: decl.delayName,
				desc: decl.delayDesc,
				// A delay for something switched off is not a setting, it is a
				// question with no answer. Re-evaluated by refreshDomState().
				visible: () => this.plugin.settings[decl.key] > 0,
				control: {
					type: "number",
					key: decl.key,
					min: 1,
					placeholder: String(decl.fallback),
					defaultValue: decl.fallback,
					validate: (seconds) =>
						Number.isFinite(seconds) && seconds >= 1
							? undefined
							: "Enter a whole number of seconds, 1 or more.",
				},
			},
		];
	}

	override getControlValue(key: string): unknown {
		return readControl(this.plugin.settings, key);
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		if (!this.apply(key, value)) return;
		await this.persist();
		// A duration's switch decides whether its delay row is shown at all,
		// and that predicate reads the field just written.
		this.refreshVisibility();
	}

	// --- Before 1.13: the tab draws itself ---------------------------------

	/**
	 * The fallback path. Obsidian 1.13 and later never call this once
	 * `getSettingDefinitions()` returns a non-empty array; it stays for the
	 * older builds `minAppVersion` still admits. It walks the same
	 * declarations, so the two paths cannot drift apart.
	 */
	override display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.durationFields = [];
		for (const decl of SETTING_DECLS) {
			if (decl.kind === "toggle") this.addToggle(containerEl, decl);
			else this.addDuration(containerEl, decl);
		}
	}

	private addToggle(containerEl: HTMLElement, decl: ToggleDecl): void {
		new Setting(containerEl)
			.setName(decl.name)
			.setDesc(decl.desc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[decl.key]).onChange((value) => {
					this.save(decl.key, value);
				})
			);
	}

	/**
	 * A switch plus the delay it controls, stored as one number where zero
	 * means off. The delay row hides with the switch.
	 */
	private addDuration(containerEl: HTMLElement, decl: DurationDecl): void {
		new Setting(containerEl)
			.setName(decl.name)
			.setDesc(decl.desc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings[decl.key] > 0)
					.onChange((value) => {
						this.save(enabledKey(decl.key), value);
						delaySetting.settingEl.toggle(value);
					})
			);

		const delaySetting = new Setting(containerEl)
			.setName(decl.delayName)
			.setDesc(decl.delayDesc)
			.addText((text) => {
				this.durationFields.push({ inputEl: text.inputEl, decl });
				text
					.setPlaceholder(String(decl.fallback))
					.setValue(String(this.delay(decl.key)))
					.onChange((raw) => {
						// An unusable delay is rejected by `save`, so a half-typed
						// number does not overwrite the stored one.
						this.save(decl.key, parseInt(raw, 10));
					});
			});

		delaySetting.settingEl.toggle(this.plugin.settings[decl.key] > 0);
	}

	/**
	 * A delay left empty or nonsensical on the way out falls back to its
	 * default. Only the `display()` path can get into that state: the
	 * declarative one rejects the value as it is typed, through `validate`.
	 */
	override hide(): void {
		let repaired = false;
		for (const { inputEl, decl } of this.durationFields) {
			// Zero means the feature is off; there is no delay to validate.
			if (this.plugin.settings[decl.key] === 0) continue;
			const seconds = parseInt(inputEl.value, 10);
			if (Number.isFinite(seconds) && seconds >= 1) continue;
			if (this.apply(decl.key, decl.fallback)) repaired = true;
		}
		if (repaired) void this.persist();
	}

	// --- Shared ------------------------------------------------------------

	/**
	 * Apply a control change. Both render paths go through here, so the
	 * declarative controls and the ones `display()` draws agree on what a key
	 * means and which values they refuse.
	 */
	private apply(key: string, value: unknown): boolean {
		return writeControl(this.plugin.settings, this.lastDelay, key, value);
	}

	/** Apply and save, for the `display()` path, which cannot await. */
	private save(key: string, value: unknown): void {
		if (this.apply(key, value)) void this.persist();
	}

	private delay(key: DurationDecl["key"]): number {
		return delayFor(this.plugin.settings, this.lastDelay, key);
	}

	/**
	 * `refreshDomState` re-evaluates the `visible` predicates. It arrived with
	 * the declarative API in 1.13, and only the declarative path has anything
	 * to refresh, so an older build is simply skipped.
	 */
	private refreshVisibility(): void {
		if (typeof this.refreshDomState === "function") this.refreshDomState();
	}

	/**
	 * Save, and say so when it fails. Nobody watches a settings write, so a
	 * silent failure means finding out much later that a delay went missing.
	 */
	private async persist(): Promise<void> {
		try {
			await this.plugin.saveSettings();
		} catch (error) {
			console.error("ClipBook: Failed to save settings.", error);
			new Notice("Failed to save settings.");
		}
	}
}
