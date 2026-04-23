# YAGNI review — keyrack firewall

## review question

for each component in the code, ask:
- was this explicitly requested in the vision or criteria?
- is this the minimum viable way to satisfy the requirement?
- did we add abstraction "for future flexibility"?
- did we add features "while we're here"?
- did we optimize before we knew it was needed?

---

## components reviewed

### 1. asKeyrackFirewallSource.ts

**requested?** yes — blueprint section "sample: asKeyrackFirewallSource.ts" (lines 226-293)

**minimal?** yes — only implements two protocols:
- `json(env://VAR)` — required for `--from` env var input
- `json(stdin://*)` — required for test coverage and CI flexibility

**future flexibility?** no — the pattern `format(protocol://path)` follows standard URI patterns, not invented abstraction

**verdict**: holds ✓

### 2. asKeyrackSlugParts.ts

**requested?** yes — blueprint section "sample: asKeyrackSlugParts.ts" (lines 298-317)

**minimal?** yes — extracts org, env, keyName from slug. vaults need these to construct KeyrackKeyGrant.

**future flexibility?** no — uses prior transformers (asKeyrackKeyOrg, asKeyrackKeyName)

**verdict**: holds ✓

### 3. inferKeyrackMechForGet.ts

**requested?** yes — blueprint section "sample: inferKeyrackMechForGet.ts" (lines 201-222)

**minimal?** yes — core fix for the wish. detects `mech` field in JSON blob, returns PERMANENT_VIA_REPLICA for plain strings.

**future flexibility?** no — single responsibility, no abstraction

**verdict**: holds ✓

### 4. getKeyrackFirewallOutput.ts

**requested?** yes — blueprint codepath (lines 123-129) and sample (lines 576-648)

**minimal?** yes — two formats explicitly in blueprint:
- `github.actions` — `::add-mask::` + `$GITHUB_ENV`
- `json` — structured output for tests

**future flexibility?** no — only implements what's needed

**verdict**: holds ✓

### 5. vault contract change (KeyrackHostVaultAdapter.ts)

**requested?** yes — blueprint section "interface change: KeyrackHostVaultAdapter.ts" (lines 321-348)

**minimal?** yes — returns KeyrackKeyGrant | null instead of string | null. this enables:
- mech inference at vault level
- expiresAt preserved (prior bug: lost in translation)
- grade computed correctly

**future flexibility?** no — interface change required for the fix

**verdict**: holds ✓

### 6. vault adapters (os.envvar, os.secure, os.direct, os.daemon, aws.config, 1password)

**requested?** yes — blueprint filediff tree (lines 67-72) marks all 6 vaults as `[~]`

**minimal?** yes — each vault follows the same pattern prescribed in blueprint:
1. retrieve source
2. infer mech from JSON blob
3. validate mech consistency
4. translate via mechAdapter.deliverForGet
5. construct KeyrackKeyGrant

**future flexibility?** no — implements interface compliance

**verdict**: holds ✓

### 7. mechAdapterReplica.ts — remove ghs_* from blocked

**requested?** yes — blueprint filediff tree (line 75): "fix: remove ghs_* from LONG_LIVED_PATTERNS"

**minimal?** yes — ghs_* are ephemeral GitHub App installation tokens, not long-lived secrets

**verdict**: holds ✓

### 8. keyrack.firewall.acceptance.test.ts

**requested?** yes — blueprint test coverage section (lines 683-701)

**minimal?** yes — tests core scenarios: safe key, blocked key (ghp_*, AKIA*), github.actions output, json output, stdin input, required flags

**verdict**: holds ✓

---

## conclusion

all components were explicitly requested in the blueprint. no "while we're here" additions found. the implementation is minimal and focused on the wish: mechanism translation in CI via keyrack firewall command.
