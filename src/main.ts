import { Plugin } from "obsidian";
import { parseClipBook } from "./parser";
import { renderClipBook } from "./ui/renderer";

export default class ClipBookPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("clipbook", (source, el) => {
			const data = parseClipBook(source);
			renderClipBook(data, el);
		});
	}
}
