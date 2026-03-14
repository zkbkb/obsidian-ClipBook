import {
	App,
	MarkdownPostProcessorContext,
	setIcon,
} from "obsidian";
import { ClipBookData, ClipBookEntry, ClipBookSection } from "../types";
import { ClipBookSettings } from "../settings";
import { maskValue } from "../utils/mask";
import { attachCopyHandler } from "./copy";
import { renderQuickAddButton } from "./quick-add";

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
		renderSection(section, containerEl, settings);
	}

	// Quick-add button at the bottom
	renderQuickAddButton(containerEl, data, settings, ctx, app);
}

function renderSection(
	section: ClipBookSection,
	containerEl: HTMLElement,
	settings: ClipBookSettings
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
		if (collapsed) entriesEl.style.display = "none";

		headerEl.addEventListener("click", () => {
			collapsed = !collapsed;
			setIcon(
				chevronEl,
				collapsed ? "chevron-right" : "chevron-down"
			);
			entriesEl.style.display = collapsed ? "none" : "";
		});

		for (const entry of section.entries) {
			renderEntry(entry, entriesEl, settings);
		}
	} else {
		// Orphan entries — no header, not collapsible
		for (const entry of section.entries) {
			renderEntry(entry, sectionEl, settings);
		}
	}
}

function renderEntry(
	entry: ClipBookEntry,
	parentEl: HTMLElement,
	settings: ClipBookSettings
): void {
	const rowEl = parentEl.createDiv({ cls: "clipbook-row" });

	// Key label (skip for keyless entries)
	if (entry.key !== null) {
		rowEl.createSpan({ cls: "clipbook-key", text: entry.key });
	}

	// Value display
	const valueEl = rowEl.createSpan({
		cls: `clipbook-value${entry.key === null ? " clipbook-value-full" : ""}`,
	});
	let revealed = false;
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	const isMasked = entry.masked || settings.defaultMasked;

	if (isMasked) {
		valueEl.setText(maskValue(entry.value));
		valueEl.addClass("clipbook-masked");
		valueEl.setAttribute("aria-label", "Click to reveal value");
		valueEl.setAttribute("role", "button");
		valueEl.tabIndex = 0;

		const hideValue = () => {
			if (!revealed) return;
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

		const toggleReveal = () => {
			revealed = !revealed;
			valueEl.setText(revealed ? entry.value : maskValue(entry.value));
			valueEl.toggleClass("clipbook-revealed", revealed);
			valueEl.setAttribute(
				"aria-label",
				revealed ? "Click to hide value" : "Click to reveal value"
			);

			if (hideTimer) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}

			if (revealed) {
				// Register for blur-based hiding
				revealedHideCallbacks.set(hideValue, valueEl);

				// Timer-based auto-hide
				if (settings.autoHideTimeout > 0) {
					hideTimer = setTimeout(
						hideValue,
						settings.autoHideTimeout * 1000
					);
				}
			} else {
				revealedHideCallbacks.delete(hideValue);
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
		valueEl.setText(entry.value);
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
