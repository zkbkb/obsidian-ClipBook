import { App, Component, MarkdownPostProcessorContext } from "obsidian";
import { ClipBookSettings } from "../settings";
import { RevealRegistry } from "./reveal-registry";

/**
 * Everything a rendered block needs, passed as one value instead of threading
 * five positional arguments through every render function.
 *
 * The `app` / `ctx` / `containerEl` trio also satisfies `SourceTarget`, so a
 * render context can be handed straight to the source writer.
 */
export interface RenderContext {
	app: App;
	ctx: MarkdownPostProcessorContext;
	/** The block's root element — the anchor `ctx.getSectionInfo` resolves against. */
	containerEl: HTMLElement;
	settings: ClipBookSettings;
	reveals: RevealRegistry;
	/** Block lifetime. Register timers and listeners here to have them cleaned up. */
	lifecycle: Component;
	/** The window this block is rendered in, which is not the main one for popouts. */
	win: Window;
}
