import { Notice, setIcon } from "obsidian";
import { ClipBookData, SectionRef } from "../types";
import {
	describeKeyProblem,
	describeSectionProblem,
	validateKey,
	validateSectionName,
} from "../serializer";
import { describeWriteFailure, insertEntry } from "../source-writer";
import { RenderContext } from "./context";

let nextElementId = 0;

/**
 * The one quick-add form a block has, wherever it was opened from.
 *
 * A block-level button has to ask which section the entry belongs to; a button
 * on a section header already knows. Both open the same form — the difference
 * is only that one arrives with the answer, and that the form appears next to
 * whatever opened it rather than always at the bottom of a long block.
 */
export class QuickAdd {
	private formEl: HTMLElement | null = null;
	private opener: HTMLElement | null = null;

	constructor(
		private readonly rc: RenderContext,
		private readonly data: ClipBookData
	) {}

	/** Open under `host`, or close again if this opener already has it open. */
	toggle(
		opener: HTMLElement,
		host: HTMLElement,
		presetSection: SectionRef | null
	): void {
		const reopening = this.opener === opener && this.formEl !== null;
		this.close();
		if (reopening) return;

		this.formEl = renderQuickAddForm(this.rc, this.data, host, presetSection, () =>
			this.close()
		);
		this.opener = opener;
		opener.setAttribute("aria-expanded", "true");
	}

	close(): void {
		this.formEl?.remove();
		this.formEl = null;
		this.opener?.setAttribute("aria-expanded", "false");
		this.opener = null;
	}
}

/** The block-level button, which has to ask for a section. */
export function renderQuickAddButton(rc: RenderContext, quickAdd: QuickAdd): void {
	const addBtn = rc.containerEl.createEl("button", {
		cls: "clipbook-btn clipbook-add-btn",
		attr: { type: "button", "aria-expanded": "false" },
	});
	const iconEl = addBtn.createSpan({ cls: "clipbook-add-btn-icon" });
	setIcon(iconEl, "plus");
	addBtn.createSpan({ text: "Add" });

	addBtn.addEventListener("click", () => {
		quickAdd.toggle(addBtn, rc.containerEl, null);
	});
}

/** The per-section button, which does not. */
export function renderSectionAddButton(
	hostEl: HTMLElement,
	section: SectionRef & { name: string },
	quickAdd: QuickAdd,
	formHostEl: HTMLElement
): void {
	const addBtn = hostEl.createEl("button", {
		cls: "clipbook-btn clipbook-icon-btn clipbook-section-add",
		attr: {
			type: "button",
			"aria-expanded": "false",
			"aria-label": `Add to ${section.name}`,
		},
	});
	setIcon(addBtn, "plus");

	addBtn.addEventListener("click", (evt) => {
		evt.stopPropagation();
		quickAdd.toggle(addBtn, formHostEl, section);
	});
}

function renderQuickAddForm(
	rc: RenderContext,
	data: ClipBookData,
	hostEl: HTMLElement,
	presetSection: SectionRef | null,
	onClose: () => void
): HTMLElement {
	const formEl = hostEl.createEl("form", { cls: "clipbook-add-form" });

	const listId = `clipbook-sections-${nextElementId++}`;
	const sectionInput = addField(formEl, "Section", {
		placeholder: "(none — add as orphan)",
		list: listId,
	});
	if (presetSection?.name != null) sectionInput.value = presetSection.name;

	const existingSections = data
		.map((s) => s.name)
		.filter((name): name is string => name !== null);
	if (existingSections.length > 0) {
		const datalist = formEl.createEl("datalist", { attr: { id: listId } });
		for (const name of existingSections) {
			datalist.createEl("option", { attr: { value: name } });
		}
	}

	const keyInput = addField(formEl, "Key", { placeholder: "(optional)" });
	const valueInput = addField(formEl, "Value", {
		placeholder: "Paste or type value",
	});
	valueInput.addClass("clipbook-add-form-value");

	// Mask toggle
	const maskRow = formEl.createDiv({ cls: "clipbook-add-form-row" });
	const maskLabel = maskRow.createEl("label", {
		cls: "clipbook-add-form-checkbox-label",
	});
	const maskCheckbox = maskLabel.createEl("input", {
		attr: { type: "checkbox" },
	});
	maskCheckbox.checked = rc.settings.quickAddDefaultMask;
	maskLabel.createSpan({ text: " Mask this value" });

	const actionsRow = formEl.createDiv({ cls: "clipbook-add-form-actions" });
	// Plain Obsidian buttons: unlike the controls inside a row, these should
	// look like the app's own buttons, so they are left unstyled.
	const cancelBtn = actionsRow.createEl("button", {
		text: "Cancel",
		attr: { type: "button" },
	});
	cancelBtn.addEventListener("click", onClose);

	const submitBtn = actionsRow.createEl("button", {
		cls: "mod-cta",
		text: "Add",
		attr: { type: "submit" },
	});

	const updateSubmitState = () => {
		submitBtn.disabled = valueInput.value.trim() === "";
	};
	valueInput.addEventListener("input", updateSubmitState);
	updateSubmitState();

	// A <form> gives us Enter-to-submit from any field for free.
	formEl.addEventListener("submit", (evt) => {
		evt.preventDefault();
		void submit();
	});

	let submitting = false;
	const submit = async (): Promise<void> => {
		if (submitting) return;

		const value = valueInput.value.trim();
		if (!value) return;

		const key = keyInput.value.trim();
		const keyProblem = key === "" ? null : validateKey(key);
		if (keyProblem) {
			new Notice(describeKeyProblem(keyProblem));
			keyInput.focus();
			return;
		}

		const section = sectionInput.value.trim();
		if (section !== "" && validateSectionName(section)) {
			new Notice(describeSectionProblem());
			sectionInput.focus();
			return;
		}

		// The `Vault.process` path is genuinely async, and an insert carries no
		// expectation the writer could reject a repeat against — two fast
		// submissions would each append the entry to the latest contents.
		submitting = true;
		submitBtn.disabled = true;
		try {
			const failure = await insertEntry(
				rc,
				{
					name: section || null,
					// The preset points at one particular group; a name typed
					// or picked from the list means the first of that name,
					// which is all a name on its own can mean.
					occurrence:
						presetSection !== null && section === presetSection.name
							? presetSection.occurrence
							: 0,
				},
				key || null,
				value,
				maskCheckbox.checked
			);
			if (failure) {
				new Notice(describeWriteFailure(failure));
				return;
			}
			onClose();
		} finally {
			submitting = false;
			updateSubmitState();
		}
	};

	valueInput.focus();
	return formEl;
}

function addField(
	formEl: HTMLElement,
	label: string,
	attrs: Record<string, string>
): HTMLInputElement {
	const rowEl = formEl.createDiv({ cls: "clipbook-add-form-row" });
	const labelEl = rowEl.createEl("label", {
		cls: "clipbook-add-form-label",
		text: label,
	});
	const input = rowEl.createEl("input", {
		cls: "clipbook-add-form-input",
		attr: { type: "text", ...attrs },
	});
	labelEl.htmlFor = input.id || (input.id = `clipbook-field-${nextElementId++}`);
	return input;
}
