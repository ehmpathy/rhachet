# review: has-pruned-backcompat

## question

for each component in the code, ask:
- did we add backwards compatibility shims?
- did we preserve old interfaces "just in case"?
- did we add deprecation warnings instead of deletion?
- did we keep unused exports for consumers?

per memory: never add backwards compat, just delete.

## review

### deletions verified

| deleted | why deleted | backcompat added? |
|---------|-------------|-------------------|
| `aws.iam.sso/` vault directory | renamed to `aws.config/` | no — directory deleted, not aliased |
| `inferMechFromVault.ts` | incompatible with multi-mech vaults | no — file deleted entirely |
| `setupAwsSsoWithGuide.ts` in vault dir | moved to mech adapter | no — file deleted, logic moved |
| `translate` method name | renamed to `deliverForGet` | no — old name removed |

### renames verified

| before | after | shim added? |
|--------|-------|-------------|
| `aws.iam.sso` vault | `aws.config` vault | no shim |
| `translate` method | `deliverForGet` | no alias |
| `promptForSet` | `acquireForSet` | no alias |

### interface changes verified

| interface | change | deprecation added? |
|-----------|--------|-------------------|
| `KeyrackGrantMechanismAdapter` | added `acquireForSet`, renamed `translate` | no deprecation warnings |
| `KeyrackHostVaultAdapter` | added `mechs.supported` | no fallback for absent field |

### patterns confirmed

| pattern | status |
|---------|--------|
| no `@deprecated` annotations | ✓ none found |
| no `// legacy:` comments | ✓ none found |
| no re-exports of old names | ✓ none found |
| no shim functions | ✓ none found |
| no version checks | ✓ none found |

### conclusion

no backwards compatibility detected.

all changes are clean breaks:
- old code deleted, not deprecated
- old names removed, not aliased
- old interfaces replaced, not shimmed
