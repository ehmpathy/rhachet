# review: behavior-declaration-adherance (r6)

## verdict: pass

## summary

Reviewed all changed files line by line against vision, criteria, and blueprint. Implementation follows the spec accurately.

## interface verification

`src/domain.objects/BrainBootsAdapter.ts` matches blueprint lines 302-312:
- slug, spawnEnv, dao, genBootContent, genSettingsJson, genCredentialsSymlink all present with correct signatures

## orchestrator verification

`src/domain.operations/init/genBrainConfigDir.ts` matches blueprint lines 324-354:
- config path: `.agent/.brain/$slug/config/scope=$scope/` (lines 23-30)
- mkdir recursive (line 31)
- calls adapter.genBootContent + dao.set (lines 34-35)
- calls adapter.genSettingsJson + writeFile (lines 37-38)
- calls adapter.genCredentialsSymlink (line 40)
- .gitignore for scoped configs (lines 43-45)

## adapter factory verification

`genBrainBootsAdapterForClaudeCode.ts` matches blueprint lines 360-394:
- slug: 'claude-code' (line 21)
- spawnEnv: 'CLAUDE_CONFIG_DIR' (line 22)
- dao.get/set: reads/writes CLAUDE.md (lines 24-29)
- genBootContent: calls genClaudeMdContent (line 32)
- genSettingsJson: placeholder filter matches blueprint placeholder (line 39)
- genCredentialsSymlink: symlinks ~/.claude/.credentials.json (lines 42-44)

## boot order verification

`genClaudeMdContent.ts` matches blueprint lines 400-419:
- partitions: published roles before local roles (lines 66-68)
- captures bootRoleResources stdout (lines 74-81)

## spawn env verification

`enrollBrainCli.ts` matches blueprint lines 426-458:
- sets `env[adapter.spawnEnv] = configDir` (lines 42-43)
- passes env to spawn (line 52)

## CLI contract verification

`invokeInit.ts`:
- `--hooks` flag added (line 27)
- calls genBrainConfigDir (line 147)

`invokeUpgrade.ts`:
- calls genBrainConfigDir after upgrade (line 68)

`invokeEnroll.ts`:
- passes configDir and bootsAdapter to enrollBrainCli (lines 174-180)

## why this holds

All implementations trace directly to blueprint impl samples. No deviations or misinterpretations found. The single TODO (hooks filter by roles) matches the blueprint's own `/* roles filter */` placeholder, not a deviation.
