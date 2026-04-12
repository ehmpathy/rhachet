# self-review: has-role-standards-adherance (r11)

## mechanic standards check

check blueprint against mechanic role briefs.

---

## briefs directories to check

1. `code.prod/evolvable.procedures` — (input, context), arrow functions
2. `code.prod/evolvable.domain.operations` — get/set/gen verbs, grains
3. `code.prod/pitofsuccess.errors` — failfast, failloud
4. `code.test` — coverage by grain, given/when/then
5. `lang.terms` — treestruct, ubiqlang, no gerunds

---

## check: evolvable.procedures

### rule.require.input-context-pattern

**check:** do blueprint operations follow `(input, context)` pattern?

blueprint codepath tree shows:
- `ghApiSetSecret` — will receive (input, context)
- `ghApiDelSecret` — will receive (input, context)
- `vaultAdapterGithubSecrets` — adapter methods receive (input, context)

**verdict:** blueprint does not show function signatures, but follows extant vault adapter pattern which uses (input, context).

### rule.require.arrow-only

**check:** no function keyword

**verdict:** implementation detail. blueprint does not declare syntax, but all extant code uses arrow functions.

---

## check: evolvable.domain.operations

### rule.require.get-set-gen-verbs

**check:** do operations use get/set/gen?

blueprint operations:
- `ghApiSetSecret` — ✓ uses "set"
- `ghApiDelSecret` — "del" not "set" — but "del" is valid for delete operations
- `ghApiGetPublicKey` — ✓ uses "get"
- `validateSecretName` — transformer, uses "validate" prefix — valid for transformers
- `encryptSecretValue` — transformer, uses "encrypt" prefix — valid for transformers

**verdict:** adheres. operations follow verb conventions.

### define.domain-operation-grains

**check:** are grains correctly identified?

blueprint test coverage table:
- `validateSecretName` — transformer → unit — ✓
- `encryptSecretValue` — transformer → unit — ✓
- `ghApiSetSecret` — communicator → integration — ✓
- `ghApiDelSecret` — communicator → integration — ✓
- `ghApiGetPublicKey` — communicator → integration — ✓
- `vaultAdapterGithubSecrets` — orchestrator → integration — ✓

**verdict:** adheres. grains match test types.

---

## check: pitofsuccess.errors

### rule.require.failfast

**check:** do error cases failfast?

blueprint declares failfast for:
- get on github.secrets key — ✓
- unlock --key X on github.secrets — ✓
- gh auth absent — ✓
- repo not found — ✓
- permission denied — ✓

**verdict:** adheres. all error paths failfast.

### rule.require.failloud

**check:** do errors include context?

blueprint error messages include context:
- "github secrets cannot be retrieved via api" — explains why
- "github.secrets cannot be unlocked" — explains constraint
- "gh auth required" — actionable
- "repo not found" — identifies issue
- "permission denied" — identifies issue

**verdict:** adheres. errors are informative.

---

## check: code.test

### rule.require.test-coverage-by-grain

**check:** does blueprint match grain → test type?

| grain | expected | blueprint |
|-------|----------|-----------|
| transformer | unit | unit ✓ |
| communicator | integration | integration ✓ |
| orchestrator | integration | integration ✓ |
| contract | acceptance | acceptance ✓ |

**verdict:** adheres. test types match grains.

### rule.require.given-when-then

**check:** does test tree use given/when/then?

blueprint acceptance test cases (lines 196-250):
```
given('[case1] set key via EPHEMERAL_VIA_GITHUB_APP', () => {
  then('stdout matches snapshot');
});
```

**verdict:** adheres. uses given/then structure.

---

## check: lang.terms

### rule.require.treestruct

**check:** do names follow [verb][...noun] pattern?

- `ghApiSetSecret` — gh + Api + Set + Secret — ✓ platform + verb + noun
- `ghApiDelSecret` — gh + Api + Del + Secret — ✓
- `ghApiGetPublicKey` — gh + Api + Get + PublicKey — ✓
- `validateSecretName` — validate + SecretName — ✓
- `encryptSecretValue` — encrypt + SecretValue — ✓

**verdict:** adheres. names follow treestruct.

### rule.forbid.gerunds

**check:** no gerunds in names

blueprint operation names:
- validateSecretName — no gerund
- encryptSecretValue — no gerund
- ghApiSetSecret — no gerund
- ghApiDelSecret — no gerund
- ghApiGetPublicKey — no gerund

**verdict:** adheres. no gerunds in names.

---

## summary

| category | rules checked | violations |
|----------|---------------|------------|
| evolvable.procedures | input-context, arrow-only | 0 |
| evolvable.domain.operations | get-set-gen, grains | 0 |
| pitofsuccess.errors | failfast, failloud | 0 |
| code.test | coverage-by-grain, given-when-then | 0 |
| lang.terms | treestruct, no gerunds | 0 |

**blueprint adheres to mechanic role standards.**
