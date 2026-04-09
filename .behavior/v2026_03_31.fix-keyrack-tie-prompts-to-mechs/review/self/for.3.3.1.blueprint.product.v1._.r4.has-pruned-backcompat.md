# self-review r4: has-pruned-backcompat (deeper)

## fresh examination: hidden backwards compat

look for implicit backwards compat that might hide in assumptions.

---

## deeper audit

### 1. unlock flow "unchanged structure"

**blueprint says:**
```
### unlock flow (unchanged structure)
```

**question:** is "unchanged" a backwards compat decision?

**examination:**
- the wish focuses on set flow, not unlock flow
- unlock flow uses mech.translate which works correctly
- no request to change unlock flow
- "unchanged" means "no work needed" not "preserve old behavior"

**why it holds:** unlock flow is out of scope of the wish. not a backwards compat decision — just scope boundary.

---

### 2. mech.translate method

**blueprint shows:**
```
├─ [○] mech.translate → usable secret
```

[○] means unchanged.

**question:** is it backwards compat to keep mech.translate unchanged?

**examination:**
- mech.translate transforms source credential to usable secret
- this method works correctly for extant mechs
- the wish is about set flow prompts, not translate behavior
- no request to change translate

**why it holds:** mech.translate is not in scope. to keep it unchanged is not backwards compat — it's "no change needed".

---

### 3. secret storage format

**question:** does the blueprint preserve secret storage format for backwards compat?

**examination:**
- EPHEMERAL_VIA_GITHUB_APP stores json blob — same format before and after
- EPHEMERAL_VIA_AWS_SSO stores profile in ~/.aws/config — same format
- PERMANENT_VIA_REPLICA stores secret string — same format

**analysis:**
- storage formats don't change because the wish doesn't ask to change them
- this is not backwards compat — it's "no change requested"
- the refactor is about who prompts, not what is stored

**why it holds:** storage format unchanged because it's not in scope, not because of backwards compat.

---

### 4. daemon out of scope

**blueprint says:**
```
- keyrack daemon changes — out of scope
```

**question:** is daemon exclusion a backwards compat decision?

**examination:**
- daemon receives translated secrets from unlock flow
- daemon interface unchanged because unlock flow unchanged
- this is scope limitation, not backwards compat

**why it holds:** daemon exclusion is scope boundary. no shim, no alias, no migration — just "not in this refactor".

---

### 5. 1password adapter "changes beyond supportedMechs"

**blueprint says:**
```
- 1password vault adapter changes beyond supportedMechs — out of scope
```

**question:** does this preserve backwards compat with 1password?

**examination:**
- 1password adapter will gain supportedMechs and checkMechCompat
- no other changes needed for the refactor
- "beyond supportedMechs" means no extra work, not backwards compat

**why it holds:** 1password works with the new architecture. minimal change (add interface methods). not backwards compat.

---

### 6. host manifest schema

**question:** does the blueprint preserve host manifest schema for backwards compat?

**examination:**
- host manifest has entries with vault and mech fields
- aws.iam.sso → aws.config rename will break extant entries
- no migration, no alias

**check blueprint:** are there other schema changes that might preserve old format?

no mention of host manifest schema changes beyond the vault rename.

**why it holds:** only vault name changes. no schema preservation for old format.

---

### 7. the gh cli fallback

**blueprint says:**
```
├─ [case2] gh cli unavailable → per-field fallback
```

**question:** is this backwards compat with pre-refactor behavior?

**examination:**
- before refactor: no guided setup for EPHEMERAL_VIA_GITHUB_APP
- user had to manually craft json blob
- fallback allows manual entry of appId, installationId, pem

**analysis:**
- fallback is for new guided setup when gh cli unavailable
- not for old behavior — old behavior was "paste json"
- fallback prompts for individual fields, not json

**why it holds:** fallback is graceful degradation of new feature, not backwards compat with old.

---

## summary

no hidden backwards compat found.

**all "unchanged" items examined:**
1. unlock flow — out of scope, not backwards compat
2. mech.translate — no change needed, not backwards compat
3. storage formats — not in scope to change, not backwards compat
4. daemon — scope boundary, not backwards compat
5. 1password adapter — minimal change needed, not backwards compat
6. host manifest schema — only vault name changes, no preservation
7. gh cli fallback — new feature degradation, not old behavior preservation

**verdict:** blueprint contains zero backwards compat. all "unchanged" items are scope boundaries or "no change needed", not backwards compat decisions.
