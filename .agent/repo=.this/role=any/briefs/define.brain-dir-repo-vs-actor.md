# define.brain-dir-repo-vs-actor

## .what

a **brain dir** is the config dir a brain-cli reads. there are exactly two kinds, and a clone reads exactly one.

| brain dir | path | who reads it | how it is reached |
|---|---|---|---|
| **the repo's** | `.agent/.actors/actor.via.slug=.default/brain/.claude`, reached as `<repo>/.claude` (a symlink) | an **unenrolled** `claude` | project scope — the core `.claude/CLAUDE.md` load, ungated |
| **the actor's** | `<actorDir>/brain/.claude` | an **enrolled** clone of that actor | user scope — `CLAUDE_CONFIG_DIR=<actorDir>/brain/.claude` at spawn |

every brain dir holds the boot the same way:

```
CLAUDE.md    # -> AGENTS.md, a symlink — the door the cli reads, in both scopes, with no gate
AGENTS.md    # @boot.md — the ref, the file rhachet writes
boot.md      # the rendered role corpus — ours
```

## .who writes which

| command | writes |
|---|---|
| `rhx enroll` | the actor's brain dir — one actor, the one it enrolls — before it spawns |
| `rhx init --roles …` or `rhx init --hooks` · `rhx upgrade` · `rhx roles link` | the repo's brain dir **and** each active actor's brain dir |
| bare `rhx init` (no `--roles`, no `--hooks`) | neither — it renders no boot |

- `rhx enroll` never touches the repo's brain dir. `rhx init --roles|--hooks`, `rhx upgrade` and `rhx roles link` keep both kinds current.
- **active** = at least one clone still live — its reach state (`getCloneReachState`) is LIVE or DEAF, never DEAD. an actor with no live clone is skipped, and renders at its next spawn.
- `boot.md` is regenerated, so it is never tracked. `AGENTS.md` and the `CLAUDE.md` symlink stay tracked in the default actor's dir, the one dir under `.agent/.actors/` that git sees.

## .what each corpus holds

| brain dir | its `boot.md` renders |
|---|---|
| the repo's | the repo's default roles |
| the actor's | that actor's enrolled roles |

## .invariants

- **no third place.** a boot never comes from `~/.claude`, and the human's own user-scope memory never loads into a clone. the relocation alone does not hold this — the cli still loads a literal `~/.claude/CLAUDE.md` — so the enroll artifact's `claudeMdExcludes` names it.
- **one brain dir per clone.** an enrolled clone reads its actor's; `claudeMdExcludes` keeps the cwd walk off the repo brain dir's `AGENTS.md` and `CLAUDE.md` — either name is a door to the repo's `boot.md`.
- **a human's repo notes stay out of a clone.** the repo-root `CLAUDE.md` rides the `project` config source, which a clone omits. the repo-root `CLAUDE.local.md` rides the `local` source, which a clone keeps for its settings — so `claudeMdExcludes` names it. a bare `claude` still reads both.
- **the system prompt is empty.** every clone spawns with `--system-prompt ''`, so its boot context is its `boot.md` alone, never the vendor default. an enroll passthrough that would replace it (`--system-prompt`, `--system-prompt-file`) is refused; `--append-system-prompt` is allowed.
- **clones reference, never copy.** a re-render of an actor's `boot.md` reaches its live clones at their next read, and new clones at spawn (`catalog.of=actor-clone-design`, the sync invariant).
- **a roleset change is a new actor**, so a new brain dir. the prior clone keeps its roles, correctly (`define.enrollment-identity-is-the-roleset-hash`).
- **rhachet owns the boot context.** a prior `AGENTS.md`, `CLAUDE.md` or `boot.md` in a brain dir is overwritten or dropped, never merged.

## .see also

- `catalog.of=actor-clone-design._.md` — the identity model this sits within
- `rule.forbid.per-clone-config.md` — why the brain dir is the actor's and never the clone's
- `rule.forbid.clone-config-misnomer.md` — why the word is `brain dir`, and where `config dir` stays fine
- `define.claude-md-vs-system-prompt.md` — where an instruction file lands in the prompt
