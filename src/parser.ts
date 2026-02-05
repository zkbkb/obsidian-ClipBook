import { ClipBookData, ClipBookSection } from "./types";
import { ClipBookSettings } from "./settings";

export function parseClipBook(source: string, settings: ClipBookSettings): ClipBookData {
	const lines = source.split("\n");
	const sections: ClipBookData = [];
	let currentSection: ClipBookSection = { name: null, entries: [] };

	for (const rawLine of lines) {
		const line = rawLine.trim();

		// Skip empty lines and comments
		if (line === "" || line.startsWith("#") || line.startsWith(";")) {
			continue;
		}

		// Section header: [Name]
		const sectionMatch = line.match(/^\[(.+)\]$/);
		if (sectionMatch) {
			// Push previous section if it has entries OR if it has a name
			if (currentSection.entries.length > 0 || currentSection.name !== null) {
				sections.push(currentSection);
			}
			currentSection = { name: sectionMatch[1].trim(), entries: [] };
			continue;
		}

		// Key = Value (split on first = only)
		const eqIndex = line.indexOf("=");
		if (eqIndex !== -1) {
			const key = line.substring(0, eqIndex).trim();
			let value = line.substring(eqIndex + 1).trim();
			let masked = false;

			if (value.startsWith("!")) {
				masked = true;
				value = value.substring(1);
			} else {
				masked = settings.defaultMasked;
			}

			if (key !== "" || value !== "") {
				currentSection.entries.push({ key, value, masked });
			}
			continue;
		}

		// Keyless entry: line without = (e.g. "!sk-abc123" or "plain-value")
		let value = line;
		let masked = false;

		if (value.startsWith("!")) {
			masked = true;
			value = value.substring(1);
		} else {
			masked = settings.defaultMasked;
		}

		if (value !== "") {
			currentSection.entries.push({ key: "", value, masked });
		}
	}

	// Push the final section
	if (currentSection.entries.length > 0 || currentSection.name !== null) {
		sections.push(currentSection);
	}

	return sections;
}
