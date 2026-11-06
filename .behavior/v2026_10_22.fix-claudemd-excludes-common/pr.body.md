# fix(enroll): claudeMdExcludes carries one portable glob, never a machine's home

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
| `invokeInit.integration.test.ts` | `.not.toContain('"permissions"')` | `.toContain(...)` | the bumped `rhachet-roles-ehmpathy@1.39.9` writes `settings.of.repo.json` by name (F4) |
| `setRepoActorBrainDir`, `upgrade.default-actor-migration.journey` | `!/settings.of.grove.json` in the brain-dir allowlist | absent | the grove link leaves git (F5) |
| `asEnrolledActorsHookSyncLines`, `syncHooksForLinkedRoles` | `hint: …` | `hint = …` | `rule.forbid.colons-in-stdout` on a rewritten line (F14) |
| `defaultPeerReviewerBrain` | `DEFAULT_REVIEW_BRAIN` | `BRAIN_DEFAULT_OF_REVIEW` | renamed in `rhachet-roles-bhrain@0.42.1`; same value, same two asserts |

## calls held for you

- F4 — the worktree's role bumps ride in this pr, in their own commit (the `invokeInit` flip and
  the `defaultPeerReviewerBrain` rename follow from them)
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

- the 6 interactive-clone asserts in `brain-dir-boot.journey` run with no gate on the brain's
  reach, so an unreachable brain reads as a failed boot assert. owed a fail-fast gate; caught as
  `.dream/v2026_11_06.fix.gate-live-brain-asserts-in-brain-dir-boot-journey.md`
