# ref: extant LSM options for keyrack ACLs

## .what

can we use Landlock, SELinux, AppArmor, or another extant LSM to enforce "only binary X can access secret Y" — without custom eBPF?

**tl;dr**: extant LSMs solve a different problem. they answer "what can this process access?" — we need "what can access this resource?"

---

## .the distinction

### what extant LSMs do (subject-centric)

```
┌─────────────┐     ┌─────────────────────────────────┐
│ git process │────►│ LSM policy for /usr/bin/git     │
│             │     │                                 │
│             │     │ can read: /home/*, /etc/passwd  │
│             │     │ can write: /home/user/repos/*   │
│             │     │ can connect: network, localhost │
└─────────────┘     └─────────────────────────────────┘

question: "what is git allowed to do?"
answer: read these paths, write those paths, connect here
```

### what we need (object-centric)

```
┌─────────────────────────────────────┐     ┌─────────────┐
│ keyrack socket                      │◄────│ ??? process │
│                                     │     │             │
│ allowed callers:                    │     │             │
│   - /usr/bin/git (hash: abc123)     │     │             │
│   - /usr/bin/ssh (hash: def456)     │     │             │
└─────────────────────────────────────┘     └─────────────┘

question: "who is allowed to access this socket?"
answer: only git and ssh (verified by hash)
```

---

## .Landlock

### what it does

Landlock lets a process **sandbox itself** — restrict its own access to the filesystem.

```c
// process says: "I voluntarily limit myself to read-only /usr"
landlock_restrict_self(ruleset_fd, 0);
```

### why it doesn't fit

| need | Landlock capability |
|------|---------------------|
| keyrack restricts who connects to it | ❌ Landlock restricts what caller can access |
| policy set by keyrack daemon | ❌ policy set by the sandboxed process itself |
| verify caller identity by hash | ❌ path-based only, no hash verification |
| daemon enforces on behalf of secrets | ❌ self-enforcement only |

**Landlock is backwards** — the restricted process opts in. we need the daemon to enforce restrictions on others.

### could callers sandbox themselves?

in theory, a well-behaved caller could Landlock itself to only access keyrack socket. but:

1. malware won't voluntarily sandbox itself
2. we can't force callers to apply Landlock
3. doesn't help us verify caller identity

**verdict**: ❌ wrong direction entirely

---

## .AppArmor

### what it does

AppArmor applies **path-based mandatory access control**. sysadmin writes profiles that restrict what programs can do.

```
# /etc/apparmor.d/usr.bin.git
/usr/bin/git {
  # git can read these
  /home/** r,
  /etc/gitconfig r,

  # git can connect to keyrack socket
  /run/keyrack/keyrack.sock rw,
}
```

### why it's close but not quite

**what it can do**:
- restrict which programs can connect to keyrack socket
- path-based: "only /usr/bin/git can access /run/keyrack/keyrack.sock"

**what it can't do**:
- verify binary by hash (only by path)
- per-secret ACLs (all-or-none socket access)
- dynamic policy updates (requires profile reload)

### the path-vs-hash problem

```
# AppArmor profile
/usr/bin/git {
  /run/keyrack/keyrack.sock rw,
}
```

attack:
```bash
# attacker replaces git with malware
cp /tmp/malware /usr/bin/git  # requires root, but possible

# malware now has git's AppArmor permissions
/usr/bin/git  # runs malware, can access keyrack socket
```

AppArmor trusts the path. if attacker controls the binary at that path, they inherit its permissions.

### could we use AppArmor for defense-in-depth?

yes — AppArmor + daemon-side hash verification:

1. AppArmor restricts socket access to known paths
2. daemon verifies binary hash for callers at those paths
3. attacker must both: control a blessed path AND match expected hash

**verdict**: ⚠️ useful as layer, not sufficient alone

---

## .SELinux

### what it does

SELinux applies **label-based mandatory access control**. every process and file has a security label; policy defines which labels can interact.

```
# label the keyrack socket
chcon -t keyrack_socket_t /run/keyrack/keyrack.sock

# policy: only git_t can connect to keyrack_socket_t
allow git_t keyrack_socket_t : unix_stream_socket connectto;
```

### why it's closer but still insufficient

**what it can do**:
- label-based access control (more flexible than paths)
- "only processes with label git_t can connect to keyrack_socket_t"
- survive binary replacement (label sticks to the file)

**what it can't do**:
- verify binary by hash (labels are assigned by path or manually)
- per-secret ACLs (socket-level only)
- dynamic policy without root (policy changes require semodule)

### the label assignment problem

```bash
# how does a binary get the git_t label?
# typically via file context rules:
/usr/bin/git  system_u:object_r:git_exec_t:s0

# when git runs, it transitions to git_t domain
# BUT: this is still path-based at assignment time
```

if attacker replaces `/usr/bin/git`, the new binary inherits the `git_exec_t` label (because that's what the path says). SELinux doesn't hash the binary.

### SELinux + IMA together

IMA (Integrity Measurement Architecture) can enforce that only binaries with valid signatures/hashes can run:

```
# IMA policy: only signed binaries can execute
dont_measure fsmagic=0x9fa0
measure func=BPRM_CHECK
appraise func=BPRM_CHECK appraise_type=imasig
```

with IMA + SELinux:
1. IMA ensures `/usr/bin/git` hasn't been tampered (signature check at exec)
2. SELinux ensures only `git_t` can connect to keyrack socket
3. combined: only legitimate, signed git can access keyrack

**but**:
- requires IMA setup (kernel + signed binaries)
- requires SELinux in enforced mode
- still socket-level ACL, not per-secret
- policy changes require root

**verdict**: ⚠️ closest extant option, but heavy operational burden

---

## .comparison table

| LSM | direction | identity | per-secret | dynamic | setup effort |
|-----|-----------|----------|------------|---------|--------------|
| Landlock | self-sandbox | ❌ | ❌ | ✅ | low |
| AppArmor | admin-enforced | path only | ❌ | ❌ | medium |
| SELinux | admin-enforced | label (path-assigned) | ❌ | ❌ | high |
| SELinux + IMA | admin-enforced | label + hash | ❌ | ❌ | very high |
| custom eBPF-LSM | daemon-controlled | hash | ✅ | ✅ | high |

---

## .what we actually need

| requirement | extant LSM | custom eBPF-LSM |
|-------------|------------|-----------------|
| keyrack daemon controls policy | ❌ sysadmin controls | ✅ daemon loads BPF |
| verify caller by binary hash | ❌ path/label only | ✅ IMA hash in BPF |
| per-secret ACLs | ❌ socket-level only | ✅ BPF map per secret |
| dynamic policy updates | ❌ requires reload/root | ✅ update BPF map |
| no root for policy changes | ❌ | ⚠️ (needs BPF token, 6.9+) |
| works without system-wide config | ❌ | ✅ |

---

## .hybrid approach: AppArmor + daemon verification

if full eBPF-LSM is too heavy, a practical middle ground:

### layer 1: AppArmor (coarse filter)

```
# /etc/apparmor.d/keyrack.socket
# only these paths can access keyrack socket
/usr/bin/git rw /run/keyrack/keyrack.sock,
/usr/bin/ssh rw /run/keyrack/keyrack.sock,
/usr/bin/node rw /run/keyrack/keyrack.sock,
# deny all others by default
```

### layer 2: daemon hash verification (fine filter)

```typescript
// daemon verifies caller hash even after AppArmor allowed connect
const callerHash = await computeCallerHash(socket);
const allowed = acl[secretId]?.includes(callerHash);
if (!allowed) {
  socket.write(JSON.stringify({ error: 'hash not in ACL' }));
  return;
}
```

### security properties

| attack | blocked by |
|--------|------------|
| random process connects | AppArmor (path not in allowlist) |
| allowed path, wrong binary | daemon (hash mismatch) |
| race condition (exec after connect) | ⚠️ reduced window, not eliminated |

### operational burden

- requires AppArmor profile installation (one-time, can ship with keyrack)
- profile updates need root (but infrequent)
- daemon hash verification is pure userspace (no kernel setup)

**verdict**: ✅ practical for v1.5, upgradeable to eBPF-LSM later

---

## .recommendation

### v1.5: daemon verification + optional AppArmor

1. **default**: socket 0600 + daemon-side hash verification
2. **optional**: ship AppArmor profile, document install
3. **defense in depth**: both layers when AppArmor available

### v2.0: eBPF-LSM when justified

if threat model requires kernel enforcement:
1. detect eBPF-LSM + IMA availability
2. load BPF program for atomic check
3. fallback to daemon verification otherwise

### why not SELinux + IMA for v1.5?

- requires system-wide SELinux in enforced mode (many systems don't run it)
- requires IMA setup + signed binaries (ops burden)
- policy changes need root (can't update ACL dynamically)
- overkill for most keyrack users

AppArmor is lighter and more commonly enabled by default (Ubuntu ships it).

---

## .summary

> **extant LSMs were designed to sandbox processes, not to protect resources from processes.**
>
> they answer "what can this program do?" — we need "who can touch this secret?"
>
> the closest fit is SELinux + IMA, but it requires heavy system config and doesn't support per-secret or dynamic ACLs.
>
> for keyrack, the practical path is:
> - v1.5: daemon verification + optional AppArmor (defense in depth)
> - v2.0: custom eBPF-LSM for kernel-enforced, per-secret, dynamic ACLs

---

## .sources

- [Landlock documentation](https://landlock.io/)
- [AppArmor wiki](https://gitlab.com/apparmor/apparmor/-/wikis/home)
- [SELinux project](https://selinuxproject.org/)
- [IMA documentation](https://sourceforge.net/p/linux-ima/wiki/Home/)
- [SELinux + IMA integration](https://www.redhat.com/en/blog/how-use-linux-kernels-integrity-measurement-architecture)
