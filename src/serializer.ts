/**
 * Serialization — the dual of `parser.ts`.
 *
 * Every entry written back to the markdown source goes through here, so that
 * `parseClipBook(serialize(entry))` round-trips to the same entry. The tricky
 * part is values whose first character collides with the syntax: a plain value
 * of `!secret` must not come back as a *masked* value of `secret`.
 */

/** Characters that need escaping when they appear as the first character of a value. */
const ESCAPABLE_LEADING = new Set(["!", "\\"]);

/**
 * Escape a value for writing. Only the *first* character can be ambiguous, so
 * only a leading `!` or `\` is escaped with a backslash. Backslashes anywhere
 * else are left alone — Windows paths and secrets full of slashes must survive
 * untouched, and notes written before escaping existed must keep parsing the
 * same way.
 */
export function escapeValue(value: string): string {
	const first = value.charAt(0);
	return ESCAPABLE_LEADING.has(first) ? "\\" + value : value;
}

/** Inverse of {@link escapeValue}. Strips one leading backslash, and only when it escapes something. */
export function unescapeValue(value: string): string {
	if (value.charAt(0) === "\\" && ESCAPABLE_LEADING.has(value.charAt(1))) {
		return value.substring(1);
	}
	return value;
}

/**
 * Reasons a key cannot be represented in the block syntax. Values are always
 * representable (see {@link escapeValue}); keys are not, so the UI validates them.
 */
export type KeyProblem = "contains-equals" | "looks-like-comment";

export function validateKey(key: string): KeyProblem | null {
	if (key.includes("=")) return "contains-equals";
	if (key.startsWith("#") || key.startsWith(";")) return "looks-like-comment";
	return null;
}

export function describeKeyProblem(problem: KeyProblem): string {
	switch (problem) {
		case "contains-equals":
			return "Keys cannot contain '='.";
		case "looks-like-comment":
			return "Keys cannot start with '#' or ';'.";
	}
}

/** A `]` would end the header early, so section names cannot contain one. */
export function validateSectionName(name: string): "contains-bracket" | null {
	return name.includes("]") ? "contains-bracket" : null;
}

export function describeSectionProblem(): string {
	return "Section names cannot contain ']'.";
}

/** Render one entry as a source line. */
export function buildEntryLine(
	key: string | null,
	value: string,
	masked: boolean
): string {
	const body = (masked ? "!" : "") + escapeValue(value);
	if (key !== null && key !== "") {
		return `${key} = ${body}`;
	}
	// Keyless entries always use the `= value` form. The bare-line form the
	// parser also accepts (`!value`) is ambiguous for values containing `=`, or
	// starting with `[` or `#`, so it is never emitted.
	return `= ${body}`;
}

/** Render a section header as a source line. */
export function buildSectionLine(name: string): string {
	return `[${name}]`;
}
