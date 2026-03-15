import { Notice, setIcon } from "obsidian";

const FEEDBACK_DURATION_MS = 1500;

export function attachCopyHandler(
	buttonEl: HTMLElement,
	getValue: () => string
): void {
	let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

	buttonEl.addEventListener("click", (evt) => {
		evt.stopPropagation();
		navigator.clipboard.writeText(getValue()).then(() => {
			// Cancel any pending feedback reset from a previous click
			if (feedbackTimer) clearTimeout(feedbackTimer);
			// Success: swap icon to checkmark
			setIcon(buttonEl, "check");
			buttonEl.addClass("clipbook-copied");
			feedbackTimer = setTimeout(() => {
				setIcon(buttonEl, "copy");
				buttonEl.removeClass("clipbook-copied");
				feedbackTimer = null;
			}, FEEDBACK_DURATION_MS);
		}).catch((error) => {
			console.error("ClipBook: copy failed", error);
			new Notice("Failed to copy to clipboard");
		});
	});
}
