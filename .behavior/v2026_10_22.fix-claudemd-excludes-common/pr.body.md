# fix(enroll): claudeMdExcludes carries one portable glob, never a machine's home

closes #816 — `rhx init` no longer writes the host's home into the tracked `settings.of.repo.json`
closes #779 — the repo actor's grove arrow carries no host home in git: untracked, findserted by
init on each box

one behavior: no tracked file under the repo actor's brain dir names a box. the clamp is
`init.hooks.acceptance` `[case11]`: box A inits and commits, box B (another HOME) inits the same
tree, and `git status` stays clean, `settings.of.repo.json` stays byte-equal, and the grove arrow
on box B points at box B's home. red with `!/settings.of.grove.json` put back in the brain-dir
allowlist (`setRepoActorBrainDir.ts`, `BRAIN_DIR_GITIGNORE_LINES`).

## what

- enroll writes `**/!(brain)/.claude/CLAUDE.md` in place of one absolute home path per machine.
  the proof of what claude code matches (picomatch, `dot: true`, the absolute path) is in the
  vision; `brain-dir-boot.journey` `[t3.0]` proves it against the real cli
- the next enroll or `rhx init --hooks` drops every absolute entry it finds, and names each drop;
  a second run changes naught
- `rule.forbid.machine-names-in-committed-config` plus `committedConfigNamesNoMachine`, a test that
  fails on any committed config that names this machine's home, user or host
- the tracked grove link `settings.of.grove.json` leaves git (it pointed at one human's home)

## for teammates, on the first pull

git may refuse the pull, since the grove link is now untracked. the cure, also printed by
`rhx init --hooks`:

```sh
git checkout -- .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.grove.json
git pull
```

a box on an older `rhx` re-adds its own home path on enroll until it upgrades; the drop on the next
`rhx init --hooks` cleans it.

## test intents changed — each needs your approval

| test | old | new | why |
|---|---|---|---|
| `setRepoActorBrainDir`, `upgrade.default-actor-migration.journey` | `!/settings.of.grove.json` in the brain-dir allowlist | absent | the grove link leaves git (F5) |
| `asEnrolledActorsHookSyncLines`, `syncHooksForLinkedRoles` | `hint: …` | `hint = …` | `rule.forbid.colons-in-stdout` on a rewritten line (F14) |

## after the rebase onto main v1.54.1

- #754 (attribution off in every actor config) lands beside this pr: the writer empties
  attribution, then sets the portable excludes; `genBrainCliConfigArtifact.integration` keeps
  main's `[case8]`–`[case10]` and carries this pr's as `[case11]`–`[case12]`

- main had re-committed both defects this pr removes: the grove link (now to `/home/camper/…`) and
  `/home/vlad/.claude/CLAUDE.md` in the repo actor excludes. the rebased diff removes both again
- the role bump (F4) left this pr: main already carries newer roles (`rhachet-roles-ehmpathy@1.43.0`)
- the `[t3.0]` home-exclude probe sits behind main's `IS_BRAIN_LIVE` gate, beside the other paid
  `claude -p` turns

## calls held for you

- F5 — the tracked grove link leaves git, which drops `!/settings.of.grove.json` from the locked
  allowlist; the teammate cure above is the cost
- F6 — a box with no grove: keep an arrow to an absent file, or untrack `settings.json`, or neither
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
