# F18 — the toolchain bump lands as its own commit

## .the fork

the worktree holds a toolchain upgrade beside the feature: `declapract` and its typescript practice,
four role packages, `prepare:rhachet`, the husky hooks, `.gitattributes`, `.gitignore`, and `.agent`
settings. an `rhx upgrade` and a `declapract` apply brought them in, mid-route.

- **A — split at commit.** when the route asks for its commit, the upgrade lands first as
  `chore(deps)`, and the feature after it. the `bin/rhx` and `invoke.ts` hooks for the new verbs
  stay with the feature
- **B — revert the upgrade now**, and leave it to a later pr

## .taken

A. the route forbids a commit before it asks for one, and the role inits of this route ran under the
upgraded roles, so B would test the feature on a toolchain it will not ship with. one hunk of the
apply was a defect (`rhachet-artifact-git` moved to dev deps) and is reverted already.

the same split holds for the keyrack lost-update fix (raised by r11 nitpick.7 in review i005): it
serves every keyrack writer, not only `brains auth`, so it lands as its own `fix(keyrack)` commit
between the two: `setKeyrackHostManifestHosts`, `asKeyrackKeyHostsWithout`, the `withRepoMutex`
`locksDir` option, `withHostMutex`, the dead `secret` input removed from `setKeyrackKey` and
`setKeyrackKeyHost`, the `mechAdapterReplica` `question` seam, and the atomic vault write in
`vaultAdapterOsSecure` (review i006). order: `chore(deps)` →
`fix(keyrack)` → `feat(brains)`.

## .rework

clean: the split is a choice of which paths each commit stages.

## .confidence

85% — the commander may want the upgrade in a pr of its own instead of a commit of its own.

## .where

`package.json`, `pnpm-lock.yaml`, `.husky/*`, `.gitattributes`, `.gitignore`, `.agent/**`;
raised by r11 nitpick.1 in review i004.

## .verdict

best-guessed.
