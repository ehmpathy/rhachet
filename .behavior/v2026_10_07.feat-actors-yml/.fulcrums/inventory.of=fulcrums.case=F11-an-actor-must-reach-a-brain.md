# F11 — where an actor's brain comes from

- **fork** — (a) `brain:` is required after expansion: declared on the actor, or inherited from the base it extends; a local `brain:` overrides · (b) every actor in `actors.yml` states `brain:` itself; a base contributes roles only · (c) a published actor carries no brain; every consumer declares one
- **taken** — (a), at first. once an invocation of an actor names no brain, an actor with no brain cannot be invoked, so the gap must fail at validate rather than at spawn. inheritance kept an adopted `@ehmpathy/builder` usable with no extra line
- **rework** — clean — the requirement is one validator rule
- **confidence** — 70% at the time — (c) was defensible: a package may not want to dictate the inference supplier
- **where** — contract row *brains*; inventory row 36; every case narrative that declares an actor
- **verdict** — **ruled (a)** by the wisher (S7, then S8). S7 settled that an actor IS `{ brain, roles }`: every actor has a brain, and one that reaches none fails validation. S8 settled where it comes from: a base contributes its brain as well as its roles, so the brain propagates up the `@ref` chain, and a local `brain:` overrides it. an actor with no base must state `brain:`; two `@ref` bases with different brains and no local `brain:` is ambiguous and fails validation, which names both brains
