/**
 * Mask a value for display. Shows first 3 + last 4 characters with a mask string in between.
 * Short values get progressively more hidden.
 *
 * Examples (with default mask "···"):
 *   "EXAMPLE-0000000000000000" → "EXA···0000"
 *   "us-east-1" (9 chars)  → "us···"     (≤10 chars: first 2 + mask)
 *   "ab" (2 chars)          → "···"       (≤3 chars: fully hidden)
 *   ""                      → ""          (nothing to hide)
 */
export function maskValue(value: string, mask = "···"): string {
	if (value.length === 0) {
		return "";
	}
	if (value.length <= 3) {
		return mask;
	}
	if (value.length <= 10) {
		return value.substring(0, 2) + mask;
	}
	return value.substring(0, 3) + mask + value.substring(value.length - 4);
}
