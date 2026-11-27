# F13 — the pnpm patch is cut from the settled design, after review, beside the PR

- **fork**:
  - (a) cut the pnpm patch for the director trees while 5.1 is still under review, and rebuild it every round
  - (b) cut it once, after the review ladder settles the code: past 5.3 verification, beside the PR and its fleet.asks link
- **taken**: (b).
  - The wish asks for "a pnpm patch of the settled design".
  - A patch cut mid-review carries code that a later round changes. The director trees would then run a design the review had not yet passed.
  - It stays on the route's task list, owed, until it ships.
- **rework**: clean. The patch is a build artifact of the diff, so it can be cut at any point.
- **confidence**: 85%
- **where**: the route's last deliverable, cut with the PR
- **raised by**: i004 r010 point 3 (enroll-impl-behavior-intent)
