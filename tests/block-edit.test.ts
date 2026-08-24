import { describe, expect, it } from "vitest";
import {
	insertEntryLine,
	removeEntryLine,
	replaceEntryLine,
} from "../src/block-edit";
import { parseClipBook } from "../src/parser";
import { buildEntryLine } from "../src/serializer";

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

describe("insertEntryLine", () => {
	it("appends after the section's last entry, ahead of trailing comments", () => {
		expect(insertEntryLine(BODY, "AWS", "New = x")).toEqual([
			"Orphan = 1", "", "[AWS]", "Key = 2", "New = x", "# note", "",
			"[GitHub]", "PAT = 3", "",
		]);
	});

	it("creates a section that does not exist yet, after the existing content", () => {
		expect(insertEntryLine(BODY, "GCP", "New = x")).toEqual([
			"Orphan = 1", "", "[AWS]", "Key = 2", "# note", "",
			"[GitHub]", "PAT = 3", "", "[GCP]", "New = x", "",
		]);
	});

	it("keeps an orphan entry ahead of the first section header", () => {
		expect(insertEntryLine(BODY, null, "New = x")).toEqual([
			"Orphan = 1", "New = x", "", "[AWS]", "Key = 2", "# note", "",
			"[GitHub]", "PAT = 3", "",
		]);
	});

	it.each([
		[[], "AWS", ["[AWS]", "New = x"]],
		[[], null, ["New = x"]],
		[["A = 1", ""], null, ["A = 1", "New = x", ""]],
	])("handles an empty or section-less body: %j", (body, section, expected) => {
		expect(insertEntryLine(body, section, "New = x")).toEqual(expected);
	});

	it("puts the entry where a re-parse then reports it", () => {
		const next = insertEntryLine(BODY, "AWS", buildEntryLine("New", "!x", false));
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
		insertEntryLine(BODY, "AWS", "x = 1");
		replaceEntryLine(BODY, 0, "x = 1");
		removeEntryLine(BODY, 0);
		expect(BODY).toEqual(before);
	});
});
