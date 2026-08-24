import { ClipBookData, ClipBookSection } from "./types";
import { unescapeValue } from "./serializer";

// The name may not contain `]`, so that an entry whose key and value are both
// bracketed (`[Key] = [Value]`) is not swallowed whole as a section header.
const SECTION_RE = /^\[([^\]]+)\]$/;

export type ClassifiedLine =
	| { kind: "blank" }
	| { kind: "comment" }
	| { kind: "section"; name: string }
	| { kind: "entry"; key: string | null; value: string; masked: boolean };

/**
 * Classify a single source line. This is the single source of truth for the
 * block syntax — the parser and the source writer both use it, so the two can
 * never disagree about what counts as a section header, a comment, or an entry.
 */
export function classifyLine(rawLine: string): ClassifiedLine {
	const line = rawLine.trim();

	if (line === "") return { kind: "blank" };
	if (line.startsWith("#") || line.startsWith(";")) return { kind: "comment" };

	const sectionName = SECTION_RE.exec(line)?.[1];
	if (sectionName !== undefined) {
		return { kind: "section", name: sectionName.trim() };
	}

	// `Key = Value` — split on the first `=` only, so values may contain `=`.
	const eqIndex = line.indexOf("=");
	if (eqIndex !== -1) {
		const key = line.substring(0, eqIndex).trim();
		return {
			kind: "entry",
			key: key === "" ? null : key,
			...readValue(line.substring(eqIndex + 1).trim()),
		};
	}

	// Bare line (no `=`) — a keyless entry. Still accepted for hand-written
	// notes, but never emitted by the serializer.
	return { kind: "entry", key: null, ...readValue(line) };
}

function readValue(raw: string): { value: string; masked: boolean } {
	const masked = raw.startsWith("!");
	const body = masked ? raw.substring(1) : raw;
	return { value: unescapeValue(body), masked };
}

export function parseClipBook(source: string): ClipBookData {
	// Split on either line ending: a trailing `\r` would end up in `entry.raw`
	// and never match the lines the source writer compares against, rejecting
	// every edit on a CRLF note as stale.
	const lines = source.split(/\r?\n/);
	const sections: ClipBookData = [];
	let currentSection: ClipBookSection = { name: null, entries: [] };

	// A section is kept if it holds entries, or if it was explicitly named —
	// a named-but-empty section still renders its header.
	const flush = () => {
		if (currentSection.entries.length > 0 || currentSection.name !== null) {
			sections.push(currentSection);
		}
	};

	for (const [i, line] of lines.entries()) {
		const classified = classifyLine(line);

		switch (classified.kind) {
			case "blank":
			case "comment":
				break;

			case "section":
				flush();
				currentSection = { name: classified.name, entries: [] };
				break;

			case "entry":
				// `= ` with nothing on either side carries no content.
				if (classified.key === null && classified.value === "") break;
				currentSection.entries.push({
					key: classified.key,
					value: classified.value,
					masked: classified.masked,
					sourceLine: i,
					raw: line,
				});
				break;
		}
	}

	flush();
	return sections;
}
