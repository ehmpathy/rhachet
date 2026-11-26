# F3 — the stdin flag is named `--source`

- **fork** — `--source @stdin` · `--from @stdin` · `--value @stdin`
- **taken** — `--source`: the mech contract already calls the stored credential the `source` (`acquireForSet → { source }`, `deliverForGet({ source })`)
- **rework** — clean. a rename before release
- **confidence** — 70%. `--from` is used by `keyrack firewall`, a fair precedent for the other choice
- **where** — `1.vision.yield.md` q3
- **verdict** — lean stands as best guess per S1; the commander rules at the pr
