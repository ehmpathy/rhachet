# define.brain-dir-repo-vs-actor

## .what

a **brain dir** is the config dir a brain-cli reads. there is ONE layout, and every actor dir has it
(`define.brain-dir-layout-is-one-for-every-actor`). "the repo's brain dir" is the **repo actor's** brain
dir, reached through the `<repo>/.claude` symlink. what differs below is the **reach path** and the roles
rendered, never the layout (`rule.forbid.brain-dir-layout-divergence`).

| brain dir | path | who reads it | how it is reached |
|---|---|---|---|
| **the repo actor's** | `.agent/.actors/actor.via.repo=ambient/brain/.claude`, also reached as `<repo>/.claude` (a symlink) | a clone of the repo actor — a bare `rhx enroll claude`, which `claude` is aliased to | user scope — `CLAUDE_CONFIG_DIR=<actorDir>/brain/.claude` at spawn |
| **the repo actor's**, to a plain `claude` | the same dir, as `<repo>/.claude` | a `claude` that rhachet did not spawn — at the repo root, from an ide, in ci | claude's own `project` and `local` layers, looked up from the cwd: `settings.json` (the grove) and `settings.local.json` (the repo) |
| **a hash actor's** | `<actorDir>/brain/.claude` | a clone enrolled with specific roles | user scope — `CLAUDE_CONFIG_DIR` at spawn, as for the repo actor's clone |

two kinds of reader reach a brain dir. a clone reaches its own actor's dir at spawn, and reads only that
dir. a plain `claude` reaches the repo actor's dir through `<repo>/.claude`, and loads the repo's settings
through the local arrow (`define.invariant.unenrolled-claude-is-ambiently-enrolled`).

every brain dir holds the boot and the settings the same way (`define.brain-dir-layout-is-one-for-every-actor`):

```
CLAUDE.md            -> AGENTS.md                  # the door the cli reads
AGENTS.md                                          # @boot.md — the ref, the file rhachet writes
boot.md                                            # the rendered role corpus — ours
settings.of.repo.json                                 # this actor's roles' hooks + permissions — passed as --settings
settings.of.grove.json  -> .home/.claude/settings.json  # the grove, via the untracked .home mirror
.home/.claude/settings.json -> ~/.claude/settings.json  # the mirror's one leaf — untracked, per box
settings.json        -> settings.of.grove.json        # claude's user layer is the grove
settings.local.json  -> settings.of.repo.json         # claude's local layer is the repo — a plain claude's door
```

## .who writes which

| command | writes |
|---|---|
| `rhx enroll` | the actor's brain dir — one actor, the one it enrolls — before it spawns |
| `rhx init --roles …` or `rhx init --hooks` · `rhx upgrade` · `rhx roles link` | the repo actor's brain dir **and** each active actor's brain dir |
| bare `rhx init` (no `--roles`, no `--hooks`) | neither — it renders no boot |

- `rhx enroll` writes only the brain dir of the actor it enrolls; for a bare enroll that is the repo actor's. `rhx init --roles|--hooks`, `rhx upgrade` and `rhx roles link` keep every actor current.
- **active** = at least one clone still live — its reach state (`getCloneReachState`) is LIVE or DEAF, never DEAD. an actor with no live clone is skipped, and renders at its next spawn.
- `settings.of.repo.json` derives one way for every actor: the hook sync writes every ambient role's hooks into the repo actor's file, and each other actor's file is that one, narrowed to the actor's own roles, plus its `claudeMdExcludes`.
- the repo actor's brain dir is the one dir under `.agent/.actors/` that git sees, as `actor.via.slug=.default`'s was before it. the actor's own records beside it (`actor.json`, `roles/`, `clones/`) stay ignored by `.agent/.actors/.gitignore`, as in every actor — a bare enroll writes them on every everyday `claude`. its brain dir `.gitignore` is an allowlist: `/*`, then re-include `.gitignore`, `AGENTS.md`, the `CLAUDE.md` symlink, and `settings.json`, `settings.of.{repo,grove}.json` and `settings.local.json`. all else stays out of git — `boot.md` (regenerated) and the runtime state claude writes there as a clone's `CLAUDE_CONFIG_DIR` (`.claude.json`, `projects/`, the credential link). every other actor dir is ignored whole.
- a role init that writes claude's name `settings.json` replaces the grove arrow with a real file; the next layout findsert replaces it with the arrow again. one answer, rhachet's: its keys never reach `settings.of.repo.json`, and no copy is kept aside (wisher, 2026-10-07; `inventory.of=requirements.case=7`). a role init that wants a key in the repo's settings writes `settings.of.repo.json` by name.
- **the order, for `rhx init --roles …`, `rhx upgrade` and `rhx roles init`:** (1) the repo actor's layout — the legacy dir move, the `<repo>/.claude` link, the layout findsert, which always leaves a real `settings.of.repo.json`; (2) the role links and inits; (3) the repo actor's boot render; (4) the delta actor re-derive; (5) the active actor sweep; (6) the hook sync (`--hooks`, or always on upgrade). `rhx roles init` runs steps (1) and (2) alone. so a role init writes into the layout it lives in, and every step after it keeps what it wrote (`inventory.of=requirements.case=8`).
- with `settings.of.repo.json` in every repo actor brain dir, the auto-detected hook sync keeps only the brains an installed package supplies a hooks adapter for; `--hooks <brain>` names a brain outright, and fails loud when none supplies it.

## .what each corpus holds

| brain dir | its `boot.md` renders |
|---|---|
| the repo actor's | the ambient roles (`term=ambient`) |
| a hash actor's | that actor's enrolled roles |

## .credentials

> **the config is the actor's. the login is the box's.**

a brain dir holds boot, settings, and transcripts. it never holds the claude login.

| what | where | why |
|---|---|---|
| the login (`.credentials.json`) | `~/.claude`, one per box | it derives from the human's login, never from `{ brain, roles }` |
| its write lock and its refresh lock | `~/.claude`, beside it | one lock set, so a refresh loser waits, re-reads, and adopts the winner's token |

- **how.** every clone spawns with `CLAUDE_SECURESTORAGE_CONFIG_DIR=''` beside its per-actor `CLAUDE_CONFIG_DIR`. in claude-code, `''` keys the login file and both locks by `~/.claude`; unset keys them by the config dir. rhachet sets the var after the caller env, so a caller value never reopens the split.
- 🔴 **never link or copy the login into a brain dir.** N actors over one linked file means N lock sets: a refresh winner renames over its link, and the next loser blanks the shared file for the whole box. that is the rhachet 1.48.0 outage.
- **a dead login refuses the enroll.** a login whose refresh token claude-code emptied exits 2 and names `/login`. one `/login` refills the one file, and every live clone recovers with no respawn. an env credential (`CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`) outranks the file and is never refused.
- **a 1.48.0 leftover in a brain dir** is kept while a clone of the actor lives, then removed. a live real file is first adopted into `~/.claude` only when the shared login is dead or absent — a live shared login may be refreshed by any peer at any instant, so it is never overwritten.
- **the clamp.** `blackbox/cli/enroll.shared-brain-auth.acceptance.test.ts` runs a real claude-code through rhachet's spawn env. if a claude-code release stops to honor the var, it goes red.

## .invariants

- **no third place.** a boot never comes from `~/.claude`, and the human's own user-scope memory never loads into a clone. the relocation alone does not hold this — the cli still loads a literal `~/.claude/CLAUDE.md` — so each actor's `settings.of.repo.json` names it in `claudeMdExcludes`.
- **one brain dir per clone.** a clone spawns with the `user` config source only, plus `--settings` on its own `settings.of.repo.json`. `project` and `local` stay off: claude looks both up from the cwd, and a clone's cwd is the repo, so either would reach the repo actor's dir through `<repo>/.claude`. a hash actor's `claudeMdExcludes` also names the repo actor's doors; no actor's list names its own.
- **the repo outranks the grove.** `--settings` ranks above the user layer, and the user layer (`settings.json`) is the grove, so the grove fills only the keys the repo leaves unset.
- **a human's repo notes stay out of a clone.** the repo-root `CLAUDE.md` rides the `project` source and `CLAUDE.local.md` the `local` source, and a clone omits both; `claudeMdExcludes` names `CLAUDE.local.md` as well.
- **the system prompt is empty.** every clone spawns with `--system-prompt ''`, so its boot context is its `boot.md` alone, never the vendor default. an enroll passthrough that would replace it (`--system-prompt`, `--system-prompt-file`) is refused; `--append-system-prompt` is allowed.
- **clones reference, never copy.** a re-render of an actor's `boot.md` reaches its live clones at their next read, and new clones at spawn (`catalog.of=actor-clone-design`, the sync invariant).
- **a roleset change is a new actor**, so a new brain dir. the prior clone keeps its roles, correctly (`define.enrollment-identity-is-the-roleset-hash`).
- **rhachet owns the boot context.** a prior `AGENTS.md`, `CLAUDE.md` or `boot.md` in a brain dir is overwritten or dropped, never merged.

## .see also

- `catalog.of=actor-clone-design._.md` — the identity model this sits within
- `rule.forbid.per-clone-config.md` — why the brain dir is the actor's and never the clone's
- `rule.forbid.clone-config-misnomer.md` — why the word is `brain dir`, and where `config dir` stays fine
- `define.claude-md-vs-system-prompt.md` — where an instruction file lands in the prompt
