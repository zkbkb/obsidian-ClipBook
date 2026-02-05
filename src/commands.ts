import { Plugin } from "obsidian";

export function registerCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: "insert-block",
		name: "Insert clipbook block",
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
}
