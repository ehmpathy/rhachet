# self-review: has-pruned-backcompat (r2)

## question

did we add backwards compatibility that was not explicitly requested?

## the review process

i re-read the translateHook.ts implementation line by line, then cross-referenced against the vision, criteria, and blueprint to verify each backwards compat decision.

## found: one backwards compat behavior

**location:** translateHook.ts line 53

```ts
const bootTrigger = hook.filter?.what ?? 'SessionStart';
```

**behavior:** when onBoot hook has no filter.what, defaults to SessionStart

### is this explicitly requested?

**yes.** i traced this to three artifacts:

1. **vision** (1.vision.md lines 96-97):
   > "backwards compatible: no filter = SessionStart only (same as prior)"

   this is listed under "### pros" as an explicit design goal

2. **criteria** (2.1.criteria.blackbox.md usecase.3 lines 22-30):
   ```
   given(role declares onBoot hook without filter)
     when(role hooks are synced to claude code)
       then(hook is registered under SessionStart event)
         sothat(prior behavior is preserved)
   ```

   this is a test case — explicit verification that the behavior is required

3. **blueprint** (3.3.1.blueprint.product.v1.i1.md lines 36-37):
   > "no filter → SessionStart (backwards compat)"

   codepath tree explicitly marks this as a prescribed behavior

### why it holds

the backwards compat was not assumed "to be safe" — it was a core design constraint:

**constraint origin:** the wish itself mentions "lets ensure our contract supports that" — this implies extant contracts must continue to work

**enforcement:** criteria usecase.3 explicitly tests this scenario. if i had not implemented this compat, the tests would fail

**alternative considered:** could have required filter.what for all onBoot hooks. rejected because:
- would force migration of all extant hooks
- no vision/criteria requested such a change
- violates principle of least surprise

## found: no other backwards compat

i searched for other potential backwards compat:

1. **translateHookFromClaudeCode:** SessionStart → onBoot without filter
   - this is the inverse of the above, not additional compat

2. **del method:** searches all boot buckets
   - this handles wildcards correctly, not a compat concern

3. **upsert method:** iterates array return
   - this is new functionality, not compat

## conclusion

one backwards compat behavior (no filter → SessionStart) is explicitly required by vision, criteria, and blueprint. no additional assumed backwards compat was added. the implementation is minimal and traces to explicit requirements.
