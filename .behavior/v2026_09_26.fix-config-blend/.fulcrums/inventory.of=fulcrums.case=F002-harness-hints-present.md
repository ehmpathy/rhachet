# fulcrum F002 — four harness throws the lane read as hintless

## .the concern

`mech-failhides` nitpick.1 (r002, i002.137e857b): four `MalfunctionError` throws in
`blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` lack a `hint`, so a developer learns what
broke but not how to fix it.

## .the facts, measured against the code

each throw carries a `hint` in its metadata today:

| site | hint |
|---|---|
| line 193, 'when step returned no value' | *"the step fn must return its value synchronously; an async fn returns a promise, never null"* |
| line 441, 'enroll made no actor dir' | *"read the enroll stderr above; a refused enroll (floor, flag) writes no actor dir"* |
| line 645, 'door 1 is not open: CLAUDE.md -> AGENTS.md' | *"the prior init step should open this door; read its stdout for a brain dir failure"* |
| line 890, 'the [t3] clone never compacted' | line 898: *"read the screen tail: a credit or auth notice there means the brain never ran /compact"* |

the lane's snippet shows a single-line form (`{ label }`), which is the shape before the i002 repair;
the tree holds the multi-line form with the hint.

## .why it is fine to continue

the rule asks for an actionable hint on each throw, and each throw has one. there is no change to
make.

## .what the council decides

whether the four hints above satisfy `rule.require.failloud` (the driver holds that they do).
