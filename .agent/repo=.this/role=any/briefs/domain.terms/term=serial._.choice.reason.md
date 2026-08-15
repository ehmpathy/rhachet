# domain.term.choice.reason: serial

## .etymology

why `serial`: a serial number is a unique, per-unit identifier stamped on one instance off a
production line — exactly a clone's role: one identifier per live instance of an actor. it reads as
an identity (a stamped id), not a lifecycle state, so it composes cleanly as the `RefByPrimary`.

## .disputes

### dispute: serial vs series  —  raised (vision "what is awkward?" #3)  —  status: RESOLVED (keep both)
- raised.by  = wisher (flagged the near-collision as a papercut)
- claim      = `serial` and `series` are two near-identical words — a clone's id vs its continuity —
               easy to conflate in code and docs; rename the id (e.g. `clone-id`) to avoid the clash
- counter    = the two name genuinely distinct concepts and both carry weight: `serial` = "which
               clone?" (the RefByPrimary), `series` = "what has this clone lived through?" (the
               BrainSeries of episodes). `series` is the extant brain-continuity term already in code
               (genBrainSeries); a rename of the id to `clone-id` would break the actor/clone name
               symmetry and add a synonym. the collision is a papercut, not an ambiguity — one serial
               OWNS one series, a clear has-a relation.
- resolution = keep BOTH; document the pair (serial = identity, series = continuity). `session-id`,
               `clone-id`, `instance-id`, bare `uuid` recorded as forbidden synonyms for the id.

## .evidence

- discovery: `define.actor-clone-hierarchy.md` documents the serial-vs-series axis; the vision's
  "what is awkward?" #3 + edge-case table ("keep serial = the clone's id; series = its continuity").
- invariants: one serial per clone (globally-unique uuid); one serial owns one series; a serial is
  the RefByPrimary while the `--as` slug is the RefByUnique — both address the same clone.
