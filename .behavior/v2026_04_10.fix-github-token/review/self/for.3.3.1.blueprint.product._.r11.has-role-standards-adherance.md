# self-review r11: has-role-standards-adherance

## what i reviewed

i enumerated the mechanic briefs directories relevant to this blueprint, then checked each proposed change against the standards.

---

## relevant briefs directories

the blueprint proposes changes to:
- domain.objects (KeyrackKeySpec type)
- access/daos (hydrateKeyrackRepoManifest)
- domain.operations/keyrack/adapters/mechanisms (mechAdapterGithubApp)

relevant mechanic briefs:

| directory | why relevant |
|-----------|--------------|
| practices/code.prod/evolvable.domain.objects/ | type definitions, nullable rules |
| practices/code.prod/evolvable.procedures/ | input-context pattern, arrow functions |
| practices/code.prod/readable.narrative/ | narrative flow, no decode-friction |
| practices/code.test/ | test coverage |
| practices/lang.terms/ | ubiqlang, gerund prohibition |

---

## standard checks

### 1. domain.objects standards

**rule.forbid.undefined-attributes:**
- blueprint changes `mech` value from concrete to `null`
- the type already allows `KeyrackGrantMechanism | null`
- no new undefined attributes added
- **holds:** null is explicit (not undefined)

**rule.forbid.nullable-without-reason:**
- `mech: null` has clear domain reason: "manifest declares no mech constraint"
- vault adapter interprets null as "prompt user for selection"
- **holds:** null has domain semantics

**rule.require.immutable-refs:**
- no refs are added or changed
- mech is not a ref, it's a value
- **holds:** no violation

### 2. procedure standards

**rule.require.input-context-pattern:**
- blueprint does not add new procedures
- tilde expansion is inline within extant `acquireForSet` method
- **holds:** no new procedure signatures

**rule.require.arrow-only:**
- blueprint adds no new functions
- changes are value assignments and one-liner transformations
- **holds:** no new violations

### 3. narrative standards

**rule.forbid.inline-decode-friction:**
- regex `pemPath.replace(/^~(?=$|\\/|\\\\)/, homedir())` is one line
- purpose is immediately clear: expand tilde to home directory
- variable name `pemPathExpanded` documents intent
- **holds:** single-purpose transformation, no decode-friction

**rule.forbid.else-branches:**
- blueprint adds no control flow
- changes are value assignments
- **holds:** no else branches

### 4. term standards

**rule.forbid.gerunds:**
- no gerunds in blueprint
- variable name `pemPathExpanded` uses past participle (adjective), not gerund
- **holds:** no gerund violations

**rule.require.ubiqlang:**
- `pemPathExpanded` follows extant `*Expanded` suffix convention
- `mech` is canonical term for mechanism
- **holds:** uses canonical terms

---

## anti-pattern checks

| anti-pattern | present? | notes |
|--------------|----------|-------|
| barrel exports | no | no index.ts changes |
| positional args | no | extant signatures preserved |
| decode-friction | no | simple one-liner expansion |
| else branches | no | no control flow added |
| gerunds | no | past participle used |
| undefined attributes | no | null used, not undefined |

---

## deviations found

none. the blueprint:
- follows domain object standards (explicit null, not undefined)
- follows procedure standards (no new procedures)
- follows narrative standards (no decode-friction, no else)
- follows term standards (no gerunds, canonical terms)

---

## verdict

**PASSED.** the blueprint adheres to mechanic role standards. no violations or anti-patterns found.

---

## verification

reviewed 2026-04-10. all mechanic briefs directories checked. no violations.

