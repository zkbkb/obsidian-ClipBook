# ClipBook v0.1: Code Block Processor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Obsidian plugin that renders ` ```clipbook ` fenced code blocks as compact, structured UI with masked values and one-click copy.

**Architecture:** Register a markdown code block processor via `this.registerMarkdownCodeBlockProcessor('clipbook', ...)`. The processor parses INI-like text into sections/entries, then renders DOM with Obsidian's `createEl`/`createDiv` helpers. Values prefixed with `!` are masked; all values have copy buttons. Code is organized into `src/` modules per CLAUDE.md conventions.

**Tech Stack:** TypeScript (strict), Obsidian Plugin API, esbuild bundler, CSS with Obsidian variables for theme compatibility.

**Brainstorm:** [docs/brainstorms/2026-02-05-clipbook-core-feature-brainstorm.md](../brainstorms/2026-02-05-clipbook-core-feature-brainstorm.md)

---

## Design Decisions (from brainstorm)

| Decision | Choice |
|----------|--------|
| Data storage | Regular note files (not data.json) |
| Format | ` ```clipbook ` code blocks, INI-like syntax |
| Parsing | Split on first `=` only. `#`/`;` lines are comments. |
| Masking | Opt-in via `!` prefix on value. First 3 + last 4 chars shown. |
| Reveal | Click/tap masked value to toggle. Works on mobile. |
| Orphan keys | Render without section header |
| Copy failure | Obsidian Notice with error message |
| Copy success | Inline icon swap (copy → check) for ~1.5s |
| Sections | Flat only, not collapsible for v0.1 |
| CSS | Obsidian CSS variables only, no hardcoded colors |

## Input/Output Spec

**Input (in note):**

````
```clipbook
Token = !sk-proj-abc123def456
Region = us-east-1

[AWS]
Access Key = !AKIA1234EXAMPLE
Secret Key = !wJalrXUtnFEMI/K7MDENG
Region = us-east-1

# This is a comment
[GitHub]
PAT = !ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Username = octocat
```
````

**Rendered output (reading view):**

```
Token       sk-...f456   [📋]
Region      us-east-1    [📋]

── AWS ──────────────────────
Access Key  AKI...MPLE   [📋]
Secret Key  wJa...DENG   [📋]
Region      us-east-1    [📋]

── GitHub ───────────────────
PAT         ghp...xxxx   [📋]
Username    octocat      [📋]
```

- Masked values (`!` prefix): show first 3 + last 4 chars with `···`
- Non-masked values: show in full
- Click masked value → reveal full value; click again → re-mask
- Click copy icon → copy full value (without `!` prefix) → icon becomes ✓ for 1.5s
- Copy failure → Obsidian Notice: "Failed to copy to clipboard"

---

## Task 0: Project Setup — Rename and Reorganize

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `esbuild.config.mjs:18` (entry point path)
- Create: `src/main.ts` (new minimal entry point)
- Delete: `main.ts` (old sample template)

**Step 1: Update manifest.json**

Replace identity fields:

```json
{
  "id": "clipbook",
  "name": "ClipBook",
  "version": "0.1.0",
  "minAppVersion": "0.15.0",
  "description": "Store and quickly copy API keys, tokens, and text snippets from structured code blocks.",
  "author": "zkb",
  "isDesktopOnly": false
}
```

**Step 2: Update package.json**

Update `name` and `description`:

```json
{
  "name": "obsidian-clipbook",
  "version": "0.1.0",
  "description": "Obsidian plugin for managing copyable text snippets in structured code blocks"
}
```

**Step 3: Update esbuild entry point**

In `esbuild.config.mjs` line 18, change:

```js
entryPoints: ["src/main.ts"],
```

**Step 4: Create src/ directory structure**

```
src/
  main.ts
  types.ts
  parser.ts
  ui/
    renderer.ts
    copy.ts
  utils/
    mask.ts
```

**Step 5: Create minimal src/main.ts**

```typescript
import { Plugin } from "obsidian";

export default class ClipBookPlugin extends Plugin {
	async onload() {
		// Code block processor will be registered here
	}
}
```

**Step 6: Delete old main.ts at root**

Remove the sample template file.

**Step 7: Verify build**

Run: `npm run build`
Expected: Successful build with no errors. `main.js` generated at root.

**Step 8: Commit**

```bash
git add src/main.ts manifest.json package.json esbuild.config.mjs styles.css
git rm main.ts
git commit -m "feat: scaffold ClipBook plugin with src/ structure"
```

---

## Task 1: Types

**Files:**
- Create: `src/types.ts`

**Step 1: Define data types**

```typescript
export interface ClipBookEntry {
	key: string;
	value: string;
	masked: boolean;
}

export interface ClipBookSection {
	name: string | null; // null = orphan entries before first [Section]
	entries: ClipBookEntry[];
}

export type ClipBookData = ClipBookSection[];
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS (types are used in later tasks, no errors since nothing imports them yet)

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ClipBook data types"
```

---

## Task 2: Parser

**Files:**
- Create: `src/parser.ts`

This is the core logic — parsing raw code block text into structured data.

**Step 1: Implement parser**

```typescript
import { ClipBookData, ClipBookEntry, ClipBookSection } from "./types";

export function parseClipBook(source: string): ClipBookData {
	const lines = source.split("\n");
	const sections: ClipBookData = [];
	let currentSection: ClipBookSection = { name: null, entries: [] };

	for (const rawLine of lines) {
		const line = rawLine.trim();

		// Skip empty lines and comments
		if (line === "" || line.startsWith("#") || line.startsWith(";")) {
			continue;
		}

		// Section header: [Name]
		const sectionMatch = line.match(/^\[(.+)\]$/);
		if (sectionMatch) {
			// Push previous section if it has entries OR if it has a name
			// (named empty sections still get pushed)
			if (currentSection.entries.length > 0 || currentSection.name !== null) {
				sections.push(currentSection);
			}
			currentSection = { name: sectionMatch[1].trim(), entries: [] };
			continue;
		}

		// Key = Value
		const eqIndex = line.indexOf("=");
		if (eqIndex !== -1) {
			const key = line.substring(0, eqIndex).trim();
			let value = line.substring(eqIndex + 1).trim();
			let masked = false;

			if (value.startsWith("!")) {
				masked = true;
				value = value.substring(1);
			}

			if (key !== "") {
				currentSection.entries.push({ key, value, masked });
			}
		}
		// Lines without = are silently skipped (per spec: skip unparseable lines)
	}

	// Push the final section
	if (currentSection.entries.length > 0 || currentSection.name !== null) {
		sections.push(currentSection);
	}

	return sections;
}
```

**Parsing rules:**
- Split on first `=` only — values containing `=` are preserved
- `!` prefix on value → `masked: true`, prefix stripped from stored value
- `#` or `;` at line start → comment, skipped
- Empty lines → skipped
- `[Text]` → section header
- Lines without `=` → silently skipped
- Orphan entries (before first `[Section]`) → section with `name: null`

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/parser.ts
git commit -m "feat: implement clipbook INI-like parser"
```

---

## Task 3: Masking Utility

**Files:**
- Create: `src/utils/mask.ts`

**Step 1: Implement masking function**

```typescript
/**
 * Mask a value for display. Shows first 3 + last 4 characters with ··· in between.
 * Short values get progressively more hidden.
 *
 * Examples:
 *   "sk-proj-abc123def456" → "sk-···f456"
 *   "us-east-1" (9 chars)  → "us···"     (≤10 chars: first 2 + ···)
 *   "ab" (2 chars)          → "···"       (≤3 chars: fully hidden)
 */
export function maskValue(value: string): string {
	if (value.length <= 3) {
		return "···";
	}
	if (value.length <= 10) {
		return value.substring(0, 2) + "···";
	}
	return value.substring(0, 3) + "···" + value.substring(value.length - 4);
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/utils/mask.ts
git commit -m "feat: add value masking utility"
```

---

## Task 4: Copy Utility

**Files:**
- Create: `src/ui/copy.ts`

**Step 1: Implement copy handler**

```typescript
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
```

**Design notes:**
- `getValue` is a callback so the button always copies the current value (not stale closure)
- `evt.stopPropagation()` prevents the click from bubbling to the row's reveal toggle
- Icon swaps use Obsidian's `setIcon` which renders Lucide icons
- Error path uses `Notice` (toast); success path uses inline icon swap (non-disruptive)

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/ui/copy.ts
git commit -m "feat: add clipboard copy handler with feedback"
```

---

## Task 5: Renderer

**Files:**
- Create: `src/ui/renderer.ts`

This is the largest task — building the DOM from parsed data.

**Step 1: Implement renderer**

```typescript
import { setIcon } from "obsidian";
import { ClipBookData, ClipBookSection } from "../types";
import { maskValue } from "../utils/mask";
import { attachCopyHandler } from "./copy";

export function renderClipBook(data: ClipBookData, containerEl: HTMLElement): void {
	containerEl.addClass("clipbook-container");

	if (data.length === 0) {
		containerEl.createDiv({ cls: "clipbook-empty", text: "Empty clipbook block" });
		return;
	}

	for (const section of data) {
		renderSection(section, containerEl);
	}
}

function renderSection(section: ClipBookSection, containerEl: HTMLElement): void {
	const sectionEl = containerEl.createDiv({ cls: "clipbook-section" });

	// Section header (skip for orphan entries with name: null)
	if (section.name !== null) {
		sectionEl.createDiv({ cls: "clipbook-section-header", text: section.name });
	}

	for (const entry of section.entries) {
		renderEntry(entry.key, entry.value, entry.masked, sectionEl);
	}
}

function renderEntry(
	key: string,
	value: string,
	masked: boolean,
	parentEl: HTMLElement
): void {
	const rowEl = parentEl.createDiv({ cls: "clipbook-row" });

	// Key label
	rowEl.createSpan({ cls: "clipbook-key", text: key });

	// Value display
	const valueEl = rowEl.createSpan({ cls: "clipbook-value" });
	let revealed = false;

	if (masked) {
		valueEl.setText(maskValue(value));
		valueEl.addClass("clipbook-masked");
		valueEl.setAttribute("aria-label", "Click to reveal value");
		valueEl.setAttribute("role", "button");
		valueEl.tabIndex = 0;

		const toggleReveal = () => {
			revealed = !revealed;
			valueEl.setText(revealed ? value : maskValue(value));
			valueEl.toggleClass("clipbook-revealed", revealed);
			valueEl.setAttribute(
				"aria-label",
				revealed ? "Click to hide value" : "Click to reveal value"
			);
		};

		valueEl.addEventListener("click", toggleReveal);
		valueEl.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter" || evt.key === " ") {
				evt.preventDefault();
				toggleReveal();
			}
		});
	} else {
		valueEl.setText(value);
	}

	// Copy button
	const copyBtn = rowEl.createSpan({
		cls: "clipbook-copy-btn",
		attr: { "aria-label": `Copy ${key}`, role: "button", tabindex: "0" },
	});
	setIcon(copyBtn, "copy");

	attachCopyHandler(copyBtn, () => value);

	// Also allow keyboard activation of copy
	copyBtn.addEventListener("keydown", (evt: KeyboardEvent) => {
		if (evt.key === "Enter" || evt.key === " ") {
			evt.preventDefault();
			copyBtn.click();
		}
	});
}
```

**Key behaviors:**
- Orphan entries (section.name === null) render rows without a section header
- Masked values are clickable to toggle reveal; non-masked values are static text
- Copy button always copies the full, unmasked value
- `tabindex` + `keydown` handlers enable keyboard navigation
- `aria-label` attributes provide screen reader context

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/ui/renderer.ts
git commit -m "feat: implement clipbook block renderer with masking and copy"
```

---

## Task 6: Wire Up Main Plugin

**Files:**
- Modify: `src/main.ts`

**Step 1: Register the code block processor**

Replace `src/main.ts` with:

```typescript
import { Plugin } from "obsidian";
import { parseClipBook } from "./parser";
import { renderClipBook } from "./ui/renderer";

export default class ClipBookPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("clipbook", (source, el) => {
			const data = parseClipBook(source);
			renderClipBook(data, el);
		});
	}
}
```

**Design notes:**
- `main.ts` stays minimal — lifecycle only, delegates to parser + renderer (per CLAUDE.md)
- `registerMarkdownCodeBlockProcessor` auto-cleans up on plugin unload (uses `this.register*`)
- No settings, no commands, no modals needed for v0.1

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS, `main.js` generated at root.

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: register clipbook code block processor"
```

---

## Task 7: Styles

**Files:**
- Modify: `styles.css`

**Step 1: Write CSS using Obsidian variables**

```css
/* ClipBook – Code Block Renderer Styles */

.clipbook-container {
	padding: 8px 0;
}

.clipbook-empty {
	color: var(--text-muted);
	font-style: italic;
	padding: 8px 12px;
}

/* Section header */
.clipbook-section {
	margin-bottom: 4px;
}

.clipbook-section-header {
	font-size: var(--font-smaller);
	font-weight: 600;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	padding: 6px 12px 2px;
	border-bottom: 1px solid var(--background-modifier-border);
	margin-bottom: 2px;
}

/* Entry row */
.clipbook-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 3px 12px;
	border-radius: var(--radius-s);
}

.clipbook-row:hover {
	background-color: var(--background-modifier-hover);
}

/* Key label */
.clipbook-key {
	flex: 0 0 auto;
	min-width: 80px;
	max-width: 200px;
	font-weight: 500;
	color: var(--text-normal);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Value */
.clipbook-value {
	flex: 1 1 auto;
	font-family: var(--font-monospace);
	font-size: var(--font-smaller);
	color: var(--text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	user-select: none;
}

.clipbook-masked {
	cursor: pointer;
}

.clipbook-masked:hover {
	color: var(--text-normal);
}

.clipbook-revealed {
	color: var(--text-normal);
	user-select: text;
}

/* Copy button */
.clipbook-copy-btn {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: var(--radius-s);
	cursor: pointer;
	color: var(--text-muted);
}

.clipbook-copy-btn:hover {
	color: var(--text-normal);
	background-color: var(--background-modifier-hover);
}

.clipbook-copy-btn svg {
	width: 14px;
	height: 14px;
}

.clipbook-copied {
	color: var(--text-success, var(--interactive-success));
}
```

**CSS notes:**
- All colors from Obsidian CSS variables — works in light, dark, and community themes
- `var(--text-success, var(--interactive-success))` fallback for older Obsidian versions
- Key column: `min-width: 80px`, `max-width: 200px` with ellipsis for long keys
- Value: monospace font, ellipsis overflow for long values
- Copy button: 28×28px (meets 44px touch target with padding on mobile rows)
- `.clipbook-masked` gets `cursor: pointer` to indicate clickability

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Manual test**

1. Copy `main.js`, `manifest.json`, `styles.css` to `<Vault>/.obsidian/plugins/clipbook/`
2. Reload Obsidian, enable ClipBook in **Settings → Community plugins**
3. Create a note with the test content from the Input/Output Spec above
4. Switch to reading view — verify:
   - Sections render with headers
   - Masked values show `sk-···f456` pattern
   - Non-masked values show in full
   - Click masked value → reveals full value
   - Click again → re-masks
   - Click copy button → icon becomes checkmark for ~1.5s
   - Paste into another app → correct full value
   - Switch to source mode → raw code block visible

**Step 4: Commit**

```bash
git add styles.css
git commit -m "feat: add ClipBook styles with theme-compatible CSS variables"
```

---

## Task 8: Update Metadata and Clean Up

**Files:**
- Modify: `versions.json`
- Modify: `README.md`

**Step 1: Update versions.json**

```json
{
  "0.1.0": "0.15.0"
}
```

**Step 2: Update README.md**

Replace the sample plugin README with ClipBook documentation. Include:
- What ClipBook does (1-2 sentences)
- Syntax reference (the clipbook code block format)
- Masking with `!` prefix
- Section headers with `[Name]`
- Comments with `#` or `;`
- Installation instructions
- Known limitations (visual masking only, no encryption, no multiline values)

**Step 3: Verify final build**

Run: `npm run build`
Expected: PASS, clean build with no warnings.

**Step 4: Final manual test**

Full test pass through all features one more time in Obsidian.

**Step 5: Commit**

```bash
git add versions.json README.md
git commit -m "docs: update metadata and README for ClipBook v0.1.0"
```

---

## Out of Scope (v0.2+)

These are explicitly deferred from v0.1:

- **Inline key-value rendering** (heading + `key: value` lines without code blocks)
- **Settings tab** (configurable mask length, feedback duration, etc.)
- **Editing snippets through the rendered UI**
- **Search/filter within rendered blocks**
- **Import/export**
- **Encryption of values at rest**
- **Collapsible sections**
- **"Copy all" or "copy section" buttons**
- **Max height / scroll for very large blocks**

## References

- Obsidian Plugin API: `registerMarkdownCodeBlockProcessor` in `obsidian.d.ts:4656`
- Obsidian DOM helpers: `createEl`, `createDiv`, `createSpan` in `obsidian.d.ts:187-189`
- Obsidian icons: `setIcon(el, iconId)` in `obsidian.d.ts:5346`
- CLAUDE.md: Architecture and convention guidance
- AGENTS.md: File organization, security, UX, performance rules
