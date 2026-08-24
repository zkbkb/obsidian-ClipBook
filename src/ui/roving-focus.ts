/**
 * Roving focus across one row's controls.
 *
 * Each row holds up to four focusable things — the key, the value, copy and
 * delete. Left as separate tab stops that is four per entry, so a block of
 * fifteen entries costs sixty presses to tab past and offers no way to jump.
 *
 * The row becomes a single tab stop instead: exactly one of its controls is
 * reachable by Tab, and the arrow keys move between them. That is the standard
 * `toolbar` arrangement, which is also why the row carries the role — assistive
 * technology announces a toolbar as something to arrow around in, so the
 * navigation is discoverable rather than a secret.
 */
export function makeRowRoving(rowEl: HTMLElement, ariaLabel: string): void {
	rowEl.setAttribute("role", "toolbar");
	rowEl.setAttribute("aria-label", ariaLabel);

	const controls = (): HTMLElement[] =>
		Array.from(
			rowEl.querySelectorAll<HTMLElement>("[data-clipbook-control]")
		);

	const focusAt = (index: number) => {
		const items = controls();
		if (items.length === 0) return;
		const wrapped = (index + items.length) % items.length;
		for (const [i, item] of items.entries()) {
			item.tabIndex = i === wrapped ? 0 : -1;
		}
		items[wrapped]?.focus();
	};

	// Whatever was last focused stays the way back in, so returning to a row by
	// Tab lands where the reader left it rather than at the start.
	rowEl.addEventListener("focusin", (evt) => {
		const items = controls();
		const index = items.indexOf(evt.target as HTMLElement);
		if (index === -1) return;
		for (const [i, item] of items.entries()) {
			item.tabIndex = i === index ? 0 : -1;
		}
	});

	rowEl.addEventListener("keydown", (evt: KeyboardEvent) => {
		// A control that is being edited owns its arrow keys — they move the
		// caret, not the focus.
		if (evt.target instanceof HTMLInputElement) return;

		const items = controls();
		const current = items.indexOf(evt.target as HTMLElement);
		if (current === -1) return;

		switch (evt.key) {
			case "ArrowRight":
				focusAt(current + 1);
				break;
			case "ArrowLeft":
				focusAt(current - 1);
				break;
			case "Home":
				focusAt(0);
				break;
			case "End":
				focusAt(items.length - 1);
				break;
			default:
				return;
		}
		evt.preventDefault();
	});
}

/**
 * Mark an element as one of a row's controls, and set its initial reachability.
 * The first control of each row keeps the tab stop; the rest are reached with
 * the arrow keys.
 */
export function registerRowControl(el: HTMLElement, isFirst: boolean): void {
	el.setAttribute("data-clipbook-control", "");
	el.tabIndex = isFirst ? 0 : -1;
}
