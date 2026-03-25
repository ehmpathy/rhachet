# self-review: has-consistent-conventions (revision 7)

## stone
3.3.1.blueprint.product.v1

## context
r6 confirmed convention fix. subsequent user feedback refined mech names:
1. os.daemon should use extant `EPHEMERAL_VIA_REPLICA` — "in memory IS a replica"
2. 1password should use `PERMANENT_VIA_REFERENCE` — clearer than EXID
3. deprecated aliases must be removed — "fullstop no unprescribed backcompat"

## changes applied

### mech names
- os.daemon: `EPHEMERAL_VIA_REPLICA` (extant mech, no new type needed)
- 1password: `PERMANENT_VIA_REFERENCE` (new mech)

### deprecated aliases removed
removed from blueprint:
- `REPLICA`
- `GITHUB_APP`
- `AWS_SSO`

### files updated
- 3.3.1.blueprint.product.v1.i1.md
- 1.vision.md
- 2.1.criteria.blackbox.md

## verification

| mech | follows convention? | notes |
|------|---------------------|-------|
| EPHEMERAL_VIA_REPLICA | yes | extant: os.daemon (session-scoped) |
| PERMANENT_VIA_REFERENCE | yes | new: 1password |

| removed | reason |
|---------|--------|
| REPLICA | deprecated alias, no backcompat |
| GITHUB_APP | deprecated alias, no backcompat |
| AWS_SSO | deprecated alias, no backcompat |

## KeyrackGrantMechanism (final)

```typescript
type KeyrackGrantMechanism =
  | 'PERMANENT_VIA_REPLICA'      // os.secure, os.direct
  | 'EPHEMERAL_VIA_REPLICA'      // os.daemon (session-scoped)
  | 'EPHEMERAL_VIA_GITHUB_APP'
  | 'EPHEMERAL_VIA_AWS_SSO'
  | 'EPHEMERAL_VIA_GITHUB_OIDC'
  | 'PERMANENT_VIA_REFERENCE';   // 1password
```

## verdict

all mechs follow `{DURATION}_VIA_{METHOD}` convention. deprecated aliases removed.
