# F13 — `withRepoMutex.locksDir` is optional, like its peer knobs

## .the fork

`withRepoMutex` gained `locksDir?: string` so `withHostMutex` can key under the home dir. peer
reviews (r6, r7) asked for `string | null`, required.

- **A** — keep `locksDir?`, beside the extant `waitMs?` and `leaseMs?` of the same input
- **B** — make all three `| null` and required, and pass nulls at every caller
- **C** — make only `locksDir` required

## .taken, why

**A**. `waitMs?` and `leaseMs?` are on main, in the same input, as optional knobs with defaults.
C splits one input into two conventions. B ripples to five prod callers and a dozen test calls
for a change of no behavior. `withHostMutex`, the new op, carries no optional input: its unused
`waitMs?`/`leaseMs?` were cut.

## .rework

clean for B: a mechanical edit of each `withRepoMutex` call.

## .confidence — 80%, why not higher

`rule.forbid.undefined-inputs` may intend B for infra knobs too; its exception names only context
and options args.

## .where

- `src/infra/lock/withRepoMutex.ts`
- `src/infra/lock/withHostMutex.ts`

## .verdict

open.
