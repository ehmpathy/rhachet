# S4 — an actor-form clone lives under the actor's slug

## .said

> obvi this; - (a) my default: rhx clone @builder stores the clone under the slug (actor.via.slug=builder). Edit builder's roles in actors.yml and the same folder gets the new config, so running clones pick it up at their next read. rhx enroll claude --roles … stays hash-based, as today.

## .settled

the invocation form picks the identity namespace. an actor named by slug — `rhx clone @<slug>`,
its `rhx enroll @<slug>` alias, or a bare enroll that reaches the default — lives in
`actor.via.slug=<slug>`, one config rewritten in place, so an edit to the actor reaches every
live clone of it at its next read. an inline composition — `rhx enroll <brain> --roles …` —
has no name, so it stays content-addressed in `actor.via.hash=<hash>`.

## .landed

- `1.vision.yield.md` — contract row *clone identity*; Q5
- `.fulcrums/inventory.of=fulcrums.case=F7-bare-enroll-stays-hash-identified.md`
