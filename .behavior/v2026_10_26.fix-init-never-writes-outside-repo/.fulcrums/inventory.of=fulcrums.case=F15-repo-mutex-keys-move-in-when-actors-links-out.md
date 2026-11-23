# F15 — the repo mutex keys move in when the actors root links out

## .the fork

`withRepoMutex` keeps its key files in `<repo>/.agent/.actors/.locks`. where `.agent/.actors` is a
link out of the repo, every guarded write leaves a `.locks` dir outside it, even when the guarded
file sits inside the repo. main's #702 role view lock (`.agent/repo=.mods`) is taken on every
`rhx init --roles`, so `init.hooks.outside-repo` case6, case7 and case18 found `.locks` in the
outside dir.

- **A** — fix at each caller: check before each `withRepoMutex`, as the foci write does
- **B** — fix in `withRepoMutex`: choose a key dir inside the repo
- **C** — refuse the mutex where the actors root links out, so every locked write fails

## .taken, and why

**B.** the same defect class reached init through a second caller within one round, so a per-caller
guard (A) would wait for the third. C would fail role link, which writes inside the repo and is no
outside write at all. under B the keys go to `<repo>/.agent/.actors/.locks` as before, or to
`<repo>/.agent/.locks` where the actors root lands outside; a `.agent` that itself links out leaves
no dir inside the repo, so the mutex refuses with a ConstraintError that names the path.

every peer reads the same disk to choose the dir, so two processes on one repo still meet on one key.

## .rework

clean — one function in `src/infra/lock/withRepoMutex.ts`, clamped by its `[case8]` and `[case9]`.

## .confidence, and why it is low

85%. two choices a reader may weigh otherwise: the fallback name `.agent/.locks` (it holds its own
`*` ignore, so git never sees it), and the refusal where `.agent` links out rather than a key under
`.git/`.

## .where

- `src/infra/lock/withRepoMutex.ts` — `getOneRepoMutexCacheDir`
- `src/infra/lock/withRepoMutex.integration.test.ts` — `[case8]`, `[case9]`
- `blackbox/cli/init.hooks.outside-repo.acceptance.test.ts` — case6, case7, case18 (the outside dir holds only `keep.txt`)

## .verdict

open — for the wisher's glance.
