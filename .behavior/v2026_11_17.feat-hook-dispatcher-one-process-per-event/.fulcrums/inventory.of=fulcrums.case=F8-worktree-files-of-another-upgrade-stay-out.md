# F8 — files another inflight upgrade left in the worktree stay out of this change

## .the fork

the worktree holds edits this behavior did not make: `.husky/check.secrets.sh`,
`.husky/check.timestamps.lock.sh`, `.husky/check.timestamps.sh`, `.husky/pre-commit`,
`.husky/check.nvm.sh`, `.gitattributes`, `.gitignore`, `package.json`, `pnpm-lock.yaml`,
`.agent/repo=.this/role=any/boot.yml`, `.agent/repo=.this/role=any/skills/test.acceptance.credfree.sh`,
and the repo actor's `settings.of.grove.json`. a `since-main` review reads them as part of this diff.

- **(a)** leave them out: stage only this change's files; answer concerns on them as out of scope
- **(b)** fix each concern on them here, and ship them in this pr

## .taken

(a). the commit stages an explicit file list (the dispatcher, its manifest ops, the enroll guard, the
tests, the route). none of these files lands in the pr, so a concern on them grades no shipped code.

## .rework

clean. a later pr that owns those files takes the concerns (the secrets shape order, the lock hash
guard, the credfree `THOROUGH` flag).

## .confidence

90%. the diffs read as a practice upgrade (declapract bump, linguist attributes, husky checks), with
no tie to hook dispatch. if the director wants them in this pr, each concern is a small fix.

## .where

the staged list at commit; `git diff --stat` of those paths

## .verdict

open, for the director at the pr.
