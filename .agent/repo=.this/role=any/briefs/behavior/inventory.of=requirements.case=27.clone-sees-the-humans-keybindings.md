# requirement: an enrolled clone sees the human's keybindings

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a clone reads the human's `~/.claude/keybindings.json`, so a key the human rebound or unbound acts the
same in a clone as in a bare `claude`.

- while the home holds the file, every actor's brain dir holds `keybindings.json -> .home/.claude/keybindings.json`
  and `.home/.claude/keybindings.json -> <home>/.claude/keybindings.json`
- with no file at the home, enroll skips the arrows with no error, and the clone uses claude's defaults
- a re-enroll changes no entry: the layout findsert is idempotent
- a home file removed later: the next findsert removes both arrows of ours, and leaves a real file,
  a dir, or a foreign arrow at `keybindings.json` in place
- a home file enroll cannot read (a link loop, a denied read, a file of mode 000) reads as no file: the arrows of ours go,
  with the reason `keybindings unreadable`, and enroll never fails over it, as a bare claude logs the
  fault and runs on defaults. enroll prints one `ℹ` line on stderr that names the path and the fix;
  an absent file stays silent
- the same rule holds for every actor

## .clamp

- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` — `setKeybindingsArrows`, with the
  names in `CLAUDE_KEYBINDINGS_FILENAMES` (`src/_topublish/rhachet-brains-anthropic/src/hooks/constants.ts`)

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.integration.test.ts` [case10] present + re-run + home edit seen · [case11] absent · [case12] removed · [case13] not ours kept · [case14] a real file replaced · [case15] a dir source · [case16] a dir at the top name · [case17] a dead-link source · [case18] a stray entry at the home name · [case19] a foreign arrow replaced · [case20] a home source that loops: no arrow, no fault · [case21] a laid source turned into a loop: both arrows go, `keybindings unreadable` · [case22] a dotfiles link source: the home name aims at the home path · [case23] a real file at the home name, replaced · [case24] a home `.claude` that is a file: absent, no fault · [case25] a file this process may not read (mode 000): `unreadable`, no arrow, checked against an open | ✅ green 2026-11-27; clamp bites: the clamp reverted, case10, case12 and case14 go red (8 tests); the read check removed, case25 goes red on a non-root host (a root host reads through mode bits, so there the file is readable and the case asserts `file`); case16–19 red with no clamp by construction; case11, case13, case15 (no arrow laid) stay green |
| integration | `src/domain.operations/init/boots/setRepoActorBrainDirLayout.integration.test.ts` [case1b] the repo actor, through `init`'s own layout path, gets both arrows | ✅ green 2026-11-27 |
| integration | `src/domain.operations/init/boots/setRepoActorBrainDir.integration.test.ts` [case1] git ignores both keybindings names in the repo actor's tracked dir | ✅ green 2026-11-27 |
| integration | `src/domain.operations/enroll/setActorSettingsDerived.integration.test.ts` [case1] a derived actor gets both arrows | ✅ green 2026-11-27 |
| acceptance | `blackbox/cli/enroll.acceptance.test.ts` [case2g] a real `rhx enroll` under a pinned HOME: [t0] the arrow resolves to the HOME file, and enroll says naught of it · [t1] no source, no name written, no HOME file · [t2] a second enroll leaves both arrows as laid, and the HOME bytes as written · [t3] a HOME file removed between enrolls: both arrows go · [t4] a HOME file created after the first enroll: the second lays both arrows · [t5] a HOME name that loops: exit 0, one `ℹ` line, no arrow | ✅ green 2026-11-27; clamp bites: the print disabled, [t5] goes red |
| live | `blackbox/cli/enroll.keybindings.realbrain.acceptance.test.ts` [case1] a real haiku tui clone under an isolated HOME: its debug log loads 2 user bindings from the brain dir arrow, with no fault | ✅ green 2026-11-27 (`rhx test.acceptance.brainlive --scope 'path://enroll.keybindings.realbrain'`); clamp bites: the clamp reverted, the load row goes red |

## .source

the wish of `.behavior/v2026_11_27.fix-enroll-links-keybindings`, 2026-11-27. the vision's fulcrums
F1–F3 were confirmed by the director the same day.
