# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | the spawn boot is content-addressed once per actor; a clone keeps only a reference | clean | ruled: taken (S1) | 85% |
| F2 | rhachet ships the drift command; a role declares the onStop hook | clean | ruled: the lean taken; the declaration site flagged in the pr body for the commander (S1) | 50% |
| F3 | the nudge threshold is 200 lines of delta | clean | ruled: taken (S1) | 70% |
| F4 | the nudge blocks one stop per drift hash, latched in the clone dir | clean | ruled: taken (S1) | 75% |
| F5 | the delta is per block (path-keyed), not a line diff | clean | ruled: taken (S1) | 90% |
| F6 | the command is `rhx clone boot drift --when hook.onStop` | clean | ruled: taken (S1) | 70% |
| F7 | the resume carry-over ships in this pr, not a later one | clean | ruled: in this pr only if the pr is green by the F7 gate, 2026-11-18; else a dream, landed in the done-gate commit (S1). the gate closed before green: caught as a dream | 65% |
| F8 | the clone's `claudeMdExcludes` are four globs over every brain dir door, own door included | clean | owed | 80% |
| F9 | `clone boot drift` names its clone by `--of @:<x>`, not a positional address as `clone get` does | clean | owed — flagged in the pr body | 75% |
