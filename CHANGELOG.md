# Changelog

All notable changes to ClipBook will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Settings tab with 5 configurable options
- "Mask all values by default" setting — masks every value, not just `!`-prefixed ones
- Keyless entry support — store values without key names using bare line syntax
- Auto-hide revealed values with toggle and configurable delay (in seconds)
- Auto-hide on tab switch — re-mask all revealed values when switching tabs or window loses focus
- Collapsible sections with chevron toggle
- Quick-add inline form for adding entries from the rendered view
- Editor write-back — quick-add writes directly to the source markdown
- Vault write-back fallback — quick-add works in reading mode via `vault.process()`
- "Insert clipbook block" command in the command palette

### Changed

- `ClipBookEntry.key` is now `string | null` to support keyless entries
- Parser handles both `!value` (bare line) and `= !value` (empty key) syntax for keyless entries
- Renderer displays keyless entries without key label

### Fixed

- TypeScript strict mode compliance (`settings!:` definite assignment)
- Memory leak: stale hide callbacks for removed DOM elements are now auto-cleaned
- Memory leak: rapid copy clicks no longer accumulate uncanceled timeouts
- Copy error handler now logs to console for easier debugging

## [0.1.0] - 2026-02-06

### Added

- Initial release of ClipBook
- `clipbook` code block processor for rendering structured key-value pairs
- INI-like syntax with `[Section]` headers and `Key = Value` pairs
- Opt-in value masking with `!` prefix (e.g., `Key = !secret`)
- 3-tier masking algorithm: first 3 + ··· + last 4 chars for long values
- Click/tap to toggle reveal for masked values
- One-click copy to clipboard with visual feedback (icon swap to checkmark)
- Keyboard accessible with Tab/Enter/Space support
- Mobile compatible (`isDesktopOnly: false`)
- Theme-compatible CSS using only Obsidian CSS variables
- Comment support with `#` and `;` prefixes
- Orphan entries (key-value pairs before first `[Section]`) render without group header
- Comprehensive user manual in English and Chinese

### Fixed

- None (initial release)

[Unreleased]: https://github.com/zkbkb/obsidian-ClipBook/compare/0.1.0...HEAD
[0.1.0]: https://github.com/zkbkb/obsidian-ClipBook/releases/tag/0.1.0
