import { Notice, setIcon } from "obsidian";
import { ClipBookEntry } from "../types";
import { describeKeyProblem, validateKey } from "../serializer";
import {
	DeletedEntry,
	WriteFailure,
	deleteEntry,
	describeWriteFailure,
	replaceEntry,
	undoDelete,
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
		() => entry.value,
		entry.masked || rc.settings.defaultMasked
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
		valueEl.addEventListener("click", (evt) => {
			if (editing) return;
			if (!mv.isRevealed) {
				mv.reveal();
				return;
			}
			// Already revealed, and no mousedown started an edit — so this is a
			// synthesized activation (see `onActivate`).
			if (evt.detail === 0) edit();
		});
		valueEl.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (editing) return;
			// The only way back: activating a revealed value edits it, so
			// without this a value stays on screen until the timer or a tab
			// switch takes it away.
			if (evt.key === "Escape" && mv.isRevealed) {
				evt.preventDefault();
				mv.hide();
				return;
			}
			if (evt.key !== "Enter" && evt.key !== " ") return;
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
		cls: "clipbook-btn clipbook-icon-btn clipbook-delete-btn",
		attr: {
			type: "button",
			"aria-label":
				entry.key !== null ? `Delete ${entry.key}` : "Delete entry",
		},
	});
	setIcon(deleteBtn, "trash-2");

	// A second click before the first write lands would be rejected by the
	// writer's line check and report a spurious "the note changed" instead.
	let deleting = false;
	deleteBtn.addEventListener("click", async (evt) => {
		evt.stopPropagation();
		if (deleting) return;
		deleting = true;
		deleteBtn.disabled = true;
		try {
			const result = await deleteEntry(rc, entry);
			if (result.failure !== null) {
				new Notice(describeWriteFailure(result.failure));
				return;
			}
			offerUndo(rc, entry, result.undo);
		} finally {
			deleting = false;
			deleteBtn.disabled = false;
		}
	});
}

const UNDO_WINDOW_MS = 10000;

/**
 * Deleting a credential you cannot get back is not something to discover after
 * the fact. A confirmation on every delete would be heavier than the action
 * deserves, so the notice carries the way back instead — and it does not rely
 * on the editor's undo stack, which is not there for a block rendered without
 * one.
 */
function offerUndo(
	rc: RenderContext,
	entry: ClipBookEntry,
	deleted: DeletedEntry
): void {
	const message = new DocumentFragment();
	message.createSpan({
		text: `Deleted ${entry.key ?? "entry"}. `,
	});
	const undoEl = message.createEl("a", {
		text: "Undo",
		attr: { href: "#" },
	});

	const notice = new Notice(message, UNDO_WINDOW_MS);
	undoEl.addEventListener("click", async (evt) => {
		evt.preventDefault();
		notice.hide();
		const failure = await undoDelete(rc.app, deleted);
		if (failure !== null) new Notice(describeWriteFailure(failure));
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
	// Assistive technology activates a role="button" by synthesizing a click,
	// without a mousedown or a DOM keydown, so neither handler above sees it.
	// Synthesized clicks carry `detail === 0`, which also keeps a real pointer
	// click from starting a second edit on top of its own mousedown.
	el.addEventListener("click", (evt) => {
		if (isEditing() || evt.detail !== 0) return;
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
