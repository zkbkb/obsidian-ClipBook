import { describe, expect, it } from "vitest";
import {
	insertEntryLine,
	removeEntryLine,
	replaceEntryLine,
} from "../src/block-edit";
import { parseClipBook } from "../src/parser";
import { buildEntryLine } from "../src/serializer";
import { SectionRef } from "../src/types";

const BODY = [
	"Orphan = 1",
	"",
	"[AWS]",
	"Key = 2",
	"# note",
	"",
	"[GitHub]",
	"PAT = 3",
	"",
];

/** The first group of a name — what a name typed into the form means. */
const at = (name: string | null, occurrence = 0): SectionRef => ({
	name,
	occurrence,
});

describe("insertEntryLine", () => {
	it("appends after the section's last entry, ahead of trailing comments", () => {
		expect(insertEntryLine(BODY, at("AWS"), "New = x")).toEqual([
			"Orphan = 1", "", "[AWS]", "Key = 2", "New = x", "# note", "",
			"[GitHub]", "PAT = 3", "",
		]);
	});

	it("creates a section that does not exist yet, after the existing content", () => {
		expect(insertEntryLine(BODY, at("GCP"), "New = x")).toEqual([
			"Orphan = 1", "", "[AWS]", "Key = 2", "# note", "",
			"[GitHub]", "PAT = 3", "", "[GCP]", "New = x", "",
		]);
	});

	it("keeps an orphan entry ahead of the first section header", () => {
		expect(insertEntryLine(BODY, at(null), "New = x")).toEqual([
			"Orphan = 1", "New = x", "", "[AWS]", "Key = 2", "# note", "",
			"[GitHub]", "PAT = 3", "",
		]);
	});

	it.each([
		[[], "AWS", ["[AWS]", "New = x"]],
		[[], null, ["New = x"]],
		[["A = 1", ""], null, ["A = 1", "New = x", ""]],
	])("handles an empty or section-less body: %j", (body, section, expected) => {
		expect(insertEntryLine(body, at(section), "New = x")).toEqual(expected);
	});

	// A block may repeat a header. The add button beside the second `[AWS]`
	// means the second `[AWS]`, and resolving by name alone silently sent every
	// one of them to the first.
	describe("repeated section headers", () => {
		const REPEATED = [
			"[AWS]",
			"Key = 1",
			"",
			"[AWS]",
			"Key = 2",
			"",
			"[AWS]",
			"Key = 3",
		];

		it.each([
			[0, 2],
			[1, 5],
			[2, 8],
		])("adds to group %i, at line %i", (occurrence, line) => {
			const next = insertEntryLine(REPEATED, at("AWS", occurrence), "New = x");
			expect(next[line]).toBe("New = x");
			expect(next).toHaveLength(REPEATED.length + 1);
		});

		// If the note lost a group between the render and the write, the last
		// one left beats appending a fourth `[AWS]` at the bottom.
		it("clamps to the last group when the one pointed at is gone", () => {
			const next = insertEntryLine(REPEATED, at("AWS", 9), "New = x");
			expect(next).toEqual([...REPEATED, "New = x"]);
			expect(next.filter((l) => l === "[AWS]")).toHaveLength(3);
		});
	});

	it("puts the entry where a re-parse then reports it", () => {
		const next = insertEntryLine(BODY, at("AWS"), buildEntryLine("New", "!x", false));
		const aws = parseClipBook(next.join("\n")).find((s) => s.name === "AWS");
		expect(aws?.entries.map((e) => [e.key, e.value, e.masked])).toEqual([
			["Key", "2", false],
			["New", "!x", false],
		]);
	});
});

describe("replaceEntryLine and removeEntryLine", () => {
	it("replaces one line and leaves the rest", () => {
		expect(replaceEntryLine(BODY, 3, "Key = 9")[3]).toBe("Key = 9");
		expect(replaceEntryLine(BODY, 3, "Key = 9")).toHaveLength(BODY.length);
	});

	it("removes one line", () => {
		const next = removeEntryLine(BODY, 3);
		expect(next).not.toContain("Key = 2");
		expect(next).toHaveLength(BODY.length - 1);
	});

	it("never mutates the body it was given", () => {
		const before = [...BODY];
		insertEntryLine(BODY, at("AWS"), "x = 1");
		replaceEntryLine(BODY, 0, "x = 1");
		removeEntryLine(BODY, 0);
		expect(BODY).toEqual(before);
	});
});
