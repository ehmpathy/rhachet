# requirement: the home CLAUDE.md never loads in a repo session

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a human's `~/.claude/CLAUDE.md` never reaches a session in a rhachet repo — a plain `claude` at the
repo root or an enrolled clone — from the first `rhx init` on.

- the repo actor's `settings.of.repo.json` lists the home `CLAUDE.md` in `claudeMdExcludes`, by
  portable globs (`**/home/*/.claude/CLAUDE.md`, `**/Users/*/.claude/CLAUDE.md`,
  `/root/.claude/CLAUDE.md`), so the tracked file names no machine-local path
- a plain claude reads it via `settings.local.json -> settings.of.repo.json`; a clone via `--settings`,
  and its user memory is its own brain dir besides
- why: a home memory differs per box, so a repo that loads it behaves differently per box, and no one
  can reproduce the difference from the repo

- the same holds for every `CLAUDE.local.md`: a plain claude is an ambient clone, so it skips the
  human's per-machine memory just as an enrolled clone does (the wisher, 2026-10-16). this amends the
  boot journey, where a plain claude once loaded it

bound: a plain claude on a box whose home is not at `/home/<user>`, `/Users/<user>` or `/root` is not
covered (`define.invariant.brain-config-grove-vs-repo`, criterion 6).

## .clamp — landed 2026-10-16

- `src/domain.operations/enroll/getAllClaudeMdExcludes.ts` — `CLAUDE_MD_EXCLUDES_HOME`, the portable
  globs, in every actor's list
- `src/domain.operations/init/boots/setRepoActorClaudeMdExcludes.ts` — upserts the repo actor's
  `claudeMdExcludes` key; every other key stays
- `src/domain.operations/init/boots/setRepoActorBrainDirLayout.ts` — runs it at each layout step, so
  `rhx init` lands it before any session

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/enroll/getAllClaudeMdExcludes.test.ts` — the portable globs, in order | ✅ green, 2026-10-16 |
| integration | `src/domain.operations/init/boots/setRepoActorBrainDirLayout.integration.test.ts` [case1] — a fresh repo gets the excludes; [case3] — an extant file keeps its keys, gains the excludes, and a rerun is byte-identical | ✅ green, 2026-10-16 |
| acceptance | `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t1.1] — after `rhx init`, a bare `claude -p` quotes the root `CLAUDE.md`, and neither the `CLAUDE.local.md` nor the home `CLAUDE.md` | ✅ green, 2026-10-16 |
| acceptance | `blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` [case1] — after `rhx init`, the excludes with no machine-local path; [case5] — a real claude outside the repo names the home codeword (control), and at the repo root it does not; [case4 t3] — an enrolled clone does not | ✅ green, 2026-10-16 · 🟡 rerun owed: the suite's tui waits changed 2026-10-17, and that run met an api key with no credit |

the [case5] clamp bites: with the home globs removed, the plain claude at the repo root named the home
codeword (measured 2026-10-16).

## .source

the wisher, 2026-10-16 (seed S5 of `v2026_10_15.fix-split-layout-local-settings-arrow`).
