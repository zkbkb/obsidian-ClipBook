import { describe, expect, it } from "vitest";
import { findClipBookBlocks } from "../src/fence";
import { maskValue } from "../src/utils/mask";

describe("findClipBookBlocks", () => {
	it("finds every top-level block and skips other languages", () => {
		const lines = [
			"# Note",        // 0
			"```clipbook",   // 1
			"A = 1",         // 2
			"```",           // 3
			"text",          // 4
			"```js",         // 5
			"not mine",      // 6
			"```",           // 7
			"~~~clipbook",   // 8
			"B = 2",         // 9
			"~~~",           // 10
		];
		expect(findClipBookBlocks(lines)).toEqual([
			{ bodyStart: 2, bodyEnd: 3 },
			{ bodyStart: 9, bodyEnd: 10 },
		]);
	});

	// A block inside a callout carries `> ` on every line, which block-relative
	// indices cannot model. Not finding it beats parsing or writing it wrongly.
	it("does not find a block nested in a callout", () => {
		expect(
			findClipBookBlocks(["> ```clipbook", "> C = 3", "> ```"])
		).toEqual([]);
	});

	it("accepts an info string after the language", () => {
		expect(
			findClipBookBlocks(["```clipbook extra", "A = 1", "```"])
		).toEqual([{ bodyStart: 1, bodyEnd: 2 }]);
	});

	it("finds an empty block", () => {
		expect(findClipBookBlocks(["```clipbook", "```"])).toEqual([
			{ bodyStart: 1, bodyEnd: 1 },
		]);
	});

	it("finds adjacent blocks separately", () => {
		expect(
			findClipBookBlocks([
				"```clipbook", "A = 1", "```",
				"```clipbook", "B = 2", "```",
			])
		).toEqual([
			{ bodyStart: 1, bodyEnd: 2 },
			{ bodyStart: 4, bodyEnd: 5 },
		]);
	});

	it("yields nothing for an unterminated block", () => {
		expect(findClipBookBlocks(["```clipbook", "A = 1"])).toEqual([]);
	});
});

describe("maskValue", () => {
	it.each([
		["", ""],
		["ab", "···"],
		["abc", "···"],
		["us-east-1", "us···"],
		["EXAMPLE-0000000000000000", "EXA···0000"],
	])("masks %j as %j", (value, masked) => {
		expect(maskValue(value)).toBe(masked);
	});
});
