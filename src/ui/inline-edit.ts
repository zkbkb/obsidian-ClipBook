import {
	App,
	MarkdownPostProcessorContext,
	MarkdownView,
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
 * Requires edit/live-preview mode; returns false if no editor is available.
 */
export function replaceEntryInSource(
	app: App,
	ctx: MarkdownPostProcessorContext,
	containerEl: HTMLElement,
	entry: ClipBookEntry,
	newKey: string | null,
	newValue: string
): boolean {
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
		return true;
	}
	return false;
}
