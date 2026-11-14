# F4 — no failure marker for waiters behind a failed or hung export

- **fork** — (a) each waiter that takes the key after a failed or hung export runs its own export, in
  turn, and a waiter past the 5 min wait bound throws; (b) the holder writes a short-lived failure marker
  (say 30s), and every waiter that finds it throws the same cause at once, with no export
- **taken** — (a). it adds no new state to the cache dir, and every failure path stays the one path a
  success takes, minus the write. a marker is a second kind of cache entry, with its own expiry, its own
  mode, and its own question of whether a waiter may trust a peer's failure (a fresh login between the two
  would make the marker a lie). (a) already bounds every caller to 5 min and serializes the cores, which is
  the cost half of #656
- **rework** — clean. a marker sits inside the hold and is read at step 3; no caller contract changes
- **confidence 75%, low because** — under a hung cli, waiters past the second take 5 min to fail rather
  than at once. the wish's load-70 case is a slow export, not a hung one, so it does not meet this cell,
  but a wisher who weighs fail-time over simplicity would pick (b)
- **where** — `getOneAwsProfileExport` (vision contract, steps 2–4); case 9
- **verdict** — unresolved, for the wisher
