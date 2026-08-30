# ClipBook

Store and quickly copy API keys, tokens, and reusable text snippets from structured code blocks in Obsidian.

## Usage

Create a fenced code block with the `clipbook` language identifier in any note:

````markdown
```clipbook
API Token = !EXAMPLE-0000000000000000
Region = us-east-1

[AWS]
Access Key = !AKIA-EXAMPLE-0000
Secret Key = !EXAMPLE-0000000000000000
Region = us-east-1

[GitHub]
PAT = !ghp_EXAMPLE-0000
Username = octocat
```
````

In reading view, ClipBook renders this as a compact, structured list with copy buttons on each row. Sections are collapsible, masked values can be revealed with a click, and a quick-add button lets you append entries without editing the source.

## Syntax

| Syntax                       | Meaning                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Key = Value`                | A copyable entry. The full value is copied on click.                                                 |
| `Key = !Value`               | A masked entry. The value is hidden by default (e.g., `EXA···0000`). Click the value to reveal it.   |
| `!Value`                     | A keyless masked entry (bare line, no key label).                                                    |
| `= Value`                    | A keyless plain entry (no key label).                                                                |
| `[Section Name]`             | A section header to group entries visually. Click to collapse/expand.                                |
| `# comment` or `; comment`   | A comment line, ignored by the parser.                                                               |
| `Key = \!Value`              | A plain entry whose value literally starts with `!` (see [Escaping](#escaping)).                     |

- Entries before the first `[Section]` render without a group header.
- Values containing `=` are handled correctly (only the first `=` is used as the separator).
- Empty lines are ignored.
- Keys cannot contain `=`, or start with `#` or `;`. Section names cannot contain `]`.
- Leading and trailing whitespace is stripped from keys and values.

### Escaping

Only the *first* character of a value can collide with the syntax, so only it is
ever escaped. A leading backslash is dropped when the next character is `!` or `\`:

| Source           | Value        |
| ---------------- | ------------ |
| `Key = \!secret` | `!secret`    |
| `Key = \\!x`     | `\!x`        |
| `Key = C:\path`  | `C:\path`    |

Backslashes anywhere else in a value are left alone, so paths and slash-heavy
secrets need no escaping. ClipBook adds the escape for you when it writes an
entry back — you only need it when hand-writing a value that starts with `!` or `\`.

## Masking

Prefix a value with `!` to mask it. Masked values show a truncated form:

- Long values (>10 chars): first 3 + `···` + last 4 characters
- Medium values (4-10 chars): first 2 + `···`
- Short values (1-3 chars): `···`

Click a masked value to reveal the full text. Press Escape to hide it again, or run **ClipBook: Hide all revealed values** to hide every revealed value at once — worth binding to a hotkey. Revealed values are also re-masked automatically after a configurable timeout, and when you switch tabs.

## Collapsible sections

Sections with a `[Header]` can be collapsed and expanded by clicking the header. Collapsing is remembered for the rest of the session, so editing an entry does not spring every section back open. It is not written to the note — collapsing is a way of reading one, not a change to it. You can set sections to start collapsed by default in settings.

## Inline editing

Click any Key name or Value to edit it in place — the cursor lands right where you clicked. For masked values, click once to reveal, then click again to edit. Press Enter to save or Escape to cancel. Changes are written back to the markdown source automatically, in reading view as well as in edit and live-preview modes.

Clearing a Key turns the entry into a keyless one. Clearing a Value leaves the entry in place with an empty value (keyless entries excepted — they would disappear entirely, so their value cannot be cleared).

Every row also has a delete button. It appears when you hover or focus the row, and on a touch screen it is always there, dimmed. Deleting shows a notice with an **Undo** link for ten seconds, which works whether or not the note is open in an editor.

Editing is not supported for clipbook blocks nested inside callouts or list items: the source lines carry a prefix ClipBook cannot map back safely, so it declines rather than risk mangling the note.

## Quick add

Click the **+ Add** button at the bottom of any clipbook block to append a new entry. The inline form lets you choose a section, key, value, and mask toggle, then writes directly back to the markdown source. New entries are appended to the end of their section, and a section that does not exist yet is created.

Each section header also has its own **+**, which opens the same form next to that section with the section already filled in — so adding to a section you can see does not mean telling a form which one you meant.

## Keyboard

Each entry is a single tab stop. Tab moves between entries; the arrow keys move
between a row's key, value, copy and delete; Home and End jump to the ends of a
row. Enter or Space activates whatever is focused — revealing a masked value,
editing a key, copying. Escape hides a revealed value, and cancels an edit.

## Settings

Open **Settings > ClipBook** to configure:

| Setting                        | Default   | Description                                                          |
| ------------------------------ | --------- | -------------------------------------------------------------------- |
| Mask all values by default     | Off       | Mask every value, not just `!`-prefixed ones.                        |
| Auto-hide revealed values      | On (5 s)  | Re-mask revealed values after a delay (in seconds, or off).          |
| Hide on tab switch             | On        | Re-mask all revealed values when switching tabs or windows.          |
| Clear the clipboard after copying | Off    | Empty the clipboard a while after a masked value is copied.          |
| Sections start collapsed       | Off       | Whether sections are collapsed by default.                           |
| Mask new entries by default    | On        | Whether the mask checkbox is checked by default in quick-add.        |

Clipboard clearing is off by default because emptying the clipboard is a change
to something the whole machine shares. When it is on, ClipBook only ever clears
the value it put there — if you have copied something else since, that is left
alone — and only for values the note marks as secrets with `!`. It also needs to
read the clipboard back to make that check, which mobile webviews generally
refuse outside a user gesture, so on those the clipboard is left as it is.

## Commands

| Command                                | Description                                                       |
| -------------------------------------- | ----------------------------------------------------------------- |
| ClipBook: Insert template block        | Inserts a template clipbook code block                            |
| ClipBook: Copy value…                  | Fuzzy-find any entry in the vault and copy it, without opening the note |
| ClipBook: Hide all revealed values     | Re-masks every revealed value everywhere                          |

**Copy value…** is the quickest way to use the plugin once you have more than a
screenful of entries: open the command palette, type part of a key or a note
name, press Enter. Only blocks at the top level of a note are indexed — one
nested inside a callout or a list item is not found.

## Privacy and permissions

ClipBook makes no network requests of any kind. Everything below happens on your
own machine, against your own vault.

**Your notes.** Rendering a block reads that block. Editing, adding or deleting
an entry writes back to the note the block lives in, through Obsidian's own
`Vault.process`, and only to the lines of that block.

**Every note in the vault, for one command.** *ClipBook: Copy value…* searches
across the whole vault, so it walks the list of markdown files to build its
index. It is built on demand when you run the command and then thrown away —
nothing is watched or kept in the background. Files are skipped before being
read at all unless Obsidian's metadata cache already says they contain a code
block, and a file that is read but does not contain the word `clipbook` is
dropped immediately. Reads go through `cachedRead`, so nothing is loaded from
disk that Obsidian does not already have.

**The clipboard.** Copying a value writes it to the system clipboard — that is
what the plugin is for. If you switch on *Clear the clipboard after copying*,
ClipBook also *reads* the clipboard once when the delay expires. That read
exists so it can compare what is there against what it put there and stop if
they differ: it will only ever erase its own value, never something you copied
from somewhere else in the meantime. Nothing read from the clipboard is stored
or sent anywhere. Where the platform refuses the read — a mobile webview
outside a user gesture — the clear is quietly abandoned rather than guessed at.

## Installation

Copy `main.js`, `manifest.json`, and `styles.css` to your vault at:

```text
<vault>/.obsidian/plugins/clipbook/
```

Then enable ClipBook in **Settings > Community plugins**.

## Development

```bash
npm install
npm run dev     # watch build into main.js
npm run check   # typecheck, lint and test — what CI runs
npm test        # tests only
```

The Obsidian typings track the API surface the code is written against, which is
ahead of the `minAppVersion` in `manifest.json`. Anything newer than that floor
has to be guarded at runtime rather than assumed: an additive hook Obsidian only
calls on a new enough build is safe on its own, but calling a method that older
builds do not have needs a `typeof` check, and a settings tab written against
the 1.13 declarative API still needs its `display()` fallback. Where the two
paths would otherwise drift, drive them from one declaration — see
`src/settings-defs.ts`.

Keep example values in docs and fixtures obviously fake — `EXAMPLE-0000…` rather
than something shaped like a real key. Secret scanners match on shape and on
nearby words like "token", so a realistic-looking placeholder produces a real
alert, and repeated false alerts are how a scanner stops being read.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the test conventions, the policy on
API versions, and the release process.

## Known limitations

- Masking is visual only, not encryption. Values are stored as plain text in your notes and held in memory while rendered. Keep clipbook notes out of anything you sync or publish without meaning to.
- Multiline values (SSH keys, certificates) are not supported. Each entry must be a single line.
- Editing is unavailable for blocks nested inside callouts or list items.
- Masked values are hidden when a note is printed or exported to PDF, but the plaintext still lives in the markdown itself — an exported *markdown* file carries everything.
