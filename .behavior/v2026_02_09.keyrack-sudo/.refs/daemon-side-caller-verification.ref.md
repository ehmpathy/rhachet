# ref: daemon-side caller verification (deep dive)

## .what

deep dive on how a userspace daemon can verify the identity of processes that connect to it, the TOCTOU (time-of-check to time-of-use) vulnerabilities involved, and practical mitigations.

this is the most practical approach for keyrack v1.5 — achievable without kernel modules or eBPF.

---

## .enforced vs convened security

### definitions

| type | what it means | who it protects against |
|------|---------------|------------------------|
| **ENFORCED** | system prevents violation even if actor tries to break it | malicious actors with intent to bypass |
| **CONVENED** | system guides correct behavior; actor could bypass if they tried | well-intentioned actors who might make mistakes |

### daemon-side verification classification

| protection | type | why |
|------------|------|-----|
| socket 0600 | ENFORCED | kernel prevents other users from connect |
| SO_PEERCRED UID | ENFORCED | kernel provides, cannot be faked |
| pidfd validation | ENFORCED | kernel prevents PID reuse race |
| /proc/{pid}/exe read | CONVENED | process could exec() between read and use |
| binary hash check | CONVENED | TOCTOU window allows race |
| multiple hash passes | CONVENED | shrinks window but doesn't eliminate |
| audit trail | CONVENED | relies on daemon honesty |

**key insight**: daemon-side caller verification is fundamentally CONVENED because the check and use happen in different moments. only kernel-level atomic operations can be ENFORCED.

---

## .the mechanism

### step-by-step flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Caller connects to daemon's unix socket                   │
│                                                              │
│    caller process ──────connect()──────► daemon socket       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Daemon extracts caller's credentials via SO_PEERCRED     │
│                                                              │
│    struct ucred {                                            │
│      pid_t pid;   // caller's process ID                     │
│      uid_t uid;   // caller's user ID                        │
│      gid_t gid;   // caller's group ID                       │
│    };                                                        │
│                                                              │
│    getsockopt(fd, SOL_SOCKET, SO_PEERCRED, &cred, &len);    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Daemon reads caller's executable path                     │
│                                                              │
│    readlink("/proc/{pid}/exe", exe_path, sizeof(exe_path)); │
│                                                              │
│    example result: "/usr/bin/git"                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Daemon computes hash of the binary                        │
│                                                              │
│    fd = open(exe_path, O_RDONLY);                            │
│    while (read(fd, buf, sizeof(buf)) > 0)                    │
│      sha256_update(&ctx, buf);                               │
│    sha256_final(&ctx, hash);                                 │
│                                                              │
│    example result: "a1b2c3d4e5f6..."                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Daemon checks hash against ACL                            │
│                                                              │
│    if (hash in allowed_hashes[secret_id]) {                  │
│      return secret;                                          │
│    } else {                                                  │
│      log_warn("unknown caller", { pid, exe_path, hash });    │
│      return error; // or prompt user                         │
│    }                                                         │
└──────────────────────────────────────────────────────────────┘
```

### code example (node.js)

```typescript
import { createServer } from 'net';
import { readlink, readFile } from 'fs/promises';
import { createHash } from 'crypto';

const server = createServer(async (socket) => {
  // step 2: get caller credentials
  const fd = (socket as any)._handle.fd;
  const cred = getpeercred(fd); // native bind needed
  const { pid, uid } = cred;

  // step 3: get caller's executable path
  const exePath = await readlink(`/proc/${pid}/exe`);

  // step 4: compute hash of the binary
  const binary = await readFile(exePath);
  const hash = createHash('sha256').update(binary).digest('hex');

  // step 5: check against ACL
  const request = await readRequest(socket);
  const allowedHashes = getAclForSecret(request.secretId);

  if (!allowedHashes.includes(hash)) {
    log.warn('unknown caller', { pid, uid, exePath, hash });
    socket.write(JSON.stringify({ error: 'access denied' }));
    return;
  }

  // grant access
  const secret = getSecret(request.secretId);
  socket.write(JSON.stringify({ value: secret }));
});
```

---

## .the TOCTOU problem

### what is TOCTOU?

**time-of-check to time-of-use**: the state of the system can change between when you check a value and when you use the result of that check.

```
timeline:
                    ┌─────────────────────────────────────┐
  t=0  caller       │ connect to daemon                   │
                    └─────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────────────────────┐
  t=1  daemon       │ read /proc/{pid}/exe → "/usr/bin/git"│
                    └─────────────────────────────────────┘
                              │
                    ┌─────────────────────────────────────┐
  t=2  daemon       │ compute hash of /usr/bin/git        │
                    │ hash matches ACL → allow access     │◄─── CHECK
                    └─────────────────────────────────────┘
                              │
       ════════════ RACE WINDOW ════════════
                              │
                    ┌─────────────────────────────────────┐
  t=3  attacker     │ exec("/malware") in same process    │◄─── CHANGE
                    │ OR: kill caller, reuse PID          │
                    └─────────────────────────────────────┘
                              │
                    ┌─────────────────────────────────────┐
  t=4  daemon       │ send secret to socket               │◄─── USE
                    │ but caller is now malware!          │
                    └─────────────────────────────────────┘
```

### attack vectors

#### attack 1: exec() after connect

```
1. legitimate app (/usr/bin/git) connects to daemon
2. daemon verifies /proc/{pid}/exe = /usr/bin/git ✓
3. before daemon responds, app calls exec("/malware")
4. daemon sends secret to socket
5. malware receives the secret
```

**feasibility**: requires attacker to control the legitimate app's code, or inject code via LD_PRELOAD, ptrace, etc.

#### attack 2: PID reuse

```
1. legitimate app connects to daemon
2. daemon reads PID from SO_PEERCRED
3. legitimate app crashes or exits
4. attacker quickly spawns new process
5. new process may get the same PID (PID reuse)
6. daemon reads /proc/{pid}/exe → now points to attacker's binary
7. if attacker's hash is in ACL (unlikely), access granted
```

**feasibility**: PID reuse is rare on modern systems (32-bit PID space, sequential allocation). but possible under heavy load or with PID namespace manipulation.

#### attack 3: /proc race

```
1. daemon opens /proc/{pid}/exe
2. daemon starts to read the binary to compute hash
3. binary is replaced on disk (e.g., package update)
4. daemon reads a mix of old and new bytes
5. hash is garbage, but if attacker controls the schedule...
```

**feasibility**: very difficult to exploit, but theoretically possible.

#### attack 4: symlink manipulation

```
1. caller's /proc/{pid}/exe points to a symlink
2. daemon follows symlink to get binary path
3. attacker changes symlink target
4. daemon hashes the wrong binary
```

**feasibility**: /proc/{pid}/exe is a magic symlink managed by the kernel, not a real symlink. this attack doesn't work against /proc, but could work if daemon followed other symlinks.

---

## .mitigations

### mitigation 1: use pidfd for stable process handle

`pidfd_open()` (linux 5.3+) returns a file descriptor that refers to a specific process, not just a PID number. the fd remains valid even if the PID is reused.

```c
// get a stable handle to the process
int pidfd = pidfd_open(pid, 0);
if (pidfd < 0) {
  // process already exited
  return -ESRCH;
}

// read exe via pidfd (linux 5.6+)
char exe_path[PATH_MAX];
snprintf(proc_path, sizeof(proc_path), "/proc/self/fd/%d/exe", pidfd);
readlink(proc_path, exe_path, sizeof(exe_path));

// verify process still alive before send
if (pidfd_send_signal(pidfd, 0, NULL, 0) < 0) {
  // process exited between check and now
  close(pidfd);
  return -ESRCH;
}

// send secret
send(socket_fd, secret, secret_len, 0);

close(pidfd);
```

**benefit**: prevents PID reuse attacks. if process exits, pidfd becomes invalid.

**limitation**: doesn't prevent exec() attacks (same process, different binary).

### mitigation 2: verify exe multiple times

check the binary hash before AND after critical operations:

```typescript
// check 1: before read request
const hash1 = await computeCallerHash(pid);
if (!isAllowed(hash1)) return deny();

// read the request
const request = await readRequest(socket);

// check 2: after read request, before send
const hash2 = await computeCallerHash(pid);
if (hash1 !== hash2) {
  log.warn('caller binary changed mid-request', { pid, hash1, hash2 });
  return deny();
}

// check 3: immediately before send
const hash3 = await computeCallerHash(pid);
if (hash1 !== hash3) return deny();

// send secret
socket.write(secret);

// check 4: after send (for audit, can't prevent)
const hash4 = await computeCallerHash(pid);
if (hash1 !== hash4) {
  log.warn('caller changed after secret sent', { pid });
}
```

**benefit**: shrinks the race window significantly.

**limitation**: doesn't eliminate the window, just makes it smaller. determined attacker can still race.

### mitigation 3: require caller to hold the socket

the exec() syscall closes all file descriptors marked `FD_CLOEXEC` (close-on-exec). by default, most fds are NOT cloexec.

but we can require the caller to prove they still hold the original socket:

```
protocol:
1. daemon sends a random challenge nonce
2. caller must echo the nonce back
3. if caller exec()'d, the socket fd may have been closed
   OR the new binary doesn't know the protocol
4. daemon verifies nonce before send secret
```

**benefit**: if caller exec()'s to malware that doesn't implement the protocol, access fails.

**limitation**: malware that implements the protocol can still receive secrets.

### mitigation 4: tie secret to specific file descriptor

send the secret via a mechanism that's tied to the specific connection:

```c
// use SCM_RIGHTS to send a fd that holds the secret
// the fd is only valid in the receiver process's fd table

int secret_fd = memfd_create("secret", MFD_CLOEXEC);
write(secret_fd, secret, secret_len);
lseek(secret_fd, 0, SEEK_SET);

// send fd via SCM_RIGHTS
struct msghdr msg = { ... };
struct cmsghdr *cmsg = CMSG_FIRSTHDR(&msg);
cmsg->cmsg_level = SOL_SOCKET;
cmsg->cmsg_type = SCM_RIGHTS;
memcpy(CMSG_DATA(cmsg), &secret_fd, sizeof(secret_fd));

sendmsg(socket_fd, &msg, 0);
```

**benefit**: if caller exec()'s, the received fd is closed (if CLOEXEC). new process can't access it.

**limitation**: caller can clear CLOEXEC flag before exec(), or read secret before exec().

### mitigation 5: use prctl() restrictions

require callers to apply restrictions that limit their ability to escape:

```c
// caller must call this before request
prctl(PR_SET_DUMPABLE, 0);      // prevent ptrace attach
prctl(PR_SET_NO_NEW_PRIVS, 1);  // prevent setuid escalation
```

daemon verifies via `/proc/{pid}/status`:
```
# check that caller applied restrictions
cat /proc/{pid}/status | grep -E "^(NoNewPrivs|TracerPid):"
# NoNewPrivs: 1
# TracerPid: 0
```

**benefit**: prevents ptrace injection attacks.

**limitation**: doesn't prevent exec() attack. caller can still exec() another binary.

### mitigation 6: use seccomp to block exec()

most aggressive: require caller to install a seccomp filter that blocks exec():

```c
// caller must install this before request
struct sock_filter filter[] = {
  BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
  BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_execve, 0, 1),
  BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL),
  BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_execveat, 0, 1),
  BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL),
  BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
};

struct sock_fprog prog = {
  .len = sizeof(filter) / sizeof(filter[0]),
  .filter = filter,
};

prctl(PR_SET_NO_NEW_PRIVS, 1);
prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog);
```

daemon verifies via `/proc/{pid}/status`:
```
Seccomp:    2    # 2 = SECCOMP_MODE_FILTER
Seccomp_filters:    1
```

**benefit**: caller literally cannot exec() — kernel will kill the process if it tries.

**limitation**:
- requires caller cooperation (must install filter)
- malware won't cooperate
- breaks legitimate callers that need to exec()

---

## .practical implementation for keyrack

### recommended approach: layered defense

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Basic verification (always)                         │
│   - SO_PEERCRED to get PID/UID                               │
│   - /proc/{pid}/exe to get binary path                       │
│   - sha256 of binary                                         │
│   - check against ACL                                        │
├──────────────────────────────────────────────────────────────┤
│ Layer 2: pidfd for stable handle (linux 5.3+)                │
│   - use pidfd_open() instead of raw PID                      │
│   - verify process still alive before send                   │
├──────────────────────────────────────────────────────────────┤
│ Layer 3: Multiple verification passes                        │
│   - check hash before request parse                          │
│   - check hash after request parse                           │
│   - check hash immediately before send                       │
│   - log if any check differs                                 │
├──────────────────────────────────────────────────────────────┤
│ Layer 4: Audit trail (always)                                │
│   - log every access attempt with full context               │
│   - pid, uid, exe_path, hash, secret_id, allowed/denied      │
│   - enables post-hoc detection of attacks                    │
├──────────────────────────────────────────────────────────────┤
│ Layer 5: Optional strict mode (opt-in per secret)            │
│   - require PR_SET_DUMPABLE = 0                              │
│   - require NoNewPrivs = 1                                   │
│   - deny if not set                                          │
└──────────────────────────────────────────────────────────────┘
```

### keyrack daemon pseudocode

```typescript
const handleGetRequest = async (
  socket: Socket,
  request: { secretId: string },
  context: { log: LogMethods },
): Promise<void> => {
  // layer 1: basic verification
  const cred = getpeercred(socket);
  const pidfd = pidfdOpen(cred.pid); // layer 2

  const exePath = await readlink(`/proc/${cred.pid}/exe`);
  const hash1 = await computeHash(exePath);

  const keyHost = await getKeyHost(request.secretId);
  const allowed = keyHost.allowedHashes ?? []; // empty = allow all (legacy)

  // layer 3: first check
  if (allowed.length > 0 && !allowed.includes(hash1)) {
    context.log.warn('access denied: unknown caller', {
      pid: cred.pid,
      uid: cred.uid,
      exePath,
      hash: hash1,
      secretId: request.secretId,
    });
    socket.write(JSON.stringify({ error: 'access denied' }));
    return;
  }

  // layer 3: second check (after request parse)
  const hash2 = await computeHash(exePath);
  if (hash1 !== hash2) {
    context.log.warn('caller binary changed mid-request', {
      pid: cred.pid,
      hash1,
      hash2,
    });
    socket.write(JSON.stringify({ error: 'access denied' }));
    return;
  }

  // layer 2: verify process still alive
  if (!isPidfdValid(pidfd)) {
    context.log.warn('caller exited before response', { pid: cred.pid });
    return;
  }

  // layer 3: third check (immediately before send)
  const hash3 = await computeHash(exePath);
  if (hash1 !== hash3) {
    context.log.warn('caller binary changed before send', {
      pid: cred.pid,
      hash1,
      hash3,
    });
    socket.write(JSON.stringify({ error: 'access denied' }));
    return;
  }

  // layer 4: audit log
  context.log.info('access granted', {
    pid: cred.pid,
    uid: cred.uid,
    exePath,
    hash: hash1,
    secretId: request.secretId,
  });

  // send secret
  const secret = await getSecret(request.secretId);
  socket.write(JSON.stringify({ value: secret }));

  pidfdClose(pidfd);
};
```

---

## .threat model summary

| attack | mitigated by | residual risk |
|--------|--------------|---------------|
| other user connects | socket 0600 | none (kernel-enforced) |
| PID reuse | pidfd | none (kernel-enforced) |
| exec() after connect | multiple hash checks | small window remains |
| ptrace injection | PR_SET_DUMPABLE check | opt-in, not guaranteed |
| binary replaced on disk | multiple hash checks | unlikely attack via schedule control |
| malware in ACL | - | if attacker controls allowed binary, game over |

### honest assessment

> daemon-side verification **significantly raises the bar** for same-user attacks, but **does not eliminate them**.
>
> a determined attacker with same-user access and ability to control operation schedule precisely can still race the checks.
>
> the practical impact: opportunistic malware (npm packages, browser extensions) will be blocked. targeted, sophisticated attacks may succeed.
>
> for most threat models, this is acceptable — especially combined with short TTLs and audit logs.

---

## .comparison to macOS

| aspect | macOS Keychain | daemon-side verification |
|--------|----------------|--------------------------|
| enforcement | kernel | userspace |
| verification moment | at syscall boundary | at daemon's leisure |
| race window | none (atomic) | small but non-zero |
| code identity | CDHASH (tamper-proof) | sha256 (can race) |
| certificate chain | yes (Apple CA) | no |
| user prompts | built-in | requires custom impl |

---

## .sources

- [SO_PEERCRED man page](https://man7.org/linux/man-pages/man7/unix.7.html)
- [pidfd_open(2)](https://man7.org/linux/man-pages/man2/pidfd_open.2.html)
- [seccomp(2)](https://man7.org/linux/man-pages/man2/seccomp.2.html)
- [prctl(2) - PR_SET_DUMPABLE](https://man7.org/linux/man-pages/man2/prctl.2.html)
- [TOCTOU Race Conditions](https://cwe.mitre.org/data/definitions/367.html)
- [Exploit of TOCTOU in /proc](https://lwn.net/Articles/756233/)
