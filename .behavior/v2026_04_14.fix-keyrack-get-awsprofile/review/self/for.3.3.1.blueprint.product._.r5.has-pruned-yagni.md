# self-review r5: has-pruned-yagni

YAGNI = "you ain't gonna need it"

---

## the wish

from `0.wish.md`:

> keyrack is set AWS_PROFILE to a JSON string containing credentials instead of the profile name "ehmpathy.demo".
>
> it should just set AWS_PROFILE

**the request:**
1. fix the bug where AWS_PROFILE contains JSON credentials
2. AWS_PROFILE should contain the profile name

---

## blueprint components

### component 1: remove mech.deliverForGet() call

**question:** was this explicitly requested?

**answer:** yes — this IS the fix. the wish says "it should just set AWS_PROFILE" to the profile name. the bug is caused by the mech call that transforms the profile name into JSON credentials. removal of this call is what delivers the wish.

**question:** is this the minimum viable way?

**answer:** yes — the fix deletes 6 lines. no code is added. there is no simpler fix.

**question:** did we add abstraction "for future flexibility"?

**answer:** no — we delete code, we do not add abstractions.

**question:** did we add features "while we're here"?

**answer:** no — the change is scoped to the bug. no adjacent code is touched.

**question:** did we optimize before we knew it was needed?

**answer:** no — this is a bug fix, not an optimization.

**verdict:** no YAGNI violation. component is minimal and directly delivers the wish.

---

### component 2: new test case for get() with mech

**question:** was this explicitly requested by the wisher?

**answer:** no — the wisher did not mention tests.

**question:** is the test a YAGNI violation?

**answer:** no — per the blueprint stone guidance, test coverage is "a MANDATORY requirement, equal weight to implementation." a blueprint without test coverage is incomplete. this is not a "nice to have" — it is a hard requirement.

**question:** is this the minimum viable test?

**answer:** yes — one test case, one assertion:
```ts
expect(result).toEqual('acme-prod');
```

the test covers exactly the buggy path (get() with mech supplied) that was previously untested.

**question:** did we add extra test cases "while we're here"?

**answer:** no — we add exactly one test case for the bug path. the other test cases are preserved without change.

**verdict:** no YAGNI violation. test is mandatory per blueprint stone guidance and is minimal.

---

## extras check

| component | requested? | minimum? | extras? |
|-----------|------------|----------|---------|
| remove mech call | yes (the fix) | yes (deletion) | none |
| new test case | mandatory | yes (one case) | none |

---

## what we could have added but did not

a YAGNI review should examine what extras were considered but resisted.

### considered 1: add a config flag to toggle mech behavior

**the idea:** add `{ skipMechTransform: true }` option to `get()` for flexibility.

**why we resisted:** the wish is clear — AWS_PROFILE should contain the profile name, period. a config flag would:
- add complexity for a single-use case
- create decision points for callers
- imply the JSON behavior is sometimes wanted (it is not)

the mech.deliverForGet() call is simply wrong for this vault type. we delete it, not parameterize it.

### considered 2: add validation for profile name format

**the idea:** validate that exid looks like a valid AWS profile name.

**why we resisted:**
- the wish does not mention validation
- the profile name comes from the host manifest, which was set by the user
- validation would be a new feature, not a bug fix
- if validation is needed, it belongs in `set()`, not `get()`

### considered 3: add log statements for diagnostic purposes

**the idea:** add `log.debug('return profile name', { exid })` for future debug.

**why we resisted:**
- the wish does not mention observability
- if we add log here, why not in every vault adapter?
- keep the fix minimal — log can be added later if needed

### considered 4: refactor adjacent vaults for consistency

**the idea:** review other vault adapters and ensure they follow the same pattern.

**why we resisted:**
- the wish is about aws.config vault only
- other vaults may have different requirements
- "while we're here" refactors are YAGNI violations
- if other vaults need fixes, they get their own wishes

### considered 5: add multiple test cases for completeness

**the idea:** add edge case tests: empty string exid, undefined mech, various mech types.

**why we resisted:**
- one test case covers the bug: mech supplied → exid returned
- empty exid is covered by the prior test `[t0] get called with exid`
- undefined mech is covered by the prior test `[t0] get called with exid`
- test for various mech types is not relevant — the fix ignores the mech entirely

---

## why it holds

**no YAGNI violations found.** articulation:

1. **the fix is a deletion** — we cannot add extras when we delete code. 6 lines removed, 0 lines added. deletion is the opposite of YAGNI — we remove code that should not exist.

2. **the test is mandatory** — per blueprint stone guidance, "test coverage is a MANDATORY requirement, equal weight to implementation." a blueprint without test coverage is incomplete. this is not "nice to have" — it is a hard requirement of the stone.

3. **one test case for the bug** — we do not add extra test cases for edge cases that were not part of the bug. we test only the specific path (mech supplied) that exhibited the bug. the prior tests already cover other paths.

4. **no config flags** — we do not parameterize behavior that should be fixed. the mech call is wrong for this vault, not optionally wrong.

5. **no validation** — we do not add input validation that was not requested. validation is a feature, not a bug fix.

6. **no log statements** — we do not add observability that was not requested. log is a feature, not a bug fix.

7. **no refactors** — we do not refactor adjacent code "while we're here." each vault adapter stands alone. if another vault has a bug, it gets its own wish.

8. **no abstractions** — we do not add utilities, operations, or patterns "for future flexibility." the future can add them when needed.

the blueprint is already pruned. every component traces to the wish. there are no extras to remove.
