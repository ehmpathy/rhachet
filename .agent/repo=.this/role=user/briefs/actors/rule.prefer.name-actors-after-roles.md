# rule.prefer.name-actors-after-roles

## .what

name an **actor** after its composite **role** — `@longboarder`, `@bigwaver`, `@redteamer` — never
after a person or a clone. an actor is a **recipe**, not an individual.

## .why — actors are recipes; clones are identities

the two live at different grains:

- an **actor** is a **recipe** — a reusable composite role that WAITS to be enrolled into a clone. it
  is a type, not an individual. it has no session and no history of its own — it is the template a
  clone is baked from.
- a **clone** is a distinct **identity** — a live instance, born when the recipe is enrolled. it
  carries its own serial, history, and interface, and it takes a per-run name via `--as`.

so **each clone already gets its own name** — a **run** name via `--as`, after the task or occasion of
that one instance (see [`rule.prefer.name-clones-after-purpose.md`](./rule.prefer.name-clones-after-purpose.md)).
if you also name the *actor* after a person, you hand an individual's name to a recipe that spawns many
— the recipe (actor) and the instance (clone) blur, and `@luna` reveals none of the roles it composes.

name the actor after its role and the split stays true to what each one IS:

- **actor = recipe** — `@longboarder` says "a coach who teaches longboard" (the roles it composes)
- **clone = run** — `--as @:waikiki-9am` names this one live run

## .how

- name an actor after its composite role: `@longboarder`, `@bigwaver`, `@redteamer`, `@researcher`
- reserve the per-run name for the **clone**, via `--as @:<slug>` — after the run, never a person
  (see [`rule.prefer.name-clones-after-purpose.md`](./rule.prefer.name-clones-after-purpose.md)):
  `rhx clone @longboarder --as @:waikiki-9am`

## .examples

### 👎 avoid — an actor named after a person

```bash
# actors.yml: slug: luna  →  a recipe with an individual's name; what roles does luna compose?
rhx clone @luna --say 'teach the longboard group'
```

### 👍 prefer — actor named after the role, clone named per run

```bash
# actors.yml: slug: longboarder  →  the name IS the recipe
rhx clone @longboarder --as @:waikiki-9am --say 'teach the longboard group'
#          └ actor = recipe               └ clone = this run's identity
```

## .enforcement

an actor slug that names a person or clone rather than its composite role = nitpick (prefer).

## .see also

- [`rule.prefer.name-clones-after-purpose.md`](./rule.prefer.name-clones-after-purpose.md) — the clone twin: the purpose names the instance
- [`howto.author-actors-yml.md`](./howto.author-actors-yml.md) — declare actors by slug
- [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) — actor (recipe) vs clone (identity)
