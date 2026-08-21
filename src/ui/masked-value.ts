import { maskValue } from "../utils/mask";
import { RevealRegistry } from "./reveal-registry";

export interface MaskedValueOptions {
	el: HTMLElement;
	getValue: () => string;
	/** Seconds before a revealed value re-masks itself; 0 disables the timer. */
	autoHideSeconds: number;
	reveals: RevealRegistry;
	win: Window;
}

/**
 * The reveal state machine for one masked value: painting, the auto-hide timer,
 * and the registry entry that lets a tab switch re-mask everything at once.
 *
 * These three always have to be torn down together, which is exactly the
 * bookkeeping that used to be duplicated at every call site.
 */
export class MaskedValue {
	private revealed = false;
	private timer: number | null = null;
	private unregister: (() => void) | null = null;

	constructor(private readonly options: MaskedValueOptions) {}

	get isRevealed(): boolean {
		return this.revealed;
	}

	paint(): void {
		const { el, getValue } = this.options;
		if (this.revealed) {
			el.setText(getValue());
			el.removeClass("clipbook-masked");
			el.addClass("clipbook-revealed");
			el.setAttribute("aria-label", "Click to edit value");
			el.setAttribute("aria-pressed", "true");
		} else {
			el.setText(maskValue(getValue()));
			el.removeClass("clipbook-revealed");
			el.addClass("clipbook-masked");
			el.setAttribute("aria-label", "Click to reveal value");
			el.setAttribute("aria-pressed", "false");
		}
	}

	reveal(): void {
		if (this.revealed) return;
		this.revealed = true;
		this.paint();

		this.unregister = this.options.reveals.register(() => this.hide());
		if (this.options.autoHideSeconds > 0) {
			this.timer = this.options.win.setTimeout(
				() => this.hide(),
				this.options.autoHideSeconds * 1000
			);
		}
	}

	hide(): void {
		this.clearPending();
		if (!this.revealed) return;
		this.revealed = false;
		this.paint();
	}

	/**
	 * Stop the timer and leave the registry without repainting — used when the
	 * value is about to be edited, where the element is no longer showing text
	 * we control.
	 */
	detach(): void {
		this.clearPending();
		this.revealed = false;
	}

	dispose(): void {
		this.clearPending();
	}

	private clearPending(): void {
		if (this.timer !== null) {
			this.options.win.clearTimeout(this.timer);
			this.timer = null;
		}
		this.unregister?.();
		this.unregister = null;
	}
}
