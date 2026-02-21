# vision: key-based locks for keyrack

## .what

eliminate passphrase-based encryption for keyrack entirely. use key-based locks instead, per age's philosophy.

---

## .domain distillation

### the four "keys" in keyrack

keyrack has four distinct concepts that all involve "keys" — clarity requires precise terms:

| term | what it is | where it lives | lifecycle |
|------|-----------|----------------|-----------|
| **KeyrackKeyRecipient** | key that can decrypt the host manifest | ssh-agent, keychain, yubikey | long-lived (years) |
| **KeyrackKeySpec** | specification of a credential the project needs | keyrack.yml (repo) | project lifetime |
| **KeyrackKeyHost** | config for how to fetch a credential on this host | keyrack.host.yml.age | machine lifetime |
| **KeyrackKeyGrant** | the actual credential value after fetch | daemon memory | session (TTL) |

### mental model

```
KeyrackKeyRecipient (your ssh key, yubikey, etc)
  └─> unlocks keyrack.host.yml.age
        └─> contains KeyrackKeyHost entries (vault pointers)
              └─> fetch from vaults
                    └─> produces KeyrackKeyGrant (actual secrets)
                          └─> stored in daemon with TTL

KeyrackKeySpec (in keyrack.yml)
  └─> declares what credentials the project needs
        └─> matched against KeyrackKeyHost to determine what to unlock
```

### why "Recipient" for the unlock key

follows age's terminology:
- age encrypts TO **recipients** (public keys)
- age decrypts WITH **identities** (private keys)
- keyrack tracks **recipients** who can decrypt the manifest

`KeyrackKeyRecipient` matches age's model: **the recipient of the encrypted manifest**.

### comparison

| concept | analogy | purpose |
|---------|---------|---------|
| **KeyrackKeyRecipient** | your house key | proves you can enter |
| **KeyrackKeySpec** | requirements list | declares what's needed |
| **KeyrackKeyHost** | cabinet labels | says where to find each item |
| **KeyrackKeyGrant** | the actual item | the secret itself, in hand |

### security implication

**the manifest is exactly as secure as your recipient key.**

| recipient key mech | manifest security |
|-----------------|-------------------|
| software ssh key | compromised if machine compromised |
| YubiKey-backed ssh | requires physical possession + touch |
| passkey-backed | requires biometric + device |
| passphrase (legacy) | as weak as the passphrase (~40 bits) |

key-based access is stronger than passphrase because:
- 256-bit random entropy (not human-chosen)
- can be hardware-bound (non-extractable)
- can require physical presence (touch)

### domain object definitions

```typescript
/**
 * mechanism for recipient key storage/access
 */
type KeyrackKeyRecipientMech = 'ssh' | 'age' | 'yubikey' | 'passkey' | 'keychain';

/**
 * a recipient who can decrypt the host manifest
 * - public key stored in manifest's recipients array
 * - private key lives in ssh-agent, keychain, yubikey, etc
 * - NOT a credential — it's the key that grants access to credentials
 */
interface KeyrackKeyRecipient {
  mech: KeyrackKeyRecipientMech;  // how this key is stored/accessed
  pubkey: string;                 // e.g., "ssh-ed25519 AAAA..."
  label: string;                  // e.g., "macbook", "yubikey-backup"
  addedAt: string;                // iso timestamp
}

/**
 * specification of a credential in the repo manifest (keyrack.yml)
 * - visible to everyone who clones the repo
 * - declares WHAT the project needs, not HOW to get it
 */
interface KeyrackKeySpec {
  slug: string;             // e.g., "ehmpathy.prod.AWS_PROFILE"
  env: string;              // e.g., "prod", "sudo"
  name: string;             // e.g., "AWS_PROFILE"
  mech: KeyrackGrantMechanism;
}

/**
 * configuration for how to fetch a credential on this host
 * - stored in encrypted host manifest (keyrack.host.yml.age)
 * - machine-specific: points to vaults, stores exids
 */
interface KeyrackKeyHost {
  slug: string;
  env: string;
  org: string;
  vault: KeyrackHostVault;  // e.g., "1password", "os.secure"
  exid: string | null;      // vault-specific identifier
}

/**
 * the actual credential value after fetch from vault
 * - stored in daemon memory with TTL
 * - session-scoped, purged on relock or expiry
 */
interface KeyrackKeyGrant {
  slug: string;
  env: string;
  org: string;
  key: KeyrackKey;          // the actual secret value
  expiresAt: number;
}
```

---

## .recipient key extensibility

### the abstraction

keyrack doesn't care what backs the recipient key — it only needs:
1. a **public key** to encrypt the manifest TO
2. an **identity source** that can decrypt

any technology that provides these can be a recipient key.

### current support

| technology | how it works | keyrack sees |
|------------|--------------|--------------|
| **ssh key (software)** | key in ~/.ssh/, loaded into ssh-agent | ssh public key |
| **ssh key (YubiKey PIV)** | key in YubiKey PIV slot, accessed via ssh-agent | ssh public key |
| **age key** | key in ~/.config/age/key.txt | age public key |
| **YubiKey (age plugin)** | key in YubiKey, accessed via age-plugin-yubikey | age public key |

### future support

| technology | how it would work | keyrack sees |
|------------|-------------------|--------------|
| **passkey** | PRF extension derives key, age-plugin-passkey wraps it | age public key |
| **tpm** | key bound to tpm, age-plugin-tpm wraps it | age public key |
| **cloud kms** | key in aws/gcp kms, age-plugin-kms wraps it | age public key |
| **any future tech** | plugin wraps it as age identity | age public key |

### why this works

age's plugin architecture means:
1. new key technologies get age plugins
2. keyrack uses age
3. keyrack automatically supports new technologies

keyrack doesn't need to know about YubiKeys, passkeys, or TPMs. it just needs age to support them — and age's plugin system handles that.

### the invariant

```
any KeyrackKeyRecipient
  └─> resolves to age recipient (public key)
        └─> age encrypts manifest TO recipient
  └─> resolves to age identity (private key source)
        └─> age decrypts manifest WITH identity
```

keyrack operates at the age layer. all layers below (ssh, yubikey, passkey, tpm) are age's concern.

### diagram

```
┌─────────────────────────────────────────────────────────┐
│                     keyrack                             │
│  (only knows about age recipients and identities)       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       age                               │
│  (handles encryption/decryption, plugin dispatch)       │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  ssh-agent  │   │ age-plugin- │   │ age-plugin- │
│  (ssh keys) │   │  yubikey    │   │  passkey    │
└─────────────┘   └─────────────┘   └─────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ software key│   │  YubiKey    │   │  platform   │
│ or YubiKey  │   │  hardware   │   │  or hardware│
│    PIV      │   │             │   │  authenticator│
└─────────────┘   └─────────────┘   └─────────────┘
```

### implication

when passkeys mature and `age-plugin-passkey` exists:
- keyrack gains passkey support with zero code changes
- users run `keyrack init --recipient passkey`
- manifest encrypted to passkey-derived age identity
- unlock via biometric

same for TPM, cloud KMS, or any future technology — as long as there's an age plugin.

---

## .the problem with passphrases

passphrases have fundamental weaknesses:

| weakness | consequence |
|----------|-------------|
| **human-chosen** | predictable, dictionary-attackable |
| **reused** | compromise one system → compromise many |
| **typed** | exposed via shoulder-surf, keylogger, `ps` |
| **remembered** | forgotten, written down, shared |
| **slow to verify** | key derivation (argon2/scrypt) adds latency |

age's answer: **don't use passphrases. use keys.**

---

## .the key-based alternative

### how it works

```
current (passphrase):
  user types passphrase → argon2 → decryption key → decrypt keyrack.host.yml.age

proposed (key-based):
  key stored in secure location → decrypt keyrack.host.yml.age
```

### where to store the key

the key must be protected. options:

| storage | protection mechanism | availability |
|---------|---------------------|--------------|
| **os keychain** | login password + secure enclave | macos, linux (secret-service), windows |
| **ssh-agent** | already protected, already active | universal (dev machines) |
| **gpg-agent** | already protected, already active | common (gpg users) |
| **hardware token** | physical possession + pin | yubikey, etc |
| **tpm** | hardware-bound, non-extractable | modern laptops |

### recommended: ssh-agent integration

developers already have ssh keys. ssh-agent is already active. leverage it:

```bash
# keyrack uses your ssh key to derive encryption key
# no new secrets to manage
# no new passwords to remember

keyrack unlock --env sudo --key X
# → finds ssh key in agent
# → derives encryption key via ECDH or signature
# → decrypts keyrack.host.yml.age
# → loads credential into daemon
```

---

## .benefits

### 1. no passphrase to leak

| attack vector | passphrase | key-based |
|---------------|------------|-----------|
| shell history | ✗ possible (`--passphrase`) | n/a |
| process list | ✗ possible (`echo pass \|`) | n/a |
| shoulder surf | ✗ possible | n/a |
| keylogger | ✗ possible | n/a |
| brute force | ✗ possible (weak passphrase) | ✓ infeasible (256-bit key) |

### 2. no passphrase to remember

| scenario | passphrase | key-based |
|----------|------------|-----------|
| forgot passphrase | locked out, must rebuild | n/a |
| passphrase rotation | re-encrypt everything | n/a |
| onboard new machine | remember or transfer passphrase | generate new key, add as recipient |

### 3. no passphrase to type

| workflow | passphrase | key-based |
|----------|------------|-----------|
| unlock sudo key | type passphrase | automatic (agent) |
| unlock in automation | pipe passphrase (risky) | automatic (agent) |
| unlock in ci | store passphrase (risky) | deploy key |

### 4. stronger security

| property | passphrase | key-based |
|----------|------------|-----------|
| entropy | ~40 bits (typical) | 256 bits |
| derivation | slow (argon2 needed) | instant |
| uniqueness | often reused | always unique |
| randomness | human-biased | cryptographically random |

### 5. leverage prior infrastructure

| integration | benefit |
|-------------|---------|
| ssh-agent | already active, already protected, already backed up |
| gpg-agent | already active for gpg users |
| os keychain | protected by login, hardware-backed on modern systems |
| hardware tokens | yubikey users get hardware-bound keys |

---

## .commands

### keyrack init

initialize keyrack with a recipient.

```bash
# with default ssh key (recommended)
keyrack init --recipient ssh
# → finds ~/.ssh/id_ed25519 (or id_rsa, etc)
# → creates keyrack.host.yml.age encrypted to that key
# → records recipient in manifest

# with explicit ssh key path
keyrack init --recipient ~/.ssh/id_ed25519_work
# → uses specified key's public key
# → creates keyrack.host.yml.age encrypted to that key

# with explicit public key
keyrack init --recipient "ssh-ed25519 AAAA... label"
# → uses provided public key directly
# → creates keyrack.host.yml.age encrypted to that key

# with yubikey (age-plugin-yubikey)
keyrack init --recipient yubikey
# → runs age-plugin-yubikey to get recipient
# → creates keyrack.host.yml.age encrypted to yubikey
# → unlock requires physical touch

# with os keychain (generates dedicated key)
keyrack init --recipient keychain
# → generates new age key
# → stores private key in os keychain (macos: Keychain, linux: secret-service)
# → creates keyrack.host.yml.age encrypted to that key
```

the `--recipient` flag accepts:
- `ssh` → default ssh key from ~/.ssh/
- `~/.ssh/path` → explicit ssh key path (reads .pub)
- `"ssh-ed25519 AAAA..."` → explicit public key string
- `yubikey` → age-plugin-yubikey
- `keychain` → dedicated key in os keychain
- future: `passkey`, `tpm`, etc

### keyrack recipient

manage recipients (who can decrypt the manifest).

```bash
# add a recipient
keyrack recipient set --pubkey "ssh-ed25519 AAAA... macbook"
# → re-encrypts manifest to include new recipient
# → both keys can now decrypt

# add from pubkey file
keyrack recipient set --pubkey-file ~/.ssh/id_ed25519_backup.pub
# → reads public key from file
# → re-encrypts manifest to include it

# list recipients
keyrack recipient get
# → shows all recipients that can decrypt manifest

# remove a recipient by fingerprint
keyrack recipient del --fingerprint "SHA256:abc123..."
# → re-encrypts manifest WITHOUT that recipient
# → that key can no longer decrypt

# remove by label
keyrack recipient del --label "old-laptop"
# → finds recipient by label, removes it
```

**key rotation** is just `recipient set` + `recipient del`:
```bash
# add new key
keyrack recipient set --pubkey-file ~/.ssh/id_ed25519_new.pub

# remove old key
keyrack recipient del --label "old-laptop"
```

no separate `rotate` command needed — the operations are atomic individually.

### keyrack set

add a credential to the host manifest.

```bash
keyrack set --key GITHUB_TOKEN --env sudo --org @this --vault 1password
# → decrypts manifest (via recipient key)
# → prompts for 1password item path
# → stores KeyrackKeyHost entry
# → re-encrypts manifest
# → if env !== 'sudo': also adds to keyrack.yml
```

### keyrack unlock

unlock credentials for use.

```bash
# unlock specific sudo key
keyrack unlock --env sudo --key GITHUB_TOKEN
# → decrypts manifest (via recipient key in agent)
# → fetches credential from vault
# → stores in daemon with 30min TTL

# unlock all keys for an env
keyrack unlock --env prod
# → decrypts manifest
# → fetches all prod credentials
# → stores in daemon with 9h TTL
```

### keyrack get

retrieve an unlocked credential.

```bash
keyrack get --key GITHUB_TOKEN --env sudo
# → queries daemon
# → returns credential value

keyrack get --key GITHUB_TOKEN --env sudo --output json
# → returns {"value": "ghp_...", "env": "sudo", "org": "ehmpathy"}
```

### keyrack relock

purge credentials from daemon.

```bash
# relock all sudo credentials
keyrack relock --env sudo

# relock specific key
keyrack relock --key GITHUB_TOKEN

# relock everything
keyrack relock --all
```

### keyrack status

show current state.

```bash
keyrack status
# → shows recipient key info
# → shows unlocked credentials with TTL remaining
# → shows daemon socket status
```

---

## .user experience

### setup (one-time)

```bash
# most developers: use ssh key
keyrack init --recipient ssh
# → uses ~/.ssh/id_ed25519
# → creates keyrack.host.yml.age encrypted to ssh key
# done. no passphrase to remember.

# security-conscious: use yubikey
keyrack init --recipient yubikey
# → creates manifest encrypted to yubikey
# → every unlock requires physical touch
```

### daily use

```bash
# unlock sudo credential
keyrack unlock --env sudo --key GITHUB_ORG_TOKEN
# → finds key in ssh-agent (automatic)
# → decrypts manifest
# → fetches credential from vault
# → loads into daemon
# no passphrase prompt!

# use the credential
keyrack get --key GITHUB_ORG_TOKEN --env sudo
# → returns credential from daemon
```

### multi-machine

```bash
# new machine: option A — rebuild from vaults
keyrack init --recipient ssh
keyrack set --key X --env sudo --vault 1password
# vaults are the source of truth; manifest is just an index

# new machine: option B — add new key as recipient from old machine
# on old machine:
keyrack recipient set --pubkey "ssh-ed25519 AAAA... newmachine"
# transfer keyrack.host.yml.age to new machine
# new machine can now decrypt with its key
```

---

## .key-per-vault vs shared key

### age's recommendation

age encrypts to **recipients**, not to "vaults" or "purposes". the model is:

```bash
# encrypt to one or more recipients
age -r "ssh-ed25519 AAAA... alice" -r "ssh-ed25519 AAAA... bob" file.txt
```

age does NOT recommend different keys per file or per purpose. instead:
- **one recipient key per person/machine**
- **multiple recipients per file** (for shared access)

### why one key per machine is better

| approach | pros | cons |
|----------|------|------|
| **one key per machine** | simple, matches ssh model, easy backup | all-or-nothing access |
| **key per vault** | granular revocation | key management complexity, many keys to back up |

age's philosophy: **simplicity > granularity**. one key per machine is easier to:
- back up
- rotate
- understand
- audit

### keyrack's approach

follow age's model:

```
machine has one identity (ssh key)
  └─> keyrack.host.yml.age encrypted to that identity
        └─> contains pointers to all vaults (1password, os.secure, etc)
              └─> each vault has its own auth (1password login, os.secure key)
```

the keyrack identity unlocks the **manifest** (metadata). each vault still has its own authentication. keyrack doesn't bypass vault security — it just indexes which credentials exist.

### multiple machines

```bash
# machine A: alice's laptop
keyrack.host.yml.age encrypted to:
  - ssh-ed25519 AAAA... alice-laptop

# machine B: alice's desktop
keyrack.host.yml.age encrypted to:
  - ssh-ed25519 AAAA... alice-desktop

# OR: shared manifest (multi-recipient)
keyrack.host.yml.age encrypted to:
  - ssh-ed25519 AAAA... alice-laptop
  - ssh-ed25519 AAAA... alice-desktop
```

the multi-recipient approach means alice can sync one manifest across machines. either machine's key can decrypt it.

### recipient list

**important**: age encrypts to multiple recipients, but does NOT store queryable recipient metadata.

```bash
# age encrypts to multiple recipients
age -r "ssh-ed25519 AAAA... laptop" -r "ssh-ed25519 AAAA... desktop" manifest.yml

# but you can't query "who can decrypt this?"
# the .age file contains encrypted file-keys, not a recipient list
```

**keyrack must track recipients itself**. options:

| approach | where | pros | cons |
|----------|-------|------|------|
| **in manifest** | keyrack.host.yml.age | single file, always in sync | chicken-egg: can't read until decrypted |
| **separate file** | keyrack.recipients (plaintext) | queryable before decrypt | must keep in sync, reveals key fingerprints |
| **derive from ssh** | ~/.ssh/*.pub | no extra file | assumes all ssh keys are recipients |

**recommended**: store recipients in the manifest itself.
- `keyrack recipient get` decrypts manifest, reads recipients, displays them
- `keyrack recipient set --pubkey "..."` decrypts, adds recipient, re-encrypts to all
- the list is only visible after successful decrypt (with any recipient's key)

```typescript
interface KeyrackHostManifest {
  // recipients who can decrypt this manifest (tracked by keyrack, not age)
  recipients: Array<{
    pubkey: string;         // e.g., "ssh-ed25519 AAAA..."
    label: string;          // e.g., "macbook", "yubikey-backup"
    addedAt: string;        // iso timestamp
  }>;

  // credential configurations
  keys: Record<string, KeyrackKeyHost>;
}
```

this solves the "who can decrypt?" question while all data remains in one encrypted file.

---

## .how ssh-agent integration works

### age already supports this

age has native support for ssh keys:

```bash
# encrypt to ssh public key
age -r "ssh-ed25519 AAAA..." file.txt > file.txt.age

# decrypt with ssh key (uses ssh-agent)
age -d -i ~/.ssh/id_ed25519 file.txt.age > file.txt
```

keyrack would use the same mechanism:

```typescript
// encrypt host manifest
const encrypted = await age.encrypt(manifest, {
  recipients: [sshPublicKey],
});

// decrypt host manifest (age uses ssh-agent automatically)
const decrypted = await age.decrypt(encrypted, {
  identities: [sshPrivateKeyPath], // age talks to ssh-agent
});
```

### why ssh-agent is ideal

| property | benefit |
|----------|---------|
| **already active** | developers have ssh-agent for git, remote access |
| **already protected** | key unlock at login, timeout, confirmation prompts |
| **already backed up** | ssh keys are typically backed up |
| **portable** | works on macos, linux, wsl |
| **agent forwarding** | can work on remote machines (with caution) |

---

## .migration path

### from passphrase to key-based

```bash
# step 1: unlock with old passphrase
keyrack unlock-legacy --passphrase
# → decrypts keyrack.host.yml.age with passphrase

# step 2: migrate to key-based
keyrack migrate --recipient ssh
# → re-encrypts manifest to ssh key
# → removes passphrase-based encryption

# step 3: verify
keyrack unlock --env sudo --key X
# → works without passphrase
```

### backwards compatibility

- `keyrack unlock-legacy` supports passphrase for migration
- new installs default to key-based
- passphrase support deprecated, removed in future version

---

## .tradeoffs

### what we gain

| gain | explanation |
|------|-------------|
| **no passphrase input code** | eliminate tty prompt, stdin detection, rate limit |
| **no passphrase leakage vectors** | no shell history, no `ps`, no env var concerns |
| **stronger security** | 256-bit keys vs ~40-bit passphrases |
| **better ux** | no passphrase to type or remember |
| **simpler code** | no argon2, no passphrase validation, no backoff |

### what we lose

| loss | mitigation |
|------|------------|
| **works without ssh key** | support os keychain as fallback |
| **works on headless servers** | deploy keys, service accounts |
| **familiar passphrase ux** | ssh keys are familiar to developers |

### edge cases

| scenario | solution |
|----------|----------|
| **no ssh key** | `keyrack init --recipient keychain` generates dedicated key |
| **shared machine** | each user has own ssh key → own keyrack |
| **ci/cd** | deploy key with limited scope |
| **hardware token** | `keyrack init --recipient yubikey` |

---

## .comparison

| aspect | passphrase-based | key-based |
|--------|-----------------|-----------|
| **security** | human-chosen, attackable | random, infeasible to brute force |
| **ux** | type passphrase each time | automatic via agent |
| **leakage risk** | high (many vectors) | low (key in agent) |
| **code complexity** | high (input methods, rate limit) | low (age handles it) |
| **recovery** | remember passphrase | re-run set commands from vaults |
| **multi-machine** | same passphrase everywhere | add each machine as recipient |

---

## .implementation notes

### age identity sources

age supports multiple identity sources:

```bash
# ssh key (recommended)
age -d -i ~/.ssh/id_ed25519 file.age

# age key file
age -d -i ~/.config/age/key.txt file.age

# yubikey (via plugin)
age -d -i age-plugin-yubikey file.age
```

keyrack would support all of these via age's plugin system.

### key rotation

```bash
# generate new key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_new

# add new key as recipient
keyrack recipient set --pubkey-file ~/.ssh/id_ed25519_new.pub

# remove old key
keyrack recipient del --label "oldkey"
```

### multiple recipients

```bash
# add backup key as recipient
keyrack recipient set --pubkey "ssh-ed25519 AAAA... backup"

# manifest encrypted to multiple recipients
# any recipient can decrypt
```

---

## .summary

| principle | passphrase | key-based |
|-----------|------------|-----------|
| **age philosophy** | discouraged | ✓ preferred |
| **entropy** | ~40 bits | 256 bits |
| **input method** | tty/stdin (risky) | agent (safe) |
| **ux** | type each time | automatic |
| **code** | complex (many edge cases) | simple (age handles it) |

key-based locks follow age's philosophy: **keys are better than passphrases**.

developers already have ssh keys. ssh-agent is already active. keyrack should leverage this instead of inventing its own passphrase system.

---

## .sources

- [age documentation](https://github.com/FiloSottile/age)
- [age ssh support](https://github.com/FiloSottile/age#ssh-keys)
- [age-plugin-yubikey](https://github.com/str4d/age-plugin-yubikey)
- [ssh-agent man page](https://man.openbsd.org/ssh-agent)

