# inventory of experience

## .what

a catalog of **worked clone experiences** — end-to-end scenarios that show what the actor/clone surface
makes possible. one file per case (`inventory.of=experience.case=<slug>.md`); we add cases as we find
cool ones.

for the command reference, see [`howto.use.clones.md`](./howto.use.clones.md).

## the cases

| # | case | what it shows |
|---|------|---------------|
| 1 | [surf school crew](./inventory.of=experience.case=1.surf-school-crew.md) | 🐢 **actor composition** — a crew of derived actors off one base, tethered so a base update syncs all; deterministic derived identity |
| 2 | [redteam fan-out](./inventory.of=experience.case=2.redteam-fan-out.md) | 🐈 **clone forks** — fork a `@guardian` base clone, with role deltas, into specialists that inherit its findings; inter-clone observation |
| 3 | [the worktree crew](./inventory.of=experience.case=3.worktree-driver-foreman.md) | 🐢 **clones drive routes** — a worktree spawns two `@mechanic` clones by default: `@:driver` drives the route, `@:foreman` (a `-driver` derived actor) reviews from a broader perspective |
| 4 | [name the clone on enroll](./inventory.of=experience.case=4.named-clone-on-enroll.md) | 🐢 **anonymous actor, named clone** — plain `rhx enroll --as @:driver` earns a reach handle for the clone while the actor stays `actor.via.hash` (no `actors.yml`); the two-grain split |
| 5 | [supervisor watches prod](./inventory.of=experience.case=5.supervisor-observes-prod.md) | 🦫 **ad-hoc actor extension** — extend a supplier actor on the fly with another supplier's role (`@bhuild/supervisor +ghlitch/observer`); the delta-hash identity for unformalized combos |

## see also

- [`howto.use.clones.md`](./howto.use.clones.md) — the clone command reference
- [`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md) — name actors after roles
- [`rule.prefer.name-clones-after-purpose.md`](./rule.prefer.name-clones-after-purpose.md) — name clones after purpose, never persons
- [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) — the clone → actor → { brain, roles } model
