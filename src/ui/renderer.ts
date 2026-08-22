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

	const name = section.name;
	const headerEl = sectionEl.createEl("button", {
		cls: "clipbook-btn clipbook-section-header",
		attr: { type: "button" },
	});
	// One chevron, rotated by CSS off `aria-expanded`, rather than two icons
	// swapped on toggle: the state has a single source of truth, and the turn
	// can be animated.
	const chevronEl = headerEl.createSpan({ cls: "clipbook-chevron" });
	setIcon(chevronEl, "chevron-right");
	headerEl.createSpan({ text: name });

	const entriesEl = sectionEl.createDiv({ cls: "clipbook-entries" });

	let collapsed = rc.collapse.get(
		rc.ctx.sourcePath,
		name,
		rc.settings.defaultCollapsed
	);
	const paint = () => {
		entriesEl.toggleClass("clipbook-collapsed", collapsed);
		headerEl.setAttribute("aria-expanded", String(!collapsed));
	};
	paint();

	headerEl.addEventListener("click", () => {
		collapsed = !collapsed;
		// Remembered outside the render: editing any entry rewrites the source
		// and re-renders the whole block, which would otherwise spring every
		// collapsed section back open.
		rc.collapse.set(rc.ctx.sourcePath, name, collapsed);
		paint();
	});

	for (const entry of section.entries) renderEntry(rc, entry, entriesEl);
}
