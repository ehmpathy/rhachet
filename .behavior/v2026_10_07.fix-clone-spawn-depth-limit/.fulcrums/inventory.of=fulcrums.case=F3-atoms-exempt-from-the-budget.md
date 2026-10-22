# F3 — atoms are exempt from the spawn budget

**the fork:** (a) refuse atoms at depth 1 too · (b) let atoms through.

**taken:** (b). an atom is one api request: no process, no tools, so it cannot spawn a further
brain. the blowup the wish names is a brain that spawns brains; an atom cannot.

**rework:** clean — one wrapper gains the same check.

**confidence:** 80%. a depth-1 reviewer could still loop atoms and spend tokens; that is a cost
bound, not a depth bound.

**where:** `src/domain.operations/brain/asBrainAtomWithContextBound.ts` (untouched).

**verdict:** —
