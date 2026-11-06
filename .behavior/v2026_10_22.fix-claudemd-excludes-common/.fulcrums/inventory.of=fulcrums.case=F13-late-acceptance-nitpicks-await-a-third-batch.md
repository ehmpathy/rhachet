# F13 — the l3 acceptance nitpicks wait on the commander's word for a third batch

## .the fork

the 5.3 l3 lanes (i004) raised ten nitpicks, every one in an acceptance test or its snapshot:

| lane | nitpick | the change it asks |
|---|---|---|
| r10 n1 | no acceptance assert that git ignores the grove link after the untrack | a new `[case9]` assert |
| r10 n2 | `rhx upgrade` has no journey with a tracked grove link | a new journey |
| r10 n5 | the teammate pull is proven at integration only | a new journey |
| r10 n3 · r11 n2 | `enroll` rewrites the committed file and names no drop | an enroll stdout row, plus a resnap |
| r10 n4 · r11 n4 | the two masked homes render as identical `[case9]` rows | distinct tokens, plus a resnap |
| r11 n1 | `[case9]` splices two slices with a blank line | a whole-stdout snap |
| r11 n3 | the `[case2f]` file snap carries `deny` and `ask` noise | counts for each, plus a resnap |
| r11 n5 | `[t3.0]` keys `baseline` / `actual` | rename, plus a resnap |

fix them here, or hold them for the commander.

## .taken, and why at the time

hold them for the commander's word. each one needs a new acceptance run, and the batch rule
(2026-11-06) asks that acceptance runs land together, one resnap batch then one independent batch,
since each lifts a modal the director seat answers by hand. the rule batches runs; it does not cap
them, and ci runs the full tier. so the ask is: land all ten together, in one more pair of batches,
here or in their own pr.

r11 n1 claims a render contradiction (`✨ hooks └─ no changes needed` above the 🧢 drop rows). the
source holds no contradiction: the `✨ hooks` tally counts hook upserts (`syncHooksForLinkedRoles.ts`
lines 194–217), and an exclude drop is a settings rewrite the 🧢 block reports on its own rows.

## .rework — clean

test and snapshot edits, plus at most one stdout row in enroll; none moves a contract.

## .confidence — 70%, and why it is low

the batch rule is no gate, so a council may read these as owed now, in one more batch pair.

## .where

`blackbox/cli/init.hooks.acceptance.test.ts`, `blackbox/cli/enroll.acceptance.test.ts`,
`blackbox/cli/brain-dir-boot.journey.acceptance.test.ts`, and their snapshots

## .verdict

ruled 2026-11-06 by the commander: the ten go to their own follow-up pr and do not hold this one.
caught as `.dream/v2026_11_06.fix.acceptance-snapshot-nitpicks-from-claudemd-excludes.md`.
