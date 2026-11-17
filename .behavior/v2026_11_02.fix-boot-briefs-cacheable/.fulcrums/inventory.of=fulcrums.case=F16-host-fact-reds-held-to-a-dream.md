# F16 — the host-fact acceptance reds are a host defect, held to a dream, not fixed in this tree

## .the fork

a full local acceptance run went red on 90 tests this branch never touched. each traces to one fact of
this host, and none to a line of this branch:

| host fact | suites | tests | cause |
|---|---|---|---|
| the worktree path is long | five `blackbox/sdk/keyrack.*` | 89 | `connect EINVAL`: the daemon socket path (~165 chars, built under this worktree's long name) passes the ~108-char unix `sun_path` cap |
| the node on PATH is not the `.nvmrc` pin (v22.21.0) | `importEsmSafe.realnode` | 1 | the cjs namespace keys hold `"module.exports"`, a key the snapshot's node did not emit |

main's diff leaves every one of these files as it is, and main's ci is green at `6e3b677` (`release`,
`provision` both `success`), where the checkout path is short and node is the pin.

- **A** — a host defect: name the cause per fact in a dream, and drive on
- **B** — fix the keyrack fixtures here: a short `XDG_RUNTIME_DIR` per test, 47 sites across 8 files
- **C** — rename the worktree to a shorter path and rerun

## .taken

A. the reds are a defect of the host, not of this tree, so they hold no stone. B is safe but not clean:
it reaches into a domain this branch does not touch, across 8 files main also owns, and adds merge
surface to a tree whose merge is held (F11). C is a workaround: it quiets the fact for this run and
leaves it for the next long-named worktree. the dream holds each fix's shape.

## .rework

clean: each fix lands as its own change, with no caller in this branch hardened against the current
fixtures.

## .confidence — 90%

the socket cause is measured (the path in the log). the node cause rests on the received key, a shape
the pin does not emit; the host's node version itself was not read.

## .where

- `blackbox/sdk/keyrack.*.acceptance.test.ts`
- `blackbox/sdk/importEsmSafe.realnode.acceptance.test.ts`
- dream `.dream/v2026_11_04.fix.acceptance-reds-a-long-worktree-path-and-a-node-version-cause.md`

## .verdict

settled 2026-11-04 by the director: a host defect, not a wisher call. named per host fact in its dream;
the drive goes on.
