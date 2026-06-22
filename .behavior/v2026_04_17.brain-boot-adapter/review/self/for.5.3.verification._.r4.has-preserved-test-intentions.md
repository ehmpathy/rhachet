# review: has-preserved-test-intentions (r4)

## verdict: pass

## every test I touched

### enrollBrainCli.test.ts — extended, not modified

Read the git diff: only **added** new test cases, never modified prior cases.

**prior tests (unchanged):**
- t0: spawns with claude command
- t1: includes --setting-sources local and --settings in args

**new tests (added):**
- t2: env includes spawnEnv from adapter
- t3: env not modified when no bootsAdapter

No prior assertions were changed. No expectations were weakened.

### assertRegistryBootHooksDeclared.test.ts — deleted

**why deleted:**
- prod code `assertRegistryBootHooksDeclared.ts` was deleted
- blueprint line 129: `[-] assertRegistryBootHooksDeclared.ts # remove (obsolete)`
- with CLAUDE.md approach, this validation is obsolete

**prior intention:** warn when bootable roles lack SessionStart hooks  
**current state:** CLAUDE.md replaces hooks for boots — validation no longer applies

**this is requirements changed, not intention ignored.** The blueprint explicitly mandates deletion.

### findRolesWithBootableButNoHook.test.ts — deleted

**why deleted:**
- helper for assertRegistryBootHooksDeclared.ts (also deleted)
- no other callers

## forbidden patterns verification

| forbidden | did I do this? | evidence |
|-----------|----------------|----------|
| weaken assertions | no | git diff shows only additions |
| remove "no longer apply" cases | no | deleted tests were for deleted prod code |
| change expected to match broken output | no | no expected values changed |
| delete failed tests instead of fix | no | deleted tests were for deleted code, not failures |

## why this holds

1. **enrollBrainCli.test.ts**: diff shows lines 96-140 are all additions (t2, t3)
2. **deleted tests**: prod code was deleted per blueprint — tests followed
3. **no weakened assertions**: prior test cases remain byte-for-byte identical
