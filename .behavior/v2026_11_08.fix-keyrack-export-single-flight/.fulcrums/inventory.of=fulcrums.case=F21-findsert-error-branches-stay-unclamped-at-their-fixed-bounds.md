# F21 — the findsert daemon spawn's two error branches stay unclamped at their fixed bounds

- **fork** — add integration cases for `findsertKeyrackDaemon`'s spawn-wait timeout and its
  unreachable-daemon timeout; or leave both untested at this grain
- **taken** — leave them. each bound is a module constant (spawn wait 60s, reachable wait 20s) with
  no seam: a test must either wait out a full bound per case, or add a bounds input to an exported
  sdk op that every caller passes, for the sake of a test
- **why not the cases** — the wait-past-bound mechanism is the one `withDiskMutex` gives every caller,
  and it runs for real in `genAwsProfileExport.integration.test.ts` [case9][t1] (a waiter behind a
  hung holder fails loud past its bound, via `asTimeoutError`). the reachable poll and its error
  predate this pr. what stays unclamped is findsert's own message text, a fault no caller meets on a
  healthy box, and one that names its own cure in its hint
- **rework** — clean. a `bounds` input on `findsertKeyrackDaemon`, then two cases with a 1s wait: one
  that holds the spawn key in-test, one that points the spawn at a socket path no daemon binds
- **confidence 80%, short because** — the coverage-by-grain rule asks for the error branch of a
  communicator, and a reviewer named it; this holds the line on test cost and contract shape
- **where** — the ergo-acceptance-journey-coverage lane, i003 nitpick.3
- **verdict** — held; disputed in the i003 `.taken`. the rework, with the shape of the fix, is caught as
  `.dream/v2026_11_14.fix.keyrack-findsert-daemon-error-branches-want-a-bounds-seam.md`
