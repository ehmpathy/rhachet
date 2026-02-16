# ref: linux code-signed ACLs (options deep dive)

## .what

deep dive on linux kernel-native mechanisms that could theoretically achieve macOS-style code-signed ACLs for same-user process isolation.

**spoiler**: no single linux mechanism provides this today. but several primitives exist that could be combined.

---

## .the gap

macOS Keychain achieves same-user isolation via:
1. code signature verification (kernel-enforced)
2. per-item ACLs based on CDHASH (caller's cryptographic identity)
3. user prompts for unrecognized callers

linux lacks a unified equivalent. let's explore what primitives exist.

---

## .option 1: linux kernel keyring

### what it is

the linux kernel has a built-in keyring subsystem (`keyctl`, `request_key`, etc.) that manages cryptographic keys and secrets in kernel memory.

```bash
# list current keyrings
keyctl show

# add a key to session keyring
keyctl add user mykey "secret_value" @s

# read a key
keyctl read $(keyctl search @s user mykey)
```

### keyring scopes

```
┌─────────────────────────────────────────────────────────────┐
│ @t - thread keyring                                         │
│   └── private to a single thread                            │
├─────────────────────────────────────────────────────────────┤
│ @p - process keyring                                        │
│   └── shared by all threads in a process                    │
├─────────────────────────────────────────────────────────────┤
│ @s - session keyring                                        │
│   └── shared by all processes in a login session            │
│   └── inherited by child processes                          │
├─────────────────────────────────────────────────────────────┤
│ @u - user keyring                                           │
│   └── shared by all processes owned by a user               │
├─────────────────────────────────────────────────────────────┤
│ @us - user session keyring                                  │
│   └── default session keyring for a user                    │
└─────────────────────────────────────────────────────────────┘
```

### how it could help

**session isolation**: secrets in `@s` (session keyring) are only accessible to processes in that session.

```bash
# terminal 1: create a new session with isolated keyring
keyctl session mysession

# add a secret to this session
keyctl add user GITHUB_TOKEN "ghp_xxx" @s

# terminal 2: different session, cannot see the key
keyctl search @s user GITHUB_TOKEN
# → "Required key not available"
```

### limitations

| limitation | explanation |
|------------|-------------|
| no code identity | keyring checks UID, not caller's binary signature |
| session scope only | all processes in session have equal access |
| no per-key ACLs | can't say "only /usr/bin/git can read this key" |
| no user prompts | no mechanism to ask "allow access?" |

**verdict**: useful for session isolation, but doesn't solve same-user process isolation.

---

## .option 2: IMA/EVM (integrity measurement)

### what it is

IMA (Integrity Measurement Architecture) and EVM (Extended Verification Module) provide file integrity verification:

- **IMA**: measures file hashes, can enforce that only measured files execute
- **EVM**: extends IMA with digital signatures on file metadata

```bash
# view IMA measurements
cat /sys/kernel/security/ima/ascii_runtime_measurements

# example output:
# 10 abc123... ima-ng sha256:def456... /usr/bin/bash
```

### how it could help

**code identity**: IMA can identify executables by their hash (similar to CDHASH).

```
┌─────────────────────────────────────────────────────────────┐
│ IMA Policy Example                                          │
├─────────────────────────────────────────────────────────────┤
│ measure func=BPRM_CHECK                                     │
│   └── measure hash of every executed binary                 │
│                                                             │
│ appraise func=BPRM_CHECK appraise_type=imasig              │
│   └── only allow execution if binary has valid signature    │
└─────────────────────────────────────────────────────────────┘
```

### limitations

| limitation | explanation |
|------------|-------------|
| file-level only | verifies files on disk, not runtime process identity |
| no per-secret ACLs | IMA doesn't integrate with secret storage |
| boot-time focus | designed for boot integrity, not runtime access control |
| complex setup | requires signed filesystem, custom policies |

**verdict**: provides code identity primitive, but no integration with secret access.

---

## .option 3: eBPF + LSM hooks

### what it is

eBPF (extended Berkeley Packet Filter) allows custom programs to run in kernel space. LSM (Linux Security Modules) provides hooks for access control decisions.

since linux 5.7, eBPF can attach to LSM hooks:

```c
// eBPF program attached to file_open LSM hook
SEC("lsm/file_open")
int BPF_PROG(restrict_secret_access, struct file *file) {
    // get caller's binary path
    // check against allowed list
    // return -EACCES if not allowed
}
```

### how it could help

**custom access control**: eBPF-LSM can implement arbitrary access policies.

```
┌─────────────────────────────────────────────────────────────┐
│ Theoretical eBPF-LSM for Secret Access                      │
├─────────────────────────────────────────────────────────────┤
│ 1. hook: process tries to connect to secret daemon socket   │
│ 2. eBPF program:                                            │
│    a. get caller's exe path from /proc/self/exe             │
│    b. compute hash of the binary                            │
│    c. check hash against allowed list for requested secret  │
│    d. if not in list: deny or trigger userspace prompt      │
│ 3. return allow/deny decision                               │
└─────────────────────────────────────────────────────────────┘
```

### proof of concept architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Userspace                                                    │
│   ├── keyrack daemon (holds secrets)                         │
│   ├── policy manager (manages allowed hashes per secret)     │
│   └── prompt daemon (shows "allow access?" dialogs)          │
├──────────────────────────────────────────────────────────────┤
│ Kernel                                                       │
│   ├── eBPF-LSM program                                       │
│   │     ├── hooks socket connect                             │
│   │     ├── computes caller binary hash                      │
│   │     ├── checks eBPF map for allowed hashes               │
│   │     └── signals prompt daemon if unknown caller          │
│   └── eBPF maps                                              │
│         ├── secret_id → allowed_hashes[]                     │
│         └── pending_prompts queue                            │
└──────────────────────────────────────────────────────────────┘
```

### limitations

| limitation | explanation |
|------------|-------------|
| complex implementation | requires kernel + userspace coordination |
| no certificate chain | binaries identified by hash, not developer identity |
| hash management burden | must update allowed hashes when apps update |
| root required | eBPF-LSM requires CAP_SYS_ADMIN or root |
| no extant tools | would need to build from scratch |

**verdict**: most promising path, but significant implementation effort.

---

## .option 4: Landlock (unprivileged sandbox)

### what it is

Landlock is a linux security module that allows unprivileged processes to sandbox themselves:

```c
// process restricts its own filesystem access
struct landlock_ruleset_attr ruleset_attr = {
    .handled_access_fs = LANDLOCK_ACCESS_FS_READ_FILE,
};
int ruleset_fd = landlock_create_ruleset(&ruleset_attr, ...);

// allow read access only to /usr/lib
struct landlock_path_beneath_attr path_attr = {
    .allowed_access = LANDLOCK_ACCESS_FS_READ_FILE,
    .parent_fd = open("/usr/lib", O_PATH),
};
landlock_add_rule(ruleset_fd, LANDLOCK_RULE_PATH_BENEATH, &path_attr, 0);

// enforce the ruleset
landlock_restrict_self(ruleset_fd, 0);
```

### how it could help

**self-sandbox before secret access**: an app could sandbox itself before the daemon grants access.

```
┌─────────────────────────────────────────────────────────────┐
│ Theoretical Landlock Protocol                               │
├─────────────────────────────────────────────────────────────┤
│ 1. app requests secret from daemon                          │
│ 2. daemon: "apply this Landlock ruleset first"              │
│ 3. app applies Landlock (restricts itself)                  │
│ 4. app proves to daemon it applied Landlock                 │
│ 5. daemon grants secret                                     │
│                                                             │
│ now the app has the secret but can't:                       │
│   - write to arbitrary files                                │
│   - connect to network (if restricted)                      │
│   - execute other binaries                                  │
└─────────────────────────────────────────────────────────────┘
```

### limitations

| limitation | explanation |
|------------|-------------|
| voluntary | app must sandbox itself — malware won't comply |
| no identity verification | doesn't verify who the caller is |
| one-way | once applied, can't be revoked (by design) |
| limited scope | filesystem and network only (no IPC, etc.) |

**verdict**: useful for defense-in-depth, but doesn't verify caller identity.

---

## .option 5: seccomp + TOCTOU-safe identity

### what it is

seccomp filters syscalls. combined with `/proc/self/exe` verification, could restrict secret access.

### theoretical approach

```
┌─────────────────────────────────────────────────────────────┐
│ Secret Daemon Protocol with seccomp                         │
├─────────────────────────────────────────────────────────────┤
│ 1. caller connects to daemon socket                         │
│ 2. daemon receives connection                               │
│ 3. daemon uses SCM_CREDENTIALS to get caller's PID          │
│ 4. daemon reads /proc/{pid}/exe to get caller's binary path │
│ 5. daemon computes hash of the binary                       │
│ 6. daemon checks hash against ACL for requested secret      │
│ 7. if allowed: send secret via socket                       │
└─────────────────────────────────────────────────────────────┘
```

### the TOCTOU problem

**time-of-check to time-of-use**: between steps 4-7, the process could:
- exec() a different binary
- be killed and PID reused

mitigations:
- use `pidfd_open()` to get stable handle to process
- verify exe hash multiple times
- use `prctl(PR_SET_DUMPABLE, 0)` to prevent ptrace

### limitations

| limitation | explanation |
|------------|-------------|
| TOCTOU risks | race conditions between check and use |
| no kernel enforcement | daemon does checks in userspace |
| hash not signature | can't verify developer identity |
| updateable binaries | hash changes on every app update |

**verdict**: practical but imperfect — a determined attacker can race the checks.

---

## .option 6: SELinux/AppArmor policies

### what it is

mandatory access control (MAC) systems that enforce policies regardless of user permissions.

### SELinux approach

```
# define a type for the secret socket
type keyrack_socket_t;

# only specific domains can connect
allow git_t keyrack_socket_t:unix_stream_socket connectto;
allow terminal_t keyrack_socket_t:unix_stream_socket connectto;
# all other domains implicitly denied
```

### AppArmor approach

```
# /etc/apparmor.d/keyrack-daemon
/usr/bin/keyrack-daemon {
  # only these can connect to our socket
  unix (receive) type=stream peer=(label=/usr/bin/git),
  unix (receive) type=stream peer=(label=/usr/bin/terminal),
}
```

### limitations

| limitation | explanation |
|------------|-------------|
| system-wide | requires root to configure policies |
| per-binary, not per-secret | can't have different ACLs per keychain item |
| label-based, not hash-based | identifies by path/label, not cryptographic identity |
| complex administration | MAC policies are notoriously hard to manage |

**verdict**: provides per-binary access control, but not per-secret and not hash-based.

---

## .synthesis: what would a linux solution look like?

### hybrid architecture

combine multiple primitives:

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Session Isolation (kernel keyring)                  │
│   - secrets scoped to login session                          │
│   - inherited by child processes only                        │
├──────────────────────────────────────────────────────────────┤
│ Layer 2: Code Identity (IMA + custom hash)                   │
│   - compute sha256 of /proc/{pid}/exe at access time         │
│   - compare against per-secret allowed list                  │
├──────────────────────────────────────────────────────────────┤
│ Layer 3: Enforcement (eBPF-LSM or daemon-side checks)        │
│   - eBPF: kernel-level enforcement (most secure)             │
│   - daemon: userspace enforcement (easier, less secure)      │
├──────────────────────────────────────────────────────────────┤
│ Layer 4: User Prompts (D-Bus + polkit or custom)             │
│   - if caller not in ACL, show GUI prompt                    │
│   - user approves → add to ACL (temporary or permanent)      │
├──────────────────────────────────────────────────────────────┤
│ Layer 5: Defense in Depth (Landlock, seccomp)                │
│   - callers self-sandbox before receive secret               │
│   - limits damage if caller is compromised                   │
└──────────────────────────────────────────────────────────────┘
```

### implementation complexity

| component | effort | security |
|-----------|--------|----------|
| session keyring only | low | weak (same-session = full access) |
| + daemon-side hash checks | medium | moderate (TOCTOU risks) |
| + eBPF-LSM enforcement | high | strong (kernel-enforced) |
| + user prompts | medium | user experience parity with macOS |
| + developer signatures | very high | requires PKI infrastructure |

### the absent piece: developer identity

macOS has Apple as a central certificate authority. linux has no equivalent.

options:
1. **distro sign** — Fedora, Debian sign packages, but not all apps
2. **sigstore/cosign** — modern, decentralized, but not kernel-integrated
3. **custom CA** — organization runs own CA (enterprise only)
4. **hash-only** — no developer identity, just binary hashes

without developer identity, linux solutions identify "this specific binary" not "any binary from this developer."

---

## .practical recommendation for keyrack

given the complexity, a pragmatic approach for keyrack:

### v1: accept the GNOME model
- socket 0600 (owner-only)
- session-scoped via login
- short TTLs for sudo credentials
- same as current design

### v1.5: add daemon-side hash checks
```
┌─────────────────────────────────────────────────────────────┐
│ keyrack daemon enhancement                                  │
├─────────────────────────────────────────────────────────────┤
│ on get request:                                             │
│   1. receive connection via unix socket                     │
│   2. get caller PID via SO_PEERCRED                         │
│   3. read /proc/{pid}/exe                                   │
│   4. compute sha256 of the binary                           │
│   5. check against KeyrackKeyHost.allowedHashes[]           │
│   6. if not in list:                                        │
│      a. log warn with caller info                           │
│      b. optionally deny (configurable)                      │
│   7. return secret                                          │
└─────────────────────────────────────────────────────────────┘
```

pros:
- detects unexpected callers
- audit trail of access attempts
- optional enforcement

cons:
- TOCTOU vulnerabilities
- hash management burden
- not kernel-enforced

### v2 (future): eBPF-LSM integration
- kernel-enforced caller verification
- requires significant implementation effort
- consider as separate project

---

## .key insight

> linux provides primitives (keyring, IMA, eBPF, LSM) but no integrated solution like macOS Keychain.
>
> the fundamental difference: Apple controls the entire stack (hardware, kernel, certificate authority, App Store). linux is a kernel, not a platform.
>
> practical linux security relies on:
> 1. container/sandbox isolation (Flatpak, Podman, firejail)
> 2. MAC policies (SELinux, AppArmor)
> 3. short-lived credentials and rotation
>
> per-binary secret ACLs are possible but require custom implementation.

---

## .sources

- [Linux Kernel Key Retention Service](https://www.kernel.org/doc/html/latest/security/keys/core.html)
- [IMA/EVM Documentation](https://sourceforge.net/p/linux-ima/wiki/Home/)
- [eBPF LSM Programs](https://docs.kernel.org/bpf/prog_lsm.html)
- [Landlock LSM](https://docs.kernel.org/userspace-api/landlock.html)
- [seccomp and TOCTOU](https://lwn.net/Articles/756233/)
- [SELinux Policy Language](https://selinuxproject.org/page/PolicyLanguage)
