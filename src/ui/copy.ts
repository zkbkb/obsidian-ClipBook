import { Notice, setIcon } from "obsidian";

const FEEDBACK_DURATION_MS = 1500;

export function attachCopyHandler(
	buttonEl: HTMLElement,
	getValue: () => string
): void {
	buttonEl.addEventListener("click", async (evt) => {
		evt.stopPropagation();
		try {
			await navigator.clipboard.writeText(getValue());
			// Success: swap icon to checkmark
			setIcon(buttonEl, "check");
			buttonEl.addClass("clipbook-copied");
			setTimeout(() => {
				setIcon(buttonEl, "copy");
				buttonEl.removeClass("clipbook-copied");
			}, FEEDBACK_DURATION_MS);
		} catch {
			new Notice("Failed to copy to clipboard");
		}
	});
}
