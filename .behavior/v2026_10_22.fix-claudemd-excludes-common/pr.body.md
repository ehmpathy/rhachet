# fix(enroll): claudeMdExcludes carries one portable glob, never a machine's home

closes #816 — `rhx init` no longer writes the host's home into the tracked `settings.of.repo.json`
closes #779 — the repo actor's grove arrow is box-neutral: tracked, with a relative target; the one
host path lives in an untracked `.home/` link, findserted by init on each box

one behavior: no tracked file under the repo actor's brain dir names a box. the clamp is
`init.hooks.acceptance` `[case11]`: box A inits and commits, box B (another HOME) inits the same
tree, and `git status` stays clean, `settings.of.repo.json` stays byte-equal, the tracked grove arrow
reads `.home/.claude/settings.json` on both boxes, and box B's `.home` link points at box B's home.
red with the grove arrow aimed straight at the home again (`setBrainDirSettingsLayout.ts`).

```
settings.json               -> settings.of.grove.json              tracked
settings.of.grove.json      -> .home/.claude/settings.json         tracked, relative, the same bytes on every box
.home/.claude/settings.json -> <home>/.claude/settings.json        untracked (the `/*` allowlist), findserted per box
```

## what

- enroll writes `**/!(brain)/.claude/CLAUDE.md` in place of one absolute home path per machine.
  the proof of what claude code matches (picomatch, `dot: true`, the absolute path) is in the
  vision; `brain-dir-boot.journey` `[t3.0]` proves it against the real cli
- the next enroll or `rhx init --hooks` drops every absolute entry it finds, and names each drop;
  a second run changes naught
- `rule.forbid.machine-names-in-committed-config` plus `committedConfigNamesNoMachine`, a test that
  fails on any committed config that names this machine's home, user or host
- the grove arrow `settings.of.grove.json` points at `.home/.claude/settings.json`, a relative path,
  for every actor dir; the next `rhx init` or `rhx enroll` rewrites an absolute one in place, so a
  teammate's pull meets no conflict
- a box with no `~/.claude/settings.json` keeps both tracked arrows and drops only the `.home` link,
  so the chain ends inside the brain dir and git stays clean (F6)
- `delGitIndexPaths` (the shared index removal, with git's messages pinned to the C locale) stays,
  now for `findsertDirGitignore` alone

a box on an older `rhx` re-adds its own home path on enroll until it upgrades; the drop on the next
`rhx init --hooks` cleans it.

## test intents changed — each needs your approval

| test | old | new | why |
|---|---|---|---|
| `setBrainDirSettingsLayout` `[case4]`, `[case4b]`, `enroll` `[case2c][t1]`, `brain-dir-boot.journey` `[t3]` | a groveless box holds no grove arrow | it holds both tracked arrows, and no `.home` link | F6 |
| `asEnrolledActorsHookSyncLines`, `syncHooksForLinkedRoles` | `hint: …` | `hint = …` | `rule.forbid.colons-in-stdout` on a rewritten line (F14) |

## after the rebase onto main v1.54.1

- #754 (attribution off in every actor config) lands beside this pr: the writer empties
  attribution, then sets the portable excludes; `genBrainCliConfigArtifact.integration` keeps
  main's `[case8]`–`[case10]` and carries this pr's as `[case11]`–`[case12]`

- main had re-committed both defects this pr removes: the grove link (to `/home/camper/…`) and
  `/home/vlad/.claude/CLAUDE.md` in the repo actor excludes. the diff commits the grove arrow box-neutral
  and drops the home exclude
- the role bump (F4) left this pr: main already carries newer roles (`rhachet-roles-ehmpathy@1.43.0`)
- the `[t3.0]` home-exclude probe sits behind main's `IS_BRAIN_LIVE` gate, beside the other paid
  `claude -p` turns

## calls held for you

- F5 — ruled by your comment: the grove arrow stays tracked and box-neutral; `.home/` names the
  alias of the machine's home (it mirrors `$HOME/.claude/settings.json`)
- F6 — a box with no grove keeps both tracked arrows (now aimed at an absent `.home` link), rather
  than drop them and dirty git
- F7 — open the sso gate for a load diagnosis of three integration flakes, or keep their own pr:
  `fix(test): deflake the daemon, clone-say and pnpm probes under a full integration load`
- F8 — approve a publish of `rhachet-brains-anthropic` (the hook bucket move), then one bump:
  `fix(hooks): publish the brains-anthropic hook bucket move, then bump it`
- F14 — `hint =` over `hint:` on the hook-sync row: two reviewers asked for opposite states
- every fulcrum: `.behavior/v2026_10_22.fix-claudemd-excludes-common/.fulcrums/inventory.of=fulcrums._.md`

## owed

- F13, ruled: ten acceptance-snapshot nitpicks go to their own follow-up pr,
  `test(acceptance): sharpen the claudeMdExcludes journeys and snapshots`; caught as
  `.dream/v2026_11_06.fix.acceptance-snapshot-nitpicks-from-claudemd-excludes.md`

- the live-brain turns in `brain-dir-boot.journey` now run only under `IS_BRAIN_LIVE`, so ci no
  longer spends a paid key on them. still owed: a fail-fast reach gate, so an unreachable brain
  under that flag reads as unreachable, not as a failed boot assert; caught as
  `.dream/v2026_11_06.fix.gate-live-brain-asserts-in-brain-dir-boot-journey.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)