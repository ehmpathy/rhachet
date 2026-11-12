# F8 — the fleet gate keys on the live boot at the first say

## .the fork

the gate groups clones whose first requests would share one cache entry. which bytes key that group?

- **A** — the hash of the actor's live `boot.md`, read at the first say. no clone state; one leaf reads it
- **B** — a key stamped at spawn into the clone's `identity.json`: the exact boot bytes, plus the model
  and tool args the clone was spawned with

## .taken

A. `identity.json` holds durable identity only, a serial and a slug (`rule.forbid.per-clone-config`); a
spawn-time fingerprint of `{ brain, roles }` is a frozen copy of what the actor owns. A misses in two
narrow cases, and each costs one bounded wait, never a wrong answer:

- a re-render between a clone's spawn and its first say re-keys that clone, so it may wait on a lead of
  a boot it does not run
- the hash leaves out the model, so a haiku clone may wait on an opus lead whose cache it cannot read

each wait ends at `BOOT_CACHE_LEAD_UNANSWERED_MS` (45s) at most, then the say goes unheld. the
`getOneBootHashOfActor` docblock states both misses.

## .rework

clean — B is one field stamped in `setCloneIdentity` at spawn and one read swap in
`holdFirstSayForBootCache`; no caller outside `clone/fleet/` reads the key.

## .confidence — 70%

B is more exact, and the model miss is real for a mixed-model fleet. A rests on the identity rule and on
a bound wait as the whole cost; a fleet of one model on one render (the common case) never meets either
miss.

## .where

- `src/domain.operations/clone/fleet/getOneBootHashOfActor.ts`
- `src/domain.operations/clone/fleet/holdFirstSayForBootCache.ts`

## .verdict

open
