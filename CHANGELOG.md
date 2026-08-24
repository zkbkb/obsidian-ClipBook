# Changelog

All notable changes to ClipBook will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **ClipBook: Copy value…** — a command that fuzzy-finds any entry across the
  vault and copies it without opening the note it lives in. Notes with no code
  block are skipped without being read, and the picker shows a masked value
  rather than the secret itself.
- **ClipBook: Hide all revealed values** — one command to re-mask everything,
  bindable to a hotkey. Escape hides a single revealed value.
- Deleting an entry now offers an Undo for ten seconds. It restores the line
  itself rather than relying on the editor's undo stack, which a block rendered
  without an editor does not have.
- An optional delay after which a copied masked value is cleared from the
  clipboard. Off by default; only ever clears the value ClipBook put there.
- A test suite, a lint script, and a CI workflow that typechecks, lints, tests
  and builds every push and pull request.
- An add button on each section header, which opens the quick-add form already
  knowing which section you meant, next to the section rather than at the
  bottom of the block.

### Fixed

- Collapsed sections no longer spring open whenever anything is edited. Collapse
  state was local to a render, and every write re-renders the block; it is now
  remembered for the session, without being written to the note.
- A revealed value could not be hidden again. Every way of activating one led to
  editing it, so it stayed on screen until the auto-hide timer or a tab switch
  took it away.
- A masked value no longer claims `aria-pressed`. Activating a revealed one
  edits rather than re-masks it, so describing it to a screen reader as a toggle
  was wrong.
- Quick-add places a new keyless entry directly after the last keyless one,
  rather than after the blank line that separated it from the first section.
  Named sections already worked this way.
- Fixed the block rendering as a stack of heavy grey boxes on mobile. Making the
  section headers and row controls real `<button>` elements in 0.2.0 exposed
  them to Obsidian's own button styling, which on mobile adds a fill, a border,
  a shadow, inflated padding, and centred content. Those rules are written as
  `.is-mobile button`, so the plugin's single-class rules lost to them; the
  reset now covers every property the app sets, at a specificity that wins.
- Fixed a revealed value still being cut off by the ellipsis meant for masked
  rows. Any secret longer than the row was unreadable however many times you
  tapped it — most of them, on a phone. A revealed value now wraps and takes
  the space it needs.
- Fixed a long value crushing its key to an ellipsis while revealed or being
  edited. The key identifies the row, so it now keeps its width and the value
  takes what is left.
- A block that repeats a section header — two `[AWS]` groups — now treats them
  as the two groups they are. Adding from the second one's button added to the
  first, and collapsing either collapsed both.
- Fixed the add and delete buttons being invisible and untappable on a laptop
  with a touchscreen. They hide until hovered, which is fine where there is a
  pointer and impossible where you reach up to the screen; whether to hide them
  now follows whether a touchscreen exists at all, while how big to draw them
  still follows the pointer in use.
- With reduced motion, collapsing a section no longer leaves its rows in the
  tab order for a further 160ms — a delay that exists to cover an animation
  that, under that setting, is not playing.

### Changed

- Section headers read as quiet labels over a hairline rule rather than as
  filled bars, and values line up in one column against the copy button instead
  of trailing each key at a different offset. Keyless entries join that column
  too, so a mixed block reads as one list.
- Touch targets grow to 36–38px on coarse pointers without the controls
  themselves growing, and the quick-add form stacks its labels above its fields
  the way the app's own mobile settings do.
- Copy and delete are no longer visually equal. Delete stays out of the way
  until the row is hovered or focused where there is a pointer to do it with,
  and rests faint but always tappable on a touch screen — revealing it on press
  cannot work, because the press has already gone through it to the row.
- The quick-add form's own buttons are left unstyled so they render as
  Obsidian's native and accent buttons, and its inputs keep the app's sizing —
  which is what stops iOS zooming in when one is focused.
- The Obsidian typings are pinned to the `minAppVersion` floor, so using an API
  newer than the plugin claims to support is now a compile error rather than
  something to remember to check.
- Collapsing and expanding a section animates rather than snapping, and the
  chevron turns rather than being swapped for a different icon. Collapsed rows
  leave the tab order, which `display: none` also did and a plain height
  animation would not.
- Section headers dropped the rule beneath them. The uppercase label and the gap
  above already mark where a group starts; a line every few rows competed with
  the entries.
- The **+ Add** button fades in when the block is hovered or focused, rather
  than sitting under every block permanently. It stays put where there is no
  pointer to hover with, and while its form is open.
- Each entry is one tab stop rather than four. A row is a toolbar: Tab moves
  between rows, the arrow keys move between a row's key, value, copy and delete,
  and Home and End jump to its ends. A block of fifteen entries cost sixty
  presses to tab past before.

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
