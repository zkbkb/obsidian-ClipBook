/**
 * Tracks which values are currently revealed so they can all be re-masked at
 * once (on tab switch, window blur, or plugin unload).
 *
 * Owned by the plugin rather than living in module scope: every registration
 * hands back an unregister function, and each rendered block drops its own
 * registrations when it unloads. Otherwise a revealed value would keep both a
 * detached DOM node and the plaintext secret in its closure alive for the rest
 * of the session.
 */
export class RevealRegistry {
	private readonly hides = new Set<() => void>();

	register(hide: () => void): () => void {
		this.hides.add(hide);
		return () => {
			this.hides.delete(hide);
		};
	}

	hideAll(): void {
		// Copy first: hiding unregisters, which mutates the set.
		for (const hide of Array.from(this.hides)) hide();
	}

	clear(): void {
		this.hides.clear();
	}
}
