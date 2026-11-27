# F7 — the `.husky` worktree changes stay out of this pr

- **fork**: fix the `.husky/check.timestamps.lock.sh` positional args the reviewers flag, or leave the `.husky` changes alone
- **taken**: leave them alone, and keep them out of this pr's commit
- **why**: the `.husky/*`, `package.json`, `pnpm-lock.yaml`, `.gitignore`, and `.gitattributes` changes were in the worktree before this route began, from a declapract practice the wish never names. they are not this work's to edit, and an edit would ride a commit into a pr about content checks (a scope leak). the commit stages only this route's files
- **counter (i002 r7)**: the `since-main` scope shows the file as a `+` add, so it reads as this pr's
- **answer**: `since-main` reads the worktree, not the pr. `git status` shows `?? .husky/check.timestamps.lock.sh`, untracked, so no commit holds it and the pr diff cannot. the file is declapract's: its own halt text says `fix: npx declapract apply --practice husky`, so a local edit drifts from the practice that owns it. the lever that drops it from review scope (a `--paths-wout '.husky/**'` guard edit) needs the mutate grant, which this route lacks
- **counter (i004 r10)**: the worktree also holds `package.json`, `pnpm-lock.yaml`, `.agent/repo=.this/role=any/boot.yml`, and `settings.of.repo.json` changes, and `package.json` moves `rhachet-artifact-git` to devDependencies while `src/` imports it at runtime. a broad `git add` would ship that
- **answer**: the same rule covers every one of them. the commit names its paths, never `.` or `--all`: `src/`, `blackbox/`, the route dir, `.dream/`, and the rule brief. no listed file is staged, so the dependency move cannot reach the pr. the move is a real defect, and its owner is the declapract practice that wrote it
- **rework**: clean. the owner of the husky practice can edit the helper in its own pr
- **confidence**: 95%
- **where**: peer review r7 blocker.1, r4 nitpick.1, r10 nitpick (i004)
- **verdict**: open
