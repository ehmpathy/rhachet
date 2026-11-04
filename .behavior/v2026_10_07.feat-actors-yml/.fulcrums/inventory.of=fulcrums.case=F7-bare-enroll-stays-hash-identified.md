# F7 — which namespace an enroll lands in

## .round 1 — superseded

- **fork** — a bare `rhx enroll` with `default: '@builder'` lands in `actor.via.hash=<hash of builder's expanded roles>` vs `actor.via.slug=builder`
- **taken** — hash: enroll was hash-only, and the slug namespace was `rhx clone`'s
- **verdict** — superseded by seed S2: `rhx enroll @scholar` is an alias of `rhx clone @scholar`, so enroll is no longer hash-only, and the round-1 premise falls

## .round 2 — ruled

- **fork** — (a) **the form decides**: the actor form (`@<slug>`, and a bare enroll that reaches the default) lands in `actor.via.slug=<slug>` — or `<slug>._.delta=<hash>` with deltas — and the inline form (`<brain> --roles …`) stays hash · (b) **only an explicit `@<slug>` is slug**: a bare enroll stays hash, though it uses the default's roles and brain
- **taken** — (a). a bare enroll that IS `rhx enroll @<default>` should behave as that command does; to make two spellings of one actor land in two namespaces would fork one actor's clones by keystroke. with (a), a base that grows reaches live clones of the default at their next read, the slug form's sync invariant
- **rework** — clean — one branch in the enroll orchestrator picks the actor dir; no artifact shape changes
- **confidence** — 65% — (a) changes what a bare enroll's clone does over time (it now tracks the actor), a real behavior change for repos that opt in; and `rhx enroll` vs `rhx enroll claude` now look alike yet land apart
- **where** — contract row *clone identity*; Q5; inventory rows 23, 32; case=4 `[t0]`
- **verdict** — (a), ruled by the wisher (seed S4): the actor form lands in `actor.via.slug=<slug>`, so an actor edit reaches its live clones; the inline form stays hash
