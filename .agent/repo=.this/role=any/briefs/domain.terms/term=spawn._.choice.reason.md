# domain.term.choice.reason: spawn

## .etymology

why `spawn`: node's own process API is `child_process.spawn`, so the word already names "start a
child process" in the runtime this code lives in. we adopt it as the noun for the artifact that call
produces — the live child. chosen over `process` (overloaded: `process.env`, `process.exit`, the
global — a spawn is OUR child, not the node global), `child` (relational, not standalone — "child of
what?"), `instance` (generic OO jargon, silent on liveness), and `run` (a verb doing noun-duty, and
already the name of the CLI entrypoint `bin/run`).

## .the clone-vs-spawn axis

the two words name the two halves of one live actor-run, split by durability:

| axis | clone | spawn |
|------|-------|-------|
| durability | durable on-disk record | ephemeral OS process |
| holds | identity.json, history/, socket path | the live brain-cli + its bound socket server |
| survives exit? | yes (the record remains, reads DEAD) | no (dies with the process) |
| addressed by | `@:<serial>` / `@:<slug>` | a `CloneSpawnHandle` (in-process) |
| minted by | `genClone` (findsert) | `genBrainCliPtyClone` / `genBrainCliPlainClone` |
| reaped by | (the dream's `delClone`) | `delCloneSpawn` |

a clone OWNS at most one live spawn at a time. `genClone` returns `{clone, spawn}` where `spawn` is
`null` on a pure reuse (the prior clone's spawn is already live, not re-minted). liveness is never
stored — it is derived from whether the spawn's socket accepts a connection (`isCloneLive`), so
"clone with a dead spawn" and "clone with no spawn" are one observable state: DEAD.

## .evidence

- discovery: scenario timeline — a clone is enrolled (record persisted), its spawn goes live
  (socket bound), a `say` reaches the spawn, the human exits (spawn dies, record stays DEAD), a
  future `wake` re-mints a spawn against the same record. the two words track two lifetimes on one
  timeline.
- refs: `CloneSpawnHandle` (`genClone.ts`), `delCloneSpawn.ts`, the pty/plain mint pair.
- invariant: a spawn's liveness = its socket's connectability; no stored liveness field (F4).
