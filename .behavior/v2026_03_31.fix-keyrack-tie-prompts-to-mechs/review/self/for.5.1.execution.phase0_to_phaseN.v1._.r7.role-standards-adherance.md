# review: role-standards-adherance

## question

does the implementation follow the mechanic role briefs?
- code.prod patterns
- code.test patterns
- name conventions

## review

### code.prod patterns

#### fail-fast (rule.require.fail-fast)

all error paths use early return or throw:

```ts
// vaultAdapterAwsConfig.ts
if (!vaultAdapterAwsConfig.mechs.supported.includes(mech)) {
  throw new UnexpectedCodePathError(
    `aws.config does not support mech: ${mech}`,
    { ... }
  );
}
```

compliant: ✓

#### input-context pattern (rule.require.input-context-pattern)

all operations use (input, context?) signature:

```ts
acquireForSet: async (input: { keySlug: string }) => { ... }
deliverForGet: async (input: { source: string }) => { ... }
```

compliant: ✓

#### arrow functions (rule.require.arrow-only)

all procedures use arrow syntax:

```ts
export const mechAdapterReplica: KeyrackGrantMechanismAdapter = { ... };
export const inferKeyrackMechForSet = async (input: ...) => { ... };
```

compliant: ✓

#### immutable vars (rule.require.immutable-vars)

all variables use const:

```ts
const mech = input.mech ?? (await inferKeyrackMechForSet({ vault: ... }));
const mechAdapter = getMechAdapter(mech);
const { source } = await mechAdapter.acquireForSet({ keySlug: input.slug });
```

compliant: ✓

### code.test patterns

#### given-when-then (rule.require.given-when-then)

tests use test-fns pattern:

```ts
given('[case1] vault supports multiple mechs', () => {
  when('[t0] mech not supplied', () => {
    then('prompts via stdin', async () => { ... });
  });
});
```

compliant: ✓

### name conventions

#### no gerunds (rule.forbid.gerunds)

no gerunds in function names or variables:

| function | compliant |
|----------|-----------|
| acquireForSet | ✓ verb + prep |
| deliverForGet | ✓ verb + prep |
| validate | ✓ verb |

compliant: ✓

#### ubiqlang (rule.require.ubiqlang)

terms consistent with keyrack domain:
- vault = storage backend
- mech = credential mechanism
- source = stored credential
- secret = usable credential

compliant: ✓

### conclusion

implementation follows all mechanic role standards:
- fail-fast error paths
- input-context signatures
- arrow functions only
- immutable variables
- given-when-then tests
- no gerunds
- consistent domain terms
