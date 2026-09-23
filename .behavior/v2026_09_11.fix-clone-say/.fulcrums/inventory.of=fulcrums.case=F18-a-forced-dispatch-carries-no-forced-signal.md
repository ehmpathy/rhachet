# fulcrum F18 — a `--force` dispatch carries no `forced` signal

surfaced by the r010 (enroll-impl-behavior-intent) L3 review of `5.1.execution.from_vision`,
item 1. a **clean**, wisher-scoped call on the machine channel's shape (it amends V8).

## .the fork stated fairly

when `--force` overrides a dirty input box, `computeCloneDispatchPrecheck` computes the
`input-region-dirty` fact, returns `proceed: true`, and discards it. `sayClone.ts` learns only
`delivered: true`; `computeCloneSayVerdict` and `asCloneSayRecord` carry no `forced` /
`overrodeDirty` field. so a `--force` that fused into a human's live text renders byte-identical
to a clean send (`computeCloneSayReport.ts` released branch), and a machine caller cannot tell a
forced-over-dirty dispatch from a clean one.

| option | the shape | cost |
|---|---|---|
| **A — current** | no `forced` field; a forced dispatch reads as a clean send | a caller cannot audit that a fusion-risk override happened; the fact the server knew is dropped |
| **B — add `forced: boolean`** | the wire ack + `CloneSayRecord` carry `forced`, set from the precheck the server already computed synchronously | a new field on the machine channel (amends V8's declared `{ delivered, verdict, reason, probe, serial, slug }`); needs a snapshot resnap of the say json |

## .taken, and why at the time

**A (current), surfaced as this fork.** the reviewer is right that B is cheap — the server knows
the fact synchronously, no content read, no Q22. but the say json shape is the wisher's declared
contract (V8), and what the machine channel carries is a vision-level call. B is **distinct from
F12** (which unfuses the delivery or reports it could not, Q22-gated); B only signals *that* a
fusion occurred. it is a lower-cost interim mitigation the F12 dream does not name — worth a
wisher call on whether it ships with this PR or waits.

## .rework, and why

**clean.** `forced` is additive — a new optional-by-construction field beside `delivered`. no
caller breaks (V13 additive-json), the only ripple is one say-json snapshot resnap. reversible.

## .confidence 65%, and why it is low

the field is cheap and the reviewer's case is sound, so the odds a wisher wants it are real —
but it amends a declared contract (V8) and sits adjacent to F12's larger unfuse question, so a
wisher may prefer to rule the two together rather than ship B alone. i did not weigh a third
option (e.g. a `forced` that rides only the human tree, not the machine json).

## .where

`computeCloneDispatchPrecheck.ts` (the discarded fact) · `asCloneDispatchAck.ts` /
`asCloneSayRecord.ts` / `computeCloneSayVerdict.ts` (the shapes that would carry it) ·
`computeCloneSayReport.ts` (the released branch that renders identical today).

## .the demos that RENDER this call

**NONE.** no `case=N` demo renders a `forced` field — the forced-dirty path is exercised at
acceptance grain (`blackbox/cli/clone.acceptance.test.ts` case9 `[t8]` region) as a `released`
with no `forced` marker, which is option A. a verdict for B adds a field the demos do not assert,
so no demo becomes an unvoted contract change.

## .the verdict

unruled. folds naturally into the F12 wisher decision (the unfuse question) — a wisher who
rules F12 should see B as the cheaper interim option.
