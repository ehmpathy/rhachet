# F4 — the worktree's role bumps ride along in the pr

- fork: keep the pre-extant role bumps (`rhachet-roles-bhrain` 0.42.1, `-bhuild` 0.23.3,
  `-ehmpathy` 1.39.9) and the re-rendered permissions order · revert them, ship only the fix
- taken: keep. they were in the worktree when the drive began, `rhx init` renders the committed
  settings from them, and `rule.require.git-release-confidence` lists role bumps as routine
  ride-alongs
- rework: clean — revert three lines of `package.json` and re-render
- confidence low because: the wisher never named them
- a test moves with them: `rhachet-roles-ehmpathy@1.39.9` ships #895, so the mechanic's init
  writes its permissions into `settings.of.repo.json` by name. `invokeInit.integration.test.ts`
  `[case2][t0]` asserted the pre-#895 absence; it now asserts the presence requirement case 8
  asks for, and lands in the bump commit
- where: `package.json`, `pnpm-lock.yaml`, `.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json`, `src/contract/cli/invokeInit.integration.test.ts`
- verdict: —
