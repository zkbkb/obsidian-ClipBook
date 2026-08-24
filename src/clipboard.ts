/**
 * Copying, and putting the secret back down afterwards.
 *
 * The clipboard is shared with every other application on the machine, so a
 * copied key sits there until something else replaces it. Clearing it after a
 * delay is what a password manager does; the delay is only ever applied to
 * values the note marked as secrets.
 */
export class ClipboardGuard {
	private timer: number | null = null;
	/** What we last put on the clipboard, so we only clear our own value. */
	private pending: string | null = null;

	constructor(private readonly win: Window) {}

	/**
	 * Copy `value`, scheduling a clear when `clearAfterSeconds` is above zero.
	 * Rejects if the clipboard write fails, so callers can report it.
	 */
	async copy(value: string, clearAfterSeconds: number): Promise<void> {
		await navigator.clipboard.writeText(value);

		this.cancel();
		if (clearAfterSeconds <= 0) return;

		this.pending = value;
		this.timer = this.win.setTimeout(() => {
			this.timer = null;
			void this.clearIfUnchanged();
		}, clearAfterSeconds * 1000);
	}

	cancel(): void {
		if (this.timer !== null) {
			this.win.clearTimeout(this.timer);
			this.timer = null;
		}
		this.pending = null;
	}

	/**
	 * Only clear what we put there. If the user has copied something else since,
	 * or the platform will not let us read the clipboard back — mobile webviews
	 * generally refuse outside a user gesture — leave it alone. Wiping someone
	 * else's clipboard content would be worse than leaving ours on it.
	 */
	private async clearIfUnchanged(): Promise<void> {
		const expected = this.pending;
		this.pending = null;
		if (expected === null) return;

		try {
			const current = await navigator.clipboard.readText();
			if (current !== expected) return;
			await navigator.clipboard.writeText("");
		} catch (error) {
			console.debug("ClipBook: could not clear the clipboard", error);
		}
	}
}
