# domain.term: orphan

term.chosen   = orphan
term.kind     = noun            # also adj (`orphaned`), in a dop name
term.boundary = repo            # it holds across clone, keyrack, brains, roles, upgrade
term.synonyms.forbidden:
- stray
- dangler
- leftover
- zombie
- abandoned
- leaked

## .what

an **orphan** is a resource that **outlives the owner responsible for its lifecycle**.

the owner is gone; the resource is not. so nobody is left who would ever clean it up, and no
subsequent read can tell it apart from a live one by inspection alone.

| instance | the resource | the owner that went away |
|----------|--------------|--------------------------|
| an orphan **socket** | a `.sock` on disk | the process that bound it |
| an orphan **hook entry** | a role hook in a brain config | the role it pointed at |
| an orphan **brief ref** | a `.md.min` with no source | the brief it was built from |
| an orphan **process** | a package manager, still alive, still holds its store lock | the shell that spawned it |

## ⚠️ .one concept, two substrates — do NOT split it

three of the rows above are **inert** (a file, an entry) and one is **alive** (a process). that
difference is real and it is not a difference of concept: in every row the resource outlived its
owner, and in every row the cost is the same — it is invisible, it accrues, and it is nobody's.

⇒ so `orphan` is **not** overloaded (`rule.forbid.domain-term-ambiguity` is satisfied). the
substrate varies; the concept does not. the tell is the inverse: every row is cured by the same
verb, `prune`.

## .the relation to `prune`

`prune` is the verb; `orphan` is its most common object. `pruneOrphanedRoleHooksFromAllBrains`
names both, which is why the pair must stay consistent.

⚠️ **an orphan is a KIND of stale, never a synonym for it.** `prune` removes "what has gone
stale" — and staleness has other causes than an absent owner (a DEAD clone had an owner and it
finished normally). so every orphan is prunable; not all that is prunable is an orphan.

## ⚠️ .an orphan is not a LEAK, and the two get conflated

- a **leak** is the *process* by which orphans accrue — a defect in a teardown route
- an **orphan** is the *artifact* that process leaves behind

⇒ so "the leak is closed" and "the orphans are gone" are **different claims**, and a fix can
achieve the first and leave the second entirely intact. measured 2026-09-04 — see `.reason`.

## .refs

- `src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains.ts`  # the declared dop
- `src/domain.operations/brains/pruneOrphanedRoleHooksFromOneBrain.ts`
- `src/domain.operations/role/getRoleFileCosts.ts`         # `{ refs, orphans }` — an internal contract field
- `src/contract/cli/invokeRepoIntrospect.ts`               # fails fast on orphan `.md.min` briefs
- `src/domain.operations/clone/socket/genCloneSocketServer.ts`  # the "no orphan socket" guarantee
- `src/domain.operations/upgrade/asNpmInstallShellPresence.ts`  # the orphan-process hazard
- `src/domain.objects/CloneOndisk.ts`                      # the deferred orphan-cost verdict

## .reason

see the ref-level cluster beside this choice:
- `term=orphan._.choice.reason.md` — etymology, why not stray/zombie/leaked, the leak-vs-orphan
  split and the 2026-09-04 measurement that earned it
