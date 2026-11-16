# F23 — a contended on-disk key-lock timeout is fixed upstream, never caught by its message in `withFileMutex`

> raised by the driver at 5.3, on an integration run of `src/infra/lock`; best-guessed.

## .the fork

under heavy same-key contention, the on-disk cache's per-key lock times out after a fixed 5s and
throws a bare `UnexpectedCodePathError`. `with-simple-mutex` reads that as a backend fault, so a
contended acquire fails as a `MalfunctionError` where it should poll. seen once, under load, on the
twenty-bump cases of `withFileMutex` and `withHostMutex`; the rerun passed 18 of 18, and the same
suites passed 94 of 94 at 5.1. so the fault is a flake, seen once in three runs.

options:

- A. reseed the fix upstream (a typed contention error in `simple-on-disk-cache`, classified as a
  lost race in `with-simple-mutex`); `withFileMutex` stays as it is until the bump
- B. catch the error in `withFileMutex`'s cache wrapper by its message text and rethrow a
  `SimpleCacheConditionError`, so the mutex polls on
- C. raise the poll interval, so fewer waiters press the key lock at once

## .taken

A —

- B matches a dependency's error by its prose. a reword upstream silently undoes it, and it
  patches the symptom in the one consumer while the misclassification stays for every other
- C changes an input to quiet the failure; the cause stands (`rule.forbid.workarounds`)
- the shipped harm is narrow: a malfunction needs many `rhx` writes to one file at the same instant,
  past five seconds of key-lock wait. the cost lands as a load-dependent flake in a parallel ci run

## .rework

clean — B is one catch in `withFileMutex.ts`'s `cacheAnnounced.set`, plus a clamp. no contract moves.

## .confidence — 75%

low because the flake can fail a ci run on this PR before the upstream bump lands, and B would stop
that at the cost of a brittle seam.

## .where

`src/infra/lock/withFileMutex.ts` · `src/infra/lock/withFileMutex.integration.test.ts` ·
`src/infra/lock/withHostMutex.integration.test.ts` ·
`.dream/v2026_11_16.reseed.on-disk-key-lock-timeout-reads-as-a-mutex-fault.md`

## .verdict

open — best-guessed, for the council.
