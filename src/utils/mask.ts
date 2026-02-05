/**
 * Mask a value for display. Shows first 3 + last 4 characters with a mask string in between.
 * Short values get progressively more hidden.
 *
 * Examples (with default maskChar "···"):
 *   "sk-proj-abc123def456" → "sk-···f456"
 *   "us-east-1" (9 chars)  → "us···"     (≤10 chars: first 2 + mask)
 *   "ab" (2 chars)          → "···"       (≤3 chars: fully hidden)
 */
export function maskValue(value: string, maskChar = "···"): string {
	if (value.length <= 3) {
		return maskChar;
	}
	if (value.length <= 10) {
		return value.substring(0, 2) + maskChar;
	}
	return value.substring(0, 3) + maskChar + value.substring(value.length - 4);
}
