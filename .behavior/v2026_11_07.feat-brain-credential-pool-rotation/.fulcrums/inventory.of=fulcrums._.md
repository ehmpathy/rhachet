# inventory.of=fulcrums

axis = `case=F$n-$slug` — one best-guessed call per entry, in the order it was made.

| case | title | rework | status | confidence |
|---|---|---|---|---|
| [F1](./inventory.of=fulcrums.case=F1-pool-file-is-repo-level.md) | pools live in one repo file, `.agent/brain.pools.yml`, not a `creds.yml` per actor dir | clean | accepted | 70% |
| [F2](./inventory.of=fulcrums.case=F2-live-rotate-via-a-per-clone-credential-file.md) | live rotation rides a per-clone credential file (O7 at the clone grain), not the api-key helper | dirty | best-guess | 65% |
| [F3](./inventory.of=fulcrums.case=F3-usage-read-holds-a-refresh-token-per-reach.md) | the capacity read holds a usage-scoped refresh token per reach, one holder | dirty | best-guess | 60% |
| [F4](./inventory.of=fulcrums.case=F4-flag-names.md) | `--brain-pool` / `--brain-reach` and `rhx brains pool status` | clean | accepted | 75% |
| [F5](./inventory.of=fulcrums.case=F5-move-capped-clones-and-spend-idle-sooner-windows.md) | the tick moves clones on a capped or dead member, and a healthy clone only onto an undrawn member whose window resets sooner | clean | accepted | 75% |
| [F6](./inventory.of=fulcrums.case=F6-tick-runs-from-the-box-cron.md) | the 15-minute tick runs from the box's cron, not a rhachet daemon | clean | accepted | 80% |
| [F7](./inventory.of=fulcrums.case=F7-rank-keys-each-member-by-its-tight-window.md) | the rank keys each member by its tight window (of 5h and 7d, the one nearer its cap), not by its 5h reset alone | clean | accepted | 70% |
| [F8](./inventory.of=fulcrums.case=F8-pool-flags-on-a-repo-with-no-pool-file-refuse.md) | `--brain-reach` / `--brain-pool` on a repo with no pool file is refused, never a fallback to the shared login | clean | accepted | 80% |
| [F9](./inventory.of=fulcrums.case=F9-round-3-review-nitpicks-land-at-criteria.md) | the last review round's six nitpicks land at the criteria stage; the vision holds at the approved hash | clean | accepted | 85% |

the seven `clean` rows are accepted as guessed by the director (2026-11-10). the two `dirty` rows
await the commander: each fixes a channel later stones build on, and each handles credentials.
