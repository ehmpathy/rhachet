# F5: the unrelated husky bump stays out of this PR

- **the fork**: a peer reviewer graded the uncommitted `.husky/` scripts (`check.secrets.sh`,
  `check.timestamps.sh`, `check.timestamps.lock.sh`, `check.nvm.sh`) — part of a role-package bump
  that sat in the work tree before this route began. fix their findings here, or keep the files out
  of this PR and leave their findings to that bump's own change
- **taken**: keep them out. the commit stages only this fix's files (`--unstaged ignore`); the husky
  scripts are neither staged nor edited
- **why**: the wish scopes this PR to attribution-off, and the vision names the bump as unrelated and
  kept out of this PR's commits. an edit to another change's uncommitted files would fold two changes
  into one review and alter work this route does not own. the reviewers see the files only because
  the guard's `since-main` scope reads the work tree, not the staged set
- **rework**: clean — the husky findings can be fixed in the bump's own PR with no ripple here; or a
  human grants `rhx route.mutate grant allow` and the guard gains `--paths-wout '.husky/**'`
- **re-raised**: peer review 5.3 r1 blocker.2 graded this a deferral under
  `rule.forbid.deferrals-short-of-a-dedicated-pr`. held, and disputed: that rule governs work a route
  FINDS; these files are another change, uncommitted, that a human left in the work tree. to commit
  them would ship work this route did not author or review under its title, and to edit them would
  rewrite it. the rule's own remedy — a dedicated PR — is exactly the bump's own PR, which its author
  owns
- **the whole bump**: the same uncommitted change also holds `package.json`, `pnpm-lock.yaml`,
  `.gitignore`, `.gitattributes`, `.husky/pre-commit`, the repo actor's `boot.yml` and
  `settings.of.grove.json`, and the role entries of its `settings.of.repo.json`. all stay out of
  this PR's commits, by the same reason; of the repo actor's `settings.of.repo.json`, only the
  `attribution` key is staged
- **the record**: a review that reads the work tree (`since-main`) sees these files until the commit;
  the PR diff, which is the record a commander reviews, will not carry them
- **confidence**: 90% — the commander may prefer the bump land first, or ride along
- **where**: `.husky/*`; the 5.1 guard's review scope
- **verdict**: —
