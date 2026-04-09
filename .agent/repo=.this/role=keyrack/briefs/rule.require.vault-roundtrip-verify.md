# rule.require.vault-roundtrip-verify

## .what

vault adapters must verify roundtrip on set: write credential, read back, confirm decryption works.

## .why

without verification:
- credential could be written but unreadable (wrong recipients, corrupt file)
- user discovers failure only at unlock time
- debug is harder (set worked, unlock fails... why?)

with verification:
- fail fast at set time if error occurred
- user confidence that stored credential is usable
- clear feedback loop

## .pattern

use the `verifyRoundtripDecryption` domain operation:

```typescript
import { verifyRoundtripDecryption } from '@src/domain.operations/keyrack/verifyRoundtripDecryption';

// vault.set implementation
set: async (input, context?: ContextKeyrack) => {
  // ... acquire secret from mech ...
  // ... encrypt and write ...

  // roundtrip verification
  const { verified } = await verifyRoundtripDecryption(
    {
      expected: {
        ciphertext: readFileSync(path, 'utf8'),
        plaintext: secret,
      },
      owner,
    },
    context,
  );

  if (!verified) {
    throw new UnexpectedCodePathError(
      'roundtrip verification failed',
      {
        slug: input.slug,
        hint: 'no identity could decrypt the credential',
      },
    );
  }

  return { mech };
}
```

the domain operation follows `(input, context)` pattern:
- input: `{ expected: { ciphertext, plaintext }, owner }`
- context: optional `ContextKeyrack` for identity discovery
- builds identity pool from context (prescribed + discovered)
- tries each identity until one decrypts successfully
- returns `{ verified: boolean }`

## .when

all vault adapters that store secrets must verify roundtrip:
- os.secure — decrypt with discovered identity
- 1password — fetch back with op cli

## .exception

vaults that are inherently verified need not re-verify:
- os.direct — plaintext, read === write
- os.daemon — in-memory, no persistence layer

## .see also

- `verifyRoundtripDecryption.ts` — shared domain operation for roundtrip verification
- `rule.require.context-for-identity.md` — why operations must receive ContextKeyrack
- `howto.pty-visual-space.md` — visual space for verification output
