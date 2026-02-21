# ref: eBPF-LSM access control (deep dive)

## .what

deep dive on how eBPF with Linux Security Modules (LSM) can provide kernel-enforced access control for credential retrieval — the most capable approach for linux parity with macOS Keychain ACLs.

this is a **future consideration** for keyrack — high implementation effort, but strongest security guarantees.

---

## .background

### what is eBPF?

**extended Berkeley Packet Filter** — a technology that allows sandboxed programs to run inside the linux kernel without a kernel module. originally for network packet filter, now used for:

- observability (tracepoints, kprobes)
- security (LSM hooks)
- network (XDP, traffic control)

```
┌──────────────────────────────────────────────────────────────┐
│                        userspace                              │
│                                                              │
│   your app ──────► bpf() syscall ──────► load eBPF program   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                        kernel                                 │
│                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │  verifier   │───►│  JIT compile│───►│  attach to  │     │
│   │  (safety)   │    │  (native)   │    │  hook point │     │
│   └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
│   hooks: tracepoints, kprobes, LSM, XDP, ...                │
└──────────────────────────────────────────────────────────────┘
```

### what is LSM?

**Linux Security Modules** — a framework that allows security policies to be plugged into the kernel. examples:

- **SELinux** — mandatory access control (MAC)
- **AppArmor** — path-based MAC
- **Smack** — simplified MAC
- **eBPF-LSM** — programmable security hooks via eBPF

LSM hooks are called at security-critical points:

```
┌──────────────────────────────────────────────────────────────┐
│ process calls open("/etc/passwd", O_RDONLY)                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ kernel: vfs_open()                                           │
│                                                              │
│   ┌─────────────────────────────────────────────────┐       │
│   │ security_file_open(file)  ◄─── LSM hook         │       │
│   │   ├─► SELinux check                             │       │
│   │   ├─► AppArmor check                            │       │
│   │   └─► eBPF-LSM check (if attached)              │       │
│   └─────────────────────────────────────────────────┘       │
│                                                              │
│   if any LSM returns -EACCES → deny                         │
│   else → proceed with open                                   │
└──────────────────────────────────────────────────────────────┘
```

### eBPF-LSM (BPF_LSM)

introduced in linux 5.7 (2020), eBPF-LSM allows:

- attach eBPF programs to LSM hooks
- make allow/deny decisions based on custom logic
- access kernel data structures (task, file, inode, etc)
- update BPF maps (for policy storage, audit logs)

```c
// example: deny access to /etc/shadow for non-root
SEC("lsm/file_open")
int BPF_PROG(deny_shadow_access, struct file *file) {
    const char *filename = BPF_CORE_READ(file, f_path.dentry, d_name.name);

    // check if file is /etc/shadow
    if (bpf_strncmp(filename, 6, "shadow") == 0) {
        // check if caller is root
        __u32 uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
        if (uid != 0) {
            return -EACCES;  // deny
        }
    }

    return 0;  // allow
}
```

---

## .how it applies to keyrack

### the vision

instead of daemon-side verification (userspace, TOCTOU vulnerable), use eBPF-LSM for kernel-enforced access control:

```
┌──────────────────────────────────────────────────────────────┐
│ caller process wants to connect to keyrack daemon            │
│                                                              │
│   connect("/run/keyrack/keyrack.sock")                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ kernel: security_socket_connect()  ◄─── LSM hook             │
│                                                              │
│   ┌─────────────────────────────────────────────────┐       │
│   │ keyrack eBPF program attached here              │       │
│   │                                                 │       │
│   │ 1. get caller's exe path from task_struct      │       │
│   │ 2. compute hash of caller binary               │       │
│   │ 3. lookup hash in BPF map (ACL)                │       │
│   │ 4. if not in ACL → return -EACCES              │       │
│   │ 5. if in ACL → return 0 (allow)                │       │
│   └─────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
    ┌───────────────┐                   ┌───────────────┐
    │ -EACCES       │                   │ 0 (allow)     │
    │ connect fails │                   │ connect ok    │
    └───────────────┘                   └───────────────┘
```

### why this is better than daemon-side verification

| aspect | daemon-side | eBPF-LSM |
|--------|-------------|----------|
| enforcement point | userspace (after connect) | kernel (at connect) |
| TOCTOU window | yes (check → use gap) | no (atomic check) |
| race conditions | possible | eliminated |
| exec() attack | possible (small window) | blocked (check at syscall) |
| PID reuse attack | mitigated via pidfd | not applicable |
| performance | overhead (hash binary) | minimal (JIT compiled) |
| bypass via ptrace | possible | blocked by LSM |

### key insight: atomic enforcement

the critical difference is **when** the check happens:

```
daemon-side:
  t=0  connect() succeeds (no check yet)
  t=1  daemon receives connection
  t=2  daemon reads /proc/pid/exe    ◄─── check
  t=3  daemon computes hash
  t=4  daemon sends secret           ◄─── use

  TOCTOU window: t=2 to t=4
  attacker can exec() in this window

eBPF-LSM:
  t=0  connect() triggers LSM hook   ◄─── check AND gate
  t=0  if allowed: connect succeeds
  t=0  if denied: connect fails with EACCES

  no window: check IS the gate
  attacker cannot exec() — they haven't connected yet
```

---

## .implementation approach

### step 1: define the BPF program

```c
// keyrack_lsm.bpf.c

#include <vmlinux.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

// map: allowed binary hashes → 1
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u8[32]);   // sha256 hash
    __type(value, u8);     // 1 = allowed
} allowed_hashes SEC(".maps");

// map: keyrack socket inode → 1 (to identify our socket)
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1);
    __type(key, u64);      // inode number
    __type(value, u8);     // 1 = is keyrack socket
} keyrack_socket SEC(".maps");

SEC("lsm/socket_connect")
int BPF_PROG(keyrack_socket_connect,
             struct socket *sock,
             struct sockaddr *address,
             int addrlen)
{
    // check if this is a unix socket
    if (sock->type != SOCK_STREAM)
        return 0;

    struct sockaddr_un *addr = (struct sockaddr_un *)address;
    if (addr->sun_family != AF_UNIX)
        return 0;

    // check if this is the keyrack socket
    // (we identify it by inode, set by userspace loader)
    struct inode *inode = BPF_CORE_READ(sock, sk, sk_socket, file, f_inode);
    u64 ino = BPF_CORE_READ(inode, i_ino);

    u8 *is_keyrack = bpf_map_lookup_elem(&keyrack_socket, &ino);
    if (!is_keyrack)
        return 0;  // not keyrack socket, allow

    // this IS the keyrack socket — enforce ACL

    // get caller's executable path
    struct task_struct *task = (struct task_struct *)bpf_get_current_task();
    struct file *exe_file = BPF_CORE_READ(task, mm, exe_file);

    // compute hash of executable
    // NOTE: this is simplified — real impl needs to read file contents
    //       which is complex in BPF context
    u8 hash[32];
    // ... hash computation ...

    // check if hash is in allowed list
    u8 *allowed = bpf_map_lookup_elem(&allowed_hashes, hash);
    if (!allowed) {
        // not in ACL — deny
        return -EACCES;
    }

    return 0;  // allowed
}

char LICENSE[] SEC("license") = "GPL";
```

### step 2: userspace loader

```typescript
// keyrackLsmLoader.ts

import { execSync } from 'child_process';
import { statSync } from 'fs';

/**
 * .what = loads the keyrack eBPF-LSM program into the kernel
 * .why = enables kernel-enforced ACL for keyrack socket connections
 */
export const loadKeyrackLsm = async (input: {
  socketPath: string;
  allowedHashes: string[];
}): Promise<void> => {
  // get socket inode
  const stat = statSync(input.socketPath);
  const inode = stat.ino;

  // load BPF program
  // uses libbpf or bpftool
  execSync(`bpftool prog load keyrack_lsm.bpf.o /sys/fs/bpf/keyrack_lsm`);

  // attach to LSM hook
  execSync(`bpftool prog attach pinned /sys/fs/bpf/keyrack_lsm lsm`);

  // populate keyrack_socket map with our socket's inode
  execSync(`bpftool map update pinned /sys/fs/bpf/keyrack_socket \
    key hex ${inode.toString(16).padStart(16, '0')} \
    value hex 01`);

  // populate allowed_hashes map
  for (const hash of input.allowedHashes) {
    execSync(`bpftool map update pinned /sys/fs/bpf/allowed_hashes \
      key hex ${hash} \
      value hex 01`);
  }
};
```

### step 3: integration with keyrack daemon

```typescript
// createKeyrackDaemonServer.ts (modified)

import { loadKeyrackLsm } from './keyrackLsmLoader';

export const createKeyrackDaemonServer = async (input: {
  socketPath: string;
  acl: KeyrackAcl;
}): Promise<Server> => {
  const server = createServer(handleConnection);

  // start server
  await new Promise<void>((resolve) => {
    server.listen(input.socketPath, resolve);
  });

  // set socket permissions (defense in depth)
  chmodSync(input.socketPath, 0o600);

  // load eBPF-LSM if available
  if (isEbpfLsmSupported()) {
    const hashes = computeAllowedHashes(input.acl);
    await loadKeyrackLsm({
      socketPath: input.socketPath,
      allowedHashes: hashes,
    });
    log.info('eBPF-LSM access control enabled');
  } else {
    log.warn('eBPF-LSM not available, use socket permissions only');
  }

  return server;
};
```

---

## .challenges

### challenge 1: compute hash in BPF context

BPF programs have strict limitations:
- no unbounded loops
- limited stack size (512 bytes)
- no direct file I/O

to compute a binary hash in BPF:

**option A: pre-compute and cache**
```
userspace                          kernel (BPF)
    │                                  │
    │ compute hash of /usr/bin/git     │
    │ store in BPF map                 │
    └─────────────────────────────────►│
                                       │
    when git connects:                 │
    │◄─────────────────────────────────│ lookup by exe path
    │                                  │ return cached hash
```

limitation: requires userspace to know all binaries in advance.

**option B: kernel helper for file hash**

linux 5.17+ added `bpf_d_path()` to get file path in BPF.
linux 6.1+ has better file access primitives.

but full file hash in BPF is still impractical — too much data.

**option C: IMA integration**

IMA (Integrity Measurement Architecture) already computes file hashes:
- hashes stored in extended attributes
- accessible via `security.ima` xattr
- BPF can read xattrs via `bpf_ima_inode_hash()` (linux 5.11+)

```c
SEC("lsm/socket_connect")
int BPF_PROG(keyrack_socket_connect, struct socket *sock, ...) {
    struct task_struct *task = bpf_get_current_task();
    struct file *exe = BPF_CORE_READ(task, mm, exe_file);

    // get IMA hash (pre-computed by kernel)
    u8 hash[32];
    int ret = bpf_ima_inode_hash(exe->f_inode, hash, sizeof(hash));
    if (ret < 0)
        return -EACCES;  // no IMA hash = deny

    // lookup in allowed map
    u8 *allowed = bpf_map_lookup_elem(&allowed_hashes, hash);
    return allowed ? 0 : -EACCES;
}
```

### challenge 2: kernel version requirements

| feature | minimum kernel |
|---------|----------------|
| eBPF core | 3.18 |
| BPF_LSM | 5.7 |
| bpf_d_path() | 5.10 |
| bpf_ima_inode_hash() | 5.11 |
| sleepable LSM hooks | 5.14 |
| BPF token (unprivileged) | 6.9 |

**current linux distro support (as of 2025)**:

| distro | default kernel | eBPF-LSM support |
|--------|----------------|------------------|
| Ubuntu 24.04 | 6.8 | ✅ full |
| Debian 12 | 6.1 | ✅ full |
| RHEL 9 | 5.14 | ✅ partial |
| RHEL 8 | 4.18 | ❌ no |
| Amazon Linux 2023 | 6.1 | ✅ full |
| Arch | latest | ✅ full |

### challenge 3: requires CAP_BPF or root

to load BPF programs requires either:
- `CAP_BPF` + `CAP_PERFMON` capabilities
- root access

linux 6.9+ introduces **BPF tokens** for delegation:
```
root creates BPF token → grants to keyrack user → keyrack can load BPF
```

### challenge 4: LSM stack

if SELinux or AppArmor is already active, eBPF-LSM hooks **stack** with them:
- all LSMs must allow for access to succeed
- one LSM deny = overall deny

this is generally good (defense in depth) but may cause unexpected denials if other LSMs have restrictive policies.

---

## .alternative: Landlock

**Landlock** (linux 5.13+) is a lighter-weight alternative:

- userspace can create sandbox rules without root
- filesystem-based (path restrictions)
- no BPF knowledge required

```c
// landlock example: restrict process to read-only /usr
struct landlock_ruleset_attr ruleset_attr = {
    .handled_access_fs = LANDLOCK_ACCESS_FS_READ_FILE,
};

int ruleset_fd = landlock_create_ruleset(&ruleset_attr, sizeof(ruleset_attr), 0);

struct landlock_path_beneath_attr path_beneath = {
    .allowed_access = LANDLOCK_ACCESS_FS_READ_FILE,
    .parent_fd = open("/usr", O_PATH | O_CLOEXEC),
};

landlock_add_rule(ruleset_fd, LANDLOCK_RULE_PATH_BENEATH, &path_beneath, 0);
landlock_restrict_self(ruleset_fd, 0);
```

**Landlock limitations for keyrack**:
- path-based, not binary-identity-based
- can't enforce "only /usr/bin/git can access this secret"
- can enforce "this process can only read /usr" (different goal)

Landlock is complementary, not a replacement for eBPF-LSM ACLs.

---

## .practical implementation path

### phase 1: daemon-side verification (v1.5)

start with daemon-side verification (the other ref doc):
- works on any linux kernel
- no special capabilities required
- acceptable security for most threat models

### phase 2: eBPF-LSM with IMA (v2.0)

if stronger guarantees needed:
1. require IMA to be enabled (for pre-computed hashes)
2. load eBPF-LSM program at daemon start
3. populate allowed_hashes map from keyrack ACL
4. graceful fallback if eBPF unavailable

### phase 3: BPF token delegation (v2.x)

as linux 6.9+ becomes widespread:
1. system admin creates BPF token for keyrack
2. keyrack loads eBPF without root
3. enables eBPF-LSM in unprivileged containers

---

## .code sketch: IMA + eBPF-LSM

```c
// keyrack_lsm.bpf.c (with IMA integration)

#include <vmlinux.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

// allowed hashes (sha256)
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key, u8[32]);
    __type(value, u8);
} allowed_hashes SEC(".maps");

// keyrack socket path (for match)
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 1);
    __type(key, u32);
    __type(value, char[108]);  // sun_path max
} keyrack_path SEC(".maps");

SEC("lsm/unix_stream_connect")
int BPF_PROG(keyrack_connect,
             struct sock *sock,
             struct sock *other,
             struct sock *newsk)
{
    // get target socket path
    struct unix_sock *u = (struct unix_sock *)other;
    struct unix_address *addr = BPF_CORE_READ(u, addr);
    if (!addr)
        return 0;

    // compare to keyrack path
    u32 key = 0;
    char *keyrack_sun_path = bpf_map_lookup_elem(&keyrack_path, &key);
    if (!keyrack_sun_path)
        return 0;

    char *sun_path = (char *)BPF_CORE_READ(addr, name, sun_path);
    if (bpf_strncmp(sun_path, 107, keyrack_sun_path) != 0)
        return 0;  // not keyrack socket

    // this IS keyrack — check caller identity
    struct task_struct *task = (struct task_struct *)bpf_get_current_task();
    struct file *exe = BPF_CORE_READ(task, mm, exe_file);
    if (!exe)
        return -EACCES;

    // get IMA hash
    u8 hash[32];
    int ret = bpf_ima_inode_hash(BPF_CORE_READ(exe, f_inode), hash, 32);
    if (ret < 0)
        return -EACCES;  // no IMA hash = deny

    // lookup in ACL
    u8 *allowed = bpf_map_lookup_elem(&allowed_hashes, hash);
    if (!allowed)
        return -EACCES;

    return 0;  // allowed
}

char LICENSE[] SEC("license") = "GPL";
```

---

## .security analysis

### attack surface

| vector | eBPF-LSM protection |
|--------|---------------------|
| unauthorized caller | blocked at connect() |
| exec() after connect | not possible — connect must succeed first |
| PID reuse | irrelevant — identity checked at syscall |
| ptrace injection | blocked by LSM (also LSM hook) |
| binary tamper | detected by IMA hash mismatch |
| BPF map tamper | requires CAP_BPF (root-equivalent) |

### residual risks

| risk | mitigation |
|------|------------|
| root compromise | game over (root can disable BPF) |
| kernel exploit | game over (kernel = trusted) |
| IMA bypass | requires kernel exploit |
| BPF verifier bug | rare, kernel hardened |
| time-of-check-to-IMA-compute | IMA runs at exec(), before connect() |

### honest assessment

> eBPF-LSM provides **kernel-level enforcement** that eliminates userspace race conditions entirely.
>
> the check happens at the syscall boundary — there is no window for an attacker to exploit.
>
> the tradeoff: requires modern kernel (5.11+), IMA enabled, and CAP_BPF for setup.
>
> for deployments where these requirements are met, eBPF-LSM is **strictly superior** to daemon-side verification.

---

## .comparison: all linux approaches

| approach | enforcement | TOCTOU | kernel req | impl effort |
|----------|-------------|--------|------------|-------------|
| socket 0600 | kernel | none | any | trivial |
| daemon SO_PEERCRED | userspace | vulnerable | any | low |
| daemon + pidfd | userspace | reduced | 5.3+ | medium |
| daemon + multi-check | userspace | reduced | any | medium |
| eBPF-LSM + IMA | kernel | none | 5.11+ | high |
| kernel module | kernel | none | any | very high |

---

## .recommendation for keyrack

### v1.5 (near-term)

implement daemon-side verification with:
- socket 0600 permissions
- SO_PEERCRED + pidfd for stable process handle
- multiple hash checks (before/after)
- audit logs

this provides "good enough" security for most threat models.

### v2.0 (mid-term)

add optional eBPF-LSM enforcement:
- detect if eBPF-LSM available at startup
- if yes: load BPF program, populate ACL map
- if no: fallback to daemon-side verification
- log which mode is active

### v2.x (long-term)

as BPF tokens become widespread:
- support unprivileged eBPF via delegation
- integrate with container runtimes
- consider Landlock for process sandbox (complementary)

---

## .sources

- [eBPF documentation](https://ebpf.io/what-is-ebpf/)
- [BPF LSM (kernel docs)](https://www.kernel.org/doc/html/latest/bpf/prog_lsm.html)
- [bpf_ima_inode_hash() commit](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=27672f0d280a3f286a410a8db2004f46ace72a17)
- [IMA (Integrity Measurement Architecture)](https://sourceforge.net/p/linux-ima/wiki/Home/)
- [Landlock documentation](https://landlock.io/)
- [BPF token (linux 6.9)](https://lwn.net/Articles/963439/)
- [libbpf](https://github.com/libbpf/libbpf)
- [bpftool](https://github.com/libbpf/bpftool)
