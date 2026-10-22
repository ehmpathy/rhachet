# F6 — an enroll with an interactive tty on stdin mints a top-level clone

**the fork:** how does an enroll tell a human's act from a brain's, when the human's shell
inherited a clone's `RHACHET_CLONE_DEPTH`? (a) a tty on stdin → depth 0 · (b) an explicit flag,
e.g. `rhx enroll --as-top` · (c) no signal — tell the human to open a fresh terminal.

**taken:** (a). it fixes the reported block with no new flag for the human to learn: a human at a
keyboard always has a tty, a brain's tool shell never does, so every brain-run enroll (a guard's
reviewers above all) still counts depth.

**rework:** clean — one input to `asCloneSpawnDepth`, read once in `invokeEnroll`, and passed to
the detached host for `--async` (the host has no tty, so it must not re-decide).

**confidence:** 75%. (1) the premise that a brain's tool shell has no tty is **measured
2026-10-07**: from the `Bash` tool of `@:mechanic` — an enrolled clone that itself runs in a pty —
`test -t 0` exits 1. a guard's enroll runs under that same shell. a future claude-code that gives
its tools a tty would let a brain reset its own depth; the 5.3 tests must hold this premise. (2) a human's `!rhx enroll` inside a clone session, or a piped `rhx enroll`, has no tty and
still counts depth (Q7b). (b) would cover both, and could be added beside (a).

**where:** `src/contract/cli/invokeEnroll.ts:269`, `asCloneSpawnDepth.ts`,
`genCloneEnrollDetached.ts`.

**verdict:** ruled by the wisher (S1) — (a), and widened: a tty is depth 0, and no tty is depth
1. an absent depth var on a no-tty caller no longer reads as top-level; it reads as a depth-0
caller, so its child is depth 1. (2) above is settled the same way: a `!rhx enroll` or a piped
enroll is one level down, by design.
