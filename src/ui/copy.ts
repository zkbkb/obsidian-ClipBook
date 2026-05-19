import { Notice, setIcon } from "obsidian";

const FEEDBACK_DURATION_MS = 1500;

export function attachCopyHandler(
	buttonEl: HTMLElement,
	getValue: () => string
): void {
	let feedbackTimer: number | null = null;
	const ownerWindow = buttonEl.ownerDocument.defaultView ?? activeWindow;

	buttonEl.addEventListener("click", (evt) => {
		evt.stopPropagation();
		void (async () => {
			try {
				await navigator.clipboard.writeText(getValue());
				// Cancel any pending feedback reset from a previous click
				if (feedbackTimer) ownerWindow.clearTimeout(feedbackTimer);
				// Success: swap icon to checkmark
				setIcon(buttonEl, "check");
				buttonEl.addClass("clipbook-copied");
				feedbackTimer = ownerWindow.setTimeout(() => {
					setIcon(buttonEl, "copy");
					buttonEl.removeClass("clipbook-copied");
					feedbackTimer = null;
				}, FEEDBACK_DURATION_MS);
			} catch (error: unknown) {
				console.error("ClipBook: copy failed", error);
				new Notice("Failed to copy to clipboard");
			}
		})();
	});
}
