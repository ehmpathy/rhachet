# fulcrum F4: the worktree's declapract husky upgrade stays out of this change

## .the fork

the worktree holds uncommitted edits this route did not author: a declapract and rhachet upgrade
(`package.json` version bumps and its `prepare:rhachet` command, `pnpm-lock.yaml`, `.gitattributes`,
`.gitignore`, `.agent/repo=.this/role=any/boot.yml`, the two
`.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.{grove,repo}.json` edits, and the
practice-managed hooks `.husky/check.secrets.sh`, `.husky/check.timestamps.sh`,
`.husky/check.timestamps.lock.sh`, `.husky/pre-commit`, `.husky/check.nvm.sh`). the peer review's
`since-main` scope reads the work tree, so five lanes raised concerns against those hooks.

- **a.** repair the hooks here (named args, `set -eu`, fix lines, shape order)
- **b.** leave them out: neither edit nor commit them with this change

## .taken — b

- the hooks are practice-managed: `check.timestamps.lock.sh` pins `check.timestamps.sh` by blob
  hash and halts any commit that alters it (`fix: npx declapract apply --practice husky`). a local
  edit is undone by the next `declapract apply`, and an edit to the pinned hook trips the lock
- the wish names the clone daemon's trace path alone; a hook upgrade is a separate change with its
  own owner (the declapract practice)
- the commit for this route stages only the route's files and `src/`, so none of the upgrade rides
  this pr

## .rework — clean

if the wisher wants the upgrade in this pr, it is a stage of those paths at commit; no code here
depends on them.

## .confidence — 90%

why not higher: the upgrade's origin in this worktree is unknown (it predates this session's
resume), so whether the wisher meant it to ship with this pr is unasked.

## .verdict — 2026-11-17, the director: b holds

the upgrade stays out of this pr; its pin raise is its own tree, ehmpathy/rhachet#768. the three
`rhx.acceptance` [case5] rows it reddens locally are proven by cicd on the committed lockfile
(seed S1).

## .where

the concerns: r4 blocker.1, r5 nitpick.1, r6 nitpick.4, r7 blocker.1, r9 blocker.1 and nitpicks
1–3 of `5.1.execution.from_vision` review i001.
