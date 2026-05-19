import { Notice, setIcon } from "obsidian";

const FEEDBACK_DURATION_MS = 1500;

export function attachCopyHandler(
	buttonEl: HTMLElement,
	getValue: () => string
): void {
	let feedbackTimer: ReturnType<typeof activeWindow.setTimeout> | null = null;

	buttonEl.addEventListener("click", (evt) => {
		evt.stopPropagation();
		navigator.clipboard
			.writeText(getValue())
			.then(() => {
				if (feedbackTimer) activeWindow.clearTimeout(feedbackTimer);
				setIcon(buttonEl, "check");
				buttonEl.addClass("clipbook-copied");
				feedbackTimer = activeWindow.setTimeout(() => {
					setIcon(buttonEl, "copy");
					buttonEl.removeClass("clipbook-copied");
					feedbackTimer = null;
				}, FEEDBACK_DURATION_MS);
			})
			.catch((error: unknown) => {
				console.error("ClipBook: copy failed", error);
				new Notice("Failed to copy to clipboard");
			});
	});
}
