# domain.term: wedged

term.chosen   = wedged
term.kind     = adj             # a clone reach-state: [...noun][state]?
term.synonyms.forbidden:
- stuck
- hung
- frozen
- stalled
- unresponsive
- jammed

## .what

a **wedged** clone is one whose dispatch **socket** ACCEPTS a connection but never
ACKNOWLEDGES a dispatched message — it neither cleanly delivers (a LIVE, responsive clone
acks `queued` then `delivered`) nor cleanly refuses (a DEAD clone's socket is absent /
connection-refused). it is the in-between fault: the channel is open, but the brain behind
it does not lift the message off its input.

`wedged` is one of the clone REACH-CAUSES (`computeCloneUnreachableHint`'s cause set:
`DEAF` / `DEAD-same-host` / `DEAD-cross-host` / `exited-mid-dispatch` / `wedged`).
`sayClone` detects it via the in-flight window: a dispatch that receives no `delivered`
ack within the (length-scaled) wedged timeout is reported `wedged`, fails loud with a hint
that names the fix — never a silent drop (rule.forbid.failhide).

distinct from `dead`: a DEAD clone's socket refuses the connection outright; a WEDGED
clone's socket connects but the ack never comes. the two demand different fixes, so they
are named apart.

## .refs

where the term is declared / used:
- src/domain.operations/clone/socket/sayClone.ts                     (the `wedged` reach-cause + the in-flight timeout)
- src/domain.operations/clone/socket/computeCloneWedgedTimeout.ts    (the length-scaled window that detects it)
- src/domain.operations/clone/computeCloneUnreachableHint.ts         (`cause: 'wedged'` → the hint that names the fix)
- src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts  (case5: a raw server that accepts but never acks)

## .reason

see the ref-level cluster beside this choice:
- `term=wedged._.choice.reason.md` — etymology, why not stuck/hung/stalled, the dead-vs-wedged split
