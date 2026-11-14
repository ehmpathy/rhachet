# F19 — the onStop mod check runs outside the budget memo

## .the fork

the vision and blueprint row 158 have the version pester ride the budget sweep "memoized by
fingerprint", and the blueprint adds `.agent/repo=.mods/**` to that fingerprint. does the mod check
sit inside the memo, or beside it?

- **a — beside it, unmemoized** (taken): `getAllRoleModDriftsOfSoundMods` runs on every stop, ahead
  of the budget verdict
- **b — inside it**: the fingerprint grows `.agent/repo=.mods/**`, and the check runs only when the
  fingerprint moves

## .taken, and why

a. the pester fires on a version change, and a version change lands in `node_modules`, never under
`.agent/`. `getOneRepoThisBootFingerprint` hashes the `.agent/repo=.this` role files; with
`.agent/repo=.mods/**` added it still sees no upgrade. so b would memo a "no drift" verdict and skip
the check on the first stop after `rhx upgrade` — the one stop the pester exists for. b with the
installed role versions folded into the fingerprint would hold, at the cost of a package.json read
per modded role on every stop, which is the check itself.

the vision's aim — "costs naught on a stop where naught changed" — holds under a without a memo: no
mod dir is one readdir; a mod is fs reads alone (its plan, its view links, one package.json), and
never the tokenizer the memo exists to skip.

## .rework

clean. a move inside the memo is a fingerprint input plus one guard; no contract or caller moves.

## .confidence — 92%, and why it is short of 93

- the per-stop cost with mods is reasoned from the code path (fs reads, no tokenizer), not timed on a
  large role

## .risk

low — no credential, no prod write. a wrong call costs a few fs reads per stop in a repo with mods.

## .where

- `src/domain.operations/mods/getAllRoleModDriftsOfSoundMods.ts` (`.note` on why it is never memoized)
- `src/contract/cli/invokeRolesCost.ts` `invokeRolesCostForHook`
- `3.3.1.blueprint.product.yield.md` row 158; `1.vision.yield.md` line 192

## .verdict

moot — F23 (b), the director, 2026-11-09 (seed S9), removed the onStop mod check; no mod check
rides the stop, in or beside the memo.
