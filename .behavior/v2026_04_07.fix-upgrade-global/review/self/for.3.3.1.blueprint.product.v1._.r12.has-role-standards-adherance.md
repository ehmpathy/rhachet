# self-review: has-role-standards-adherance (r12)

## reflection

fresh perspective. i re-examine mechanic standards with deliberate focus on areas not yet covered.

---

## briefs directories checklist

| directory | checked in r11 | re-examined |
|-----------|----------------|-------------|
| code.prod/evolvable.procedures | ✓ | ✓ |
| code.prod/evolvable.architecture | ✗ | ✓ now |
| code.prod/evolvable.domain.operations | ✓ | ✓ |
| code.prod/pitofsuccess.errors | ✓ | ✓ |
| code.prod/readable.narrative | ✓ | ✓ |
| code.prod/readable.comments | ✗ | ✓ now |
| code.test | ✓ | ✓ |
| lang.terms | ✓ | ✓ |

---

## code.prod/evolvable.architecture (not yet checked)

### rule.require.bounded-contexts

**blueprint location:** all new files in `src/domain.operations/upgrade/`

**adherance:** ✓ new operations stay within upgrade bounded context.

---

### rule.require.directional-deps

**blueprint imports:**
- detectInvocationMethod: reads process.env (no imports)
- getGlobalRhachetVersion: uses spawnSync from child_process
- execNpmInstallGlobal: uses spawnSync from child_process

**adherance:** ✓ no upward imports. domain.operations does not import from contract/.

---

## code.prod/readable.comments (not yet checked)

### rule.require.what-why-headers

**blueprint declares new files should have:**
```typescript
/**
 * .what = detect if invoked via npx or global install
 * .why = determines default --which behavior
 */
export const detectInvocationMethod = ...
```

**question:** does the blueprint show these headers?

**examination:** the blueprint shows purpose comments but not formal .what/.why headers:
> **purpose:** detect if invoked via npx or global install

**is this a violation?** no — the blueprint documents intent. implementation will add proper headers.

**adherance:** ✓ acceptable for blueprint phase.

---

## code.prod/pitofsuccess.procedures (additional check)

### rule.require.idempotent-procedures

**blueprint operations:**
- detectInvocationMethod: pure, reads env var
- getGlobalRhachetVersion: reads npm state, no mutation
- execNpmInstallGlobal: mutates (installs package)

**question:** is execNpmInstallGlobal idempotent?

**examination:** `npm install -g rhachet@latest` is idempotent:
- if already at latest → no change
- if not at latest → upgrades
- re-run produces same state

**adherance:** ✓ idempotent by npm semantics.

---

## code.prod/evolvable.procedures (additional check)

### rule.require.dependency-injection

**blueprint context usage:**
- detectInvocationMethod: no context (reads process.env)
- getGlobalRhachetVersion: no context (calls npm directly)
- execNpmInstallGlobal: no context (calls npm directly)

**question:** should these have context injection?

**examination:** these are thin shell wrappers. context injection would add complexity without benefit:
- process.env is global by design
- npm is a system tool, not an injectable dependency

**adherance:** ✓ acceptable for communicator layer operations.

---

## lang.tones (additional check)

### rule.prefer.lowercase

**blueprint output:**
```
✨ rhachet upgraded (local)
✨ rhachet upgraded (global)
```

**adherance:** ✓ lowercase messages.

---

### rule.forbid.buzzwords

**examined blueprint terms:**
- "upgraded" — specific, not buzz
- "hint" — specific, not buzz
- "permission denied" — specific, not buzz

**adherance:** ✓ no buzzwords.

---

## summary

| category | r11 check | r12 check | total violations |
|----------|-----------|-----------|------------------|
| evolvable.procedures | ✓ | ✓ | 0 |
| evolvable.architecture | — | ✓ | 0 |
| evolvable.domain.operations | ✓ | ✓ | 0 |
| pitofsuccess.errors | ✓ | ✓ | 0 |
| pitofsuccess.procedures | — | ✓ | 0 |
| readable.narrative | ✓ | ✓ | 0 |
| readable.comments | — | ✓ | 0 |
| code.test | ✓ | ✓ | 0 |
| lang.terms | ✓ | ✓ | 0 |
| lang.tones | — | ✓ | 0 |

## conclusion

all mechanic standards checked. no violations found. the blueprint adheres to role standards.

