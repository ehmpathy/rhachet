# rule.forbid.machine-names-in-committed-config

> **a config file git tracks names no machine: no home dir, no username, no hostname. reach a
> machine's paths by a glob or a relative path, never by a literal.**

```json
👎  "claudeMdExcludes": [ "/home/vlad/.claude/CLAUDE.md" ]
👍  "claudeMdExcludes": [ "**/!(brain)/.claude/CLAUDE.md" ]
```

## .why

- **it churns.** each machine that writes the file rewrites the line to its own home, so every pr
  carries a settings diff that is no one's work
- **it accretes.** two branches from two machines merge into a file that names both
- **it leaks.** a username in git is a fact about a person, shipped to every clone forever

## .the test

> **would this file's bytes differ if a teammate on another box wrote it?**

yes → a machine name hides in it. replace the literal with a glob, or a path relative to the repo.

| when… | then… |
|---|---|
| a writer joins `home`, `os.homedir()`, `os.userInfo()` or `os.hostname()` into a value it saves | 🔴 the strongest cue. is the target file tracked? |
| an exclude, an include, or an allowlist must reach a home path | a glob — and prove the consumer expands it the way you assume (claude never expands `~`) |
| a test writes a tracked file | scan the output with `getAllMachineNamesInText` under the real machine; assert `[]` |
| a tracked symlink points into a home | the same defect, in a link target — keep the link out of git and let the writer relink it |

## .enforcement — a test, never a runtime refusal

- the writer's integration test scans what it writes for the repo actor: `getAllMachineNamesInText`
  over the written file → `[]`, and a re-write under another HOME → identical bytes
  (`genBrainCliConfigArtifact.integration.test.ts`, `[case8]`; the absent-key twin is `[case9]`)
- `src/.test/committedConfigNamesNoMachine.integration.test.ts` scans every tracked file in this
  repo's own repo actor brain dir and every tracked link target there, so a hand edit, a stale
  render, or a home link fails ci
- 🟡 the scan's reach: this machine's home, username (as a path segment) and hostname (in a host
  position), the checkout path, and any home shape (`/home/<x>`, `/Users/<x>`, `/root`). a foreign
  host or a bare username value (`"owner": "camper"`) passes it — this rule still forbids both,
  and review is their check
- 🟡 no check in the writer itself: `claude` runs through `rhx enroll`, so a refusal that ever
  misfired would block every launch on every box. the leak is cheaper than that

## .boundary

| a violation | not a violation |
|---|---|
| a home, user or host literal in a tracked config value | the same in a gitignored actor dir (`.agent/.actors/*` but the repo actor) |
| a tracked symlink whose target is a home path | a glob such as `**/CLAUDE.local.md` |
| | a path relative to the repo root |

🟡 the grove link (`settings.of.grove.json` → `<home>/.claude/settings.json`) is the worked case
of the link row: it stays out of git, and each layout findsert relinks it on the box that needs
it. its peer arrow `settings.json → settings.of.grove.json` is relative, names no machine, and is
tracked.

blocker: a writer that saves a machine literal into a tracked file · a tracked config line that
names a home, user or host · a home glob shipped with no proof the consumer matches it.

## .see also

- `define.brain-dir-layout-is-one-for-every-actor` — which brain dir files are tracked
- `src/domain.operations/enroll/getClaudeMdExcludesList.ts` — `CLAUDE_MD_EXCLUDE_HOME_GLOB` and its proof
