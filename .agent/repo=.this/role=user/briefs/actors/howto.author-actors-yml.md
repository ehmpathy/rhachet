# howto: author `.agent/repo=$repo/actors.yml`

## .what

`actors.yml` lets a repo declare its own **actors** by slug — a durable `{ brain, roles }` identity —
so a clone is spawnable by name (`rhx clone actor://<slug>`) instead of a re-typed `--roles` spec on
every run.

an **actor** is a brain enrolled in a set of roles (the identity); a **clone** is a live run of that
actor (see [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md)).

## the manifest

path: `.agent/repo=.this/actors.yml`

```yaml
actor:
  - slug: mechanic
    brain: claude
    roles:
      - ehmpathy/mechanic
      - ehmpathy/architect
      - bhrain/driver

  - slug: foreman
    brain: claude
    roles:
      - @mechanic        # base = the mechanic actor (a peer)
      - -driver           # minus the driver role
      - +supervisor       # plus a supervisor role
```

each entry declares:

| field   | what                                                        |
| ------- | ----------------------------------------------------------- |
| `slug`  | the actor's name — how you address it (`@<slug>` ≡ `actor://<slug>`) |
| `brain` | the inference cli the actor enrolls (e.g. `claude`)          |
| `roles` | the role-set — fully-qualified roles (`<supplier>/<role>`), or a base **peer actor** (`@<slug>`) with `+role` / `-role` deltas over it |

name the slug after the actor's **composite role** (`longboarder`, `redteamer`), never a person — an
actor is a recipe, and each clone gets its own name via `--as`. see
[`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md).

### bases: explicit roles or a peer actor

an `actors.yml` role-set is either **fully-qualified roles** or a base **peer actor** (`@<slug>`)
with `+`/`-` deltas over it.

the repo's *default role-set* is an **enroll-time** concept — it belongs to `rhx enroll` from within
a repo. an actor cannot see it: actor scope is portable and repo-agnostic, so default roles are out
of scope there entirely. base off a named peer actor (`@mechanic`) instead.

> **notation** — `@<slug>` is the actor sigil (shorthand for `actor://<slug>`). the full sigil
> rationale — the `@:` clone sigil and the distilisys convergence too — lives in
> [`define.address-sigils.md`](./define.address-sigils.md).

## spawn a clone of a declared actor

```bash
rhx clone actor://mechanic            # local slug, from this repo's actors.yml
rhx clone actor://ehmpathy/mechanic   # supplier-qualified, when a name needs disambiguation
```

resolution order:

1. local `.agent/repo=.this/actors.yml`
2. supplier-qualified `actor://<supplier>/<slug>` from installed role packages
3. else — an error that names the candidates it found

## supplier-shipped actor declarations

each `rhachet-roles-<supplier>` package can ship the actors it recommends, so you enroll a curated,
supplier-blessed actor without hand-assembly of the role-set:

```bash
rhx clone actor://ehmpathy/mechanic   # the mechanic actor ehmpathy recommends
```

## use a declared actor

once declared, bake and talk to clones of the actor — `rhx clone make actor://<slug>`, then `say` /
`get`. see [`howto.use.clones.md`](./howto.use.clones.md) for the full clone surface.

## see also

- [`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md) — name actors after their composite role, not a person
- [`howto.use.clones.md`](./howto.use.clones.md) — bake (make/fork/wake) + talk (list/say/get) to clones
- [`.dream/2026_08_07.clone-actor-from-actors-yml.dream.md`](../../../../../.dream/2026_08_07.clone-actor-from-actors-yml.dream.md) — the full dream + `gen <make|fork|wake>` grammar
- [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) — the clone → actor → { brain, roles } model
