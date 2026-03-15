import { ClipBookData, ClipBookSection } from "./types";

export function parseClipBook(source: string): ClipBookData {
	const lines = source.split("\n");
	const sections: ClipBookData = [];
	let currentSection: ClipBookSection = { name: null, entries: [] };

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip empty lines and comments
		if (line === "" || line.startsWith("#") || line.startsWith(";")) {
			continue;
		}

		// Section header: [Name]
		const sectionMatch = line.match(/^\[(.+)\]$/);
		if (sectionMatch) {
			// Push previous section if it has entries OR if it has a name
			// (named empty sections still get pushed)
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
			}

			// Empty key = keyless entry; non-empty key = named entry
			if (key !== "" || value !== "") {
				currentSection.entries.push({
					key: key === "" ? null : key,
					value,
					masked,
					sourceLine: i,
				});
			}
			continue;
		}

		// Bare line (no =) → keyless entry
		let bareValue = line;
		let bareMasked = false;
		if (bareValue.startsWith("!")) {
			bareMasked = true;
			bareValue = bareValue.substring(1);
		}
		if (bareValue !== "") {
			currentSection.entries.push({
				key: null,
				value: bareValue,
				masked: bareMasked,
				sourceLine: i,
			});
		}
	}

	// Push the final section
	if (currentSection.entries.length > 0 || currentSection.name !== null) {
		sections.push(currentSection);
	}

	return sections;
}
