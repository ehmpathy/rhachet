# self-review r5: has-consistent-mechanisms

reviewed the blueprint for new mechanisms that duplicate extant functionality.

---

## step 1: search for related codepaths

the blueprint proposes a boot.yml file. searched for extant boot-related mechanisms:

| mechanism | file | purpose |
|-----------|------|---------|
| parseRoleBootYaml | src/domain.operations/boot/parseRoleBootYaml.ts | parses boot.yml to typed config |
| computeBootPlan | src/domain.operations/boot/computeBootPlan.ts | computes say/ref partition |
| computeBriefRefPlan | src/domain.operations/boot/computeBriefRefPlan.ts | applies globs to brief refs |
| filterByGlob | src/domain.operations/boot/filterByGlob.ts | matches paths against globs |
| getRoleBriefRefs | src/domain.operations/boot/getRoleBriefRefs.ts | discovers brief paths |
| renderBootOutput | src/domain.operations/boot/renderBootOutput.ts | renders boot stats |

these mechanisms already exist and handle the full boot.yml lifecycle.

---

## step 2: examine what blueprint proposes

the blueprint proposes:

| component | type | mechanism? |
|-----------|------|-----------|
| boot.yml file | config data | no |
| say globs | string array | no |
| header comments | documentation | no |

**zero new mechanisms.** the blueprint is pure data consumed by extant machinery.

---

## step 3: check each new mechanism

since there are zero new mechanisms, this step is vacuous. however, let me verify by re-read of the blueprint:

from `3.3.1.blueprint.product.v1.i1.md`:

> ## codepath tree
>
> ```
> roles boot
> ├─ [○] getRoleBriefRefs         # collect all brief paths
> ├─ [○] parseRoleBootYaml        # parse boot.yml (now has content)
> ├─ [○] computeBootPlan          # compute say/ref partition
> │  ├─ [○] computeBriefRefPlan   # apply say globs to briefs
> │  └─ [○] filterByGlob          # match paths against globs
> └─ [○] renderBootOutput         # output say/ref stats
> ```
>
> all codepaths are [○] retain. no modifications.

verified: the blueprint explicitly states all codepaths are `[○] retain` — no new code.

---

## step 4: could we reuse instead of create?

| question | answer | evidence |
|----------|--------|----------|
| does codebase already have config parser? | yes | parseRoleBootYaml.ts |
| does codebase already have glob match? | yes | filterByGlob.ts |
| does codebase already have say/ref partition? | yes | computeBootPlan.ts |
| do we duplicate any of these? | no | zero code changes |
| do we create new versions? | no | zero code changes |

the answer to all duplication questions is "no" because we add zero code.

---

## step 5: why no mechanisms are needed

the boot.yml machinery was designed for exactly this use case:

1. **declarative config** — boot.yml is pure data, no logic
2. **extant parser** — parseRoleBootYaml.ts handles all yaml parse operations
3. **extant glob engine** — filterByGlob.ts handles all glob matches
4. **extant partition logic** — computeBootPlan.ts handles say/ref split

the wish is fulfilled by config alone because the machinery was pre-built.

---

## step 6: verify no hidden mechanisms

checked the boot.yml content proposed:

```yaml
briefs:
  say:
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
    - briefs/howto.test-local-rhachet.md
    - briefs/bin.dispatcher.pattern.md
    - briefs/run.executable.lookup.pattern.md
    - briefs/code.test.accept.blackbox.md
    - briefs/rule.require.shared-test-fixtures.md
```

this is:
- 7 string values
- wrapped in yaml structure
- consumed by extant parser

no custom logic. no transformations. no computed values. pure data.

---

## summary

| review item | status | reason |
|-------------|--------|--------|
| new mechanisms added | zero | blueprint is pure config |
| extant mechanisms reused | all | parseRoleBootYaml, computeBootPlan, filterByGlob |
| duplication of extant code | none | zero code changes |
| new utilities created | none | zero code changes |
| new patterns introduced | none | zero code changes |

**verdict:** consistent mechanisms. the blueprint reuses all extant machinery and introduces zero new mechanisms.

the machinery was designed for this. we just use it.
