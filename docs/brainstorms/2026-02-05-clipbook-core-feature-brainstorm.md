# ClipBook Core Feature Brainstorm

**Date:** 2026-02-05
**Status:** Implemented (v0.1.0)

## What We're Building

ClipBook is an Obsidian plugin for managing frequently-copied text — API keys, tokens, credentials, boilerplate snippets — stored in regular Obsidian notes but rendered with a compact, structured UI with one-click copy.

**Core problem:** Users who store many keys and short text values in Obsidian find that:
- Code blocks take too much vertical space (one full line per key)
- Managing many keys across services becomes unwieldy
- Full values don't need to be visible most of the time
- Current markdown offers no structured way to organize and quickly copy

**Solution:** A custom code block processor (`clipbook`) that renders key-value pairs compactly with opt-in masked values and copy buttons.

## Why This Approach

**Hybrid strategy (code block first, inline later):**

- **Phase 1 (v0.1): `clipbook` code block processor** — A fenced code block with INI-like syntax. The plugin renders it as a compact, grouped list with masked values and copy buttons.
- **Phase 2 (future): Inline key-value rendering** — Heading + `key: value` lines rendered with copy buttons for a more natural markdown experience.

Starting with the code block approach because:
1. Clear scope boundary — the plugin only processes `clipbook` blocks, no ambiguity
2. Self-contained — easy to reason about what is and isn't a snippet
3. Simpler implementation — code block processors are a well-documented Obsidian API
4. Graceful degradation — without the plugin, it's still a readable code block

## Key Decisions

1. **Data lives in regular note files** — not plugin data.json. Searchable, syncable, editable without the plugin.
2. **Code block format first** — ` ```clipbook ` blocks with `[Section]` headers and `key = value` pairs.
3. **Masking is opt-in via `!` prefix** — `Key = !secret_value` masks the value; `Key = plain_value` shows in full. Not all values are secrets (e.g., region names), so masking by default would add unnecessary friction.
4. **Masking algorithm** — first 3 + `···` + last 4 chars for long values (>10); first 2 + `···` for medium (4-10); `···` only for short (≤3).
5. **Click/tap to toggle reveal** — works on both desktop and mobile (no hover-only interaction).
6. **One-click copy to system clipboard** — primary interaction. Content is for pasting into external apps/sites.
7. **Copy feedback** — inline icon swap (copy → checkmark for 1.5s) for success; Obsidian Notice for failure.
8. **Parsing** — split on first `=` only (preserves values containing `=`). `#`/`;` lines are comments.
9. **Orphan entries** — key-value pairs before the first `[Section]` render without a group header.
10. **Offline/local only** — no network calls. All data stays in the vault.
11. **Mobile compatible** — `isDesktopOnly: false`.

## Feature Spec (v0.1)

### Input format

````markdown
```clipbook
API Token = !sk-proj-abc123def456
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

### Rendered output (in reading view)

Compact grouped display:
- Section headers (AWS, GitHub) as visual group labels
- Each key-value as a single compact row: `Label  sk-···f456  [copy icon]`
- Masked values (`!` prefix) hidden by default, click to reveal
- Non-masked values shown in full
- Copy button copies the full, unmasked value to clipboard
- Visual feedback: icon swap to checkmark for 1.5s on success

### Behaviors

- Works in **reading view** (Obsidian's preview/live-preview mode)
- In **source/edit mode**, shows the raw code block (standard Obsidian behavior)
- Copy uses `navigator.clipboard.writeText()` (works on desktop and mobile)
- No settings required for v0.1 (sensible defaults)

### Out of scope for v0.1

- Inline key-value rendering (Phase 2)
- Editing snippets through the rendered UI
- Search/filter within the rendered view
- Import/export
- Encryption of values at rest
- Settings tab
- Collapsible sections
- "Copy all" or "copy section" buttons

## Resolved Questions

1. **Masking strategy:** Opt-in via `!` prefix. First 3 + last 4 chars for long values, progressively more hidden for shorter values.
2. **Multiple notes:** Works on any note containing a `clipbook` block — no designated note needed.
3. **Copy notification:** Inline icon swap for success, Obsidian Notice for failure.
4. **Section nesting:** Flat only for v0.1.

## Next Steps

See implementation plan: `docs/plans/2026-02-05-feat-clipbook-code-block-processor-plan.md`
