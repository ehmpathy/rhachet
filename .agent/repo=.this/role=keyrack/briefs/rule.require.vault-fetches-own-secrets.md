# rule.require.vault-fetches-own-secrets

## .what

each vault adapter fetches its own secrets, primarily via stdin. callers never supply secrets to vaults. the cli never passes secrets to vaults — users see prompts from vaults directly.

## .why

the shape, source, and type of secret depends on the vault. only the vault knows what to ask for and how to get it.

| vault | secret type | acquisition method |
|-------|-------------|-------------------|
| os.secure | plaintext credential | prompt via stdin |
| os.direct | plaintext credential | prompt via stdin |
| os.daemon | plaintext credential | prompt via stdin |
| os.envvar | n/a (read-only) | reads from process.env |
| 1password | n/a (read-only) | reads via `op` cli |
| aws.iam.sso | profile name | guided setup via stdin or exid |

callers cannot know what each vault needs. the vault knows. the vault manages how to get it.

## .contract

the `KeyrackHostVaultAdapter.set()` interface has no `secret` parameter:

```ts
set: (input: {
  slug: string;
  env: string;
  org: string;
  // ... other params
  // NO secret param — vault fetches its own
}) => Promise<void | { exid: string }>;
```

## .examples

### os.secure vault

```ts
set: async (input) => {
  // vault prompts for its own secret
  const secret = await promptHiddenInput({
    prompt: `enter secret for ${input.slug}: `,
  });
  // ... encrypt and store
};
```

### aws.iam.sso vault

```ts
set: async (input) => {
  // vault runs guided setup if no exid
  let profileName = input.exid ?? null;
  if (!profileName && process.stdin.isTTY) {
    const result = await setupAwsSsoWithGuide({ org: input.org });
    profileName = result.profileName;
  }
  // ... validate and return exid
};
```

## .benefits

- **separation of concerns** — cli does not know vault internals
- **extensibility** — new vaults can have any acquisition method
- **consistency** — all vaults follow the same contract
- **testability** — vaults can be tested in isolation

## .enforcement

- vault adapter `set()` that accepts `secret` as input = blocker
- caller that attempts to pass secret to vault = blocker
