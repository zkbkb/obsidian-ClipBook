import {
	App,
	Editor,
	MarkdownPostProcessorContext,
	MarkdownSectionInformation,
	MarkdownView,
	TFile,
} from "obsidian";
import { ClipBookEntry } from "./types";
import { buildEntryLine } from "./serializer";
import {
	insertEntryLine,
	removeEntryLine,
	replaceEntryLine,
} from "./block-edit";
import { CLOSE_FENCE_RE, OPEN_FENCE_RE } from "./fence";

/**
 * Writing back into the markdown source.
 *
 * Two rules make this safe:
 *
 * 1. The target file is resolved from `ctx.sourcePath` — the file that owns the
 *    rendered block — never from the active view. Those differ whenever the
 *    block is in a split pane, a sidebar, a hover preview, or an embed, and
 *    writing block-relative line numbers into an unrelated file corrupts it.
 * 2. The line we are about to overwrite is compared against the text we parsed
 *    it from. If the source moved underneath us, the write is abandoned rather
 *    than applied to the wrong line.
 */

export interface SourceTarget {
	app: App;
	ctx: MarkdownPostProcessorContext;
	containerEl: HTMLElement;
}

export type WriteFailure =
	| "no-location"
	| "unsupported-block"
	| "no-file"
	| "stale"
	| "error";

export function describeWriteFailure(failure: WriteFailure): string {
	switch (failure) {
		case "no-location":
			return "Could not locate this block in its note. Try reopening the note.";
		case "unsupported-block":
			return "Editing is not supported for clipbook blocks inside callouts or lists.";
		case "no-file":
			return "Could not find the note this block belongs to.";
		case "stale":
			return "The note changed since this block was rendered. Reopen it and try again.";
		case "error":
			return "Failed to write to the note.";
	}
}

/** A transform over the block body; returning null aborts the write. */
type BodyTransform = (body: readonly string[]) => string[] | null;

/** The line we expect to find before overwriting it. */
interface Expectation {
	index: number;
	raw: string;
}

export async function replaceEntry(
	target: SourceTarget,
	entry: ClipBookEntry,
	newKey: string | null,
	newValue: string
): Promise<WriteFailure | null> {
	const newLine = buildEntryLine(newKey, newValue, entry.masked);
	const result = await editBlockBody(
		target,
		(body) => replaceEntryLine(body, entry.sourceLine, newLine),
		{ index: entry.sourceLine, raw: entry.raw }
	);
	return result.failure;
}

/**
 * What is needed to put a deleted entry back. Deliberately a file path and an
 * absolute line rather than a block reference: by the time anyone acts on it
 * the block has re-rendered, and the element the write path resolves against
 * is gone.
 */
export interface DeletedEntry {
	path: string;
	line: number;
	raw: string;
}

export type DeleteResult =
	| { failure: WriteFailure; undo: null }
	| { failure: null; undo: DeletedEntry };

export async function deleteEntry(
	target: SourceTarget,
	entry: ClipBookEntry
): Promise<DeleteResult> {
	const result = await editBlockBody(
		target,
		(body) => removeEntryLine(body, entry.sourceLine),
		{ index: entry.sourceLine, raw: entry.raw }
	);
	if (result.failure !== null) return { failure: result.failure, undo: null };

	return {
		failure: null,
		undo: {
			path: target.ctx.sourcePath,
			line: result.bodyStart + entry.sourceLine,
			raw: entry.raw,
		},
	};
}

/** Put back what {@link deleteEntry} removed. */
export async function undoDelete(
	app: App,
	deleted: DeletedEntry
): Promise<WriteFailure | null> {
	const file = app.vault.getAbstractFileByPath(deleted.path);
	if (!(file instanceof TFile)) return "no-file";

	const editor = findEditorForPath(app, deleted.path);
	if (editor) {
		if (deleted.line > editor.lineCount()) return "stale";
		editor.replaceRange(
			deleted.raw + "\n",
			{ line: deleted.line, ch: 0 },
			{ line: deleted.line, ch: 0 }
		);
		return null;
	}

	let failure: WriteFailure | null = null;
	try {
		await app.vault.process(file, (data) => {
			const eol = data.includes("\r\n") ? "\r\n" : "\n";
			const lines = data.split(/\r?\n/);
			if (deleted.line > lines.length) {
				failure = "stale";
				return data;
			}
			lines.splice(deleted.line, 0, deleted.raw);
			return lines.join(eol);
		});
	} catch (error) {
		console.error("ClipBook: failed to restore entry", error);
		return "error";
	}
	return failure;
}

export async function insertEntry(
	target: SourceTarget,
	section: string | null,
	key: string | null,
	value: string,
	masked: boolean
): Promise<WriteFailure | null> {
	const entryLine = buildEntryLine(key, value, masked);
	const result = await editBlockBody(target, (body) =>
		insertEntryLine(body, section, entryLine)
	);
	return result.failure;
}

/** Where a successful edit landed, or why it did not happen. */
type EditResult =
	| { failure: WriteFailure }
	| { failure: null; bodyStart: number };

async function editBlockBody(
	target: SourceTarget,
	transform: BodyTransform,
	expect?: Expectation
): Promise<EditResult> {
	const { app, ctx, containerEl } = target;

	const info = ctx.getSectionInfo(containerEl);
	if (!info) return { failure: "no-location" };

	// `getAbstractFileByPath` rather than `getFileByPath`, which needs Obsidian
	// 1.5.7 — everything else here works on the manifest's minimum version.
	const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) return { failure: "no-file" };

	// Prefer an open editor for this exact file: it keeps unsaved changes and
	// the undo history intact. Fall back to an atomic vault write otherwise
	// (embeds, sidebars, and reading-only contexts have no editor).
	const editor = findEditorForPath(app, ctx.sourcePath);
	if (editor) {
		// Split on either line ending, to match how the parser produced
		// `expect.raw`. Editor line numbers count `\n`, so indices still line up.
		const located = locate(
			editor.getValue().split(/\r?\n/),
			info,
			transform,
			expect
		);
		if (typeof located === "string") return { failure: located };
		editor.replaceRange(
			joinBody(located.newBody, "\n"),
			{ line: located.bodyStart, ch: 0 },
			{ line: located.bodyEnd, ch: 0 }
		);
		return { failure: null, bodyStart: located.bodyStart };
	}

	let failure: WriteFailure | null = null;
	let bodyStart = 0;
	try {
		await app.vault.process(file, (data) => {
			const eol = data.includes("\r\n") ? "\r\n" : "\n";
			const lines = data.split(/\r?\n/);
			const located = locate(lines, info, transform, expect);
			if (typeof located === "string") {
				failure = located;
				return data;
			}
			bodyStart = located.bodyStart;
			lines.splice(
				located.bodyStart,
				located.bodyEnd - located.bodyStart,
				...located.newBody
			);
			return lines.join(eol);
		});
	} catch (error) {
		console.error("ClipBook: failed to write block", error);
		return { failure: "error" };
	}
	return failure !== null ? { failure } : { failure: null, bodyStart };
}

interface LocatedBody {
	bodyStart: number;
	bodyEnd: number;
	newBody: string[];
}

/**
 * Verify that the block still looks the way it did at render time, then run the
 * transform over its body. Returns a failure code instead of throwing so both
 * write paths can report the same reasons.
 */
function locate(
	lines: readonly string[],
	info: MarkdownSectionInformation,
	transform: BodyTransform,
	expect?: Expectation
): LocatedBody | WriteFailure {
	const { lineStart, lineEnd } = info;
	if (lineStart < 0 || lineEnd >= lines.length || lineEnd <= lineStart) {
		return "stale";
	}

	const open = lines[lineStart];
	const close = lines[lineEnd];
	if (open === undefined || close === undefined) return "stale";

	if (!OPEN_FENCE_RE.test(open)) {
		// A fence that only matches once trimmed is nested in a callout or a
		// list, where the source lines carry a prefix our indices do not model.
		return OPEN_FENCE_RE.test(open.trim()) ? "unsupported-block" : "stale";
	}
	if (!CLOSE_FENCE_RE.test(close)) return "stale";

	const bodyStart = lineStart + 1;
	const bodyEnd = lineEnd;
	const body = lines.slice(bodyStart, bodyEnd);

	if (expect) {
		if (expect.index < 0 || expect.index >= body.length) return "stale";
		if (body[expect.index] !== expect.raw) return "stale";
	}

	const newBody = transform(body);
	if (newBody === null) return "stale";

	return { bodyStart, bodyEnd, newBody };
}

function joinBody(body: readonly string[], eol: string): string {
	return body.length > 0 ? body.join(eol) + eol : "";
}

/**
 * The editor showing `path`, if the file is open anywhere — including popout
 * windows. Deliberately not `getActiveViewOfType`, which returns whatever the
 * user is looking at rather than the file this block came from.
 */
function findEditorForPath(app: App, path: string): Editor | null {
	for (const leaf of app.workspace.getLeavesOfType("markdown")) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === path) {
			return view.editor;
		}
	}
	return null;
}
