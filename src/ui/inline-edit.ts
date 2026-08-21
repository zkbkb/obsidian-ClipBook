export interface InlineEditOptions {
	/** Allow saving an empty string. Off by default — an empty edit cancels. */
	allowEmpty?: boolean;
	/** Where to put the caret. Defaults to selecting the whole text. */
	caretIndex?: number;
	ariaLabel?: string;
}

/**
 * Edit an element's text in place by swapping its content for a text input.
 *
 * A real input rather than `contenteditable`: `plaintext-only` is unsupported
 * on older WebKit (so editing silently did nothing on iOS), and an input gives
 * us plain-text paste, caret control, and native mobile keyboard behaviour for
 * free.
 *
 * `onSave` runs with the trimmed new text; `onCancel` runs on Escape, on an
 * unchanged value, and on an empty value unless `allowEmpty` is set. The
 * element is restored to a plain-text state before either callback fires.
 */
export function startInlineEdit(
	el: HTMLElement,
	currentText: string,
	options: InlineEditOptions,
	onSave: (newText: string) => void,
	onCancel: () => void
): void {
	el.empty();
	el.addClass("clipbook-editing");

	const input = el.createEl("input", {
		cls: "clipbook-edit-input",
		attr: { type: "text", spellcheck: "false" },
	});
	input.value = currentText;
	if (options.ariaLabel) input.setAttribute("aria-label", options.ariaLabel);

	let done = false;
	// One controller for every listener, so a finished edit leaves nothing
	// attached — repeated edit/cancel cycles reuse the same element.
	const listeners = new AbortController();

	const finish = (action: "save" | "cancel") => {
		if (done) return;
		done = true;
		listeners.abort();

		const newText = input.value.trim();
		el.removeClass("clipbook-editing");
		el.empty();

		const changed = newText !== currentText;
		const acceptable = options.allowEmpty === true || newText !== "";
		if (action === "save" && changed && acceptable) {
			el.setText(newText);
			onSave(newText);
		} else {
			onCancel();
		}
	};

	input.addEventListener(
		"keydown",
		(evt: KeyboardEvent) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				evt.stopPropagation();
				finish("save");
			} else if (evt.key === "Escape") {
				evt.preventDefault();
				evt.stopPropagation();
				finish("cancel");
			}
		},
		{ signal: listeners.signal }
	);
	input.addEventListener("blur", () => finish("save"), {
		signal: listeners.signal,
	});

	input.focus();
	if (options.caretIndex === undefined) {
		input.select();
	} else {
		const caret = Math.min(options.caretIndex, input.value.length);
		input.setSelectionRange(caret, caret);
	}
}

/**
 * Character offset within `el`'s text at the given pointer position, so an edit
 * started by clicking puts the caret where the user pointed. Returns undefined
 * when the engine cannot tell us, in which case the caller selects everything.
 */
export function caretIndexFromPoint(
	el: HTMLElement,
	evt: MouseEvent
): number | undefined {
	const doc = el.ownerDocument;
	if (typeof doc.caretRangeFromPoint !== "function") return undefined;

	const range = doc.caretRangeFromPoint(evt.clientX, evt.clientY);
	if (!range || !el.contains(range.startContainer)) return undefined;
	return range.startOffset;
}
