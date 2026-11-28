# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | the spawn boot is content-addressed once per actor; a clone keeps only a reference | clean | ruled: reversed — per clone, `boots/serial=<serial>/` (commander, #770 review) | 85% |
| F2 | rhachet ships the drift command; a role declares the onStop hook | clean | ruled: (b), a `repo=.this` role declares it in its own `hooks.yml`, the #830 pattern (driver, 2026-11-25) | 50% |
| F3 | the nudge threshold is 200 lines of delta | clean | ruled: taken (S1) | 70% |
| F4 | the nudge blocks one stop per drift hash, latched in the clone dir | clean | ruled: reversed — a systemMessage notice that never blocks (commander, #770 review) | 75% |
| F5 | the delta is per block (path-keyed), not a line diff | clean | ruled: taken (S1) | 90% |
| F6 | the command is `rhx clone boot drift --when hook.onStop` | clean | ruled: taken (S1) | 70% |
| F7 | the resume carry-over ships in this pr, not a later one | clean | ruled: in this pr only if the pr is green by the F7 gate, 2026-11-18; else a dream, landed in the done-gate commit (S1). the gate closed before green: caught as a dream | 65% |
| F8 | the clone's `claudeMdExcludes` are four globs over every brain dir door, own door included | clean | owed | 80% |
| F9 | `clone boot drift` names its clone by `--of @:<x>`, not a positional address as `clone get` does | clean | owed — flagged in the pr body | 75% |
| F10 | the husky timestamp lock is fixed at its practice, not in this tree | clean | owed — disputed at peer review | 85% |
| F11 | the new single-value clone readers keep the folder's bare `get*` names | clean | reversed at peer review: the file readers are `getOne*`, the path derivations stay bare | 70% |
| F12 | `clone boot drift` renders a tree only, with no `--output json` | clean | reversed at peer review: the inspector takes `--output json`, as the peer clone verbs do; the hook arm refuses it | 75% |
| F13 | the vision's pushback footnote names the ask it pushed back on | clean | owed — disputed at peer review | 85% |
| F14 | one drift renderer serves the inspector and the nudge | clean | owed — disputed at peer review | 70% |
| F15 | the two new spawn cases tear down their pty as the file's other six do | clean | owed — disputed at peer review | 75% |
| F16 | `show.gh.job.log` reads a job log through `gh api` with no escape flag | clean | owed — disputed at peer review | 90% |
| F17 | the boot drift file operations keep an explicit catch, not `MalfunctionError.wrap` | clean | owed — disputed at peer review | 90% |
| F18 | the render sweeps every boot revision, not only the ones a clone ref names | clean | owed — disputed at peer review | 70% |
| F19 | the drift reader re-derives the delta, not a persisted drift record | clean | owed — disputed at peer review | 70% |
| F20 | the init readout counts clones that refer to a revision, not live clones | clean | owed — disputed at peer review | 65% |
| F21 | the nudge and the inspector name block counts, not the changed brief paths | clean | owed — disputed at peer review | 70% |
| F22 | the drift command's two arms keep their own serial-to-clone lookup | clean | owed — disputed at peer review | 85% |
| F23 | the spawn boot record stays two files and an argv splice, not one record and one argv build | clean | owed — disputed at peer review | 75% |
| F24 | the hook arm's silent and speaks-again variants are proven at integration, not acceptance | clean | owed — disputed at peer review | 70% |
| F25 | the toolchain bump rides this pr, flagged in its body, not split out | clean | owed — disputed at peer review | 60% |
| F26 | the drift sweep re-parses each revision on each render, with no current-boot stamp | clean | owed — disputed at peer review | 70% |
| F27 | the init readout names the drift's reach, not its size against the threshold | clean | owed — disputed at peer review | 65% |
| F28 | drift lines count the rendered file the clone reads, header copy included | clean | owed — disputed at peer review | 75% |
| F29 | a revision's files trust the actor dir, with no re-hash on findsert and no read-only mode | clean | owed — disputed at peer review | 80% |
| F30 | the clone layer's path and dir-test owners are left as found, not unified in this pr | clean | owed — disputed at peer review | 80% |
| F31 | the show.gh.job.log integration reads the real gh api in ci, via a read-only github.token and `actions: read` | clean | owed — a council rules at the close | 75% |
| F32 | the probe skills keep `npx rhx`, not `pnpm exec rhx` | clean | owed — a council rules at the close | 85% |
| F33 | the openai stitch tests stay behind `BRAIN_LIVE_SCOPE=all` | clean | owed — a council rules at the close | 80% |
| F34 | the `rhx init +architect` snapshot holds as it is on main | clean | owed — a council rules at the close | 90% |
| F35 | the brain cli floor rises to 2.1.280, the one version the drift door was measured on | clean | owed — flagged in the pr body | 80% |
| F36 | each test-intent change rides its cause, ledgered in the pr body | clean | owed — the commander rules at review | 80% |
| F37 | the 5.3 i002 polish points kept as they are, each with its reason | clean | owed — a council rules at the close | 80% |