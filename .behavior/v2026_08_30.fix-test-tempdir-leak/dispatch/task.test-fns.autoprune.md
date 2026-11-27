## the ask

`genTempDir` has no teardown. its only reclaim is `pruneStaleOnce` — a fire-and-forget,
once-per-process, **7-day** age prune (`src/domain.operations/genTempDir/pruneStale.ts:5`,
`SEVEN_DAYS_MS`). the public contract (`dist/contract/index.d.ts`) exports only `genTempDir` and
`isTempDir` — no `afterAll`, no exit handler, no prune a consumer can call.

so a dir made by `genTempDir` lives for **7 days**, and every downstream repo pays the same leak.

## why it matters

measured in `ehmpathy/rhachet` on 2026-08-30:

| /tmp population | count |
|---|---|
| abandoned test fixture dirs | **12,901** |
| all else | 2,484 |

~84% of `/tmp` was abandoned test fixtures. the costs, in the order they bite:

1. **slow boot** — `systemd-tmpfiles-setup.service` walks `/tmp` at boot; a large `/tmp` blocks boot
   for minutes on a LUKS system
2. **degraded tools** — a ripgrep over `/tmp` blew a 20s timeout purely on directory count
3. **inode pressure** — dirs plus contents hold inodes that are never returned
4. **an age gate cannot keep up** — the key one. a 7-day prune is the same shape as a
   `find /tmp -mtime +3 -delete` timer, and fixtures are remade far faster than any age gate clears
   them. rhachet's acceptance suite alone makes **432 temp dirs per full run**.

`genTempDir`'s containment (`/tmp/test-fns/{repo}/.temp/`) already serves costs 1–2 well. the gap is
cost 4: **no mechanism returns the dirs at end of run.**

## three shapes the probes closed — read this before you design

each is a natural reach. all three are **disproven** under jest, empirically, in
`ehmpathy/rhachet` on 2026-08-31.

### ⛔ a process-scoped in-memory registry

the natural design is "record each dir at allocation, prune the recorded set at teardown."

**a module-level registry is empty on every test file.** jest resets the module registry per test
file, so the module instance is NOT shared across a worker's files. a registry populated by file 1
is gone when file 2 loads.

### ⛔ an internal `process.on('exit')` registered at first allocation

the next reach is "then register the teardown on the process, not the module."

**jest kills its workers; the hook never fires.** a probe registered `exit`, `beforeExit`, and
`SIGTERM` handlers from a test file, then logged from `afterAll`:

```
TEST_A     pid=1556141 isRealProcess=true
AFTERALL_A pid=1556141 listeners=1
```

the handler sat on the **real** process and was **still registered** at teardown — yet no `EXIT_A`,
no `BEFOREEXIT_A`, no `SIGTERM_A`, and no error-fallback file.

**what this settles:** a library cannot own the teardown invisibly. whatever `test-fns` registers
from inside a test file never runs. **the reclaim must hang off a framework hook the framework
itself calls.** that costs the consumer config — and that cost is unavoidable, not a design lapse.

### ⛔ a per-worker id minted into `process.env`

if the id cannot live in a module, `process.env` looks like the next home. it is not.

14 test files across 6 workers, each file mint-once-if-absent. worker 4 ran **nine** of them:

```
worker=4 pid=1585559 session=Syvtxvf minted=true
worker=4 pid=1585559 session=Sou8fn9 minted=true
…nine lines, one pid, nine ids, every one minted=true
```

jest hands each test file a **fresh copy** of env, so a worker-local mint is erased between files.
**the id must exist before the workers do.**

## the shape that holds

**ownership in the name, minted before the fork, pruned from a framework hook.** no in-memory
state at all — the disk is the record.

### 1. mint the session before the workers exist

```ts
// test-fns/jest/globalSetup — runs once, in the jest main process, before the pool
process.env.TEST_FNS_SESSION ??= genId();
```

the handoff is verified: `JEST_WORKER_ID` is injected by jest-worker at fork
(`env: { ...process.env, JEST_WORKER_ID }`) and reached every test file's env copy, **nine files
deep** in worker 4 above. whatever sits on the main env at fork time arrives the same way. the
in-band case (one test file, no fork) needs no propagation at all.

### 2. fold the session into the dir name

`computeTempDirName` already yields `{timestamp}.{slug}.{8-hex}`, and its parse regex takes `.+`
for the slug — so a session id rides the slug and survives both the write and the age-gate parse.

```ts
slug: `s${process.env.TEST_FNS_SESSION}.${input.slug}`
```

### 3. prune by session from a framework hook

```ts
// test-fns/jest/setupAfterEnv — runs per test FILE, in every worker
afterAll(() => pruneTempDirs());

export const pruneTempDirs = () => {
  if (KEEP) return sayKept();   // TEST_FNS_KEEP — see below
  for (const name of readdirSync(DIR_CONTAINED))
    if (name.includes(`.s${SESSION}.`))
      rmSync(join(DIR_CONTAINED, name), { recursive: true, force: true });
};
```

a consumer wires two config keys, **once per repo**:

```ts
globalSetup: 'test-fns/jest/globalSetup',
setupFilesAfterEnv: [...extant, 'test-fns/jest/setupAfterEnv'],
```

### why the disk beats a registry

three hazards that would each empty an in-memory list cannot rename a directory:

| hazard | a registry | the name |
|---|---|---|
| module registry reset per test file | list is empty | dir still stamped |
| a worker dies mid-file | its list is lost | a live peer worker's `afterAll` still claims them |
| a scoped run picks a subset | list holds only that subset | every stamped dir is claimed |

## the hazards to design against

1. **never prune by a bare prefix glob.** the filter must be the session, never the class prefix —
   otherwise a parallel run takes a peer's live dirs. peer-safety is then a property of the name
   rather than a check that could be wrong.
2. **the teardown must not be per-case or scope-dependent.** a per-case prune reads its dir list as
   of the moment it runs, so dirs registered later survive every run — and under a scoped run its
   whole subject set goes unpruned. a prior incident of exactly this accrued **1,786 orphan dirs
   under a green clamp**. the cure was structural: a teardown neither order nor scope can step
   around, that fails LOUD.
3. **fail loud, never silently partial.** one un-removable path must not abort the batch — prune the
   rest, then throw with the residue named. `rhx clone prune` in `ehmpathy/rhachet` already does
   exactly this and is worth a read as precedent.
4. **keep the age gate.** it is the backstop for the two cases a session prune structurally cannot
   reach — a `TEST_FNS_KEEP` hold, and a `kill -9`'d run whose teardown never runs. their dirs carry
   a dead session, so no later run claims them. shorten the gate (see #66), never remove it.

## `TEST_FNS_KEEP`

an escape hatch so a human can inspect a failed test's fixture: the prune becomes a no-op for that
session and says where the dirs sit. it depends on the age gate to eventually reclaim them, which is
the second reason the gate must stay.

## a note on frameworks beyond jest

the probes are jest-specific, but the conclusion is not: any runner that kills its workers denies a
library an in-process teardown. the same three parts port — mint before the workers, stamp the name,
prune from whatever teardown hook the runner calls. only the two config keys change shape.

## context

filed from `ehmpathy/rhachet` behavior `v2026_08_30.fix-test-tempdir-leak` (see ehmpathy/rhachet#488).

that behavior **depends on this one** rather than bridges around it: the probes above showed a
rhachet-local wrapper would reimplement, verbatim, what belongs here — and every other test-fns
consumer would keep its leak. so rhachet's own deliverable is a version bump, two config keys, and a
regression clamp that counts dirs before and after a run.

pairs with #65 (expose the physical path) and #66 (one temp scope per repo, not per worktree;
shorten + expose the age gate).
