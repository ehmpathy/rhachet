# ref: passphrase reuse for os.secure vaults

## .what

strategy for auto-unlock of os.secure vaults when passphrase matches keyrack passphrase.

## .why

- users may have multiple os.secure vaults (one per host manifest entry)
- a prompt for each passphrase separately is tedious
- if user CHOSE to reuse the keyrack passphrase, we can auto-unlock
- reduces friction while user choice is preserved

## .layers

```
┌─────────────────────────────────────────────┐
│ keyrack.host.yml.age                        │
│   unlocked via: keyrack passphrase          │
│   contains: host manifest + lockhash        │
├─────────────────────────────────────────────┤
│ os.secure vault A                           │
│   unlocked via: vault passphrase A          │
│   may match keyrack passphrase (user choice)│
├─────────────────────────────────────────────┤
│ os.secure vault B                           │
│   unlocked via: vault passphrase B          │
│   may match keyrack passphrase (user choice)│
├─────────────────────────────────────────────┤
│ 1password, bitwarden, etc                   │
│   unlocked via: their own mechanisms        │
│   no passphrase retention (external vaults) │
└─────────────────────────────────────────────┘
```

## .flow: set key into os.secure

```
user: rhx keyrack set --key X --vault os.secure --env sudo

keyrack prompts:
  "os.secure requires a passphrase to encrypt the secret."
  "options:"
  "  [1] reuse keyrack passphrase (auto-unlock when keyrack unlocked)"
  "  [2] use different passphrase (manual unlock required)"
  "choice: 1"

keyrack stores in keyrack.host.yml.age:
  hosts:
    ehmpathy.sudo.X:
      vault: os.secure
      exid: "path/to/encrypted.age"
      lockhash: "sha256:abc123..."  # enables auto-unlock if matches keyrack passphrase
```

## .flow: unlock key from os.secure

```
user: rhx keyrack unlock --env sudo --key X

keyrack:
  1. decrypt keyrack.host.yml.age (prompts for keyrack passphrase)
  2. find keyHost for X
  3. if vault === 'os.secure':
     a. check if lockhash matches via matchesLockhash(keyHost.lockhash, keyrackPassphrase)
     b. if match: auto-unlock os.secure vault with keyrack passphrase
     c. if no match: prompt for os.secure passphrase separately
  4. fetch secret from vault
  5. store in daemon
```

## .data model

```typescript
interface KeyrackKeyHost {
  slug: string;
  vault: KeyrackHostVault;  // 'os.secure' | '1password' | etc
  exid: string | null;
  mech: KeyrackGrantMechanism;
  env: string;
  org: string;

  // os.secure passphrase match support
  lockhash?: string;  // sha256 of passphrase (os.secure only)
}
```

## .lockhash

use sha256 for passphrase comparison:

```typescript
import { createHash } from 'crypto';

const toLockhash = (passphrase: string): string => {
  return `sha256:${createHash('sha256').update(passphrase).digest('hex')}`;
};

const matchesLockhash = (lockhash: string, passphrase: string): boolean => {
  return lockhash === toLockhash(passphrase);
};
```

## .security notes

**why hash, not store plaintext?**
- if someone decrypts keyrack.host.yml.age, they see hashes, not passphrases
- hash comparison reveals IF passphrases match, not WHAT they are
- limits damage from partial breach

**why only os.secure?**
- os.secure is local, under our control
- external vaults (1password, bitwarden) have their own unlock mechanisms
- we never retain passphrases for external vaults

**memory retention scope**
- keyrack passphrase: retained only for duration of single CLI command; never passed to daemon
- daemon receives decrypted keys, never the passphrase itself
- os.secure passphrase: used inline for auto-unlock check, then discarded
- other vault passphrases: never retained (prompt each time)

## .ux benefits

| scenario | prompts with reuse | prompts without |
|----------|-------------------|-----------------|
| 3 os.secure keys, same passphrase | 1 (keyrack) | 4 (keyrack + 3 vault) |
| 3 os.secure keys, different passwords | 4 | 4 |
| mixed vault types | 1 + external auth | 1 + external auth |

users who chose to reuse get streamlined ux; users who chose different passphrases get extra security.

## .implementation notes

- lockhash is only present for os.secure vault entries
- lockhash is set at `keyrack set` time based on user choice
- lockhash is compared at `keyrack unlock` time
- if comparison fails, fall back to a prompt for os.secure passphrase
- never store the actual passphrase, only the lockhash
