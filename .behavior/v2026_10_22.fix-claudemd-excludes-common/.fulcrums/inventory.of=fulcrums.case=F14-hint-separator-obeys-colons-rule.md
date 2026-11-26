# F14 — the hook-sync `hint` row reads `hint =`, and its two extant assertions move with it

## .the fork

two reviewers asked for opposite states of one row:

- r1 repo-rules, 5.3 i002 b1: `hint: …` breaks `rule.forbid.colons-in-stdout`. this diff rewrote the
  `heads` array the row sits in, so the fix-forward clause applies
- r12 enroll-verif-test-intent, 5.3 i004 b1: the change edits assertions that predate the wish
  (`asEnrolledActorsHookSyncLines.test.ts` ×2, its snapshot ×2,
  `syncHooksForLinkedRoles.integration.test.ts:300`). revert, and do the cleanup in its own pr

keep `hint =`, or revert to `hint:`.

## .taken, and why at the time

keep `hint =`. the assertions keep their intent — each still checks that the hint hangs beneath its
actor row and carries the fix text, at the same depth. only the separator moved, to the form a repo
rule mandates for a line this diff touched. a revert re-opens the r1 blocker, and that lane's budget
is spent, so the revert could never be confirmed clean.

## .rework — clean

one source line and five expectations, back to `hint:`, plus a unit resnap.

## .confidence — 80%

## .where

`src/domain.operations/init/hooks/asEnrolledActorsHookSyncLines.ts`

## .verdict

unruled.
