# F8 — a second `set` of a held account files the new login, and reports `renewed`

## .the fork

case=1 [t1] says a second `set` for a held account reports `unchanged`. but a `set` always ends in
a fresh oauth login, which yields a new refresh token. two readings:

- **A** — file the new login over the old, report `renewed`
- **B** — keep the old token, discard the new login, report `unchanged`

## .taken, why

**A**. case=5 tells a human whose account reads `dead` to run `rhx brains auth set` again; under B
that repair would keep the dead token and report `unchanged`, a lie that leaves the account dead.
the keyrack still holds one credential per account under A, which is the half of [t1] that
matters.

## .rework

clean: the word in one render and one branch in `setBrainAuthAccount`.

## .confidence — 75%, why not higher

the vision's word was `unchanged`; the wisher may have meant "no new account", which A's `renewed`
also says, or may want B with a separate repair verb.

## .where

- `src/domain.operations/brain/auth/account/setBrainAuthAccount.ts`
- `src/contract/cli/invokeBrainsAuthSet.ts`
- case=1 [t1] — the inventory cell should read `renewed` if this holds

## .verdict

open.
