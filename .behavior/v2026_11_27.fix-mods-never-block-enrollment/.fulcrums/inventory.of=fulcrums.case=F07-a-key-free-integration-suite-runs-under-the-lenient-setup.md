# F07 — a key-free integration suite runs under the lenient setup

- **fork**: `enroll.mods.integration` had to be flipped and resnapped, and its strict globalSetup halts on four absent LLM keys it never reads. (a) flip it blind and let ci write the snapshots, where `--ci` fails a new snapshot · (b) drop its snapshots and keep only explicit assertions · (c) run it locally under the lenient acceptance setup, its testMatch swapped to the integration suites · (d) ask a human to fill the keys
- **taken**: (c), as a flag on the paved `test.acceptance.credfree` skill (`--what integration`). (a) ships a red ci by construction; (b) drops the review surface the snapshots give; (d) halts the drive on keys the suite does not read
- **bound**: the env setup files differ only in the timeout (180s vs 90s) and a stage guard; the suite spawns the built cli against a temp repo, as an acceptance suite does. a suite that truly reads a key fails in that test, legibly
- **cost paid once**: the first form passed `--testMatch` before the scope; jest reads `--testMatch` as a list, so it swallowed the scope and ran the whole integration tier with `--resnap`. the four snapshots it rewrote were restored from HEAD, byte for byte; the skill now puts the scope first and says why
- **rework**: clean — one flag on one skill; ci still runs the suite under its real config
- **confidence**: 85%. a reviewer may hold that the integration tier's strict setup is the contract, and that its key-free blackbox suites belong in the acceptance tier instead
- **where**: `.agent/repo=.this/role=any/skills/test.acceptance.credfree.sh`
- **proof**: `rhx test.acceptance.credfree --what integration --scope '(enroll\.mods|test\.acceptance\.credfree)\.integration'` → 2 suites, 54 passed
