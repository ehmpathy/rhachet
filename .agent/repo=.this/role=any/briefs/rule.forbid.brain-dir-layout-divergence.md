# rule.forbid.brain-dir-layout-divergence

> **every actor's brain dir has the same files, with the same arrows. the repo actor is not special.
> a file, arrow, or name that one actor dir has and another lacks is forbidden.**

## .what is forbidden

- a file or symlink present in the repo actor's brain dir and absent from another actor's — or the
  reverse
- the same name that is real in one actor dir and an arrow in another, or an arrow with a different target
- a code branch on "is this the repo actor?" that changes WHAT files are written or WHERE they point
- a doc, diagram, or vision that draws "the repo's brain dir" and "the actor's brain dir" as two layouts

## .what is allowed

- **content** differs: `boot.md` and `settings.of.repo.json` hold each actor's own roles
- **reach** differs: a bare `claude` reaches the repo actor's dir through `<repo>/.claude`; a clone
  reaches its own through `CLAUDE_CONFIG_DIR`. the reach path is not the layout
- **git** differs: only the repo actor's brain dir is tracked. what git sees is not what the dir holds
- **the box** decides the grove names for all actors alike: on a box with no `~/.claude/settings.json`,
  every actor lacks `settings.of.grove.json` and `settings.json` together. no actor lacks what another holds,
  so that is not divergence

## .why

- two layouts need two code paths, and two code paths drift. the blend this repo shipped (every actor's
  `settings.json` held every role's hooks) came from per-actor writes that followed a different path than
  the root
- a divergent layout teaches a wrong model to the next reader, who then designs against two layouts that
  are one (measured 2026-09-27: a vision drew two trees with different files for the same layout)

## .how

- write every brain dir through ONE function that takes the actor and its roles, and emits the whole
  layout. the repo actor calls it like any other
- a test asserts the layout (names + arrow targets) is identical across the repo actor and a hash
  actor, and differs only in `boot.md` and `settings.of.repo.json` content

| when… | then… |
|---|---|
| you add a file for the repo actor only | 🔴 blocker. add it to every actor, or to none |
| you want "the repo's settings" | it is the repo actor's `settings.of.repo.json` |
| you branch on the repo actor | branch on content (which roles), never on layout |
| a reviewer sees two trees in a diagram | nitpick → merge into one tree + a "which actor" row |

## .enforcement

- a file, arrow, or arrow target present in one actor's brain dir and not another's = **blocker**
- a code branch on the repo actor that changes the layout = **blocker**
- a doc or diagram that draws two brain dir layouts = **nitpick**

## .see also

- `define.brain-dir-layout-is-one-for-every-actor` — the invariant this enforces
- `rule.forbid.per-clone-config` — its peer: an actor owns its config, a clone references it
