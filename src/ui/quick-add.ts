import {
	App,
	MarkdownPostProcessorContext,
	MarkdownView,
	setIcon,
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
	// Only render if we can write back to the source
	const sectionInfo = ctx.getSectionInfo(containerEl);
	if (!sectionInfo) return;

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
	const sectionInput = sectionRow.createEl("input", {
		cls: "clipbook-add-form-input",
		attr: {
			type: "text",
			placeholder: "(none — add as orphan)",
			list: "clipbook-sections-list",
		},
	});
	// Datalist for existing section suggestions
	const existingSections = data
		.map((s) => s.name)
		.filter((n): n is string => n !== null);
	if (existingSections.length > 0) {
		const datalist = formEl.createEl("datalist", {
			attr: { id: "clipbook-sections-list" },
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

function buildEntryLine(
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
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) return;

	const editor = view.editor;
	const sectionInfo = ctx.getSectionInfo(containerEl);
	if (!sectionInfo) return;

	// sectionInfo.lineStart = opening ``` line, sectionInfo.lineEnd = closing ``` line
	const blockStart = sectionInfo.lineStart; // ```clipbook line
	const blockEnd = sectionInfo.lineEnd;     // closing ``` line

	const entryLine = buildEntryLine(key, value, masked);

	if (section === null) {
		// Orphan entry — insert right after the opening ``` line
		const insertLine = blockStart + 1;
		editor.replaceRange(
			entryLine + "\n",
			{ line: insertLine, ch: 0 },
			{ line: insertLine, ch: 0 }
		);
		return;
	}

	// Check if the target section already exists in the source
	const sourceLines: string[] = [];
	for (let i = blockStart + 1; i < blockEnd; i++) {
		sourceLines.push(editor.getLine(i));
	}

	// Find the target section's last entry line
	let sectionHeaderLine = -1;
	let lastEntryLine = -1;
	const sectionRegex = /^\[(.+)\]$/;

	for (let i = 0; i < sourceLines.length; i++) {
		const trimmed = sourceLines[i].trim();
		const match = trimmed.match(sectionRegex);
		if (match && match[1].trim() === section) {
			sectionHeaderLine = blockStart + 1 + i;
			lastEntryLine = sectionHeaderLine;
			// Scan forward to find last non-empty, non-comment, non-section line
			for (let j = i + 1; j < sourceLines.length; j++) {
				const t = sourceLines[j].trim();
				if (t.match(sectionRegex)) break; // hit next section
				if (t !== "" && !t.startsWith("#") && !t.startsWith(";")) {
					lastEntryLine = blockStart + 1 + j;
				}
			}
			break;
		}
	}

	if (sectionHeaderLine !== -1) {
		// Existing section — insert after the last entry line
		const insertLine = lastEntryLine + 1;
		editor.replaceRange(
			entryLine + "\n",
			{ line: insertLine, ch: 0 },
			{ line: insertLine, ch: 0 }
		);
	} else {
		// New section — insert before the closing ``` line
		const insertLine = blockEnd;
		editor.replaceRange(
			`\n[${section}]\n${entryLine}\n`,
			{ line: insertLine, ch: 0 },
			{ line: insertLine, ch: 0 }
		);
	}
}
