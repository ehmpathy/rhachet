# ref: linux keyctl session-scoped keys (deep dive)

## .what

deep dive on Linux kernel key store with session-scoped keys as an alternative to daemon-based secret storage. compares session inheritance model vs daemon-side caller verification.

---

## .enforced vs convened security

### definitions

| type | what it means | who it protects against |
|------|---------------|------------------------|
| **ENFORCED** | system prevents violation even if actor tries to break it | malicious actors with intent to bypass |
| **CONVENED** | system guides correct behavior; actor could bypass if they tried | well-intentioned actors who might make mistakes |

### examples

```
ENFORCED:
  - socket 0600 permissions → other users CANNOT connect (kernel enforces)
  - kernel key store session scope → other sessions CANNOT read keys (kernel enforces)
  - macOS code-signed ACL → unsigned binary CANNOT access keychain (kernel enforces)

CONVENED:
  - daemon hash check → malware CAN race the TOCTOU window if it tries
  - API rate limits → caller CAN retry rapidly if it ignores backoff
  - "do not call this function directly" → caller CAN call it anyway
```

### why this matters for keyrack

most keyrack protections are **CONVENED**:
- they prevent accidental exposure
- they stop opportunistic attacks
- they fail against determined, targeted attacks

few keyrack protections are **ENFORCED**:
- socket permissions (kernel-enforced)
- session key store scope (kernel-enforced)

this distinction helps set realistic expectations.

---

## .the kernel key store model

### what is keyctl?

the linux kernel has a built-in key management subsystem. secrets are stored in kernel memory, not userspace.

```bash
# add a key to session key store
keyctl add user GITHUB_TOKEN "ghp_secret123" @s

# read a key
keyctl print $(keyctl search @s user GITHUB_TOKEN)

# list keys in session key store
keyctl list @s
```

### key store hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ @t - thread key store                                       │
│   └── private to single thread                              │
│   └── NOT inherited by children                             │
├─────────────────────────────────────────────────────────────┤
│ @p - process key store                                      │
│   └── shared by all threads in process                      │
│   └── NOT inherited by children                             │
├─────────────────────────────────────────────────────────────┤
│ @s - session key store                   ◄── FOCUS HERE     │
│   └── shared by all processes in login session              │
│   └── INHERITED by child processes (fork/exec)              │
│   └── created at login, destroyed at logout                 │
├─────────────────────────────────────────────────────────────┤
│ @u - user key store                                         │
│   └── shared by ALL processes owned by user                 │
│   └── persists across sessions                              │
├─────────────────────────────────────────────────────────────┤
│ @us - user session key store                                │
│   └── default session key store for user                    │
│   └── shared across all user's sessions                     │
└─────────────────────────────────────────────────────────────┘
```

### session inheritance

when a process forks or execs, the child inherits the parent's session key store:

```
terminal login
    │
    ▼
┌─────────────────┐
│ bash (pid 1000) │──── session key store @s (id: 12345)
└─────────────────┘
    │
    │ fork + exec
    ▼
┌─────────────────┐
│ git (pid 1001)  │──── same session key store @s (id: 12345)
└─────────────────┘
    │
    │ fork + exec
    ▼
┌─────────────────┐
│ ssh (pid 1002)  │──── same session key store @s (id: 12345)
└─────────────────┘
```

all processes in the tree share the same session key store.

---

## .session isolation via separate key stores

### how to create an isolated session

```bash
# create a new session with a NEW key store (not inherited from parent)
keyctl session myisolatedsession

# now in a subshell with isolated @s
keyctl add user SECRET "sensitive" @s

# this key is ONLY visible to processes in this session
```

### the isolation model

```
terminal 1 (normal session)              terminal 2 (isolated session)
┌─────────────────────────┐              ┌─────────────────────────┐
│ session key store A     │              │ session key store B     │
│   └── GITHUB_TOKEN      │              │   └── SUDO_CRED         │
│   └── AWS_KEY           │              │                         │
└─────────────────────────┘              └─────────────────────────┘
         │                                        │
         ▼                                        ▼
    all children                             all children
    can read A's keys                        can read B's keys
    CANNOT read B's keys                     CANNOT read A's keys
```

### how keyrack could use this

```bash
# user runs keyrack unlock
rhx keyrack unlock --env sudo --key GITHUB_TOKEN

# keyrack internally:
# 1. fetches secret from vault
# 2. stores in current session key store
keyctl add user ehmpathy.sudo.GITHUB_TOKEN "$secret" @s

# later, any child process can read it
rhx keyrack get --key GITHUB_TOKEN --env sudo
# internally: keyctl print $(keyctl search @s user ehmpathy.sudo.GITHUB_TOKEN)
```

---

## .comparison: keyctl vs daemon

### architecture differences

```
DAEMON MODEL                              KEYCTL MODEL
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ keyrack daemon (userspace)          │   │ kernel key store (kernelspace)      │
│   └── holds secrets in process mem  │   │   └── holds secrets in kernel mem   │
│   └── listens on unix socket        │   │   └── accessed via syscall          │
│   └── verifies caller identity      │   │   └── access via key store member   │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
         │                                         │
         ▼                                         ▼
    caller connects                           caller calls
    daemon checks /proc                       keyctl syscall
    daemon sends secret                       kernel returns secret
```

### enforced vs convened comparison

| protection | daemon model | keyctl model |
|------------|--------------|--------------|
| **other users can't access** | ENFORCED (socket 0600) | ENFORCED (key store ownership) |
| **other sessions can't access** | CONVENED (daemon checks UID) | ENFORCED (session key store scope) |
| **specific binaries only** | CONVENED (hash check, TOCTOU) | NOT SUPPORTED |
| **TTL expiration** | CONVENED (daemon honors TTL) | ENFORCED (kernel removes key) |
| **audit trail** | CONVENED (daemon logs) | NOT SUPPORTED |

### security comparison

| aspect | daemon model | keyctl model |
|--------|--------------|--------------|
| **secret storage** | userspace (daemon memory) | kernelspace (kernel memory) |
| **access control** | CONVENED (TOCTOU risk) | ENFORCED (kernel atomic) |
| **per-binary ACL** | CONVENED (hash-based) | NOT POSSIBLE |
| **isolation boundary** | caller binary identity | session key store membership |
| **attack surface** | daemon code, socket, /proc | kernel key store subsystem |
| **root access** | can read daemon memory | can read kernel memory |

### the key tradeoff

**daemon model**:
- CAN verify which binary is the caller (CONVENED — raceable)
- CANNOT guarantee atomic access

**keyctl model**:
- CANNOT verify which binary is the caller
- CAN guarantee atomic access (ENFORCED — kernel-level)

---

## .threat model comparison

### scenario: malicious npm package runs as same user

```
DAEMON MODEL:
1. npm package connects to daemon
2. daemon checks /proc/{pid}/exe → "/usr/bin/node"
3. daemon checks hash of /usr/bin/node
4. if node hash not in ACL → DENIED (CONVENED: malware could race)
5. if node hash in ACL → malware gets secret via node

KEYCTL MODEL:
1. npm package runs as child of terminal
2. npm package inherited session key store from terminal
3. npm package calls keyctl → gets secret immediately
4. no verification of caller identity
5. malware gets secret ✗
```

**analysis**:
- daemon: CONVENED protection (hash check can be raced)
- keyctl: NO protection (same session = full access)

### scenario: malicious process NOT in session tree

```
DAEMON MODEL:
1. malware spawned by cron (different session)
2. malware connects to daemon socket
3. daemon checks UID matches → DENIED if different user
4. if same user: CONVENED protection via hash check

KEYCTL MODEL:
1. malware spawned by cron (different session)
2. malware has different session key store
3. malware calls keyctl search @s → key not found
4. ENFORCED: kernel prevents cross-session access
```

**analysis**:
- daemon: CONVENED (same-user cron job could pass checks)
- keyctl: ENFORCED (kernel guarantees session isolation)

### scenario: TOCTOU race attack

```
DAEMON MODEL:
1. legitimate app connects to daemon
2. daemon verifies /proc/{pid}/exe → allowed (CONVENED)
3. app exec()'s to malware (race window)
4. daemon sends secret to socket
5. malware receives secret ✗

KEYCTL MODEL:
1. legitimate app has session key store access
2. app calls keyctl → kernel returns secret atomically (ENFORCED)
3. no race window exists
4. if app exec()'s, new process still has key store access
5. but the access was already atomic ✓
```

**analysis**:
- daemon: CONVENED (TOCTOU is inherent to userspace checks)
- keyctl: ENFORCED (kernel access is atomic)

---

## .enforced vs convened summary

### daemon-side verification

| protection | type | notes |
|------------|------|-------|
| socket 0600 | ENFORCED | kernel prevents other users |
| UID check | ENFORCED | kernel provides via SO_PEERCRED |
| binary hash check | CONVENED | TOCTOU window exists |
| multiple hash passes | CONVENED | shrinks window, doesn't eliminate |
| pidfd validation | ENFORCED | kernel prevents PID reuse |
| audit log | CONVENED | relies on daemon honesty |

### keyctl session keys

| protection | type | notes |
|------------|------|-------|
| session scope | ENFORCED | kernel prevents cross-session |
| user ownership | ENFORCED | kernel prevents other users |
| key timeout | ENFORCED | kernel removes expired keys |
| per-binary ACL | NOT POSSIBLE | keyctl has no concept of caller binary |

---

## .hybrid approach: daemon + keyctl

### best of both worlds

```
┌──────────────────────────────────────────────────────────────┐
│ Hybrid: Daemon verifies (CONVENED), Kernel stores (ENFORCED) │
├──────────────────────────────────────────────────────────────┤
│ 1. caller connects to daemon                                 │
│ 2. daemon verifies caller identity (CONVENED hash check)     │
│ 3. daemon fetches secret from vault                          │
│ 4. daemon stores secret in session key store (ENFORCED)      │
│ 5. subsequent get() calls go direct to kernel (ENFORCED)     │
│ 6. no daemon involvement for reads                           │
└──────────────────────────────────────────────────────────────┘
```

### where each type applies

```
UNLOCK FLOW:
  caller → daemon → hash check (CONVENED) → vault → keyctl add (ENFORCED)
                         ▲
                         │
                   TOCTOU risk here only

GET FLOW:
  caller → keyctl search → kernel returns (ENFORCED)
                              ▲
                              │
                        no TOCTOU risk
```

**benefit**: TOCTOU risk limited to unlock operations. get operations are ENFORCED.

---

## .practical comparison for keyrack

### option A: pure daemon (current design)

```
ENFORCED:
  ✓ socket permissions (other users blocked)
  ✓ pidfd (PID reuse blocked)

CONVENED:
  ~ binary hash check (TOCTOU window)
  ~ TTL expiration (daemon must honor)
  ~ audit log (daemon must log)

NOT PROTECTED:
  ✗ same-session malware that races TOCTOU
```

### option B: pure keyctl

```
ENFORCED:
  ✓ session isolation (cross-session blocked)
  ✓ user ownership (other users blocked)
  ✓ key timeout (kernel removes)
  ✓ atomic access (no TOCTOU)

CONVENED:
  (none - keyctl has no policy layer)

NOT PROTECTED:
  ✗ same-session processes (all have equal access)
  ✗ no per-binary differentiation
```

### option C: hybrid (daemon unlock, keyctl storage)

```
ENFORCED:
  ✓ session isolation (kernel)
  ✓ user ownership (kernel)
  ✓ key timeout (kernel)
  ✓ atomic get() (kernel)
  ✓ socket permissions (kernel)

CONVENED:
  ~ binary hash check at unlock time only (TOCTOU limited to unlock)

NOT PROTECTED:
  ✗ same-session processes after unlock (keyctl gives equal access)
```

---

## .recommendation for keyrack

### v1: daemon-only (current)

- ENFORCED: socket 0600, pidfd
- CONVENED: hash checks, TTL, audit
- acceptable for initial release

### v1.5: daemon + hash verification

- same ENFORCED/CONVENED split
- better CONVENED protections (multiple passes, strict mode)
- shrinks TOCTOU window but doesn't eliminate

### v2 consideration: keyctl backend (linux)

```
v2 architecture:

unlock flow (CONVENED verification):
  caller → daemon → verify hash → vault fetch → keyctl add @s

get flow (ENFORCED access):
  caller → keyctl search @s → kernel returns secret

benefit:
  - TOCTOU only at unlock time (rare operation)
  - get() is ENFORCED (frequent operation)
  - most operations become ENFORCED
```

---

## .key insight

> **ENFORCED protections stop malicious actors. CONVENED protections guide well-intentioned actors.**
>
> session key store provides ENFORCED session isolation but NO binary-level policy.
>
> daemon provides CONVENED binary-level policy but with TOCTOU.
>
> the hybrid approach gives ENFORCED storage with CONVENED policy at unlock time — acceptable because unlock is rare and get is frequent.
>
> for keyrack's threat model (protect against opportunistic malware, not nation-state actors), CONVENED protections at unlock + ENFORCED storage is a good balance.

---

## .sources

- [Linux Kernel Key Retention Service](https://www.kernel.org/doc/html/latest/security/keys/core.html)
- [keyctl(1) man page](https://man7.org/linux/man-pages/man1/keyctl.1.html)
- [keyctl(2) syscall](https://man7.org/linux/man-pages/man2/keyctl.2.html)
- [Session Key Stores](https://www.kernel.org/doc/html/latest/security/keys/core.html#session-keyrings)
- [Process vs Session Key Stores](https://mjg59.dreamwidth.org/37333.html)
