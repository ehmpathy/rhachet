# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| `F1-the-dispatcher-is-bash-not-an-rhx-boot` | the dispatcher runs as one bash process, not `rhx hooks.dispatch` | clean | ruled as taken | 85% |
| `F2-every-fit-rule-runs-blockers-merge` | every fit rule runs; all blockers' stderr merge in manifest order | clean | ruled as taken | 90% |
| `F3-one-label-per-event` | claude's `[<command>]` label names the dispatcher, not each rule | clean | ruled as taken | 88% |
| `F4-manifest-in-the-actor-dir` | the per-actor rule manifest lives in every actor's brain dir | clean | ruled as taken | 90% |
| `F5-collapse-before-the-brain-adapter` | rhachet hands the adapter one dispatcher hook per event; no adapter release | clean | ruled as taken | 87% |
| `F6-unsynced-repo-actor-passes-through` | an actor derived from a repo actor with no manifest keeps the per-rule shape, unrefused | clean | open, best-guessed | 88% |
| `F7-a-rule-times-out-at-its-declared-timeout` | the watchdog enforces a rule's declared timeout in seconds, the limit claude applied per hook before (the published adapter writes seconds) | clean | taken | 95% |
| `F8-worktree-files-of-another-upgrade-stay-out` | files another inflight upgrade left in the worktree stay out of this change's commit | clean | open, best-guessed | 90% |
| `F9-the-pushback-footnote-names-the-overturned-decision` | the pushback footnote names the issue's node dispatcher shape and the read that overturns it | clean | open, best-guessed | 92% |
| `F10-the-manifest-seed-rides-the-adapter-read` | the manifest adapter seeds an absent manifest inside its rule read, a findsert of the file | clean | superseded: the seed is an explicit migrate step | 80% |
| `F11-the-dispatcher-sets-no-errexit` | the dispatcher reads every exit code as data, so it sets no `set -euo pipefail` | clean | open, best-guessed | 85% |
| `F12-the-rule-file-lookup-reuses-rhx-discovery` | the sync finds each rule file with the same discovery `rhx` runs | clean | open, best-guessed | 88% |
| `F13-a-timed-out-rule-kills-only-its-own-pid` | the watchdog kills only the rule's own pid; no `pkill -P`, no process group | clean | open, best-guessed | 85% |
| `F14-a-rule-crash-keeps-its-non-block-verdict` | a rule's crash keeps its own non-block exit; only the dispatcher's own fault exits 2 | clean | open, best-guessed | 88% |
| `F15-the-own-pid-scan-reads-the-file-at-run` | the `$$` check reads the rule file at run, from the text it sources; never a sync verdict | clean | open, best-guessed | 85% |
| `F16-the-dispatcher-is-one-file` | the dispatcher stays one bash file; its merge is table-tested through the real file | clean | open, best-guessed | 80% |
| `F17-two-settings-writers-share-one-producer` | sync and enroll derive each write their own target, both from `asHookDispatchersOfRules` | clean | open, best-guessed | 85% |
| `F18-the-manifest-takes-one-write-per-hook` | the manifest takes one whole write per hook change, as settings did; no batch contract | dirty | open, best-guessed | 82% |
| `F19-an-absent-dispatcher-fails-as-an-absent-rule-did` | no sync preflight of the dispatcher file; with no `node_modules`, rules exited 127 before too | clean | open, best-guessed | 88% |
| `F20-a-refusal-exits-per-event` | the dispatcher's own refusal exits 1 on UserPromptSubmit and on a held-once Stop; 2 elsewhere | clean | open, best-guessed | 85% |
| `F21-a-kept-json-replaces-the-other-stdouts` | a kept json replaces the other rules' stdouts; no `additionalContext` fold; the drop is pinned | clean | open, best-guessed | 80% |
| `F22-the-rule-row-holds-declared-and-plan` | one rule row holds the declared hook and its plan; the split waits for its own pr (the path and identity functions are already split out) | dirty | open, best-guessed | 85% |
| `F23-per-call-names-stay-pid-keyed-under-noclobber` | per-call names take `$$` plus a random part under noclobber, with three tries; a stale file never collides | clean | taken (b) | 95% |
| `F24-the-rule-resolver-stays-one-file-with-a-denylist-portability-check` | the matcher-list pattern is shared; the resolver split and an allowlist portability check wait for #765 | clean | open, best-guessed | 80% |
| `F25-observability-and-platform-reads-wait-past-this-pr` | trace pids, a cost-instrument test, a real bash 3.2 run, a large-payload read and three reader snaps: all land in this pr, none waits | clean | closed: none deferred | 95% |
| `F26-transformer-units-stay-data-driven-caselists` | the pure transformer units keep a `TEST_CASES` caselist under `describe`, not one given per input | clean | open, best-guessed | 85% |
| `F27-the-sync-order-test-keeps-its-two-delegate-mocks` | `syncRoleHooksIntoTarget.integration.test.ts` keeps its two documented mocks that delegate to real code; no prod seam is added for the test | clean | open, best-guessed | 85% |
| `F28-the-upgrade-hook-count-is-pinned-against-the-manifest` | the upgrade summary snap pins the literal hook count, beside the manifest equality asserts; the publish drift is its own dream | clean | reversed to (a) | 90% |
| `F29-three-probe-skills-stay-manual-instruments` | the bash trap, bash 3.2 and payload read probes stay manual instruments; each claim the yield cites from them holds its own test | clean | open, best-guessed | 85% |
| `F30-a-crash-stderr-passes-byte-for-byte-unnamed` | a rule's crash stderr passes as the rule wrote it; the dispatcher names only a silent crash or a timeout, and the trace names every rule | clean | open, best-guessed | 85% |
| `F31-the-sync-report-keeps-three-views-of-one-swap` | the role row, the dispatch block and the run total each keep their own job on a sync | clean | open, best-guessed | 80% |
| `F32-actors-yml-actors-keep-per-rule-hooks` | under `.agent/actors.yml` each actor renders per-rule hooks, as main does; the dispatcher serves the no-manifest layout; one dispatcher per actor there is a dream | clean | open, best-guessed | 90% |
