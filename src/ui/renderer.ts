import {
	App,
	MarkdownPostProcessorContext,
	Notice,
	setIcon,
} from "obsidian";
import { ClipBookData, ClipBookEntry, ClipBookSection } from "../types";
import { ClipBookSettings } from "../settings";
import { maskValue } from "../utils/mask";
import { attachCopyHandler } from "./copy";
import { renderQuickAddButton } from "./quick-add";
import { startInlineEdit, replaceEntryInSource } from "./inline-edit";

// Global set of hide callbacks for blur-based auto-hide.
// Each entry maps a hide function to the DOM element it controls,
// allowing stale callbacks (for removed elements) to be cleaned up.
const revealedHideCallbacks = new Map<() => void, HTMLElement>();

export function hideAllRevealed(): void {
	for (const [hide, el] of revealedHideCallbacks) {
		if (!document.contains(el)) {
			revealedHideCallbacks.delete(hide);
			continue;
		}
		hide();
	}
}

export function renderClipBook(
	data: ClipBookData,
	containerEl: HTMLElement,
	settings: ClipBookSettings,
	ctx: MarkdownPostProcessorContext,
	app: App
): void {
	containerEl.addClass("clipbook-container");

	if (data.length === 0) {
		containerEl.createDiv({
			cls: "clipbook-empty",
			text: "Empty clipbook block",
		});
		return;
	}

	for (const section of data) {
		renderSection(section, containerEl, settings, ctx, app);
	}

	// Quick-add button at the bottom
	renderQuickAddButton(containerEl, data, settings, ctx, app);
}

function renderSection(
	section: ClipBookSection,
	containerEl: HTMLElement,
	settings: ClipBookSettings,
	ctx: MarkdownPostProcessorContext,
	app: App
): void {
	const sectionEl = containerEl.createDiv({ cls: "clipbook-section" });

	if (section.name !== null) {
		// Collapsible section header
		const headerEl = sectionEl.createDiv({
			cls: "clipbook-section-header",
		});

		const chevronEl = headerEl.createSpan({ cls: "clipbook-chevron" });
		headerEl.createSpan({ text: section.name });

		let collapsed = settings.defaultCollapsed;
		setIcon(chevronEl, collapsed ? "chevron-right" : "chevron-down");

		const entriesEl = sectionEl.createDiv({ cls: "clipbook-entries" });
		if (collapsed) entriesEl.addClass("clipbook-collapsed");

		headerEl.addEventListener("click", () => {
			collapsed = !collapsed;
			setIcon(
				chevronEl,
				collapsed ? "chevron-right" : "chevron-down"
			);
			entriesEl.toggleClass("clipbook-collapsed", collapsed);
		});

		for (const entry of section.entries) {
			renderEntry(entry, entriesEl, settings, ctx, app, containerEl);
		}
	} else {
		// Orphan entries — no header, not collapsible
		for (const entry of section.entries) {
			renderEntry(entry, sectionEl, settings, ctx, app, containerEl);
		}
	}
}

function renderEntry(
	entry: ClipBookEntry,
	parentEl: HTMLElement,
	settings: ClipBookSettings,
	ctx: MarkdownPostProcessorContext,
	app: App,
	containerEl: HTMLElement
): void {
	const rowEl = parentEl.createDiv({ cls: "clipbook-row" });

	// Key label (skip for keyless entries)
	if (entry.key !== null) {
		const key = entry.key;
		const keyEl = rowEl.createSpan({ cls: "clipbook-key", text: key });
		let keyEditing = false;

		keyEl.addEventListener("mousedown", (evt) => {
			if (keyEditing) return;
			evt.stopPropagation();
			keyEditing = true;
			startInlineEdit(
				keyEl,
				key,
				(newKey) => {
					keyEditing = false;
					if (!replaceEntryInSource(app, ctx, containerEl, entry, newKey, entry.value)) {
						new Notice("Cannot edit in reading mode. Switch to edit or live-preview mode.");
						keyEl.setText(key);
					}
				},
				() => {
					keyEditing = false;
					keyEl.setText(key);
				}
			);
		});
	}

	// Value display
	const valueEl = rowEl.createSpan({
		cls: `clipbook-value${entry.key === null ? " clipbook-value-full" : ""}`,
	});
	let revealed = false;
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let valueEditing = false;

	const isMasked = entry.masked || settings.defaultMasked;

	// Restore value element to its non-editing display state
	const restoreValueDisplay = () => {
		if (isMasked) {
			revealed = false;
			valueEl.setText(maskValue(entry.value));
			valueEl.toggleClass("clipbook-revealed", false);
			valueEl.addClass("clipbook-masked");
			valueEl.setAttribute("aria-label", "Click to reveal value");
		} else {
			valueEl.setText(entry.value);
		}
	};

	// Enter inline edit mode for the value
	const enterValueEdit = () => {
		valueEditing = true;
		startInlineEdit(
			valueEl,
			entry.value,
			(newValue) => {
				valueEditing = false;
				if (!replaceEntryInSource(app, ctx, containerEl, entry, entry.key, newValue)) {
					new Notice("Cannot edit in reading mode. Switch to edit or live-preview mode.");
					restoreValueDisplay();
				}
			},
			() => {
				valueEditing = false;
				restoreValueDisplay();
			}
		);
	};

	if (isMasked) {
		valueEl.setText(maskValue(entry.value));
		valueEl.addClass("clipbook-masked");
		valueEl.setAttribute("aria-label", "Click to reveal value");
		valueEl.setAttribute("role", "button");
		valueEl.tabIndex = 0;

		const hideValue = () => {
			if (!revealed || valueEditing) return;
			revealed = false;
			if (hideTimer) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}
			valueEl.setText(maskValue(entry.value));
			valueEl.toggleClass("clipbook-revealed", false);
			valueEl.setAttribute("aria-label", "Click to reveal value");
			revealedHideCallbacks.delete(hideValue);
		};

		const revealValue = () => {
			revealed = true;
			valueEl.setText(entry.value);
			valueEl.toggleClass("clipbook-revealed", true);
			valueEl.setAttribute("aria-label", "Click to edit value");

			// Register for blur-based hiding
			revealedHideCallbacks.set(hideValue, valueEl);

			// Timer-based auto-hide
			if (settings.autoHideTimeout > 0) {
				hideTimer = setTimeout(
					hideValue,
					settings.autoHideTimeout * 1000
				);
			}
		};

		// mousedown on revealed value: enter edit before mouseup so cursor lands naturally
		valueEl.addEventListener("mousedown", () => {
			if (valueEditing || !revealed) return;
			if (hideTimer) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}
			revealedHideCallbacks.delete(hideValue);
			enterValueEdit();
		});

		// click on masked value: reveal
		valueEl.addEventListener("click", () => {
			if (valueEditing || revealed) return;
			revealValue();
		});

		valueEl.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (valueEditing) return;
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				if (!revealed) {
					revealValue();
				} else {
					if (hideTimer) {
						clearTimeout(hideTimer);
						hideTimer = null;
					}
					revealedHideCallbacks.delete(hideValue);
					enterValueEdit();
				}
			}
		});
	} else {
		valueEl.setText(entry.value);

		// mousedown to edit — cursor lands at click position naturally
		valueEl.addEventListener("mousedown", () => {
			if (valueEditing) return;
			enterValueEdit();
		});
	}

	// Copy button
	const copyLabel = entry.key !== null ? `Copy ${entry.key}` : "Copy value";
	const copyBtn = rowEl.createSpan({
		cls: "clipbook-copy-btn",
		attr: { "aria-label": copyLabel, role: "button", tabindex: "0" },
	});
	setIcon(copyBtn, "copy");

	attachCopyHandler(copyBtn, () => entry.value);

	copyBtn.addEventListener("keydown", (evt: KeyboardEvent) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			copyBtn.click();
		}
	});
}
