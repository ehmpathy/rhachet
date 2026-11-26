# F8 — the enroll pointer-file race is fixed in this pr

- **fork** — fix `setBrainDirPointerFiles`'s create race here, where the review guard tripped on it · split it into its own pr
- **taken** — fix it here. the peer review lane `enroll-impl-arch-defects` malfunctioned on `EEXIST: symlink 'AGENTS.md' -> …/actor.via.hash=9366365e/brain/.claude/CLAUDE.md`: two review lanes with the same roles enrolled into one actor dir at once, and the check-then-create findsert lost the race. this repo's own tool raised it, the fix is one file plus one clamp, and the repo forbids a deferral short of a dedicated pr for a fix this small
- **rework** — clean. one file (`src/domain.operations/boot/setBrainDirPointerFiles.ts`) and one integration case; a cherry-pick moves it to its own pr with no ripple
- **confidence** — 80%. the commander may prefer a keyrack pr that holds only keyrack; the split is one cherry-pick
- **where** — `setBrainDirPointerFiles.ts`, its `[case5]` clamp (red with the EEXIST catch reverted, green with it)
- **verdict** — open; the commander rules at the pr
