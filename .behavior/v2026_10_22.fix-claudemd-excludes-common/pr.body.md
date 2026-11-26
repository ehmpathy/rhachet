# fix(enroll): claudeMdExcludes carries one portable glob, never a machine's home

closes #816 · closes #779

## tl;dr

two committed files under the repo actor's brain dir named the box that last ran `rhx`. every box
that ran init or enroll rewrote them to its own home path, so the tracked tree churned per machine
and leaked usernames into git. this pr makes both files box-neutral: the same bytes on every box.

| # | file | what it held | what it holds now |
|---|---|---|---|
| #816 | `settings.of.repo.json` → `claudeMdExcludes` | one `/home/<user>/.claude/CLAUDE.md` per box | one glob, `**/!(brain)/.claude/CLAUDE.md` |
| #779 | `settings.of.grove.json` (a symlink) | `-> /home/<user>/.claude/settings.json` | `-> .home/.claude/settings.json` (relative) |

the dir is `.agent/.actors/actor.via.repo=ambient/brain/.claude/`, the one actor dir git tracks.
`<repo>/.claude` is a symlink to it.

## background — what these two files are for

a clone (`rhx enroll claude`) runs claude code with this brain dir as its config dir. two inputs
come from the human's own box, and each needs a different answer:

- **the human's `~/.claude/CLAUDE.md` must stay OUT.** claude loads every `CLAUDE.md` it finds as
  memory, the home one included. a clone should boot only the corpus rhachet renders for its roles
  (`boot.md`, reached through the brain dir's own `CLAUDE.md`). so enroll writes a
  `claudeMdExcludes` list that tells claude to skip the home file
- **the human's `~/.claude/settings.json` must come IN.** it holds box defaults (model, theme) every
  clone should share. so the brain dir's `settings.json` is an arrow, through
  `settings.of.grove.json` (the "grove": the box's settings), to the home file. the roles' own
  settings ride separately in `settings.of.repo.json`, which outranks the grove

both mechanisms are right. both wrote the home path into a tracked file — that is the defect.

## #816 — the CLAUDE.md exclude

before, each box appended its own absolute path, so the committed file grew one entry per machine:

```json
"claudeMdExcludes": ["/home/camper/.claude/CLAUDE.md", "/home/vlad/.claude/CLAUDE.md", "**/CLAUDE.local.md"]
```

after, one glob that matches the home file on any box:

```json
"claudeMdExcludes": ["**/!(brain)/.claude/CLAUDE.md", "**/CLAUDE.local.md"]
```

- `**/…/.claude/CLAUDE.md` matches `/home/<anyone>/.claude/CLAUDE.md`. claude matches each exclude
  against the file's absolute path with picomatch (`dot: true`), so a `**` glob reaches outside the
  repo. the proof is in the vision; `brain-dir-boot.journey` `[t3.0]` checks it against the real cli
- `!(brain)` spares `…/brain/.claude/CLAUDE.md` — the brain dir's own door to `boot.md`. without it,
  the clone would exclude its own boot
- the next enroll or `rhx init --hooks` drops every absolute entry it finds and names each drop; a
  second run changes naught

## #779 — the grove symlink

before, the tracked arrow pointed straight at one human's home:

```
settings.of.grove.json -> /home/camper/.claude/settings.json      tracked, names a box
```

after, the box path moves into one untracked link whose name says what it is:

```
settings.json               -> settings.of.grove.json              tracked
settings.of.grove.json      -> .home/.claude/settings.json         tracked, relative, the same bytes on every box
.home/.claude/settings.json -> <home>/.claude/settings.json        ignored (the brain dir's `/*` allowlist), findserted per box
```

- `.home/` mirrors `$HOME`, so the grove target reads as "this machine's home claude settings"
- every actor dir gets this layout, not only the repo actor's (`define.brain-dir-layout-is-one-for-every-actor`)
- init and enroll rewrite an absolute grove arrow in place, so an old tree heals on its next run

## questions you will likely have

**why does a pr about settings talk about CLAUDE.md?** the CLAUDE.md fix (#816) is the exclude list
*inside* `settings.of.repo.json`. the leak was a settings value that named the human's home
`CLAUDE.md`. see "background" above.

**why not just untrack the grove symlink?** an earlier revision did. it left a tracked
`settings.json` that pointed at an untracked name, needed every teammate to run `git checkout --` on
their first pull, and needed init to write git's index. the relative arrow avoids all three: git
sees one stable link, and only `.home/` differs per box.

**what does a teammate see on pull?** naught special. the grove arrow changes from an absolute to a
relative target in this commit; their next `rhx init` or `rhx enroll` findserts their own `.home`
link. no conflict, no cure to run.

**what about a box with no `~/.claude/settings.json` (e.g. ci)?** it keeps both tracked arrows and
drops only the `.home` link. the chain then ends inside the brain dir, so git stays clean and no
write can create the human's home file. claude reads a `settings.json` with no target as absent,
as before. (F6, below — a call for you.)

**does a `/model` or `/config` in a clone still work?** as before: claude renames a temp over
`settings.of.grove.json`, which holds for that actor until the next init or enroll relinks it. in
the repo actor's dir that fork now shows in `git status` until then, since the arrow is tracked.

**a teammate is on an older `rhx`?** their enroll re-adds their home path to `claudeMdExcludes`
until they upgrade; the next `rhx init --hooks` on a current `rhx` drops it.

## how it is proven

- the clamp, `init.hooks.acceptance` `[case11]`: box A (one HOME) inits and commits; box B (another
  HOME) inits the same tree. `git status` stays clean, `settings.of.repo.json` is byte-equal, the
  grove arrow is tracked with the same relative target, and box B's `.home` link points at box B's
  home. red with the grove arrow aimed straight at the home again
- `[case9]`: a committed file with two home excludes, on a box with no grove — both drop, the
  grove arrow is rewritten in place and stays tracked
- `rule.forbid.machine-names-in-committed-config` plus `committedConfigNamesNoMachine`, a test that
  fails on any committed config that names this machine's home, user or host
- this repo dogfoods it: its repo actor brain dir commits the box-neutral grove arrow

## needs your approval

test intents changed:

| test | old | new | why |
|---|---|---|---|
| `setBrainDirSettingsLayout` `[case4]`, `[case4b]`, `enroll` `[case2c][t1]`, `brain-dir-boot.journey` `[t3]` | a groveless box holds no grove arrow | it holds both tracked arrows, and no `.home` link | F6 |
| `asEnrolledActorsHookSyncLines`, `syncHooksForLinkedRoles` | `hint: …` | `hint = …` | `rule.forbid.colons-in-stdout` on a rewritten line (F14) |

calls held for you:

- F5 — ruled by your comment: the grove arrow stays tracked and box-neutral, via `.home/`
- F6 — a box with no grove keeps both tracked arrows (aimed at an absent `.home` link), rather than
  drop them and dirty git
- F7 — open the sso gate for a load diagnosis of three integration flakes, or keep their own pr:
  `fix(test): deflake the daemon, clone-say and pnpm probes under a full integration load`
- F8 — approve a publish of `rhachet-brains-anthropic` (the hook bucket move), then one bump:
  `fix(hooks): publish the brains-anthropic hook bucket move, then bump it`
- F14 — `hint =` over `hint:` on the hook-sync row: two reviewers asked for opposite states
- every fulcrum: `.behavior/v2026_10_22.fix-claudemd-excludes-common/.fulcrums/inventory.of=fulcrums._.md`

## also in this pr

- rebased onto main v1.54.1. #754 (attribution off in every actor config) lands beside this pr: the
  writer empties attribution, then sets the portable excludes; `genBrainCliConfigArtifact.integration`
  keeps main's `[case8]`–`[case10]` and carries this pr's as `[case11]`–`[case12]`
- main had re-committed both defects (the grove link to `/home/camper/…`, and
  `/home/vlad/.claude/CLAUDE.md` in the excludes); this diff replaces both
- `delGitIndexPaths` (one index-removal helper, git's messages pinned to the C locale) now serves
  `findsertDirGitignore` alone
- the role bump (F4) left this pr: main already carries newer roles (`rhachet-roles-ehmpathy@1.43.0`)
- the live-brain turns in `brain-dir-boot.journey`, `[t3.0]` among them, run only under
  `IS_BRAIN_LIVE`, so ci spends no paid key on them

## owed, in their own prs

- F13, ruled: ten acceptance-snapshot nitpicks —
  `test(acceptance): sharpen the claudeMdExcludes journeys and snapshots`; caught as
  `.dream/v2026_11_06.fix.acceptance-snapshot-nitpicks-from-claudemd-excludes.md`
- a fail-fast reach gate for the live-brain turns, so an unreachable brain under `IS_BRAIN_LIVE`
  reads as unreachable, not as a failed boot assert; caught as
  `.dream/v2026_11_06.fix.gate-live-brain-asserts-in-brain-dir-boot-journey.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
