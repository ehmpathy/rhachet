# rule.always.read-the-test-log-before-a-rerun

> **before you rerun a test, read the verdict its inputs already earned. rerun only when the inputs changed, or the record cannot answer.**

a verdict belongs to the code it ran against, not to the time it ran. so the key is a **codehash** — a digest of what the scope reads (src, the matched tests, their snapshots, the lockfile) plus its flags. same hash → the verdict still holds. a timestamp says only when a run happened.

`rhx git.repo.test` logs each run to `.log/role=mechanic/skill=git.repo.test/what=$what/`, and keeps no log on a pass. a codehash-keyed verdict cache is dispatched upstream as `ehmpathy/rhachet-roles-ehmpathy#790`; until it lands, the hash is derived by hand: `git diff --stat` over the scope's inputs since the last run.

## .the test

> **"what verdict did these inputs earn, and has any input changed since?"**

| the record shows | then |
|---|---|
| a pass, no input changed | cite it. no rerun |
| a fail whose cause the log names | fix the cause, or answer from the log. a rerun rerolls the same dice |
| a fail on a time budget, on a loaded host | check `uptime` first. a rerun at the same load reproduces the overrun |
| an input changed | a rerun is owed, scoped to what changed |
| no log (a pass keeps none by default) | say so; pass `--log always` where a pass must be cited |

## .enforcement

a rerun with no prior look at the record = **blocker**.

## .see also

- `rule.require.read-the-record-not-the-correlate`
- `rule.require.snapshot-verified-on-independent-run` — an independent run is owed once, not per doubt
