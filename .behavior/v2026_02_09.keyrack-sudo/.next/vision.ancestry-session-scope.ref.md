# vision: ancestry-based session scope

## .summary

replace key-based session scope with ancestry-based session scope. the daemon tracks originator PIDs and verifies callers via process ancestry — no keys to store, no wrappers to persist them.

---

## .the core insight

**before (key-based)**:
```
unlock → daemon generates inheritanceKey → stored in @s → children inherit @s → read key → send to daemon
```
requires: key generation, key storage, key relay, wrapper to isolate @s

**after (ancestry-based)**:
```
unlock → daemon records originatorPid + pidfd → children connect → daemon verifies ancestry via /proc
```
requires: none. kernel provides ancestry. daemon does the lookup.

---

## .why this works

| property | mechanism | ENFORCED? |
|----------|-----------|-----------|
| PPID is immutable | kernel sets at fork(), no syscall to change | YES |
| ancestry chain is verifiable | /proc/{pid}/stat readable by owner | YES |
| PID reuse is detectable | pidfd tracks specific process, not just number | YES |
| cross-chain isolation | different processes have different ancestry | YES |

a browser extension cannot fake descent from a terminal. the kernel guarantees this.

---

## .architecture

### daemon state

```typescript
interface DaemonSession {
  originatorPid: number;
  originatorPidfd: number;           // fd from pidfd_open()
  credentials: Map<Slug, KeyrackKeyGrant>;
  createdAt: IsoTimeStamp;
  expiresAt: IsoTimeStamp;

  // for peer authorization
  grantorSession?: DaemonSession;    // linked to human's session
}

interface DaemonState {
  sessions: Map<SessionId, DaemonSession>;  // sessionId = `${pid}:${starttime}`
  pendingOtps: Map<Otp, {
    robotPid: number;
    robotPidfd: number;
    requestedAt: IsoTimeStamp;
    expiresAt: IsoTimeStamp;         // OTP expires in 5 min
  }>;
}
```

### session lookup

```typescript
const findSessionByAncestry = (
  callerPid: number,
  sessions: Map<SessionId, DaemonSession>,
): DaemonSession | null => {
  // walk caller's ancestry
  let current = callerPid;
  while (current > 1) {
    // check if any session has this ancestor as originator
    for (const session of sessions.values()) {
      if (session.originatorPid === current) {
        // verify pidfd still valid (process hasn't been replaced)
        if (isPidfdValid(session.originatorPidfd)) {
          return session;
        }
      }
    }
    // walk up
    current = getPpid(current);
  }
  return null;
};
```

---

## .user experience timelines

### usecase 1: human unlocks, uses credentials

```
┌─────────────────────────────────────────────────────────────────┐
│ HUMAN UNLOCKS KEYRACK                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  t=0  human terminal (PID 1000)                                  │
│         └── $ rhx keyrack unlock --env prod                      │
│                                                                  │
│  t=1  daemon receives connection                                 │
│         └── SO_PEERCRED → callerPid = 1000                       │
│         └── pidfd_open(1000) → pidfd = 7                         │
│         └── stores session:                                      │
│               originatorPid: 1000                                │
│               originatorPidfd: 7                                 │
│               credentials: { ... }                               │
│                                                                  │
│  t=2  human runs command that needs credential                   │
│         └── $ terraform apply  (PID 1001, PPID=1000)             │
│               └── data.external calls rhx keyrack get            │
│                     └── (PID 1002, PPID=1001)                    │
│                                                                  │
│  t=3  daemon receives GET request                                │
│         └── SO_PEERCRED → callerPid = 1002                       │
│         └── walk ancestry: 1002 → 1001 → 1000                    │
│         └── found session with originatorPid = 1000 ✓            │
│         └── verify pidfd 7 still valid ✓                         │
│         └── return credential                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**no key stored anywhere. no key passed in request. no key computed by client.**

the daemon does all the work:
1. `SO_PEERCRED` → caller PID
2. `/proc/{pid}/stat` → walk ancestry
3. match `originatorPid` → found session

client just connects and asks. daemon figures out who they are.

---

### usecase 2: robot requests access, human authorizes

```
┌─────────────────────────────────────────────────────────────────┐
│ ROBOT REQUESTS ACCESS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  robot terminal (claude code, PID 2000):                         │
│    $ rhx keyrack unlock --env prod                               │
│                                                                  │
│    ⚠️  no credentials available for this terminal                │
│                                                                  │
│    to request access from a human, an OTP has been generated.    │
│    ask the human to run:                                         │
│                                                                  │
│      $ rhx keyrack authorize abc-123                             │
│                                                                  │
│    (otp expires in 5 minutes)                                    │
│                                                                  │
│  daemon state:                                                   │
│    pendingOtps: {                                                │
│      "abc-123": {                                                │
│        robotPid: 2000,                                           │
│        robotPidfd: 8,                                            │
│        expiresAt: now + 5min                                     │
│      }                                                           │
│    }                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HUMAN AUTHORIZES                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  human terminal (PID 1000, has active session):                  │
│    $ rhx keyrack authorize abc-123                               │
│                                                                  │
│  daemon:                                                         │
│    1. lookup OTP → robotPid = 2000, robotPidfd = 8               │
│    2. verify human has active session (ancestry check)           │
│    3. create session for robot:                                  │
│         originatorPid: 2000                                      │
│         originatorPidfd: 8                                       │
│         grantorSession: human's session                          │
│         credentials: (linked from human's session)               │
│    4. delete OTP (single-use)                                    │
│                                                                  │
│    ✓ authorized terminal abc-123                                 │
│      granted access to: 5 credentials (env=prod)                 │
│      expires: 2024-01-15 18:00:00                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ROBOT USES CREDENTIALS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  robot terminal (PID 2000):                                      │
│    tool call spawns (PID 2001, PPID=2000):                       │
│      $ rhx keyrack get --key AWS_PROFILE --env prod              │
│                                                                  │
│  daemon:                                                         │
│    1. SO_PEERCRED → callerPid = 2001                             │
│    2. walk ancestry: 2001 → 2000                                 │
│    3. found session with originatorPid = 2000 ✓                  │
│    4. verify pidfd 8 still valid ✓                               │
│    5. return credential                                          │
│                                                                  │
│    → credential returned ✓                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**robot never stores a key. OTP is just for the human-robot handshake. access control is pure ancestry.**

---

### usecase 3: malicious browser extension (blocked)

```
┌─────────────────────────────────────────────────────────────────┐
│ ATTACK SCENARIO                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  human terminal (PID 1000) has active session                    │
│                                                                  │
│  browser (PID 3000, PPID=1, started by display manager)          │
│    └── extension process (PID 3001, PPID=3000)                   │
│          └── connects to daemon socket                           │
│          └── sends GET request                                   │
│                                                                  │
│  daemon:                                                         │
│    1. SO_PEERCRED → callerPid = 3001                             │
│    2. walk ancestry: 3001 → 3000 → 1                             │
│    3. no session has originatorPid in {3001, 3000, 1}            │
│    4. REJECT: "no valid session for this process"                │
│                                                                  │
│  attack blocked ✓                                                │
│                                                                  │
│  note: browser ancestry does NOT include terminal (PID 1000)     │
│        because browser was spawned by display manager, not       │
│        by the terminal.                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**ENFORCED isolation. kernel guarantees browser has different ancestry than terminal.**

---

### usecase 4: originator exits (session ends)

```
┌─────────────────────────────────────────────────────────────────┐
│ SESSION LIFECYCLE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  t=0  terminal (PID 1000) unlocks                                │
│         └── session created: originatorPid=1000, pidfd=7         │
│                                                                  │
│  t=1  terminal spawns long-run job (PID 1001, PPID=1000)         │
│         └── job runs in background                               │
│                                                                  │
│  t=2  terminal exits (user closes window)                        │
│         └── PID 1000 gone                                        │
│         └── pidfd 7 becomes invalid                              │
│                                                                  │
│  t=3  background job tries to get credential                     │
│         └── daemon walks ancestry: 1001 → 1 (1000 is gone)       │
│         └── no valid session found                               │
│         └── REJECT: "session originator exited"                  │
│                                                                  │
│  design choice: this is intentional for sudo credentials.        │
│  tight scope = originator must stay alive.                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**tradeoff accepted: no session continuity after originator exits. for sudo credentials, this is MORE secure.**

---

## .comparison to alternatives

| approach | cross-chain isolation | wrapper needed | key storage | originator exit |
|----------|----------------------|----------------|-------------|-----------------|
| @s inheritanceKey | NO (shared per login) | YES | @s | children continue |
| wrapper + isolated @s | YES | YES | @s | children continue |
| **ancestry tracking** | YES | NO | none | session ends |

ancestry tracking wins on simplicity and security. the only tradeoff is session continuity, which is acceptable (and even desirable) for elevated credentials.

---

## .security properties

### ENFORCED

| property | mechanism |
|----------|-----------|
| cross-chain isolation | kernel PPID immutability |
| PID reuse protection | pidfd tracks specific process |
| other-user isolation | socket 0600 permissions |

### CONVENED

| property | mechanism | gap |
|----------|-----------|-----|
| ptrace injection | YAMA ptrace_scope | depends on system config |
| exec() race | verify on every request | TOCTOU window |

### attack surface

| vector | outcome |
|--------|---------|
| browser extension | BLOCKED (different ancestry) |
| vscode plugin | BLOCKED (different ancestry) |
| cron job | BLOCKED (different ancestry) |
| PID reuse | BLOCKED (pidfd) |
| same-terminal malware | allowed (same ancestry) — out of scope |

---

## .deployment

### what works out of the box

ancestry tracking requires **no extra tools**. keyrack daemon handles it entirely:

| capability | mechanism | availability |
|------------|-----------|--------------|
| get caller PID | `SO_PEERCRED` socket option | all Unix (POSIX) |
| walk ancestry | `/proc/{pid}/stat` | all Linux |
| socket permissions | `chmod 0600` on socket file | all Unix (POSIX) |
| PID reuse protection | `pidfd_open()` syscall | Linux 5.3+ (Sept 2019) |

**no installation required**:
- no AppArmor profiles
- no SELinux policies
- no code-sign certificates
- no kernel modules
- no root privileges (beyond normal daemon setup)

the daemon reads `/proc` and uses standard socket APIs. that's it.

### system requirements

| requirement | minimum | recommended | why |
|-------------|---------|-------------|-----|
| Linux kernel | 4.x | 5.3+ | pidfd requires 5.3+; fallback to PID-only on older |
| glibc | 2.17 | 2.36+ | pidfd wrappers in newer glibc |
| filesystem | any | any | just needs `/proc` mounted (standard) |

**fallback for pre-5.3 kernels**:

```typescript
const getPidfd = (pid: number): number | null => {
  try {
    return pidfdOpen(pid, 0);  // Linux 5.3+
  } catch (e) {
    if (e.code === 'ENOSYS') {
      // kernel too old, fall back to PID-only (weaker, but still useful)
      return null;
    }
    throw e;
  }
};

const isSessionValid = (session: DaemonSession): boolean => {
  if (session.originatorPidfd !== null) {
    // strong check: pidfd is valid
    return isPidfdValid(session.originatorPidfd);
  }
  // weak check: process still exists (vulnerable to PID reuse)
  return processExists(session.originatorPid);
};
```

on older kernels, PID reuse attacks become possible (small window). on modern kernels (5.3+), pidfd eliminates this entirely.

### required security measures

these are **enforced by keyrack daemon** — it will fail fast if not met:

#### YAMA ptrace_scope (fail-fast check)

prevents other processes from code injection via ptrace. without this, an attacker with same UID could hijack a legitimate descendant process.

**keyrack checks this on daemon startup:**

```typescript
const assertYamaPtraceScope = (): void => {
  const scopePath = '/proc/sys/kernel/yama/ptrace_scope';

  // YAMA must be available
  if (!existsSync(scopePath)) {
    throw new Error(
      'YAMA ptrace protection not available. ' +
      'keyrack requires YAMA for secure session isolation.'
    );
  }

  const scope = parseInt(readFileSync(scopePath, 'utf-8').trim(), 10);

  // scope must be >= 1
  if (scope < 1) {
    throw new Error(
      `YAMA ptrace_scope is ${scope} (unsafe). keyrack requires >= 1.\n\n` +
      `to fix (temporary):\n` +
      `  echo 1 | sudo tee /proc/sys/kernel/yama/ptrace_scope\n\n` +
      `to fix (permanent):\n` +
      `  echo "kernel.yama.ptrace_scope = 1" | sudo tee /etc/sysctl.d/10-ptrace.conf\n` +
      `  sudo sysctl -p`
    );
  }
};
```

**scope values:**
- 0 = unsafe (any process can ptrace any other by same user) — **keyrack rejects**
- 1 = restricted (can only ptrace direct children) — **keyrack accepts** ← most distros default
- 2 = admin-only (need CAP_SYS_PTRACE) — **keyrack accepts**
- 3 = disabled (no ptrace) — **keyrack accepts**

**no escape hatch.** fail hard and fail fast:
- YAMA available but scope < 1 → fail with fix instructions
- YAMA not available → fail (ptrace protection required for sudo credentials)

#### socket directory permissions (auto-enforced)

keyrack daemon automatically enforces directory and socket permissions on startup.

**socket path**: `~/.rhachet/keyrack/keyrack.sock`

```
~/.rhachet/              # default permissions — other rhachet services live here
  └── keyrack/           # 700 (owner only) — keyrack's isolated directory
        └── keyrack.sock # 600 (owner only) — daemon socket
```

```typescript
const KEYRACK_DIR = path.join(os.homedir(), '.rhachet', 'keyrack');
const SOCKET_PATH = path.join(KEYRACK_DIR, 'keyrack.sock');

const ensureSecureSocketDir = (): void => {
  // create ~/.rhachet if absent (default permissions)
  const rhachetDir = path.join(os.homedir(), '.rhachet');
  if (!existsSync(rhachetDir)) {
    mkdirSync(rhachetDir);
  }

  // create ~/.rhachet/keyrack with 700 (owner only)
  if (!existsSync(KEYRACK_DIR)) {
    mkdirSync(KEYRACK_DIR, { mode: 0o700 });
  }

  // enforce 700 on keyrack directory
  const dirStat = statSync(KEYRACK_DIR);
  if ((dirStat.mode & 0o777) !== 0o700) {
    chmodSync(KEYRACK_DIR, 0o700);
  }
};

const createSecureSocket = (): void => {
  // ... create socket at SOCKET_PATH ...

  // enforce 600 on socket (owner only)
  chmodSync(SOCKET_PATH, 0o600);
};
```

**no user action required** — daemon handles this automatically. if permissions can't be set (e.g., directory owned by different user), daemon fails with clear error.

**why nested directory?** — `~/.rhachet/` is shared by other rhachet services (visible). `~/.rhachet/keyrack/` is keyrack-specific (locked down). this allows other services to coexist without permission conflicts.

### what keyrack does NOT need

| tool | why not needed |
|------|----------------|
| AppArmor | ancestry is kernel-enforced; no need to restrict file access patterns |
| SELinux | same — we rely on kernel PPID guarantee, not MAC policies |
| code-sign infra | ancestry tracks process tree, not binary identity (different threat model) |
| seccomp | daemon is not sandboxed; it needs /proc access |
| capabilities | daemon runs as normal user; no elevated caps needed |
| cgroups | ancestry is per-process, not per-cgroup |

### comparison to alternatives

| approach | extra tools needed | kernel version | root required | user setup |
|----------|-------------------|----------------|---------------|------------|
| **ancestry tracking** | none | 4.x (5.3+ for pidfd) | no* | none (auto-enforced) |
| code-signed ACLs (Linux IMA) | IMA setup, key management, policy files | 5.x+ | yes | extensive |
| AppArmor profiles | AppArmor, profile files, policy management | any | yes | per-binary profiles |
| SELinux policies | SELinux, policy modules | any | yes | policy files |
| eBPF-LSM | eBPF toolchain, custom LSM programs | 5.7+ | yes | custom programs |

\* root only needed if YAMA ptrace_scope < 1 (rare — most distros default to 1)

ancestry tracking wins on simplicity: **zero extra tools, zero policy files, auto-enforced security**.

---

## .open questions resolved

| question | resolution |
|----------|------------|
| how do children get the key? | they don't need it — daemon does ancestry lookup |
| how does robot get authorized? | OTP handshake, then daemon tracks robot's PID |
| what if shell exits? | session ends — acceptable for sudo, maybe configurable for regular |
| what about keyctl? | not used for session scope — ancestry tracking replaces it |

---

## .summary

**the insight**: ancestry tracking provides ENFORCED cross-chain isolation without any key management.

**what we gain**:
- no wrapper commands
- no key storage in @s
- no key relay in requests
- simpler architecture
- stronger isolation guarantees

**what we trade**:
- session ends when originator exits
- (acceptable for sudo; could be configurable for regular credentials)

**OTP role**: purely for the human-robot authorization handshake. not for session scope.

**daemon role**: track originator PIDs, verify ancestry on every request.

```
unlock → daemon records originatorPid (via SO_PEERCRED)
get    → daemon gets callerPid (via SO_PEERCRED)
       → daemon walks /proc to verify caller descends from originatorPid
       → daemon returns credential
```

**client never computes or sends any key.** daemon identifies caller purely from socket credentials + /proc ancestry walk.

that's it. no keys. just ancestry.

---

## .spoofability analysis

### the question

can a malicious process fake its identity to the daemon?

### the answer

**no.** all core mechanisms are kernel-enforced. a userspace process cannot lie about its identity.

### mechanism-by-mechanism analysis

| mechanism | spoofable? | why |
|-----------|------------|-----|
| PPID | ✗ no | kernel sets PPID at fork(); no syscall exists to change it; immutable for process lifetime |
| SO_PEERCRED | ✗ no | kernel fills in PID from socket connection; process cannot provide fake credentials |
| /proc/{pid}/stat | ✗ no | kernel-generated virtual filesystem; read-only; process cannot edit its own /proc entry |
| pidfd | ✗ no | kernel tracks specific process instance, not just PID number; survives PID reuse |
| YAMA ptrace | ✗ no | kernel blocks ptrace attach to non-children (scope >= 1); process cannot inject into peers |

### what an attacker would need

to spoof identity, an attacker would need to:

1. **change their PPID** — impossible; no syscall exists
2. **lie to SO_PEERCRED** — impossible; kernel fills in the value
3. **edit /proc** — impossible; kernel-generated, read-only
4. **ptrace a legitimate descendant** — blocked by YAMA scope >= 1
5. **reuse a PID after originator exits** — blocked by pidfd (tracks process instance, not number)

### what about exec() TOCTOU?

sometimes cited as a gap: "what if a process exec()'s to malware after ancestry check but before credential delivery?"

**this is not a real concern.** for this to work, a tool would need to:
1. connect to daemon and send request
2. exec() to another program **before read of response**
3. let the exec'd program receive the credential

no legitimate tool does this. the normal flow is: connect → request → **read response** → use credential. by the time any tool would exec(), it already has the credential.

see `ancestry.gap.toctou.ref.md` for detailed analysis.

### conclusion

the ancestry-based session scope is **not spoofable**. all identity mechanisms are kernel-enforced:
- PPID is immutable
- SO_PEERCRED is kernel-provided
- /proc is kernel-generated and read-only
- pidfd tracks process instances
- YAMA blocks ptrace injection

the residual attack surface is same-ancestry execution (npm postinstall, pip setup.py) — which is a supply chain problem, not an identity spoof problem. ancestry track correctly identifies these attackers as legitimate descendants; the problem is that they are legitimate descendants that run malicious code.

