# F3 — client 30s wedge floor left below the new gate bound

- **fork**: a short `say` wedges at 30s with no ack; the gate now waits up to 65s. raise the wedge
  floor, have the server send an early "auth in progress" ack that re-arms the client, or leave it
- **taken**: leave it. the wish does not name the client; either cure changes the wire or a
  client-visible timer, which is its own behavior
- **rework**: clean — no code built on top of the gap
- **confidence**: 75% — a lookup of 30–60s still fails, just honestly (as a wedge)
- **where**: `src/domain.operations/clone/socket/constants.ts:114`, `sayClone.ts:61-63`
- **verdict**: settled by the wisher, 2026-11-01 — defer (seed S1); caught as dream `v2026_11_01.reseed.clone-say-wedge-below-auth-gate.md`
