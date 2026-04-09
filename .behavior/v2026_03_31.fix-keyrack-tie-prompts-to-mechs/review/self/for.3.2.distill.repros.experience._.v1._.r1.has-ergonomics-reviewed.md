# self-review: has-ergonomics-reviewed

## ergonomics review summary

| journey | input | output | friction |
|---------|-------|--------|----------|
| github app set | natural — select from lists | natural — clear progress | pem path manual entry |
| aws sso set | natural — same as before | natural — unchanged | none |
| incompatible error | natural — user tried a combo | natural — clear guidance | none |
| vault inference | natural — just key name | natural — shows inference | none |
| single org auto-select | natural — no action needed | natural — shows selection | none |
| gh cli fallback | awkward — must paste json | acceptable — clear what to do | edge case |

---

## pit of success verification

| principle | assessment |
|-----------|------------|
| intuitive design | ✓ users can succeed via list selection without documentation |
| convenient | ✓ vault inferred from key name, mech inferred when unambiguous |
| expressive | ✓ --vault and --mech flags allow explicit override |
| composable | ✓ same mech works with any compatible vault |
| lower trust contracts | ✓ validate pem format, vault/mech compat at boundaries |
| deeper behavior | ✓ edge cases handled (single option auto-select, fallback) |

---

## friction analysis

### friction 1: pem path manual entry (github app set)

**input:** user must type or paste a file path

**acceptable because:**
- no alternative — we cannot guess where the pem file lives
- validation is immediate (fail fast on invalid path)
- user already has the pem file (they downloaded it from github)

**no change needed.**

### friction 2: gh cli fallback (edge case)

**input:** user must paste raw json when gh cli unavailable

**acceptable because:**
- edge case, not happy path — gh cli usually available
- clear instructions tell user what fields are needed
- better than a total failure
- documented as "acceptable — clear what to do"

**known limitation, not a bug.** the vision explicitly states: "if gh unavailable, allow manual json input as escape hatch."

---

## non-issues confirmed

1. **input feels natural** — ✓ list selection for org/app, same prompts for aws sso
2. **output feels natural** — ✓ clear progress tree, success message with slug
3. **friction identified** — ✓ two friction points noted, both acceptable

---

## verdict

ergonomics reviewed:
- all happy paths have natural input/output
- two friction points identified, both acceptable for their context
- no changes needed — friction points are inherent to the problem domain

no issues found.
