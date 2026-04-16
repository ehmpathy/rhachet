# self-review: has-role-standards-adherance (round 11)

## question

does the blueprint adhere to mechanic role standards?

## methodology

1. enumerate rule directories from mechanic briefs
2. check blueprint against each relevant rule category
3. flag violations and fix them

---

## rule directories enumerated

```
.agent/repo=ehmpathy/role=mechanic/briefs/practices/
├── code.prod/
│   ├── consistent.artifacts
│   ├── consistent.contracts
│   ├── evolvable.architecture
│   ├── evolvable.domain.objects
│   ├── evolvable.domain.operations
│   ├── evolvable.procedures
│   ├── evolvable.repo.structure
│   ├── pitofsuccess.errors
│   ├── pitofsuccess.procedures
│   ├── pitofsuccess.typedefs
│   ├── readable.comments
│   ├── readable.narrative
│   └── readable.persistence
├── code.test/
│   ├── consistent.contracts
│   ├── frames.behavior
│   ├── frames.caselist
│   ├── lessons.howto
│   ├── pitofsuccess.errors
│   ├── scope.acceptance
│   ├── scope.coverage
│   └── scope.unit
├── lang.terms/
├── lang.tones/
└── work.flow/
```

---

## code.prod adherence

### evolvable.domain.operations

**rule.require.get-set-gen-verbs:**
- `findRolesWithBootableButNoHook` — uses `find*` prefix
- `assertRegistryBootHooksDeclared` — uses `assert*` prefix

**why this holds:** neither is a get/set/gen operation. `find*` returns filtered results. `assert*` validates state. these are transformer operations, not dao operations. the rule applies to get/set/gen, not to find/assert.

**rule.require.sync-filename-opname:**
- `findRolesWithBootableButNoHook.ts` matches function name ✓
- `assertRegistryBootHooksDeclared.ts` matches function name ✓

**why this holds:** file names match exported function names exactly.

### evolvable.procedures

**rule.require.input-context-pattern:**
- `findRolesWithBootableButNoHook({ registry })` — uses input object ✓
- `assertRegistryBootHooksDeclared({ registry })` — uses input object ✓

**why this holds:** both use the `(input: { ... })` pattern, not positional args.

**rule.forbid.io-as-domain-objects:**
- RoleBootHookViolation is inline type, not domain object ✓

**why this holds:** the type is declared inline in the function file as return shape, not extracted to domain.objects.

**rule.require.single-responsibility:**
- `findRolesWithBootableButNoHook` — finds violations only
- `assertRegistryBootHooksDeclared` — asserts and throws only

**why this holds:** each function has one responsibility. find does not throw. assert composes find + throw.

### pitofsuccess.errors

**rule.require.failfast:**
- `assertRegistryBootHooksDeclared` throws `BadRequestError` immediately ✓

**why this holds:** no silent failure. invalid state triggers immediate throw.

**rule.require.failloud:**
- error message includes role slug (what failed)
- error message includes hint (how to fix)
- error message includes why (explanation)

**why this holds:** BadRequestError with turtle vibes treestruct is the most verbose error pattern we have.

### readable.narrative

**rule.forbid.inline-decode-friction:**
- `hasBriefsDirs = role.briefs?.dirs !== undefined` — simple property check ✓
- `hasSkillsDirs = role.skills?.dirs !== undefined` — simple property check ✓
- `hasBootableContent = hasBriefsDirs || hasSkillsDirs` — named variables ✓

**why this holds:** each check is extracted to a named variable. no inline decode friction in the orchestrator.

### evolvable.repo.structure

**rule.require.directional-deps:**
- domain.operations/manifest/ does not import from contract/ ✓
- contract/cli imports from domain.operations/ ✓

**why this holds:** deps flow downward. contract calls domain, not reverse.

---

## code.test adherence

### scope.coverage

**rule.require.test-coverage-by-grain:**
- transformer (findRolesWithBootableButNoHook) → unit test ✓
- transformer (assertRegistryBootHooksDeclared) → unit test ✓
- contract (repo introspect CLI) → acceptance test ✓

**why this holds:** blueprint assigns correct test type to each layer per grain.

### frames.behavior

**rule.require.given-when-then:**
- blueprint test cases use given/when/then structure ✓

**why this holds:** all test cases in blueprint tables follow the pattern (given X, when Y, then Z).

### scope.acceptance

**rule.require.blackbox:**
- acceptance tests invoke CLI subprocess ✓
- no internal imports in acceptance tests ✓

**why this holds:** acceptance test tree shows `repo.introspect.acceptance.test.ts` in `blackbox/cli/`.

---

## lang.terms adherence

**rule.forbid.gerunds:**

checked all names in blueprint:
- `findRolesWithBootableButNoHook` — no gerunds ✓
- `assertRegistryBootHooksDeclared` — no gerunds ✓
- `RoleBootHookViolation` — no gerunds ✓
- `hasBriefsDirs` — no gerunds ✓
- `hasSkillsDirs` — no gerunds ✓
- `hasBootableContent` — no gerunds ✓
- `hasOnBootHook` — no gerunds ✓

**why this holds:** all names use nouns, adjectives, or past participles. no -ing suffixes.

**rule.require.treestruct:**
- function names: `[verb][Target]` or `[assert][Scope][Subject][Predicate]` ✓
- type names: `[Domain][Noun]` ✓

**why this holds:** names follow treestruct patterns established in r10 convention review.

---

## lang.tones adherence

**rule.im_an.ehmpathy_seaturtle:**
- error format uses turtle vibes: `🐢 bummer dude...` ✓
- treestruct format for error output ✓

**why this holds:** blueprint error format section matches turtle vibes pattern.

---

## deviations found

none. blueprint adheres to all mechanic role standards.

---

## summary

| category | rules checked | adhered |
|----------|---------------|---------|
| code.prod/evolvable.domain.operations | 2 | 2/2 |
| code.prod/evolvable.procedures | 3 | 3/3 |
| code.prod/pitofsuccess.errors | 2 | 2/2 |
| code.prod/readable.narrative | 1 | 1/1 |
| code.prod/evolvable.repo.structure | 1 | 1/1 |
| code.test/scope.coverage | 1 | 1/1 |
| code.test/frames.behavior | 1 | 1/1 |
| code.test/scope.acceptance | 1 | 1/1 |
| lang.terms | 2 | 2/2 |
| lang.tones | 1 | 1/1 |

all mechanic standards satisfied.

**verdict:** **pass** — blueprint adheres to role standards

