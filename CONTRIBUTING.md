# Contributing to ClipBook

Thanks for taking the time. Bug reports, small fixes and questions are all
welcome. For anything larger than a fix, please open an issue first — it is
cheaper to agree on the shape of a change before it is written than after.

## Getting set up

```bash
npm install
npm run dev     # watch build into main.js
npm run check   # typecheck, lint and test — what CI runs
```

To try a build in a real vault, point a plugin folder at this repository:

```
<vault>/.obsidian/plugins/clipbook/
```

It needs `main.js`, `manifest.json` and `styles.css`. Symlinking the repository
there works; so does copying the three files after `npm run build`. Reload the
plugin from Obsidian's Community plugins pane to pick up a rebuild.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | esbuild in watch mode |
| `npm run build` | typecheck, then a production bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over the whole repository |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run check` | typecheck + lint + test, in that order |

CI runs typecheck, lint, test and build on every push and pull request. Run
`npm run check` before you push and it will rarely tell you anything new.

## Tests

Tests live in `tests/` and run under Vitest with happy-dom.

The `obsidian` package is **types only** — there is no runtime to import — so
any module with a value import from `"obsidian"` cannot be loaded by the test
runner. This is why the tested modules are the ones with no such import:
parsing, serializing, fence-finding, roving focus, the settings declarations.
When you write logic worth testing, put it in a module that does not reach for
the Obsidian API, and let the module that does reach for it stay thin. A
type-only `import type { … } from "obsidian"` is erased at compile time and is
fine anywhere.

## Style

Match the file you are editing. A few things that are consistent across the
codebase and worth keeping:

- **Comments say why, not what.** The code already says what it does. The
  comments explain the constraint or the bug that shaped it.
- **Never hand an async function to something expecting `void`.** A DOM
  listener, a `setTimeout`, an Obsidian callback typed `=> void` — all of them
  drop the promise, so a rejection is reported nowhere.
  `@typescript-eslint/no-misused-promises` and `no-floating-promises` are on
  for `src/` and `tests/` and will catch it. Start the work from a synchronous
  handler and route the promise somewhere that handles failure.
- **Keep example values obviously fake** in docs and fixtures —
  `EXAMPLE-0000…` rather than something shaped like a real key. Secret scanners
  match on shape and on nearby words like "token", so a realistic-looking
  placeholder produces a real alert, and repeated false alerts are how a
  scanner stops being read.

## Obsidian API versions

The typings in `devDependencies` track the API surface the code is written
against. They are deliberately **ahead** of `minAppVersion` in `manifest.json`,
which is the oldest Obsidian a user may be running.

That gap is yours to manage. Anything newer than the floor has to be guarded:

- An *additive* hook — one Obsidian only calls on a new enough build, like
  `getSettingDefinitions()` — is safe to implement as-is. Older builds never
  call it.
- *Calling* something new needs a runtime check, because the method is simply
  absent on an older build. See `refreshVisibility()` in `src/settings.ts`.
- Where a new API replaces an old one, the old path has to stay until the floor
  moves, and the two must not drift. Drive both from one declaration — see
  `SETTING_DECLS` in `src/settings-defs.ts`, which the declarative definitions
  and the `display()` fallback both walk.

Raising `minAppVersion` is a deliberate decision, not a side effect of wanting
a newer API: it cuts existing users off from future updates.

## Releasing

Maintainers only.

1. `npm version <patch|minor|major>` — the `version` script runs
   `version-bump.mjs`, which writes the new version into `manifest.json` and
   maps it to the current `minAppVersion` in `versions.json`, then stages both.
2. Update `CHANGELOG.md`.
3. Push the commit and the tag. The Release workflow builds from the tag,
   attests build provenance for `main.js` and `styles.css`, and creates the
   GitHub release.

The build must stay reproducible — the release is checked by rebuilding it and
comparing bytes. Think twice before touching `esbuild.config.mjs`.

## Known scanner findings

The community plugin scans flag one thing here on purpose, and it is not going
to be fixed. Please do not open a pull request for it:

- **CSS multicolumn "only partially supported".** `styles.css` lays sections
  out with `columns`, and caniuse marks Chromium's multicolumn support partial
  over corners of the spec this does not use. Every property used is fully
  supported in the Chromium behind Obsidian 1.1.0. The alternatives were built
  and measured: Grid `auto-fill` is a third taller with whitespace under every
  short section, and the JS approaches have to recompute the split on every
  resize, collapse and reveal. The full reasoning is in the comment at the top
  of `styles.css`.

Two further findings are accurate descriptions of what the plugin does rather
than defects — it enumerates vault files to build the *Copy value…* index, and
it reads and writes the clipboard. Both are explained under
[Privacy and permissions](README.md#privacy-and-permissions).

## Licence

By contributing you agree that your contributions are licensed under the MIT
Licence, the same as the rest of the project.
