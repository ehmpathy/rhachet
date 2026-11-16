# F7 — the worktree's role and declapract bumps ride the pr in a commit of their own

## .the fork

the worktree holds changes no lever of this behavior made, present before execution began:
`package.json` + `pnpm-lock.yaml` (role packages bumped, `declapract` 0.13.15 → 0.13.27,
`declapract-typescript-ehmpathy` 0.49.9 → 0.50.0, two roles added to `prepare:rhachet`), `.gitattributes`, `.gitignore`, `.husky/*` (two new checks),
and `.agent/repo=.this/role=any/boot.yml`. the pr may carry them, or leave them out.

## .taken, and why

carry them, in a `chore(deps)` commit apart from the #748 commits, so a reviewer reads #748 alone.
`rule.require.git-release-confidence` names role package bumps and generated config as routine,
in scope by default. to leave them out would strand a worktree the tests already ran against.

the `.husky/*` checks are the output of `declapract-typescript-ehmpathy`'s husky practice
(`dist/practices/husky/best-practice/.husky/`). a defect a review finds in them is cured in the
practice, never here: the next upgrade would overwrite a local edit. the lock gaps r006 named
are caught as a reseed dream (`dreams/v2026_11_16.reseed.timestamps-lock-passes-a-staged-hook-deletion.md`).

two bounds on that:

- a defect that ships harm is cured here too. the upgrade had moved `rhachet-artifact-git` to dev
  deps, which would break a consumer install, so it is back under `dependencies`. the secrets hook
  halted on this repo's own fake fixture keys and named an anthropic key as openai, so it carries a
  local fix (shape order, a `check.secrets:allow` marker), with a reseed dream for the template.
  the timestamp hook has no lock-free local edit: its lock halts any drift
- a review point against the practice's own design is disputed here, never patched. the timestamp
  hook strips iso durations (`PT12:30:00`) before its scan. a duration names a span, not a moment,
  so it leaks no clock, and every real stamp still halts
  (`check.timestamps.integration` [case2]). `check.timestamps.lock.integration` [case1] passes
  against a copy of this exact hook, so the strip is the template's text, and a local edit would
  trip the lock

## .the commit, as landed

the deps commit lands first, typed `fix(deps)`. the practice's new `check.timestamps.lock` runs in
the pre-commit and checks the hook in the index, so no commit passes until the new hook is in the
index. and `git.commit.set` takes only `fix` or `feat` as a branch's first commit.

## .rework

clean — drop the commit, or move it to its own pr; no code of #748 leans on it.

## .confidence — 70%, why low

their provenance is not recorded: an upgrade or init ran before this route's execution, and no
seed names it. a human may want them in a pr of their own.

## .where

the commit stage of this route.
