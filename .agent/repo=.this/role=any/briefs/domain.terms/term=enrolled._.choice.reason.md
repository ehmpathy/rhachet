# domain.term.choice.reason: enrolled

## .etymology

`enrolled` is the past-participle of the wish's own verb, `rhx enroll`. the wish asks that "everytime
a brain is enrolled via rhx enroll, we want to find a record of that" — so the durable record IS the
**enrolled** actor. the word was already central in the domain (`enroll`, `enrollment`,
`enrollment.jsonl`, `genEnrollmentHash`); `enrolled` is its state form, chosen so the on-disk dobj
reads as one phrase: an `ActorEnrolled` is an actor, enrolled.

## .the act-vs-state axis (why the word matters)

the `actor` term already forbids `enrollment (the act, not the identity)` as a synonym for the
identity. `enrolled` sits on the OTHER side of that same axis and keeps it clean:

- `enroll` = the VERB (the act) — `rhx enroll`
- `enrollment` = the EVENT (one dated act) — a line in `enrollment.jsonl`
- `enrolled` = the STATE (the durable result) — `ActorEnrolled`, the record on disk

so the three never collide: one verb, one event-noun, one state-adjective, each for its own grain.

## .why not the rejected synonyms

- `registered` — implies a central registry/authority; enrollment is anonymous + hash-derived, no registry
- `persisted` / `saved` — describe the MECHANISM (it was written to disk), not the DOMAIN state; they
  would name how, not what (rule against a mechanism-named term)
- `installed` / `provisioned` — infra/ops jargon that imports a foreign frame; an actor is enrolled,
  not installed

## .disputes

### dispute: ondisk (as the actor-dobj suffix)  —  raised 2026-08-14  —  status: RESOLVED (dobj suffix → `ondisk`)
- raised.by  = vlad (the partition refactor)
- claim      = the on-disk actor dobj should carry the partition adjective `ondisk`
               (`ActorOndisk`), not the state word `enrolled` (`ActorEnrolled`) — so every identity
               grain reads on one axis: `ActorOndisk`/`ActorInmem`, `CloneOndisk`/`CloneInmem`.
- counter    = `enrolled` reads as one phrase ("an actor, enrolled") and descends from `rhx enroll`.
- resolution = the DOBJ partition suffix is `ondisk`/`inmem` (one axis, four grains); `enrolled` is
               RETAINED for the verb (`enroll`), the event (`enrollment` / `enrollment.jsonl`), and
               the `actor/enrolled/` subdomain folder — but NOT as the dobj state-suffix. so
               `ActorEnrolled` → `ActorOndisk`, and the `enrolled`↔`ondisk` collision is settled: two
               words, two roles (act/event vs partition), no overload.

## .evidence

- discovery: the on-disk `ActorEnrolled` is the declared PEER of the in-memory `Actor`
  (`src/domain.objects/ActorEnrolled.ts` names itself "the on-disk PEER of the in-memory `Actor`").
  that pair IS the discovery: same concept (a `{brain, roles}` identity), two grains (runtime vs
  record), disambiguated by the `enrolled` state word.
- invariants: an `ActorEnrolled` is content-addressed + immutable — its hash IS
  `genEnrollmentHash({brain, roles})`, so a different roleset is a different enrolled actor. the
  state word carries no lifecycle of its own; it marks "recorded", full stop.
