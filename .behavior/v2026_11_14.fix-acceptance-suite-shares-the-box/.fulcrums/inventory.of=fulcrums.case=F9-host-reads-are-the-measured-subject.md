# F9 — the suite's host reads are its measured subject, not an agent's ambient read

## .the fork

`rule.forbid.reads-outside-the-repo` forbids a read of host state outside the repo — `/proc`,
`loadavg`, a temp root. this behavior's test infra and its measure skill read exactly those:
cpu psi and load (`getOneBoxPressureNow`, the measure skill), `/proc/<pid>/environ|cmdline|cwd`
(`getAllProcessesWithEnvMark`), and the os temp root (`getOneResidueFromBefore`). the reads may
stay, or be removed and the behavior scoped without them.

## .taken, and why

keep them. the rule binds an agent's own ad hoc reads — the cue it closes is a driver that peeks
at `/proc/loadavg` to size a run. here the box is the subject the wish names:

- the wish's done-when is a run that "holds load and cpu pressure inside the bound", with before
  and after numbers in the pr. psi and load are the bound itself
- the director's F2 verdict orders a measured peer slowdown at 25% and 50% width. the measure
  skill is that instrument, committed and reviewable, which is the form the reads rule itself
  sanctions over an inline read
- the leak sweep must find the run's processes; their env is the only mark every hop carries
  (Q6). a process table read is the sweep
- the residue notice must count what earlier runs left in the temp root (vision case 8)
- prod already reads `/proc` for its own work (`getLoginSessionId`, `getSocketPeerCred`)

no read sizes a run from host capacity: width is a fixed share of the cores, and an explicit
`--maxWorkers` wins.

## .rework

clean — each read sits in one named operation. to drop one drops the lever that names it (the
starved note, the leak sweep, the residue notice, the measure).

## .confidence — 75%, why not higher

the rule says "there is none" of its exceptions, and a reviewer may read it literally. the
wisher may prefer the rule amended by name rather than a fulcrum that reads its scope.

## .where

`blackbox/.test/infra/getOneBoxPressureNow.ts`, `getAllProcessesWithEnvMark.ts`,
`getOneResidueFromBefore.ts`, `.agent/repo=.this/role=any/skills/measure.acceptance.share.ts`.

## .verdict

confirmed (director, 2026-11-16) — the host reads stay, as the measured subject.
