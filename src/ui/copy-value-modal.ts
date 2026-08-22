import { App, SuggestModal, prepareFuzzySearch } from "obsidian";
import { IndexedEntry } from "../entry-index";
import { maskValue } from "../utils/mask";

/**
 * Find a value anywhere in the vault and copy it, without opening the note it
 * lives in — which for a list that only exists to be copied from is the shortest
 * path there is, and the one the command palette and quick switcher already
 * teach.
 */
export class CopyValueModal extends SuggestModal<IndexedEntry> {
	constructor(
		app: App,
		private readonly entries: readonly IndexedEntry[],
		private readonly onChoose: (item: IndexedEntry) => void
	) {
		super(app);
		this.setPlaceholder("Find a value to copy…");
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to copy" },
			{ command: "esc", purpose: "to dismiss" },
		]);
		this.emptyStateText = "No matching entries.";
	}

	getSuggestions(query: string): IndexedEntry[] {
		const trimmed = query.trim();
		if (trimmed === "") return this.entries.slice(0, this.limit);

		const search = prepareFuzzySearch(trimmed);
		const scored: { item: IndexedEntry; score: number }[] = [];
		for (const item of this.entries) {
			const result = search(item.searchText);
			if (result) scored.push({ item, score: result.score });
		}
		scored.sort((a, b) => b.score - a.score);
		return scored.map((entry) => entry.item);
	}

	renderSuggestion(item: IndexedEntry, el: HTMLElement): void {
		el.addClass("clipbook-suggestion");
		el.createDiv({
			cls: "clipbook-suggestion-title",
			text: item.label !== "" ? item.label : item.file.basename,
		});

		const meta = el.createDiv({ cls: "clipbook-suggestion-meta" });
		// Never the plaintext: a picker is exactly where someone else can be
		// looking over your shoulder.
		meta.createSpan({
			cls: "clipbook-suggestion-value",
			text: item.entry.masked
				? maskValue(item.entry.value)
				: item.entry.value,
		});
		meta.createSpan({
			cls: "clipbook-suggestion-path",
			text: item.file.path,
		});
	}

	onChooseSuggestion(item: IndexedEntry): void {
		this.onChoose(item);
	}
}
