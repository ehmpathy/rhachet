# self-review: has-role-standards-adherance (round 12)

## question

does the blueprint adhere to mechanic role standards?

## methodology

1. enumerate rule directories from mechanic briefs
2. read blueprint code patterns line by line
3. compare each pattern to relevant mechanic rules
4. flag violations and fix them

---

## rule directories enumerated

```
.agent/repo=ehmpathy/role=mechanic/briefs/practices/
├── code.prod/
│   ├── evolvable.domain.operations/
│   │   ├── rule.require.get-set-gen-verbs
│   │   └── rule.require.sync-filename-opname
│   ├── evolvable.procedures/
│   │   ├── rule.require.input-context-pattern
│   │   ├── rule.forbid.io-as-domain-objects
│   │   └── rule.require.single-responsibility
│   ├── pitofsuccess.errors/
│   │   ├── rule.require.failfast
│   │   └── rule.require.failloud
│   └── readable.narrative/
│       └── rule.forbid.inline-decode-friction
├── code.test/
│   ├── scope.coverage/
│   │   └── rule.require.test-coverage-by-grain
│   └── frames.behavior/
│       └── rule.require.given-when-then
└── lang.terms/
    ├── rule.forbid.gerunds
    └── rule.require.treestruct
```

---

## line-by-line code pattern review

### blueprint lines 47-65: findRolesWithBootableButNoHook

```
findRolesWithBootableButNoHook
├── input: { registry: RoleRegistry }
├── output: RoleBootHookViolation[]
│
├── [+] iterate registry.roles
│   ├── [+] check hasBootableContent(role)
│   │   ├── [+] hasBriefsDirs = role.briefs?.dirs !== undefined
│   │   ├── [+] hasSkillsDirs = role.skills?.dirs !== undefined
│   │   └── [+] hasBootableContent = hasBriefsDirs || hasSkillsDirs
```

**rule.require.input-context-pattern check:**

blueprint shows `input: { registry: RoleRegistry }` — this is the correct `(input: { ... })` pattern, not positional args.

**why this holds:** the rule says "functions accept one input arg (object)". blueprint conforms.

**rule.forbid.inline-decode-friction check:**

blueprint extracts each check to a named variable:
- `hasBriefsDirs = role.briefs?.dirs !== undefined`
- `hasSkillsDirs = role.skills?.dirs !== undefined`
- `hasBootableContent = hasBriefsDirs || hasSkillsDirs`

**why this holds:** the rule says "do i have to decode this to understand what it produces?" — no. each boolean is named. `role.briefs?.dirs !== undefined` is simple property access, not a pipeline or reduce.

**rule.require.single-responsibility check:**

`findRolesWithBootableButNoHook` only:
1. iterates roles
2. checks conditions
3. collects violations

it does NOT throw. it does NOT build error messages.

**why this holds:** the rule says "each file exports exactly one named procedure" with one responsibility. find returns data, assert acts on it.

---

### blueprint lines 69-85: assertRegistryBootHooksDeclared

```
assertRegistryBootHooksDeclared
├── input: { registry: RoleRegistry }
├── output: void (throws BadRequestError if violations)
│
├── [+] call findRolesWithBootableButNoHook({ registry })
├── [+] if violations.length === 0, return early
│
├── [+] build error message
│   ├── [+] header: "roles with bootable content but no boot hook"
│   ├── [+] treestruct list of affected roles
│   │   ├── role slug
│   │   ├── "has:" briefs.dirs and/or skills.dirs
│   │   └── "hint:" add hooks.onBrain.onBoot
│   └── [+] why explanation
│
└── [+] throw BadRequestError(message, { violations })
```

**rule.require.failfast check:**

blueprint shows `throw BadRequestError(message, { violations })` — immediate throw on invalid state.

**why this holds:** the rule says "enforce early exits and helpfulerror subclasses for invalid state". BadRequestError is a HelpfulError subclass. throw happens as soon as violations detected.

**rule.require.failloud check:**

error message includes:
- **what failed:** role slug in treestruct
- **why it failed:** "why:" explanation block
- **how to fix:** "hint:" line per role

**why this holds:** the rule says "include context objects in thrown errors for debug". blueprint includes `{ violations }` in error metadata.

---

### blueprint lines 182-189: implementation notes on bootable detection

```ts
// correct: check if property is declared (any value, empty array too)
const hasBriefsDirs = role.briefs?.dirs !== undefined;
const hasSkillsDirs = role.skills?.dirs !== undefined;

// incorrect: would miss empty array case
const hasBriefsDirs = extractDirUris(role.briefs.dirs).length > 0;
```

**rule.forbid.inline-decode-friction check:**

the "correct" pattern uses simple property access. the "incorrect" pattern would be decode friction (`extractDirUris(...).length > 0`).

**why this holds:** blueprint explicitly rejects the decode-friction approach.

---

### blueprint lines 196-200: RoleBootHookViolation type

```ts
interface RoleBootHookViolation {
  roleSlug: string;
  hasBriefsDirs: boolean;
  hasSkillsDirs: boolean;
}
```

**rule.forbid.io-as-domain-objects check:**

blueprint note says: "inline in findRolesWithBootableButNoHook.ts (not a domain object, just return shape)."

**why this holds:** the rule says "declare input types inline" and "forbid domain objects for procedure inputs and outputs". blueprint uses inline interface, not a DomainLiteral.

---

### blueprint test coverage table (lines 104-109)

| layer | codepath | test type | rationale |
|-------|----------|-----------|-----------|
| transformer | findRolesWithBootableButNoHook | unit | pure computation, no i/o |
| transformer | assertRegistryBootHooksDeclared | unit | pure computation (error construction) |
| contract | repo introspect CLI | acceptance | blackbox cli verification |

**rule.require.test-coverage-by-grain check:**

- transformer → unit test ✓
- contract → acceptance test ✓

**why this holds:** the rule says "transformers are pure — unit tests verify logic without mocks" and "contracts face humans — acceptance tests + snapshots catch regressions".

---

## gerund check on all names

| name | contains gerund? |
|------|------------------|
| findRolesWithBootableButNoHook | no |
| assertRegistryBootHooksDeclared | no |
| RoleBootHookViolation | no |
| hasBriefsDirs | no |
| hasSkillsDirs | no |
| hasBootableContent | no |
| hasOnBootHook | no |

**why this holds:** all names use nouns, adjectives, verbs, or past participles. no -ing suffixes that would be gerunds.

---

## treestruct name check

**rule.require.treestruct pattern:** `[verb][...noun]` for mechanisms

| name | structure | valid? |
|------|-----------|--------|
| findRolesWithBootableButNoHook | find + Roles + With + Bootable + But + No + Hook | ✓ verb leads |
| assertRegistryBootHooksDeclared | assert + Registry + BootHooks + Declared | ✓ verb leads |

**why this holds:** both names lead with verb (find, assert) followed by noun hierarchy.

---

## deviations found

none. all blueprint patterns match mechanic role standards.

---

## summary

| category | rule | blueprint line | status |
|----------|------|----------------|--------|
| evolvable.procedures | input-context-pattern | 48, 70 | ✓ holds |
| evolvable.procedures | single-responsibility | 47-65, 69-85 | ✓ holds |
| evolvable.procedures | forbid-io-as-domain-objects | 196-200 | ✓ holds |
| pitofsuccess.errors | failfast | 84 | ✓ holds |
| pitofsuccess.errors | failloud | 76-83 | ✓ holds |
| readable.narrative | forbid-inline-decode-friction | 53-55 | ✓ holds |
| scope.coverage | test-coverage-by-grain | 104-109 | ✓ holds |
| lang.terms | forbid-gerunds | all names | ✓ holds |
| lang.terms | require-treestruct | all names | ✓ holds |

**verdict:** **pass** — blueprint adheres to mechanic role standards

