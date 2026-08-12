# domain.term: prune

term.chosen   = prune
term.kind     = verb
term.synonyms.forbidden:
- restart
- reap
- recycle
- bounce
- refresh
- reload

## .what

to **kill a long-lived process**, so the next invocation respawns it from the current bytecode.

a prune acts on the **process**, never on its contents. that is the whole of the term, and it is the
part most easily lost — because the act that empties a daemon's *contents* (`relock`) looks like it
should be the same word, and is not.

## ⚠️ .the three-way split this term sits in

`del`, `relock`, and `prune` all read as "get rid of it". they act on **three different layers**,
and to confuse the middle one for the last is the error this term exists to prevent:

| verb | acts on | what survives | inverse |
|------|---------|---------------|---------|
| `del` | the **vault** entry | the process, the session | a `set` |
| `relock` | the daemon's **in-memory store** | the process — **and its compiled-in logic** | an `unlock` |
| `prune` | the daemon **process itself** | the vault entries on disk | any command (it respawns) |

⚠️ **`relock` does NOT refresh a daemon's code.** it empties the store inside a process that lives
on with the bytecode it was born with. only `prune` replaces the code. that distinction cost an
hour on 2026-08-10 — see `.reason`.

## .the one word that is NOT a synonym

`kill` — as in `killKeyrackDaemon` — is a **narrower operation**, not another word for this one:

- `prune` takes an **owner** (or `@all`), and may kill several daemons, or none
- `kill` takes **one socket**, and is the mechanism `prune` composes

so `killKeyrackDaemon` is correctly named and is not a drift. the layers differ; the words should.

## .refs
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/pruneKeyrackDaemon.ts`  # the declared dop
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/killKeyrackDaemon.ts`   # the narrower mechanism it composes
- `src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains.ts`  # the same verb, outside keyrack
- `src/domain.operations/brains/pruneOrphanedRoleHooksFromOneBrain.ts`
- `src/contract/cli/invokeKeyrack.ts`  # `keyrack daemon prune`, the published command

## .on the brains usage

`pruneOrphanedRoleHooksFrom*Brain` prunes **entries**, not a process — so the term is broader than
the keyrack case alone. the constant across both is **removal of what has gone stale**, whether that
is an orphaned hook or a process whose bytecode has aged out. that is the sense; the keyrack daemon
is its sharpest instance, not its definition.

## .reason
see the ref-level cluster beside this choice:
- `term=prune._.choice.reason.md` — etymology, the relock confusion that earned it, evidence, invariants
