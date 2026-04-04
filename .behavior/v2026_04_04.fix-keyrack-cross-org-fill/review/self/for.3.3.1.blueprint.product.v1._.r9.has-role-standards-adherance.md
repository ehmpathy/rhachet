# self-review r9: has-role-standards-adherance

r9 — deeper probe of mechanic standards.

---

## expanded brief directory enumeration

from `briefs/practices/`:

| directory | relevance |
|-----------|-----------|
| `code.prod/evolvable.procedures/` | function patterns |
| `code.prod/pitofsuccess.errors/` | error patterns |
| `code.prod/pitofsuccess.typedefs/` | type safety |
| `code.prod/readable.narrative/` | code flow |
| `code.test/frames.behavior/` | test structure |
| `lang.terms/` | variable names |
| `lang.tones/` | comment style |

---

## check: code.prod/pitofsuccess.errors

### rule: require-fail-fast

**blueprint code**:
```ts
const orgFromSlug = slug.split('.')[0]!;
```

**question**: should this fail-fast if org is empty?

**investigation**:
- `split('.')[0]` on empty string returns `''`
- empty org would cause incorrect storage

**answer**: no fail-fast needed here. slugs come from `repoManifest.keys` which are hydrated by manifest load. hydration validates slug format. if a malformed slug reached this point, the bug is in hydration, not here.

✓ holds — fail-fast is at the right layer (hydration).

---

## check: code.prod/readable.narrative

### rule: require-narrative-flow

**blueprint code**:
```ts
const orgFromSlug = slug.split('.')[0]!;
await setKeyrackKey({
  ...
  org: orgFromSlug,
  ...
}, contextKeyrack);
```

**question**: is the narrative clear?

**answer**: yes. one line extracts org, next line uses it. no branches, no nests.

✓ holds

---

## check: lang.terms

### rule: require-noun-adj-order

**blueprint code**: `orgFromSlug`

**check**: is this `[noun][adj]` or `[adj][noun]`?

**analysis**:
- `org` = noun
- `FromSlug` = source qualifier (prepositional phrase, not adjective)

**answer**: this is `[noun][prepositional-phrase]` which follows the pattern. compare to extant `envFromSlug` in the codebase.

✓ holds

### rule: forbid-term-xxx

**blueprint code**: no use of forbidden terms.

✓ holds

---

## check: code.test/frames.behavior

### rule: require-useBeforeAll-for-shared-resources

**blueprint test**:
```ts
const repo = useBeforeAll(async () => {
  ...
  return { path: root };
});
```

**check**: does the test use `useBeforeAll` for shared setup?

**answer**: yes.

✓ holds

### rule: forbid-redundant-expensive-operations

**blueprint test**: single `fillKeyrackKeys` call, result used for multiple assertions.

✓ holds

---

## summary

| brief directory | standards checked | status |
|-----------------|-------------------|--------|
| pitofsuccess.errors | fail-fast | ✓ at correct layer |
| readable.narrative | narrative-flow | ✓ linear |
| lang.terms | noun-adj-order | ✓ matches extant |
| code.test/frames.behavior | useBeforeAll, redundant ops | ✓ both correct |

no violations found. blueprint adheres to mechanic role standards.

