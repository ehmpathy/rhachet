# fulcrum F1: where a trace line goes when the repo trace log cannot be written

## .the fork
- (a) stderr, as today — reaches the pane, which the wish forbids
- (b) drop it, count the drops, report the count on the next good write — a partial failhide
- (c) a fallback per-day log under the os tmpdir; (b) only if the fallback also fails
- (d) stderr only when stderr is not a tty — in practice a detached pipe no one reads

## .taken
(c). it keeps the line durable and off the pane, and it degrades to a named gap rather than a
silent one.

## .rework
clean — one sink function, one test case. no caller depends on the fallback path.

## .confidence
70%. the wisher may prefer (b) for simplicity, or may accept stderr for this rare abnormal case.

## .where
`1.vision.yield.md` Q5; `1.vision.experience.case=4.trace-log-unwritable.md`

## .verdict
open
