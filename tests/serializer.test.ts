import { describe, expect, it } from "vitest";
import { parseClipBook } from "../src/parser";
import {
	buildEntryLine,
	escapeValue,
	unescapeValue,
	validateKey,
	validateSectionName,
} from "../src/serializer";

describe("escaping", () => {
	it.each([
		["!secret", "\\!secret"],
		["\\already", "\\\\already"],
		["plain", "plain"],
		["C:\\Users\\me", "C:\\Users\\me"],
		["a!b", "a!b"],
		["", ""],
	])("escapes only a leading ! or backslash: %s", (value, escaped) => {
		expect(escapeValue(value)).toBe(escaped);
		expect(unescapeValue(escaped)).toBe(value);
	});

	it("leaves a lone leading backslash alone when it escapes nothing", () => {
		expect(unescapeValue("\\abc")).toBe("\\abc");
	});
});

describe("validation", () => {
	it.each([
		["a=b", "contains-equals"],
		["#a", "looks-like-comment"],
		[";a", "looks-like-comment"],
	])("rejects the key %s", (key, problem) => {
		expect(validateKey(key)).toBe(problem);
	});

	it.each(["API Token", "[bracketed]", "!bang", "key.with.dots"])(
		"accepts the key %s",
		(key) => {
			expect(validateKey(key)).toBeNull();
		}
	);

	it("rejects a section name containing ], which would end the header early", () => {
		expect(validateSectionName("a]b")).toBe("contains-bracket");
		expect(validateSectionName("AWS")).toBeNull();
	});
});

/**
 * The property that matters: anything the plugin writes must read back as what
 * it was asked to write. This is what caught a plain value of `!secret` coming
 * back as a masked value of `secret`.
 */
describe("round trip", () => {
	const KEYS: (string | null)[] = [
		null,
		"API Token",
		"a b",
		"[weird]",
		"!bang",
		"key.with.dots",
	];
	const VALUES = [
		"plain",
		"!leading-bang",
		"\\!escaped-looking",
		"\\backslash",
		"\\\\double",
		"has = equals",
		"[Section]",
		"# hash",
		"; semi",
		"= starts with equals",
		"EXAMPLE-0000000000000000",
		"a",
		"",
	];

	const cases: [string | null, string, boolean][] = [];
	for (const key of KEYS) {
		for (const value of VALUES) {
			for (const masked of [false, true]) {
				// A keyless entry with an empty value is `= `, which by design
				// carries nothing and is dropped on the way back in.
				if (key === null && value === "") continue;
				cases.push([key, value, masked]);
			}
		}
	}

	it.each(cases)(
		"key=%j value=%j masked=%j survives a write and a read",
		(key, value, masked) => {
			const parsed = parseClipBook(buildEntryLine(key, value, masked));
			expect(parsed).toHaveLength(1);
			expect(parsed[0]?.entries).toHaveLength(1);
			const entry = parsed[0]?.entries[0];
			expect({
				key: entry?.key,
				value: entry?.value,
				masked: entry?.masked,
			}).toEqual({ key, value, masked });
		}
	);

	it("writes keyless entries as `= value`, never as a bare line", () => {
		// A bare line is ambiguous for values containing = or starting with [.
		expect(buildEntryLine(null, "a=b", false)).toBe("= a=b");
		expect(buildEntryLine(null, "x", true)).toBe("= !x");
	});
});
