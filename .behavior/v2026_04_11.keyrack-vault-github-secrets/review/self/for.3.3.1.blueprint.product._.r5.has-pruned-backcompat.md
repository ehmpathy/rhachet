# self-review: has-pruned-backcompat (r5)

## backwards compatibility review

the blueprint adds a new vault type (`github.secrets`) and changes the vault adapter interface to allow nullable `get`. are there any backwards-compat concerns that were not explicitly requested?

---

### interface change: nullable get

**the change:** `KeyrackHostVaultAdapter.get` changes from `(input) => Promise<string | null>` to `((input) => Promise<string | null>) | null`.

**is this backwards compatible?**

yes. the type change is additive:
- extant adapters (os.secure, 1password, etc.) have `get` defined as a function
- a function satisfies the type `function | null`
- no extant adapter code needs to change

**is there backcompat logic?**

no. the blueprint adds null checks in consumers, not "if old vault, use old logic" conditionals.

---

### consumer changes: getKeyrackKeyHost

**the change:** adds check for `adapter.get === null` before call.

**is this backwards compatible?**

yes. for extant vaults, `adapter.get` is defined, so the null check passes and normal flow continues.

**is there backcompat logic?**

no. the check is forward logic for the new vault type, not a shim for old behavior.

---

### consumer changes: unlockKeyrackKeys

**the change:** adds check for `adapter.get === null` to skip or failfast.

**is this backwards compatible?**

yes. for extant vaults, `adapter.get` is defined, so normal unlock flow continues.

**is there backcompat logic?**

no. the check handles the new write-only vault case. extant vaults are unaffected.

---

## backwards compat patterns NOT present

| pattern | present? | notes |
|---------|----------|-------|
| re-export old types | no | type changes directly |
| deprecation warnings | no | no warnings for old code |
| feature flags | no | no toggle between old/new |
| migration scripts | no | no data migration needed |
| version checks | no | no conditional by version |
| "if not new vault, do old thing" | no | checks are for new vault |

---

## conclusion

the blueprint contains **no backwards compatibility logic**. all changes are:
- additive (new vault type)
- forward-compatible (null checks for new vault)
- non-break (extant vaults work unchanged)

**no backcompat was requested by wisher, none was added.**
