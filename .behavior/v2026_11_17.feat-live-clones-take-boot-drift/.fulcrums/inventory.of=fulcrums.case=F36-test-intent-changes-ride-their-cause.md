# F36 · each test-intent change rides its cause, ledgered in the pr body

## .the fork

- **a.** change the assertion where the wish or a recorded review concern reverses the behavior, and
  list each change with its cause in the pr body for the commander
- **b.** keep each prior assertion as its own test beside the new one, per r12 (5.3, i002)

## .taken = a

option b would keep a test green on a behavior this pr removes on purpose, so it would assert a lie.

| r12 row | the change | its cause |
|---|---|---|
| 1 | `CLAUDE_CODE_DISABLE_CLAUDE_MDS` absent; the add-dir var set | the wish: the drift reaches a clone only through the add-dir `CLAUDE.md` |
| 2–4 | own doors excluded, four globs, no host path | F8 |
| 5 | the boot is read from `boots/sha256=…/`; the first boot holds still | the wish: the cached system prompt stays whole |
| 6 | the vendor door reads no brief; `/compact` brings the new text | the wish, and r8.blocker.1 (5.3, i001) |
| 7 | floor 2.1.280 | F35 |
| 8 | the stitch tests run under `BRAIN_LIVE_SCOPE=all` | F33 |
| 9–11, 14 | the drift readout copy and the fault header | r6 blockers 1–2 and nitpicks (5.3, i001); these tests never shipped |
| 12 | a malfunction with no errno cause rethrows | the sweep's fault allowlist (5.1 review); the old input lives on as [case2b] |
| 13 | a gone revision is a caution, never a fault, so `rhx init` exits 0 | a respawn is its cure, not a re-run of init; clamped by `syncAndReportBrainDirBoots.integration` [case5] |

## .rework = clean

restore any one row's prior assertion beside the new one; no contract moves.

## .confidence = 80%, why

each row ties to a stated cause, but rows 2–4, 7 and 8 rest on fulcrums a human has not ruled.

## .where

the tests r12 names. answers r12 blockers 1–14 (5.3, i002).

## .verdict

owed — the ledger rides the pr body; the commander rules at review.
