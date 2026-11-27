# census — lanes B/C/D, re-derived

> **audience: whoever executes this behavior.** the wish instructs *"re-derive it rather than trust
> it; a stale count is a poor bound on your own work"* — this is that re-derivation for the lanes
> the vision left as estimates. lane A (432 calls / 95 files, 1 allocator) was already re-derived in
> the vision and is unchanged.

date = 2026-09-02 · scope = `src/` (blackbox is lane A)

---

## the headline

the vision estimated **"~12 hand-rolled"** for lane B. the corpus holds **82 occurrences across
31 files**. but the edit count is far *lower* than either number, because lane B has the same
shape lane A does: **a few shared allocators, many callers.**

| measure | count | note |
|---|---|---|
| `tmpdir()` / `mkdtemp` occurrences in `src/` | 82 | across 31 files |
| of those, actual `mkdtemp` allocations | 21 | across 9 files |
| the rest | 61 | `os.tmpdir()` path-reads, not allocations |
| **shared test-infra allocators** | **3** | serve 12 downstream test files |
| **files with a direct `mkdtemp`** | **8** | after the one shared allocator is excluded |
| **prod files that touch `tmpdir()`** | **2** | ✅ already safe — see below |

so the migration surface is **3 allocators + 8 direct sites = 11 edits**, close to the vision's
estimate by luck rather than by method. the estimate's *reasoning* was wrong (it counted sites, not
allocators); its number happened to land near the right one.

## prod code is clean — the class really is test-only

two prod files reach for `tmpdir()`:

- `keyrack/adapters/ageRecipientCrypto.ts` (3)
- `keyrack/adapters/vaults/aws.params/asContextAwsApi.ts` (1)

`ageRecipientCrypto` writes temp **files** (`keyrack-encrypt-*.txt/.age`, `keyrack-decrypt-*.age`)
and `unlinkSync`s each in a `finally`. it allocates no directory and leaks none.

**this confirms the wish's framing rather than widens it.** the leak is a test-fixture defect, not a
repo-wide one, so no prod codepath needs a change.

## the three shared allocators

| allocator | callers | state |
|---|---|---|
| `src/.test/infra/withTempHome.ts` | 8 files | has a teardown; **peer-unsafe** — see below |
| `src/.test/infra/withTestHomeWithSshKey.ts` | ~4 files | wraps the above |
| `src/.test/assets/genTempPemFile.ts` | ~3 files | `mkdtemp`, no teardown |

a migration of these three reaches 12 downstream files with **zero call-site edits** — the same
leverage lane A gets from `genTestTempRepo`.

## ⚠️ a live defect the leak was hiding — `withTempHome` is peer-unsafe

`withTempHome.ts:20` builds a **deterministic** path, with no random suffix:

```ts
const tempHome = join(os.tmpdir(), 'rhachet-test', input.name);
```

and its `setup()` clears that path before it makes it:

```ts
setup: () => {
  rmSync(tempHome, { recursive: true, force: true });   // ⚠️
  mkdirSync(tempHome, { recursive: true });
  process.env.HOME = tempHome;
}
```

**verified:** all 8 call sites pass a distinct `name` (`initKeyrack`, `vaultAdapterOsDirect`,
`recipient-ops`, …), so **no two test files collide within one run**. the hazard is across runs:

> two concurrent runs of the same suite share `/tmp/rhachet-test/{name}`, and the second run's
> `setup()` **deletes the first run's live temp home** mid-test.

that is the wish's peer-safety criterion — *"a parallel run of the same suite does not reap a peer
run's live dirs"* — failing today, for a different reason than the leak. it is reachable now: two
worktrees, or a `--scope`d run beside a full one.

**it is also fixed for free by the vision's design.** a session id in the name makes two runs'
paths distinct, so the `rmSync` can only ever reach its own. no extra work; worth a note in the
execution stone so the fix is deliberate rather than incidental.

`withTempHome` is otherwise the closest shape in `src/` to the target — it already owns a
teardown. what it lacks is exactly what the vision supplies: **ownership in the name.**

## lane D — unchanged

2 sites, both via `blackbox/.test/infra/genTestTempDirNonRepo.ts`. unchanged from the vision.

## what this changes for execution

1. **budget 11 edits, not ~12 sites** — and 3 of them carry 12 files with them
2. **skip prod entirely** — verified safe, no changes owed
3. **`withTempHome` earns its own clamp** — the peer-wipe is a distinct failure from the leak, so a
   clamp that only counts leaked dirs will not catch a regression of it
