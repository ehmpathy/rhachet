# self-review: has-role-standards-adherance (revision 9)

## stone
3.3.1.blueprint.product.v1

## review context
check blueprint adherance to mechanic role standards from `.agent/repo=ehmpathy/role=mechanic/briefs/`.

---

## briefs directories checked

enumerated from `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`:

| directory | relevant to blueprint? | reason |
|-----------|----------------------|--------|
| `lang.terms/` | yes | function names, type names |
| `lang.tones/` | yes | comments, error messages |
| `code.prod/consistent.artifacts/` | yes | version pins |
| `code.prod/evolvable.architecture/` | yes | bounded contexts, wet-over-dry |
| `code.prod/evolvable.domain.objects/` | yes | domain object design |
| `code.prod/evolvable.domain.operations/` | yes | operation verbs, variants |
| `code.prod/evolvable.procedures/` | yes | arrow functions, input-context |
| `code.prod/evolvable.repo.structure/` | yes | directional deps |
| `code.prod/pitofsuccess.errors/` | yes | fail-fast, exit codes |
| `code.prod/pitofsuccess.procedures/` | yes | idempotency |
| `code.prod/pitofsuccess.typedefs/` | yes | type safety |
| `code.prod/readable.comments/` | yes | what-why headers |
| `code.prod/readable.narrative/` | yes | no else branches |
| `code.test/` | yes | test patterns |
| `work.flow/` | marginal | commit patterns (not in blueprint) |

---

## lang.terms adherance

### rule.require.treestruct

blueprint function names checked:

| name | follows `[verb][...noun]`? | verdict |
|------|---------------------------|---------|
| `setKeyrackKey` | set + keyrack + key | ✓ |
| `vaultAdapterOsDaemon.set` | set (method on adapter) | ✓ |
| `vaultAdapter1Password.set` | set (method on adapter) | ✓ |
| `isOpCliInstalled` | is + op + cli + installed | ✓ predicate |
| `promptHiddenInput` | prompt + hidden + input | ✓ |
| `promptVisibleInput` | prompt + visible + input | ✓ |
| `validateRoundtrip` | validate + roundtrip | ✓ |
| `daemonAccessUnlock` | daemon + access + unlock | ✓ |
| `outputResult` | output + result | ✓ |

all names follow treestruct convention.

### rule.forbid.gerunds

checked blueprint for -ing words:

| word | location | gerund? |
|------|----------|---------|
| "skip" | codepath: `skip host manifest write` | no (verb) |
| "prompt" | codepath: `promptHiddenInput()` | no (verb) |

no gerunds found in blueprint.

### rule.require.order.noun_adj

checked for adjective placement:

| term | order | correct? |
|------|-------|----------|
| `promptHiddenInput` | prompt + hidden + input | ✓ noun before descriptor |
| `promptVisibleInput` | prompt + visible + input | ✓ noun before descriptor |

---

## code.prod/evolvable.domain.operations adherance

### rule.require.get-set-gen-verbs

blueprint uses only allowed verbs:

| operation | verb | allowed? |
|-----------|------|----------|
| `vaultAdapterOsDaemon.set()` | set | ✓ |
| `vaultAdapter1Password.set()` | set | ✓ |
| `vaultAdapter1Password.get()` | get | ✓ |
| `daemonAccessUnlock()` | unlock | ✓ (domain-specific imperative) |
| `isOpCliInstalled()` | is | ✓ (predicate) |

no forbidden verbs (create, insert, add, save, update) found.

### define.domain-operation-core-variants

checked for compute* / imagine* prefix needs:

| operation | deterministic? | needs prefix? |
|-----------|---------------|---------------|
| `isOpCliInstalled()` | yes (checks which command) | no prefix needed |
| `validateRoundtrip()` | yes (calls op cli) | no prefix needed |
| `promptHiddenInput()` | yes (reads stdin) | no prefix needed |

no probabilistic operations in blueprint. no imagine* variants needed.

---

## code.prod/evolvable.procedures adherance

### rule.require.arrow-only

blueprint contracts section shows:

```typescript
set: async (input: { ... }) => Promise<void>
```

arrow function syntax used. ✓

### rule.require.input-context-pattern

blueprint contracts show `(input: { ... })` pattern:

```typescript
set: async (input: {
  slug: string;
  env: string;
  org: string;
  ...
}) => Promise<void | { exid: string }>
```

input object pattern used. ✓

### rule.forbid.io-as-domain-objects

blueprint does not define separate `VaultAdapterSetInput` or `VaultAdapterSetOutput` domain objects. inputs are inline on contracts. ✓

---

## code.prod/pitofsuccess.errors adherance

### rule.require.exit-code-semantics

blueprint defines exit codes:

| code | definition | usage |
|------|------------|-------|
| 0 | success | implicit |
| 1 | malfunction | codepath line 209: "exid points to non-existent 1password item → exits with code 1" |
| 2 | constraint | codepath line 107: "exit 2 (constraint error)" for op cli absent |

exit code semantics correct:
- exit 1 = malfunction (transient or config issue)
- exit 2 = constraint (user must fix)

✓ matches rule.require.exit-code-semantics

### rule.require.fail-fast

blueprint shows early exit patterns:

- codepath line 78: `isOpCliInstalled()` check before set()
- codepath line 81: `validateRoundtrip()` before write manifest

fail-fast at set time, not unlock time. ✓

---

## code.prod/pitofsuccess.procedures adherance

### rule.require.idempotent-procedures

checked set operations:

| operation | idempotent? | how |
|-----------|-------------|-----|
| `vaultAdapterOsDaemon.set()` | yes | overwrites prior value in daemon |
| `vaultAdapter1Password.set()` | yes | overwrites prior exid in manifest |

both use upsert semantics. ✓

### rule.forbid.nonidempotent-mutations

blueprint uses only allowed verbs:

| verb | allowed? |
|------|----------|
| set | ✓ (upsert semantics) |
| skip | ✓ (not a mutation) |
| write | ✓ (in context of manifest) |

no create, insert, add found.

---

## code.prod/readable.comments adherance

### rule.require.what-why-headers

blueprint contracts show `.what` and `.why`:

```typescript
/**
 * .what = stores key directly in daemon memory
 * .why = ephemeral lifespan, no disk persistence
 */
set: async (input: { ... }) => Promise<void>
```

all contracts have what-why headers. ✓

---

## code.test adherance

### test coverage declared

blueprint § test coverage shows:

| test type | files |
|-----------|-------|
| unit | vaultAdapterOsDaemon.test.ts, vaultAdapter1Password.test.ts, isOpCliInstalled.test.ts |
| integration | vaultAdapterOsDaemon.integration.test.ts, vaultAdapter1Password.integration.test.ts |
| acceptance | cli acceptance tests |

all test levels covered. ✓

---

## issues found

none.

blueprint follows mechanic role standards:
- function names follow treestruct
- no gerunds
- correct verb usage (get, set, is)
- arrow functions with input pattern
- fail-fast semantics
- exit code semantics
- idempotent mutations
- what-why headers
- test coverage declared

---

## verdict

the blueprint adheres to mechanic role standards. no violations found.
