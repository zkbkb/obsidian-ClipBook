# ClipBook

Store and quickly copy API keys, tokens, and reusable text snippets from structured code blocks in Obsidian.

## Usage

Create a fenced code block with the `clipbook` language identifier in any note:

````markdown
```clipbook
API Token = !sk-proj-abc123def456
Region = us-east-1

[AWS]
Access Key = !AKIA1234EXAMPLE
Secret Key = !wJalrXUtnFEMI/K7MDENG
Region = us-east-1

[GitHub]
PAT = !ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Username = octocat
```
````

In reading view, ClipBook renders this as a compact, structured list with copy buttons on each row. Sections are collapsible, masked values can be revealed with a click, and a quick-add button lets you append entries without editing the source.

## Syntax

| Syntax                       | Meaning                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Key = Value`                | A copyable entry. The full value is copied on click.                                                 |
| `Key = !Value`               | A masked entry. The value is hidden by default (e.g., `sk-···f456`). Click the value to reveal it.   |
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

Click a masked value to reveal the full text. Revealed values are automatically re-masked after a configurable timeout or when you switch tabs.

## Collapsible sections

Sections with a `[Header]` can be collapsed and expanded by clicking the header. You can set sections to start collapsed by default in settings.

## Inline editing

Click any Key name or Value to edit it in place — the cursor lands right where you clicked. For masked values, click once to reveal, then click again to edit. Press Enter to save or Escape to cancel. Changes are written back to the markdown source automatically, in reading view as well as in edit and live-preview modes.

Clearing a Key turns the entry into a keyless one. Clearing a Value leaves the entry in place with an empty value (keyless entries excepted — they would disappear entirely, so their value cannot be cleared).

Every row also has a delete button, which appears when you hover or focus the row — or, on a touch screen, while you press it.

Editing is not supported for clipbook blocks nested inside callouts or list items: the source lines carry a prefix ClipBook cannot map back safely, so it declines rather than risk mangling the note.

## Quick add

Click the **+ Add** button at the bottom of any clipbook block to append a new entry. The inline form lets you choose a section, key, value, and mask toggle, then writes directly back to the markdown source. New entries are appended to the end of their section, and a section that does not exist yet is created.

## Settings

Open **Settings > ClipBook** to configure:

| Setting                     | Default   | Description                                                        |
| --------------------------- | --------- | ------------------------------------------------------------------ |
| Mask all values by default  | Off       | Mask every value, not just `!`-prefixed ones.                      |
| Auto-hide revealed values   | On (5 s)  | Re-mask revealed values after a delay (in seconds, or off).        |
| Hide on tab switch          | On        | Re-mask all revealed values when switching tabs or windows.        |
| Sections start collapsed    | Off       | Whether sections are collapsed by default.                         |
| Mask new entries by default | On        | Whether the mask checkbox is checked by default in quick-add.      |

## Commands

| Command                          | Description                            |
| -------------------------------- | -------------------------------------- |
| ClipBook: Insert clipbook block  | Inserts a template clipbook code block |

## Installation

Copy `main.js`, `manifest.json`, and `styles.css` to your vault at:

```text
<vault>/.obsidian/plugins/clipbook/
```

Then enable ClipBook in **Settings > Community plugins**.

## Known limitations

- Masking is visual only, not encryption. Values are stored as plain text in your notes and held in memory while rendered. Keep clipbook notes out of anything you sync or publish without meaning to.
- Multiline values (SSH keys, certificates) are not supported. Each entry must be a single line.
- Editing is unavailable for blocks nested inside callouts or list items.
- Masked values are hidden when a note is printed or exported to PDF, but the plaintext still lives in the markdown itself — an exported *markdown* file carries everything.
