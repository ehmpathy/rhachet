# howto.test-without-age-cli

## .what

tests must NOT require the `age` CLI. use passwordless ssh ed25519 keys converted to age format.

## .why

- ci installs `age` but local dev may not have it
- tests should work on any machine without extra setup
- passwordless ssh keys can be decoded via npm library

## .the two encryption paths

| recipient mech | encryption path | cli required? |
|----------------|-----------------|---------------|
| `mech: 'age'` | `age-encryption` npm library | no |
| `mech: 'ssh'` | shells out to `age` cli | yes |

the dispatch logic in `ageRecipientCrypto.ts`:

```typescript
// if all recipients are native age (mech: 'age'), use npm library
const hasSshRecipient = input.recipients.some((r) => r.mech === 'ssh');
if (!hasSshRecipient) {
  // npm library path — no CLI needed
}
// if any recipient is ssh, use age CLI for all
return encryptWithAgeCLI({ ... });
```

## .the pattern

### 1. use passwordless ssh ed25519 test keys

test keys at `src/.test/assets/keyrack/ssh/` have no password. this enables seed extraction without passphrase prompt.

### 2. convert ssh key to age format

```typescript
import { extractEd25519Seed } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { ed25519SeedToAgeIdentity, ed25519SeedToAgeRecipient } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';

const TEST_SSH_KEY = readFileSync(TEST_SSH_PRIKEY_PATH, 'utf8');

// extract seed from passwordless ssh key
const seed = extractEd25519Seed({ keyContent: TEST_SSH_KEY });

// convert to age identity (for decryption)
const identity = ed25519SeedToAgeIdentity({ seed });

// convert to age recipient (for encryption)
const recipient = ed25519SeedToAgeRecipient({ seed });
```

### 3. create recipients with `mech: 'age'`

```typescript
const recipient = new KeyrackKeyRecipient({
  mech: 'age',           // <-- uses npm library, no CLI
  pubkey: ageRecipient,  // age1... format
  label: 'test-key',
  addedAt: new Date().toISOString(),
});
```

## .example from extant tests

from `daoKeyrackHostManifest/index.integration.test.ts`:

```typescript
const getTestSshKeyAgeIdentity = (): string => {
  const seed = extractEd25519Seed({ keyContent: TEST_SSH_KEY });
  return ed25519SeedToAgeIdentity({ seed });
};

const getTestSshKeyAgeRecipient = (): string => {
  const seed = extractEd25519Seed({ keyContent: TEST_SSH_KEY });
  return ed25519SeedToAgeRecipient({ seed });
};

// use age recipient format (not ssh pubkey)
const recipient = new KeyrackKeyRecipient({
  mech: 'age',
  pubkey: getTestSshKeyAgeRecipient(),
  label: 'test-key',
  addedAt: new Date().toISOString(),
});
```

## .antipattern

```typescript
// bad — uses ssh pubkey directly, triggers CLI path
const sshPubkey = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf8').trim();

const recipient = new KeyrackKeyRecipient({
  mech: 'ssh',           // <-- requires age CLI!
  pubkey: sshPubkey,     // ssh-ed25519 format
  label: 'ssh-key',
  addedAt: new Date().toISOString(),
});
```

## .when to use

- all unit tests
- all integration tests
- any test that encrypts/decrypts with age

## .exception: --stanza ssh tests

the `--stanza ssh` feature forces `mech: 'ssh'` by design. tests for this feature require age CLI.

these tests:
- fail locally if age CLI not installed
- pass in CI (where age is installed)

this is acceptable because:
- the feature under test inherently requires age CLI
- test skips are forbidden (failhide)
- the failure message is clear ("age: not found")
- developers can `brew install age` or `apt install age` if needed

## .enforcement

- test fails with `age: not found` on most tests = blocker
- test for `--stanza ssh` fails with `age: not found` = acceptable (cli-only feature)

## .see also

- `src/.test/assets/keyrack/ssh/` — passwordless test keys
- `src/domain.operations/keyrack/adapters/ageRecipientCrypto.ts` — conversion utilities
- `src/access/daos/daoKeyrackHostManifest/index.integration.test.ts` — reference implementation
