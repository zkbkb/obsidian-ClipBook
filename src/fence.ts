/**
 * Locating clipbook blocks inside a file's lines.
 *
 * Only blocks whose fence starts its line are recognised. One nested in a
 * callout or a list item carries a `>` or indent prefix on every line, which
 * block-relative indices cannot model — better to not see it at all than to
 * parse it wrongly or write into it.
 */

export const OPEN_FENCE_RE = /^(?:`{3,}|~{3,})\s*clipbook(?:\s.*)?$/;
export const CLOSE_FENCE_RE = /^(?:`{3,}|~{3,})\s*$/;

export interface BlockBounds {
	/** First line of the block body. */
	bodyStart: number;
	/** Line of the closing fence — one past the last body line. */
	bodyEnd: number;
}

export function findClipBookBlocks(lines: readonly string[]): BlockBounds[] {
	const blocks: BlockBounds[] = [];

	for (let i = 0; i < lines.length; i++) {
		if (!OPEN_FENCE_RE.test(lines[i])) continue;

		const close = findClosingFence(lines, i + 1);
		// An unterminated block has no body we can trust; nothing after it can
		// be a block either, since the rest of the file is inside it.
		if (close === -1) break;

		blocks.push({ bodyStart: i + 1, bodyEnd: close });
		i = close;
	}

	return blocks;
}

function findClosingFence(lines: readonly string[], from: number): number {
	for (let i = from; i < lines.length; i++) {
		if (CLOSE_FENCE_RE.test(lines[i])) return i;
	}
	return -1;
}
