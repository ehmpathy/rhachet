# zoomin: age encryption + ssh key support

## .question

why can't we lookup or use an ssh key with age in JavaScript/node?

## .answer

we CAN — but not via the `age-encryption` npm package alone. there are multiple approaches.

---

## .age keys vs ssh keys

### what is an ssh key?

ssh keys are asymmetric keypairs designed for **authentication** (proving identity to servers).

| aspect | ssh-ed25519 | ssh-rsa |
|--------|-------------|---------|
| curve | Ed25519 (Curve25519) | RSA (prime factorization) |
| pubkey format | `ssh-ed25519 AAAA...` | `ssh-rsa AAAA...` |
| private key format | OpenSSH PEM (`-----BEGIN OPENSSH PRIVATE KEY-----`) | OpenSSH PEM |
| primary use | authentication | authentication |
| key size | 256 bits | 2048-4096 bits |

### what is an age key?

age keys are asymmetric keypairs designed for **encryption** (protecting data).

| aspect | age (native) |
|--------|--------------|
| curve | X25519 (Curve25519) |
| pubkey format | `age1...` (bech32 encoded) |
| private key format | `AGE-SECRET-KEY-1...` (bech32 encoded) |
| primary use | encryption |
| key size | 256 bits |

### the connection

**Ed25519 and X25519 use the same underlying curve (Curve25519).**

- Ed25519 = Curve25519 for **signatures** (authentication)
- X25519 = Curve25519 for **key exchange** (encryption)

this means:
- an Ed25519 ssh key can be **mathematically converted** to an X25519 age key
- the conversion is deterministic and reversible
- same entropy, different encoding and usage

### why age supports ssh keys

age's author (Filippo Valsorda) designed it to accept ssh public keys as recipients because:
1. developers already have ssh keys
2. no need to generate/manage another keypair
3. leverage extant key infrastructure

```bash
# age CLI can encrypt directly to ssh pubkey
age -R ~/.ssh/id_ed25519.pub secret.txt > secret.txt.age

# and decrypt with the ssh private key
age -d -i ~/.ssh/id_ed25519 secret.txt.age > secret.txt
```

---

## .the landscape

| package/tool | encrypt to ssh pubkey | decrypt with ssh private key | decrypt via ssh-agent |
|--------------|----------------------|------------------------------|----------------------|
| **age CLI** (Go binary) | ✅ | ✅ | ✅ |
| **age-encryption** (npm) | ✅ (claimed) | ❌ needs age identity | ❌ |
| **sops-age** (npm) | — | ✅ via conversion | ❌ |
| **ssh-to-age** (CLI) | — | ✅ via conversion | ❌ |

---

## .the gap

the `age-encryption` npm package is a WebAssembly port. it:
- CAN encrypt to ssh public keys (`ssh-ed25519 AAAA...` format)
- CANNOT decrypt using ssh-agent (no socket/protocol support in WASM)
- REQUIRES an "age identity" (`AGE-SECRET-KEY-...`) for decryption

the age CLI (Go binary) supports ssh-agent, but:
- requires installation (`brew install age`, etc.)
- not present on most developer machines
- we can't bundle it as a dependency

---

## .the solution: ssh key → age key conversion

the `sops-age` npm package solved this by converting ssh keys to age format at runtime:

```javascript
import { sshKeyToAge, sshKeyFileToAge } from 'sops-age';

// convert ssh private key content to age identity
const sshKeyContent = fs.readFileSync('~/.ssh/id_ed25519', 'utf8');
const ageIdentity = sshKeyToAge(sshKeyContent);
// returns: "AGE-SECRET-KEY-1..."

// or convert directly from file path
const ageIdentity = await sshKeyFileToAge('~/.ssh/id_ed25519');
```

### how conversion works

ed25519 ssh keys and age keys use the same underlying curve (Curve25519). the conversion:
1. parses the openssh private key format
2. extracts the ed25519 private scalar
3. encodes it as an age identity (bech32 format)

the math is identical — just the encoding differs.

### for public keys

```javascript
// ssh-ed25519 pubkey → age recipient
// the sops-age package or ssh-to-age tool can derive the age recipient from the ssh pubkey
```

---

## .implications for keyrack

### option A: use sops-age conversion

```typescript
import { sshKeyFileToAge } from 'sops-age';

const initKeyrack = async (input: { sshKeyPath?: string }) => {
  const sshPath = input.sshKeyPath ?? findDefaultSshKey();

  // convert ssh key to age identity (one-time, at init)
  const ageIdentity = await sshKeyFileToAge(sshPath);
  const ageRecipient = await age.identityToRecipient(ageIdentity);

  // store age identity to disk (protected same as ssh key)
  // encrypt manifest to age recipient
};
```

pros:
- uses extant ssh key (no new keypair to generate)
- developer's mental model: "my ssh key unlocks keyrack"
- portable: if they have their ssh key, they can unlock

cons:
- still stores an identity file to disk (derived from ssh key)
- if ssh key changes, must re-init

### option B: generate native age key (current implementation)

```typescript
const initKeyrack = async () => {
  const { identity, recipient } = await generateAgeKeyPair();
  // store identity to disk
  // encrypt manifest to recipient
};
```

pros:
- simpler (no ssh parsing)
- independent of ssh key changes

cons:
- another key to manage
- doesn't leverage extant ssh key

### option C: hybrid (recommended)

```typescript
const initKeyrack = async (input: { pubkey?: string }) => {
  // generate age keypair for decryption
  const { identity, recipient } = await generateAgeKeyPair();

  // if user provides ssh pubkey, add as additional recipient
  const recipients = [recipient];
  if (input.pubkey?.startsWith('ssh-')) {
    recipients.push(input.pubkey); // age can encrypt to ssh pubkeys
  }

  // encrypt manifest to all recipients
  // store age identity for decryption
  // ssh pubkey serves as backup (decryptable by age CLI)
};
```

pros:
- always works (age identity for decryption)
- ssh pubkey as backup recipient for age CLI users
- aligns with multi-recipient design in blueprint

---

## .passphrase-protected ssh keys

if the ssh key has a passphrase:
- `sops-age` prompts for the passphrase when converting
- once converted to age identity, no further passphrase needed
- the age identity file becomes the "unlocked" form

keyrack could:
1. prompt once at init to decrypt ssh key
2. store derived age identity (protected by filesystem permissions)
3. never prompt again

---

## .sources

- [age-encryption npm](https://www.npmjs.com/package/age-encryption)
- [sops-age npm](https://github.com/humphd/sops-age/) — JavaScript library with ssh key conversion
- [ssh-to-age](https://github.com/Mic92/ssh-to-age) — CLI tool for conversion
- [age ssh-agent discussion #244](https://github.com/FiloSottile/age/discussions/244) — explains why ssh-agent not in WASM
- [agessh Go package](https://pkg.go.dev/filippo.io/age/agessh) — reference implementation

---

## .recommendation for keyrack

use **option C (hybrid)**:

1. `keyrack init` generates native age keypair
2. `keyrack init --pubkey ~/.ssh/id_ed25519.pub` adds ssh pubkey as additional recipient
3. manifest encrypted to all recipients
4. decryption uses age identity (stored locally)
5. age CLI users can decrypt with their ssh key as fallback

this aligns with the blueprint's multi-recipient design while avoiding the complexity of ssh key parsing and passphrase handling.

alternatively, if we want the "use my ssh key" UX:

1. add `sops-age` as dependency
2. `keyrack init --ssh ~/.ssh/id_ed25519` converts ssh key to age identity
3. store derived age identity (not the original ssh key)
4. decryption uses derived identity

both approaches work. the hybrid is more flexible; the conversion approach is closer to the blueprint's vision.
