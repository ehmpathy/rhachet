# rule.require.test-tempdir-via-gentempdir

## .what

every temp dir a test makes outside the repo is allocated by test-fns `genTempDir` — directly, or
via `genTempDirPhysical` (`src/.test/infra/genTempDirPhysical.ts`) when the test needs the
physical path, outside any repo. `genTempDirPhysical` is the named form of the extant
`realpathSync(genTempDir(...))` idiom, plus a fail-fast on a cwd outside this repo.

(a scratch dir INSIDE the repo — e.g. `genTestTempDir`'s `__dirname/.temp/<name>`, gitignored and
removed in `afterAll` — is out of this rule's scope: it never lands in `/tmp`.)

never hand-roll one: no `mkdtemp`, no `os.tmpdir()` path, no per-run `/tmp/...${…}` template,
no `withTempHome` (deleted — its deterministic path let one run wipe a peer run's live home).

## .why

- a dir from `genTempDir` carries this run's stamp, so the jest `globalTeardown`
  (`test-fns/autoprune.teardown.jest`, wired in all three jest configs) reclaims it —
  under a failed test and a `--scope`d run too. no call site carries a teardown duty
- a hand-rolled dir carries no stamp, so no teardown ever claims it. that is how one machine
  accrued 12,901 `rhachet-test-*` dirs (ehmpathy/rhachet#488) under "OS handles cleanup"
- `genTempDirPhysical` yields the physical path (`/tmp/test-fns/{repo}/.temp/…`), outside any
  repo — as isolated as the bare `os.tmpdir()` dirs it replaced

## .the exemptions — three, each named at the line

mark the line directly above with `.tempdir.exempt =` and the reason. only three reasons hold, and
the marker must BEGIN with the reason's exact words (the first column), or the scan reads it as a hit:

| marker begins with | when | example | duty |
|---|---|---|---|
| `unix socket path cap` | a unix socket runtime dir — a socket path is capped near 108 bytes, which a genTempDir path cannot meet | `mkdtempSync('/tmp/kdp-')` | remove the dir in an `afterAll` or `afterEach`, and name which in the marker |
| `a path read` | a path read that makes no dir | a snapshot mask built from `os.tmpdir()` | none — it allocates naught |
| `host-wide state` | state shared across runs on purpose | the real-brain slot semaphore | name why a run-scoped dir would be wrong |

```ts
// .tempdir.exempt = unix socket path cap (~108 bytes); removed by this file's afterAll
const runtimeDir = mkdtempSync('/tmp/kdp-');
```

## .hold a run's dirs for inspection

```sh
TEST_FNS_KEEP=1 rhx git.repo.test --what unit --mode apply --scope 'path://foo'
```

the 24h age gate still reclaims them later.

## .an interrupted run

jest never reaches its `globalTeardown` when a run is signaled. so each composed `globalSetup`
(`jest.{unit,integration,acceptance}.globalSetup.ts`) calls the one shared `setAutopruneForRun`
(`src/.test/infra/setAutopruneForRun.ts`), which mints the run id and calls
`setTempDirReclaimOnInterrupt`, which
runs the same test-fns teardown on SIGINT (ctrl-c) or SIGTERM (a ci cancel), then exits 128 +
signal. a second ctrl-c exits at once.

## .known bound

a run killed with no chance to react — SIGKILL, an OOM kill, a host crash — runs no handler at
all. its dirs are named by the next run ("prior test run never reclaimed its temp dirs") and
reclaimed by test-fns' 24h age gate.

## .enforcement

`src/.test/infra/getAllTempDirHandRolls.integration.test.ts` scans every test-code file git knows
of (`.ts`, `.js`, `.cjs`, `.mjs` under `blackbox/`, `src/.test/`, or named `*.test.*`); a hit fails
the suite and names `path:line [form]` plus the fix. an exempt marker whose reason is not one of
the three above is itself a hit. a hand-rolled test temp dir = **blocker**

a gitignored file is out of the scan's reach by design: it is never committed, so no run but its
author's executes it.
