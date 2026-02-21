# compare: sops-age vs age-encryption

## .summary

| aspect | age-encryption | sops-age |
|--------|---------------|----------|
| purpose | core age encrypt/decrypt | sops file decrypt + key discovery |
| ssh key support | encrypt only (claimed) | full: convert ssh → age identity |
| key discovery | none | auto-discovers ~/.ssh/id_ed25519, etc |
| passphrase support | none | prompts for passphrase-protected keys |
| dependencies | noble crypto, web crypto | age-encryption + ssh key parser |
| size | ~50kb | ~100kb (includes age-encryption) |
| runtime | node, deno, bun, browser | node, deno, bun, browser |

---

## .age-encryption

the core WebAssembly port of age.

```typescript
import * as age from 'age-encryption';

// generate native age keypair
const identity = await age.generateIdentity();
const recipient = await age.identityToRecipient(identity);

// encrypt
const encrypter = new age.Encrypter();
encrypter.addRecipient(recipient);  // age1... format
const ciphertext = await encrypter.encrypt('secret');

// decrypt
const decrypter = new age.Decrypter();
decrypter.addIdentity(identity);  // AGE-SECRET-KEY-... format
const plaintext = await decrypter.decrypt(ciphertext);
```

### what it does well
- native age key generation
- multi-recipient encryption
- armor/dearmor (ascii-safe format)
- small footprint

### what it lacks
- no ssh key → age identity conversion
- no ssh-agent integration
- no key discovery
- no passphrase prompt

---

## .sops-age

built on top of age-encryption for sops integration.

```typescript
import {
  sshKeyToAge,
  sshKeyFileToAge,
  findAllAgeKeys,
  decryptToString
} from 'sops-age';

// convert ssh private key to age identity
const sshContent = fs.readFileSync('~/.ssh/id_ed25519', 'utf8');
const ageIdentity = sshKeyToAge(sshContent);
// returns: "AGE-SECRET-KEY-1..."

// or from file path (handles passphrase prompt)
const ageIdentity = await sshKeyFileToAge('~/.ssh/id_ed25519');

// auto-discover all age keys (env vars + ssh keys)
const keys = await findAllAgeKeys();
// checks: SOPS_AGE_KEY, SOPS_AGE_KEY_FILE, ~/.ssh/id_ed25519, ~/.ssh/id_rsa

// decrypt sops file (tries all discovered keys)
const plaintext = await decryptToString(ciphertext);
```

### what it does well
- ssh key → age identity conversion (ed25519, rsa)
- key discovery from standard locations
- passphrase prompt for protected keys
- sops file format support
- tries multiple keys until one works

### what it lacks
- sops-specific (heavier than needed for just key conversion)
- bundles more than we need

---

## .for keyrack

### if we use age-encryption only

```typescript
// must generate new age keypair
const { identity, recipient } = await generateAgeKeyPair();

// store identity to disk
writeFileSync(identityPath, identity);

// user has another key to manage
```

### if we add sops-age

```typescript
// can convert user's ssh key to age identity
const ageIdentity = await sshKeyFileToAge('~/.ssh/id_ed25519');

// user's mental model: "my ssh key unlocks keyrack"
// but we still store the derived identity
```

### if we extract just the conversion logic

sops-age's ssh key conversion is ~200 lines. we could:
1. vendor just that logic
2. or implement it ourselves (ed25519 curve math is well-documented)

---

## .recommendation

for keyrack, we have three paths:

| path | pros | cons |
|------|------|------|
| age-encryption only | simple, small | user manages separate age key |
| add sops-age | ssh key conversion works | heavier dependency |
| vendor conversion | minimal footprint | maintenance burden |

the hybrid approach from the prior brief (generate age key, accept ssh pubkey as backup recipient) uses only age-encryption and sidesteps the complexity.
