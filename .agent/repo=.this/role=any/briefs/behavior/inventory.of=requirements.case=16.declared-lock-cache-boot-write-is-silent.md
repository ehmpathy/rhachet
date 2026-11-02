# requirement: a booted clone with the declared lock cache writes boot.md, silent

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a booted clone whose rhx loads the `simple-on-disk-cache` rhachet declares takes the repo mutex,
writes boot.md, and releases the lock. the foreign-cache guard (case 14) stays silent on the
declared copy; two sections on one key run one after the other.

## .clamp

`withRepoMutex`; `assertRepoMutexCacheFit` passes a cache that carries `version()`.

## .proof

- `src/infra/lock/withRepoMutex.integration.test.ts` — a section runs once and releases its lock;
  two sections on one key serialize
- `src/infra/lock/assertRepoMutexCacheFit.integration.test.ts` — the declared copy passes
- owed: a cited run at the done-gate head

## .source

vision case 9 of `.behavior/v2026_10_21.fix-init-refuses-ambient-claude-link`.
