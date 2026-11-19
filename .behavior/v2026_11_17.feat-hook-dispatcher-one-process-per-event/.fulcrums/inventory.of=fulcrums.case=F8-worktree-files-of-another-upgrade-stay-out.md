# F8 — files another inflight upgrade left in the worktree stay out of this change

## .the fork

the worktree holds edits this behavior did not make: `.husky/check.secrets.sh`,
`.husky/check.timestamps.lock.sh`, `.husky/check.timestamps.sh`, `.husky/pre-commit`,
`.husky/check.nvm.sh`, `.gitattributes`, `.gitignore`, `package.json`, `pnpm-lock.yaml`,
`.agent/repo=.this/role=any/boot.yml`, `.agent/repo=.this/role=any/skills/test.acceptance.credfree.sh`,
and the repo actor's `settings.of.grove.json`. a `since-main` review reads them as part of this diff.

- **(a)** leave them out: stage only this change's files; answer concerns on them as out of scope
- **(b)** fix each concern on them here, and ship them in this pr

the `package.json` edit is that upgrade's: role and brain package bumps, `achiever` and `telepath`
added to `prepare:rhachet`, `npm run build` before its `rhachet init` (the self-link `rhachet` runs
`dist/`, so a fresh clone needs a build first), and `rhachet-artifact-git` moved to dev deps. none of
it reads or writes a hook manifest; `pnpm-lock.yaml` follows those bumps.

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

split at the commit, 2026-11-19. the `.husky/*` set ships here: the worktree's `pre-commit` runs
`check.timestamps.lock.sh`, which refuses any commit whose index holds the old
`check.timestamps.sh`. a split husky set cannot pass its own hook, so the set ships whole, as the
lock's fix (`declapract apply --practice husky`) asks. the rest (`.gitattributes`, `.gitignore`,
`package.json`, `pnpm-lock.yaml`, `test.acceptance.credfree.sh`, `settings.of.grove.json`) stays
out. still open for the director at the pr.
