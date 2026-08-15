# experience: the worktree crew — one drives, one oversees 🐢🌲

part of the [experience inventory](./inventory.of=experience._.md).

the most common clone pattern: **a clone drives a route.** launch a worktree and rhachet spawns two
clones of the same `@mechanic` actor by default — a **driver** that drives the route, and a **foreman**
that reviews it from a broader perspective. same recipe, two purposes:

```bash
rhx clone @mechanic          --as @:driver    # the full mechanic (incl. its driver role) — drives the route
rhx clone @mechanic -driver  --as @:foreman   # mechanic MINUS driver — cannot drive, only oversees + reviews
```

the driver drives the route itself, stone by stone. the foreman never touches the wheel — with the
`driver` role removed it structurally *cannot* drive; its purpose is to step back, review the driver's
work, and hold the broader view (is this still the right route? did a stone go sideways?).

now the edge points that make the crew work:

- **two clones, one actor** — both are `@mechanic`; they share its brain + roles + config. only their
  **purpose** differs, so each earns a purpose-name (`@:driver`, `@:foreman`), never a person-name (see
  [`rule.prefer.name-clones-after-purpose.md`](./rule.prefer.name-clones-after-purpose.md)).
- **the `-driver` delta is the whole point** — the foreman is a **derived actor** (`@mechanic -driver`):
  drop the `driver` role and it *cannot* drive the route — it can only observe and review. the
  constraint IS the perspective — hands off the wheel, eyes on the whole road.
- **reach either from anywhere** — a route guard, a cron, or the human can `rhx clone say @:foreman
  --what 'review the last stone'` and `rhx clone get @:driver --tail 40` to watch progress. the driver
  drives, the foreman reviews, and either is addressable by its purpose-slug.
- **lessons ratchet back to the actor** — what the driver learns as it drives, and what the foreman
  catches as it reviews, are hardwon lessons. externalize them into the `mechanic` role and the next
  worktree's crew starts from a higher floor (see
  [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) → philosophy).

🐢 one recipe, two purposes — one drives, one oversees, and the whole road stays covered.
