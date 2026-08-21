import { Notice, setIcon } from "obsidian";
import { RenderContext } from "./context";

const FEEDBACK_DURATION_MS = 1500;

/**
 * A copy button. This is a real `<button>`, so Tab focus, Enter/Space
 * activation, and the button role come from the platform rather than from
 * hand-rolled `tabindex` and keydown handlers.
 */
export function renderCopyButton(
	rc: RenderContext,
	parentEl: HTMLElement,
	ariaLabel: string,
	getValue: () => string
): HTMLButtonElement {
	const buttonEl = parentEl.createEl("button", {
		cls: "clipbook-icon-btn clipbook-copy-btn",
		attr: { type: "button", "aria-label": ariaLabel },
	});
	setIcon(buttonEl, "copy");

	let feedbackTimer: number | null = null;
	const clearFeedbackTimer = () => {
		if (feedbackTimer !== null) {
			rc.win.clearTimeout(feedbackTimer);
			feedbackTimer = null;
		}
	};
	rc.lifecycle.register(clearFeedbackTimer);

	const copyValue = async (): Promise<void> => {
		try {
			await navigator.clipboard.writeText(getValue());
		} catch (error: unknown) {
			console.error("ClipBook: copy failed", error);
			new Notice("Failed to copy to clipboard.");
			return;
		}
		// Cancel any pending reset from a previous click.
		clearFeedbackTimer();
		setIcon(buttonEl, "check");
		buttonEl.addClass("clipbook-copied");
		feedbackTimer = rc.win.setTimeout(() => {
			feedbackTimer = null;
			setIcon(buttonEl, "copy");
			buttonEl.removeClass("clipbook-copied");
		}, FEEDBACK_DURATION_MS);
	};

	buttonEl.addEventListener("click", (evt) => {
		evt.stopPropagation();
		void copyValue();
	});

	return buttonEl;
}
