# define.invariant.brain-config-grove-vs-repo

## .what

a brain dir draws on three sources, each with exactly one door, and a session writes to none of the
shared ones:

| source | what it holds | its one door in the brain dir |
|---|---|---|
| **auth** | the claude login | the machine-global login (`~/.claude/.credentials.json`) |
| **grove** | the machine-global settings | `settings.of.grove.json -> .home/.claude/settings.json -> ~/.claude/settings.json` |
| **repo** | the repo's settings (roles' allows + hooks) | `settings.of.repo.json`, a real file, reached by `settings.local.json -> settings.of.repo.json` (a plain claude) or `--settings settings.of.repo.json` (an enrolled clone) |

```
.home/.claude/settings.json -> ~/.claude/settings.json   untracked: the one machine-local entry
settings.of.grove.json -> .home/.claude/settings.json    tracked: the same on every box
settings.of.repo.json                               (real)
settings.json          -> settings.of.grove.json    claude's user name → grove
settings.local.json    -> settings.of.repo.json     claude's local name → repo
```

## .kind

**nurture.** claude would accept many other shapes — one merged file, a copy per brain dir, a repo file
that grows by prompt. we chose this one so that grove and repo settings are clearly demarcated: a reader
names the source of any key by the file it sits in, and no session can blur the two.

## .invariant

```
1. auth(session)                     = the machine-global login
2. grove keys reach a brain dir      ⟺ via settings.of.grove.json
3. repo keys reach a session         ⟺ via settings.of.repo.json
4. a session's settings change       ⟹ ~/.claude/settings.json unchanged
5. a session's "always allow"        ⟹ settings.of.repo.json unchanged,
                                        unless the launch explicitly opts in (CLAUDE_CONFIG_DIR=<repo>/.claude)
6. ~/.claude/CLAUDE.md               ⟹ never loaded in a repo session, plain or enrolled
```

## .why

- **one door per source** — a key's home is readable from its file name. two doors into one source, or
  one file that mixes two, is how a grove key ends up committed or a repo key ends up box-wide
- **auth is one login** — a login copied per brain dir expires per brain dir, and each expiry is a
  separate, silent failure
- **an actor cannot rewrite the machine** (4) — an actor serves one repo; a change it makes must not
  leak into every other repo on the box. claude's own write path already holds this: a user-layer write
  follows one link and replaces `settings.of.grove.json` with a fork, and `~/.claude/settings.json`
  stays untouched. the next layout findsert restores the arrow
- **an actor cannot rewrite the repo by prompt** (5) — the repo's settings are derived from its roles and
  reviewed in a diff. a "don't ask again" click is a session's convenience, not a repo decision. a repo
  change is an explicit opt-in: rare, and unneeded in the common case. claude's own write path holds
  this too: it refuses a local-layer write through the symlinked `<repo>/.claude`, silently, so the
  grant lasts the session only
- **the home memory never reaches a repo** (6) — a human's `~/.claude/CLAUDE.md` differs per box, so a
  repo session that loads it behaves differently per box, and the difference is invisible in the repo.
  the repo actor's `settings.of.repo.json` lists it in `claudeMdExcludes` from `rhx init` on, so a plain
  claude (via the local arrow) and every clone (via `--settings`) skip it. the globs are portable —
  `**/home/*/.claude/CLAUDE.md`, `**/Users/*/.claude/CLAUDE.md`, `/root/.claude/CLAUDE.md` — so the
  tracked file names no machine-local path

## .scope

- covers every actor's brain dir, the repo actor included (`define.brain-dir-layout-is-one-for-every-actor`)
- covers plain sessions and enrolled clones alike
- does not cover where a role init writes: a role init that adds an allow writes `settings.of.repo.json`
  by name, and that is the sanctioned way the repo's settings change
- (4) and (5) rest on claude-code's write path, measured on 2.1.292. a claude release that follows
  symlinks further would break them, and the clamp below would go red
- (6) for a plain claude covers a home at `/home/<user>`, `/Users/<user>` or `/root`; a home elsewhere
  escapes the portable globs. a clone is covered on every box: its `CLAUDE_CONFIG_DIR` is its brain
  dir, so its user memory was never `~/.claude/CLAUDE.md`

## .the litigation

| the question | the case for | the case against | what settles it |
|---|---|---|---|
| where does a plain session's "always allow" land, once the local name leads to the repo? | into `settings.of.repo.json` — the grant was made in this repo, so the repo keeps it | a grant made in one session would change a tracked file every other human and clone reads, with no review | a real-claude measurement: claude refuses to write through the symlinked `<repo>/.claude`, so the grant holds for the session only. that refusal is the desired behavior — the repo changes by explicit choice (a role, or the `CLAUDE_CONFIG_DIR` opt-in) |
| where does an actor's `/model` or `/config` land? | the grove — it is the human's own default | one clone's choice would become the whole box's | claude renames a temp over `settings.of.grove.json`: a per-actor fork. `~/.claude/settings.json` is never touched |

## .the counter-argument

a human who clicks "don't ask again" means it, and to lose the grant at session end is a surprise. the
repo actor's clones could launch with `CLAUDE_CONFIG_DIR=<repo>/.claude` so grants pass through.

the answer: the grant is a session-local preference, and a durable allow belongs where it is reviewed —
a role's settings, or the human's own `~/.claude/settings.json` by hand. a repo that grows by click is a
repo whose allowlist nobody chose. the opt-in launch stays available for the rare case that wants it.

## .what would overturn it

claude-code that writes "don't ask again" to a file of the session's choice (so a per-session or
per-actor file could hold it without the repo or grove), or evidence that lost grants cost more than an
unreviewed repo allowlist.

## .enforcement

- a brain dir with a second door into the grove or the repo, or a file that mixes the two = **blocker**
- a per-brain-dir copy of the login = **blocker**
- a design that lets a session's settings change reach `~/.claude/settings.json` = **blocker**
- a design that lets a prompt's "always allow" reach `settings.of.repo.json` without an explicit opt-in = **blocker**

## .clamp

- `blackbox/cli/brain-config.grove-vs-repo.realbrain.acceptance.test.ts` — (1)–(5) and the opt-in, with a
  real claude in a temp repo under an isolated `HOME`: the layout `rhx init` builds, a plain claude, the
  `CLAUDE_CONFIG_DIR` opt-in, and an enrolled clone (its "don't ask again" and its `/model`); and (6),
  a home `CLAUDE.md` codeword that a claude outside the repo names and a plain claude and a clone in
  the repo do not (`inventory.of=requirements.case=11`)
- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.integration.test.ts` — the arrows
- `src/domain.operations/init/boots/setRepoActorBrainDirLayout.integration.test.ts` — (6), the excludes
  in `settings.of.repo.json` after the layout step, with no machine-local path

## .see also

- `define.invariant.brain-config-grove-vs-repo.why-local-is-the-repo` — why the repo takes the local
  name and the grove `settings.json`, never the swap
- `define.brain-dir-layout-is-one-for-every-actor` — the layout this constrains
- `define.invariant.unenrolled-claude-is-ambiently-enrolled` — why the local arrow exists
- `inventory.of=requirements.case=9.clone-loads-only-its-roles-hooks.md`
- `inventory.of=requirements.case=10.plain-claude-loads-repo-settings.md`
