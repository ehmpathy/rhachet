# self-review r2: has-divergence-addressed

## verification method

for each documented divergence:
1. verify the resolution type (repaired vs backed up)
2. if repaired: check git diff for the fix
3. if backed up: question the rationale skeptically

---

## D1: deprecated aliases retained

**resolution type:** backed up (intentional divergence)

**rationale check:**

| question | answer |
|----------|--------|
| is this truly an improvement? | yes — preserves backwards compat with host manifests that use REPLICA, GITHUB_APP, AWS_SSO |
| is this just laziness? | no — we added the new canonical names (PERMANENT_VIA_REPLICA, etc). to retain aliases is extra work, not less |
| could this cause problems later? | no — aliases are marked @deprecated in doc comment. new code uses canonical names. aliases can be removed when migration complete |

**skeptic test:** what happens if we removed aliases?

1. host manifest says `mech: REPLICA`
2. `keyrack unlock` looks for mech adapter
3. no adapter for `REPLICA` → unlock fails
4. user must manually edit all host manifests

verdict: **rationale holds**. removal breaks extant setups. aliases preserve backwards compat.

---

## D2: test fixture uses REFERENCE alias

**resolution type:** backed up (intentional divergence)

**rationale check:**

| question | answer |
|----------|--------|
| is this truly an improvement? | yes — proves backwards compat works at acceptance level |
| is this just laziness? | no — would be easier to use canonical name |
| could this cause problems later? | no — test explicitly validates alias works |

**skeptic test:** why not use canonical name in fixture?

if we only tested PERMANENT_VIA_REFERENCE, we would not know if REFERENCE alias works. the fixture intentionally uses deprecated alias so acceptance tests catch any regression in alias support.

**git verification:**

```
blackbox/.test/assets/with-vault-1password/.rhachet/keyrack.manifest.json
  "mech": "REFERENCE",
```

this is intentional. test case [uc5] explicitly asserts `mech is REFERENCE`.

verdict: **rationale holds**. fixture validates alias backward compat.

---

## D3: os.daemon writes to host manifest

**resolution type:** clarified as NOT a divergence

**verification:**

blueprint codepath tree line 81:
```
│  ├─ [○] write host manifest                   # retain: vault=os.daemon so unlock knows where to look
```

implementation does exactly this — writes `vault=os.daemon` pointer to host manifest.

the r1 divergence analysis incorrectly listed this as a divergence because vision doc explored "no manifest entry". but blueprint resolved this: manifest tracks vault location, secret lives in daemon only.

**r2 correction applied:** evaluation document updated to clarify D3 is NOT a divergence. blueprint and implementation match.

verdict: **not a divergence**. blueprint says write manifest, implementation writes manifest.

---

## conclusion

| divergence | type | status |
|------------|------|--------|
| D1 | backed up | rationale holds — backwards compat required |
| D2 | backed up | rationale holds — intentionally tests alias compat |
| D3 | clarified | not a divergence — blueprint/implementation match |

all divergences properly addressed. no lazy shortcuts detected.
