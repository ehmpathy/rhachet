# F56 — must a `findsert*` operation wrap its fs primitives in named communicators?

- **raised** = 2026-09-30, at `5.1.execution.from_vision`, `review.peer i010` — `arch-opport-decomposition`
  nitpick.2 (`findsertBudgetIntoBootYml`, `findsertRepoThisRoleAnyBootGuard`, `getOneBootConfigForSource`)
- **rework** = clean
- **status** = OPEN — **no wrap**
- **confidence** = **80%**

## .the fork, stated fairly

| | **wrap each primitive** (`isFileOnDisk`, `setFileContent`) | **keep the primitive inline** (taken) |
|---|---|---|
| grain | the findsert becomes an orchestrator over two communicators | the findsert IS the communicator — its job is one idempotent file write |
| compute | unchanged — already named (`asBootYmlParsed`, `computeBootMode`, `asBootYmlWithBudget`) | unchanged |
| cost | two one-line wrappers per file, each a rename of `node:fs` | none |
| precedent | `isBootSpecOnDisk` — a private one-liner in `assertRegistryWithinBudget` | `findsertDefaultActorGitignoreExclusion`, `setRepoBrainDirSymlink` — the peer findserts in `init/boots/` call `node:fs` inline |

## .the call, and why

**no wrap.** a `findsert*` operation is the i/o boundary by its verb: it checks presence and writes
once, idempotent. its compute — the parse, the mode branch, the render — is already delegated to
named transformers, so the body reads as check → named compute → write. a one-line wrapper around
`existsSync` renames a primitive; it separates no grain. the peer findserts in this dir keep `node:fs`
inline, so a wrap here would split the dir into two conventions.

## .why the confidence is 80%

the reviewer's point that `getOneBootConfigForSource` is a READ (a `get*`) is fair — a get that
guards with a raw `existsSync` beside a classified read is closer to a mixed grain. a second such
reader, or a race that the unclassified check hides, settles it toward a named `isFileOnDisk`.

## .rework

clean — add a shared `isFileOnDisk({ path })` and a `setFileContent({ path, content })` communicator,
and route the three sites through them.
