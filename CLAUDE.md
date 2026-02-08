# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClipBook is an Obsidian community plugin (TypeScript) that renders ` ```clipbook ` fenced code blocks as compact, structured UI with masked values and one-click copy buttons. It stores data in regular note files using an INI-like syntax.

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (esbuild, inline source maps)
npm run build        # Production build (tsc type-check + minified bundle)
```

Lint: `eslint ./src/`

## Manual Testing

Copy `main.js`, `manifest.json`, `styles.css` to `<Vault>/.obsidian/plugins/clipbook/`, reload Obsidian, enable in **Settings → Community plugins**. No automated test framework is configured.

## Architecture

Modular plugin organized in `src/` with clear separation of concerns:

```text
src/
  main.ts          # Plugin entry point — registers code block processor (12 lines)
  types.ts         # ClipBookEntry, ClipBookSection, ClipBookData interfaces
  parser.ts        # INI-like parser: source string → structured data
  ui/
    renderer.ts    # DOM builder: parsed data → HTML with sections, rows, copy buttons
    copy.ts        # Clipboard handler with icon-swap feedback
  utils/
    mask.ts        # Value masking (first 3 + ··· + last 4 chars)
styles.css         # Theme-compatible CSS using Obsidian variables only
```

**Data flow:** ` ```clipbook ` block → `parseClipBook(source)` → `ClipBookData` → `renderClipBook(data, el)` → DOM with copy handlers.

**Build pipeline:** `src/main.ts` → esbuild (`esbuild.config.mjs`) → `main.js` (CommonJS, ES2018 target). External deps (`obsidian`, `electron`, `@codemirror/*`, `@lezer/*`) are excluded from the bundle.

## Key Design Decisions

- **`!` prefix for masking** — `Key = !secret` masks the value; `Key = plain` shows in full. Opt-in, not default.
- **Split on first `=` only** — values containing `=` (e.g., connection strings) are preserved.
- **`#` / `;` for comments** — lines starting with these are skipped by the parser.
- **Click/tap to reveal** — masked values toggle on click (works on mobile, no hover-only interaction).
- **Copy feedback** — inline icon swap (copy → checkmark 1.5s) for success; Obsidian `Notice` for failure.
- **Orphan entries** — key-value pairs before any `[Section]` render without a group header.

## Key Conventions (from AGENTS.md)

- **Keep `main.ts` minimal** — lifecycle only. Delegate feature logic to separate modules.
- **Split files** exceeding ~200-300 lines.
- TypeScript strict mode (`noImplicitAny`, `strictNullChecks` enabled).
- Use `this.register*` helpers for all listeners/intervals (cleanup on unload).
- Stable command IDs — never rename after release.
- Default to offline/local operation. Network calls require user-facing justification and opt-in.
- Mobile compatible (`isDesktopOnly: false`) — avoid desktop-only APIs.
- CSS must use Obsidian CSS variables only — no hardcoded colors.
- Bundle everything into `main.js`; no unbundled runtime dependencies.

## Release Process

ClipBook follows [Semantic Versioning](https://semver.org/) and uses [Keep a Changelog](https://keepachangelog.com/) format for CHANGELOG.md.

### Version Bumping

1. **Update CHANGELOG.md** — Move items from `[Unreleased]` to a new version section with today's date:

   ```markdown
   ## [0.2.0] - 2026-02-08

   ### Added
   - Feature description

   [0.2.0]: https://github.com/zkbkb/obsidian-ClipBook/compare/v0.1.0...v0.2.0
   ```

2. **Bump version** — Run `npm version [patch|minor|major]`. This:
   - Updates `package.json` version
   - Triggers `version-bump.mjs` → updates `manifest.json` and `versions.json`
   - Creates a git commit with the new version
   - Creates a git tag (e.g., `0.2.0`)

3. **Push with tags** — `git push && git push --tags`

4. **GitHub Actions release** — The `.github/workflows/release.yml` workflow:
   - Triggers on tag push
   - Runs `npm ci && npm run build`
   - Creates a GitHub release (draft) with `main.js`, `manifest.json`, `styles.css`
   - Uses tag name as release title, auto-generates notes from commits

5. **Publish release** — Review the draft release on GitHub and click "Publish release"

### Important Notes

- **Tag format:** No `v` prefix (use `0.2.0`, not `v0.2.0`)
- **Tag = version:** Git tag must exactly match `manifest.json` version
- **Conventional commits:** Use `feat:`, `fix:`, `docs:`, etc. for clean changelog generation
- **Draft first:** Releases are created as drafts — review before publishing
