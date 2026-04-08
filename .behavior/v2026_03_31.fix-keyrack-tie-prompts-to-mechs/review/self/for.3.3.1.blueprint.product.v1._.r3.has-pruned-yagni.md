# self-review r3: has-pruned-yagni (deeper)

## fresh eyes examination

examined each section of the blueprint for unrequested additions.

---

## sections examined

### 1. risks and mitigations table

**question:** was this explicitly requested?

**examination:**
```
| risk | mitigation |
|------|------------|
| break extant aws sso flow | move logic, not rewrite; same prompts, new location |
| gh cli auth state detection | clear fallback path with per-field prompts |
| pem file format edge cases | validate format before store, fail fast with guidance |
| vault/mech matrix grows complex | explicit supportedMechs list, fail-fast with alternatives |
```

**analysis:**
- risk 1: migration concern — implicit in "aws sso works as it always did" (wish)
- risk 2: mentioned in vision assumptions section
- risk 3: criteria usecase.11 and usecase.12 cover pem edge cases
- risk 4: criteria mentions explicit supportedMechs validation

**verdict:** each risk maps to a concern already in wish, vision, or criteria. table is a summary, not new scope. no implementation added.

**decision:** keep — summarizes extant concerns, zero implementation cost

---

### 2. out of scope section

**question:** was this explicitly requested?

**examination:**
```
- new mechanisms (e.g., PERMANENT_VIA_AWS_KEY) — scaffold only
- 1password vault adapter changes beyond supportedMechs
- keyrack daemon changes
- unlock flow structural changes (only mech.translate used, already correct)
```

**analysis:**
- this section explicitly excludes scope that might creep in
- prevents scope expansion via explicit boundaries
- does not add implementation, it subtracts

**verdict:** acceptable — boundary clarification, not addition

**decision:** keep

---

### 3. os.direct + PERMANENT_VIA_REPLICA in matrix

**question:** was os.direct support for replica explicitly requested?

**examination:**
```
os.direct                  ✓           ✗              ✗             ✗
```

the wish says: "explicitly forbid os.direct from ephemeral support"

**analysis:**
- wish forbids ephemeral mechs for os.direct
- this implies non-ephemeral (permanent) mechs are allowed
- os.direct is the plaintext vault — can store simple secrets
- PERMANENT_VIA_REPLICA is the identity transform mech
- to allow this is the minimal interpretation: forbid ephemeral, allow permanent

**verdict:** implied by wish, not extra

**decision:** keep

---

### 4. test file names and locations

**question:** are specific file names over-specified?

**examination:**
- blueprint specifies exact test file names like `mechAdapterGithubApp.promptForSet.test.ts`
- were exact names requested?

**analysis:**
- criteria specifies test coverage requirements, not file names
- repo has conventions for test file structure (collocated, named after subject)
- specific names follow extant repo patterns
- implementation will follow these patterns anyway

**verdict:** names follow repo conventions, implementation detail not extra scope

**decision:** keep — matches repo patterns

---

### 5. vault inference patterns

**question:** beyond AWS_PROFILE, are there extra patterns?

**examination:**
```
inferVault.test.ts
  ├─ [case1] AWS_PROFILE → aws.config
  ├─ [case2] GITHUB_TOKEN → null (no inference)
  └─ [case3] STRIPE_KEY → null (no inference)
```

after r2 fix, only AWS_PROFILE → aws.config remains as inference. GITHUB_TOKEN and STRIPE_KEY are negative cases (no inference).

**analysis:**
- negative cases verify the boundaries
- criteria usecase.14 says "vault inference impossible" should fail fast
- these cases validate that behavior

**verdict:** negative cases are test coverage, not scope expansion

**decision:** keep

---

## summary

no additional yagni violations found in r3.

**examined and kept:**
1. risks table — summarizes extant concerns, zero impl cost
2. out of scope section — boundary clarification, not addition
3. os.direct + PERMANENT_VIA_REPLICA — implied by "forbid ephemeral"
4. test file names — repo conventions, not over-specification
5. negative inference cases — test coverage for criteria usecase.14

**previously fixed (r2):**
- AWS_ACCESS_KEY_ID inference — removed, not requested

**verdict:** blueprint is minimal. all components trace to wish or criteria.
