import { App, MarkdownPostProcessorContext, Modal, Setting } from "obsidian";
import { writeEntryToBlock } from "./add-entry-writer";

export interface AddEntryResult {
	section: string;
	value: string;
	key: string;
	masked: boolean;
}

export class AddEntryModal extends Modal {
	private existingSections: string[];
	private ctx: MarkdownPostProcessorContext;
	private blockEl: HTMLElement;

	private sectionValue = "";
	private entryValue = "";
	private keyValue = "";
	private maskedValue = true;

	constructor(
		app: App,
		existingSections: string[],
		ctx: MarkdownPostProcessorContext,
		blockEl: HTMLElement
	) {
		super(app);
		this.existingSections = existingSections;
		this.ctx = ctx;
		this.blockEl = blockEl;

		// Default to first existing section if available
		if (existingSections.length > 0) {
			this.sectionValue = existingSections[0];
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("clipbook-modal");

		contentEl.createEl("h2", { text: "Add ClipBook Entry" });

		// Section — combo box (text input + datalist for suggestions)
		const sectionSetting = new Setting(contentEl)
			.setName("Section")
			.setDesc("Select an existing section or type a new name.");

		sectionSetting.addText((text) => {
			const inputEl = text.inputEl;
			inputEl.setAttribute("placeholder", "e.g. API Keys");

			// Create datalist for autocomplete suggestions
			if (this.existingSections.length > 0) {
				const datalistId = "clipbook-section-suggestions";
				const datalist = contentEl.createEl("datalist", {
					attr: { id: datalistId },
				});
				for (const name of this.existingSections) {
					datalist.createEl("option", { attr: { value: name } });
				}
				inputEl.setAttribute("list", datalistId);
			}

			text.setValue(this.sectionValue);
			text.onChange((val) => {
				this.sectionValue = val.trim();
			});

			// Make the input wider for mobile usability
			inputEl.style.width = "100%";
		});

		// Make text input take full width in the setting row
		sectionSetting.settingEl.addClass("clipbook-modal-wide-input");

		// Value (required)
		const valueSetting = new Setting(contentEl)
			.setName("Value")
			.setDesc("The value to store (API key, token, password, etc.).");

		valueSetting.addText((text) => {
			text.setPlaceholder("e.g. sk-proj-abc123...");
			text.onChange((val) => {
				this.entryValue = val;
			});
			text.inputEl.style.width = "100%";
		});

		valueSetting.settingEl.addClass("clipbook-modal-wide-input");

		// Name (optional)
		const nameSetting = new Setting(contentEl)
			.setName("Name")
			.setDesc("Optional label for this entry. Leave empty for a keyless entry.");

		nameSetting.addText((text) => {
			text.setPlaceholder("e.g. OpenAI Key");
			text.onChange((val) => {
				this.keyValue = val.trim();
			});
			text.inputEl.style.width = "100%";
		});

		nameSetting.settingEl.addClass("clipbook-modal-wide-input");

		// Mask toggle
		new Setting(contentEl)
			.setName("Mask this value")
			.setDesc("Hide the value behind a mask. Recommended for secrets.")
			.addToggle((toggle) => {
				toggle.setValue(this.maskedValue);
				toggle.onChange((val) => {
					this.maskedValue = val;
				});
			});

		// Action buttons
		const btnContainer = contentEl.createDiv({ cls: "clipbook-modal-buttons" });

		const cancelBtn = btnContainer.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		const addBtn = btnContainer.createEl("button", {
			text: "Add",
			cls: "mod-cta",
		});
		addBtn.addEventListener("click", () => this.submit());

		// Allow Enter in the last text field to submit
		contentEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter" && !evt.shiftKey) {
				// Don't submit if focused on the datalist input (let datalist selection work)
				const active = document.activeElement;
				if (active && active.getAttribute("list")) return;
				evt.preventDefault();
				this.submit();
			}
		});
	}

	private submit(): void {
		if (!this.entryValue.trim()) {
			// Shake the modal briefly to indicate missing value
			this.contentEl.addClass("clipbook-modal-shake");
			setTimeout(() => this.contentEl.removeClass("clipbook-modal-shake"), 300);
			return;
		}

		const result: AddEntryResult = {
			section: this.sectionValue,
			value: this.entryValue,
			key: this.keyValue,
			masked: this.maskedValue,
		};

		writeEntryToBlock(this.app, this.ctx, this.blockEl, result);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
