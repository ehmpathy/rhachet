# self-review: has-role-standards-coverage (r12)

## reflection

i examine what standards should be present but may be absent. the question: are required practices covered?

---

## standards coverage matrix

### error practices

| practice | should apply? | covered in blueprint? |
|----------|--------------|----------------------|
| failfast on invalid input | ✓ | ✓ error if npx + --which global |
| failloud with hints | ✓ | ✓ hint in EACCES case |
| no failhide | ✓ | ✓ errors surfaced |

**why it holds:** error cases show explicit behavior, not silent failures.

---

### validation practices

| practice | should apply? | covered in blueprint? |
|----------|--------------|----------------------|
| validate --which option | ✓ | ✓ accepts local\|global\|both |
| validate npx + global | ✓ | ✓ codepath shows error |

**why it holds:** invalid combinations are caught and reported.

---

### test practices

| practice | should apply? | covered in blueprint? |
|----------|--------------|----------------------|
| unit tests for transformers | ✓ | ✓ detectInvocationMethod.test.ts |
| unit tests for communicators | ✓ | ✓ getGlobalRhachetVersion.test.ts, execNpmInstallGlobal.test.ts |
| unit tests for orchestrator | ✓ | ✓ execUpgrade.test.ts |
| acceptance tests for contract | ✓ | ✓ upgrade.acceptance.test.ts |
| snapshot tests | ✓ | ✓ 6 snapshots declared |

**why it holds:** test coverage table in blueprint shows all layers.

---

### type practices

| practice | should apply? | covered in blueprint? |
|----------|--------------|----------------------|
| typed inputs | ✓ | ✓ `input: { packages: string[] }` |
| typed outputs | ✓ | ✓ `{ upgraded: boolean; hint: string | null }` |
| interface extension | ✓ | ✓ UpgradeResult extended |

**why it holds:** blueprint code snippets show explicit types.

---

### documentation practices

| practice | should apply? | covered in blueprint? |
|----------|--------------|----------------------|
| purpose comments | ✓ | ✓ "**purpose:**" for each file |
| approach comments | ✓ | ✓ "**approach:**" for each file |
| test case list | ✓ | ✓ "**tests:**" for each file |

**why it holds:** each new file section has documentation structure.

---

## absent practices check

### rule.require.immutable-vars

**question:** does blueprint show mutable vars?

**examination:** code snippets use `const`:
```typescript
const npmExecPath = process.env.npm_execpath;
const result = spawnSync(...);
const stderr = result.stderr?.toString() || '';
```

**adherance:** ✓ no `let` or mutation shown.

---

### rule.forbid.io-as-domain-objects

**question:** does blueprint create domain objects for i/o?

**examination:** returns inline types:
```typescript
): { upgraded: boolean; hint: string | null } => { ... }
```

**adherance:** ✓ no IOResult domain class.

---

### rule.prefer.wet-over-dry

**question:** is there premature abstraction?

**examination:** three new files are separate, not abstracted:
- detectInvocationMethod (detection)
- getGlobalRhachetVersion (query)
- execNpmInstallGlobal (mutation)

**adherance:** ✓ no premature extraction.

---

### rule.require.single-responsibility

| file | responsibility | single? |
|------|----------------|---------|
| detectInvocationMethod | detect npx vs global | ✓ |
| getGlobalRhachetVersion | query global version | ✓ |
| execNpmInstallGlobal | execute global install | ✓ |

**adherance:** ✓ each file has one job.

---

## gaps found

none. all required practices are covered or documented.

---

## summary

| category | covered |
|----------|---------|
| error practices | ✓ |
| validation practices | ✓ |
| test practices | ✓ |
| type practices | ✓ |
| documentation practices | ✓ |
| immutability | ✓ |
| io types | ✓ |
| abstraction | ✓ |
| responsibility | ✓ |

## conclusion

the blueprint covers all required mechanic standards. no absent practices found.

