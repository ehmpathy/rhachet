# requirement: a foreign lock cache is named before any key is taken

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

when the rhx that runs loads a `simple-on-disk-cache` with no `version()` (a hoisted copy, a
`NODE_PATH` entry, a global install), the first repo mutex fails loud before any key is taken. the
error names the copy's path and version, the version wanted, the rhx that ran, and the fix. no
half-taken lock is left behind, and a later call in the same process re-reads the disk.

## .clamp

`assertRepoMutexCacheFit`, inside `getOneRepoMutexCache` (`withRepoMutex`), before any key; a
refusal is not memoized.

## .proof

- `src/infra/lock/assertRepoMutexCacheFit.integration.test.ts` — a cache with no `version()`
  refuses and names the copy; a fit cache passes
- owed: a cited run at the done-gate head

## .source

vision case 5 of `.behavior/v2026_10_21.fix-init-refuses-ambient-claude-link`: the sprout fault the
acceleration director chased died at the mutex acquire with a bare TypeError.
