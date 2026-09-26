# F53 — enrolled clones exclude the human's CLAUDE.local.md

## .the fork

- **a.** let a clone load `<repo>/CLAUDE.local.md`, as it has all along
- **b.** add it to `claudeMdExcludes`

## .how it surfaced

the new journey clamp asserted that an empty-prompt launch reads the actor corpus and naught else. it read `local` too. the vendor-prompt launch read it as well, so the leak predates the empty prompt: a clone keeps the `local` config source for its per-enrollment settings, and that source also loads `CLAUDE.local.md`. the repo `CLAUDE.md` stays out only because it rides the `project` source, which a clone omits.

## .taken — b, and why at the time

`define.brain-dir-repo-vs-actor`: *"one brain dir per clone"* and *"no third place"*. the human's personal notes are a third corpus beside the actor's, and its peer file (`CLAUDE.md`) is already out.

## .rework

**clean** — one line in `getClaudeMdExcludesList.ts`, its unit row, six config snapshots.

## .confidence — 85%, and why it is low

a human may WANT their local notes in every clone they enroll, and the brief never named this file.

## .where

`getClaudeMdExcludesList.ts` · journey `[t3]` (the real clone and the empty-prompt launch both now assert `root` and `local` absent)
