# howto: use clones

## .what

a **clone** is a live run of an **actor** — one session with its own serial, history, and interface.
one actor has many clones; they share the actor's brain + roles and differ only by session (see
[`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md)).

`rhx enroll` spawns a clone you drive at the keyboard — the **same exact clone**, equally addressable by
any process (a cron, a comms handler), not just the keyboard. it is simply based on a **default or ad-hoc
actor** (anonymous, hash-derived), not a reusable one. `rhx clone` enables **reusable actors** — declared
by slug in `actors.yml`, **beyond** default and ad-hoc — and makes every actor addressable, so any process
can reach it. `rhx enroll <brain> --as @:<slug>` slugs the clone it spawns (enroll spawns a **clone**,
`@:`, never an actor).

## talk — list, message, observe

```bash
rhx actor list                              # actors on disk (the identities)
rhx clone list [@<slug>]                   # clones (all, or scoped to one actor) + state
rhx clone say @:<slug|serial> --what <m>    # dispatch a message into a live clone
rhx clone get @:<slug|serial> --tail 40     # observe the clone's recent output
```

`say` dispatches into the clone's input (its socket); `get` reads its recent output (from the brain-cli
transcript); `list` finds the clone to address. together they are the whole socket contract at the cli.

## bake — make, fork, wake

```bash
rhx clone make @<slug>            [+role/-role …] [--as @:<slug>] [--say <m>]  # NEW clone from an actor
rhx clone fork @:<serial|slug>    [+role/-role …] [--as @:<slug>] [--say <m>]  # NEW clone from a clone (seeded w/ its history)
rhx clone wake @:<serial|slug>                                                # reopen an extant clone (revive if dead, return if live)
```

- **make** — a fresh clone from an actor's config.
- **fork** — a new clone from a clone, seeded with the source's session handle + history.
- **wake** — reopen an extant clone: revive it if dead, return it if live.

options on `make` / `fork`:

- **`+role` / `-role`** — apply a role delta on the source: on a `make` it yields a **derived actor**;
  on a `fork` the new clone inherits the source clone's history, then gains the delta on top.
- **`--as @:<slug>`** — assign the new clone a **slug** (a stable, idempotent handle), in **address
  form**: the `@:` prefix is REQUIRED. it marks the grain — `@:` mints a **clone** slug, so
  `--as @:driver` cannot be misread as an actor. omit `--as` entirely and each call mints a fresh,
  auto-serial'd clone.
- **`--say <m>`** — dispatch an initial message on spawn (bake + `say` in one command).

### the sigil shorthand — create by default, `--as` to findsert

a bare source URI **creates** (a fresh clone each call); `--as @:<slug>` flips it to **findsert**
(idempotent — find-or-create by that slug). the default mechanism follows the scheme — a bare actor
URI **makes**, a bare clone URI **forks**:

| you type | means |
|----------|-------|
| `rhx clone @mechanic` | **make** a fresh clone of the `mechanic` actor (create) |
| `rhx clone @mechanic --as @:driver` | **make** — findsert `@:driver` (find-or-create) |
| `rhx clone @:driver` | **fork** `@:driver` into a new lineage (create) |
| `rhx clone @:driver --as @:reviewer` | **fork** — findsert `@:reviewer` (find-or-create) |
| `rhx clone @:driver +researcher` | **fork** `@:driver` (auto-serial) — a role delta is a new lineage |
| `rhx clone wake @:driver` | **wake** — reopen the SAME clone (findsert by its handle) |

so a bare URI mints a NEW clone; `--as @:<slug>` makes that idempotent by slug. to reopen the clone you
already slugged, reach for the explicit **wake** verb.

### derived clone — an actor plus a role delta

apply a durable role-delta on top of an actor → a **derived actor**, tethered to its base:

```bash
rhx clone @mechanic -driver +supervisor         # mechanic, minus driver, plus supervisor
rhx clone actor://mechanic -driver +supervisor   # the same, explicit uri form
```

the delta yields a derived actor `actor.via.slug=mechanic._.delta=$hash` that stays in sync with its
base — update `mechanic` and the derived clone inherits it, with `-driver +supervisor` re-applied at
spawn (see [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) → derived actors).

## addresses

`@<slug>` is the **actor** — the unmarked base (a durable recipe), `@:<serial>` is the **clone** — the
`:`-marked instance (one of the many an actor spawns); the shared `@` root shows the descent
(`@:reviewer` comes from `@mechanic`):

| address            | refers to                                | example            |
| ------------------ | ---------------------------------------- | ------------------ |
| `@<slug>`          | an actor identity                        | `@mechanic`        |
| `actor://<slug>`   | an actor identity                        | `actor://mechanic` |
| `@:<serial>`       | a live clone, by serial (primary ref)    | `@:7f3a…`          |
| `@:<slug>`         | a live clone, by `--as` slug (unique ref)| `@:driver`         |
| `clone://<serial>` | a live clone, by serial                  | `clone://7f3a…`    |
| `clone://<slug>`   | a live clone, by `--as` slug             | `clone://driver`   |

the sigils are concise aliases for the uri forms — `@<slug>` ≡ `actor://<slug>`, `@:<serial>` ≡
`clone://<serial>`, `@:<slug>` ≡ `clone://<slug>`; use either. a **clone answers to two bodies** under
the one `@:` sigil: its **serial** (the primary ref, a uuid minted at spawn, always present) OR its
**slug** (the unique ref, assigned by `--as`, present only when named) — both address the same clone, so
`rhx clone say @:driver …` and `rhx clone say @:7f3a… …` hit the same instance. the parse tells them
apart with no second marker: a uuid-shaped body is the serial, any other is the slug. both are shell-safe
unquoted (a bare `#` would be read as a comment, which is why the clone sigil is `@:`). `@<slug>`
**converges with distilisys**, which addresses an actor `@<name>` and has no clone concept — our actor
form is character-identical, and we extend the `@` root with the `@:` clone grain.

### worked example — name on bake, reach by handle

```bash
rhx clone @mechanic --as @:driver               # bake a mechanic clone, slug it `@:driver`
rhx clone say @:driver --what "run the tests" # address it by its `@:driver` handle
rhx clone get @:driver --tail 40                 # observe the clone's output
rhx clone wake @:driver                          # reopen the same clone
```

`--as @:driver` gives the clone a stable slug, so `@:driver` addresses that same clone across `say` / `get`.
to reopen the one you slugged, `rhx clone wake @:driver`; a bare `rhx clone @:driver` **forks** it into a
new lineage instead (add `--as @:reviewer` to fork it under a stable handle).

for richer end-to-end scenarios — fan-outs, inter-clone observation — see the
[clone experience inventory](./inventory.of=experience._.md).

declare the actors you `make` from in `actors.yml` — see
[`howto.author-actors-yml.md`](./howto.author-actors-yml.md).

## see also

- [`define.address-sigils.md`](./define.address-sigils.md) — the `@` actor / `@:` clone sigils, and why they were chosen
- [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) — the clone → actor → { brain, roles } model
- [`.dream/2026_08_07.clone-actor-from-actors-yml.dream.md`](../../../../../.dream/2026_08_07.clone-actor-from-actors-yml.dream.md) — the full lifecycle grammar
- [`howto.author-actors-yml.md`](./howto.author-actors-yml.md) — declare reusable actors by slug
