# rule.prefer.name-clones-after-purpose

## .what

name a **clone** after its **purpose** — the **function or perspective** it brings to the work
(`@:driver`, `@:foreman`, `@:reviewer`, `@:prod-watch`) — never after a **person**, and never after the
task's whole goal. a clone is a per-run identity; its slug should say what this run is FOR *within the
effort*, not who it pretends to be.

this is the clone twin of [`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md):
the **actor** takes the role name (what it IS), the **clone** takes the purpose name (what this run is FOR).

## .why — a clone slug should be self-descriptive

- **the list reads as purpose, not a roster** — whoever reaches the clone next runs `rhx clone list` and
  sees `@:waikiki-9am`, `@:prod-watch` — it knows which run to `say`/`get` at a glance. and it is not
  just you: the next reacher is **another human or robot** — a robot with a brain (a peer clone) or
  without one (a cron, a comms handler). a roster of `@:kai`, `@:luna`, `@:koa` gives none of them a hint
  of what each run is for.
- **a clone is an ephemeral run, not a durable individual** — it is one live projection of an actor,
  born for a purpose and gone when that purpose is met. a person-name implies a permanent identity the
  clone does not carry; a purpose-name matches what this run is for.
- **it keeps the actor/clone split clean** — the actor is the role (what it IS), the clone is the purpose
  (what this run is FOR). a human name blurs both into "a person" and hides which role the clone descends
  from.
- **name the in-between grain — the function, not the whole task** — a clone sits BETWEEN its actor (the
  broad role, `@mechanic`) and the task (the specific goal the worktree serves). name it for that middle
  grain: the **function or perspective** it brings to the work (`@:driver`, `@:foreman`, `@:reviewer`).
  do NOT name it after the task's whole goal — if the worktree exists to fix a bug, `@:bugfix` just
  restates the tree's purpose, and every clone in that tree shares it, so the name sets none of them
  apart. `@:driver` (drives the route) vs `@:foreman` (reviews it) tells the reachers which clone is
  which.
- **it nudges durable externalization of hardwon lessons** — this is the deep reason, and it is NOT
  that a clone is disposable. a clone is **cherished**: across its run it earns hardwon lessons. what is
  ephemeral is the **run** — the session ends. so those lessons must be **externalized into the roles of
  an actor** (durable, declared in `actors.yml`), or they are lost when the run ends. the urge to give a
  clone a permanent person-name is the tell — you want to keep what it became. keep it the right way:
  harvest its lessons into the actor's roles, where they persist and every future clone inherits them.
  name the run for its purpose; externalize its lessons into the actor. (this is the learner principle
  applied to clones: capture the hardwon lesson before the session fades — see
  [`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md).)

## .how

- name a clone after its **function or perspective** in the work: `@:driver` (drives the route),
  `@:foreman` (reviews it), `@:reviewer`, `@:researcher`, `@:redteamer` — or, when clones split a task by
  slice, the slice each handles (`@:waikiki-9am`, `@:api`, `@:ui`)
- avoid the task's own goal — `@:bugfix` for a clone in a bugfix worktree names the tree, not the clone
- keep it short and self-descriptive — the slug is what you type to `say`/`get` it
- omit `--as` for a one-off run you will not reach again — the clone falls back to an auto-serial
  (`@:7f3a…`); a purpose-name is for a clone another human or robot (brained or not) will reach again

## .examples

### 👎 avoid — a clone named after a person

```bash
# @:kai gives no hint of what this run is for
rhx enroll claude --roles mechanic --as @:kai
rhx clone say @:kai --what 'commit your WIP before you log off'
```

### 👎 avoid — a clone named after the task's whole goal

```bash
# the worktree already IS the bugfix; every clone here serves it, so @:bugfix sets none apart
rhx clone @mechanic --as @:bugfix
```

### 👍 prefer — a clone named after its function in the work

```bash
# @:driver names the function this clone brings to the effort
rhx enroll claude --roles mechanic --as @:driver
rhx clone say @:driver --what 'commit your WIP before you log off'
```

## .enforcement

a clone slug that names a person, or the task's whole goal, rather than its function or perspective in
the work = nitpick (prefer).

## .see also

- [`rule.prefer.name-actors-after-roles.md`](./rule.prefer.name-actors-after-roles.md) — the actor twin: the role names what it IS
- [`howto.use.clones.md`](./howto.use.clones.md) — bake and reach clones
- [`define.actor-clone-hierarchy.md`](../../../role=any/briefs/define.actor-clone-hierarchy.md) — actor (recipe) vs clone (run/instance)
