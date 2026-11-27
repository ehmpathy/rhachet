# F14 — an external json guard throws a named drift, not an `.assure`

## .the fork

the claude reply readers (profile, mint, usage) narrow fields with
`if (typeof x !== '…') throw new MalfunctionError(…, { keys })`. a peer review (r6) asked for an
`is$Noun.assure` (type-fns) instead.

- **A** — keep the typed guard, which names the reply and the keys it held
- **B** — an `isString.assure(...)` per field

## .taken, why

**A**. the guard is the moment a provider changed its contract; the on-call needs to know which
reply drifted and what it held (`rule.require.failloud`). B throws a generic type error with no
reply name and no keys. the repo uses `.assure` in 16 places, each on a shape it owns, never on a
third-party reply.

## .rework

clean: three files, a guard each.

## .confidence — 80%, why not higher

an `.assure` wrapped in `MalfunctionError.wrap` would keep the context; whether that earns the
extra layer is taste.

## .where

- `src/domain.operations/brain/auth/account/claude/getOneClaudeProfile.ts`
- `src/domain.operations/brain/auth/account/claude/getOneClaudeAccessMinted.ts`
- `src/domain.operations/brain/auth/account/claude/asBrainAuthUsageFromClaudeReply.ts`

## .verdict

open.
