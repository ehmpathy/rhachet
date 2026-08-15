# define.address-sigils — `@` the actor, `@:` the clone

## .what

the two shorthand sigils to address an actor and a clone on the `rhx` cli:

| sigil | shorthand for | addresses | example |
|-------|---------------|-----------|---------|
| `@<slug>` | `actor://<slug>` | an **actor** (identity / recipe) | `@mechanic` |
| `@:<serial>` | `clone://<serial>` | a **clone** (a live instance), by serial | `@:7f3a…` |
| `@:<slug>` | `clone://<slug>` | a **clone** (a live instance), by slug | `@:driver` |

the formal equivalences:

```
@<slug>    ≡  actor://<slug>      # an actor, by slug
@:<serial> ≡  clone://<serial>    # a clone, by serial — its primary ref (always present)
@:<slug>   ≡  clone://<slug>      # a clone, by slug   — its --as unique ref (if assigned)
```

`@mechanic` is exactly shorthand for `actor://mechanic`; `@:7f3a` is exactly shorthand for
`clone://7f3a`. use whichever form reads best in context — both name the same target.

### a clone answers to two bodies — `@:<serial>` and `@:<slug>`

the `@:` sigil marks the **clone grain**; the body after it is **either** address of the same clone:

- **`@:<serial>`** — the clone's **serial**, its primary ref (a uuid), minted at spawn and **always
  present**. every clone is reachable this way, named or not.
- **`@:<slug>`** — the clone's **slug**, its unique ref, assigned by `--as @:<slug>` at spawn. present
  **only** when the clone was named; when absent, the clone is reachable by serial alone.

both address the **one** clone — `rhx clone say @:driver …` and `rhx clone say @:7f3a… …` hit the same
instance when `driver` is that serial's `--as` handle. the parse is unambiguous: a uuid-shaped body is
the serial (primary), any other is the slug (unique), so `@:` never needs a second marker to tell the
two apart.

## .who mints what — actors are declared, clones are assigned

these two grains are born in **different places**, and that is the crux:

- a **slug actor** (`@<slug>`, the `actor.via.slug` namespace) is declared **only** in
  `.agent/repo=.this/actors.yml` (a `slug:` entry). NO cli flag mints one. **`rhx clone` is the
  `actors.yml`-aware surface** — it reads a declared slug actor and spawns a clone from it.
- a **hash actor** (`actor.via.hash`, anonymous) is derived, never declared: **`rhx enroll` is
  hash-only** — it derives the id from `genEnrollmentHash({brain, roles})` and **never consults
  `actors.yml`**, so every enroll spawns a clone under an anonymous hash actor.
- a **clone** is spawned by `rhx enroll` and `rhx clone`, and named with **`--as @:<slug>`**.

so **`rhx enroll` spawns a clone, always — never an actor**, and always under an **anonymous** hash
actor. the slug / `actors.yml` surface belongs to `rhx clone`, not enroll.

> **note (2026-08-08) — the `@<hash>` form of `@<actor>`.** since a hash actor has no declared slug,
> its address body is its **hash** — so `@<hash>` ≡ `actor://<hash>` is the sanctioned, admitted form
> of `@<actor>` for an **anonymous** actor (e.g. `rhx clone list @9c1e…` scopes to the hash actor
> `actor.via.hash=9c1e…`). this is not a new sigil — `@<name>` ≡ `actor://<name>`, and an anonymous
> actor's "name" simply IS its hash. before `actors.yml` mints slugs (the `rhx clone` dream), the hash
> IS the only actor identifier, so `@<actor>` in an enroll-only world resolves a hash literal. surfaces
> that emit an actor for a human to re-type (`rhx actor list`, `rhx clone list`) render a **copyable
> hash** so the `@<hash>` form is usable by hand. (added by `v2026_08_07.enroll-with-interface`,
> blueprint blocker-4.)

## .the mandate — `--as` always takes a clone, in address form

there is **one assignment flag — `--as`** — and it always names the **clone** being spawned, in
address form with the `@:` prefix. it never names an actor (actors are not flag-assigned):

- `rhx enroll claude --as @:bert` — spawn a clone, name it `@:bert`
- `rhx clone @mechanic --as @:bert` — bake a clone of the `mechanic` actor, name it `@:bert`
  (here `@mechanic` is the **source** to bake from — a declared actor — not an assignment)

**why the `@:` prefix is mandatory.** it states the grain at the point of assignment, so a bare
`--as bert` — which reads like it might name an actor — is disallowed. `--as @:bert` says *clone* in
the glyph, closing the actor-vs-clone confusion the sigils exist to close. there is no `--slug` flag:
actors are declared in `actors.yml`, never minted by a flag, so `--as`+`@:` is the whole story.

## .why this symbol set

the sigils are not arbitrary punctuation — the glyphs **embed the actor↔clone relationship**, so an
address tells you the grain and the lineage at a glance.

### the shared `@` root — one address family

`@` marks "an rhachet address". everything addressable starts with it, so an actor and a clone read as
one family. this also **converges with distilisys** — see below.

### markedness — the actor is bare, the clone is marked

- **`@<slug>` = the unmarked actor.** an actor is the durable, primary, default resource — the thing
  you name and reach for by default — so it earns the **bare** `@`, no extra glyph.
- **`@:<serial>` = the marked clone.** a clone is one of the many live, ephemeral instances an actor
  spawns (`clone → actor` is many-to-one), so it carries the **`:` grain-marker**. there is no
  bare-`@` clone form; a clone always wears its `:`.

the asymmetry is the point: it encodes **base vs instance**. `@mechanic` is the recipe; `@:bert` is a
run of it. you never confuse the two, because only the instance is marked.

### the shared root encodes descent

because both start with `@`, an address shows lineage: `@:bob` visibly descends from `@mechanic` —
the clone is one-of-many baked from the single recipe. the glyph carries the model
(`define.actor-clone-hierarchy.md`): an actor is singular and durable; clones are plural and live.

### shell-safe by construction

both `@<slug>` and `@:<serial>` are safe as the unquoted first characters of a shell argument. `@`
never starts a shell expansion. a bare `#<serial>` was **rejected** for the clone sigil precisely
because `#` opens a comment in bash/zsh — `rhx clone #bert` would parse as `rhx clone` plus a dropped
comment. `@:` avoids that trap while keeping the shared-`@` family.

### distilisys convergence — exact for the actor

distilisys models only actors, addressed `@<name>`, and has **no clone concept**. our actor form
`@<slug>` is **character-identical** to distilisys's `@<name>` — not an approximation. our scheme is a
**superset**: we keep distilisys's actor address verbatim and add `@:` for the clone grain distilisys
does not model. we extend the `@` root; we do not contradict it.

## .the rejected alternatives

| candidate | why rejected |
|-----------|--------------|
| `#<serial>` for a clone | `#` opens a shell comment — `rhx clone #bert` breaks unquoted |
| `%<serial>` for a clone | shell-safe, but a lone glyph with no tie to the `@` actor family; loses the descent story |
| `:<serial>` for a clone | shell-safe and tidy, but a separate sigil — no shared root, so lineage is not encoded |
| `@.<slug>` for the actor (**superseded**) | an earlier form gave the actor a counter-mark dot for dot-vs-colon symmetry. dropped: the dot adds no signal the clone's `:` does not already carry, it breaks the exact distilisys convergence (`@.name` ≠ `@name`), and `@mechanic` reads like a stray dot-file. the actor is the unmarked base; only the clone is marked. |

`@<slug>` / `@:<serial>` is the scheme that is **shell-safe**, **distilisys-exact** (for the actor),
and **semantically loaded** (markedness + descent in the glyph): the base is bare, the instance is
marked, and both share the `@` family.

## .see also

- `define.actor-clone-hierarchy.md` — the `clone → actor → { brain, roles }` model the sigils encode
- `../../role=user/briefs/actors/howto.use.clones.md` — the sigils in use on the cli
