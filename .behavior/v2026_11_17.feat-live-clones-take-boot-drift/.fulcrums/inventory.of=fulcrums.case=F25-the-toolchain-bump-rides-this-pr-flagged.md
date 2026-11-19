# F25 · the toolchain bump rides this pr, flagged in its body, not split out

## .the fork

- **a.** keep the toolchain bump that `9ae6fb95` carries (role and declapract bumps, the
  `prepare:rhachet` build step and its two added roles, the two husky checks, the `.gitattributes`
  and `.gitignore` edits, the `boot.yml` `not` globs, two reseed dreams, and the snapshots
  `24767f36` resnapped for the role bump) in pr #770, and list it under its own section of the pr
  body so the commander reviews it apart from the feature
- **b.** split it into a chore commit on its own pr, merged first, and rebase this branch onto it

## .taken = a

- the bundle is pushed on #770, so a split rewrites pushed history and needs a force push plus a
  second pr; both are acts the route did not ask for, and each costs commit quota the tree does not
  hold
- the one harm the bundle carried, `rhachet-artifact-git` moved to `devDependencies`, is repaired
  in this round and clamped by `src/package.runtime-deps.integration.test.ts`, which fails on any
  shipped import whose package is not a runtime dependency
- the rest ships no behavior a consumer meets: role bumps, repo-local hooks and dev config
- the pr body names every item of the bundle under "outside the feature", so a reviewer reads the
  feature diff and the chore diff as two subjects

## .rework = clean

a chore branch cut from `ab294f4a` with the bundle's files, merged first, then this branch rebased
onto it; no contract moves, only where the commits sit.

## .confidence = 60%, why

the commander may hold a one-subject pr as a standard for a p0 review, and a split is cheap for a
human to ask for; the call turns on whether a history rewrite of a pushed pr costs less than a
mixed diff, which is the commander's to weigh.

## .where

pr #770, commits `9ae6fb95` and `24767f36`. answers r11.blocker.2 (level 3, i006).

## .verdict

owed — a council rules at the close.
