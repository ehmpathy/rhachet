# self-review r12: has-role-standards-adherance (second pass)

## what i reviewed

second pass review of mechanic role standards. fresh perspective on the blueprint changes.

---

## briefs directories checked

| directory | contains | relevant? |
|-----------|----------|-----------|
| code.prod/evolvable.domain.objects | null/undefined rules, immutable refs | yes |
| code.prod/evolvable.procedures | input-context, arrow-only | yes |
| code.prod/readable.narrative | no decode-friction, no else | yes |
| code.prod/pitofsuccess.errors | failfast, failloud | no — no new error paths |
| code.prod/pitofsuccess.typedefs | no as-cast, shapefit | yes |
| code.test | test coverage by grain | yes |
| lang.terms | gerunds, ubiqlang, treestruct | yes |

---

## detailed checks

### evolvable.domain.objects

**rule.forbid.undefined-attributes:**
- `mech` changed from concrete to nullable
- type is `KeyrackGrantMechanism | null`
- no undefined
- **holds**

**rule.forbid.nullable-without-reason:**
- null has clear domain reason: "no mech constraint declared"
- vault interprets null as "prompt user"
- **holds**

### evolvable.procedures

**rule.require.arrow-only:**
- no new functions added
- tilde expansion is inline assignment
- **holds**

**rule.require.input-context-pattern:**
- no new procedure signatures
- **holds**

### readable.narrative

**rule.forbid.inline-decode-friction:**
- regex `pemPath.replace(/^~(?=$|\/|\\)/, homedir())` is clear
- single purpose: expand tilde
- variable name `pemPathExpanded` self-documents
- **holds**

**rule.forbid.else-branches:**
- no control flow added
- **holds**

### pitofsuccess.typedefs

**rule.forbid.as-cast:**
- no type casts added
- **holds**

**rule.require.shapefit:**
- types fit: `KeyrackGrantMechanism | null` is correct shape
- **holds**

### code.test

**rule.require.test-coverage-by-grain:**
- transformer (hydration) → unit tests extant
- communicator (mech adapter) → integration tests extant
- no new codepaths that need new tests
- **holds**

### lang.terms

**rule.forbid.gerunds:**
- `pemPathExpanded` is past participle, not gerund
- no -ing nouns
- **holds**

**rule.require.ubiqlang:**
- `mech` is canonical
- `pemPathExpanded` follows `*Expanded` convention
- **holds**

---

## anti-patterns check

| anti-pattern | found? |
|--------------|--------|
| barrel exports | no |
| positional args | no |
| decode-friction | no |
| else branches | no |
| gerunds | no |
| undefined attrs | no |
| as-casts | no |

---

## conclusion

**PASSED.** second pass confirms adherance to all mechanic role standards.

---

## verification

reviewed 2026-04-10. all relevant briefs directories checked. no violations.
