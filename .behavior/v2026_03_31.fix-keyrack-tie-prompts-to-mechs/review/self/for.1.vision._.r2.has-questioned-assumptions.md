# self-review r2: has-questioned-assumptions

fresh eyes pass — found additional hidden assumptions.

---

## assumption 7: vault name aws.credentials vs aws.config

**what we assume:** renamed vault is called "aws.credentials"

**evidence?** i inferred "aws.credentials" — but the wish says "the vault is actually aws.config"

**what if opposite?** aws.config better matches what it stores (profile config, not credentials)

**did wisher say this?** YES — wisher said "aws.config", not "aws.credentials"

**fix required:** update vision to use aws.config instead of aws.credentials

---

## assumption 8: api endpoint `/user/installations`

**what we assume:** vision timeline says "mech adapter fetches orgs via `gh api /user/installations`"

**evidence?** wish shows `gh api --method GET /orgs/ehmpathy/installations`

**what if opposite?** the endpoints are different:
- `/user/installations` — apps installed FOR the user (as individual)
- `/orgs/{org}/installations` — apps installed ON the org

**did wisher say this?** wish uses `/orgs/{org}/installations` — requires org selection first

**fix required:** update timeline to show correct flow:
1. user picks org (from known orgs or manual entry)
2. fetch apps via `/orgs/{org}/installations`

---

## assumption 9: multi-mech vault inference

**what we assume:** mech inference works when vault supports multiple mechs

**evidence?** os.secure currently infers PERMANENT_VIA_REPLICA. but if we add EPHEMERAL_VIA_GITHUB_APP support, which wins?

**what if opposite?** if inference becomes ambiguous, users must always pass --mech for multi-mech vaults

**did wisher say this?** wish says "mech inference should still work" but doesn't specify behavior for ambiguous cases

**fix required:** clarify in questions for wisher — this is already marked as question 3

---

## assumption 10: single app per org is possible

**what we assume:** guided flow shows "which app?" choice with multiple options

**evidence?** some orgs might have only one app installed

**what if opposite?** if only one app, skip the choice and auto-select

**did wisher say this?** not specified

**no fix needed:** good ergonomics — auto-select if unambiguous. add to pit of success.

---

## fixes applied

### fix 1: vault name aws.config ✓

ran `sedreplace --old "aws.credentials" --new "aws.config"` on 1.vision.md

before:
```
rhx keyrack set --key AWS_PROFILE --env test --vault aws.credentials
```

after:
```
rhx keyrack set --key AWS_PROFILE --env test --vault aws.config
```

7 replacements made. verified in:
- usecase 3 contract
- pit of success table
- assumptions section

### fix 2: api endpoint corrected ✓

edited timeline from:
```
1. mech adapter fetches orgs via `gh api /user/installations`
2. user selects org → mech fetches apps for that org
```

to:
```
1. user selects org (from `gh api /user/orgs` or manual entry)
2. mech fetches apps via `gh api /orgs/{org}/installations`
```

now matches the wish's api call pattern.

### fix 3: pit of success expanded ✓

added row for auto-select ergonomics:
```
| single org/app available | auto-select, skip choice prompt |
```

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| vault name aws.credentials | was wrong | fixed to aws.config |
| api endpoint /user/installations | was wrong | fixed to /orgs/{org}/installations |
| multi-mech vault inference | already marked | no change |
| single app auto-select | good ergonomics | added to pit of success |

three fixes applied to vision. all verified.

---

## verification pass (after spec creation)

confirmed all fixes remain in place:
- aws.config name: ✓ verified via grep
- api endpoint flow: ✓ usecase 1 timeline correct
- pit of success auto-select: ✓ row present in table
- spec alignment: ✓ define.vault-mech-adapters.md matches vision
