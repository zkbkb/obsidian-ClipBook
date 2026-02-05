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

In reading view, ClipBook renders this as a compact, structured list with copy buttons on each row.

## Syntax

| Syntax                       | Meaning                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Key = Value`                | A copyable entry. The full value is copied on click.                                                 |
| `Key = !Value`               | A masked entry. The value is hidden by default (e.g., `sk-···f456`). Click the value to reveal it.   |
| `[Section Name]`             | A section header to group entries visually.                                                          |
| `# comment` or `; comment`   | A comment line, ignored by the parser.                                                               |

- Entries before the first `[Section]` render without a group header.
- Values containing `=` are handled correctly (only the first `=` is used as the separator).
- Empty lines are ignored.

## Masking

Prefix a value with `!` to mask it. Masked values show a truncated form:

- Long values (>10 chars): first 3 + `···` + last 4 characters
- Medium values (4-10 chars): first 2 + `···`
- Short values (1-3 chars): `···`

Click a masked value to reveal the full text. Click again to re-mask.

## Installation

Copy `main.js`, `manifest.json`, and `styles.css` to your vault at:

```text
<vault>/.obsidian/plugins/clipbook/
```

Then enable ClipBook in **Settings > Community plugins**.

## Known limitations

- Masking is visual only, not encryption. Values are stored as plain text in your notes and held in memory while rendered.
- Multiline values (SSH keys, certificates) are not supported. Each entry must be a single line.
- No settings or configuration in v0.1. Masking thresholds and feedback duration are fixed defaults.
