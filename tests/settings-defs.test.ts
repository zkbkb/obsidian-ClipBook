import { describe, expect, it } from "vitest";
import {
	DEFAULT_SETTINGS,
	DelayMemory,
	SETTING_DECLS,
	delayFor,
	durationForEnabledKey,
	enabledKey,
	isDurationKey,
	isSettingKey,
	normalizeSettings,
	readControl,
	writeControl,
} from "../src/settings-defs";

describe("SETTING_DECLS", () => {
	// Both render paths walk this list — the declarative definitions and the
	// pre-1.13 display() fallback. A setting missing here is missing from both.
	it("covers every stored field exactly once", () => {
		const declared = SETTING_DECLS.map((decl) => decl.key);
		expect([...declared].sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
	});

	it("gives each declaration the kind its field's type calls for", () => {
		for (const decl of SETTING_DECLS) {
			const stored = typeof DEFAULT_SETTINGS[decl.key];
			expect([decl.key, decl.kind]).toEqual([
				decl.key,
				stored === "number" ? "duration" : "toggle",
			]);
		}
	});

	it("gives every row a name and a description", () => {
		for (const decl of SETTING_DECLS) {
			expect(decl.name.length).toBeGreaterThan(0);
			expect(decl.desc.length).toBeGreaterThan(0);
			if (decl.kind !== "duration") continue;
			expect(decl.delayName.length).toBeGreaterThan(0);
			expect(decl.delayDesc.length).toBeGreaterThan(0);
		}
	});

	// Zero is how a duration says "off", so a fallback of zero would make the
	// switch impossible to turn on.
	it("gives every duration a fallback of at least one second", () => {
		for (const decl of SETTING_DECLS) {
			if (decl.kind !== "duration") continue;
			expect(decl.fallback).toBeGreaterThanOrEqual(1);
		}
	});
});

describe("key helpers", () => {
	it("recognises stored fields and nothing else", () => {
		expect(isSettingKey("autoHideTimeout")).toBe(true);
		expect(isSettingKey("defaultMasked")).toBe(true);
		expect(isSettingKey("nope")).toBe(false);
		// Inherited object properties are not settings.
		expect(isSettingKey("toString")).toBe(false);
		expect(isSettingKey("constructor")).toBe(false);
	});

	it("tells a duration field from a toggle field", () => {
		expect(isDurationKey("autoHideTimeout")).toBe(true);
		expect(isDurationKey("clipboardClearTimeout")).toBe(true);
		expect(isDurationKey("defaultMasked")).toBe(false);
	});

	it("round-trips a duration through its switch key", () => {
		expect(durationForEnabledKey(enabledKey("autoHideTimeout"))).toBe(
			"autoHideTimeout"
		);
		expect(durationForEnabledKey(enabledKey("clipboardClearTimeout"))).toBe(
			"clipboardClearTimeout"
		);
	});

	// A switch key must never be mistaken for a stored field, or a write meant
	// for the switch would land on the settings object.
	it("keeps switch keys out of the stored fields", () => {
		expect(isSettingKey(enabledKey("autoHideTimeout"))).toBe(false);
	});

	it("rejects anything that is not a duration's switch", () => {
		expect(durationForEnabledKey("autoHideTimeout")).toBeNull();
		expect(durationForEnabledKey("defaultMasked#on")).toBeNull();
		expect(durationForEnabledKey("nope#on")).toBeNull();
		expect(durationForEnabledKey("#on")).toBeNull();
		expect(durationForEnabledKey("")).toBeNull();
	});
});

describe("normalizeSettings", () => {
	it("falls back to the defaults for anything that is not an object", () => {
		for (const saved of [null, undefined, 42, "settings", true, []]) {
			expect(normalizeSettings(saved)).toEqual(DEFAULT_SETTINGS);
		}
	});

	it("keeps stored values of the right type", () => {
		expect(
			normalizeSettings({
				defaultMasked: true,
				autoHideTimeout: 30,
				hideOnTabSwitch: false,
				defaultCollapsed: true,
				quickAddDefaultMask: false,
				clipboardClearTimeout: 45,
			})
		).toEqual({
			defaultMasked: true,
			autoHideTimeout: 30,
			hideOnTabSwitch: false,
			defaultCollapsed: true,
			quickAddDefaultMask: false,
			clipboardClearTimeout: 45,
		});
	});

	it("discards values of the wrong type", () => {
		const settings = normalizeSettings({
			defaultMasked: "yes",
			autoHideTimeout: "30",
			hideOnTabSwitch: 1,
		});
		expect(settings.defaultMasked).toBe(DEFAULT_SETTINGS.defaultMasked);
		expect(settings.autoHideTimeout).toBe(DEFAULT_SETTINGS.autoHideTimeout);
		expect(settings.hideOnTabSwitch).toBe(DEFAULT_SETTINGS.hideOnTabSwitch);
	});

	// A negative or non-finite delay would schedule a timer that never fires,
	// or fires immediately.
	it("discards delays that are not a usable number of seconds", () => {
		for (const bad of [-1, NaN, Infinity, -Infinity]) {
			expect(normalizeSettings({ autoHideTimeout: bad }).autoHideTimeout).toBe(
				DEFAULT_SETTINGS.autoHideTimeout
			);
		}
	});

	// Zero is not a bad value: it is how a duration says "off".
	it("keeps zero, which means off", () => {
		expect(normalizeSettings({ autoHideTimeout: 0 }).autoHideTimeout).toBe(0);
	});

	it("ignores keys it does not know", () => {
		const settings = normalizeSettings({ autoHideTimeout: 9, leftover: "x" });
		expect(settings.autoHideTimeout).toBe(9);
		expect(Object.keys(settings).sort()).toEqual(
			Object.keys(DEFAULT_SETTINGS).sort()
		);
	});

	it("returns a fresh object rather than the defaults themselves", () => {
		const settings = normalizeSettings({ autoHideTimeout: 9 });
		expect(settings).not.toBe(DEFAULT_SETTINGS);
		expect(DEFAULT_SETTINGS.autoHideTimeout).toBe(5);
	});
});

describe("controls", () => {
	const fresh = () => ({
		settings: { ...DEFAULT_SETTINGS },
		remembered: new Map() as DelayMemory,
	});

	describe("readControl", () => {
		it("reads a stored field straight through", () => {
			const { settings } = fresh();
			settings.defaultMasked = true;
			settings.autoHideTimeout = 30;
			expect(readControl(settings, "defaultMasked")).toBe(true);
			expect(readControl(settings, "autoHideTimeout")).toBe(30);
		});

		// The switch has no field of its own: it is the number being non-zero.
		it("reads a duration's switch as whether the delay is set", () => {
			const { settings } = fresh();
			settings.autoHideTimeout = 30;
			expect(readControl(settings, enabledKey("autoHideTimeout"))).toBe(true);
			settings.autoHideTimeout = 0;
			expect(readControl(settings, enabledKey("autoHideTimeout"))).toBe(false);
		});

		it("has no answer for a key it does not own", () => {
			const { settings } = fresh();
			expect(readControl(settings, "nope")).toBeUndefined();
			expect(readControl(settings, "toString")).toBeUndefined();
		});
	});

	describe("writeControl", () => {
		it("stores a toggle", () => {
			const { settings, remembered } = fresh();
			expect(writeControl(settings, remembered, "defaultMasked", true)).toBe(
				true
			);
			expect(settings.defaultMasked).toBe(true);
		});

		it("refuses a value of the wrong type, changing nothing", () => {
			const { settings, remembered } = fresh();
			expect(writeControl(settings, remembered, "defaultMasked", "yes")).toBe(
				false
			);
			expect(writeControl(settings, remembered, "autoHideTimeout", true)).toBe(
				false
			);
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});

		it("refuses a key it does not own", () => {
			const { settings, remembered } = fresh();
			expect(writeControl(settings, remembered, "nope", true)).toBe(false);
			expect(settings).toEqual(DEFAULT_SETTINGS);
		});

		// A half-typed number reaches onChange one keystroke at a time. Storing
		// it would overwrite the real delay with whatever was typed so far.
		it("refuses a delay that is not a usable number of seconds", () => {
			const { settings, remembered } = fresh();
			for (const bad of [0, -1, NaN, Infinity]) {
				expect(
					writeControl(settings, remembered, "autoHideTimeout", bad)
				).toBe(false);
			}
			expect(settings.autoHideTimeout).toBe(DEFAULT_SETTINGS.autoHideTimeout);
		});

		it("stores a usable delay", () => {
			const { settings, remembered } = fresh();
			expect(writeControl(settings, remembered, "autoHideTimeout", 30)).toBe(
				true
			);
			expect(settings.autoHideTimeout).toBe(30);
		});

		it("switching off leaves the field at zero", () => {
			const { settings, remembered } = fresh();
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), false);
			expect(settings.autoHideTimeout).toBe(0);
		});

		// The whole point of remembering: the delay you set is still there when
		// you switch the feature back on.
		it("switching off and on again restores the delay that was set", () => {
			const { settings, remembered } = fresh();
			writeControl(settings, remembered, "autoHideTimeout", 30);
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), false);
			expect(settings.autoHideTimeout).toBe(0);
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), true);
			expect(settings.autoHideTimeout).toBe(30);
		});

		// The delay the user set in an earlier session is in the loaded settings,
		// not in the memory — which starts empty every time the tab is built.
		// Switching off has to capture it, or turning the feature back on drops
		// the user's delay and silently substitutes the default.
		it("remembers a delay it never saw written, from loaded settings", () => {
			const { settings, remembered } = fresh();
			settings.autoHideTimeout = 30; // as loaded from disk
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), false);
			expect(settings.autoHideTimeout).toBe(0);
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), true);
			expect(settings.autoHideTimeout).toBe(30);
		});

		it("switching on for the first time uses the declared fallback", () => {
			const { settings, remembered } = fresh();
			// Clipboard clearing ships off, so there is no stored delay to reuse.
			expect(settings.clipboardClearTimeout).toBe(0);
			writeControl(
				settings,
				remembered,
				enabledKey("clipboardClearTimeout"),
				true
			);
			expect(settings.clipboardClearTimeout).toBe(45);
		});

		it("switching on when already on changes nothing", () => {
			const { settings, remembered } = fresh();
			writeControl(settings, remembered, "autoHideTimeout", 30);
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), true);
			expect(settings.autoHideTimeout).toBe(30);
		});

		it("refuses a non-boolean for a switch", () => {
			const { settings, remembered } = fresh();
			expect(
				writeControl(settings, remembered, enabledKey("autoHideTimeout"), 1)
			).toBe(false);
			expect(settings.autoHideTimeout).toBe(DEFAULT_SETTINGS.autoHideTimeout);
		});

		it("keeps the two durations independent", () => {
			const { settings, remembered } = fresh();
			writeControl(settings, remembered, "autoHideTimeout", 30);
			writeControl(settings, remembered, "clipboardClearTimeout", 90);
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), false);
			expect(settings.autoHideTimeout).toBe(0);
			expect(settings.clipboardClearTimeout).toBe(90);
		});
	});

	describe("delayFor", () => {
		it("shows the stored delay when there is one", () => {
			const { settings, remembered } = fresh();
			settings.autoHideTimeout = 30;
			expect(delayFor(settings, remembered, "autoHideTimeout")).toBe(30);
		});

		it("shows the remembered delay while switched off", () => {
			const { settings, remembered } = fresh();
			writeControl(settings, remembered, "autoHideTimeout", 30);
			writeControl(settings, remembered, enabledKey("autoHideTimeout"), false);
			expect(delayFor(settings, remembered, "autoHideTimeout")).toBe(30);
		});

		it("falls back to the declaration with nothing stored or remembered", () => {
			const { settings, remembered } = fresh();
			expect(delayFor(settings, remembered, "clipboardClearTimeout")).toBe(45);
		});
	});
});
