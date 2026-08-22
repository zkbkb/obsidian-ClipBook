import { App, TFile } from "obsidian";
import { ClipBookEntry } from "./types";
import { parseClipBook } from "./parser";
import { findClipBookBlocks } from "./fence";

/** One entry, with enough context to say where in the vault it came from. */
export interface IndexedEntry {
	file: TFile;
	section: string | null;
	entry: ClipBookEntry;
	/** `Section / Key`, or whichever half exists. Shown in the picker. */
	label: string;
	/** What the picker matches against — the label plus the note's name. */
	searchText: string;
}

/**
 * Every clipbook entry in the vault.
 *
 * Built on demand rather than kept live: the picker is the only caller, reads
 * go through Obsidian's own read cache, and notes with no code block at all are
 * skipped without being read.
 */
export async function indexClipBookEntries(app: App): Promise<IndexedEntry[]> {
	const found: IndexedEntry[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (!mayContainCodeBlock(app, file)) continue;

		let contents: string;
		try {
			contents = await app.vault.cachedRead(file);
		} catch (error) {
			console.error("ClipBook: could not read", file.path, error);
			continue;
		}
		if (!contents.includes("clipbook")) continue;

		const lines = contents.split(/\r?\n/);
		for (const block of findClipBookBlocks(lines)) {
			const body = lines.slice(block.bodyStart, block.bodyEnd).join("\n");
			for (const section of parseClipBook(body)) {
				for (const entry of section.entries) {
					const label = buildLabel(section.name, entry.key);
					found.push({
						file,
						section: section.name,
						entry,
						label,
						// The note's name is worth matching on too: it is how a
						// keyless entry, which has no label of its own, is found.
						searchText: `${label} ${file.basename}`.trim(),
					});
				}
			}
		}
	}

	return found;
}

function buildLabel(section: string | null, key: string | null): string {
	if (section !== null && key !== null) return `${section} / ${key}`;
	return section ?? key ?? "";
}

/**
 * Cheap pre-filter. The metadata cache knows a note's section types without us
 * reading it, and a note with no code block cannot hold a clipbook block.
 */
function mayContainCodeBlock(app: App, file: TFile): boolean {
	const sections = app.metadataCache.getFileCache(file)?.sections;
	// No cache entry yet is not evidence of absence — fall back to reading.
	if (!sections) return true;
	return sections.some((section) => section.type === "code");
}
