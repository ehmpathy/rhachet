# ref: design gaps

## .what

gaps in the keyrack sudo credentials design, grouped by security and ergonomics.

**note**: this document assumes key-based locks (see `vision.recipient-key-based-locks.ref.md`). passphrase-related gaps are eliminated by that design.

---

## security gaps

### 1. daemon lacks per-request authentication

**issue**: socket 0600 permissions prevent other users from connect, but any process that runs as the same user can access all unlocked keys.

**why it matters**:
- compromised browser extension that runs as user can read all unlocked credentials
- malware that runs as user bypasses all keyrack protections
- no audit trail of which process accessed which key

**fix**: ancestry-based session scope (see `vision.ancestry-session-scope.ref.md`)

the ancestry verification IS per-request authentication:
- daemon records originator PID at unlock time (via SO_PEERCRED)
- every `get` request verified via SO_PEERCRED + /proc ancestry walk
- caller must be a **descendant** of the originator terminal
- compromised browser extension? **not a descendant** → blocked
- malware that runs as user? **not a descendant** → blocked

why this is better than capability tokens:

| aspect | capability tokens | ancestry track |
|--------|------------------|----------------|
| token leakage | possible (env vars, logs) | n/a — no tokens |
| scope | manually defined | automatic (terminal session) |
| enforcement | userspace | kernel (SO_PEERCRED, /proc) |
| spoofability | possible if token leaked | not spoofable (kernel-enforced) |

**status**: planned — ancestry-based session scope (subsequent PR)

---

### 2. recipient key compromise = full manifest access

**issue**: with key-based locks, compromise of a recipient key (ssh key, yubikey, etc) means full access to the manifest.

**why it matters**:
- if ssh key is stolen, attacker can decrypt keyrack.host.yml.age
- manifest reveals which vaults and credentials exist (metadata)
- attacker still needs vault auth, but knows what to target

**mitigations** (by recipient key mech):

| recipient key mech | mitigation |
|-----------------|------------|
| software ssh key | protected by ssh-agent, machine login |
| yubikey-backed ssh | requires physical possession + touch |
| yubikey via age plugin | requires physical possession + touch |
| os keychain | protected by machine login + secure enclave |

**recommendation**: for high-security setups, use yubikey-backed recipient keys. physical possession requirement prevents remote-only attacks.

**see also**: `vision.recipient-key-based-locks.ref.md` — security implication section

---

## ergonomics gaps

### 1. cross-org credential discovery

**issue**: keys with `--org @all` don't appear in keyrack.yml. user has no way to discover which cross-org credentials exist without decrypt of the host manifest.

**why it matters**:
- user may forget they have cross-org credentials
- no visibility into available credentials without full unlock
- can't answer "what credentials do I have?" without recipient key

**fix**: add list command that shows key metadata (never values):
```bash
rhx keyrack list                # list all keys (requires recipient key)
rhx keyrack list --env sudo     # filter to sudo keys (requires recipient key)
rhx keyrack list --org @all     # filter to cross-org keys (requires recipient key)
```

output shows: key name, env, org, vault type — but never the credential value.

**note**: recipient key is ALWAYS required for list. this is intentional:
- host manifest is always encrypted (keyrack.host.yml.age)
- enumeration of credential names IS sensitive metadata
- no unauthenticated visibility into what credentials exist
- consistent with the principle that even existence of sudo credentials should be hidden

---

### 2. key loss recovery requires vault re-auth

**issue**: if recipient key is lost (laptop stolen, ssh key deleted), user must re-run set commands to rebuild manifest.

**why it matters**:
- user with 20 credentials must re-authenticate to each vault
- some vault configurations may be non-obvious to recreate
- no way to verify recovery is complete (don't know what was lost)

**mitigations**:
1. **multi-recipient encryption**: `keyrack recipient set --pubkey "backup-key"` adds a backup key
2. **vault is source of truth**: manifest is just an index; credentials live in vaults

**fix direction**: backup manifest metadata to a remote secure vault (e.g., 1password note)
- at `keyrack set` time, offer to sync manifest to secure backup location
- recovery = fetch from backup, re-encrypt with new recipient key

**see also**: `vision.manifest-backup-recovery.ref.md` — full vision for backup and recovery flow

**note**: this is less painful than passphrase loss because:
- backup key can be added as recipient in advance (multi-recipient)
- no passphrase to remember or forget
- re-run of set commands is deterministic (same vault paths work)

**status**: planned for later — multi-recipient backup key solves most cases for now

---

### 3. per-key max TTL

**issue**: user can override TTL with `--duration` at unlock time, but can't set "this key should never exceed 5min TTL" at set time.

**why it matters**:
- some credentials are more sensitive and should always have short TTL
- user must remember correct duration for each key
- easy to accidentally unlock with wrong TTL

**fix**: add `--duration` to set command as a MAX:
```bash
rhx keyrack set --key X --env sudo --vault 1password --duration 5m
```

stored in KeyrackKeyHost as `maxDuration`. at unlock time:
- if no `--duration` flag: use the stored max
- if `--duration` flag > stored max: warn and cap to stored max
- if `--duration` flag <= stored max: use the requested duration

this ensures sensitive credentials can never be unlocked for longer than intended, even if user forgets.

---

### 4. status output vault type absent

**issue**: `rhx keyrack status` shows env/org but not which vault the key came from.

**why it matters**:
- user can't tell if a key is from 1password vs os.secure
- vault type helps anticipate unlock experience (external auth vs passphrase)
- debug of "why won't this unlock" requires vault knowledge

**fix**: add vault field to status output:
```
unlocked keys:
  ehmpathy.sudo.GITHUB_TOKEN
    vault: 1password
    env: sudo
    org: ehmpathy
    expires: 2024-01-15T10:30:00Z (28m left)
```

---

## new commands

the gaps above motivate these commands (see `vision.recipient-key-based-locks.ref.md` for full list):

```bash
rhx keyrack init --recipient ssh                  # initialize with ssh key
rhx keyrack recipient set --pubkey "..."          # add recipient (backup/secondary key)
rhx keyrack recipient del --label "..."           # remove recipient
rhx keyrack recipient get                         # list recipients
rhx keyrack list                                  # list from keyrack.yml (default)
rhx keyrack list --env sudo                       # list sudo keys (requires recipient key)
rhx keyrack list --org @all                       # list cross-org keys (requires recipient key)
```

**note**: no `keyrack rotate` command — key rotation is just `recipient set` (add new) + `recipient del` (remove old).

---

## summary table

| gap | category | severity | fix complexity |
|-----|----------|----------|----------------|
| daemon per-request auth | security | medium | **planned** (ancestry scope) |
| recipient key compromise | security | low | mitigated (yubikey option) |
| cross-org discovery | ergonomics | high | low |
| key loss recovery | ergonomics | medium | **planned for later** |
| per-key max TTL | ergonomics | medium | low |
| status vault type absent | ergonomics | low | low |

**note**: passphrase-related gaps (passphrase change, lockhash, retention, stdin pipe) are eliminated by key-based locks. all vaults are now key-based.
