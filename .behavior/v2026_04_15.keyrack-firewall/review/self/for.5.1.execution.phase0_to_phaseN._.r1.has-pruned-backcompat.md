# backwards compatibility review — keyrack firewall

## review question

for each backwards-compat concern in the code, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

---

## potential concerns reviewed

### 1. vault contract change (KeyrackHostVaultAdapter.get)

**change**: returns `KeyrackKeyGrant | null` instead of `string | null`

**backwards compat added?** no — clean break, all 6 vaults updated simultaneously

**why this is correct**:
- vaults are internal implementation details, not public API
- all consumers (getKeyrackKeyGrant.ts) updated in the same change
- no external code depends on the vault interface
- blueprint explicitly prescribed this change (lines 321-348)

**verdict**: no unnecessary backwards compat ✓

### 2. mechAdapterReplica.ts — ghs_* validation change

**change**: ghs_* tokens now pass validation (removed from LONG_LIVED_PATTERNS)

**backwards compat added?** no — behavior simply changed

**why this is correct**:
- ghs_* are ephemeral GitHub App installation tokens (1-hour TTL)
- they were incorrectly blocked as "long-lived" before
- this is a bug fix, not a feature change
- no shim to preserve old behavior

**verdict**: no unnecessary backwards compat ✓

### 3. new CLI command `keyrack firewall`

**change**: additive new subcommand

**backwards compat needed?** no — doesn't break prior commands

**verdict**: not applicable (additive change)

### 4. new transformers

**change**: asKeyrackFirewallSource, asKeyrackSlugParts, inferKeyrackMechForGet

**backwards compat needed?** no — new files, no prior dependencies

**verdict**: not applicable (new code)

---

## conclusion

no backwards compatibility shims were added. the vault contract change was handled as a clean break with all consumers updated simultaneously. this is appropriate since the vault interface is internal, not a public API.
