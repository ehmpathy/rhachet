# self-review: has-preserved-test-intentions (r4)

## why test intentions are preserved

### the nature of the changes

the upgrade global feature is purely ADDITIVE:
- new flag: --which local|global|both
- new functions: detectInvocationMethod, getGlobalRhachetVersion, execNpmInstallGlobal
- new behavior: upgrade global install when invoked via rhx

none of the prior behavior was REMOVED:
- local upgrade still works
- roles upgrade still works
- brains upgrade still works
- all prior CLI options still work

### how additive changes preserve intentions

when a feature is purely additive, prior tests remain valid because:
1. the inputs they test still produce the same outputs
2. the code paths they exercise still exist
3. the assertions they make are still true

### proof via diff analysis

```
$ git diff main -- src/domain.operations/upgrade/execUpgrade.test.ts
```

the diff shows:
- lines 1-561: unchanged (prior tests)
- lines 562+: new tests added for --which flag

NO DELETIONS. NO MODIFICATIONS. only additions.

### the snapshot change

the only snapshot change:
```diff
+  --which <which>       which installs to upgrade: local, global, or both
```

this ADDS a new option to help output. prior help options unchanged.

### what could have gone wrong (but didn't)

| risk | mitigation |
|------|------------|
| modify execUpgrade to break prior behavior | added global logic in separate code path, prior paths untouched |
| weaken assertions to avoid regressions | no assertions modified, only new assertions added |
| remove tests for "obsolete" behavior | no tests removed, prior behavior still works |

### why this holds

the upgrade global feature extends execUpgrade without replacing any prior logic:

```typescript
// prior behavior (lines 150-152 in execUpgrade.ts)
if (whichTargets.includes('local') && installList.length > 0) {
  execNpmInstall({ packages: installList }, context);
}

// new behavior (lines 172-193 in execUpgrade.ts)
if (whichTargets.includes('global')) {
  // new global upgrade logic
}
```

the local upgrade path is untouched. the global upgrade path is new. prior tests verify the local path. new tests verify the global path.

## conclusion

test intentions preserved because:
1. feature is purely additive
2. no prior code paths modified
3. no prior tests modified
4. diff proves only additions
