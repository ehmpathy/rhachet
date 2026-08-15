# experience: the surf school crew — compose, don't copy 🐢🏄

part of the [experience inventory](./inventory.of=experience._.md).

a surf school runs one base instructor, then composes a crew of specialists off it — each a **derived
actor**, each still tethered to the base, so a school-wide update reaches the whole crew at once. this
is actor **composition**, not clone forks: the crew shares an identity lineage, not a frozen copy.

declare the base + the crew in `actors.yml` — each specialist is named after its **role** and bases off
the `@instructor` peer with a role delta (see
[`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md)):

```yaml
actor:
  - slug: instructor            # the base recipe — every coach starts here
    brain: claude
    roles:
      - coach
      - surfer
      - introducer

  - slug: longboarder           # base + longboard
    brain: claude
    roles:
      - @instructor
      - +longboard

  - slug: bigwaver              # base, drop introducer, add bigwave
    brain: claude
    roles:
      - @instructor
      - -introducer
      - +bigwave
```

bake a coach when a lesson needs one — the **actor** is the role, the **clone** gets a per-run slug:

```bash
rhx clone @longboarder --as @:waikiki-9am --say 'teach the 9am longboard group at waikiki'
rhx clone @bigwaver    --as @:waimea-dawn --say 'teach the dawn bigwave session at waimea'
#          └ actor = recipe/role           └ clone = this run's slug
```

now the edge cases that make **actor composition** shine:

- **derive off a peer, never copy** — `@longboarder = @instructor + longboard`. it is not a snapshot
  of instructor; it references the base and stores its `+longboard` delta.
- **the sync tether** — the school adds a role to the base recipe: edit `instructor` in `actors.yml` —
  add `lifeguard` to its `roles`. `@longboarder` and `@bigwaver` BOTH gain it at their next
  spawn — each still with their own delta on top. update the base recipe, the whole crew updates. no
  per-coach edit. (`rhx enroll` would only spawn a clone; the actor recipe lives in `actors.yml`.)
- **named, so reusable** — because the crew is **formalized** in `actors.yml`, each actor has a slug:
  its identity is `actor.via.slug=longboarder`, and `rhx clone @longboarder` re-bakes it by name while
  every clone shares its config. the slug is what a formalized composition earns.
- **formalized vs ad-hoc** — the same roles composed **without** a slug
  (`rhx clone @instructor +longboard`) get the delta-hash identity `instructor._.delta=$hash` instead —
  the ad-hoc form. see the [supervisor watches prod](./inventory.of=experience.case=5.supervisor-observes-prod.md)
  case, and [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) → derived actors.

cowabunga — one base, a whole crew, always in sync 🐢🌊
