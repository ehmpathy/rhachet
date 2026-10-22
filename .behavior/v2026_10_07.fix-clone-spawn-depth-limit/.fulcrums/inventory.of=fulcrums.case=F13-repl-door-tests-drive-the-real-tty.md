# F13 — the repl door's tests drive the real `process.stdin.isTTY`

**the fork:** (a) the tests set `process.stdin.isTTY` in `beforeAll` and restore it in `afterAll`,
since the door reads the tty where a real call reads it · (b) add an `isTty` seam to the repl door
(a context field on `asBrainReplWithContextBound`), so a test passes the axis in.

**taken:** (a). the door's whole contract is "a call with no tty is a child one level down" (F6),
and the fact it decides on is the process's own stdin. a seam would let a caller assert a tty it
does not have — the one input this limit must not trust from a caller. the tests touch only:
- `process.stdin.isTTY`, captured before and restored in `afterAll`, which jest runs on a failed
  case too
- `process.env` depth keys — and jest hands each test file its own copy of `process.env`, so a
  write there cannot reach another file (the reason the new integration test must pass
  `env: process.env` to its child at all)

**rework:** clean — one optional context field, three test files.

**confidence:** 80%. the residual risk is a worker killed mid-file, which ends the process anyway.

**where:** `src/domain.operations/brain/asBrainReplWithContextBound.test.ts:22-40`,
`asBrainReplWithContextBound.integration.test.ts:25-43`.

## .the tmux hole — can a clone in a tmux pane read as top-level? yes, one command away

**direct path: no.** the check reads the stdin of the `rhx enroll` process, and that process
inherits the stdin of the brain's tool shell, not the pane's. measured 2026-10-19 from the `Bash`
tool of this route's own driver, an enrolled clone in a tmux pane:

- env: `TMUX=/tmp/tmux-1002/default,44780,263`, `RHACHET_CLONE_DEPTH=0`,
  `RHACHET_CLONE_SERIAL=e97a26b7-…` — a clone, in tmux
- `test -t 0` → `stdin: not a tty`

so the pane's tty reaches the brain process (via rhachet's pty), never its tool commands. a plain
`rhx enroll` or `rhx review` from that shell mints depth 1, as built.

**indirect path: yes. this is a hole, not a fork.** the same shell holds `$TMUX`, so
`tmux new-window 'rhx enroll claude …'` (or `split-window`, or any pty-wrap command) runs the
enroll on a fresh pty. its `process.stdin.isTTY` is true, so `asCloneSpawnDepth` returns 0 at the
enroll door, "whatever depth var the pane inherited" (its own `.why`). a depth-1 reviewer can
then mint a depth-0 clone, which may spawn again: the unbounded chain the wish forbids.

- not measured by a live spawn: a test would open a window in the human's tmux session. the claim
  rests on two facts: tmux allocates a pty per pane, and the code returns 0 for `door: 'enroll'`
  with `isTty` true before it reads any var (`asCloneSpawnDepth.ts:57`)
- `asCloneSpawnDepth.ts` already calls the tty read "a guardrail … not a security boundary — a
  shell that wraps a command in a pty can pass it". inside tmux that wrap is one command a brain
  can reach for, so it is no longer an edge case
- the F6 premise (a tool shell has no tty) still holds and still has no clamp (r010 i005)

**what this changes for F13:** the fork above is still (a) vs (b) for the tests, and (a) stands.
but the trust claim, that the real `isTTY` is a fact a caller cannot forge, is false for any
caller that can open a pty. so the limit's tty rule needs a fix, owed before merge:

- candidate (i): a tty mints 0 only when the caller carries no clone identity (no
  `RHACHET_CLONE_SERIAL` / depth var); a tty with a depth var reads that var + 1. this reverses
  the S1 clause "whatever depth var the pane inherited", so it goes to the wisher. ⚠️ weak: a
  `tmux new-window` pane takes the tmux server's env, not the caller's, so it likely carries no
  clone var at all and still reads as a human. it closes only a pty-wrap that keeps the env
- candidate (ii): keep S1, and add a clone-ancestry read (the parent pid chain reaches a
  rhachet-managed brain pid) so a pty spawned from a clone still counts as below it. ⚠️ a tmux
  pane's parent is the tmux server, not the clone, so a pid walk does not see it either
- candidate (iii): a clone-side mark the tmux server keeps, e.g. rhachet sets a tmux pane
  option on the pane it runs a clone in, and an enroll at a tty checks whether its own pane was
  opened from a marked one. unproven; needs a measure of what tmux records about a pane's origin
- ⇒ no candidate is known to close the tmux path for a pane that takes the tmux server's env
- either needs a clamp: an enroll under a fresh pty with `RHACHET_CLONE_DEPTH=1` set must be
  refused

## .the best-guess on the hole — candidate (i), taken

**taken:** (i), at both doors, by the commander's order to best-guess and drive on (not a halt).

- `asCloneSpawnDepth`: a tty mints 0 at the enroll door only when the env holds no parseable depth
  var. a tty that carries one reads that var + 1, as a no-tty spawn does. the repl door reads the
  var at a tty too, so a pane a clone opened stays below it at both doors
- a smudged var at a tty reads as no var, so a smudge never locks a human out
- the refusal hint moved from "a human in a pane split from a clone: run `rhx enroll` at the tty"
  (now false where that pane carries the var) to "a human in a shell a clone opened: run
  `rhx enroll` from a fresh terminal". it still names no env var

**this reverses one S1 clause**, "a tty enroll is top-level whatever depth var the pane
inherited". the wisher ruled that clause, so the reversal is flagged for the wisher, beside the
residue below.

**why (i), at the time:** it closes every pty wrap that keeps the caller's env (`unbuffer`, a
`tmux new-window` under a server whose env carries the var, a node-pty spawn) with one read and no
new state. (ii) and (iii) close no more of the tmux path and add a pid walk or a tmux probe.

**why (i) over S1 kept, once the cost to case=4 and case=6 was seen:** the two fail in different
ways. under (i) the cost lands on a human, as a loud refusal with a cure (a fresh terminal). under
S1, a clone that wraps its enroll in a pty resets to depth 0 silently, the unbounded chain the
wish names, and its "never reset to 0 on the way down" sides with (i). a loud, recoverable
refusal beats a silent reset.

**the residue, for the wisher:** a pane that takes the tmux server's env, not the caller's, carries
no clone var and still reads as a human, so a depth-1 clone can still reach depth 0 through it. (i)
does not close that; no candidate here is known to.

🔴 **the cost of (i) to a human is vision case 4's own reported block.** a human in a pane that
inherited `RHACHET_CLONE_DEPTH=0` now mints the clone at depth 1, so its guard's reviewers are
refused; a pane that inherited `1` is refused at once. the hint sends them to a fresh terminal,
where the clone is top-level. case 4 is amended to show both forms.

**the clamps:**
- unit — `asCloneSpawnDepth.test.ts`: a tty with depth 0 mints 1, a tty with depth 1 mints 2 (over
  the limit), at the enroll and repl doors; `withCloneSpawnDepthScope.test.ts` [case5]: a tty caller
  with depth 1 is refused and no brain runs
- acceptance — `enroll.reach.acceptance.test.ts`, "an enroll on a fresh pty a clone opened stays
  below that clone": [case1] the outer pty carries `RHACHET_CLONE_DEPTH=1` and the enroll is
  refused; [case2] it carries `0` and the clone is minted at depth 1. with the S1 clause restored
  (a tty mints 0 at any var), 3 of the 4 rows went red; restored, 4/4 green, and the reach file
  65/65

**rework:** clean. the change is one condition in one transformer, its rows, and the hint; a wisher
who keeps S1 reverts it in one line, and the clamps flip back with it.

**confidence:** 60%. low because it reverses a ruled clause, and because it leaves the
tmux-server-env path open, so it narrows the hole rather than closes it.

**status:** taken (i), for the wisher (S1 clause, and the residue). the test fork above stands at
(a), for the council.

**verdict:** —
