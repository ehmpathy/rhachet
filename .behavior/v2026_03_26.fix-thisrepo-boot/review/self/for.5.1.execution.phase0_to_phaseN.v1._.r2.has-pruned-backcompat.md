# self-review r2: has-pruned-backcompat

a deeper review for backwards compatibility that was not explicitly requested.

---

## step 1: re-read the artifacts

opened and read:
- `0.wish.md` — the original request
- `5.1.execution.phase0_to_phaseN.v1.i1.md` — what was executed
- `.agent/repo=.this/role=any/boot.yml` — the artifact created

---

## step 2: what does the wish say about backwards compatibility?

from `0.wish.md`:

```
wish =

the briefs booted from .agent/repo=.this/role=any/briefs are too large

we should use the boot.yml capacity and drop a boot.yml in that role

so that we can control which ones are said vs reffed

not all of them need to be said, refs are often times more than sufficient!
```

**explicit statements about backcompat:** none.

the wish does not say:
- "maintain the old behavior"
- "allow fallback to say-all"
- "support both modes"
- "gradual migration"
- "deprecation period"

**the wish is a change request.** it explicitly asks to move from "all briefs say" to "controlled say/ref". this is a deliberate behavior change, not a concern for backwards-compatibility.

---

## step 3: what does the memory say about backwards compatibility?

from `feedback_zero_backcompat.md`:

> "never add backwards compat, just delete"

**this is explicit guidance from the wisher.** the wisher has previously told me: do not add backwards compatibility. just make the change.

---

## step 4: line-by-line backcompat check of boot.yml

opened `.agent/repo=.this/role=any/boot.yml`:

```yaml
     1→# .agent/repo=.this/role=any/boot.yml
     2→#
     3→# controls which briefs are said (inline) vs reffed (pointer only).
     4→# unmatched briefs become refs automatically.
     5→
     6→briefs:
     7→  say:
     8→    # core identity - always boot these
     9→    - briefs/define.rhachet.v3.md
    10→    - briefs/define.agent-dir.md
    11→    # actively used patterns
    12→    - briefs/howto.test-local-rhachet.md
    13→    - briefs/bin.dispatcher.pattern.md
    14→    - briefs/run.executable.lookup.pattern.md
    15→    # test patterns (frequently referenced)
    16→    - briefs/code.test.accept.blackbox.md
    17→    - briefs/rule.require.shared-test-fixtures.md
```

**backcompat check for each line:**

| line | content | backcompat concern? | analysis |
|------|---------|---------------------|----------|
| 1 | path comment | no | standard documentation |
| 2 | blank comment | no | visual separator |
| 3 | behavior comment | no | explains new behavior, does not preserve old |
| 4 | default comment | no | explains unmatched → ref, does not say "or fall back to say" |
| 5 | blank | no | yaml structure |
| 6 | `briefs:` | no | schema key, not backcompat shim |
| 7 | `say:` | no | explicit say list, not "say all by default" |
| 8 | section comment | no | groups briefs, not backcompat |
| 9 | path | no | exact path, not wildcard fallback |
| 10 | path | no | exact path, not wildcard fallback |
| 11 | section comment | no | groups briefs, not backcompat |
| 12 | path | no | exact path, not wildcard fallback |
| 13 | path | no | exact path, not wildcard fallback |
| 14 | path | no | exact path, not wildcard fallback |
| 15 | section comment | no | groups briefs, not backcompat |
| 16 | path | no | exact path, not wildcard fallback |
| 17 | path | no | exact path, not wildcard fallback |

**result:** 0/17 lines contain backwards compatibility shims.

---

## step 5: check for implicit backcompat patterns

### pattern 1: "say all if boot.yml is empty"

**is this present?** no.

if boot.yml had:
```yaml
briefs:
  say: []
```

the machinery would ref all briefs. this is correct new behavior, not backcompat.

**why this holds:** an empty say array means "say none, ref all". this is explicit intent, not a fallback to old behavior.

### pattern 2: "say all if boot.yml is absent"

**is this present?** no — this is extant machinery behavior, not an addition we made.

the extant `computeBootPlan.ts` already had this behavior before this execution. we did not add it as backcompat; it was already there.

**why this holds:** we are not responsible for extant machinery behavior. we only added a boot.yml file.

### pattern 3: "environment variable to disable boot.yml"

**is this present?** no.

there is no:
- `RHACHET_DISABLE_BOOT_YML`
- `BOOT_YML_ENABLED=false`
- `SAY_ALL_BRIEFS=true`

**why this holds:** the wisher's memory says "never add backwards compat". an env var to restore old behavior would be backcompat.

### pattern 4: "config flag to say all"

**is this present?** no.

boot.yml does not have:
```yaml
mode: say-all  # backcompat mode
```

or:
```yaml
legacy: true  # use old behavior
```

**why this holds:** a config flag to say all would be backcompat. we did not add it.

### pattern 5: "gradual migration via percentage"

**is this present?** no.

there is no:
```yaml
rollout:
  say_percentage: 50  # 50% say, 50% ref in migration
```

**why this holds:** gradual migration would be backcompat infrastructure. we did not add it.

---

## step 6: check the execution log

from `5.1.execution.phase0_to_phaseN.v1.i1.md`:

```markdown
## phase 0: verify boot.yml created

- [x] boot.yml created at `.agent/repo=.this/role=any/boot.yml`
- [x] content matches blueprint exactly (17 lines)
- [x] 7 briefs in say array
- [x] comments explain behavior
```

**backcompat check:**

| item | backcompat? | why |
|------|-------------|-----|
| "boot.yml created" | no | new file, not backcompat shim |
| "content matches blueprint" | no | exact content, not fallback |
| "7 briefs in say array" | no | explicit list, not say-all |
| "comments explain behavior" | no | documentation, not migration guide |

```markdown
## phase 1: verify boot behavior

- [x] session boot shows say=7, ref=12
- [x] token count reduced (~8k instead of ~20k)
- [x] say briefs appear inline in boot output
- [x] ref briefs appear as `<brief.ref path="..."/>`
```

**backcompat check:**

| item | backcompat? | why |
|------|-------------|-----|
| "say=7, ref=12" | no | new behavior, not old + new |
| "token count reduced" | no | this is the goal, not backcompat |
| "say briefs inline" | no | new behavior |
| "ref briefs as refs" | no | new behavior |

**result:** execution log contains 0 backcompat items.

---

## step 7: articulate why no backcompat is correct

### why not add "say all if boot.yml absent"?

we did not add this because:
1. it already exists in the machinery
2. we are not responsible for extant behavior
3. the wish asks for a new boot.yml, not machinery changes

### why not add "env var to disable"?

we did not add this because:
1. the wisher's memory says "never add backwards compat"
2. the wish is a change request, not a feature flag request
3. an env var would add complexity for no benefit

### why not add "migration period"?

we did not add this because:
1. the wisher did not request it
2. this is a single repo, not a distributed system
3. the change is immediate and intentional

### why not add "deprecation warnings"?

we did not add this because:
1. there is no deprecated behavior — just a new config file
2. warnings would imply the old behavior is wrong; it's not, it's just unconfigured
3. the wisher did not ask for warnings

---

## summary

| backcompat pattern | present? | evidence |
|--------------------|----------|----------|
| say-all fallback | no | boot.yml uses explicit say list |
| env var disable | no | no env vars added |
| config flag | no | no mode or legacy flags |
| gradual rollout | no | no percentage-based logic |
| migration period | no | immediate change |
| deprecation warnings | no | no warnings added |
| execution log mentions | none | 0/8 items are backcompat |
| memory guidance | followed | "never add backwards compat" |

**verdict:** zero backwards compatibility shims found. the execution follows the wisher's explicit guidance: "never add backwards compat, just delete." the change is clean, direct, and intentional.

---

## why this holds

the wish is a change request. it asks to move from "all briefs say" to "controlled say/ref". this is not a situation where backwards compatibility makes sense:

1. **single repo:** this boot.yml affects only `.agent/repo=.this/role=any/`. no other repos or roles are affected.

2. **explicit intent:** the wisher explicitly asked for this change. there is no ambiguity about whether the old behavior should be preserved.

3. **memory guidance:** the wisher has previously said "never add backwards compat, just delete." this execution follows that guidance.

4. **no consumers:** there are no external consumers of this role's boot behavior. the only "consumer" is the wisher's own sessions.

5. **reversible:** if the wisher wants the old behavior back, they can delete boot.yml. no backcompat shim needed.

the execution is correct. zero backcompat is the right answer.
