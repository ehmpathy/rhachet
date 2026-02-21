# ref: vision — manifest backup and recovery

## .what

backup keyrack host manifest to a remote secure vault for recovery after recipient key loss.

**context**: this vision assumes key-based locks (see `vision.recipient-key-based-locks.ref.md`). the manifest is encrypted to recipient keys (ssh, yubikey, etc), not passphrases.

---

## .the problem

user loses their recipient key (laptop stolen, ssh key deleted, yubikey lost). the encrypted manifest (`keyrack.host.yml.age`) is unrecoverable. recovery requires:

1. re-run `keyrack init` with a new recipient key
2. re-authenticate to each vault
3. re-run `keyrack set` for each credential
4. no way to verify recovery is complete

for a user with 20 credentials, this is hours of work with no guarantee of completeness.

---

## .built-in mitigation: multi-recipient

before the backup solution, note that multi-recipient encryption is the primary mitigation:

```bash
# add a backup key at setup time
keyrack recipient set --pubkey-file ~/.ssh/id_ed25519_backup.pub --label "backup"

# manifest now encrypted to both keys
# if laptop is stolen, backup key can still decrypt
```

**recommendation**: always add a backup recipient key. this eliminates most recovery scenarios.

---

## .the backup solution

for users who didn't add a backup recipient, or who lost all recipient keys:

at `keyrack set` time, offer to sync the decrypted manifest to a secure backup location.

```bash
keyrack set --key X --env sudo --vault 1password

# keyrack prompts:
#   sync manifest backup to 1password? [Y/n]
#   (this enables recovery if you lose all recipient keys)
```

the backup contains:
- key names
- vault references (e.g., 1password item paths)
- env and org metadata
- **not** the actual credential values (those live in the vaults)

recovery flow:
```bash
keyrack recover --from 1password

# keyrack:
#   found backup with 20 keys
#   init keyrack with new recipient key...
#
#   use which recipient?
#   [1] ssh (default key)
#   [2] yubikey
#   [3] specify key
#
#   > 1
#
#   restored keyrack.host.yml.age with 20 keys
#   run `keyrack unlock` to verify vault access
```

---

## .why this works

the manifest is just an index — it maps key names to vault locations. the actual secrets live in the vaults (1password, os.secure, etc.).

backup to a vault creates a secure recovery path:
- vault access requires authentication (1password master password, etc.)
- manifest backup is encrypted at rest in the vault
- recovery restores the index; secrets are fetched from their vaults as normal

---

## .security model

| aspect | mitigation |
|--------|------------|
| backup contains key names | stored in encrypted vault; requires vault auth |
| backup could become stale | sync on every `set` operation |
| vault compromise exposes manifest | manifest alone has no values — attacker still needs vault access for each credential |
| attacker with vault access | they already have vault access — manifest metadata is not the prize |

---

## .user experience

### opt-in at first `set`

```
keyrack set --key X --env sudo --vault 1password

manifest backup not configured.
to enable recovery if you lose your recipient key,
sync manifest to a secure backup location.

backup to 1password? [Y/n] y

enter 1password item path for backup: Private/keyrack-backup
backup configured and synced.
```

### auto-sync on subsequent `set`

```
keyrack set --key Y --env all --vault 1password

key configured.
manifest backup synced.
```

### recovery

```
keyrack recover --from 1password

found backup at: Private/keyrack-backup
last synced: 2024-01-15T10:30:00Z
contains: 20 keys

use which recipient for new keyrack?
[1] ssh (default key: ~/.ssh/id_ed25519)
[2] yubikey
[3] keychain
[4] specify key

> 1

restored keyrack.host.yml.age with 20 keys.
encrypted to: ssh-ed25519 SHA256:abc123... (laptop)

verify with: keyrack list
```

---

## .comparison: multi-recipient vs backup

| approach | when to use | recovery friction |
|----------|-------------|-------------------|
| **multi-recipient** | proactive (setup time) | none — just use backup key |
| **vault backup** | reactive (after key loss) | low — fetch from vault, init with new key |
| **manual rebuild** | no preparation | high — re-auth each vault, re-run each set |

**recommendation**:
1. always add a backup recipient at setup time
2. optionally enable vault backup for extra safety
3. manual rebuild is last resort

---

## .implementation notes

- backup stored as structured data (yaml/json) in vault
- backup location stored in keyrack config (not in manifest — that would be circular)
- sync is idempotent (upsert to same vault item)
- recovery creates new .age file with new recipient key
- old .age file (if present) is backed up before overwrite
- recipient list not included in backup (user must choose new recipient at recovery)

---

## .status

todo, planned for future PR

