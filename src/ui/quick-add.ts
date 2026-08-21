import { Notice, setIcon } from "obsidian";
import { ClipBookData } from "../types";
import {
	describeKeyProblem,
	describeSectionProblem,
	validateKey,
	validateSectionName,
} from "../serializer";
import { describeWriteFailure, insertEntry } from "../source-writer";
import { RenderContext } from "./context";

let nextElementId = 0;

export function renderQuickAddButton(
	rc: RenderContext,
	data: ClipBookData
): void {
	const addBtn = rc.containerEl.createEl("button", {
		cls: "clipbook-add-btn",
		attr: { type: "button", "aria-expanded": "false" },
	});
	const iconEl = addBtn.createSpan({ cls: "clipbook-add-btn-icon" });
	setIcon(iconEl, "plus");
	addBtn.createSpan({ text: "Add" });

	let formEl: HTMLElement | null = null;
	const closeForm = () => {
		formEl?.remove();
		formEl = null;
		addBtn.setAttribute("aria-expanded", "false");
	};

	addBtn.addEventListener("click", () => {
		if (formEl) {
			closeForm();
			return;
		}
		formEl = renderQuickAddForm(rc, data, closeForm);
		addBtn.setAttribute("aria-expanded", "true");
	});
}

function renderQuickAddForm(
	rc: RenderContext,
	data: ClipBookData,
	onClose: () => void
): HTMLElement {
	const formEl = rc.containerEl.createEl("form", { cls: "clipbook-add-form" });

	const listId = `clipbook-sections-${nextElementId++}`;
	const sectionInput = addField(formEl, "Section", {
		placeholder: "(none — add as orphan)",
		list: listId,
	});

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
	const cancelBtn = actionsRow.createEl("button", {
		cls: "clipbook-add-form-cancel",
		text: "Cancel",
		attr: { type: "button" },
	});
	cancelBtn.addEventListener("click", onClose);

	const submitBtn = actionsRow.createEl("button", {
		cls: "clipbook-add-form-submit",
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
				section || null,
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
