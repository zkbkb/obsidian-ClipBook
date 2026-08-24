/**
 * Remembers which sections the reader has collapsed.
 *
 * Any edit rewrites the source, which re-renders the block from scratch — so
 * without somewhere outside the render to keep it, collapsing a few sections
 * and then changing one value sprang them all open again.
 *
 * Kept in memory for the session rather than written to the note or to plugin
 * data: collapsing is a way of looking at a note, not a change to it, and it
 * should no more dirty the file than scrolling does. Obsidian treats its own
 * fold state the same way.
 */
export class CollapseRegistry {
	private readonly state = new Map<string, boolean>();

	get(
		sourcePath: string,
		section: string,
		occurrence: number,
		fallback: boolean
	): boolean {
		return this.state.get(key(sourcePath, section, occurrence)) ?? fallback;
	}

	set(
		sourcePath: string,
		section: string,
		occurrence: number,
		collapsed: boolean
	): void {
		this.state.set(key(sourcePath, section, occurrence), collapsed);
	}

	clear(): void {
		this.state.clear();
	}
}

// A NUL cannot occur in a vault path or a section name, so no two different
// triples can collide on their joined key. The occurrence is part of it because
// a note may hold two `[AWS]` headers, and collapsing one of them is not a
// statement about the other.
function key(sourcePath: string, section: string, occurrence: number): string {
	return `${sourcePath}\u0000${section}\u0000${occurrence}`;
}
