# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian community plugin (TypeScript). Currently based on the sample plugin template — all source is in `main.ts` at root level. The plugin compiles to `main.js` via esbuild and is loaded by Obsidian at runtime.

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (esbuild, inline source maps)
npm run build        # Production build (tsc type-check + minified bundle)
```

Lint a file: `eslint main.ts` (or `eslint ./src/` once code moves to `src/`).

## Manual Testing

Copy `main.js`, `manifest.json`, `styles.css` to `<Vault>/.obsidian/plugins/sample-plugin/`, reload Obsidian, enable in **Settings → Community plugins**. No automated test framework is configured.

## Architecture

Single-file plugin (`main.ts`) with three classes:

- **`MyPlugin`** (extends `Plugin`) — lifecycle entry point. Registers ribbon icon, status bar, commands, event listeners, settings tab. Loads/saves settings via `this.loadData()`/`this.saveData()`.
- **`SampleModal`** (extends `Modal`) — example dialog.
- **`SampleSettingTab`** (extends `PluginSettingTab`) — settings UI with one text input.

Build pipeline: `main.ts` → esbuild (`esbuild.config.mjs`) → `main.js` (CommonJS, ES2018 target). External deps (`obsidian`, `electron`, `@codemirror/*`, `@lezer/*`) are excluded from the bundle.

## Key Conventions (from AGENTS.md)

- **Keep `main.ts` minimal** — lifecycle only. Delegate feature logic to separate modules.
- **Target file structure** when growing: `src/` with `main.ts`, `settings.ts`, `commands/`, `ui/`, `utils/`, `types.ts`.
- **Split files** exceeding ~200-300 lines.
- TypeScript strict mode (`noImplicitAny`, `strictNullChecks` enabled).
- Use `this.register*` helpers for all listeners/intervals (cleanup on unload).
- Stable command IDs — never rename after release.
- Default to offline/local operation. Network calls require user-facing justification and opt-in.
- Mobile compatible (`isDesktopOnly: false`) — avoid desktop-only APIs.
- Bundle everything into `main.js`; no unbundled runtime dependencies.

## Version Bumping

`npm version [patch|minor|major]` triggers `version-bump.mjs` which updates `manifest.json` and `versions.json`. GitHub release tags must match `manifest.json` version exactly (no `v` prefix).
