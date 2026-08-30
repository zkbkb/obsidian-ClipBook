import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type ClipBookPlugin from "./main";
import {
	ClipBookSettings,
	DEFAULT_SETTINGS,
	DurationDecl,
	DurationKey,
	SETTING_DECLS,
	SettingDecl,
	SettingKey,
	ToggleDecl,
	durationForEnabledKey,
	enabledKey,
	isDurationKey,
	isSettingKey,
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
	private readonly lastDelay = new Map<DurationKey, number>();

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
		const duration = durationForEnabledKey(key);
		if (duration !== null) return this.plugin.settings[duration] > 0;
		if (isSettingKey(key)) return this.plugin.settings[key];
		return undefined;
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		const duration = durationForEnabledKey(key);
		if (duration !== null) {
			if (typeof value !== "boolean") return;
			this.setEnabled(duration, value);
			await this.persist();
			// The delay row's `visible` predicate reads the field just written.
			this.refreshVisibility();
			return;
		}

		if (!isSettingKey(key)) return;
		if (typeof value !== typeof DEFAULT_SETTINGS[key]) return;
		if (typeof value === "number") {
			if (!Number.isFinite(value) || value < 1) return;
			if (isDurationKey(key)) this.lastDelay.set(key, value);
		}
		// The value has been checked against the stored field's own type; the
		// index signature is what the type alias exists for.
		const target: Record<string, unknown> = this.plugin.settings;
		target[key] = value;
		await this.persist();
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
					this.write(decl.key, value);
					void this.persist();
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
						this.setEnabled(decl.key, value);
						void this.persist();
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
					.setValue(String(this.delayFor(decl.key)))
					.onChange((raw) => {
						const seconds = parseInt(raw, 10);
						if (!Number.isFinite(seconds) || seconds < 1) return;
						this.lastDelay.set(decl.key, seconds);
						this.write(decl.key, seconds);
						void this.persist();
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
			this.write(decl.key, decl.fallback);
			repaired = true;
		}
		if (repaired) void this.persist();
	}

	// --- Shared ------------------------------------------------------------

	/** Turn a duration on, restoring its delay, or off, remembering it. */
	private setEnabled(key: DurationKey, on: boolean): void {
		const current = this.plugin.settings[key];
		if (current > 0) this.lastDelay.set(key, current);
		this.write(key, on ? this.delayFor(key) : 0);
	}

	/** The delay to show for a duration that is off: the last one, or its default. */
	private delayFor(key: DurationKey): number {
		const remembered = this.lastDelay.get(key);
		if (remembered !== undefined && remembered > 0) return remembered;
		const current = this.plugin.settings[key];
		if (current > 0) return current;
		const decl = SETTING_DECLS.find(
			(d): d is DurationDecl => d.kind === "duration" && d.key === key
		);
		return decl?.fallback ?? DEFAULT_SETTINGS[key];
	}

	private write<K extends SettingKey>(key: K, value: ClipBookSettings[K]): void {
		this.plugin.settings[key] = value;
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
