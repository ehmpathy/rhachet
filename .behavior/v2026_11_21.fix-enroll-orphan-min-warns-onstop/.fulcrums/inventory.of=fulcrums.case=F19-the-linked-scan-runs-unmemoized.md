# F19 — the linked scan runs unmemoized on each stop

- **fork**: memoize the linked content scan by link realpath plus package version, and warn once per defect-set digest; or run it on each stop that is not held
- **taken**: run it on each stop that is not held, with no memo
- **why**: the measured cost is small. `rhx perf.test --measure --runs 5 --warmup 1` on the stop release path in this repo, with every linked role present: 336ms mean (314–360ms), exit 0. r10 measured 200–370ms on its own run. a second memo is a second cache key to keep sound, and its key (realpath + version) misses a `.agent/repo=.mods` edit or a local relink that changes a linked tree at the same version
- **counter (i004 r11)**: the warn repeats on each stop for a defect the clone cannot repair
- **answer**: the warn is a json `systemMessage` on exit 0. it never holds the stop, and the clone reads it as a note. a held stop omits it (vision case 6). the repeat is the cost of a notice that stays true until an upgrade or a mod lands; a once-per-digest warn would hide a defect after one stop that nobody read
- **rework**: clean. a memo can wrap `getAllLinkedRoleContentDefects` later with no change to its callers
- **confidence**: 75%
- **where**: peer review r11 blocker.4 (i004)
- **verdict**: open
