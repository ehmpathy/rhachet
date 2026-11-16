# F16 — the `brains auth` verb registrars load eager; each verb's action loads its graph lazy

## .the fork

`invokeBrains.ts` imports the three verb registrars (`invokeBrainsAuthSet`, `…Get`, `…Use`) at the
top. `rule.require.thinnest-import-path` prefers a table of lazy loaders over N commands.

- **A** — a lazy table per verb, as `invoke.ts` does for top-level commands
- **B** — keep the registrars eager; every heavy import already sits inside each verb's action as an
  `await import(...)`

## .taken, why

**B**. the rule's cost is per file a call loads that the call never runs. each registrar's top-level
imports are commander types, `helpful-errors`, `iso-time`, `getHomeDir`, `getOneRepoPath`, and four
cli modules (`asCliOutputMode`, `getCliInvocationArgs`, `renderCliOutput`, `withCliOutputErrors`)
that all three share. the ops, the keyrack, the provider reads and the tree renders load inside each
`.action` (`await import` at `invokeBrainsAuthSet.ts:38-61`, `invokeBrainsAuthGet.ts:42-63`,
`invokeBrainsAuthUse.ts:69-89`). so a lazy table saves two small files per call.

and commander must hold all three subcommands at register time, so `rhx brains auth --help` can list
them and an unknown verb can be refused (`define.invariant.an-unknown-flag-is-refused-never-dropped`).
a lazy table would have to declare each verb's name, description and options apart from the file
that owns them: two homes for one contract.

`invokeBrains` itself is already behind the lazy top-level table in `invoke.ts`, so no other
command pays any of it.

## .rework

clean. split each registrar into a declaration and a lazy action; no caller changes.

## .confidence — 80%, why not higher

the saving was not measured with a `Module._load` hook; the "two small files" figure is read from
the import lists, not counted at run time.

## .where

- `src/contract/cli/invokeBrains.ts`
- `src/contract/cli/invokeBrainsAuthSet.ts`, `invokeBrainsAuthGet.ts`, `invokeBrainsAuthUse.ts`

## .verdict

disputed — for the council.
