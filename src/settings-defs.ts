/**
 * What the settings are, with nothing about how they are drawn.
 *
 * Obsidian 1.13 renders a settings tab from `getSettingDefinitions()` and
 * indexes it for the global settings search; older builds call `display()` and
 * the tab draws itself. Both paths have to offer the same six settings, under
 * the same names, writing the same fields — so both read them from the one
 * declaration list here rather than each carrying its own copy.
 *
 * Nothing in this file imports `obsidian`. The npm package ships types and no
 * runtime, so a module that imports it cannot be loaded by the test runner;
 * keeping the declarations and the coercion out here is what makes them
 * testable.
 */

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

export type SettingKey = keyof ClipBookSettings;

type KeysOfType<T> = {
	[K in SettingKey]: ClipBookSettings[K] extends T ? K : never;
}[SettingKey];

export type ToggleKey = KeysOfType<boolean>;
export type DurationKey = KeysOfType<number>;

/**
 * Coerce whatever `loadData()` returns into valid settings, discarding anything
 * of the wrong shape. Driven by `DEFAULT_SETTINGS` so that adding a setting
 * means touching the type and the defaults, and nothing else.
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

/** True for a key this plugin actually stores. */
export function isSettingKey(key: string): key is SettingKey {
	return Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key);
}

/** A plain on/off setting. */
export interface ToggleDecl {
	kind: "toggle";
	key: ToggleKey;
	name: string;
	desc: string;
}

/**
 * A feature that is off or happens after a delay, stored as one number where
 * zero means off. It shows as two rows: a switch, and the delay it enables.
 */
export interface DurationDecl {
	kind: "duration";
	key: DurationKey;
	name: string;
	desc: string;
	delayName: string;
	delayDesc: string;
	/** Seconds to use when the switch is turned on and nothing is remembered. */
	fallback: number;
}

export type SettingDecl = ToggleDecl | DurationDecl;

/**
 * A duration's switch is not a stored field — the number is. It needs a key of
 * its own to address it by, and this suffix cannot collide with a real one:
 * `isSettingKey` is checked against the stored fields, none of which contain
 * a `#`.
 */
const ENABLED_SUFFIX = "#on";

/** The control key for a duration's on/off switch. */
export function enabledKey(key: DurationKey): string {
	return key + ENABLED_SUFFIX;
}

/** True for a stored field holding a number of seconds. */
export function isDurationKey(key: SettingKey): key is DurationKey {
	return typeof DEFAULT_SETTINGS[key] === "number";
}

/** The duration a switch key belongs to, or null if it is not one. */
export function durationForEnabledKey(key: string): DurationKey | null {
	if (!key.endsWith(ENABLED_SUFFIX)) return null;
	const base = key.slice(0, -ENABLED_SUFFIX.length);
	if (!isSettingKey(base) || !isDurationKey(base)) return null;
	return base;
}

/** Every setting, in the order they are shown. */
export const SETTING_DECLS: readonly SettingDecl[] = [
	{
		kind: "toggle",
		key: "defaultMasked",
		name: "Mask all values by default",
		desc: "When enabled, all values are masked — not just those with the `!` prefix",
	},
	{
		kind: "duration",
		key: "autoHideTimeout",
		name: "Auto-hide revealed values",
		desc: "Automatically re-mask revealed values after a delay.",
		delayName: "Auto-hide delay (s)",
		delayDesc: "Seconds before a revealed value is re-masked.",
		fallback: DEFAULT_SETTINGS.autoHideTimeout,
	},
	{
		kind: "toggle",
		key: "hideOnTabSwitch",
		name: "Hide on tab switch",
		desc: "Re-mask all revealed values when switching to another tab or window",
	},
	{
		kind: "duration",
		key: "clipboardClearTimeout",
		name: "Clear the clipboard after copying",
		desc:
			"Empty the clipboard a while after a masked value is copied, so a " +
			"secret does not sit there for the rest of the day. Only ever " +
			"clears the value ClipBook put there, and only where the platform " +
			"allows reading the clipboard back.",
		delayName: "Clear the clipboard after (s)",
		delayDesc: "Seconds before a copied masked value is cleared.",
		// Off by default, so there is no stored value to start the delay from.
		fallback: 45,
	},
	{
		kind: "toggle",
		key: "defaultCollapsed",
		name: "Sections start collapsed",
		desc: "Whether sections are collapsed by default in reading view",
	},
	{
		kind: "toggle",
		key: "quickAddDefaultMask",
		name: "Mask new entries by default",
		desc: "Whether the mask checkbox is checked by default in the quick-add form",
	},
];
