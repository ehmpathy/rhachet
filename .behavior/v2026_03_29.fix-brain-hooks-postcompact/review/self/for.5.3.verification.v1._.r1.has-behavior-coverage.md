# self-review: has-behavior-coverage (r1)

## question

does the verification checklist show every behavior from wish/vision has a test?

## methodical review of wish behaviors

i opened 0.wish.md and read each line:

1. **"support claude cli's new PostCompact and PreCompact hooks"**
   - PostCompact: case5 in translateHook.test.ts tests `filter.what=PostCompact` produces `event: 'PostCompact'`
   - PreCompact: case6 in translateHook.test.ts tests `filter.what=PreCompact` produces `event: 'PreCompact'`
   - **why it holds:** explicit test assertions verify the translation produces correct events

2. **"supportable as onBoot w/ a special filter, just like pre|post tooluse has filters"**
   - case5-9 test various filter.what values: PostCompact, PreCompact, SessionStart, *, invalid
   - the pattern mirrors onTool's filter.what usage
   - **why it holds:** the filter mechanism is tested across all valid values and invalid case

3. **"findsert a brain supplier brief on how to register briefs"**
   - verified file exists: `.agent/repo=.this/role=user/briefs/brains/howto.use.brain.hooks.md`
   - **why it holds:** manual file existence check confirms deliverable

4. **"findsert the example for claude PostCompact -> onBoot translation"**
   - howto.use.brain.hooks.md contains:
     - filter.what values table (lines 36-42)
     - PostCompact example (lines 56-66)
     - PreCompact example (lines 68-78)
     - translation table with rhachet → claude code (lines 105-117)
   - **why it holds:** brief contains worked examples for both events

5. **"ensure that brief is linked like the other brain supplier briefs from the root readme"**
   - verified readme.md line 517: `| hooks | brain lifecycle hooks | [howto.use.brain.hooks](...) |`
   - **why it holds:** manual readme check confirms link exists in inputs table

## methodical review of vision behaviors

i traced each usecase from 2.1.criteria.blackbox.md:

| usecase | criteria requirement | test file | test case | verification |
|---------|---------------------|-----------|-----------|--------------|
| usecase.1 | PostCompact hook → PostCompact event | translateHook.test.ts | case5 | `expect(result[0]?.event).toEqual('PostCompact')` |
| usecase.2 | PreCompact hook → PreCompact event | translateHook.test.ts | case6 | `expect(result[0]?.event).toEqual('PreCompact')` |
| usecase.3 | no filter → SessionStart (backwards compat) | translateHook.test.ts | case1 | `expect(result[0]?.event).toEqual('SessionStart')` |
| usecase.4 | explicit SessionStart filter | translateHook.test.ts | case7 | `expect(result[0]?.event).toEqual('SessionStart')` |
| usecase.5 | wildcard → all three events | translateHook.test.ts | case8 | `expect(result).toHaveLength(3)` + three toContain checks |
| usecase.6 | invalid filter → fail fast | translateHook.test.ts | case9 | `expect(...).toThrow('invalid filter.what value')` |

**why it holds:** each usecase has a dedicated test with explicit assertion that matches the criteria requirement.

## reverse translation coverage

the vision mentions "reverse translation" to read hooks back from claude code:

| reverse behavior | test case | verification |
|------------------|-----------|--------------|
| PostCompact → onBoot + filter.what=PostCompact | case5 reverse | `expect(hooks[0]?.filter?.what).toEqual('PostCompact')` |
| PreCompact → onBoot + filter.what=PreCompact | case6 reverse | `expect(hooks[0]?.filter?.what).toEqual('PreCompact')` |
| SessionStart → onBoot (no filter) | case1 reverse | `expect(hooks[0]?.filter).toBeUndefined()` |

**why it holds:** reverse translation preserves filter.what for compact events, maintains backwards compat for SessionStart.

## conclusion

every behavior from the wish (5 items) and vision (6 usecases + 3 reverse cases) has dedicated test coverage or manual verification. the verification checklist in 5.3.verification.v1.i1.md accurately reflects this coverage.

no gaps found.

