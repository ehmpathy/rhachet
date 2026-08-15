# domain.term: prune

term.chosen   = prune
term.kind     = verb            # a dop verb ([verb][...noun])
term.synonyms.forbidden:
- reap
- restart
- recycle
- bounce
- refresh
- reload
- cleanup
- gc
- sweep
- purge
- vacuum

## .what

to **prune** is to **remove what has gone stale**. that is the constant across every instance, and
the instances differ only in *what* is stale:

| instance | what is pruned | what survives |
|----------|----------------|---------------|
| `keyrack daemon prune` | the daemon **process** | its vault entries on disk |
| `clone prune` | an actor's **finished (DEAD) clones** | the actor, its config, its live clones |
| `pruneOrphanedRoleHooksFrom*Brain` | orphaned **hook entries** | the brain config around them |

a prune acts on the target itself, never on its contents. that is the part most easily lost — the act
that empties a daemon's *contents* (`relock`) looks like it should be the same word, and is not.

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

## .the clone instance — safe-by-default

`rhx clone prune` removes the **finished (DEAD) clones** an actor has accrued — the clone dir, its
identity, its socket file, and its `.slugs`/`.serials`/`.exids` index entries — so `list` stays
legible and `.agent/.actors/` does not grow unbounded. it is **safe-by-default**: the bare
`rhx clone prune` PREVIEWS (plan mode) what it would prune; `--mode apply` commits it. it NEVER
touches a LIVE clone (it answers a say) nor a DEAF clone (still an active process), nor a cross-host
clone whose pid it cannot verify — only a finished, same-host DEAD clone is pruned. the apply loop is
RESILIENT: one failed removal does not abort the batch — it prunes the rest, then fails loud with the
serials it could not prune (never a silent partial).

## .refs

- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/pruneKeyrackDaemon.ts`  # the declared dop
- `src/domain.operations/keyrack/daemon/sdk/src/domain.operations/killKeyrackDaemon.ts`   # the narrower mechanism it composes
- `src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains.ts`  # the same verb, outside keyrack
- `src/domain.operations/brains/pruneOrphanedRoleHooksFromOneBrain.ts`
- `src/contract/cli/invokeKeyrack.ts`  # `keyrack daemon prune`, the published command
- `src/contract/cli/invokeClonePrune.ts`                          # the `rhx clone prune` surface
- `src/domain.operations/clone/getAllClonesPrunable.ts`           # enumerate the DEAD, age-gated clones
- `src/domain.operations/clone/computeClonePruneDecision.ts`      # the pure prune|keep classifier
- `src/domain.operations/clone/cli/asClonePruneView.ts`           # the plan/apply render
- `src/domain.operations/clone/delCloneSpawn.ts`                  # the per-clone removal primitive

## .reason

see the ref-level cluster beside this choice:
- `term=prune._.choice.reason.md` — etymology, the relock confusion that earned it, why not reap/cleanup/gc, the plan-by-default safety tie
