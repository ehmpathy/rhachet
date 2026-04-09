# review: has-consistent-mechanisms

## question

for each mechanism adapter, ask:
- does it implement the same interface?
- does it follow the same patterns?
- are the method signatures consistent?

## review

### interface compliance

all mech adapters implement `KeyrackGrantMechanismAdapter`:

| mech | validate | acquireForSet | deliverForGet |
|------|----------|---------------|---------------|
| mechAdapterReplica | ✓ | ✓ | ✓ |
| mechAdapterGithubApp | ✓ | ✓ | ✓ |
| mechAdapterAwsSso | ✓ | ✓ | ✓ |

### method signatures

#### validate

all use: `(input: { source?: string; cached?: string }) => { valid: boolean; reasons?: string[] }`

| mech | source validation | cached validation |
|------|-------------------|-------------------|
| replica | checks long-lived patterns | same as source |
| githubApp | validates json structure | validates ghs_ prefix |
| awsSso | validates profile name format | validates credentials json |

#### acquireForSet

all use: `(input: { keySlug: string }) => Promise<{ source: string }>`

| mech | prompt behavior |
|------|-----------------|
| replica | prompts for secret via stdin |
| githubApp | prompts org → app → pem via stdin |
| awsSso | delegates to setupAwsSsoWithGuide |

#### deliverForGet

all use: `(input: { source: string }) => Promise<{ secret: string; expiresAt?: string }>`

| mech | transform behavior |
|------|-------------------|
| replica | identity (returns source as-is) |
| githubApp | json blob → ghs_ token via octokit |
| awsSso | profile name → credentials json via aws cli |

### vault adapter usage

all vault adapters that support multiple mechs use the same lookup pattern:

```ts
const getMechAdapter = (mech: KeyrackGrantMechanism): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>> = { ... };
  const adapter = adapters[mech];
  if (!adapter) throw new UnexpectedCodePathError(...);
  return adapter;
};
```

verified in:
- vaultAdapterOsSecure.ts
- vaultAdapterOsDirect.ts
- vaultAdapterAwsConfig.ts

### conclusion

all mechanisms follow consistent patterns:
- same interface implementation
- same method signatures
- same lookup pattern in vault adapters
