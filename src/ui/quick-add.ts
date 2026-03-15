import {
	App,
	Editor,
	MarkdownPostProcessorContext,
	MarkdownView,
	Notice,
	setIcon,
	TFile,
} from "obsidian";
import { ClipBookData } from "../types";
import { ClipBookSettings } from "../settings";

export function renderQuickAddButton(
	containerEl: HTMLElement,
	data: ClipBookData,
	settings: ClipBookSettings,
	ctx: MarkdownPostProcessorContext,
	app: App
): void {
	const addBtn = containerEl.createDiv({ cls: "clipbook-add-btn" });
	const iconEl = addBtn.createSpan({ cls: "clipbook-add-btn-icon" });
	setIcon(iconEl, "plus");
	addBtn.createSpan({ text: "Add" });

	let formEl: HTMLElement | null = null;

	addBtn.addEventListener("click", () => {
		if (formEl) {
			// Toggle form off
			formEl.remove();
			formEl = null;
			return;
		}
		formEl = renderQuickAddForm(
			containerEl,
			data,
			settings,
			ctx,
			app,
			() => {
				formEl?.remove();
				formEl = null;
			}
		);
	});
}

function renderQuickAddForm(
	containerEl: HTMLElement,
	data: ClipBookData,
	settings: ClipBookSettings,
	ctx: MarkdownPostProcessorContext,
	app: App,
	onClose: () => void
): HTMLElement {
	const formEl = containerEl.createDiv({ cls: "clipbook-add-form" });

	// Section field — combo of existing sections + free text
	const sectionRow = formEl.createDiv({ cls: "clipbook-add-form-row" });
	sectionRow.createSpan({
		cls: "clipbook-add-form-label",
		text: "Section",
	});
	const listId = "clipbook-sections-" + Date.now();
	const sectionInput = sectionRow.createEl("input", {
		cls: "clipbook-add-form-input",
		attr: {
			type: "text",
			placeholder: "(none — add as orphan)",
			list: listId,
		},
	});
	// Datalist for existing section suggestions
	const existingSections = data
		.map((s) => s.name)
		.filter((n): n is string => n !== null);
	if (existingSections.length > 0) {
		const datalist = formEl.createEl("datalist", {
			attr: { id: listId },
		});
		for (const name of existingSections) {
			datalist.createEl("option", { attr: { value: name } });
		}
	}

	// Key field
	const keyRow = formEl.createDiv({ cls: "clipbook-add-form-row" });
	keyRow.createSpan({ cls: "clipbook-add-form-label", text: "Key" });
	const keyInput = keyRow.createEl("input", {
		cls: "clipbook-add-form-input",
		attr: { type: "text", placeholder: "(optional)" },
	});

	// Value field
	const valueRow = formEl.createDiv({ cls: "clipbook-add-form-row" });
	valueRow.createSpan({ cls: "clipbook-add-form-label", text: "Value" });
	const valueInput = valueRow.createEl("input", {
		cls: "clipbook-add-form-input",
		attr: { type: "text", placeholder: "Paste or type value" },
	});

	// Mask toggle
	const maskRow = formEl.createDiv({ cls: "clipbook-add-form-row" });
	const maskLabel = maskRow.createEl("label", {
		cls: "clipbook-add-form-checkbox-label",
	});
	const maskCheckbox = maskLabel.createEl("input", {
		attr: { type: "checkbox" },
	});
	if (settings.quickAddDefaultMask) {
		maskCheckbox.checked = true;
	}
	maskLabel.createSpan({ text: " Mask this value" });

	// Action buttons
	const actionsRow = formEl.createDiv({ cls: "clipbook-add-form-actions" });

	const cancelBtn = actionsRow.createEl("button", {
		cls: "clipbook-add-form-cancel",
		text: "Cancel",
	});
	cancelBtn.addEventListener("click", onClose);

	const addBtn = actionsRow.createEl("button", {
		cls: "clipbook-add-form-submit",
		text: "Add",
	});

	// Disable Add when value is empty
	const updateSubmitState = () => {
		addBtn.disabled = valueInput.value.trim() === "";
	};
	valueInput.addEventListener("input", updateSubmitState);
	updateSubmitState();

	addBtn.addEventListener("click", () => {
		const value = valueInput.value.trim();
		if (!value) return;

		const section = sectionInput.value.trim() || null;
		const key = keyInput.value.trim() || null;
		const masked = maskCheckbox.checked;

		writeEntryToSource(app, ctx, containerEl, data, section, key, value, masked);
		onClose();
	});

	// Focus the value input for quick paste
	valueInput.focus();

	return formEl;
}

export function buildEntryLine(
	key: string | null,
	value: string,
	masked: boolean
): string {
	const maskedPrefix = masked ? "!" : "";
	if (key) {
		return `${key} = ${maskedPrefix}${value}`;
	}
	// Keyless: use bare line for masked, = value for plain (avoid ambiguity)
	if (masked) {
		return `!${value}`;
	}
	return `= ${value}`;
}

function writeEntryToSource(
	app: App,
	ctx: MarkdownPostProcessorContext,
	containerEl: HTMLElement,
	data: ClipBookData,
	section: string | null,
	key: string | null,
	value: string,
	masked: boolean
): void {
	const entryLine = buildEntryLine(key, value, masked);

	// Try editor-based write first (works in edit/live-preview mode)
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	const sectionInfo = ctx.getSectionInfo(containerEl);

	if (view && sectionInfo) {
		writeViaEditor(view.editor, sectionInfo, section, entryLine);
		return;
	}

	// Fallback: write via vault.process (works in reading mode)
	writeViaVault(app, ctx, section, entryLine);
}

function writeViaEditor(
	editor: Editor,
	sectionInfo: { lineStart: number; lineEnd: number },
	section: string | null,
	entryLine: string
): void {
	const blockStart = sectionInfo.lineStart;
	const blockEnd = sectionInfo.lineEnd;

	if (section === null) {
		const insertLine = blockStart + 1;
		editor.replaceRange(
			entryLine + "\n",
			{ line: insertLine, ch: 0 },
			{ line: insertLine, ch: 0 }
		);
		return;
	}

	const sourceLines: string[] = [];
	for (let i = blockStart + 1; i < blockEnd; i++) {
		sourceLines.push(editor.getLine(i));
	}

	const { sectionFound, insertOffset } = findInsertionOffset(sourceLines, section);

	if (sectionFound) {
		const insertLine = blockStart + 1 + insertOffset;
		editor.replaceRange(
			entryLine + "\n",
			{ line: insertLine, ch: 0 },
			{ line: insertLine, ch: 0 }
		);
	} else {
		const insertLine = blockEnd;
		editor.replaceRange(
			`\n[${section}]\n${entryLine}\n`,
			{ line: insertLine, ch: 0 },
			{ line: insertLine, ch: 0 }
		);
	}
}

function writeViaVault(
	app: App,
	ctx: MarkdownPostProcessorContext,
	section: string | null,
	entryLine: string
): void {
	const file = app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) {
		new Notice("Cannot add entry: file not found.");
		return;
	}

	app.vault.process(file, (content) => {
		const lines = content.split("\n");
		const block = findClipBookBlock(lines);
		if (!block) {
			new Notice("Cannot add entry: clipbook block not found.");
			return content;
		}

		const blockLines = lines.slice(block.start + 1, block.end);

		if (section === null) {
			lines.splice(block.start + 1, 0, entryLine);
			return lines.join("\n");
		}

		const { sectionFound, insertOffset } = findInsertionOffset(blockLines, section);

		if (sectionFound) {
			lines.splice(block.start + 1 + insertOffset, 0, entryLine);
		} else {
			lines.splice(block.end, 0, "", `[${section}]`, entryLine);
		}

		return lines.join("\n");
	});
}

function findInsertionOffset(
	blockLines: string[],
	section: string
): { sectionFound: boolean; insertOffset: number } {
	const sectionRegex = /^\[(.+)\]$/;
	let sectionHeaderIdx = -1;
	let lastEntryIdx = -1;

	for (let i = 0; i < blockLines.length; i++) {
		const trimmed = blockLines[i].trim();
		const match = trimmed.match(sectionRegex);
		if (match && match[1].trim() === section) {
			sectionHeaderIdx = i;
			lastEntryIdx = i;
			for (let j = i + 1; j < blockLines.length; j++) {
				const t = blockLines[j].trim();
				if (t.match(sectionRegex)) break;
				if (t !== "" && !t.startsWith("#") && !t.startsWith(";")) {
					lastEntryIdx = j;
				}
			}
			break;
		}
	}

	if (sectionHeaderIdx !== -1) {
		return { sectionFound: true, insertOffset: lastEntryIdx + 1 };
	}
	return { sectionFound: false, insertOffset: blockLines.length };
}

function findClipBookBlock(
	lines: string[]
): { start: number; end: number } | null {
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
