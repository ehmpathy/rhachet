# requirement: rhachet's locks use `with-simple-mutex`

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

every mutual-exclusion lock in rhachet is taken through `with-simple-mutex` — no hand-rolled lock
primitive. a lock that must hold across processes on one machine uses `with-simple-mutex` over a
local on-disk cache that satisfies `WithCacheConditionals` (`simple-on-disk-cache`).

## .the exception — a lock that joins another program's protocol

amended by the wisher, 2026-10-13. a lock that must exclude a program rhachet does not own speaks
that program's own protocol, since `with-simple-mutex` cannot exclude a writer that never takes it.
the one such lock is `src/domain.operations/brain/auth/withBrainAuthWriteLock.ts`: claude-code
guards the shared login with proper-lockfile on `~/.claude/.storage-write`, so rhachet takes that
same dir lock. the lint proof names it by path; a new exception needs the same amendment.

## .why

one lock implementation, owned and tested in one package, rather than a lock protocol (claim, stale
break, release, wait) re-derived per repo.

## .clamp — landed 2026-10-07

- `src/infra/lock/withRepoMutex.ts` — the one owner of `with-simple-mutex` in `src/`. it takes the
  mutex over one `simple-on-disk-cache` per repo at `.agent/.actors/.locks/` (git-ignored), keyed by
  the guarded file's repo-relative path, with a five-minute lease, a two-minute wait bound, and the
  `ℹ another rhx process holds <file>; this one will wait for it` notice on the first lost attempt
- every guarded read-modify-write calls it: the settings shield, the layout findsert, the actor
  settings derivation, `actor.json`, `.claude.json`, `package.json` (prepare entries and their
  delta), the repo and brain dir `.gitignore`s, and the `<repo>/.claude` link
- the mutex is not reentrant, so a caller that already holds a key calls the `*WithinLock` form of a
  nested writer (the shield's layout findserts, the delta re-derive's manifest write), and the repo
  actor's settings derivation takes its one file's mutex once
- `package.json` pins `with-simple-mutex@0.1.1` and `simple-on-disk-cache@1.8.1`; the hand-rolled
  `src/infra/lock/` modules are deleted

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/infra/lock/withRepoMutex.integration.test.ts` [case1]–[case6] — a free file runs and frees; a peer hold announces the wait once and fails loud past the bound; a release inside the bound lets the section run; a lapsed lease is retaken; two chains take turns; two processes keep all 100 bumps of one counter | ✅ green 2026-10-07 |
| integration | `src/domain.operations/enroll/genBrainCliConfigArtifact.integration.test.ts` [case6] — a peer that holds the repo actor's settings mutex makes the derivation wait, and its hook survives | ✅ green 2026-10-07 |
| lint | `src/infra/lock/withRepoMutex.integration.test.ts` [case7] — only the wrapper imports `with-simple-mutex`, and no prod file claims a `.lock` file or waits via `Atomics.wait`, save the one foreign-protocol lock named above | ✅ green 2026-10-13 |
| integration | `src/infra/lock/withRepoMutex.integration.test.ts` [case8] — the actors root removed between two guarded writes of one process; the second still takes its mutex | ✅ green 2026-10-13 |

## .source

the wisher, 2026-10-07: "thats a hard requirement to use that" (in reply to "for the locks, we use
with-simple-mutex ?").
