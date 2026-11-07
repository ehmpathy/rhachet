# inventory.of=fulcrums

axis = `case=F$n-$slug` — one best-guessed call per entry, in the order it was made.

| case | title | rework | status | confidence |
|---|---|---|---|---|
| [F1](./inventory.of=fulcrums.case=F1-pool-file-is-repo-level.md) | pools live in one repo file, `.agent/brain.pools.yml`, not a `creds.yml` per actor dir | clean | best-guess | 70% |
| [F2](./inventory.of=fulcrums.case=F2-live-rotate-via-a-per-clone-credential-file.md) | live rotation rides a per-clone credential file (O7 at the clone grain), not the api-key helper | dirty | best-guess | 65% |
| [F3](./inventory.of=fulcrums.case=F3-usage-read-holds-a-refresh-token-per-reach.md) | the capacity read holds a usage-scoped refresh token per reach, one holder | dirty | best-guess | 60% |
| [F4](./inventory.of=fulcrums.case=F4-flag-names.md) | `--brain-pool` / `--brain-reach` and `rhx brains pool status` | clean | best-guess | 75% |
| [F5](./inventory.of=fulcrums.case=F5-move-only-capped-or-dead-clones.md) | the tick moves only clones on a capped or dead member | clean | best-guess | 70% |
| [F6](./inventory.of=fulcrums.case=F6-tick-runs-from-the-box-cron.md) | the 15-minute tick runs from the box's cron, not a rhachet daemon | clean | best-guess | 80% |

the two `dirty` rows are the ones the commander should rule on first: each fixes a channel later
stones build on.
