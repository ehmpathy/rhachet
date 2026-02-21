# ref: TOCTOU (time-of-check to time-of-use)

## .what

deep dive on TOCTOU vulnerabilities — the fundamental race condition that undermines userspace security checks.

---

## .the core problem

TOCTOU = **T**ime **O**f **C**heck **T**o **T**ime **O**f **U**se

it's a race condition where:
1. a system **checks** if an operation is allowed
2. time passes (even microseconds)
3. the system **uses** the result of that check
4. but the world changed between check and use

```
timeline:
  t=0    checker: read /proc/{pid}/exe → "/usr/bin/git"
  t=1    checker: compute hash → "abc123..."
  t=2    checker: hash in allowlist? → YES
  t=3    ← RACE WINDOW: attacker exec()'s to malware
  t=4    checker: send secret to socket
  t=5    malware: receive secret ✗
```

the check was valid at t=2. the use happened at t=4. but the world changed at t=3.

---

## .why it matters

### userspace checks are fundamentally vulnerable

any check that:
1. reads state from the system
2. makes a decision based on that state
3. acts on that decision

...has a TOCTOU window between steps 2 and 3.

the kernel can make atomic decisions because it controls the scheduler. userspace cannot — it must yield to the scheduler between any two operations.

### the window size is irrelevant

a common misconception: "the window is only microseconds — no one can exploit that."

reality:
- attackers can **widen** the window via resource exhaustion (slow down the checker)
- attackers can **retry** thousands of times until they win the race
- automated tools exist specifically to exploit TOCTOU
- the window only needs to be won **once**

### TOCTOU defeats defense-in-depth

if you add more checks:
```
check1: is caller UID correct? → yes
check2: is caller binary hash correct? → yes
check3: is caller still the same binary? → yes (but TOCTOU after this!)
send secret
```

you've shrunk the window but not eliminated it. the attacker just needs to win the race after your last check.

---

## .classic TOCTOU examples

### filesystem TOCTOU

```c
// vulnerable pattern
if (access("/tmp/file", R_OK) == 0) {
    // RACE WINDOW: attacker replaces /tmp/file with symlink to /etc/shadow
    fd = open("/tmp/file", O_RDONLY);
    read(fd, buffer, size);  // now read /etc/shadow!
}
```

the `access()` check and the `open()` use have a gap. an attacker can swap the file in that gap.

### PID reuse TOCTOU

```
t=0  daemon: receive connection from PID 1234
t=1  daemon: read /proc/1234/exe → "/usr/bin/git"
t=2  daemon: hash matches allowlist
t=3  ← process 1234 exits
t=4  ← attacker spawns malware, gets PID 1234 (reuse)
t=5  daemon: send secret to socket
t=6  malware (PID 1234): receive secret ✗
```

the PID was valid at t=1. it got reused by t=4. the daemon sent to the wrong process.

### exec() TOCTOU

```
t=0  daemon: receive connection from PID 5678
t=1  daemon: read /proc/5678/exe → "/usr/bin/git"
t=2  daemon: hash matches allowlist
t=3  ← git exec()'s to malware via DYLD_INSERT_LIBRARIES
t=4  daemon: send secret to socket
t=5  malware: receive secret ✗
```

the caller was git at t=1. it became malware at t=3 via exec(). same PID, different binary.

---

## .TOCTOU in keyrack context

### the attack scenario

```
keyrack daemon uses caller verification:
1. caller connects to daemon socket
2. daemon reads /proc/{pid}/exe
3. daemon computes hash of binary
4. daemon checks hash against ACL
5. daemon sends secret
```

an attacker can:

**attack 1: exec() race**
```
t=0  legitimate app connects to daemon
t=1  daemon starts verification...
t=2  daemon reads /proc/{pid}/exe → legitimate app
t=3  ← legitimate app exec()'s to attacker code
t=4  daemon finishes verification → PASS
t=5  daemon sends secret
t=6  attacker code receives secret ✗
```

**attack 2: PID reuse race**
```
t=0  legitimate app connects, PID 1234
t=1  daemon delays verification (attacker causes load)
t=2  legitimate app exits, PID 1234 freed
t=3  attacker spawns, gets PID 1234
t=4  attacker inherits the socket fd (via shared memory or similar)
t=5  daemon reads /proc/1234/exe → attacker binary!
     wait, this actually fails — new process has different binary
```

actually, PID reuse attacks are harder because the new process has a different `/proc/{pid}/exe`. the exec() attack is the real threat.

### the fundamental issue

the daemon cannot atomically:
1. verify the caller's identity
2. send data to the caller

these are two separate operations. the scheduler can run arbitrary code between them.

---

## .mitigations (and their limits)

### mitigation 1: multiple checks

```
verify caller
verify again
verify again
send secret
```

**reduces** window but doesn't eliminate it. attacker times the exec() for after the last verify.

**type**: CONVENED — shrinks window, doesn't close it

### mitigation 2: pidfd (linux 5.3+)

```c
int pidfd = pidfd_open(pid, 0);
// now we have a stable handle to THIS process
// even if PID is reused, pidfd still refers to original
```

**solves** PID reuse attacks. **does not solve** exec() attacks — same process can still exec().

**type**: ENFORCED for PID reuse, CONVENED for exec()

### mitigation 3: seccomp exec() block

ask caller to apply seccomp filter that blocks exec() before connect:

```c
// caller applies this before connect:
seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(execve), 0);
```

**problems**:
- caller must cooperate (malware won't)
- how does daemon verify caller applied it?
- another TOCTOU: check if seccomp applied, then send

**type**: CONVENED — relies on caller cooperation

### mitigation 4: challenge-response

```
daemon: send nonce to caller
caller: sign nonce with private key
daemon: verify signature, then send secret
```

**solves** the problem if caller has a private key that malware can't access. but where does caller store that key? if in memory, malware that takes over the process can read it.

**type**: CONVENED — moves the problem, doesn't solve it

### mitigation 5: kernel-level verification

move the check into the kernel via eBPF-LSM or similar:

```
at syscall boundary:
  kernel checks caller identity
  kernel allows/denies access
  no userspace gap
```

**this is the only true solution**. kernel makes atomic decisions.

**type**: ENFORCED — kernel controls scheduler, no race window

---

## .ENFORCED vs CONVENED summary

| mitigation | TOCTOU status | type |
|------------|---------------|------|
| single userspace check | vulnerable | CONVENED |
| multiple userspace checks | smaller window | CONVENED |
| pidfd for PID reuse | PID reuse fixed | ENFORCED for PID, CONVENED for exec() |
| seccomp exec() block | relies on cooperation | CONVENED |
| challenge-response | moves problem to key storage | CONVENED |
| kernel-level (eBPF-LSM) | no userspace gap | ENFORCED |
| don't check, use session scope | different model | depends on threat model |

### key insight

> **TOCTOU is inherent to userspace checks.**
>
> any check that reads state, decides, then acts has a race window.
>
> the only ENFORCED solutions are:
> 1. move the check to the kernel (eBPF-LSM)
> 2. change the security model (don't check identity, use session scope)
>
> all userspace mitigations are CONVENED — they make attacks harder but not impossible.

---

## .implications for keyrack

### what this means

keyrack daemon's caller verification is fundamentally CONVENED:
- we can shrink the TOCTOU window (multiple checks, pidfd)
- we cannot eliminate it with userspace code
- a determined attacker with schedule control can exploit it

### acceptable risk?

for keyrack's threat model (protect against opportunistic malware, not nation-state actors), CONVENED protections may be acceptable:

1. **window is small** — milliseconds, requires precise schedule control
2. **detection is possible** — anomalous caller patterns can be logged
3. **defense in depth** — other layers (socket permissions, TTL, audit) add friction
4. **practical attacks are rare** — most malware doesn't exploit TOCTOU

### the hybrid approach

combine CONVENED caller verification with ENFORCED storage:

```
UNLOCK (rare, one-time):
  daemon verifies caller (CONVENED, has TOCTOU)
  daemon fetches secret from vault
  daemon stores in kernel key store (ENFORCED)

GET (frequent):
  caller accesses kernel key store directly (ENFORCED)
  no daemon involvement, no TOCTOU
```

TOCTOU risk is limited to unlock operations. get operations are ENFORCED.

---

## .further read

- [TOCTOU on Wikipedia](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use)
- [Exploit of TOCTOU Races (academic paper)](https://www.usenix.org/legacy/events/fast08/tech/full_papers/cai/cai.pdf)
- [Linux kernel key retention service](https://www.kernel.org/doc/html/latest/security/keys/core.html)
- [eBPF for security (Cilium)](https://cilium.io/blog/2020/11/10/ebpf-for-advanced-security/)

---

## .summary

> **TOCTOU = the gap between check and use.**
>
> userspace code cannot make atomic check-then-act decisions because it doesn't control the scheduler.
>
> all userspace security checks are CONVENED — they guide correct behavior but can be raced by malicious actors.
>
> ENFORCED solutions require kernel involvement (eBPF-LSM) or a different security model (session-scoped access without identity checks).

