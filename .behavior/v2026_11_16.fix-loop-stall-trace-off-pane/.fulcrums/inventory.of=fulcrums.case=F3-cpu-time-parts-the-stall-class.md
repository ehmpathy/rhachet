# fulcrum F3: cpu time on the stall line as the measurement of who owns the stall

## .the fork
- (a) guess a cure now (e.g. make the tty mirror write async) on the premise the daemon blocks
  itself — a mechanism inferred from an outcome
- (b) accept "box load" from the wish and cure no stall cause
- (c) add the process cpu time spent within the stall to the line, so the next stall names its
  class; cure only what that read names

## .taken
(c). the wish makes the daemon-owned cure conditional on the trace read; the extant line cannot
answer that read, so the line must first carry the fact that can.

## .rework
clean — a suffix on one line and its test.

## .confidence
70%. cpu time parts on-cpu self-work from off-cpu waits, but it cannot part a starved loop from a
blocked sync syscall (both are off-cpu). if the wisher wants that second split now, it needs a
further measure (e.g. per-thread scheduler stats). and `process.cpuUsage()` is process-wide (gc,
threadpool, node-pty threads), so unless a main-thread measure is available the suffix overstates
the loop's own work (yield A3).

## .where
`1.vision.yield.md` Q2; `1.vision.experience.case=2.operator-reads-the-stall-class.md`

## .verdict
open
