import { ClassifiedLine, classifyLine } from "./parser";
import { buildSectionLine } from "./serializer";

/**
 * Pure transforms over the *body* of a clipbook block — the lines strictly
 * between the opening and closing fences, indexed the same way as
 * `ClipBookEntry.sourceLine`. Keeping these free of Obsidian APIs is what makes
 * the write path testable and keeps line arithmetic in exactly one place.
 */

export function replaceEntryLine(
	body: readonly string[],
	index: number,
	newLine: string
): string[] {
	const next = body.slice();
	next[index] = newLine;
	return next;
}

export function removeEntryLine(
	body: readonly string[],
	index: number
): string[] {
	const next = body.slice();
	next.splice(index, 1);
	return next;
}

/**
 * Insert an entry into `sectionName`, creating the section if it does not exist.
 * A null section means the orphan group that precedes the first `[Section]`.
 */
export function insertEntryLine(
	body: readonly string[],
	sectionName: string | null,
	entryLine: string
): string[] {
	const next = body.slice();

	if (sectionName === null) {
		next.splice(orphanInsertIndex(next), 0, entryLine);
		return next;
	}

	const headerIndex = findSectionHeader(next, sectionName);
	if (headerIndex !== -1) {
		next.splice(sectionInsertIndex(next, headerIndex), 0, entryLine);
		return next;
	}

	// New section, appended after the existing content.
	const end = lastContentIndex(next) + 1;
	const separator = end > 0 ? [""] : [];
	next.splice(end, 0, ...separator, buildSectionLine(sectionName), entryLine);
	return next;
}

/**
 * Orphan entries must stay ahead of the first section header, and — like a
 * named section's entries — sit directly after the last of their own rather
 * than drifting past a blank line to the bottom of the group.
 */
function orphanInsertIndex(body: readonly string[]): number {
	let lastEntry = -1;
	let firstSection = -1;
	for (let i = 0; i < body.length; i++) {
		const line = classifyAt(body, i);
		if (line.kind === "section") {
			firstSection = i;
			break;
		}
		if (line.kind === "entry") lastEntry = i;
	}

	if (lastEntry !== -1) return lastEntry + 1;
	// Nothing to sit with yet: go ahead of the first section, or at the end.
	return firstSection !== -1 ? firstSection : lastContentIndex(body) + 1;
}

function findSectionHeader(body: readonly string[], name: string): number {
	for (let i = 0; i < body.length; i++) {
		const line = classifyAt(body, i);
		if (line.kind === "section" && line.name === name) return i;
	}
	return -1;
}

/** Position just after the section's last entry, so appends keep the group together. */
function sectionInsertIndex(
	body: readonly string[],
	headerIndex: number
): number {
	let lastEntry = headerIndex;
	for (let i = headerIndex + 1; i < body.length; i++) {
		const line = classifyAt(body, i);
		if (line.kind === "section") break;
		if (line.kind === "entry") lastEntry = i;
	}
	return lastEntry + 1;
}

/** Index of the last line carrying content, ignoring trailing blank lines. */
function lastContentIndex(body: readonly string[]): number {
	for (let i = body.length - 1; i >= 0; i--) {
		if (classifyAt(body, i).kind !== "blank") return i;
	}
	return -1;
}

/**
 * Classify the line at `index`. An index past the end classifies as blank,
 * which is what every caller here wants: a line that is not there is neither
 * content nor a section header.
 */
function classifyAt(body: readonly string[], index: number): ClassifiedLine {
	return classifyLine(body[index] ?? "");
}
