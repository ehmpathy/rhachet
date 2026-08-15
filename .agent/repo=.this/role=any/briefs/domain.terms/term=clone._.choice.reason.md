# domain.term: clone — reason

## .etymology

**clone**, from greek *klōn* "twig / slip" — a growth taken from one parent that carries the parent's
whole identity, yet lives its own life. exactly the domain sense: a clone carries its actor's full
identity (brain + roles + config) while it lives a separate session. rhachet's mission already speaks
this word — "produce actors who **clone** that thought" (`define.rhachet.v3.md`) — so the term is
native, not borrowed.

## .the actor-vs-clone axis

**clone** is meaningless alone; it is the instance half of the identity/instance pair with **actor**
(see `term=actor._.choice.reason.md`). the pair is the whole point: one actor, many clones, each that
shares the actor's config, each with its own session.

## .why not the rejected synonyms

- **session** — overloaded past use (http session, login session, tmux session, and rhachet's own
  BrainSeries). worse, a session is a *property* of a clone (its history), not the clone itself. a
  clone HAS a session; it is not one.
- **instance** — generic and shapeless; it says "one of many" but names no relationship to the actor.
  "clone" carries the parent-identity link that "instance" drops.
- **process** — an os concept; a clone wraps a brain-cli process but is not defined by it (a clone
  survives its process death as a revivable record via `exid`).
- **thread** — collides hard with rhachet's WeaveThread and the general concurrency term.

## .evidence

- `genBrainSeries.ts` models a clone's history as a `BrainSeries` of episodes — the "own life" of the
  slip while the actor identity stays fixed.
- discovered live with the wisher this round: "that's what makes them clones. all that differs is
  their session?" — the wisher used *clone* precisely as "same identity, different session", which is
  this definition verbatim.
- the fork verb `rhx clone clone://<serial>` (wisher, this round) reinforces the biological sense: a
  new slip taken from an extant clone.

## .invariants

- a clone belongs to exactly one actor and never mutates that actor's brain/roles/config.
- a clone's `serial` is stable across its live→dead→revive lifecycle (rhachet's handle); its `exid`
  (the brain-cli session id) may rotate per episode.
- two clones of one actor never share a session (serial, history, interface, status are per-clone).
