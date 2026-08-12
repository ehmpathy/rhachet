# domain.term.choice.reason: source

## .etymology

straight from the POSIX shell builtin `source` (and its `.` alias): *"read and execute
commands from a file in the current shell environment."* the decisive half of that gloss is
**"in the current environment"** — `source ./env.sh` differs from `./env.sh` precisely in
that the former mutates the shell you already occupy, while the latter spawns a child and
throws its env away.

keyrack's `source` does exactly that job, in exactly that sense: it writes into
`process.env` of the caller. every human who has ever run `source ~/.bashrc` already knows
what it promises, which is the whole reason to keep a word that sits outside the sanctioned
verb set.

## .disputes

### dispute: set  —  raised 2026-08-06  —  status: RESOLVED (keep `source`)
- raised.by  = beaver (self, on the r010 pass at i053)
- claim      = `rule.require.get-set-gen-verbs` sanctions get / set / gen / del, and
               `source` mutates state (`process.env`), so by the letter of the rule it
               should be `setEnvFromKeyrackKeys`.
- counter    = `set*` already carries one sense in this subsystem: **write to a vault or a
               host manifest** (`setKeyrackKeyHost`, `vault.set`). to spend it a second time
               on "write to the caller's process env" would be one word over two concepts,
               which is the overload `rule.require.ubiqlang` forbids — and it would do so on
               the axis where a mistake is most expensive, since one `set` persists a secret
               and the other does not.
               the rule itself carves the exit: *"domain-specific verbs for imperative
               commands only if not matched to pattern."* `source` is an imperative command
               whose effect no sanctioned verb names.
- resolution = keep `source`; record `load`, `inject`, `hydrate`, `import`, `populate` as
               forbidden synonyms. dispute closed.

### dispute: export  —  raised 2026-08-06  —  status: RESOLVED (both live, NOT synonyms)
- raised.by  = beaver (self)
- claim      = `export` and `source` both describe "get credentials out of keyrack and into
               a shell", so one of them is redundant.
- counter    = they name two different acts, and this repo performs both:
               - **`export`** — `keyrack get --for repo` prints `export FOO=…` lines for a
                 caller to `eval`. keyrack emits TEXT; another process decides what to do
                 with it. `assertKeyrackExportNamesDistinct` guards this act by name.
                 keyrack never writes an env var here — `vaultAdapterOsEnvvar.set` throws.
               - **`source`** — `keyrack.source()` mutates `process.env` of the caller
                 directly. no eval, no text, no second process.
               the collision hazard they share (a flat name namespace, e23/q11) is what makes
               them look alike. the ACT differs, so the words must too.
- resolution = both terms stay, each with one sense. neither is a synonym of the other.
               dispute closed.

## .evidence

**the two acts, read from source rather than inferred:**

```ts
// vaultAdapterOsEnvvar.ts:123-137 — keyrack does NOT write env vars on the export path
set: async () => { throw new UnexpectedCodePathError(...) },
del: async () => { throw new UnexpectedCodePathError(...) },
```

```ts
// sourceAllKeysIntoEnv.ts — the source path DOES write, into the caller's own process
process.env[envVarName] = key.grant.key.secret;
```

**the shell precedent that names it** — `source` is defined by POSIX as execution *in the
current environment*, which is the one property that distinguishes it from a plain invocation.
that is the identical property that distinguishes `keyrack.source` from `keyrack.get`.

**why the term was captured at i053:** the round found that `keyrack.source` was absent from
the vision's q12 *"command surface, walked end to end"* table — the second command to escape
it (after `del` at q13). a command whose word was never itemized is a command easy to skip in
an audit that runs on recall.

## .see also
- `term=reach._.choice.reason.md` — the axis `source` now threads
- `rule.require.get-set-gen-verbs` — the sanctioned set this word sits outside, by exception
- `rule.require.ubiqlang` — one concept per term, which the `set` dispute turns on
