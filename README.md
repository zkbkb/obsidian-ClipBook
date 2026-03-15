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

- Entries before the first `[Section]` render without a group header.
- Values containing `=` are handled correctly (only the first `=` is used as the separator).
- Empty lines are ignored.

## Masking

Prefix a value with `!` to mask it. Masked values show a truncated form:

- Long values (>10 chars): first 3 + `···` + last 4 characters
- Medium values (4-10 chars): first 2 + `···`
- Short values (1-3 chars): `···`

Click a masked value to reveal the full text. Click again to re-mask. Revealed values are automatically re-masked after a configurable timeout or when you switch tabs.

## Collapsible sections

Sections with a `[Header]` can be collapsed and expanded by clicking the header. You can set sections to start collapsed by default in settings.

## Quick add

Click the **+ Add** button at the bottom of any clipbook block to append a new entry. The inline form lets you choose a section, key, value, and mask toggle, then writes directly back to the markdown source.

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

- Masking is visual only, not encryption. Values are stored as plain text in your notes and held in memory while rendered.
- Multiline values (SSH keys, certificates) are not supported. Each entry must be a single line.
