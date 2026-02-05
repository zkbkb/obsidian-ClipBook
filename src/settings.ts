export interface ClipBookSettings {
	/** Mask all values by default, not just !-prefixed ones */
	defaultMasked: boolean;
	/** Auto-hide revealed values after a delay */
	autoHideEnabled: boolean;
	/** Delay in ms before auto-hiding revealed values */
	autoHideDelay: number;
	/** Make section headers collapsible */
	collapsibleSections: boolean;
}

export const DEFAULT_SETTINGS: ClipBookSettings = {
	defaultMasked: false,
	autoHideEnabled: false,
	autoHideDelay: 5000,
	collapsibleSections: false,
};
