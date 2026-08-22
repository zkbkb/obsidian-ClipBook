import { App, Notice, Plugin } from "obsidian";
import { ClipboardGuard } from "./clipboard";
import { indexClipBookEntries } from "./entry-index";
import { ClipBookSettings } from "./settings";
import { CopyValueModal } from "./ui/copy-value-modal";
import { RevealRegistry } from "./ui/reveal-registry";

export interface CommandDeps {
	app: App;
	reveals: RevealRegistry;
	clipboard: ClipboardGuard;
	/** Read on each invocation, so a command never acts on stale settings. */
	settings: () => ClipBookSettings;
}

export function registerCommands(plugin: Plugin, deps: CommandDeps): void {
	plugin.addCommand({
		id: "insert-block",
		name: "Insert template block",
		editorCallback: (editor) => {
			const template = [
				"```clipbook",
				"[Section]",
				"Key = Value",
				"```",
				"",
			].join("\n");
			editor.replaceSelection(template);
		},
	});

	plugin.addCommand({
		id: "copy-value",
		name: "Copy value…",
		callback: () => void openCopyValue(deps),
	});

	plugin.addCommand({
		id: "hide-revealed",
		name: "Hide all revealed values",
		callback: () => deps.reveals.hideAll(),
	});
}

/**
 * The index is built per invocation rather than kept live: it is only ever
 * needed here, notes without a code block are skipped without being read, and
 * the rest come from Obsidian's own read cache.
 */
async function openCopyValue(deps: CommandDeps): Promise<void> {
	let entries;
	try {
		entries = await indexClipBookEntries(deps.app);
	} catch (error) {
		console.error("ClipBook: failed to index entries", error);
		new Notice("Could not search this vault for clipbook entries.");
		return;
	}

	if (entries.length === 0) {
		new Notice("No clipbook entries found in this vault.");
		return;
	}

	new CopyValueModal(deps.app, entries, (item) => {
		const settings = deps.settings();
		const isSecret = item.entry.masked || settings.defaultMasked;
		deps.clipboard
			.copy(item.entry.value, isSecret ? settings.clipboardClearTimeout : 0)
			.then(() => {
				new Notice(
					`Copied ${item.label !== "" ? item.label : "value"}.`
				);
			})
			.catch((error: unknown) => {
				console.error("ClipBook: copy failed", error);
				new Notice("Failed to copy to clipboard.");
			});
	}).open();
}
