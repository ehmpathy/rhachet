# fulcrum F2: thread a daemon sink, vs change the shared default

## .the fork
- (a) make `getCloneTraceSink` itself log-only — one edit, but it also changes the stderr of
  client processes (`invokeCloneSay`, `invokeCloneGet`) that are not daemons
- (b) the pty host builds one log-only sink and threads it into the socket server, screen feed,
  and write queue; daemon-side seams take it as a required input

## .taken
(b). it holds the scope to the daemon, and a required seam lets the compiler refuse a daemon site
that names no sink.

## .rework
clean — the seams already exist (`trace`, `traceToStderr`, `traceFault`); only the default and the
wire change.

## .confidence
85%. the blueprint may find a client site that also paints a pane (a clone that runs `clone say`
from inside its own pane writes to tool output, not the tty, so it should not).

## .where
`1.vision.yield.md` Q3

## .verdict
open
