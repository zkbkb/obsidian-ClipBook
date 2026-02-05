import { setIcon } from "obsidian";
import { ClipBookData, ClipBookSection } from "../types";
import { maskValue } from "../utils/mask";
import { attachCopyHandler } from "./copy";

export function renderClipBook(data: ClipBookData, containerEl: HTMLElement): void {
	containerEl.addClass("clipbook-container");

	if (data.length === 0) {
		containerEl.createDiv({ cls: "clipbook-empty", text: "Empty clipbook block" });
		return;
	}

	for (const section of data) {
		renderSection(section, containerEl);
	}
}

function renderSection(section: ClipBookSection, containerEl: HTMLElement): void {
	const sectionEl = containerEl.createDiv({ cls: "clipbook-section" });

	// Section header (skip for orphan entries with name: null)
	if (section.name !== null) {
		sectionEl.createDiv({ cls: "clipbook-section-header", text: section.name });
	}

	for (const entry of section.entries) {
		renderEntry(entry.key, entry.value, entry.masked, sectionEl);
	}
}

function renderEntry(
	key: string,
	value: string,
	masked: boolean,
	parentEl: HTMLElement
): void {
	const rowEl = parentEl.createDiv({ cls: "clipbook-row" });

	// Key label
	rowEl.createSpan({ cls: "clipbook-key", text: key });

	// Value display
	const valueEl = rowEl.createSpan({ cls: "clipbook-value" });
	let revealed = false;

	if (masked) {
		valueEl.setText(maskValue(value));
		valueEl.addClass("clipbook-masked");
		valueEl.setAttribute("aria-label", "Click to reveal value");
		valueEl.setAttribute("role", "button");
		valueEl.tabIndex = 0;

		const toggleReveal = () => {
			revealed = !revealed;
			valueEl.setText(revealed ? value : maskValue(value));
			valueEl.toggleClass("clipbook-revealed", revealed);
			valueEl.setAttribute(
				"aria-label",
				revealed ? "Click to hide value" : "Click to reveal value"
			);
		};

		valueEl.addEventListener("click", toggleReveal);
		valueEl.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				toggleReveal();
			}
		});
	} else {
		valueEl.setText(value);
	}

	// Copy button
	const copyBtn = rowEl.createSpan({
		cls: "clipbook-copy-btn",
		attr: { "aria-label": `Copy ${key}`, role: "button", tabindex: "0" },
	});
	setIcon(copyBtn, "copy");

	attachCopyHandler(copyBtn, () => value);

	// Keyboard activation of copy
	copyBtn.addEventListener("keydown", (evt: KeyboardEvent) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			copyBtn.click();
		}
	});
}
