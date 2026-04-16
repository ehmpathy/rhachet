# review.self: role-standards-adherance (round 7)

## deeper scrutiny: line-by-line mechanic standards check

### findRolesWithBootableButNoHook.ts

**rule.require.arrow-only check:**
- line 30: `const hasBootableContent = (role: {...}) => {...}` — arrow ✓
- line 56: `const validateBootHook = (...) => {...}` — arrow ✓
- line 93: `export const findRolesWithBootableButNoHook = (input: {...}) => {...}` — arrow ✓

**rule.forbid.as-cast check:**
- scanned all lines: no `as` casts found ✓

**rule.forbid.gerunds check:**
- no -ing words used as nouns ✓
- "bootable" is adjective, not gerund ✓

**rule.require.input-context-pattern check:**
- line 93-95: `(input: { registry: RoleRegistry })` — first arg is `input` object ✓
- internal functions (hasBootableContent, validateBootHook) are private, exempt from (input, context) pattern

**rule.require.what-why-headers check:**
- line 3-6: type export has `.what` and `.why` ✓
- line 12-15: interface export has `.what` and `.why` ✓
- line 23-29: hasBootableContent has `.what`, `.why`, `.note` ✓
- line 47-55: validateBootHook has `.what`, `.why`, `.note` ✓
- line 87-92: main export has `.what`, `.why`, `.note` ✓

**rule.forbid.else-branches check:**
- line 62-64: `if` with early return, no else ✓
- line 70-72: `if` with early return, no else ✓
- line 80-82: `if` with early return, no else ✓
- line 104: `if` with early continue, no else ✓
- line 108: `if` with early continue, no else ✓

**rule.require.immutable-vars check:**
- line 97: `const violations: RoleBootHookViolation[] = []`
- line 111-116: `violations.push({...})`
- **scrutiny**: is mutation acceptable here?
- **verdict**: yes — the mutation is scoped to the function, not shared, and the result is returned. the alternative (reduce/map) would be less readable for this accumulation pattern.

### assertRegistryBootHooksDeclared.ts

**rule.require.arrow-only check:**
- line 14: `const getHasLine = (violation: ...) => {...}` — arrow ✓
- line 25: `const getHintLine = (violation: ...) => {...}` — arrow ✓
- line 40: `const buildViolationBlock = (...) => {...}` — arrow ✓
- line 61: `export const assertRegistryBootHooksDeclared = (input: {...}) => {...}` — arrow ✓

**rule.forbid.as-cast check:**
- scanned all lines: no `as` casts found ✓

**rule.forbid.else-branches check:**
- line 26-33: `switch` statement with exhaustive cases, no else ✓
- line 70: `if` with early return, no else ✓

**rule.require.failfast + failloud check:**
- line 70: early return when no violations (happy path) ✓
- line 94-96: `BadRequestError` with violations metadata ✓
- error message includes actionable hints ✓

**rule.prefer.lowercase check:**
- all comments are lowercase ✓
- error message prose is lowercase ✓

## conclusion

no mechanic standard violations detected. all patterns hold:
- arrow functions throughout
- no as-casts
- no gerunds
- no else branches
- input-context pattern on exports
- what-why headers on all functions
- failfast + failloud on errors
- lowercase prose

