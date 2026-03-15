import {
	App,
	MarkdownPostProcessorContext,
	MarkdownView,
	Notice,
	TFile,
} from "obsidian";
import { ClipBookEntry } from "../types";
import { buildEntryLine } from "./quick-add";

/**
 * Make an element contenteditable for inline editing.
 * Calls `onSave` with the new text on Enter or blur (if changed),
 * or calls `onCancel` (restoring original display) on Escape.
 */
export function startInlineEdit(
	el: HTMLElement,
	currentText: string,
	onSave: (newText: string) => void,
	onCancel: () => void
): void {
	el.setAttribute("contenteditable", "plaintext-only");
	el.addClass("clipbook-editing");

	let done = false;

	const finish = (action: "save" | "cancel") => {
		if (done) return;
		done = true;
		el.removeAttribute("contenteditable");
		el.removeClass("clipbook-editing");

		const newText = (el.textContent ?? "").trim();
		if (action === "save" && newText !== "" && newText !== currentText) {
			onSave(newText);
		} else {
			onCancel();
		}
	};

	el.addEventListener(
		"keydown",
		(evt: KeyboardEvent) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				evt.stopPropagation();
				el.blur();
			} else if (evt.key === "Escape") {
				evt.preventDefault();
				evt.stopPropagation();
				finish("cancel");
			}
		},
		{ once: false }
	);

	el.addEventListener("blur", () => finish("save"), { once: true });
}

/**
 * Replace a specific source line within the clipbook block.
 * Uses editor API in edit/live-preview mode, falls back to vault.process().
 */
export function replaceEntryInSource(
	app: App,
	ctx: MarkdownPostProcessorContext,
	containerEl: HTMLElement,
	entry: ClipBookEntry,
	newKey: string | null,
	newValue: string
): void {
	const newLine = buildEntryLine(newKey, newValue, entry.masked);

	const view = app.workspace.getActiveViewOfType(MarkdownView);
	const sectionInfo = ctx.getSectionInfo(containerEl);

	if (view && sectionInfo) {
		const targetLine = sectionInfo.lineStart + 1 + entry.sourceLine;
		const editor = view.editor;
		editor.replaceRange(
			newLine + "\n",
			{ line: targetLine, ch: 0 },
			{ line: targetLine + 1, ch: 0 }
		);
		return;
	}

	// Fallback: vault.process for reading mode
	const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) {
		new Notice("Cannot edit: file not found.");
		return;
	}

	app.vault.process(file, (content) => {
		const lines = content.split("\n");
		// Find the clipbook block that contains this entry
		let blockStart = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === "```clipbook") {
				blockStart = i;
				break;
			}
		}
		if (blockStart === -1) {
			new Notice("Cannot edit: clipbook block not found.");
			return content;
		}
		const targetLine = blockStart + 1 + entry.sourceLine;
		lines[targetLine] = newLine;
		return lines.join("\n");
	}).catch(() => {
		new Notice("ClipBook: failed to update file.");
	});
}
