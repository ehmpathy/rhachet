# F24 — the pty and `--async` success legs assert the depth they record, never a snapshot

**the fork:** (a) the success legs of "an enroll on a fresh pty a clone opened" and "an `--async`
enroll at a terminal" assert `ready`, the exit code, and the depth and mark the child dumped ·
(b) also snap the masked pty output of each success leg.

**taken:** (a).

- the success render is the extant `rhx enroll` render — its tree, its breadcrumb, the async
  handoff line — which this pr does not change, and which `enroll.acceptance` already snaps on a
  piped stdio
- the facts these legs add are values, not a render: the depth and the leaf mark the child read.
  an assert on each value fails loud on a drift; a snapshot of a pty adds a spinner, a cursor
  dance and a serial to mask, and its diff would bury the one value that matters
- the refusal leg renders a NEW output — the leaf refusal at a pty — so it is snapped

**rework:** clean. one masked `toMatchSnapshot()` per leg.

**confidence:** 85%. `rule.require.acceptance-journey-coverage` asks for a snapshot on every
journey a human reads; whether an unchanged extant render owes a second pty snapshot is the
council's call.

**where:** `blackbox/cli/enroll.reach.acceptance.test.ts`.

**verdict:** —
