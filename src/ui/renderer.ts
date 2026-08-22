import { MarkdownRenderChild, setIcon } from "obsidian";
import { ClipBookData, ClipBookSection } from "../types";
import { RenderContext } from "./context";
import { renderEntry } from "./entry-row";
import { renderQuickAddButton } from "./quick-add";

/** Everything a caller supplies; the block's lifetime and window are derived here. */
export type RenderOptions = Omit<RenderContext, "lifecycle" | "win">;

export function renderClipBook(
	data: ClipBookData,
	options: RenderOptions
): void {
	const { containerEl } = options;
	containerEl.addClass("clipbook-container");

	// Tying a render child to the block gives every timer and reveal
	// registration below a well-defined end of life: Obsidian unloads it when
	// the element leaves the DOM.
	const lifecycle = new MarkdownRenderChild(containerEl);
	options.ctx.addChild(lifecycle);

	const rc: RenderContext = {
		...options,
		lifecycle,
		win: containerEl.ownerDocument.defaultView ?? window,
	};

	if (data.length === 0) {
		containerEl.createDiv({
			cls: "clipbook-empty",
			text: "Empty clipbook block",
		});
	} else {
		for (const section of data) renderSection(rc, section);
	}

	// Rendered unconditionally — an empty block is exactly where quick-add is
	// most useful, and it used to be the one place the button was missing.
	renderQuickAddButton(rc, data);
}

function renderSection(rc: RenderContext, section: ClipBookSection): void {
	const sectionEl = rc.containerEl.createDiv({ cls: "clipbook-section" });

	// Orphan entries: no header, not collapsible.
	if (section.name === null) {
		for (const entry of section.entries) renderEntry(rc, entry, sectionEl);
		return;
	}

	const headerEl = sectionEl.createEl("button", {
		cls: "clipbook-btn clipbook-section-header",
		attr: { type: "button" },
	});
	const chevronEl = headerEl.createSpan({ cls: "clipbook-chevron" });
	headerEl.createSpan({ text: section.name });

	const entriesEl = sectionEl.createDiv({ cls: "clipbook-entries" });

	let collapsed = rc.settings.defaultCollapsed;
	const paint = () => {
		setIcon(chevronEl, collapsed ? "chevron-right" : "chevron-down");
		entriesEl.toggleClass("clipbook-collapsed", collapsed);
		headerEl.setAttribute("aria-expanded", String(!collapsed));
	};
	paint();

	headerEl.addEventListener("click", () => {
		collapsed = !collapsed;
		paint();
	});

	for (const entry of section.entries) renderEntry(rc, entry, entriesEl);
}
