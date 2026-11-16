# F7 — the keyrack host manifest write lock is a host-scope mutex inside keyrack

## .the fork

the keyrack host manifest (`~/.rhachet/keyrack/keyrack.host.age`) is one file per owner, rewritten
whole on each set. `get` and `use` write a rotated token on every call, and a pool rotation (#575)
will run them concurrently. a lost update drops a token, and since a refresh token is single-use, a
dropped one is a dead account.

- **A** — a host-scope mutex, taken by the brains auth ops around each slot read-modify-write
- **B** — a lock inside keyrack itself, around a fresh read, the merge, and the write, so every
  keyrack writer is guarded, `rhx keyrack set` and `del` included
- **C** — the repo-scope `withRepoMutex` as-is

## .taken, why

**B**. `setKeyrackHostManifestHosts` takes `withHostMutex` over the manifest path, re-reads the
manifest within the hold, applies the caller's `mutate` to those hosts, and writes.
`setKeyrackKeyHost` and `delKeyrackKeyHost` both file their entry through it; the findsert check
reads the fresh hosts too.

- A guards only the brains auth writers; a `rhx keyrack set` in another repo still loses a key
- C is wrong: its lock cache lives in the repo, so two repos would not exclude each other on a
  machine-wide file
- the stale `context.hostManifest` stays the input to vault and org decisions; only the manifest
  write rests on the fresh read, which is the part a peer can change

the host mutex rides `withRepoMutex`, the one `with-simple-mutex` owner: it gains an optional
`locksDir`, and `withHostMutex` calls it with `repoPath = $HOME`, `locksDir = ~/.rhachet/.locks`.

## .rework

clean. the lock is one op with two callers; the brains auth slot ops hold no lock of their own.

## .confidence — 85%, why not higher

the recipient ops (`setKeyrackRecipient`, `delKeyrackRecipient`) and `initKeyrack` still write the
manifest without the hold. they rewrite recipients, not hosts, and run by hand, never in a pool.

## .where

- `src/domain.operations/keyrack/setKeyrackHostManifestHosts.ts`
- `src/domain.operations/keyrack/setKeyrackKeyHost.ts`, `delKeyrackKeyHost.ts`
- `src/infra/lock/withRepoMutex.ts` (the `locksDir` option), `src/infra/lock/withHostMutex.ts`
- clamp: `setKeyrackKeyHost.integration.test.ts` [case12] — red on the stale read, green on the fix

## .verdict

open.
