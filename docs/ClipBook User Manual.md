---
title: ClipBook User Manual
date: 2026-02-05
tags:
  - clipbook
  - documentation
aliases:
  - ClipBook Help
  - ClipBook Guide
---

# ClipBook User Manual

ClipBook lets you store API keys, tokens, and reusable text snippets in your Obsidian notes, with a compact UI for one-click copying.

## Quick Start

Create a fenced code block with the `clipbook` language in any note:

````
```clipbook
[OpenAI]
API Key = !sk-proj-abc123def456
Org ID = org-xyz789
```
````

Switch to **reading view** — you'll see a compact, structured panel with copy buttons.

## Syntax Reference

### Key-Value Pairs

Each line follows the format `Key = Value`:

````
```clipbook
Username = octocat
Email = user@example.com
```
````

The **key** is the label shown on the left. The **value** is what gets copied when you click the copy button.

> [!tip] Values with `=` signs
> ClipBook splits on the **first** `=` only. Connection strings like `host=db;port=5432` work correctly:
> ```
> Connection = host=db;port=5432;user=admin
> ```
> Key: `Connection`, Value: `host=db;port=5432;user=admin`

### Sections

Group related entries with `[Section Name]` headers:

````
```clipbook
[AWS Production]
Access Key = !AKIA1234EXAMPLE
Secret Key = !wJalrXUtnFEMI/K7MDENG
Region = us-east-1

[AWS Staging]
Access Key = !AKIA5678STAGING
Secret Key = !xYzAbCdEfGhIjKlMnOp
Region = ap-northeast-1
```
````

Entries **before** any `[Section]` header render without a group label — useful for simple lists that don't need grouping.

### Masking Sensitive Values

Prefix a value with `!` to mask it:

````
```clipbook
API Key = !sk-proj-abc123def456ghi789
Region = us-east-1
```
````

| What you write | What you see | What gets copied |
| -------------- | ------------ | ---------------- |
| `Key = !sk-proj-abc123def456ghi789` | `sk-···i789` | `sk-proj-abc123def456ghi789` |
| `Key = us-east-1` | `us-east-1` | `us-east-1` |

**Masking rules by value length:**

| Length | Display | Example |
| ------ | ------- | ------- |
| >10 chars | first 3 + `···` + last 4 | `sk-···f456` |
| 4-10 chars | first 2 + `···` | `us···` |
| 1-3 chars | `···` | `···` |

> [!info] Masking is visual only
> Values are stored as plain text in your note. Masking hides them in reading view for over-the-shoulder privacy, but it is **not encryption**.

### Comments

Lines starting with `#` or `;` are ignored:

````
```clipbook
# Production credentials — last rotated 2026-01-15
[Stripe]
Publishable Key = pk_live_abc123
Secret Key = !sk_live_xyz789

; TODO: rotate these next month
[Twilio]
Account SID = !AC1234567890abcdef
Auth Token = !abcdef1234567890
```
````

### Empty Lines

Empty lines are ignored and can be used freely to organize your block visually.

## Interactions

### Copying

Click the copy button (clipboard icon) on any row. The icon briefly changes to a **checkmark** (✓) to confirm the copy succeeded.

> [!warning] If copying fails
> On some devices, clipboard access may be restricted. ClipBook will show a notification: "Failed to copy to clipboard."

### Revealing Masked Values

**Click or tap** a masked value (e.g., `sk-···f456`) to reveal the full text. Click or tap again to re-mask it.

This works on both desktop and mobile — no hover required.

### Keyboard Navigation

All interactive elements support keyboard navigation:

| Key | Action |
| --- | ------ |
| `Tab` | Move focus between values and copy buttons |
| `Enter` or `Space` | Toggle reveal on a masked value, or trigger copy |

## Examples

### Simple — A Few Keys, No Sections

````
```clipbook
GitHub PAT = !ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
npm Token = !npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Docker Hub = !dkr_pat_xxxxxxxxxxxxxxxxxxxxx
```
````

### Organized — Multiple Services

````
```clipbook
[OpenAI]
API Key = !sk-proj-abc123def456
Organization = org-xyz789
Model = gpt-4

[Anthropic]
API Key = !sk-ant-abc123def456
Model = claude-sonnet-4-5-20250929

[Database]
Host = db.example.com
Port = 5432
Username = app_user
Password = !s3cureP@ssw0rd
Connection = postgresql://app_user:s3cureP@ssw0rd@db.example.com:5432/mydb
```
````

### Mixed — Secrets and Non-Secrets

````
```clipbook
# Project config — safe to share
Project ID = proj_12345
Region = us-central1
Environment = production

# Credentials — keep secret
[Credentials]
Service Account = !eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9
API Key = !AIzaSyB4xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
````

## Tips

> [!tip] Use in any note
> ClipBook works in **any note** that contains a ` ```clipbook ` block. You can have multiple blocks in a single note, or spread them across different notes.

> [!tip] Works without the plugin
> If you open your vault on a device without ClipBook, the block shows as a normal fenced code block — still readable, just without the UI.

> [!tip] Watch mode for development
> If you're contributing to ClipBook, run `npm run dev` for automatic rebuilds. Then just reload Obsidian (Ctrl/Cmd+R) to see changes.

## Known Limitations

- **Visual masking only** — not encryption. Values are plain text in your notes and in memory while rendered.
- **Single-line values only** — multiline values (SSH keys, certificates, JSON) are not supported. Each entry must be one line.
- **No in-place editing** — to modify values, switch to source/edit mode and edit the raw text.
- **No search or filter** — for large blocks, use Obsidian's built-in search (Ctrl/Cmd+F) in edit mode.
- **No settings** — masking thresholds and feedback timing are fixed in v0.1.
