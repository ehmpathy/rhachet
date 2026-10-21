# F29 — the explicit-`'0'` and absent-var depth edges are held once per door at acceptance

**the fork:** (a) keep one acceptance row per door for an explicit `RHACHET_CLONE_DEPTH='0'` and one
for an absent var, and repoint the old "depth 0 is permitted" rows to the #577 case (a depth-1 work
clone spawns) · (b) also keep the old depth-0 twins beside the repointed rows, at the enroll door
and on the non-async pty.

**taken:** (a).

- under the depth cap, "depth 0 is permitted" was the one green row beside a refusal. under #577,
  depth refuses no one, so the row that proves the change is the depth-1 spawn, and that is what it
  became
- the `'0'`-is-not-absent edge stays held at acceptance: the enroll door's reviewer leaf [case3]
  sends `'0'` and asserts depth 1; `askAct.spawnDepth` [case3] sends `'0'` and [case4] sends no var,
  and each asserts depth 1; and the pty `--async` [case1] holds the tty edge, where a pane with no
  var mints depth 0. the unit
  table in `asCloneSpawnDepth.test.ts` walks every value at every door
- (b) duplicates a depth read each door already proves, on the slowest tier (the pty suite)

**rework:** clean — a twin row per door.

**confidence:** 85%.

**where:** `blackbox/cli/enroll.acceptance.test.ts`, `blackbox/cli/enroll.reach.acceptance.test.ts`.

**verdict:** —
