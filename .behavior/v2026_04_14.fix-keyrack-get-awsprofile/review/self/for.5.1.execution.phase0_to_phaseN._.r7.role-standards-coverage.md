# self-review r7: role-standards-coverage

check what standards SHOULD be present. any patterns absent that ought to exist?

---

## rule directory enumeration (same as r7 adherance)

| directory | why relevant |
|-----------|--------------|
| lang.terms/ | term choices in code and comments |
| lang.tones/ | comment style, lowercase preference |
| code.prod/evolvable.procedures/ | function signatures, arrow functions |
| code.prod/evolvable.domain.operations/ | operation names (get/set/gen verbs) |
| code.prod/readable.comments/ | .what/.why headers |
| code.prod/readable.narrative/ | flow, early returns, no else |
| code.prod/pitofsuccess.errors/ | error patterns |
| code.test/frames.behavior/ | bdd given/when/then structure |
| code.test/scope.coverage/ | test coverage by grain |

---

## coverage analysis: prod code

### should there be error handle?

**analysis:** the change is inside the `get` method. what could fail?

1. `getMechAdapter(input.mech)` — this throws if mech is invalid. but we only reach this line after `if (!input.mech)` early return. so mech is always valid here.

2. `await mechAdapter.deliverForGet({ source })` — this could fail if SSO session is expired AND user cancels browser login. however, this error should propagate — it's a user-action error, not one we should catch.

**verdict:** no additional error handle needed. errors propagate naturally.

### should there be validation?

**analysis:** what validation could be added?

1. `source` validation — already handled by `if (!source) return null` at line 178.

2. `input.mech` validation — already handled by `if (!input.mech) return source` at line 180-181.

**verdict:** validation already present in extant code. no gaps.

### should there be types?

**analysis:** the function signature is `get: async (input) => {`

the `input` type is inferred from the `VaultAdapter` interface. explicit type annotation is not required when type inference provides it.

**verdict:** types covered by interface. no gaps.

---

## coverage analysis: test code

### should there be more test cases?

**analysis:** what scenarios should be tested?

| scenario | covered? | by which test? |
|----------|----------|----------------|
| get without exid | yes | [t1] returns null |
| get with exid, no mech | yes | [t0] returns exid |
| get with exid and mech | yes | [t0.5] returns exid (new test) |
| get with invalid mech | no | should propagate error |
| mech session expired, user cancels | no | integration concern |

the uncovered cases (invalid mech, user cancel) are edge cases that:
1. invalid mech — protected by TypeScript enum
2. user cancel — integration test scope, not unit test

**verdict:** test coverage adequate for unit scope.

### should there be error assertions?

**analysis:** the fix does not introduce new error paths. it removes a return value. no new errors to test.

**verdict:** no error assertions needed.

### should there be snapshot tests?

**analysis:** vault adapters are internal. the criteria for snapshot tests (per `rule.require.test-coverage-by-grain`) is contract-level tests. vault adapters are not contracts.

**verdict:** no snapshot needed. adapters are not contracts.

---

## coverage analysis: comments

### should there be more documentation?

**analysis:** the change adds two inline comments:

```ts
// validate sso session via mech (triggers browser login if expired)
// return profile name (AWS SDK derives credentials from profile)
```

these explain:
1. why we call `deliverForGet` (validation side effect)
2. why we return `source` (SDK derives credentials)

**verdict:** comments adequate. both "what" and "why" addressed inline.

---

## coverage summary

| category | pattern needed? | present? |
|----------|-----------------|----------|
| error handle | no (errors propagate) | n/a |
| validation | no (extant covers it) | n/a |
| types | no (interface provides) | n/a |
| test: happy path | yes | [t0.5] added |
| test: edge cases | no (integration scope) | n/a |
| test: errors | no (no new error paths) | n/a |
| test: snapshots | no (not a contract) | n/a |
| comments | yes | inline comments present |

---

## why it holds

**all relevant standards are covered.**

1. **error handle not needed** — the change does not introduce error-prone code. the `deliverForGet` call propagates errors naturally, which is the correct behavior for user-cancellation or invalid-session scenarios.

2. **validation already extant** — the early returns at lines 178 and 180-181 handle null/absent inputs. no additional validation needed.

3. **types inferred** — the `VaultAdapter` interface provides the input type. explicit annotation would be redundant.

4. **test coverage adequate** — the new test [t0.5] covers the primary fix scenario. edge cases (invalid mech, user cancel) are either type-guarded or integration-scope.

5. **comments present** — both inline comments explain intent (what) and rationale (why).

the implementation has complete coverage of applicable mechanic role standards.

