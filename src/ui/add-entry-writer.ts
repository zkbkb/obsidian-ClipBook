import {
	App,
	MarkdownPostProcessorContext,
	MarkdownView,
	Notice,
} from "obsidian";
import type { AddEntryResult } from "./add-entry-modal";

/**
 * Build the text line(s) to insert for a new entry.
 */
function formatEntry(result: AddEntryResult): string {
	const prefix = result.masked ? "!" : "";

	if (result.key) {
		return `${result.key} = ${prefix}${result.value}`;
	}
	// Keyless entry
	return `${prefix}${result.value}`;
}

/**
 * Write a new entry into the clipbook code block source.
 *
 * Strategy:
 * 1. Use getSectionInfo() to locate the block boundaries
 * 2. Parse the block content to find the target section's last line
 * 3. Insert the new entry (and section header if needed) at that position
 * 4. Prefer editor.replaceRange() for live-preview / edit mode
 * 5. Fall back to vault.process() for reading mode
 */
export function writeEntryToBlock(
	app: App,
	ctx: MarkdownPostProcessorContext,
	blockEl: HTMLElement,
	result: AddEntryResult
): void {
	const sectionInfo = ctx.getSectionInfo(blockEl);

	if (sectionInfo) {
		writeViaEditor(app, sectionInfo, result);
	} else {
		// Fallback: try vault.process using the source path from ctx
		writeViaVault(app, ctx, result);
	}
}

function writeViaEditor(
	app: App,
	sectionInfo: { text: string; lineStart: number; lineEnd: number },
	result: AddEntryResult
): void {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice("Cannot add entry: no active editor found.");
		return;
	}

	const editor = view.editor;
	const { lineStart, lineEnd } = sectionInfo;

	// lineStart = the ``` line, lineEnd = closing ``` line
	// Content lines are between lineStart+1 and lineEnd-1 (inclusive)
	const contentStartLine = lineStart + 1;
	const contentEndLine = lineEnd; // closing ``` is at lineEnd

	// Read the current block content from the editor
	const blockLines: string[] = [];
	for (let i = contentStartLine; i < contentEndLine; i++) {
		blockLines.push(editor.getLine(i));
	}

	const insertionLine = findInsertionLine(blockLines, result.section);
	const newLines = buildInsertionLines(blockLines, result, insertionLine);

	// Insert at the calculated editor line
	const editorLine = contentStartLine + insertionLine;
	const insertText = newLines.join("\n") + "\n";

	editor.replaceRange(insertText, { line: editorLine, ch: 0 }, { line: editorLine, ch: 0 });
}

function writeViaVault(
	app: App,
	ctx: MarkdownPostProcessorContext,
	result: AddEntryResult
): void {
	const filePath = ctx.sourcePath;
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!file || !("path" in file)) {
		new Notice("Cannot add entry: file not found.");
		return;
	}

	app.vault.process(file as Parameters<typeof app.vault.process>[0], (content) => {
		// Find the clipbook code block in the file content
		const lines = content.split("\n");
		const blockRange = findClipBookBlock(lines, ctx);
		if (!blockRange) {
			new Notice("Cannot add entry: clipbook block not found.");
			return content;
		}

		const { start, end } = blockRange;
		const blockLines = lines.slice(start + 1, end); // content between ``` fences

		const insertionLine = findInsertionLine(blockLines, result.section);
		const newLines = buildInsertionLines(blockLines, result, insertionLine);

		// Splice the new lines into the file content
		const fileInsertLine = start + 1 + insertionLine;
		lines.splice(fileInsertLine, 0, ...newLines);

		return lines.join("\n");
	});
}

/**
 * Find the line index (within block content) where the new entry should be inserted.
 * Returns the index such that inserting BEFORE this index places the entry
 * at the end of the target section.
 */
function findInsertionLine(blockLines: string[], targetSection: string): number {
	if (!targetSection) {
		// No section specified → append at the very end of the block
		return blockLines.length;
	}

	let inTargetSection = false;
	let lastLineInSection = -1;

	for (let i = 0; i < blockLines.length; i++) {
		const line = blockLines[i].trim();

		const sectionMatch = line.match(/^\[(.+)\]$/);
		if (sectionMatch) {
			const name = sectionMatch[1].trim();
			if (name === targetSection) {
				inTargetSection = true;
				lastLineInSection = i;
			} else if (inTargetSection) {
				// We've hit the next section → insert before this line
				return i;
			}
		} else if (inTargetSection && line !== "") {
			lastLineInSection = i;
		}
	}

	if (inTargetSection) {
		// Target section found, ends at the end of the block
		return lastLineInSection + 1;
	}

	// Section not found → it's a new section, append at end
	return blockLines.length;
}

/**
 * Build the line(s) to insert. May include a new section header.
 */
function buildInsertionLines(
	blockLines: string[],
	result: AddEntryResult,
	insertionLine: number
): string[] {
	const entryLine = formatEntry(result);
	const lines: string[] = [];

	if (result.section) {
		// Check if the section already exists
		const sectionExists = blockLines.some((line) => {
			const m = line.trim().match(/^\[(.+)\]$/);
			return m !== null && m[1].trim() === result.section;
		});

		if (!sectionExists) {
			// Add blank line separator if the block isn't empty
			if (blockLines.length > 0 && insertionLine > 0) {
				const prevLine = blockLines[insertionLine - 1]?.trim();
				if (prevLine !== "") {
					lines.push("");
				}
			}
			lines.push(`[${result.section}]`);
		}
	}

	lines.push(entryLine);
	return lines;
}

/**
 * Find the clipbook code block in file lines.
 * Uses the sourcePath context to narrow down if there are multiple blocks.
 */
function findClipBookBlock(
	lines: string[],
	_ctx: MarkdownPostProcessorContext
): { start: number; end: number } | null {
	// Find all clipbook blocks; for now return the first one found.
	// A more robust approach would use ctx line hints, but this covers
	// the common single-block case.
	let start = -1;

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (start === -1) {
			if (trimmed === "```clipbook") {
				start = i;
			}
		} else {
			if (trimmed === "```") {
				return { start, end: i };
			}
		}
	}

	return null;
}
