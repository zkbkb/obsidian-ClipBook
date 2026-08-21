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

	const sectionMatch = line.match(SECTION_RE);
	if (sectionMatch) return { kind: "section", name: sectionMatch[1].trim() };

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
	const lines = source.split("\n");
	const sections: ClipBookData = [];
	let currentSection: ClipBookSection = { name: null, entries: [] };

	// A section is kept if it holds entries, or if it was explicitly named —
	// a named-but-empty section still renders its header.
	const flush = () => {
		if (currentSection.entries.length > 0 || currentSection.name !== null) {
			sections.push(currentSection);
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const classified = classifyLine(lines[i]);

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
					raw: lines[i],
				});
				break;
		}
	}

	flush();
	return sections;
}
