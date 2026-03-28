# self-review r1: has-questioned-assumptions

reviewed the blueprint for hidden technical assumptions.

---

## assumption 1: globs need briefs/ prefix

**what we assume:** globs must include `briefs/` prefix (e.g., `briefs/define.rhachet.v3.md`)

**evidence:** verified in prior work. globs without prefix matched 0 files; globs with prefix matched correctly.

**what if opposite?** tested and failed — globs without prefix don't match.

**code evidence:** `filterByGlob` uses `pathToOriginal` which includes the full relative path from role directory.

**verdict:** assumption holds — verified empirically ✓

---

## assumption 2: unmatched briefs become refs

**what we assume:** briefs not matched by say globs automatically become refs.

**evidence:** computeBootPlan.ts lines 74-77:
```ts
const saySet = new Set(sayMatched.map((r) => r.pathToOriginal));
const refRefs = input.refs.filter((r) => !saySet.has(r.pathToOriginal));
return { say: sayMatched, ref: refRefs };
```

**what if opposite?** the code explicitly filters unmatched into refs.

**verdict:** assumption holds — verified in code ✓

---

## assumption 3: no code changes needed

**what we assume:** the boot.yml machinery exists and works.

**evidence:**
- parseRoleBootYaml.ts parses boot.yml
- computeBootPlan.ts computes say/ref partition
- extensive test coverage in computeBootPlan.test.ts

**what if opposite?** we would need to implement the machinery. but it exists.

**could a simpler approach work?** no — add boot.yml is the simplest approach. it's pure config.

**verdict:** assumption holds — verified in code ✓

---

## assumption 4: 7 say briefs is the right number

**what we assume:** the user's selected briefs are the right ones.

**evidence:** user explicitly specified which briefs to keep in say list.

**what if opposite?** user can adjust boot.yml anytime. it's pure config.

**verdict:** user decision — not a technical assumption ✓

---

## assumption 5: skills don't need curation

**what we assume:** skills are small enough to say all.

**evidence:** vision doc states skills are ~1k tokens total. not worth curation overhead.

**what if opposite?** we would add skills.say to boot.yml. but the user didn't request this.

**verdict:** assumption holds — verified in vision ✓

---

## summary

| assumption | status | evidence |
|------------|--------|----------|
| globs need briefs/ prefix | holds | tested empirically |
| unmatched → refs | holds | verified in code |
| no code changes needed | holds | machinery exists |
| 7 say briefs is right | user decision | can adjust anytime |
| skills don't need curation | holds | too small to matter |

no hidden assumptions found. blueprint is based on verified behavior.
