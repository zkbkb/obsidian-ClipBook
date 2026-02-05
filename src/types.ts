export interface ClipBookEntry {
	key: string;
	value: string;
	masked: boolean;
}

export interface ClipBookSection {
	name: string | null; // null = orphan entries before first [Section]
	entries: ClipBookEntry[];
}

export type ClipBookData = ClipBookSection[];
