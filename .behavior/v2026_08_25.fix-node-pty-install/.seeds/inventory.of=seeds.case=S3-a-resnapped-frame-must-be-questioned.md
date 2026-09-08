# seed S3 — a snapshot that reads as a regression IS one, until proven otherwise

## .said — verbatim, 2026-09-02

> also why does this snapshot look like its a regression? blackbox/cli/__snapshots__/rhx.acceptance.test.ts.snap

and, on the next file:

> and here? …/blackbox/cli/__snapshots__/actor.acceptance.test.ts.snap

## .settled

**a resnap is an assertion that the new frame is CORRECT. a frame that reads wrong is a defect
the resnap laundered into an expectation.**

both flagged snapshots were genuine regressions. the mechanism is the part worth a record:

🚨 **an acceptance fixture that symlinks the repo's own `node_modules` inherits that tree's
health at the moment the snapshot is taken.** a resnap run mid-install captures a broken tree and
records the breakage as expected — and every later run then agrees with it.

the two tells, and both were present:

| tell | what it looked like |
|---|---|
| a frame that contradicts its own `given` | `[case1]` asserted *"repo not linked"* under a given that says **linked** |
| a frame that lost its content | `[t0]` snapped to `""`; `[t6]` no longer drove its own unknown-role path |

⇒ the discipline: **before a resnap, prove the tree is healthy; after one, read every changed
frame against its own `given`.** a diff that is purely additive needs neither check — a diff with
deletions needs both.

## .landed

- `blackbox/cli/__snapshots__/rhx.acceptance.test.ts.snap` — re-captured, 60/60
- `blackbox/cli/__snapshots__/actor.acceptance.test.ts.snap` — re-captured, 28/28
- the extant rule this instances: `rule.forbid.blanket-resnap-after-rebase`
