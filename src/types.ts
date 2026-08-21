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
