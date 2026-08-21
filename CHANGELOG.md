# Changelog

All notable changes to ClipBook will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-21

### Fixed

- Writes now target the note the block belongs to, resolved from the render
  context, instead of whatever view happens to be active. Editing a block in a
  split pane, a sidebar, a hover preview, or an embed could previously apply
  block-relative line numbers to an unrelated note and overwrite one of its lines.
- Values whose first character is `!` or `\` are escaped when written and
  unescaped when read, so a plain value of `!secret` no longer comes back as a
  masked value of `secret`. Backslashes elsewhere in a value are untouched, so
  existing notes parse exactly as before.
- A line with a bracketed key *and* value (`[Key] = [Value]`) is no longer
  mistaken for a section header — the header pattern was matching greedily
  across the whole line.
- The quick-add button is rendered for empty blocks, which previously had no way
  to add a first entry other than editing the source.
- Revealed values no longer leak: each block drops its reveal registrations,
  auto-hide timers, and copy-feedback timers when it unloads. Previously, with
  "Hide on tab switch" disabled, every reveal retained a detached DOM node and
  its plaintext for the rest of the session.
- Repeatedly editing and cancelling on the same key or value no longer stacks up
  keyboard listeners on the element.
- Writes are abandoned, with an explanation, when the note changed underneath a
  rendered block, or when the block sits inside a callout or list item where
  source lines carry a prefix that cannot be mapped back.

### Added

- A delete button on every entry row, shown on hover or focus.
- Clearing a key turns its entry into a keyless one; clearing a value leaves the
  entry in place with an empty value.
- Inline editing now works in reading view, not only in edit and live-preview modes.
- Masked values are hidden when printing or exporting a note to PDF.
- Section names and keys are validated in quick-add, rather than silently
  producing a line that parses back as something else.

### Changed

- **Breaking:** section names can no longer contain `]`. This is what stops the
  header pattern from matching greedily; a name like `[A]B]` used to parse as a
  section and no longer does.
- **Breaking:** a hand-written value of `\!foo` now reads as `!foo`. That is the
  new escape rule working as intended, but it changes the meaning of a value
  written that way before this release.
- Inline editing uses a text input instead of `contenteditable="plaintext-only"`,
  which is unsupported on older WebKit and made editing silently do nothing on iOS.
- Section headers, the quick-add button, and the row buttons are real `<button>`
  elements, so collapsing a section and deleting an entry are reachable from the
  keyboard and announced with the right role and state. Keys and values respond
  to screen-reader activation as well as to pointer and keyboard input.
- Auto-hide on blur now also covers popout windows, and releases its listener
  when one closes.
- Keyless entries are written as `= value` rather than as a bare line, which is
  ambiguous for values containing `=` or starting with `[`.

## [0.1.1] - 2026-05-20

### Fixed

- Issues raised by the Obsidian plugin scanner: sentence case in notice text, no
  `async` event listeners, no non-null assertions, and no invalid
  `eslint-disable` comments.
- Saved settings are validated per key before use, instead of being merged in
  whole from `loadData()`.
- A failure to save settings is logged and surfaced as a notice rather than
  being swallowed.
- The copy handler catches synchronous exceptions, and schedules its feedback
  timer on the owning window so it also works in popout windows.
- Editing or adding an entry in reading view shows a notice explaining why it
  did not apply, instead of silently doing nothing.
- Release artifacts are attested correctly by the release workflow.

### Changed

- `minAppVersion` raised to 1.1.0.
- The command is named "Insert template block" — Obsidian already prefixes the
  plugin name, so "Insert clipbook block" read as "ClipBook: Insert clipbook
  block".

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

[0.2.0]: https://github.com/zkbkb/obsidian-ClipBook/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/zkbkb/obsidian-ClipBook/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/zkbkb/obsidian-ClipBook/releases/tag/0.1.0
