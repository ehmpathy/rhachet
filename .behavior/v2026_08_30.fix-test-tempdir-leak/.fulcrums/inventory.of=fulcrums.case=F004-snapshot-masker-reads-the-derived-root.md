# F004 — the snapshot masker reads the derived temp root, and refuses a foreign cwd

## .the fork

arch-hazards-behavior i008 nitpick.2: `asSnapshotSafe` calls `getTestTempRepoPathPattern()`, which
derives the temp root via `getOneTempDirRoot()` (a `git rev-parse` + a findsert of the root) and
throws a `ConstraintError` when its first read comes from a cwd outside the repo. the ask: memoize
the root at process start or hand the pattern in, so the masker stays a pure `(string) => string`.

## .taken — keep the lazy one-slot cache and its guard

- **the guard is the point, not a hazard.** a root derived from a foreign cwd is a root for a
  different repo key; every later mask in that worker would then match naught, and snapshots would
  silently carry raw `/tmp/test-fns/...` paths — a false green that only fails on the next host. a
  loud refusal names the cause and the fix at the first call, the cheapest moment
- **an eager read at import does not remove the order dependence, it moves it.** the module is
  imported by every blackbox test file; an import-time `git rev-parse` pays a subprocess per file
  for the files that never mask, and still reads whatever cwd the importer had
- **a pattern handed in** ripples through every snapshot call site (~40 files) to add an arg that is
  the same value everywhere — the shape `rule.prefer.defaults-match-common-case` forbids
- **the side effect is test-fns' own** — `getOneTempDirRoot` findserts the root it names, the same
  act every `genTempDir` call makes in the same worker; no new state is introduced
- the cache already makes it one derivation per module instance, and
  `getTestTempRepoPathPattern.test.ts` clamps both branches (inside cwd masks; foreign cwd refuses)

## .rework

clean — a memo at import time or an injected pattern would each be a contained change, should a
later round show a real caller that masks from a moved cwd.

## .confidence

90%. no current caller masks from a moved cwd; the clamp proves the refusal names its fix.

## .verdict

settled by the driver, by reason. the point is disputed, not conceded.
