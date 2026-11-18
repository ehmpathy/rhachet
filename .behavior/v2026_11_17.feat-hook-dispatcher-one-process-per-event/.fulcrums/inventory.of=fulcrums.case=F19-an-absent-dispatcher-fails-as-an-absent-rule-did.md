# F19 — an absent dispatcher file fails as an absent rule did

## .the fork

with no `node_modules`, `bash ./node_modules/rhachet/bin/hooks.dispatch.sh` exits 127, which
claude reads as non-blocking. should the sync preflight the dispatcher file?

- **(a)** no preflight: the absent-file case fails as it did before this pr
- **(b)** a sync-time check that the file exists

## .taken

(a). the review's premise, that bash rules used to survive without `node_modules`, does not hold:

- every role hook file sits under `.agent/repo=*/role=*/`, and each `skills` or `inits` dir there
  is a symlink into `node_modules/.pnpm/…` (read 2026-11-18,
  `.agent/repo=ehmpathy/role=mechanic/skills`)
- the hook commands rhachet wrote before this pr were `./node_modules/.bin/rhx …` or a path under
  those symlinks

with no `node_modules`, each of those exited 127 too, so no shape change happens here.

a sync preflight would also prove little: the sync itself runs from that same `node_modules`, so
the dispatcher file is always present when the sync runs. the gap appears only when
`node_modules` is removed afterward.

## .rework

clean: a `statSync` of `HOOK_DISPATCH.bin` in `setHookDispatchersForTarget`.

## .confidence

88%.

## .where

`src/domain.operations/brains/dispatch/constants.ts` (`HOOK_DISPATCH.bin`)

## .verdict

open, for the director at the pr.
