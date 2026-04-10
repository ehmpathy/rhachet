# review: has-pruned-backcompat

## reviewed for backwards compatibility concerns

searched for:
- deprecated flags or aliases
- fallback behavior "to be safe"
- version detection for old behavior
- migration code

## findings

### no backwards compat code found

the implementation is purely additive:

1. **new flag:** `--which` is optional. when absent, behavior is inferred from invocation method.

2. **new return field:** `upgradedGlobal` added to UpgradeResult. callers who don't use it are unaffected.

3. **default behavior change:**
   - before: local upgrade only
   - after: local + global (when invoked via rhx)

   this is a behavior change, not backwards compat. the vision explicitly requests this as the new default.

4. **no deprecated aliases:** no `--global-only`, no `--local-only`, no `--skip-global`.

5. **no version checks:** no "if old version, do X".

## verdict

no backwards compat code. implementation follows vision: new behavior is the default, old behavior available via `--which local`.
