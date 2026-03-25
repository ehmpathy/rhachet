# review.self: role-standards-coverage (r7)

## the question

are all relevant mechanic standards applied? are there patterns that should be present but are absent?

## rule directories reviewed

| directory | relevance |
|-----------|-----------|
| evolvable.procedures | ✓ functions, args, patterns |
| evolvable.architecture | ✓ bounded contexts |
| pitofsuccess.errors | ✓ fail fast, helpful errors |
| pitofsuccess.procedures | ✓ idempotent mutations |
| pitofsuccess.typedefs | ✓ type safety |
| readable.comments | ✓ .what/.why headers |
| readable.narrative | ✓ no else, early returns |
| code.test | ✓ test coverage |

---

## file-by-file coverage check

### vaultAdapterOsDaemon.ts

| standard | present? | evidence |
|----------|----------|----------|
| arrow-only | ✓ | all methods are arrow functions |
| what-why headers | ✓ | lines 15-16 (module), 23-24 (unlock), 33-34 (isUnlocked), 41-42 (get), 59-60 (set), 100-101 (del) |
| input-context | ✓ | all methods use input object |
| named-args | ✓ | all call sites use named args |
| no else | ✓ | zero else keywords |
| early returns | ✓ | line 48, 52 (get returns null early) |
| idempotent | ✓ | daemonAccessUnlock is upsert |
| fail-fast | ✓ | early returns on null checks |

**gaps found:** none

### vaultAdapter1Password.ts

| standard | present? | evidence |
|----------|----------|----------|
| arrow-only | ✓ | all methods are arrow functions |
| what-why headers | ✓ | lines 15-16 (module), 27-28 (unlock), 37-38 (isUnlocked), 57-58 (get), 84-85 (set), 161-162 (del) |
| input-context | ✓ | all methods use input object |
| named-args | ✓ | all call sites use named args |
| no else | ✓ | zero else keywords |
| early returns | ✓ | line 63-66 (get throws on absent exid) |
| fail-fast | ✓ | lines 93-120 (op cli check), 131-135 (exid validation), 139-155 (roundtrip validation) |
| exit-code-semantics | ✓ | exit 2 for constraint errors |
| helpful errors | ✓ | detailed install instructions, verify hints |

**gaps found:** none

### isOpCliInstalled.ts

| standard | present? | evidence |
|----------|----------|----------|
| arrow-only | ✓ | single arrow function |
| what-why headers | ✓ | lines 7-9 |
| single-responsibility | ✓ | one function, one purpose |

**gaps found:** none

### setKeyrackKeyHost.ts (changes only)

| standard | present? | evidence |
|----------|----------|----------|
| input-context | ✓ | (input, context) signature |
| skip daemon relock | ✓ | line 83: `if (input.vault !== 'os.daemon')` |
| comment explains why | ✓ | line 80-82: explains skip |

**gaps found:** none

### inferMechFromVault.ts

| standard | present? | evidence |
|----------|----------|----------|
| what-why headers | ✓ | lines 6-7 |
| no else | ✓ | uses if + return pattern |
| early returns | ✓ | each vault check returns immediately |

**gaps found:** none

### KeyrackGrantMechanism.ts

| standard | present? | evidence |
|----------|----------|----------|
| convention comment | ✓ | lines 5-7 explain {DURATION}_VIA_{METHOD} |
| deprecated aliases | ✓ | lines 29-32 with explanatory comment |

**gaps found:** none

---

## test coverage check

| file | unit test | integration test |
|------|-----------|------------------|
| vaultAdapterOsDaemon.ts | ✓ vaultAdapterOsDaemon.test.ts | ✓ vaultAdapterOsDaemon.integration.test.ts |
| vaultAdapter1Password.ts | ✓ vaultAdapter1Password.test.ts | ✓ vaultAdapter1Password.integration.test.ts |
| isOpCliInstalled.ts | ✓ isOpCliInstalled.test.ts | n/a (pure function) |

**gaps found:** none

---

## patterns that could be absent

| pattern | check | status |
|---------|-------|--------|
| error wrap with context | checked all throws | ✓ all errors include metadata |
| type guards | checked type assertions | ✓ no unsafe casts |
| null vs undefined | checked nullable returns | ✓ uses null consistently |
| async/await | checked promise chains | ✓ no raw .then() chains |

---

## conclusion

all mechanic role standards are covered:

- all files have .what/.why headers
- all functions use arrow syntax
- all procedures use input-context pattern
- no else branches
- early returns for null checks
- fail-fast with exit 2 for constraint errors
- helpful error messages with context
- test coverage for all new code

no gaps found. coverage is complete.
