import { describe, expect, it } from "vitest";
import { classifyLine, parseClipBook } from "../src/parser";

describe("classifyLine", () => {
	it("treats blank and whitespace-only lines as blank", () => {
		expect(classifyLine("").kind).toBe("blank");
		expect(classifyLine("   ").kind).toBe("blank");
	});

	it("treats # and ; lines as comments, after trimming", () => {
		expect(classifyLine("# note").kind).toBe("comment");
		expect(classifyLine("  ; note").kind).toBe("comment");
	});

	it("reads a bracketed line as a section header", () => {
		expect(classifyLine(" [AWS] ")).toEqual({ kind: "section", name: "AWS" });
	});

	// Regression: `^\[(.+)\]$` matched greedily across the whole line, so an
	// entry whose key and value were both bracketed became a section.
	it("does not read a bracketed key and value as a section header", () => {
		expect(classifyLine("[Key] = [Value]")).toEqual({
			kind: "entry",
			key: "[Key]",
			value: "[Value]",
			masked: false,
		});
	});

	it("splits on the first = only, so values may contain =", () => {
		expect(classifyLine("Key = a=b")).toEqual({
			kind: "entry",
			key: "Key",
			value: "a=b",
			masked: false,
		});
	});

	it("reads a leading ! on the value as the mask marker", () => {
		expect(classifyLine("Key = !secret")).toEqual({
			kind: "entry",
			key: "Key",
			value: "secret",
			masked: true,
		});
	});
});

describe("parseClipBook", () => {
	const block = [
		"API Token = !EXAMPLE-0000000000000000",
		"Region = us-east-1",
		"",
		"[AWS]",
		"Access Key = !AKIA-EXAMPLE-0000",
		"# a comment",
		"",
		"[GitHub]",
		"PAT = !ghp_EXAMPLE-0000",
		"!bare-masked",
		"= bare-plain",
	].join("\n");

	it("groups entries under their section, with orphans first", () => {
		expect(parseClipBook(block).map((s) => s.name)).toEqual([
			null,
			"AWS",
			"GitHub",
		]);
	});

	it("records key, value and mask for each entry", () => {
		const [orphans] = parseClipBook(block);
		expect(orphans?.entries.map((e) => [e.key, e.value, e.masked])).toEqual([
			["API Token", "EXAMPLE-0000000000000000", true],
			["Region", "us-east-1", false],
		]);
	});

	it("accepts both keyless forms", () => {
		const github = parseClipBook(block).find((s) => s.name === "GitHub");
		expect(github?.entries.map((e) => [e.key, e.value, e.masked])).toEqual([
			["PAT", "ghp_EXAMPLE-0000", true],
			[null, "bare-masked", true],
			[null, "bare-plain", false],
		]);
	});

	it("numbers source lines against the block, counting skipped lines", () => {
		const github = parseClipBook(block).find((s) => s.name === "GitHub");
		expect(github?.entries.map((e) => e.sourceLine)).toEqual([8, 9, 10]);
	});

	it("keeps the verbatim line, which the writer compares against", () => {
		const aws = parseClipBook(block).find((s) => s.name === "AWS");
		expect(aws?.entries[0]?.raw).toBe("Access Key = !AKIA-EXAMPLE-0000");
	});

	// Regression: splitting on "\n" left a trailing "\r" in `raw`, which never
	// matched the writer's lines, so every edit on a CRLF note was rejected.
	it("leaves no carriage return in raw on a CRLF note", () => {
		const parsed = parseClipBook("[AWS]\r\nKey = !secret\r\nOther = 2\r\n");
		expect(parsed[0]?.entries.map((e) => e.raw)).toEqual([
			"Key = !secret",
			"Other = 2",
		]);
		expect(parsed[0]?.entries.map((e) => e.sourceLine)).toEqual([1, 2]);
	});

	it("keeps a named section that holds no entries", () => {
		expect(parseClipBook("[Solo]").map((s) => [s.name, s.entries.length])).toEqual(
			[["Solo", 0]]
		);
	});

	it("drops `= ` on its own, which carries no content", () => {
		expect(parseClipBook("= ")).toEqual([]);
	});

	it("keeps an entry whose value is empty but whose key is not", () => {
		expect(parseClipBook("Key = ")[0]?.entries[0]).toEqual({
			key: "Key",
			value: "",
			masked: false,
			sourceLine: 0,
			raw: "Key = ",
		});
	});

	// Escaping only ever touches the first character, so notes written before
	// it existed must parse exactly as they did.
	it.each([
		["Path = C:\\Users\\me", "C:\\Users\\me"],
		["P = \\abc", "\\abc"],
		["P = a\\!b", "a\\!b"],
	])("leaves backslashes past the first character alone: %s", (line, value) => {
		expect(parseClipBook(line)[0]?.entries[0]?.value).toBe(value);
	});
});
