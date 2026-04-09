# self-review r3: has-ergonomics-reviewed (final)

## pit of success principles verified

### 1. intuitive design — can users succeed without documentation?

| journey | verdict | why |
|---------|---------|-----|
| github app set | ✓ | numbered lists guide choices, prompts are questions |
| aws sso set | ✓ | same as extant flow, users already know it |
| mech inference | ✓ | prompt shows human descriptions alongside mech names |
| vault inference | ✓ | inference message shows what was inferred |
| auto-select | ✓ | shows what was selected, no action needed |
| gh cli fallback | ✓ | per-field prompts guide each input |

### 2. convenient — can we infer inputs rather than require them?

| inference | when | verdict |
|-----------|------|---------|
| vault from key | AWS_PROFILE → aws.config | ✓ inferred |
| mech when single | vault supports one mech | ✓ auto-select |
| org when single | user has one org | ✓ auto-select |
| app when single | org has one app | ✓ auto-select |
| mech when ambiguous | vault supports multiple | ✓ prompted |

### 3. expressive — does it allow expression of differences?

| override | how | verdict |
|----------|-----|---------|
| explicit --vault | overrides inference | ✓ |
| explicit --mech | skips inference prompt | ✓ |
| manual fallback | when gh unavailable | ✓ |

### 4. composable — can this be combined with other operations?

| composition | verdict | why |
|-------------|---------|-----|
| same mech, any vault | ✓ | EPHEMERAL_VIA_GITHUB_APP works with os.secure, 1password |
| any mech, same vault | ✓ | os.secure works with PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_GITHUB_APP |
| set → unlock → get | ✓ | roundtrip verified at set time |

### 5. lower trust contracts — do we validate at boundaries?

| boundary | validation | verdict |
|----------|------------|---------|
| vault/mech compat | checkMechCompat fails fast | ✓ |
| pem file exists | fail fast with path shown | ✓ |
| pem file format | validate before store | ✓ |
| org/app api response | handle empty lists, errors | ✓ |

### 6. deeper behavior — do we handle edge cases gracefully?

| edge case | how handled | verdict |
|-----------|-------------|---------|
| single option | auto-select, show selection | ✓ |
| gh cli unavailable | per-field prompts | ✓ |
| invalid pem | fail fast, show path | ✓ |
| incompatible combo | fail fast, show alternatives | ✓ |

---

## issue found in r2, now fixed

**before r2:** gh cli fallback required raw json paste
**after r2:** gh cli fallback uses per-field prompts

changes made:
1. journey 6 step table: added t1-t4 for per-field inputs
2. journey 6 snapshot: shows appId, installationId, pem path prompts
3. experience table: "fallback to per-field prompts"
4. ergonomics table: "natural — per-field prompts"

---

## non-issues confirmed

**all journeys now have natural input/output:**
- numbered lists for selection
- inference shown when used
- fail fast with clear guidance
- per-field prompts for manual fallback

**no friction left:**
- every awkward point was identified and addressed
- gh cli fallback was the only issue, now fixed

---

## verdict

ergonomics review complete:
- all 6 pit of success principles verified ✓
- one issue found (raw json), fixed (per-field prompts)
- no friction points left

ready to proceed.
