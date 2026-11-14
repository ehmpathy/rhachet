# define.brain-dir-layout-is-one-for-every-actor

> **there is ONE brain dir layout. every actor dir has it. the "repo's brain dir" is not a second kind —
> it is the repo actor's brain dir, `actor.via.repo=ambient/brain/.claude`, and `<repo>/.claude` is
> only a symlink to it.**

## .the layout — identical in every `.agent/.actors/<actor>/brain/.claude/`

```
CLAUDE.md            -> AGENTS.md                  # the door claude reads
AGENTS.md                                          # @boot.md
boot.md                                            # REAL: this actor's roles, rendered
settings.of.repo.json                                 # REAL: this actor's roles' hooks + permissions
settings.of.grove.json  -> .home/.claude/settings.json  # the grove
.home/.claude/settings.json -> ~/.claude/settings.json  # untracked
settings.json        -> settings.of.grove.json        # claude's fixed name → our clear name
settings.local.json  -> settings.of.repo.json         # claude's local name → the repo's settings
```

two real files carry content: `boot.md` and `settings.of.repo.json`. every other name is an arrow
(`.home` is a real dir: no link walks into the home).
a clone reads `settings.of.repo.json` via `--settings`; a plain `claude` via the local arrow.

🔴 **the repo outranks the grove**, for both kinds of reader — an enrolled clone and a plain `claude`:

| reader | slot | file | rank |
|---|---|---|---|
| clone | `--settings` | `settings.of.repo.json` | high — the repo wins |
| clone | user (`CLAUDE_CONFIG_DIR`) | `settings.json` → `settings.of.grove.json` → `~/.claude/settings.json` | low — the grove fills every key the repo leaves unset |
| plain `claude` | local | `settings.local.json` → `settings.of.repo.json` | high — local outranks project and user |
| plain `claude` | project + user | `settings.json` → the grove, and `~/.claude/settings.json` | low |

why the grove must be the file claude calls `settings.json` (docs + probe, 2026-09-27): no layer ranks below
user, and a second `--settings` replaces the first whole — it does not stack.

## .what differs between actors — and only this

| differs | how |
|---|---|
| **content** | `boot.md` and `settings.of.repo.json` hold THAT actor's roles. the repo actor holds the ambient roles (`term=ambient`) |
| **which claude layer reads which file** | decided by how claude reaches the dir, never by what the dir holds |

**brain settings live only in actor dirs, and each reader reads exactly ONE actor dir.** no file lives in
`<repo>/.claude`, and none can: it is a symlink into the repo actor's dir. never name a file by a
`<repo>/.claude/…` path — name it by the actor dir it lives in.

🔴 a clone reads its OWN actor dir only. claude looks up the `project` and `local` layers relative to the
cwd, and a clone's cwd is the repo — so either source would reach the repo actor's dir. a clone therefore
spawns with the `user` config source only, plus `--settings` on its own `settings.of.repo.json`.
no clone reads `settings.local.json`; only a plain `claude` does (`inventory.of=requirements.case=10`).

- an everyday `claude` (a bare enroll) is a clone of the repo actor — the ambient roles live there and only
  there (`term=ambient`)
- trust is granted at enroll, to every actor: its `.claude.json` trusts the repo path and, in a worktree,
  the main checkout (claude keys trust there). a blanket grant, so no clone meets the trust prompt — it
  subsumes "inherit from the repo actor"
- 🔴 **one answer, rhachet's** (wisher, 2026-10-07). a real file where an arrow belongs (`settings.json`,
  `settings.of.grove.json`) is replaced by the arrow. its content is never merged into `settings.of.repo.json`
  and never kept aside; a `settings.forked.*.json` an earlier layout left is removed
  (`inventory.of=requirements.case=7`)
- 🔴 **`settings.of.repo.json` is always there.** the layout findsert writes `{}` when it is absent, never
  touches an extant one, and refuses a symlink or a dir at that name — in every actor dir. so a role init
  that adds a key (a permission allow) writes `settings.of.repo.json` by name and never creates it
  (`inventory.of=requirements.case=8`)
- 🔴 `/model` or `/config` in a clone is NOT box-wide, and does not last. claude resolves `settings.json` one link, then renames a temp over `settings.of.grove.json` — a per-actor fork of the grove; the home file is untouched. it holds for that actor until the next layout findsert (`rhx init`, `rhx enroll`), which replaces the fork with the grove arrow. the choice is dropped, by design. ⇒ for a durable default, set it in `~/.claude/settings.json` (the box) or in a role's settings (the repo)

## .why one layout

- **one code path.** the render, the relink, and the migration run the same function over every actor dir;
  a special case for the repo actor is a second path to drift
- **one mental model.** "the repo's dir" vs "the actor's dir" reads as two dirs with two shapes. it is
  one layout reached two ways. the wrong model produced a wrong design once already (2026-09-27: a vision
  drew two separate trees with different files)
- **the sync invariant holds uniformly** — `catalog.of=actor-clone-design`: an actor owns its config, and
  the repo actor is an actor

| when… | then… |
|---|---|
| you write "the repo's brain dir" | 🔴 you mean the repo actor's brain dir. say so, or say `<repo>/.claude` for the reach path |
| you draw a brain dir tree | draw one, and label the repo actor as one row of "which actor" |
| you add a file to a brain dir | it goes in every actor's, or in none (`rule.forbid.brain-dir-layout-divergence`) |
| the repo actor seems to need a file the others lack | the difference is a reach path or a content difference, never a layout one |
| you change what a brain dir name holds or points at | 🔴 list every reader (plain `claude`, clone, ide, ci) before and after — `rule.require.reader-table-before-a-shape-change` |

.note = a repo from before this layout holds `actor.via.slug=.default` and a real `settings.json`; the next
`rhx init` moves the dir to `actor.via.repo=ambient` and replaces the file with the grove arrow. the hook sync
then writes the roles' hooks into `settings.of.repo.json`; a hand-added key in the old file does not carry over.
`rhx init --roles …` and `rhx upgrade` make that move, the `<repo>/.claude` link and the layout findsert
BEFORE the role inits, so each init meets the layout it will live in (`inventory.of=requirements.case=8`).

## .see also

- `rule.forbid.brain-dir-layout-divergence` — the rule that enforces this
- `define.brain-dir-repo-vs-actor` — the two reach paths and who writes which
- `catalog.of=actor-clone-design._.md` — the identity model; the repo actor is an actor
