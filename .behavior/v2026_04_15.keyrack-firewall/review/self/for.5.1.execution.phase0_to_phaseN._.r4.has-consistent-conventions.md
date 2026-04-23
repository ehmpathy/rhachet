# consistent conventions review (r4) — keyrack firewall

## review question

for each name choice in the code, ask:
- what name conventions does the codebase use?
- do we use a different namespace, prefix, or suffix pattern?
- do we introduce new terms when prior terms exist?
- does our structure match prior patterns?

---

## deep code inspection

### transformer (`as*`) return types

**inspected**: all `as*` transformers in `keyrack/` directory

| function | return type |
|----------|-------------|
| `asKeyrackKeyName` | `string` |
| `asKeyrackKeyEnv` | `string` |
| `asKeyrackKeyOrg` | `string` |
| `asKeyrackKeySlug` | `string` |
| `asDurationMs` | `number` |
| `asExpiresInMinutes` | `number \| null` |
| `asShellEscapedSecret` | `string` |
| `asKeyrackSlugParts` (NEW) | `{ org, env, keyName }` |
| `asKeyrackFirewallSource` (NEW) | `KeyrackFirewallSource` |

**observation**: most `as*` return primitives, but object returns are acceptable (see `asKeyrackSlugParts`)

**conclusion**: both new transformers follow the `as*` convention — convert input to structured output.

### error convention

**inspected**: `asKeyrackFirewallSource.ts` lines 24-62

```typescript
throw new ConstraintError('invalid --from slug format', {
  slug: input.slug,
  hint: 'expected format: json(env://VAR) or json(stdin://*)',
  examples: ['json(env://SECRETS)', 'json(stdin://*)'],
});
```

**compared to**: `assertKeyrackEnvIsSpecified.ts`

```typescript
throw new ConstraintError(
  '--env must be specified to perform keyrack operations',
  { hint: '...' }
);
```

**conclusion**: follows prior `ConstraintError` pattern with `hint` and context fields.

### doc comment convention

**inspected**: `asKeyrackFirewallSource.ts` lines 11-18

```typescript
/**
 * .what = parse --from slug into structured source descriptor
 * .why = enables extensible input sources for keyrack firewall CLI
 *
 * supported formats:
 *   json(env://VAR)   - read JSON from env var VAR
 *   json(stdin://*)   - read JSON from stdin
 */
```

**compared to**: `asKeyrackKeyOrg.ts` lines 1-4

```typescript
/**
 * .what = extract org from env-scoped slug
 * .why = fill needs org to store keys under correct org
 */
```

**conclusion**: follows `.what`/`.why` doc comment convention with optional details.

### interface definition

**inspected**: `asKeyrackFirewallSource.ts` lines 3-9

```typescript
type KeyrackFirewallSourceType = 'env' | 'stdin';

export interface KeyrackFirewallSource {
  type: KeyrackFirewallSourceType;
  format: 'json';
  envVar?: string;
}
```

**compared to**: domain objects in `domain.objects/keyrack/`

**conclusion**: interface is co-located with transformer. this is acceptable for internal types not shared across multiple files.

---

## conclusion

all new components follow prior conventions:

1. **`asKeyrackSlugParts`**: `as*` prefix for transformer, returns structured object (same as prior pattern)

2. **`asKeyrackFirewallSource`**: `as*` prefix, follows error convention (`ConstraintError` + `hint`), follows doc comment convention (`.what`/`.why`)

3. **`inferKeyrackMechForGet`**: `inferKeyrack*For*` prefix, matches `inferKeyrackMechForSet` and `inferKeyrackEnvForSet`

4. **`getKeyrackFirewallOutput`**: `get*` prefix for orchestrator that does I/O (not pure formatter)

no convention divergences found.
