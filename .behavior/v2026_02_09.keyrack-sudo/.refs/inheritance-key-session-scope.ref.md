# ref: inheritance key session scope

## .what

deep dive on a daemon architecture where access is scoped to a terminal inheritance chain via a kernel-stored session key.

**out of scope**: caller identity verification (ACL/hash checks) — that's a separate layer. this document focuses solely on session-scoped access control.

---

## .the problem

### cross-session attacks

a user runs:
- terminal A: legitimate work, unlocks keyrack credentials
- browser B: has a malicious extension
- vscode C: has a compromised plugin

all three run as the same UID. without session isolation:

```
terminal A: rhx keyrack unlock → credentials in daemon
browser B extension: connects to daemon socket → gets credentials ✗
vscode C plugin: connects to daemon socket → gets credentials ✗
```

socket permissions (0600) prevent **other users** from access. they do NOT prevent **same-user processes in different sessions** from access.

### the threat model

| attacker | can connect to socket? | should access credentials? |
|----------|------------------------|---------------------------|
| other user | NO (socket 0600) | NO |
| same user, same terminal chain | YES | YES |
| same user, different session (browser) | YES | NO |
| same user, different session (vscode) | YES | NO |

the gap: same-user, different-session processes can connect but shouldn't access.

---

## .the solution: inheritance key

### concept

```
┌─────────────────────────────────────────────────────────────────┐
│ at unlock time:                                                  │
│   1. daemon generates a random inheritanceKey                    │
│   2. daemon stores inheritanceKey in kernel key store (@s)       │
│   3. daemon associates unlocked credentials with inheritanceKey  │
│   4. caller's session now "owns" access to those credentials     │
├─────────────────────────────────────────────────────────────────┤
│ at get time:                                                     │
│   1. caller reads inheritanceKey from kernel key store (@s)      │
│   2. caller sends inheritanceKey to daemon                       │
│   3. daemon validates inheritanceKey matches                     │
│   4. daemon returns credentials scoped to that inheritanceKey    │
└─────────────────────────────────────────────────────────────────┘
```

### why this works

kernel key store session scope (`@s`) provides ENFORCED inheritance:

```
terminal login (session key store created)
    │
    ├── bash (has @s access)
    │     └── rhx keyrack unlock (stores inheritanceKey in @s)
    │           └── child processes inherit @s
    │                 └── rhx keyrack get (reads inheritanceKey from @s) ✓
    │
browser (DIFFERENT session key store)
    └── malicious extension
          └── cannot read @s from terminal's session ✗
          └── connects to daemon but lacks valid inheritanceKey ✗
```

the kernel enforces session isolation. processes outside the inheritance chain cannot read the session key store.

---

## .architecture

### data flow: unlock

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  terminal   │     │  keyrack cli    │     │  keyrack daemon     │
│  (session)  │     │  (child of      │     │  (long-run svc)     │
│             │     │   terminal)     │     │                     │
└──────┬──────┘     └────────┬────────┘     └──────────┬──────────┘
       │                     │                         │
       │  user runs unlock   │                         │
       │────────────────────>│                         │
       │                     │                         │
       │                     │  UNLOCK request         │
       │                     │  (no inheritanceKey yet)│
       │                     │────────────────────────>│
       │                     │                         │
       │                     │                         │  generate
       │                     │                         │  inheritanceKey
       │                     │                         │  = random 256-bit
       │                     │                         │
       │                     │  response:              │
       │                     │  { inheritanceKey,      │
       │                     │    unlocked: [...] }    │
       │                     │<────────────────────────│
       │                     │                         │
       │                     │  store inheritanceKey   │
       │                     │  in kernel @s           │
       │                     │  keyctl add user        │
       │                     │    ehmpathy.keyrack.ik  │
       │                     │    $inheritanceKey @s   │
       │                     │                         │
       │  unlock complete    │                         │
       │<────────────────────│                         │
       │                     │                         │
```

### data flow: get

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  terminal   │     │  keyrack cli    │     │  keyrack daemon     │
│  (session)  │     │  (child of      │     │                     │
│             │     │   terminal)     │     │                     │
└──────┬──────┘     └────────┬────────┘     └──────────┬──────────┘
       │                     │                         │
       │  user runs get      │                         │
       │────────────────────>│                         │
       │                     │                         │
       │                     │  read inheritanceKey    │
       │                     │  from kernel @s         │
       │                     │  keyctl search @s user  │
       │                     │    ehmpathy.keyrack.ik  │
       │                     │                         │
       │                     │  GET request            │
       │                     │  { slug, inheritanceKey }│
       │                     │────────────────────────>│
       │                     │                         │
       │                     │                         │  validate
       │                     │                         │  inheritanceKey
       │                     │                         │  matches stored
       │                     │                         │
       │                     │  response: { key }      │
       │                     │<────────────────────────│
       │                     │                         │
       │  credential value   │                         │
       │<────────────────────│                         │
       │                     │                         │
```

### data flow: attack fails

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  browser    │     │  malicious      │     │  keyrack daemon     │
│  (DIFFERENT │     │  extension      │     │                     │
│   session)  │     │                 │     │                     │
└──────┬──────┘     └────────┬────────┘     └──────────┬──────────┘
       │                     │                         │
       │  extension tries    │                         │
       │────────────────────>│                         │
       │                     │                         │
       │                     │  try to read            │
       │                     │  inheritanceKey from @s │
       │                     │  keyctl search @s ...   │
       │                     │  → "key not found"      │
       │                     │  (different session!)   │
       │                     │                         │
       │                     │  GET request            │
       │                     │  { slug, inheritanceKey: ??? }
       │                     │────────────────────────>│
       │                     │                         │
       │                     │                         │  no valid
       │                     │                         │  inheritanceKey
       │                     │                         │  → REJECT
       │                     │                         │
       │                     │  error: "invalid        │
       │                     │   session scope"        │
       │                     │<────────────────────────│
       │                     │                         │
       │  attack failed      │                         │
       │<────────────────────│                         │
       │                     │                         │
```

---

## .daemon state model

### credential storage with session scope

```typescript
interface DaemonKeyStore {
  // map: inheritanceKey → credentials
  sessions: Map<InheritanceKey, SessionCredentials>;
}

interface SessionCredentials {
  inheritanceKey: string;           // random 256-bit hex
  createdAt: IsoTimeStamp;
  credentials: Map<Slug, KeyrackKeyGrant>;
}

// on UNLOCK:
// 1. generate new inheritanceKey
// 2. create SessionCredentials for that key
// 3. return inheritanceKey to caller (who stores in @s)

// on GET:
// 1. receive inheritanceKey from caller
// 2. lookup SessionCredentials by inheritanceKey
// 3. if not found → reject
// 4. if found → return credential
```

### multiple sessions

the daemon can serve multiple terminal sessions simultaneously:

```
terminal A (session key store A):
  └── unlocks with inheritanceKey_A
        └── daemon stores credentials under inheritanceKey_A

terminal B (session key store B):
  └── unlocks with inheritanceKey_B
        └── daemon stores credentials under inheritanceKey_B

terminal A child:
  └── reads inheritanceKey_A from @s
        └── GET with inheritanceKey_A → gets A's credentials ✓

terminal B child:
  └── reads inheritanceKey_B from @s
        └── GET with inheritanceKey_B → gets B's credentials ✓

browser (session key store C):
  └── has no inheritanceKey in @s
        └── GET with no/invalid key → rejected ✗
```

---

## .kernel key store mechanics

### session key store inheritance

```bash
# terminal starts with session key store
$ keyctl show @s
Session key store
 123456789 --alswrv  1000  1000  user: ehmpathy.keyrack.ik

# child processes inherit same @s
$ bash -c 'keyctl show @s'
Session key store
 123456789 --alswrv  1000  1000  user: ehmpathy.keyrack.ik  # same!

# but a new session (e.g., ssh) has different @s
$ ssh localhost 'keyctl show @s'
Session key store
 987654321 --alswrv  1000  1000  key store: _ses   # different!
```

### key lifetime

```bash
# store inheritanceKey with timeout (matches credential TTL)
keyctl add user ehmpathy.keyrack.ik "$INHERITANCE_KEY" @s
keyctl timeout $(keyctl search @s user ehmpathy.keyrack.ik) 32400  # 9 hours

# key auto-expires when:
# 1. timeout reached
# 2. session ends (logout)
# 3. explicit clear
```

### key permissions

```bash
# keys in @s are readable only by processes in that session
# kernel enforces this — no userspace TOCTOU possible

# other sessions cannot:
keyctl search @s user ehmpathy.keyrack.ik  # from different session
# → "Required key not available"
```

---

## .security analysis

### ENFORCED vs CONVENED

| protection | type | why |
|------------|------|-----|
| session key store isolation | ENFORCED | kernel prevents cross-session read |
| inheritanceKey validation | ENFORCED | daemon rejects invalid key atomically |
| key timeout | ENFORCED | kernel removes expired keys |
| socket permissions (0600) | ENFORCED | kernel prevents other-user connect |

**all protections are ENFORCED**. no TOCTOU windows because:
1. kernel key store access is atomic
2. daemon validates inheritanceKey in single operation
3. no check-then-use gap for session scope

### attack scenarios

| attack | outcome |
|--------|---------|
| browser extension tries to read @s | kernel rejects (different session) |
| extension guesses inheritanceKey | 256-bit random, infeasible |
| extension connects without inheritanceKey | daemon rejects |
| extension spawns child to inherit @s | child is in extension's session, not terminal's |
| attacker creates new terminal | gets new session, new @s, can't access prior keys |

### what this does NOT protect against

| scenario | why not covered |
|----------|-----------------|
| malicious code in SAME terminal chain | inherited @s, has valid inheritanceKey |
| npm postinstall in terminal | runs in terminal's session, inherits @s |
| eval'd code in terminal | same session, same inheritance |

this is where ACL verification (caller identity checks) becomes relevant — but that's a separate layer out of scope for this document.

---

## .implementation sketch

### unlock flow

```typescript
const unlockKeyrack = async (
  input: { env: string; key?: string; duration?: string },
  context: KeyrackContext,
): Promise<UnlockResult> => {
  // fetch credentials from vault
  const credentials = await fetchFromVault(input, context);

  // generate inheritanceKey
  const inheritanceKey = crypto.randomBytes(32).toString('hex');

  // send to daemon with inheritanceKey
  const result = await daemonAccessUnlock({
    inheritanceKey,
    credentials,
    expiresAt: computeExpiry(input.duration),
  });

  // store inheritanceKey in kernel @s
  await execAsync(`keyctl add user ehmpathy.keyrack.ik "${inheritanceKey}" @s`);

  // set timeout to match credential TTL
  const keyId = await execAsync(`keyctl search @s user ehmpathy.keyrack.ik`);
  await execAsync(`keyctl timeout ${keyId} ${ttlSeconds}`);

  return result;
};
```

### get flow

```typescript
const getKeyrackKey = async (
  input: { slug: string; env?: string },
  context: KeyrackContext,
): Promise<KeyrackKey> => {
  // read inheritanceKey from kernel @s
  let inheritanceKey: string;
  try {
    const keyId = await execAsync(`keyctl search @s user ehmpathy.keyrack.ik`);
    inheritanceKey = await execAsync(`keyctl pipe ${keyId}`);
  } catch {
    throw new BadRequestError(
      'no active keyrack session. run: rhx keyrack unlock',
    );
  }

  // send to daemon with inheritanceKey
  const result = await daemonAccessGet({
    slug: input.slug,
    inheritanceKey,
  });

  if (!result) {
    throw new BadRequestError('credential not found or session mismatch');
  }

  return result.key;
};
```

### daemon handler

```typescript
const handleGetCommand = (
  input: { slug: string; inheritanceKey: string },
  store: DaemonKeyStore,
): GetResponse => {
  // lookup session by inheritanceKey
  const session = store.sessions.get(input.inheritanceKey);

  if (!session) {
    return { error: 'invalid session scope' };
  }

  // check TTL
  if (session.expiresAt < Date.now()) {
    store.sessions.delete(input.inheritanceKey);
    return { error: 'session expired' };
  }

  // lookup credential
  const credential = session.credentials.get(input.slug);

  if (!credential) {
    return { error: 'credential not found in session' };
  }

  return { key: credential.key };
};
```

---

## .comparison to alternatives

| approach | cross-session isolation | ENFORCED? | complexity |
|----------|------------------------|-----------|------------|
| socket 0600 only | NO | — | low |
| UID check via SO_PEERCRED | NO (same UID) | ENFORCED | low |
| binary hash ACL | NO (caller identity ≠ session) | CONVENED | high |
| **inheritanceKey via @s** | YES | ENFORCED | medium |
| kernel key store direct (no daemon) | YES | ENFORCED | low |

the inheritanceKey approach provides:
- ENFORCED cross-session isolation via kernel key store
- daemon remains source of truth for credentials
- multiple sessions can coexist with separate scopes
- clean separation from caller identity verification (which is a separate layer)

---

## .key insight

> **session scope via kernel key store is ENFORCED.**
>
> the kernel prevents cross-session read of @s. no TOCTOU windows.
>
> an inheritanceKey stored in @s acts as a session-scoped capability token.
>
> processes outside the terminal inheritance chain cannot read the key, cannot forge the key, and cannot access credentials scoped to that key.
>
> this protects against cross-session attacks (browser extensions, vscode plugins) without any caller identity verification.
>
> caller identity verification (ACL/hash checks) is a separate layer that addresses a different threat: malicious code within the same session. that's out of scope for this document.

---

## .sources

- [Linux Kernel Key Retention Service](https://www.kernel.org/doc/html/latest/security/keys/core.html)
- [keyctl(1) man page](https://man7.org/linux/man-pages/man1/keyctl.1.html)
- [Session Key Stores](https://www.kernel.org/doc/html/latest/security/keys/core.html#session-keyrings)

