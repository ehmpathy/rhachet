# F1 — the one with-simple-mutex owner stays withRepoMutex.ts, which now hosts withDiskMutex

- **fork** — (a) add a second importer of `with-simple-mutex` for a box lock and widen the lint clamp to
  two files; (b) lift the generic hold into a new `src/infra/lock/withDiskMutex.ts` as the one owner, and
  move the case 6 clamp to it; (c) host the generic hold, `withDiskMutex`, in `withRepoMutex.ts` beside
  `withRepoMutex`, which delegates to it
- **taken** — (c). requirement case 6 names `withRepoMutex.ts` as the one owner, and only the wisher amends
  that entry. (c) keeps one owner at the named path, so the requirement brief and the [case7] clamp stay
  byte-identical to main. (b) moved the clamp without an amendment; a peer review held that as a narrowed
  requirement, and it was reverted
- **rework** — clean. should the wisher prefer a file of its own for the box lock, (b) is one file move,
  one import path per caller (three), and a case 6 amendment
- **confidence 90%, low because** — `withRepoMutex.ts` now exports two operations, which bends
  one-operation-per-file; the requirement path wins that tie
- **where** — `src/infra/lock/withRepoMutex.ts`, `withRepoMutex.integration.test.ts` [case7] (as on main)
- **verdict** — settled by the requirement as written; no amendment asked
