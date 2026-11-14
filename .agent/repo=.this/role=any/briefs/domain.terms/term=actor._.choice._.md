# domain.term: actor

term.chosen   = actor
term.kind     = noun            # a domain-object (dobj): [...noun][state]?
term.synonyms.forbidden:
- agent
- persona
- profile
- enrollment (the act, not the identity)

## .what

an **actor** is a durable, reusable identity = a brain enrolled in a set of roles (`{ brain, roles }`).
it owns one config derived from that pair. many **clones** run from one actor; all clones of an actor
share its brain, roles, and config — so they stay in sync. an actor is identified in one of two
namespaces, split by which command wrote it: a `$slug` (**slug namespace**, `actor.via.slug`, addressed
`@<slug>`) declared in `actors.yml` and reached via `rhx clone @<slug>` (≡ `rhx enroll @<slug>`); or a
`genEnrollmentHash` (**hash namespace**, `actor.via.hash`, **anonymous**) derived by the inline form
`rhx enroll <brain> --roles …`, which `actors.yml` never names (its base is the repo actor's).

## .refs

- .agent/repo=.this/role=any/briefs/define.actor-clone-hierarchy.md  (the hierarchy: clone → actor → { brain, roles })
- src/domain.objects/Actor.ts                                        (the in-memory dobj: brain ⊕ role)
- src/domain.objects/ActorEnrolled.ts                               (the on-disk PEER: [actor][enrolled])
- src/contract/sdk.actors.ts                                         (genActor, Actor export)
- .agent/repo=.this/role=any/briefs/define.rhachet.v3.md             (actor = 🧠 brain ⊕ 🧢 role)

## .reason

see the ref-level cluster beside this choice:
- `term=actor._.choice.reason.md` — etymology, the actor-vs-clone axis, why not agent/persona, evidence
