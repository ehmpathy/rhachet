# self-review: has-questioned-assumptions

## assumption 1: "~20k tokens is too many"

**what we assume:** 20k tokens for repo=.this/role=any is excessive.

**evidence?** the wisher said "too large". the session stats confirm ~20k tokens.

**what if opposite?** 20k tokens is acceptable cost for comprehensive context.

**did wisher say this?** yes, explicitly: "briefs booted from .agent/repo=.this/role=any/briefs are too large"

**verdict:** assumption holds — wisher stated it directly ✓

---

## assumption 2: "refs are sufficient for discoverability"

**what we assume:** a brief.ref pointer is enough for mechanic to know when to read the full content.

**evidence?** refs appear in boot output with path visible. mechanic can read when needed.

**what if opposite?** mechanic might miss important briefs because they're not visible inline.

**exceptions?** new mechanics who don't know which refs are valuable.

**mitigation:** refs still appear in boot. the say list should include truly essential briefs for new contributors.

**verdict:** assumption reasonable with good say curation ⚠️

---

## assumption 3: "domain.thought/ briefs are rarely needed upfront"

**what we assume:** brain/weave theory docs can be refs, not inline.

**evidence?** most tasks don't require deep thought-route theory. code tasks use mechanic briefs.

**what if opposite?** work on rhachet itself needs these constantly.

**did wisher say this?** no, this is inference.

**counterexample:** when active on BrainAtom/BrainRepl code, domain.thought briefs are essential.

**verdict:** assumption may be wrong — depends on task context ⚠️

**action:** note in vision that domain.thought/ might need say for rhachet development.

---

## assumption 4: "simple mode is sufficient"

**what we assume:** top-level briefs/skills curation is enough. no need for subject.* scopes.

**evidence?** role=any is a single role, not scoped to usecases.

**what if opposite?** could use subjects like `subject.thought-work`, `subject.test`, `subject.cli`.

**did wisher say this?** no, wisher just said "use boot.yml capacity" — didn't specify mode.

**verdict:** simple mode is reasonable first step. can evolve to subject mode if needed ✓

---

## assumption 5: "no code changes required"

**what we assume:** boot.yml is pure config, no implementation work.

**evidence?** boot.yml machinery exists and is tested (verified in computeBootPlan.ts, parseRoleBootYaml.ts).

**what if opposite?** what if globs don't work as expected for this directory structure?

**verification needed:** run test boot with actual .agent/repo=.this/role=any/briefs paths.

**verdict:** assumption likely holds but should verify with a test boot ⚠️

---

## assumption 6: "say globs auto-ref unmatched"

**what we assume:** if we specify only say globs, all unmatched briefs become refs.

**evidence?** verified in computeBootPlan.ts line 67-77:
```ts
// say: ['glob', ...] means say matched, ref unmatched
const sayMatched = await filterByGlob({ ... });
const refRefs = input.refs.filter((r) => !saySet.has(r.pathToOriginal));
return { say: sayMatched, ref: refRefs };
```

**verdict:** assumption verified in code ✓

---

## summary

| assumption | status |
|------------|--------|
| 20k tokens too many | holds (wisher stated) ✓ |
| refs sufficient for discoverability | reasonable with good say curation ⚠️ |
| domain.thought/ rarely needed | depends on task context ⚠️ |
| simple mode sufficient | reasonable first step ✓ |
| no code changes needed | likely holds, verify with test ⚠️ |
| say globs auto-ref unmatched | verified in code ✓ |

**key actions:**
1. note that domain.thought/ might need say for rhachet development tasks
2. run test boot before done
