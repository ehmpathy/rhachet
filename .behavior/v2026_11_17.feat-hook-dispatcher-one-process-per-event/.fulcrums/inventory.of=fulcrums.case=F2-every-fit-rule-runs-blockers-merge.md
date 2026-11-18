# F2 — every fit rule runs; blockers merge

## .the fork
- (a) stop at the first exit 2, print that rule's stderr
- (b) run every fit rule, print every blocker's stderr in manifest order, exit 2

## .taken
(b).

## .why
today claude runs every matched hook in parallel and the seat reads every refusal from one call.
(a) would hide all but one fix, which costs the seat a retry per hidden rule; it narrows a behavior
the wish says must hold.

## .rework
clean — one branch in the merge.

## .confidence — 90%
the issue lists "aggregates all blocks — a choice to make"; parity with today decides it.

## .where
`1.vision.experience.case=3.many-rules-block.md`

## .verdict
open.
