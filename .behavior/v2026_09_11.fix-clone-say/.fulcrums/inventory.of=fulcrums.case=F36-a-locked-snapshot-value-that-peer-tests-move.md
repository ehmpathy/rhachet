# F36 — a locked snapshot value that peer tests move, masked as a RE-GRAIN

**rework** clean · **status** OPEN · **confidence** 84% — the mask is one line in a shared helper, so a later reversal costs one line back

## 🔴 .this call was RE-TAKEN, and the first verdict is preserved below it

| when | the call | why it moved |
|---|---|---|
| first | **relocate the block, defer the mask** | the mask read as a LOOSEN, and a loosen is a reviewer's to accept |
| now, and SHIPPED | **mask `total` in `asSnapshotSafe`** | a second, independent `when` moved it again — see `.the re-grain` |

⚠️ **the entry read `deferred rather than masked` while the tree carried `"total": "__TOTAL__"`.** so
it was a fulcrum row that disagreed with the artifact it described, which is worse than an absent row:
a reviewer who trusts it argues against a call nobody made. the first verdict stays below rather than
overwritten — the reversal IS the record, never an embarrassment to bury.

## .the re-grain — why the loosen read was wrong

`total` counts **the whole conversation**, over a fixture every peer `when` under `[case1]` shares. so
the field is not a property of `[t7]` at all — it is a property of how many SIBLINGS said first.

⇒ **any row that locks it locks its neighbours' behavior**, which is the defect, never the guard. so
the mask does not drop a value `[t7]` asserted; it stops `[t7]` from an assertion over a value that was
never its own. that is a **re-grain** — the assertion moves to the grain that owns it — and a re-grain
does not sit on the loosen axis the first verdict measured.

⚠️ and the relocation did not hold: `[case15]` restored `total: 10` for one round, and the NEXT new
`when` moved it again. a fix that must be re-applied per author is not a fix.

## .the fork, stated fairly

`[case1] [t7]` in `blackbox/cli/clone.acceptance.test.ts` snapshots a `clone get --output json`
payload whose `total` field counts every message in the clone's conversation. so the locked value is
a function of **how many peer `when` blocks under `[case1]` said first**.

measured 2026-09-20: a new `when` that performed one `say` moved `total` 10 → 12 and reddened `[t7]`.
a `--scope name://…` run on the new block passed; only the path-wide run caught it.

⇒ the fork: **mask `total` in `asSnapshotSafe` now, or relocate the new block and defer the mask.**

## .taken, and why

**relocate the block, defer the mask.** the new block became its own `given` (`[case15]`), which
restored `total: 10` and changed **no extant assertion** — the strongest available proof that not one
value was loosened (`rule.forbid.test-intent-violations`).

the mask was rejected for this round on the SAFE/CLEAN test:

| axis | the read |
|---|---|
| **safe?** | 🔴 no. a mask drops a locked value from a shipped snapshot, which is a loosen until argued — and the argument is a reviewer's to accept, not a fix-forward's to assume |
| **clean?** | 🔴 no. `asSnapshotSafe` is shared across every blackbox suite, so a mask there re-snaps files this round never touched |

⇒ dirty on both axes, so `rule.always.fix-forward-under-scouts-honor` routes it to a dream, and the
dirt judgment routes it here.

## .the counter-argument, stated fairly

**the snapshot's own docblock says it locks *"the json key-set + the bounded `messages` shape"*** —
so `total` is payload incidental to the stated purpose, and a mask would align the artifact with its
declared intent rather than weaken it. read that way it is a **repair**, and the loosen framing above
is wrong.

⇒ the reason it is still deferred: that read is defensible and it is not obviously correct, and a
snapshot value dropped on a defensible-but-arguable read is exactly the class
`rule.forbid.test-intent-violations` exists to make someone argue for out loud.

## .rework, and why

**clean.** the mask is one `.replace()` in `asSnapshotSafe` plus one field-level assert. to land it
later touches no shipped code and no extant `given`; to reverse it costs the same line back. the
relocation taken this round is orthogonal — `[case15]` stands on its own merits (its own concern, its
own clone) whichever way the mask is ruled.

## .confidence 88%

the 12% is the chance a wisher holds that a locked payload counter is a **feature** — that `[t7]`
should redden whenever case1's message volume changes, as a coarse guard on the conversation log. a
defensible position; the counter is that the diff names `total` and never the cause, so it reads as a
shape drift and misleads the next author rather than warning them.

## .where

- `blackbox/cli/clone.acceptance.test.ts:707-719` — the `[t7]` snapshot and its stated purpose
- `blackbox/cli/__snapshots__/clone.acceptance.test.ts.snap:133` — `"total": 10,`
- `blackbox/cli/clone.acceptance.test.ts` `[case15]` — the relocation taken, with the measurement in
  its docblock
- `.dream/2026_09_20.acceptance-snapshot-locks-a-conversation-total-that-peer-tests-move.dream.md` —
  the work, with the fix shape

## .the demos that RENDER this call

NONE. no `case=N` experience demo reads a conversation `total`, so a verdict here changes no demo and
the criteria seed inherits no assertion either way.

## .the verdict

**re-taken by this drive, never ruled by the wisher.** the mask SHIPPED, on the re-grain argument
above; the wisher's seat is intact and an overrule costs one line back.

⇒ still surfaced: **is a conversation `total` inside a shape-lock snapshot a value worth locking, or
order-derived payload that belongs in `asSnapshotSafe`'s mask family?** the drive answered the second
way, after the first answer failed twice on the same axis.
