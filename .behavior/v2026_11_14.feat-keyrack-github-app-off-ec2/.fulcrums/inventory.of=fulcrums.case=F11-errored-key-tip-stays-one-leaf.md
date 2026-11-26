# F11 — the errored-key tip renders its hint as a tree, in this pr

- **fork** — render an errored or locked key's hint as a nested tree, split on `;` as `getKeyrackBlockedReport` does · keep the one-leaf `tip:` render, which this pr fills with longer hints
- **taken** — the tree, here. `asKeyrackTipLines` renders the tip's head on the `tip:` leaf and each further `;`-joined branch as a sub-leaf; a `;` inside a backtick command stays whole. both tip sites in `formatKeyrackKeyBranch` (locked and the four omissions) call it. the os.secure mint cure now joins its pipe and guided-set commands with `;`, so each lands on its own branch
- **rework** — clean. one render function and one cure string; a tip with no `;` renders byte for byte as before, so only the snapshots that hold a multi-branch tip moved (off-ec2, mint acceptance, os.secure github-app acceptance)
- **confidence** — 85%. the split rule matches the blocked report's, so one hint reads one way on every path
- **where** — peer round i001 r006 blocker.1, re-raised in i002 r006 blocker.1 and r001 blocker.2 (no deferral short of a dedicated pr); `src/domain.operations/keyrack/cli/asKeyrackTipLines.ts`
- **verdict** — landed in this pr, per the peer rounds
