# domain.term: actor — reason

## .etymology

**actor**, from latin *agere* "to do / to act" → *actor* "one who acts / plays a role". the theatrical
sense is exact for this domain: an actor is a performer who **assumes a role**. rhachet's core mission
is "register roles + brains → produce actors who clone that thought" (`define.rhachet.v3.md`), so the
word already carries the brain⊕role composition in its everyday sense.

## .the actor-vs-clone axis

the term earns its place as the pair to **clone**, on a single axis: **identity vs instance**.

| term | grain | what it holds fixed | what varies |
|------|-------|---------------------|-------------|
| actor | identity | brain + roles + config | — (shared across all its clones) |
| clone | instance | a single run of an actor | session: serial, history, interface, status |

an actor is the durable "who"; a clone is a live "run of that who". you cannot describe the clone
until its actor is set — which is why the hierarchy reads `clone → actor → { brain, roles }`.

## .why not the rejected synonyms

- **agent** — overloaded to exhaustion (llm "agents", user-agents, agentic loops); it names a *behavior
  style*, not a *stable identity*. an actor is an identity that persists across many runs; "agent"
  blurs it with the run.
- **persona** — implies a surface mask / affect, not a brain⊕role composition with a config on disk.
- **profile** — a settings bag, not an actor that *runs*. profiles are configured; actors act.
- **enrollment** — that is the *act* of a brain paired with roles, not the identity it yields. the
  enrollment produces the actor; to conflate them loses the identity noun.

## .evidence

- the in-memory object already exists and is named `Actor` (`src/domain.objects/Actor.ts`): "a role
  assumed by a brain, ready for invocation" — the on-disk `.agent/.actors/actor=$slug/` frame is the
  same concept at a second grain (identity persisted), not a new word.
- `define.rhachet.v3.md` already declares 🎭 actor = 🧠 brain ⊕ 🧢 role; this term conforms to that
  extant declaration rather than a synonym.
- discovered live with the wisher this round: "we want each actor's clones to stay in sync longterm" —
  the wisher reached for *actor* and *clone* as the natural pair, which confirms the domain already
  speaks these.

## .invariants

- one actor holds exactly one `{ brain, roles }`; a different role-set is a different actor.
- all clones of an actor share its config (by reference, not copy).
- an actor is identified by one of three forms: `slug` (explicit), `hash` (anonymous), or a
  base-`slug` ⊕ delta-`hash` (a **derived** actor — a base actor with a durable role-delta, in sync
  with `base ⊕ delta`). the first two are whole-identity; the derived form is the only one that carries
  both, and it stays tethered to its base. see `define.actor-clone-hierarchy.md` → "derived actors".
