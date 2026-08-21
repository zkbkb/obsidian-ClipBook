import { Notice, setIcon } from "obsidian";
import { ClipBookEntry } from "../types";
import { describeKeyProblem, validateKey } from "../serializer";
import {
	WriteFailure,
	deleteEntry,
	describeWriteFailure,
	replaceEntry,
} from "../source-writer";
import { RenderContext } from "./context";
import { renderCopyButton } from "./copy";
import { caretIndexFromPoint, startInlineEdit } from "./inline-edit";
import { MaskedValue } from "./masked-value";

export function renderEntry(
	rc: RenderContext,
	entry: ClipBookEntry,
	parentEl: HTMLElement
): void {
	const rowEl = parentEl.createDiv({ cls: "clipbook-row" });

	renderKey(rc, entry, rowEl);
	renderValue(rc, entry, rowEl);
	renderCopyButton(
		rc,
		rowEl,
		entry.key !== null ? `Copy ${entry.key}` : "Copy value",
		() => entry.value
	);
	renderDeleteButton(rc, entry, rowEl);
}

function renderKey(
	rc: RenderContext,
	entry: ClipBookEntry,
	rowEl: HTMLElement
): void {
	if (entry.key === null) return;
	const key = entry.key;

	const keyEl = rowEl.createSpan({
		cls: "clipbook-key",
		text: key,
		attr: {
			role: "button",
			tabindex: "0",
			"aria-label": `Edit key ${key}`,
		},
	});

	let editing = false;
	const restore = () => {
		editing = false;
		keyEl.setText(key);
	};

	// An empty key is meaningful: it turns the entry into a keyless one.
	const edit = (caretIndex?: number) => {
		if (editing) return;
		editing = true;
		startInlineEdit(
			keyEl,
			key,
			{ allowEmpty: true, caretIndex, ariaLabel: "Key" },
			(newKey) => {
				editing = false;
				const problem = validateKey(newKey);
				if (problem) {
					new Notice(describeKeyProblem(problem));
					restore();
					return;
				}
				void write(
					replaceEntry(rc, entry, newKey === "" ? null : newKey, entry.value),
					restore
				);
			},
			restore
		);
	};

	onActivate(keyEl, edit, () => editing);
}

function renderValue(
	rc: RenderContext,
	entry: ClipBookEntry,
	rowEl: HTMLElement
): void {
	const valueEl = rowEl.createSpan({
		cls: `clipbook-value${entry.key === null ? " clipbook-value-full" : ""}`,
		attr: { role: "button", tabindex: "0" },
	});

	// A keyless entry cannot hold an empty value — `= ` on its own carries no
	// content and would vanish on the next parse.
	const allowEmpty = entry.key !== null;
	let editing = false;
	let maskedValue: MaskedValue | null = null;

	const restore = () => {
		editing = false;
		if (maskedValue) {
			maskedValue.detach();
			maskedValue.paint();
		} else {
			valueEl.setText(entry.value);
		}
	};

	const edit = (caretIndex?: number) => {
		if (editing) return;
		editing = true;
		maskedValue?.detach();
		startInlineEdit(
			valueEl,
			entry.value,
			{ allowEmpty, caretIndex, ariaLabel: "Value" },
			(newValue) => {
				editing = false;
				// Re-mask immediately rather than leaving the new plaintext on
				// screen until the block re-renders.
				maskedValue?.paint();
				void write(replaceEntry(rc, entry, entry.key, newValue), restore);
			},
			restore
		);
	};

	if (entry.masked || rc.settings.defaultMasked) {
		const mv = new MaskedValue({
			el: valueEl,
			getValue: () => entry.value,
			autoHideSeconds: rc.settings.autoHideTimeout,
			reveals: rc.reveals,
			win: rc.win,
		});
		maskedValue = mv;
		rc.lifecycle.register(() => mv.dispose());
		mv.paint();

		// Entering edit on mousedown (rather than click) lets the caret land
		// where the user pointed, before the browser moves focus.
		valueEl.addEventListener("mousedown", (evt) => {
			if (editing || !mv.isRevealed) return;
			evt.preventDefault();
			edit(caretIndexFromPoint(valueEl, evt));
		});
		valueEl.addEventListener("click", () => {
			if (editing || mv.isRevealed) return;
			mv.reveal();
		});
		valueEl.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (editing || (evt.key !== "Enter" && evt.key !== " ")) return;
			evt.preventDefault();
			if (mv.isRevealed) edit();
			else mv.reveal();
		});
		return;
	}

	valueEl.setText(entry.value);
	valueEl.setAttribute("aria-label", "Edit value");
	onActivate(valueEl, edit, () => editing);
}

function renderDeleteButton(
	rc: RenderContext,
	entry: ClipBookEntry,
	rowEl: HTMLElement
): void {
	const deleteBtn = rowEl.createEl("button", {
		cls: "clipbook-icon-btn clipbook-delete-btn",
		attr: {
			type: "button",
			"aria-label":
				entry.key !== null ? `Delete ${entry.key}` : "Delete entry",
		},
	});
	setIcon(deleteBtn, "trash-2");

	deleteBtn.addEventListener("click", (evt) => {
		evt.stopPropagation();
		void write(deleteEntry(rc, entry));
	});
}

/** Wire mouse and keyboard activation for an element that edits itself in place. */
function onActivate(
	el: HTMLElement,
	edit: (caretIndex?: number) => void,
	isEditing: () => boolean
): void {
	el.addEventListener("mousedown", (evt) => {
		if (isEditing()) return;
		evt.preventDefault();
		evt.stopPropagation();
		edit(caretIndexFromPoint(el, evt));
	});
	el.addEventListener("keydown", (evt: KeyboardEvent) => {
		if (isEditing() || (evt.key !== "Enter" && evt.key !== " ")) return;
		evt.preventDefault();
		edit();
	});
}

/** Surface a failed write to the user and let the caller put the UI back. */
async function write(
	pending: Promise<WriteFailure | null>,
	onFailure?: () => void
): Promise<void> {
	const failure = await pending;
	if (failure === null) return;
	new Notice(describeWriteFailure(failure));
	onFailure?.();
}
