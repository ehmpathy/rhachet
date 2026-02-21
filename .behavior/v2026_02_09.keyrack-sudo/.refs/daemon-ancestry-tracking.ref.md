# ref: daemon-side ancestry tracking

## .what

deep dive on whether a daemon can use process ancestry (ppid chain) to verify that a caller belongs to a specific terminal inheritance chain, and whether this could replace inheritanceKey-based session scope.

---

## .the idea

instead of keyctl-based inheritanceKey:

```
alternative: ancestry verification
┌─────────────────────────────────────────────────────────────────┐
│ at unlock time:                                                  │
│   1. daemon records originator PID (the process that ran unlock) │
│   2. daemon associates credentials with that originator PID      │
├─────────────────────────────────────────────────────────────────┤
│ at get time:                                                     │
│   1. daemon gets caller PID via SO_PEERCRED                      │
│   2. daemon walks caller's ancestry chain via /proc/{pid}/stat   │
│   3. daemon checks if originator PID appears in ancestry         │
│   4. if yes → grant access; if no → reject                       │
└─────────────────────────────────────────────────────────────────┘
```

**the question**: is this ENFORCED or CONVENED?

---

## .how ancestry chains work

### process creation model

```
when a process forks:
  - kernel creates child with new PID
  - kernel sets child's PPID = parent's PID
  - this is recorded in kernel task_struct
  - visible via /proc/{pid}/stat (field 4 = ppid)
  - visible via /proc/{pid}/status (PPid: line)
```

### ancestry chain example

```
terminal (PID 1000)
    │
    ├── bash (PID 1001, PPID=1000)
    │     │
    │     └── rhx keyrack get (PID 1002, PPID=1001)
    │
browser (PID 2000, PPID=1)  ← different ancestry
    │
    └── extension process (PID 2001, PPID=2000)
```

### read ancestry

```bash
# get PPID of a process
cat /proc/1002/stat | awk '{print $4}'
# → 1001

# walk the chain
get_ancestry() {
  local pid=$1
  while [ "$pid" -gt 1 ]; do
    echo "$pid"
    pid=$(cat /proc/$pid/stat 2>/dev/null | awk '{print $4}')
  done
}

get_ancestry 1002
# → 1002, 1001, 1000, ...
```

---

## .is ancestry kernel-enforced?

### what the kernel guarantees

| property | kernel behavior | ENFORCED? |
|----------|-----------------|-----------|
| PPID assignment | set atomically at fork() | ENFORCED |
| PPID immutability | cannot be changed after fork() | ENFORCED |
| PPID visibility | /proc/{pid}/stat readable by owner/root | ENFORCED |
| process existence | /proc/{pid} exists iff process exists | ENFORCED |

**key insight**: a process CANNOT change its PPID. this is a kernel invariant.

### what this means

```
process A (PID 1000) forks process B (PID 1001)
  → B.ppid = 1000 (kernel sets this)
  → B cannot change its ppid to pretend it came from C
  → this is ENFORCED by kernel
```

---

## .can ancestry be spoofed?

### attack 1: change my own PPID

**impossible**. there is no syscall to change a process's PPID. the kernel does not expose this capability.

```c
// no such syscall as:
setppid(fake_parent_pid);  // does not exist
```

### attack 2: PID reuse race

**scenario**:
```
t=0: legitimate shell (PID 1000) unlocks keyrack
t=1: daemon records originator = 1000
t=2: shell exits, PID 1000 freed
t=3: attacker spawns, kernel assigns PID 1000
t=4: attacker spawns child (PPID = 1000)
t=5: attacker's child connects to daemon
t=6: daemon walks ancestry, finds 1000 → grants access?
```

**analysis**:
- PID reuse is real (PIDs wrap around)
- but the NEW process with PID 1000 is NOT the original shell
- the daemon would need additional checks

**mitigation**: use **pidfd** (linux 5.3+)

```c
// at unlock time:
int originator_pidfd = pidfd_open(originator_pid, 0);
// this fd refers to THIS specific process, not just the PID number
// if the process exits and PID is reused, the pidfd becomes invalid

// at get time:
// verify pidfd still refers to a live process
// if not, the originator has exited → reject
```

**with pidfd**: PID reuse attack is **ENFORCED** against.

### attack 3: ptrace injection

**scenario**: attacker with ptrace capability injects code into a legitimate descendant

```
legitimate chain: terminal → bash → rhx
attacker: ptrace(PTRACE_ATTACH, rhx_pid)
attacker: inject code to steal credentials
```

**analysis**:
- requires CAP_SYS_PTRACE or same UID with no YAMA restrictions
- YAMA ptrace scope can restrict this (/proc/sys/kernel/yama/ptrace_scope)
- at scope 1: can only ptrace direct children
- at scope 2: can only ptrace with CAP_SYS_PTRACE
- at scope 3: no ptrace allowed

**mitigation**: YAMA ptrace_scope >= 1 (most distros default to 1)

**with YAMA**: ptrace injection is **CONVENED** (relies on system config, but widely deployed)

### attack 4: exec() to different binary

**scenario**:
```
t=0: legitimate app connects to daemon (ancestry valid)
t=1: daemon verifies ancestry → valid
t=2: app exec()'s to malware
t=3: daemon sends credential
t=4: malware receives credential
```

**analysis**: this is TOCTOU! ancestry was valid at t=1, but process became malware at t=2.

**mitigation options**:
1. verify ancestry at EVERY interaction (not just first)
2. combine with binary hash check (but that has its own TOCTOU)
3. use seccomp to prevent exec() after initial verification

**status**: CONVENED (TOCTOU window exists)

### attack 5: fork bomb to guess target PID

**impossible**. attacker cannot control which PID kernel assigns to their child. PID assignment is kernel-controlled.

---

## .comparison: ancestry vs inheritanceKey

| property | ancestry tracking | inheritanceKey (@s) |
|----------|------------------|---------------------|
| kernel-enforced PPID | yes | n/a |
| PID reuse protection | needs pidfd | n/a (key-based) |
| cross-session isolation | yes (different ancestry) | NO (@s shared per login) |
| TOCTOU at verify time | yes (exec race) | no (key is static) |
| setup requirement | none (kernel provides) | wrapper or unlock stores key |
| storage | daemon memory | kernel key store |

### the critical difference

**inheritanceKey with @s**:
- browser extension in same login session CAN read @s
- @s is per-login-session, not per-terminal-chain
- FAILS to isolate same-user different-chain

**ancestry tracking**:
- browser extension has DIFFERENT ancestry than terminal
- ancestry IS per-inheritance-chain
- SUCCEEDS at isolate same-user different-chain

---

## .would ancestry eliminate inheritanceKey?

### yes, mostly

if the daemon:
1. records originator PID + pidfd at unlock time
2. verifies caller is descendant of originator at get time
3. handles originator exit gracefully (invalidate session)

then **no inheritanceKey is needed** for the basic same-user isolation goal.

### but inheritanceKey still has value

| scenario | ancestry | inheritanceKey |
|----------|----------|----------------|
| same-user different-chain isolation | works | fails (@s shared) |
| peer terminal authorization (robot) | complex (how to verify robot's terminal?) | natural (robot has its own key) |
| originator exits, children continue | session invalidated | children still have key |
| multiple unlock sessions | must track multiple originators | each session has unique key |

### hybrid approach

```
┌─────────────────────────────────────────────────────────────────┐
│ HYBRID: ancestry + inheritanceKey                               │
├─────────────────────────────────────────────────────────────────┤
│ at unlock time:                                                  │
│   1. daemon records originator PID + pidfd                       │
│   2. daemon generates inheritanceKey                             │
│   3. daemon returns inheritanceKey to caller                     │
│   4. caller stores inheritanceKey in @s (for children)           │
│   5. daemon associates credentials with BOTH:                    │
│      - originator pidfd (primary verification)                   │
│      - inheritanceKey (fallback for children after parent exit)  │
├─────────────────────────────────────────────────────────────────┤
│ at get time:                                                     │
│   1. daemon gets caller PID via SO_PEERCRED                      │
│   2. daemon reads inheritanceKey from request                    │
│   3. IF originator pidfd still valid:                            │
│      - verify caller is descendant of originator                 │
│   4. ELSE (originator exited):                                   │
│      - verify inheritanceKey matches session                     │
│   5. grant or reject                                             │
└─────────────────────────────────────────────────────────────────┘
```

**benefit**:
- ancestry provides ENFORCED cross-chain isolation
- inheritanceKey provides session continuity if shell exits
- defense in depth

---

## .implementation sketch

### daemon state

```typescript
interface DaemonSession {
  originatorPid: number;
  originatorPidfd: number;       // file descriptor from pidfd_open()
  inheritanceKey: string;        // fallback for children after parent exit
  credentials: Map<Slug, KeyrackKeyGrant>;
  createdAt: IsoTimeStamp;
  expiresAt: IsoTimeStamp;
}

interface DaemonState {
  sessions: Map<InheritanceKey, DaemonSession>;
}
```

### ancestry verification

```typescript
const isDescendantOf = (
  callerPid: number,
  ancestorPid: number,
): boolean => {
  let current = callerPid;
  while (current > 1) {
    if (current === ancestorPid) return true;
    const stat = readFileSync(`/proc/${current}/stat`, 'utf-8');
    const ppid = parseInt(stat.split(' ')[3], 10);
    current = ppid;
  }
  return false;
};

const isPidfdValid = (pidfd: number): boolean => {
  try {
    // pidfd_send_signal with signal 0 checks if process exists
    // returns 0 if exists, -1 if not
    return pidfdSendSignal(pidfd, 0) === 0;
  } catch {
    return false;
  }
};
```

### get command handler

```typescript
const handleGetCommand = (
  input: { slug: string; inheritanceKey: string },
  callerPid: number,
  state: DaemonState,
): GetResponse => {
  const session = state.sessions.get(input.inheritanceKey);
  if (!session) {
    return { error: 'invalid session' };
  }

  // primary: ancestry verification (if originator still alive)
  if (isPidfdValid(session.originatorPidfd)) {
    if (!isDescendantOf(callerPid, session.originatorPid)) {
      return { error: 'caller not in session ancestry chain' };
    }
  }
  // fallback: inheritanceKey alone (originator exited, but children have key)
  // the key match already passed (we found the session)

  // check expiry
  if (session.expiresAt < Date.now()) {
    state.sessions.delete(input.inheritanceKey);
    return { error: 'session expired' };
  }

  // return credential
  const credential = session.credentials.get(input.slug);
  if (!credential) {
    return { error: 'credential not found' };
  }

  return { key: credential.key };
};
```

---

## .security analysis

### ENFORCED protections (with this design)

| protection | mechanism |
|------------|-----------|
| cross-chain isolation | ancestry verification (kernel PPID is immutable) |
| PID reuse | pidfd (kernel tracks specific process, not just PID number) |
| other users | socket 0600 (kernel file permissions) |

### CONVENED protections

| protection | mechanism | gap |
|------------|-----------|-----|
| ptrace injection | YAMA ptrace_scope | depends on system config |
| exec() race | multiple verifications | TOCTOU window still exists |
| binary identity | hash check | TOCTOU |

### what this achieves

```
browser (different ancestry from terminal)
  └── malicious extension
        └── connects to daemon
              └── daemon checks ancestry
                    └── NOT descendant of terminal's originator
                          └── REJECTED ✓
```

**the browser extension attack is now BLOCKED** — because it has different ancestry than the terminal that ran unlock.

---

## .key insight

> **ancestry tracking provides ENFORCED cross-chain isolation.**
>
> process PPID is immutable and kernel-controlled. a browser extension cannot fake descent from a terminal.
>
> combined with pidfd for PID reuse protection, this provides stronger guarantees than @s (which is shared per login session).
>
> inheritanceKey is still valuable as:
> 1. a fallback when originator exits
> 2. a natural mechanism for peer terminal authorization
> 3. a defense-in-depth layer
>
> the hybrid approach (ancestry + inheritanceKey) provides both ENFORCED cross-chain isolation and session continuity.

---

## .summary

| question | answer |
|----------|--------|
| can ancestry be spoofed? | NO — PPID is kernel-immutable |
| is ancestry kernel-enforced? | YES — set at fork(), cannot be changed |
| does ancestry have TOCTOU? | YES — exec() race exists (same as all userspace checks) |
| would this eliminate inheritanceKey? | MOSTLY — but inheritanceKey still valuable for fallback and peer auth |
| recommended approach? | HYBRID — ancestry for cross-chain isolation, inheritanceKey for session continuity |

---

## .sources

- [Linux process credentials](https://man7.org/linux/man-pages/man7/credentials.7.html)
- [pidfd_open(2)](https://man7.org/linux/man-pages/man2/pidfd_open.2.html)
- [pidfd_send_signal(2)](https://man7.org/linux/man-pages/man2/pidfd_send_signal.2.html)
- [YAMA ptrace scope](https://www.kernel.org/doc/html/latest/admin-guide/LSM/Yama.html)
- [/proc filesystem](https://man7.org/linux/man-pages/man5/proc.5.html)

