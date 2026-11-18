# F18 — the manifest takes one whole write per hook, as settings did

## .the fork

the sync writes the manifest once per hook change, through the per-hook adapter contract. should
it buffer one write per brain?

- **(a)** one atomic write per hook change, through the `BrainHooksAdapter` dao (get, set, del per hook)
- **(b)** one buffered write per brain, through a new batch contract

## .taken

(a). before this pr, the sync wrote `settings.json` through the same per-hook dao, one
read-modify-write per hook. the window the review names (a changed command, deleted then re-set)
existed there in the same shape. so (a) carries today's behavior, as the wish requires.

each manifest write is whole (temp then rename), and a seat never reads half a file. the
post-sync rederive (`setHookDispatchManifestRederived`) and the swap each land in one write.

(b) changes the `BrainHooksAdapter` contract that every brain supplier implements. that is a
cross-package contract change, owed its own pr if it is wanted.

## .rework

dirty: a batch method on the adapter contract and on every supplier.

## .confidence

82%.

## .where

`src/domain.operations/brains/dispatch/genBrainHooksAdapterViaDispatchManifest.ts`,
`src/domain.operations/brains/syncOneRoleHooksIntoOneBrainRepl.ts`

## .verdict

open, for the director at the pr.
