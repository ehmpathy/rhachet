# review: has-pruned-backcompat

## verdict: pass with note

## review

Checked each change for backwards compatibility concerns:

| change | breaks prior usage? | backcompat added? |
|--------|---------------------|-------------------|
| enrollBrainCli signature | no - new params optional | no |
| invokeInit command | no - brain arg optional | yes (see below) |
| invokeEnroll internal | no - same CLI interface | no |
| invokeUpgrade internal | no - same CLI interface | no |
| assertRegistryBootHooksDeclared removal | yes - intentional | no |

## backcompat concern identified

**invokeInit --hooks behavior**

When `--hooks` is used without a positional brain:
```
rhx init --hooks  # legacy: syncs hooks
rhx init claude --hooks  # new: generates brain config
```

I preserved the legacy hook-sync behavior when no brain is specified.

**Question for wisher:**
- Was this preservation intentional per design?
- Or should `--hooks` require a brain argument now?

The blueprint says "rhx init $brain --hooks" with $brain as REQUIRED, which implies the old behavior could be removed. However, I kept it for migration path.

## explicit removals (per blueprint)

- `assertRegistryBootHooksDeclared.ts` - removed as specified in blueprint phase 4
- Callers of above function - removed

These removals are intentional incompatible changes per blueprint requirements.

## conclusion

No unintended backcompat shims added. One intentional preservation flagged for wisher review.
