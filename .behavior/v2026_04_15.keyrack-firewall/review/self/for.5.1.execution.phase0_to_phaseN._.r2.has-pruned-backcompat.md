# backwards compatibility review (r2) — keyrack firewall

## review question

for each backwards-compat concern in the code, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

---

## code inspection

### KeyrackHostVaultAdapter.ts (line 20)

```typescript
}) => Promise<KeyrackKeyGrant | null>;
```

**prior code**: `Promise<string | null>`

**backwards compat added?** no

**why no shim needed**:
1. examined all 6 vault adapter files - none have fallback logic for string return
2. examined getKeyrackKeyGrant.ts - consumer directly uses `envGrant` as KeyrackKeyGrant (line 44-46):
   ```typescript
   const envGrant = await context.envvarAdapter.get({ slug });
   if (envGrant !== null) {
     return envGrant;
   }
   ```
3. this is an internal interface - no external consumers
4. all changes shipped in a single commit - no migration period needed

### vaultAdapterOsEnvvar.ts (lines 71-117)

**inspected**: the get method returns `new KeyrackKeyGrant({...})` directly

**no backwards compat patterns found**:
- no `typeof result === 'string'` checks
- no `result instanceof KeyrackKeyGrant` fallbacks
- no wrapper that coerces old format to new

**conclusion**: clean break, as intended

### mechAdapterReplica.ts — ghs_* pattern removal

**inspected**: LONG_LIVED_PATTERNS no longer includes `ghs_`

**backwards compat added?** no — behavior simply changed

**why this is correct**:
- ghs_* tokens expire in 1 hour (GitHub App installation tokens)
- they were incorrectly classified as "long-lived"
- this is a bug fix: ephemeral tokens should not be blocked
- no "allow legacy ghs_* behavior" flag added

---

## open questions for wisher

none identified. all changes are:
1. internal interface changes (vault contract) — no external API
2. bug fixes (ghs_* validation) — correct behavior, not compat concern
3. additive (new CLI command) — no breakage

---

## conclusion

reviewed actual code in:
- `KeyrackHostVaultAdapter.ts:20` — return type change
- `vaultAdapterOsEnvvar.ts:71-117` — get implementation
- `getKeyrackKeyGrant.ts:44-46` — consumer usage

no backwards compat shims found. the vault contract change is a clean break with simultaneous consumer update. this is appropriate because:
1. the interface is internal (not published API)
2. all consumers are in the same codebase
3. all changes are in a single commit

no unnecessary backwards compat added.
