import { Notice, setIcon } from "obsidian";

const DEFAULT_FEEDBACK_MS = 1500;

export function attachCopyHandler(
	buttonEl: HTMLElement,
	getValue: () => string,
	feedbackDuration = DEFAULT_FEEDBACK_MS
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
			}, feedbackDuration);
		} catch {
			new Notice("Failed to copy to clipboard");
		}
	});
}
