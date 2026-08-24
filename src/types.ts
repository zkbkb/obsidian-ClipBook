export interface ClipBookEntry {
	key: string | null; // null = keyless entry
	value: string;
	masked: boolean;
	sourceLine: number; // 0-based line index within the clipbook block
	raw: string; // verbatim source line, used to detect stale writes
}

export interface ClipBookSection {
	name: string | null; // null = orphan entries before first [Section]
	entries: ClipBookEntry[];
}

export type ClipBookData = ClipBookSection[];

/**
 * Which group an insert belongs to.
 *
 * A block may repeat a header — two `[AWS]` groups are two groups, and the
 * parser keeps them apart — so a name alone does not identify one. The add
 * button beside the second `[AWS]` means the second `[AWS]`; a name typed into
 * the form means the first, which is all a typed name can mean.
 */
export interface SectionRef {
	name: string | null; // null = the orphan group before the first [Section]
	occurrence: number; // 0-based, among groups sharing this name
}
