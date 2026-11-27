# requirement: a `<repo>/.claude` link that lands on the repo actor brain dir is accepted

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx init` accepts a `<repo>/.claude` symlink whose realpath is the repo actor brain dir, however
the link is spelled: relative, absolute, or through a hop that is itself a link. a director tree's
link passes, so `pnpm install` passes at prepare.

## .clamp

`assertRepoBrainDirSymlinkLandsHere` compares realpaths, never link text; `setRepoBrainDirSymlink`
keeps a relative link and rewrites an absolute one relative.

## .proof

- `src/domain.operations/init/boots/assertRepoBrainDirSymlinkLandsHere.integration.test.ts`
  [case3] [t0] [t1] [t2] — relative, absolute, and via a hop, each passes
- `src/domain.operations/init/boots/setRepoBrainDirSymlink.integration.test.ts` — the layout step
  keeps or rewrites the link
- owed: a cited run at the done-gate head

## .source

the wish of `.behavior/v2026_10_21.fix-init-refuses-ambient-claude-link` (vision case 6), for
`ehmpathy/rhachet#657`.
