# self-review r3: has-consistent-mechanisms

a third review for new mechanisms that duplicate extant functionality.

---

## step 1: the central question

does this execution introduce any new mechanisms that duplicate extant functionality?

answer: **no mechanisms were introduced.**

---

## step 2: what did the execution produce?

re-read `.agent/repo=.this/role=any/boot.yml`:

```yaml
# .agent/repo=.this/role=any/boot.yml
#
# controls which briefs are said (inline) vs reffed (pointer only).
# unmatched briefs become refs automatically.

briefs:
  say:
    # core identity - always boot these
    - briefs/define.rhachet.v3.md
    - briefs/define.agent-dir.md
    # actively used patterns
    - briefs/howto.test-local-rhachet.md
    - briefs/bin.dispatcher.pattern.md
    - briefs/run.executable.lookup.pattern.md
    # test patterns (frequently referenced)
    - briefs/code.test.accept.blackbox.md
    - briefs/rule.require.shared-test-fixtures.md
```

**this is data.** it is not code. it contains:
- yaml structure (`briefs:`, `say:`)
- string literals (paths)
- comments

---

## step 3: definition of mechanism

a mechanism is executable logic:
- a function
- a class
- a procedure
- a pattern in code
- a reusable component with behavior

boot.yml has none of these. it is pure configuration consumed by extant mechanisms.

---

## step 4: the machinery that consumes boot.yml

| file | role | modified? |
|------|------|-----------|
| `parseRoleBootYaml.ts` | parses yaml into typed object | no |
| `computeBootPlan.ts` | computes say/ref partition | no |
| `filterByGlob.ts` | matches paths against globs | no |

all machinery is extant. this execution added zero code.

---

## step 5: check for subtle mechanism duplication

### could boot.yml patterns duplicate glob patterns elsewhere?

boot.yml uses exact paths, not globs:
```yaml
- briefs/define.rhachet.v3.md
```

these are literal strings. they don't implement pattern logic. the extant `filterByGlob.ts` treats them as globs that happen to match exactly one file.

**holds:** no new pattern logic introduced.

### could the comment structure duplicate documentation patterns?

boot.yml comments explain the file:
```yaml
# controls which briefs are said (inline) vs reffed (pointer only).
```

comments are not mechanisms. they don't execute. they don't duplicate any code.

**holds:** documentation is not duplication.

### could the yaml schema duplicate another schema?

boot.yml uses the extant RoleBootYaml schema defined in `parseRoleBootYaml.ts`. it doesn't define a new schema.

**holds:** schema is reused, not duplicated.

---

## step 6: verify via git status

```
A  .agent/repo=.this/role=any/boot.yml
```

one file added. zero code files modified. zero code files added.

| file type | count |
|-----------|-------|
| yaml config | 1 |
| typescript | 0 |
| test files | 0 |

---

## step 7: why no duplication is possible

to duplicate a mechanism, you must create a mechanism first.

this execution created no mechanisms. it created one config file that is consumed by extant mechanisms.

you cannot duplicate what you did not create.

---

## summary

| check | result | evidence |
|-------|--------|----------|
| new functions | none | boot.yml is yaml, not code |
| new classes | none | boot.yml is yaml, not code |
| new procedures | none | boot.yml is yaml, not code |
| new patterns | none | exact paths, not new pattern logic |
| schema duplication | none | uses extant RoleBootYaml schema |
| code changes | zero | git status shows only boot.yml |

**verdict:** zero mechanisms introduced. zero duplication possible. the execution is pure configuration consumed by extant machinery.

---

## why this holds

the guide asks three questions:

1. "does the codebase already have a mechanism that does this?"
   - boot.yml is not a mechanism. it is input to mechanisms.

2. "do we duplicate extant utilities or patterns?"
   - no code was written. you cannot duplicate code you did not write.

3. "could we reuse an extant component instead of a new one?"
   - we did. boot.yml is consumed by extant components (`parseRoleBootYaml.ts`, `computeBootPlan.ts`).

this execution is the ideal case for this review: **config-only change, zero code, full reuse of extant machinery.**
