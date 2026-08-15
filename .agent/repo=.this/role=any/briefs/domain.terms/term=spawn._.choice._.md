# domain.term: spawn

term.chosen   = spawn
term.kind     = noun            # the live-process artifact of a clone; a dop object ([...noun])
term.synonyms.forbidden:
- process
- child
- instance
- run

## .what

a **spawn** is the **live child process** a **clone** stands up when it starts — the active
brain-cli plus its socket server. it is the *live* half of a clone: where the **clone** is the
durable on-disk record (identity.json + history + the socket path), the **spawn** is the ephemeral
OS process + its bound socket that a `CloneSpawnHandle` reaches. a spawn is minted by
`genBrainCliPtyClone` (pty branch) or `genBrainCliPlainClone` (fallback branch), and reaped by
`delCloneSpawn` (the loser-reap: dispose the child, unlink the socket, remove the dir). its liveness
IS the socket's connectability (`isCloneLive`), so a clone with no live spawn reads DEAD.

## .refs

- src/domain.operations/clone/genClone.ts                       (CloneSpawnHandle; returns {outcome, clone, spawn})
- src/domain.operations/clone/pty/genBrainCliPtyClone.ts        (mints a spawn via node-pty)
- src/domain.operations/clone/pty/genBrainCliPlainClone.ts      (mints a spawn via plain fallback)
- src/domain.operations/clone/delCloneSpawn.ts                  (reaps a spawn)

## .reason

see the ref-level cluster beside this choice:
- `term=spawn._.choice.reason.md` — etymology, the clone-vs-spawn axis, why not process/child/instance
