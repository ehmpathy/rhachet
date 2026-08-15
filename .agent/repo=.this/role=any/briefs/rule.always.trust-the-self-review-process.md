# rule.always.trust-the-self-review-process — self-reviews have zero overrules

## .what

when a bhrain **self-review** guard bounces you (`review.self N/M`, "the pond barely rippled"), you do
**not** escalate, do **not** `--as blocked`, and do **not** ask the human for an out. you keep up genuine,
deeper self-review passes and re-run `--as promised --that <slug>` until the guard lets you through. the
self-review gate has **no overrule path** — the only way past it is a real review.

## .why

- **the human said so, directly:** "there are zero overrules for self review. you have to trust the
  process." and: "just do the self reviews ... keep thinking and promising until they let you through."
- the ripple wall ("the pond barely rippled") is **passable by substance, not by escalation**. each
  bounce is the guard's signal that the pass was too shallow — go find a *real* new issue, or articulate
  a genuinely deeper reason it holds.
- a request for an out (a human `--as overruled`, a `--as blocked`) does not exist for this gate. a plea
  for one wastes the human's attention on a door that has no key — the door only opens from the inside,
  by review.

## .how to apply

when a self-review bounces:

1. **new lens each pass** — do not re-summarize. shift the angle: marker-level → byte-level (trace what
   a codepath actually enforces, not what it is named) → fine-print (the vision's edge-case table + frame
   diagram parentheticals) → …. a shallow re-summary bounces; a real finding passes.
2. **fix, then articulate** — when you find an issue, FIX it in the artifact first, then articulate how.
   when you find none, articulate a deeper, specific why-it-holds.
3. **write to the EXACT path the guard prints** — its `rN` prefix increments on a bounce (r1 → r2 → r3…);
   the guard assigns the level, you copy the `articulate into` path verbatim (see the level pitfall in
   `howto.run-self-reviews`).
4. **re-run** `rhx route.stone.set --stone <stone> --as promised --that <slug>`. repeat until it advances.

## .a bounce does NOT demand an edit — only a true review

the ripple wall ("the pond barely rippled") is easy to misread as "keep up deletions/changes until
one sticks." that is wrong and produces **spurious edits** the wisher will reject. the guard wants a
**true, thorough review** — which may legitimately conclude "no change needed," as long as you
**enumerate what you reviewed** and articulate why each item holds.

hard-won corrections (from a real drive where i over-cut):

- **it is fine to NOT act.** a review that questions every component and keeps them all — each with a
  specific why-it-holds — is a complete review. do not manufacture a deletion to create a ripple.
- **no spurious edits.** do not alter the artifact just to look busy. an edit must be a genuine
  improvement, not a ripple-generator. a revert of a spurious edit beats a keep of it.
- **only true reviews.** a real finding passes; a manufactured one wastes the wisher's attention and
  churns the artifact.
- **in the promised artifact, just enumerate what you reviewed.** list each component/feature, the test
  you applied, and the outcome (deleted / kept-because-X). the enumeration IS the substance the guard
  reads — not the count of edits.

### delete-first, applied honestly (what actually holds up)

- a **named domain transformer around a primitive is legitimate** — e.g. `genCloneSerial` for a uuid.
  it is the named seam where a format could evolve, and it reads as domain vocabulary at the callsite.
  do NOT delete it as "just a uuid wrapper."
- **two per-brain lookups can coexist** — e.g. `getSupportedBrainCommand` (which command) and
  `getBrainSocketCapability` (can it socket) answer distinct questions with distinct shapes. a fold into
  one is not automatically better.
- **do NOT over-consolidate paths** — keep `getActorDir` and `getCloneDir` apart: sometimes a caller
  (`actor list`) needs only the actor path and has no serial. a single path oracle that forces a serial
  is a worse contract. distinct inputs → distinct transformers.

## .the distinction

- **self-review gate** (this rule) — no overrule; trust the process; keep the promises coming with real
  passes.
- **peer-review exhaustion** — a *separate* mechanism with its own terminal verdicts. this rule does NOT
  govern that; it governs only the self-review gate.

## .supersedes

any earlier note that said "cap attempts, escalate for human `--as overruled`" **for a self-review** is
wrong and superseded by this rule. that guidance may apply to peer-review budgets, never to the
self-review gate.

## .see also

- `.agent/repo=bhrain/role=driver/briefs/howto.run-self-reviews.[guide].md` — the flow + the level pitfall
- `.agent/repo=bhrain/role=driver/briefs/howto.drive-routes.[guide].md` — status commands
