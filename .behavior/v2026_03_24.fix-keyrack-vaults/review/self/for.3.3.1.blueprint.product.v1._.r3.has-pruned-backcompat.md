# self-review: has-pruned-backcompat

## stone
3.3.1.blueprint.product.v1

## question
did we add backwards compatibility that was not explicitly requested?

## review

### KeyrackGrantMechanism type union

the blueprint adds two new mech values:
- EPHEMERAL_SESSION
- PERMANENT_VIA_EXID

**backwards compat concern?** no — this is additive. extant code continues to work. new values only used by new vaults.

**verdict:** no backcompat hack here.

### deprecated mech values in the type

the blueprint shows deprecated values:
```
| 'REPLICA'                    // deprecated
| 'GITHUB_APP'                 // deprecated
| 'AWS_SSO';                   // deprecated
```

**question:** was keeping these deprecated values explicitly requested?

**analysis:** the vision doesn't mention deprecation. the blueprint just documents extant state — these values already exist. the blueprint doesn't add or remove them.

**verdict:** documents extant state, not a backcompat hack we added.

### KeyrackHostVaultAdapter interface

the interface is marked [retain]:
```typescript
interface KeyrackHostVaultAdapter {
  set: (input) => Promise<void | { exid: string }>;  // note: can return exid
}
```

**question:** is return type change from `Promise<void>` to `Promise<void | { exid: string }>` backwards compatible?

**analysis:** extant callers expect `void` return. new return type is a superset — callers that ignore return value continue to work. callers that need exid (1password) will use the new shape.

**verdict:** backwards compatible by design. no hack added.

### os.daemon: no manifest write

**question:** is manifest write skip backwards compatible?

**analysis:** os.daemon is a new vault. no extant code expects manifest entries for os.daemon. no backwards compat concern.

**verdict:** new feature, no backcompat needed.

### 1password: stores exid in manifest

**question:** does exid storage in host manifest affect extant code?

**analysis:** 1password vault exists but throws on set(). extant manifest format supports exid field (used by other adapters). no schema change needed.

**verdict:** uses extant schema. no backcompat concern.

## issues found

none. no backwards compatibility hacks were added.

## verdict

the blueprint adds new features without backcompat hacks. extant code continues to work. new mech values are additive. new vault behaviors use extant patterns.
