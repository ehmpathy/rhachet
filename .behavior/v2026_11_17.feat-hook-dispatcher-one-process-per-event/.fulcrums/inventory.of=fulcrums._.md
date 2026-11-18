# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| `F1-the-dispatcher-is-bash-not-an-rhx-boot` | the dispatcher runs as one bash process, not `rhx hooks.dispatch` | clean | ruled as taken (director, 2026-11-17) | 85% |
| `F2-every-fit-rule-runs-blockers-merge` | every fit rule runs; all blockers' stderr merge in manifest order | clean | ruled as taken (director, 2026-11-17) | 90% |
| `F3-one-label-per-event` | claude's `[<command>]` label names the dispatcher, not each rule | clean | ruled as taken (director, 2026-11-17) | 88% |
| `F4-manifest-in-the-actor-dir` | the per-actor rule manifest lives in every actor's brain dir | clean | ruled as taken (director, 2026-11-17) | 90% |
| `F5-collapse-before-the-brain-adapter` | rhachet hands the adapter one dispatcher hook per event; no adapter release | clean | ruled as taken (director, 2026-11-17) | 87% |
| `F6-unsynced-repo-actor-passes-through` | an actor derived from a repo actor with no manifest keeps the per-rule shape, unrefused | clean | open, best-guessed (execution) | 88% |
| `F7-a-rule-times-out-at-its-declared-timeout` | the watchdog enforces a rule's declared timeout in seconds; the adapter's ms value had made it a no-op | clean | open, best-guessed (execution) | 85% |
| `F8-worktree-files-of-another-upgrade-stay-out` | files another inflight upgrade left in the worktree stay out of this change's commit | clean | open, best-guessed (peer review) | 90% |
| `F9-the-pushback-footnote-names-the-overturned-decision` | the pushback footnote names the issue's node dispatcher shape and the read that overturns it | clean | open, best-guessed (peer review) | 92% |
| `F10-the-manifest-seed-rides-the-adapter-read` | the manifest adapter seeds an absent manifest inside its rule read, a findsert of the file | clean | open, best-guessed (peer review) | 80% |
| `F11-the-dispatcher-sets-no-errexit` | the dispatcher reads every exit code as data, so it sets no `set -euo pipefail` | clean | open, best-guessed (peer review) | 85% |
| `F12-the-rule-file-lookup-reuses-rhx-discovery` | the sync finds each rule file with the same discovery `rhx` runs | clean | open, best-guessed (peer review) | 88% |
| `F13-a-timed-out-rule-kills-only-its-own-pid` | the watchdog kills only the rule's own pid; no `pkill -P`, no process group | clean | open, best-guessed (peer review) | 85% |
| `F14-a-rule-crash-keeps-its-non-block-verdict` | a rule's crash keeps its own non-block exit; only the dispatcher's own fault exits 2 | clean | open, best-guessed (peer review) | 88% |
