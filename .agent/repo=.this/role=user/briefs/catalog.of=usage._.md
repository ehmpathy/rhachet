# catalog.of=usage

> how a consumer uses rhachet: actors and clones on the cli, brains in the sdk. one row per brief.

## .actors — the cli surface for actors and clones

| brief | what it settles |
|---|---|
| `actors/howto.use.clones` | bake (make · fork · wake) and talk (list · say · get); `--as @:<slug>` flips create to findsert |
| `actors/define.address-sigils` | `@<slug>` is an actor, `@:<serial\|slug>` is a clone; `--as` always takes the `@:` form |
| `actors/howto.author-actors-yml` | declare reusable actors by slug in `actors.yml`; a base peer `@<slug>` with `+`/`-` deltas |
| `actors/rule.prefer.name-actors-after-roles` | an actor is a recipe: name it after its composite role |
| `actors/rule.prefer.name-clones-after-purpose` | a clone is a run: name it after its function in the work |
| `actors/inventory.of=experience._` | the worked-experience index; one case per file below |
| `actors/inventory.of=experience.case=1.surf-school-crew` | derived actors off one base stay in sync |
| `actors/inventory.of=experience.case=2.redteam-fan-out` | fork a clone with role deltas; clones observe clones |
| `actors/inventory.of=experience.case=3.worktree-driver-foreman` | `@:driver` drives, `@:foreman` (`-driver`) reviews |
| `actors/inventory.of=experience.case=4.named-clone-on-enroll` | `enroll --as @:<slug>` names the clone; the actor stays a hash |
| `actors/inventory.of=experience.case=5.supervisor-observes-prod` | an ad-hoc cross-supplier extension gets a delta-hash identity |

## .brains — the sdk surface for brains

| brief | what it settles |
|---|---|
| `brains/howto.use.brain.genContextBrain` | build a brain context, by discovery (async) or explicit brains (sync) |
| `brains/howto.use.brain.role` | the `role.briefs` input |
| `brains/howto.use.brain.prompt` | a string, or `BrainPlugToolExecution[]` to continue after tool use |
| `brains/howto.use.brain.schema` | a zod `schema.output` for typed output |
| `brains/howto.use.brain.on` | continue an episode (atom, repl) or a series (repl only) |
| `brains/howto.use.brain.plugs` | `plugs.tools` — an atom emits invocations, a repl runs them |
| `brains/howto.use.brain.tools` | declaration · invocation · execution, and the signal semantics |
| `brains/howto.use.brain.hooks` | `onBoot` · `onTool` · `onStop`, and how they map to claude code events |
| `brains/howto.for.suppliers` | implement a `BrainAtom` or `BrainRepl` supplier |
