import { MarkdownRenderChild, setIcon } from "obsidian";
import { ClipBookData, ClipBookSection } from "../types";
import { RenderContext } from "./context";
import { renderEntry } from "./entry-row";
import {
	QuickAdd,
	renderQuickAddButton,
	renderSectionAddButton,
} from "./quick-add";

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

	const quickAdd = new QuickAdd(rc, data);

	if (data.length === 0) {
		containerEl.createDiv({
			cls: "clipbook-empty",
			text: "Empty clipbook block",
		});
	} else {
		// Two `[AWS]` headers are two groups, and every group needs to know
		// which one it is: the name alone would send both add buttons to the
		// first group and give both headers one shared collapse state.
		const seen = new Map<string, number>();
		for (const section of data) {
			const occurrence = section.name === null ? 0 : (seen.get(section.name) ?? 0);
			if (section.name !== null) seen.set(section.name, occurrence + 1);
			renderSection(rc, section, occurrence, quickAdd);
		}
	}

	// Rendered unconditionally — an empty block is exactly where quick-add is
	// most useful, and it used to be the one place the button was missing.
	renderQuickAddButton(rc, quickAdd);
}

function renderSection(
	rc: RenderContext,
	section: ClipBookSection,
	occurrence: number,
	quickAdd: QuickAdd
): void {
	const sectionEl = rc.containerEl.createDiv({ cls: "clipbook-section" });

	// Orphan entries: no header, not collapsible.
	if (section.name === null) {
		for (const entry of section.entries) renderEntry(rc, entry, sectionEl);
		return;
	}

	const name = section.name;
	const headRowEl = sectionEl.createDiv({ cls: "clipbook-section-head" });
	const headerEl = headRowEl.createEl("button", {
		cls: "clipbook-btn clipbook-section-header",
		attr: { type: "button" },
	});
	// One chevron, rotated by CSS off `aria-expanded`, rather than two icons
	// swapped on toggle: the state has a single source of truth, and the turn
	// can be animated.
	const chevronEl = headerEl.createSpan({ cls: "clipbook-chevron" });
	setIcon(chevronEl, "chevron-right");
	headerEl.createSpan({ text: name });

	// Two elements, not one: collapsing animates the outer element's grid row
	// from `1fr` to `0fr`, which needs a single child to measure against.
	renderSectionAddButton(headRowEl, { name, occurrence }, quickAdd, sectionEl);

	const entriesEl = sectionEl.createDiv({ cls: "clipbook-entries" });
	const innerEl = entriesEl.createDiv({ cls: "clipbook-entries-inner" });

	let collapsed = rc.collapse.get(
		rc.ctx.sourcePath,
		name,
		occurrence,
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
		rc.collapse.set(rc.ctx.sourcePath, name, occurrence, collapsed);
		paint();
	});

	for (const entry of section.entries) renderEntry(rc, entry, innerEl);
}
