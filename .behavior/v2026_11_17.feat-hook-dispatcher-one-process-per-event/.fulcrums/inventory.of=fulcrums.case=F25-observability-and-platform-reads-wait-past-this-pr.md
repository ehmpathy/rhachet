# F25 — the cost instrument's test, a real bash 3.2 run, a large-payload read, and trace pids

## .the fork

peer review i008 r010 points 3, 5, 6 and 7 name gaps that grade no rule's verdict:

- the trace lines carry no pid, so seats that share one trace file interleave (point 3)
- `hooks.dispatch.cost` has no test, and derives the before shape only from a saved settings file
  (point 5)
- a clone's dispatcher settings, hand-added hook retention through the cli, and per-event sync rows
  are asserted but not snapped (point 6)
- the dispatcher has never run on a real bash 3.2, and a large Write payload's read cost is unmeasured
  (point 7)

- **(a)** close each here
- **(b)** close what pins a verdict or a human's read now; leave the rest to a follow-up pr

## .taken

(a). (b) was taken at i008; 5.3 peer review r1 graded the deferral a blocker under
`rule.forbid.deferrals-short-of-a-dedicated-pr`, since each item is small and clean. all landed at 5.3:

| item | what landed | proof |
|---|---|---|
| trace pid | each trace line reads `hooks.dispatch[$$] <event> · …` | `[t25]` one pid per call, `[t26]` six verdicts, six pids |
| cost test | `hooks.dispatch.cost.integration.test.ts`; the before shape derives from the manifest when `--before` is absent; each before hook runs under its declared timeout | `[t0]`–`[t6]`, 19 pass with the probe |
| bash 3.2 | `hooks.dispatch.bash32.probe` runs the dispatcher in `bash:3.2` against host bash 5.2 | allow, block, ask, hang: exits 0/2/0/124, byte-equal |
| large payload | the payload read is `cat` in one buffered pass, never `read -d ''` byte by byte | `hooks.dispatch.read.probe`: 1 MB read 930 → 200 ms; cost `--payload-bytes 1048576` cpu 6080 → 4800 ms |
| clone settings snap | enroll `[case2e][t3]` snaps the clone's dispatcher hooks and manifest rows | acceptance snap |
| cli retention | init.hooks `[case9]`: a hand-added hook survives a re-sync, byte for byte, and never enters the manifest | acceptance snap |
| per-event rows | the sync report lists each event's rule count under `N rules → M dispatchers` | `asHookDispatchSwapLines` unit snaps; init.full, init.hooks, boot-guard snaps |

## .rework

clean. each is an additive test, column or row, with no caller to change.

## .confidence

95%. each item is measured or snapped.

## .where

`bin/hooks.dispatch.sh` (trace lines, the read), `.agent/repo=.this/role=any/skills/hooks.dispatch.*`,
`src/domain.operations/init/hooks/asHookDispatchSwapLines.ts`, `blackbox/cli/{hooks.dispatch,enroll,init.hooks}.acceptance.test.ts`

## .verdict

closed at 5.3, all items landed.
