import { App, MarkdownPostProcessorContext, setIcon } from "obsidian";
import { ClipBookData, ClipBookSection } from "../types";
import { ClipBookSettings } from "../settings";
import { maskValue } from "../utils/mask";
import { attachCopyHandler } from "./copy";
import { AddEntryModal } from "./add-entry-modal";

export function renderClipBook(
	data: ClipBookData,
	containerEl: HTMLElement,
	settings: ClipBookSettings,
	app: App,
	ctx: MarkdownPostProcessorContext
): void {
	containerEl.addClass("clipbook-container");

	if (data.length === 0) {
		containerEl.createDiv({
			cls: "clipbook-empty",
			text: "Empty clipbook block — use + below to add entries, or type: Key = Value",
		});
	} else {
		for (const section of data) {
			renderSection(section, containerEl, settings);
		}
	}

	// Add entry button at the bottom
	renderAddButton(data, containerEl, app, ctx);
}

function renderSection(
	section: ClipBookSection,
	containerEl: HTMLElement,
	settings: ClipBookSettings
): void {
	const sectionEl = containerEl.createDiv({ cls: "clipbook-section" });

	// Section header (skip for orphan entries with name: null)
	if (section.name !== null) {
		const headerEl = sectionEl.createDiv({ cls: "clipbook-section-header" });

		if (settings.collapsibleSections) {
			headerEl.addClass("clipbook-collapsible");
			const chevronEl = headerEl.createSpan({ cls: "clipbook-chevron" });
			setIcon(chevronEl, "chevron-down");
			headerEl.createSpan({ text: section.name });

			headerEl.addEventListener("click", () => {
				const entriesEl = sectionEl.querySelector(".clipbook-section-entries") as HTMLElement | null;
				if (!entriesEl) return;
				const collapsed = entriesEl.hasClass("clipbook-collapsed");
				entriesEl.toggleClass("clipbook-collapsed", !collapsed);
				setIcon(chevronEl, collapsed ? "chevron-down" : "chevron-right");
			});
		} else {
			headerEl.setText(section.name);
		}
	}

	// Wrap entries in a container for collapsible toggling
	const entriesEl = sectionEl.createDiv({ cls: "clipbook-section-entries" });

	for (const entry of section.entries) {
		renderEntry(entry.key, entry.value, entry.masked, entriesEl, settings);
	}
}

function renderEntry(
	key: string,
	value: string,
	masked: boolean,
	parentEl: HTMLElement,
	settings: ClipBookSettings
): void {
	const rowEl = parentEl.createDiv({ cls: "clipbook-row" });

	// Key label (skip for keyless entries)
	if (key !== "") {
		rowEl.createSpan({ cls: "clipbook-key", text: key });
	}

	// Value display
	const valueEl = rowEl.createSpan({
		cls: key === "" ? "clipbook-value clipbook-value-full" : "clipbook-value",
	});
	let revealed = false;
	let autoHideTimer: ReturnType<typeof setTimeout> | null = null;

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

			// Auto-hide logic
			if (autoHideTimer) {
				clearTimeout(autoHideTimer);
				autoHideTimer = null;
			}
			if (revealed && settings.autoHideEnabled) {
				autoHideTimer = setTimeout(() => {
					revealed = false;
					valueEl.setText(maskValue(value));
					valueEl.toggleClass("clipbook-revealed", false);
					valueEl.setAttribute("aria-label", "Click to reveal value");
					autoHideTimer = null;
				}, settings.autoHideDelay);
			}
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
		attr: {
			"aria-label": key ? `Copy ${key}` : "Copy value",
			role: "button",
			tabindex: "0",
		},
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

function renderAddButton(
	data: ClipBookData,
	containerEl: HTMLElement,
	app: App,
	ctx: MarkdownPostProcessorContext
): void {
	const footerEl = containerEl.createDiv({ cls: "clipbook-footer" });
	const addBtn = footerEl.createSpan({
		cls: "clipbook-add-btn",
		attr: { "aria-label": "Add entry", role: "button", tabindex: "0" },
	});
	setIcon(addBtn, "plus");
	addBtn.createSpan({ text: "Add entry", cls: "clipbook-add-btn-text" });

	const openModal = () => {
		const existingSections = data
			.map((s) => s.name)
			.filter((n): n is string => n !== null);

		new AddEntryModal(app, existingSections, ctx, containerEl).open();
	};

	addBtn.addEventListener("click", openModal);
	addBtn.addEventListener("keydown", (evt: KeyboardEvent) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			openModal();
		}
	});
}
