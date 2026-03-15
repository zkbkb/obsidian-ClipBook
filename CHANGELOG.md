# Changelog

All notable changes to ClipBook will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-06

### Added

- Initial release of ClipBook
- `clipbook` code block processor for rendering structured key-value pairs
- INI-like syntax with `[Section]` headers and `Key = Value` pairs
- Keyless entry support — `!value` (bare line) and `= value` (empty key) syntax
- Opt-in value masking with `!` prefix (e.g., `Key = !secret`)
- Click/tap to toggle reveal for masked values
- One-click copy to clipboard with visual feedback (icon swap to checkmark)
- "Insert clipbook block" command in the command palette
- Settings tab with 5 configurable options
- "Mask all values by default" setting — masks every value, not just `!`-prefixed ones
- Auto-hide revealed values with toggle and configurable delay (in seconds)
- Auto-hide on tab switch — re-mask all revealed values when switching tabs or window loses focus
- Keyboard accessible with Tab/Enter/Space support
- Comment support with `#` and `;` prefixes
- Orphan entries (key-value pairs before first `[Section]`) render without group header

[0.1.0]: https://github.com/zkbkb/obsidian-ClipBook/releases/tag/0.1.0
