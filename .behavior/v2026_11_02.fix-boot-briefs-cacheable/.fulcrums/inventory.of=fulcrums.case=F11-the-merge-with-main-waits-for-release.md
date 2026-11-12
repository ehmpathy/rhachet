# F11 — the merge with main waits for release

## .the fork

origin/main moved two commits past this tree's base: #649 (enroll a role at a subject focus) threads
`subjects` through `setBrainDirBoot`, and main carries its own live-brain gate
(`describeBrainLiveOnDemand`), weave model, and dep bumps. 302 files differ; this tree touches about 30
of them. every change here is uncommitted, and the paved rebase refuses a dirty tree.

- **A** — integrate now: a checkpoint commit, a rebase, conflicts settled (main's live-brain gate over
  this tree's flag; `subjects` threaded through the cache-order render)
- **B** — integrate by patch: save the diff, reset to main, reapply
- **C** — hold: 5.1 stays on its base; the merge waits for release time

## .taken

C, by the wisher (S4).

## .what the merge owes, so it is not lost

- `asRoleRefsInCacheOrder` generic over the ref type, so `subjects` rides through; `renderOne` passes
  `ref.subjects`; a clamp that a focused role renders only its subjects in either group
- main's `describeBrainLiveOnDemand` wins over `RUN_LIVE_BRAIN_TEST`; this tree's flag, its rule brief,
  and the seven suite gates drop; F10 is superseded
- the dep bumps, `invokeInit` [case2][t0], and `getContextOpenAI` take main's side
- the full tiers re-run on the merged tree

## .rework

dirty at merge time, by nature: two trees edited `setBrainDirBoot` and the live-brain suites. the list
above is the whole of it.

## .confidence — n/a

a verdict, not a guess.

## .where

- `src/domain.operations/boot/setBrainDirBoot.ts`, `asRoleRefsInCacheOrder.ts`
- `src/.test/infra/RUN_LIVE_BRAIN_TEST.ts` and the seven gated suites

## .verdict

C, held to release by the wisher (S4)
