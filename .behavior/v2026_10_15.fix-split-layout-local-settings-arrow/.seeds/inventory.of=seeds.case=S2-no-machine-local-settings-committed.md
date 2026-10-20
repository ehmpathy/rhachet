# seed S2 — no machine-local settings committed

## .said (2026-10-15)
> aligned here too? ---
>
> title: fix(enroll): settings.local.json is an arrow to settings.of.repo.json; no machine-local settings committed
>
> .what
>
> In the repo actor brain dir (.agent/.actors/actor.via.repo=ambient/brain/.claude/), make settings.local.json a relative symlink to settings.of.repo.json, the same way settings.json ->
> settings.of.grove.json is a symlink today. Create it in setBrainDirSettingsLayout, and leave it alone if it's already there.
>
> .why
>
> - Today setRepoActorBrainDir.ts lists !/settings.local.json in the .gitignore allowlist, so a human's real settings.local.json gets committed. That file is claude's per-machine log of
>   "yes, don't ask again" approvals, with absolute /home/<user>/... paths and commands for files long deleted. In a public repo that exposes the user; everywhere else it's noise.
> - define.brain-dir-layout-is-one-for-every-actor already says settings.local.json "is not part of the layout; no clone reads it". The earlier .default layout ignored *.local.json too
>   (setRepoBrainDirSymlink.integration.test.ts:206). The allowlist line contradicts both.
> - A symlink gives the name one answer, rhachet's: anything that reads claude's project-local layer gets the role-derived repo settings, never a stale personal log.
>
> .decisions needed
>
> 1. Writes through the symlink. claude writes settings.local.json when a human picks "don't ask again". If it writes through the link, the personal approval lands in the committed
>    settings.of.repo.json and is wiped at the next rebuild. If it writes a new file over the link, the link turns back into a real file. Measure which claude does, then handle it: the
>    layout code already replaces a real file with the symlink at settings.json, so do the same here.
> 2. An existing real file gets replaced by the symlink, not merged (same rule as the grove symlinks). Report the replacement in stdout.
> 3. Loaded twice. claude ranks the local layer above the project layer, so with both --settings settings.of.repo.json and the symlink, the repo settings load twice. Confirm that's
>    harmless: arrays merge and no hook fires twice.
>
> .also: the grove symlink is committed with an absolute target
>
> settings.of.grove.json -> ~/.claude/settings.json is allowlisted too, and its target is the expanded home path (/home/<user>/.claude/settings.json). Committed, it names the user and
> dangles or points at the wrong file on every other box. rhachet recreates it at each enroll, so committing it gains nothing. Drop !/settings.of.grove.json and !/settings.json (which only
> points at it) from the allowlist, and keep settings.of.repo.json as the only committed settings file.
>
> .criteria
>
> - settings.local.json is a symlink to settings.of.repo.json after any rhx init / rhx enroll, and a rerun changes nothing.
> - A real file at that name is replaced by the symlink.
> - git status in a fresh repo shows no settings file with an absolute path or a username.
> - Update setRepoActorBrainDir.integration.test.ts, setBrainDirSettingsLayout.integration.test.ts [case7], and the upgrade.default-actor-migration acceptance snapshot that lists
>   !/settings.local.json.
>
> First seen in uladkasach/dev-env-setup on main, 2026-10-15, when a staged release carried the actor dir's settings.local.json and settings.of.grove.json.

## .said, follow-up (2026-10-15)
> we want clones who dont get explicitly enrolled to still be ambiently enrolled by the repo. thats a core
> invariant we should have enbriefed

answers to the deltas:
- commit the arrow: "Commit it (Recommended)"
- untrack: "why would we untrack anything? we need all 4 tracked, settings.of.{grove,repo}.json = the
  source, settings.json and settings.local.json are pointers"
- report: "A distinct REPLACED row (Recommended)"
- always-allow: "wait what? why wouldnt they land in settings.of.repo.json via symlink?"

## .settled
- a session the repo did not explicitly enroll is ambiently enrolled by the repo — enbriefed as
  `define.invariant.unenrolled-claude-is-ambiently-enrolled`
- all four settings names stay tracked: `settings.of.grove.json` and `settings.of.repo.json` are the
  sources, `settings.json` and `settings.local.json` are pointers. S2's ask to drop the grove names from
  the allowlist is not taken
- the `settings.local.json` arrow is committed
- a replaced real `settings.local.json` reports as a distinct REPLACED row
- always-allow: settled by S4 (Q5) — claude refuses to write through the link, and that refusal is the
  desired behavior; a grant reaches the repo only through the `CLAUDE_CONFIG_DIR` opt-in

## .landed
- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` — the REPLACED effect
- `src/domain.operations/boot/asBrainDirSyncReportLines.ts` — the `replaced` row in stdout
- `src/domain.operations/init/boots/syncBootsForBrainDirs.ts` — `settingsReplaced`, both layout steps
- `.agent/repo=.this/role=any/briefs/define.invariant.unenrolled-claude-is-ambiently-enrolled.md`
