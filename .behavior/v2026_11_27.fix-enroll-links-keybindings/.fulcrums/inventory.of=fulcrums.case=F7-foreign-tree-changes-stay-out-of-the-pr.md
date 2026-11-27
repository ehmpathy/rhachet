# fulcrum F7: foreign tree changes stay out of the pr

## .the fork

the worktree holds changes this route did not make: `package.json` (`prepare:rhachet`, role adds,
version bumps), `pnpm-lock.yaml`, `.gitattributes`, and the regenerated repo actor files
(`settings.of.repo.json`, `hooks.dispatch.manifest`).

- **A. revert them** — restore each to HEAD
- **B. leave them, untouched, and out of the commit** — stage only this route's files

## .taken: B

- this route did not make them; their author and purpose are unknown to me, so a revert could
  destroy a human's work in progress
- none touches the keybindings change; a reviewer reads the pr, and the pr holds none of them
- the pr body names each, so the commander decides where they go

## .rework: clean

a revert is one `git checkout` per file, any time, by whoever owns them.

## .confidence: 90%

## .where

the commit's file list, and the pr body.

## .verdict

open — for the commander, with the pr.
