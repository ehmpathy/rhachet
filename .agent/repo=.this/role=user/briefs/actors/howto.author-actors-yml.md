# howto: author `.agent/actors.yml`

## .what

`actors.yml` lets a repo declare its **actors** by slug — a durable `{ brain, roles }` identity — and
name which one is the **repo actor**. `rhx init` links their roles from it, so no `--roles` list lives
in `prepare:rhachet`, and a clone is spawnable by name (`rhx clone @<slug>`).

an **actor** is a brain enrolled in a set of roles (the identity); a **clone** is a live run of that
actor (see [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md)).

## the manifest

path: `.agent/actors.yml` — a peer of `.agent/keyrack.yml`, since an actor belongs to the repo, and a
repo may declare actors with no native roles of its own

```yaml
ambient: '@builder'               # the repo actor — required, by name

actor:
  - slug: builder                 # brain propagates up from @ehmpathy/builder
    roles:
      - '@ehmpathy/builder'       # a published actor, adopted by name
      - +bhrowser/playwright      # plus a role

  - slug: scholar
    brain: anthropic/claude/code
    roles: [bhrain/librarian, bhrain/learner, ehmpathy/architect]

  - slug: foreman
    roles:
      - '@builder'                # a peer actor as the base
      - -driver                   # minus the driver role
```

🟡 quote every value that opens with `@` — yaml reserves it. an unquoted `@builder` fails to parse, and
the error names the quote fix.

| field | what |
|---|---|
| `ambient` | the **repo actor** — the one a bare `rhx enroll` (and a bare `claude`) reaches, and the one that holds the ambient roles. **required**, even with one actor: the repo actor is never inferred |
| `slug` | the actor's name — how you address it (`@<slug>`) |
| `brain` | the brain the actor enrolls (any slug `rhx enroll` accepts). may be omitted where the actor extends a base: the base's brain propagates up, and a local `brain:` overrides it |
| `roles` | either fully-qualified roles (`<repo>/<role>`, or a bare slug where unambiguous), **or** one base actor first — `'@<slug>'` (a peer) or `'@<repo>/<slug>'` (published) — then `+role` / `-role` deltas. never both |

name the slug after the actor's **composite role** (`builder`, `redteamer`), never a person — an actor
is a recipe, and each clone gets its own name via `--as`. see
[`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md).

### what `rhx init` does with it

- links the **union** of every declared actor's roles, so every actor finds its roles linked
- prints the drift between declared and linked: **short** roles are restored; **extra** roles are kept
  and named, with the fix either way — never silently removed
- names each **native** role (`.agent/repo=.this/role=<x>`, with a `boot.yml`) that no actor declares —
  no clone boots it, and init adds none by itself. to boot one, declare `.this/<x>` in an actor's
  roles; under the `ambient:` actor, every bare enroll boots it
- re-derives every declared actor on disk from the file as it reads now, so an edit to an actor's
  roles reaches its settings and `boot.md` at the next `rhx init`, not merely at its next clone
- refuses `--roles` beside the manifest (two sources of truth): edit `actors.yml` instead
- fails fast before any write on an invalid manifest — no `ambient:`, an unknown base, a cycle, a mix of
  roles and deltas, or an actor that reaches no brain

with no `actors.yml`, `rhx init --roles …` behaves exactly as it did; one dim line names this file.

### bases: a peer, or a published actor

a base is a **peer** in this file (`'@builder'`) or a **published** actor of an installed role package
(`'@ehmpathy/builder'`). a published base expands from the **installed** package version, so when the
package grows the actor, every repo that extends it gains the role at its next `rhx init`. to hold a
base still, pin the package version.

## spawn a clone of a declared actor

```bash
rhx clone @scholar               # a fresh clone, on the actor's own brain and roles
rhx enroll @scholar              # the same, via the enroll alias
rhx clone @scholar +mechanic     # an override: a delta clone, still tethered to @scholar
```

no brain is typed: the actor names its own. a plain role list beside `@<slug>` is refused — that is the
inline form, `rhx enroll <brain> --roles …`, for a one-off composition with no name yet.

## publish actors from a role package

a role package publishes the actors it recommends: `getRoleRegistry()` sets `actors: { uri }` to a yml
in the same shape, with no `ambient:` (the repo actor is the consumer's choice). `rhachet repo
introspect` inlines them into `rhachet.repo.yml` as `actors:`, and a consumer adopts one as
`'@<repo>/<slug>'`.

## see also

- [`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md) — name actors after their composite role, not a person
- [`howto.use.clones.md`](./howto.use.clones.md) — bake and talk to clones
- [`define.address-sigils.md`](./define.address-sigils.md) — `@<slug>` for an actor, `@:<slug>` for a clone
- [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) — the clone → actor → { brain, roles } model
