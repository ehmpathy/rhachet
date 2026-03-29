# self-review: has-pruned-backcompat

## question

did we add backwards compatibility that was not explicitly requested?

## review

### backwards compat in implementation

one backwards compat behavior was implemented:

**onBoot without filter → SessionStart only**

when a role declares `onBoot` hook without `filter.what`, it maps to `SessionStart` event only — same as prior behavior.

### was this explicitly requested?

**yes.** multiple artifacts confirm this was explicitly requested:

1. **vision** (line 123-124):
   > "backwards compatible: no filter = SessionStart only (same as prior)"

2. **criteria usecase.3** (lines 22-30):
   ```
   given(role declares onBoot hook without filter)
     when(role hooks are synced to claude code)
       then(hook is registered under SessionStart event)
         sothat(prior behavior is preserved)
   ```

3. **blueprint codepath tree** (line 37):
   > "no filter → SessionStart (backwards compat)"

### why it holds

this backwards compat is not assumed — it's a core requirement:

- roles with extant `onBoot` hooks (no filter) should see no behavior change
- the criteria explicitly tests this scenario
- a break of extant hooks would violate the principle of least surprise

### no other backwards compat

no other backwards compat was added. the implementation is minimal:

- new filter values are additive
- no deprecated paths
- no migration logic
- no fallback behaviors beyond the prescribed default

## conclusion

the single backwards compat behavior (no filter → SessionStart) was explicitly requested in vision and criteria. no assumed backwards compat was added.
