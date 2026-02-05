# ClipBook Core Feature Brainstorm

**Date:** 2026-02-05
**Status:** Complete

## What We're Building

ClipBook is an Obsidian plugin for managing frequently-copied text — API keys, tokens, credentials, boilerplate snippets — stored in regular Obsidian notes but rendered with a compact, structured UI with one-click copy.

**Core problem:** Users who store many keys and short text values in Obsidian find that:
- Code blocks take too much vertical space (one full line per key)
- Managing many keys across services becomes unwieldy
- Full values don't need to be visible most of the time
- Current markdown offers no structured way to organize and quickly copy

**Solution:** A custom code block processor (`clipbook`) that renders key-value pairs compactly with masked values and copy buttons.

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
3. **Values are masked by default** — show first/last few characters (e.g., `sk-...3xFq`). Hover or click to reveal.
4. **One-click copy to system clipboard** — primary interaction. Content is for pasting into external apps/sites.
5. **Offline/local only** — no network calls. All data stays in the vault.
6. **Mobile compatible** — `isDesktopOnly: false`.

## Feature Spec (v0.1)

### Input format

````markdown
```clipbook
[OpenAI]
API Key = sk-proj-abc123def456
Org ID = org-xyz789

[AWS]
Access Key = AKIA1234EXAMPLE
Secret Key = wJalrXUtnFEMI/K7MDENG
Region = us-east-1
```
````

### Rendered output (in reading view)

Compact grouped display:
- Section headers (OpenAI, AWS) as visual group labels
- Each key-value as a single compact row: `Label  ••••••3xFq  [copy icon]`
- Masked values by default, full value on hover or toggle
- Copy button copies the full, unmasked value to clipboard
- Visual feedback on successful copy (brief checkmark or "Copied!" flash)

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

## Open Questions

1. **Masking strategy:** How many characters to show? First 3 + last 3? Or fully hidden with a reveal toggle?
2. **Multiple notes:** Should the plugin work on any note containing a `clipbook` block, or only a designated note?
3. **Copy notification:** Use Obsidian Notice API or a subtle inline indicator?
4. **Section nesting:** Support subsections or keep it flat?

## Next Steps

Run `/workflows:plan` to create an implementation plan for v0.1.
