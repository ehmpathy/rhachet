# self-review: has-fixed-all-gaps (r4)

> 5.5.playtest

---

## gap inventory from prior reviews

### review 1: has-vision-coverage (r2)

**gaps found:** none

all wish behaviors traced to playtest steps:
- AWS_PROFILE not JSON → happy path 1
- AWS_PROFILE = profile name → happy path 1
- profile name works with aws cli → happy path 2
- adapter returns exid not credentials → happy path 3

**status:** pass, no gaps to fix

### review 2: has-edgecase-coverage (r3)

**gaps found:** none

all edge cases have test coverage:
- profile not in aws config → [case4][t3] lines 361-373
- no exid provided → [case1][t1] lines 113-119
- sso session expired → [case3][t1] lines 251-287
- all code paths verified against implementation

**status:** pass, no gaps to fix

### review 3: has-acceptance-test-citations (r4)

**gaps found:** one blocker

| gap | severity | fixed? |
|-----|----------|--------|
| playtest step 1 expects profile name, acceptance test expects JSON credentials | blocker | **no — requires architectural decision** |

---

## blocker analysis

### the conflict

**playtest step 1 expects:**
```
rhx keyrack get --key AWS_PROFILE --env test
→ ehmpathy.demo (simple string)
```

**acceptance test verifies:**
```ts
const creds = JSON.parse(parsed.grant.key.secret);
expect(creds.AWS_ACCESS_KEY_ID).toBeDefined();
```

### why this cannot be fixed without human decision

the architecture has three layers:

| layer | what returns | current behavior |
|-------|--------------|------------------|
| vault adapter | profile name | fixed (returns exid) |
| mech adapter | credentials JSON | transforms profile → credentials |
| daemon | stored secret | stores mech output |

**the wish says:** "it should just set AWS_PROFILE"

**the architecture says:** mech.deliverForGet transforms for ephemeral credentials

two valid interpretations exist:

1. **adapter-level fix is sufficient** — the vault adapter now returns profile name. the mech transformation is intentional for SSO credentials. acceptance test is correct. playtest expectation needs update.

2. **cli-level fix needed** — the user expects `keyrack get` to output profile name. the daemon should store profile name, not mech output. acceptance test needs update.

### why i cannot make this decision

this is a product decision, not a mechanical fix:
- interpretation 1 changes how users consume keyrack (use credentials JSON)
- interpretation 2 changes the daemon architecture (skip mech transformation)

both have downstream implications for other keyrack consumers.

---

## what was fixed

| item | status |
|------|--------|
| vault adapter returns exid | fixed (unit tests pass) |
| integration test verifies aws cli call | fixed (lines 93-124) |
| all edge cases have coverage | verified (r3 review) |

## what remains blocked

| item | status | who decides |
|------|--------|-------------|
| playtest vs acceptance test discrepancy | blocked | product decision needed |

---

## verdict

**blocker** — one gap cannot be fixed mechanically:

the adapter-level fix is complete and verified. the discrepancy between playtest expectations and acceptance test assertions requires a product decision about what `keyrack get` should return for AWS SSO:
- option A: credentials JSON (current architecture, update playtest)
- option B: profile name (change architecture, update acceptance test)

this review surfaces the gap. resolution requires human decision.

