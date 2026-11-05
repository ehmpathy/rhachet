# F17 — delete `asRoleRefsFirstSeenPerRole`

## .the fork

after F11, its two callers (`getAllLinkedRoleRefs`, `asRoleRefsForEnrolledSlugs`) no longer
dedupe:

- **a — delete it and its test** (taken)
- **b — keep it, unused**, for a later caller

## .taken, and why

a. an unused transformer is dead code. the cli ambiguity refusals (`findUniqueRoleDir`,
`findUniqueSkillExecutable`) never used it.

## .rework

clean. git holds it; a later caller restores it from history.

## .confidence — 95%

- the caller census is two files, both read

## .risk

low — no credential, no prod write. the type check names any caller the census missed.

## .where

- `3.3.1.blueprint.product.yield.md` — `[-] asRoleRefsFirstSeenPerRole.ts`

## .verdict

ruled, taken (a) — director, 2026-11-04 15:45Z, on the commander's hand-off of the blueprint
review: delete it and its test. dead code.
