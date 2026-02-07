# eval: per-terminal-chain structural advantage

> under what usecases would per-terminal-chain protect keys that per-login-session would not?

---

## the question

given an attacker within the user's login session, does per-terminal-chain (via kernel keyrings) protect any keys that per-login-session alone would leave exposed?

i.e., is there a structural advantage, or is it defense-in-depth with no real gap closed?

---

## attack model: per-login-session only

with per-login-session scope, any process in the login session can connect to the daemon:

```
per.login.session.attack.surface
├─ attacker in same login session
│  ├─ connects to daemon unix socket
│  ├─ daemon checks /proc/$ATTACKER_PID/sessionid
│  ├─ sessionid matches (same login session)
│  ├─ daemon serves keys
│  └─ attacker has access to ALL unlocked worksites
│
├─ attack vectors that reach this state
│  ├─ rogue npm postinstall in any terminal
│  ├─ compromised tool in any terminal
│  ├─ attacker with a shell in the login session (ssh, tmux, etc)
│  └─ malicious vscode extension with shell access
│
└─ blast radius: all unlocked worksites in the login session
```

---

## attack model: per-terminal-chain (kernel keyrings)

with per-terminal-chain, the daemon requires a token from the caller's @s keyring:

```
per.terminal.chain.attack.surface
├─ unlock flow
│  ├─ human runs `rhx keyrack unlock` in terminal A
│  ├─ keyctl_join_session_keyring(NULL) → new session keyring for terminal A
│  ├─ keyctl add user "keyrack_token" "$random" @s → token in kernel memory
│  ├─ keyctl setperm $key_id 0x3f000000 → possessor-only permissions
│  ├─ daemon stores: { token → worksite keys }
│  └─ all children of terminal A inherit the keyring (and the token)
│
├─ attacker in SAME terminal's process tree (e.g., rogue npm postinstall)
│  ├─ inherits terminal A's session keyring via fork
│  ├─ possesses the token → can read it via keyctl
│  ├─ connects to daemon with valid token
│  └─ result: ACCESS GRANTED ← same as per-login-session
│
├─ attacker in DIFFERENT terminal (terminal B)
│  ├─ has the OLD session keyring (from login, before unlock)
│  ├─ does NOT possess terminal A's new session keyring
│  ├─ cannot read the token
│  │  ├─ possessor-only permissions → "user" permission bits denied
│  │  ├─ /proc/keys does not show keys the process can't see
│  │  └─ kernel refuses keyctl_read() without possession
│  ├─ connects to daemon without valid token
│  └─ result: ACCESS DENIED ← structural advantage over per-login-session
│
└─ attacker in different terminal, attempts escalation
   ├─ option 1: enumerate key IDs via /proc/keys
   │  ├─ /proc/keys only shows keys visible to the current process
   │  ├─ possessor-only keys are invisible to non-possessors
   │  └─ result: key not visible → cannot target it
   │
   ├─ option 2: ptrace a process in terminal A's tree
   │  ├─ requires same UID (have it) + ptrace permission
   │  ├─ YAMA ptrace_scope=0: any same-UID process can ptrace → CAN escalate
   │  ├─ YAMA ptrace_scope=1 (ubuntu/debian default): only parent can ptrace child
   │  │  └─ attacker is not parent of terminal A's processes → DENIED
   │  ├─ YAMA ptrace_scope=2: only CAP_SYS_PTRACE can ptrace → DENIED
   │  └─ result: blocked on most modern distros (ptrace_scope >= 1)
   │
   ├─ option 3: read daemon memory directly
   │  ├─ requires root or CAP_SYS_PTRACE on the daemon process
   │  └─ result: blocked without privilege escalation
   │
   └─ option 4: brute-force key ID + keyctl_read
      ├─ key IDs are 32-bit integers assigned sequentially by kernel
      ├─ attacker could iterate key IDs and attempt keyctl_read on each
      ├─ possessor-only permissions → keyctl_read returns -EACCES
      └─ result: blocked by kernel permission check
```

---

## the structural gap

per-terminal-chain closes exactly one gap that per-login-session leaves open:

```
structural.gap
├─ scenario: attacker has a foothold in terminal B, keys are unlocked in terminal A
│  ├─ per-login-session: attacker connects to daemon → same sessionid → served
│  └─ per-terminal-chain: attacker lacks token from terminal A's keyring → denied
│
├─ conditions for the gap to be real
│  ├─ 1. key permissions set to possessor-only (not default — must be explicit)
│  ├─ 2. YAMA ptrace_scope >= 1 (default on ubuntu/debian, not universal)
│  ├─ 3. attacker is in a DIFFERENT terminal (not the unlock terminal's tree)
│  └─ 4. attacker does not have root or CAP_SYS_PTRACE
│
└─ if ALL four conditions hold → per-terminal-chain provides real protection
   if ANY condition fails → per-terminal-chain is bypassable
```

---

## usecase analysis

### usecase 1: rogue npm postinstall (same terminal)

```
rogue.npm.postinstall.same.terminal
├─ human unlocks in terminal A
├─ human (or robot) runs npm install in terminal A
├─ rogue postinstall runs in terminal A's process tree
├─ rogue process INHERITS terminal A's session keyring
├─ rogue process possesses the token
│
├─ per-login-session: access granted (same session)
├─ per-terminal-chain: access granted (same terminal tree)
│
└─ verdict: NO ADVANTAGE — attacker is in the unlock terminal's tree
```

this is the most common supply chain attack vector. per-terminal-chain does not help because the malicious code runs in the same process tree that has the keys.

### usecase 2: rogue npm postinstall (different terminal)

```
rogue.npm.postinstall.different.terminal
├─ human unlocks in terminal A, spawns robot
├─ human runs npm install in terminal B (different terminal, same repo)
├─ rogue postinstall runs in terminal B's process tree
├─ rogue process does NOT have terminal A's session keyring
│
├─ per-login-session: access granted (same session)
├─ per-terminal-chain: access DENIED (different terminal tree)
│
├─ is this realistic?
│  ├─ requires human to have two terminals in the same repo
│  ├─ AND run npm install in the non-unlocked terminal
│  ├─ if human unlocked in terminal B too → attacker has access anyway
│  └─ if human only unlocked in terminal A → protection is real
│
└─ verdict: REAL ADVANTAGE, but narrow scenario
   └─ only applies when keys are unlocked in one terminal
      and the attacker runs in a different terminal
```

### usecase 3: compromised vscode extension

```
compromised.vscode.extension
├─ vscode runs as a separate process (not in any terminal's tree)
├─ extension spawns shell commands
│
├─ per-login-session: extension is in same login session → access granted
├─ per-terminal-chain: extension does not possess unlock terminal's keyring
│  └─ access DENIED (if key permissions are possessor-only)
│
└─ verdict: REAL ADVANTAGE — but see "the /proc bypass" below
   ├─ vscode extensions are a realistic attack vector
   ├─ they run in the login session but not in the unlock terminal's tree
   └─ per-terminal-chain isolates the unlock terminal from vscode
```

### the /proc bypass: does daemon isolation actually matter?

per-terminal-chain blocks the daemon access path for cross-terminal attackers.
but actual secrets end up in env vars when tools run `source rhx keyrack get --for repo`.
those env vars are readable via `/proc/$PID/environ` by any same-UID process.

```
proc.bypass
├─ the two access paths to secrets
│  ├─ path A: daemon → connect to socket → request keys → receive secrets
│  │  └─ per-terminal-chain blocks this for cross-terminal attackers ✅
│  │
│  └─ path B: /proc → enumerate /proc/*/environ → read secrets from tool env
│     └─ per-terminal-chain does NOT block this ❌
│        ├─ /proc/$PID/environ is readable by any same-UID process
│        ├─ this is a unix contract, not a keyrack limitation
│        └─ kernel keyrings have no authority over /proc/$PID/environ
│
├─ what a vscode extension can do (even with per-terminal-chain)
│  ├─ poll /proc/*/environ for all same-UID processes
│  ├─ filter for processes with keyrack-related env vars
│  │  (AWS_ACCESS_KEY_ID, GITHUB_TOKEN, etc)
│  ├─ read the actual secret values directly from /proc
│  └─ no daemon access needed — /proc is the side channel
│
├─ exposure window comparison
│  ├─ via daemon (path A)
│  │  ├─ secrets available for the full daemon TTL (hours)
│  │  ├─ attacker can request at any time
│  │  └─ per-terminal-chain narrows this to: never (for cross-terminal)
│  │
│  └─ via /proc (path B)
│     ├─ secrets available while ANY process has them in env
│     ├─ two sub-cases with very different windows:
│     │
│     │  sub-case B1: tool invokes `source rhx keyrack get` internally
│     │  ├─ secrets live in the tool's process env
│     │  ├─ tool exits → secrets gone from that process's env
│     │  └─ window: seconds to minutes (duration of tool execution)
│     │
│     │  sub-case B2: human/robot runs `source rhx keyrack get` in a shell
│     │  ├─ secrets exported into the shell's env
│     │  ├─ shell stays open → secrets persist for the shell's lifetime
│     │  ├─ all children of that shell also inherit the secrets
│     │  └─ window: hours (as long as the shell stays open)
│     │     └─ this is effectively the SAME duration as the daemon TTL
│     │
│     ├─ a persistent watcher (vscode extension, background process) can
│     │  ├─ poll /proc/*/environ continuously (e.g., every few seconds)
│     │  ├─ detect new env vars as soon as they appear in any process
│     │  ├─ read secrets from long-lived shells (sub-case B2) at any time
│     │  └─ this is NOT a narrow time window — it is persistent surveillance
│     │
│     └─ per-terminal-chain has no effect on either sub-case
│
├─ net effect of per-terminal-chain on vscode extension attack
│  ├─ blocks: on-demand daemon access (path A) → real, eliminates hours of exposure
│  ├─ does NOT block: /proc poll (path B) → attacker watches continuously
│  ├─ if secrets are sourced into a long-lived shell (sub-case B2):
│  │  └─ /proc window ≈ daemon window → per-terminal-chain provides ZERO net reduction
│  ├─ if secrets are only in short-lived tool processes (sub-case B1):
│  │  └─ /proc window = seconds-minutes → per-terminal-chain provides REAL reduction
│  └─ in practice: mix of both; the long-lived shell case dominates
│
└─ verdict: per-terminal-chain provides near-zero protection against
   a persistent /proc watcher like a vscode extension
   ├─ the daemon path (A) is blocked ✅
   ├─ the /proc path (B) is wide open ❌
   ├─ a persistent watcher can poll /proc continuously — no luck needed
   ├─ secrets in long-lived shells are available for hours (same as daemon TTL)
   ├─ cannot be blocked without OS-level changes
   │  (e.g., hidepid=2 on /proc mount, or removal of secrets from env entirely)
   └─ per-terminal-chain does NOT turn a guaranteed breach into a probabilistic one
      └─ it remains a guaranteed breach via /proc for any persistent watcher
```

this analysis applies equally to usecases 2, 4, and 5 — any cross-terminal attacker
that is blocked from the daemon can still fall back to /proc/$PID/environ poll.

### usecase 4: attacker with ssh access (same user)

```
attacker.ssh.same.user
├─ attacker ssh's into the machine as the same user
├─ on most systems: new ssh = new login session = new sessionid
│  └─ per-login-session already blocks this (different sessionid)
│
├─ edge case: attacker reuses an active ssh session (e.g., tmux attach)
│  ├─ same login session → same sessionid
│  ├─ per-login-session: access granted
│  ├─ per-terminal-chain: attacker in tmux has different keyring → denied
│  └─ verdict: REAL ADVANTAGE (narrow edge case)
│
└─ typical case: per-login-session already sufficient
```

### usecase 5: lateral movement within login session

```
lateral.movement
├─ attacker compromises one process in the login session
├─ wants to reach keys unlocked in a different terminal
│
├─ per-login-session: daemon serves any same-session caller → access granted
├─ per-terminal-chain: attacker's process has different keyring → denied
│
├─ how realistic?
│  ├─ requires attacker foothold in same login session but different terminal
│  ├─ e.g., long-lived background process that was compromised
│  ├─ e.g., a dev server process that has a vulnerability
│  └─ the attacker has code execution but in a non-unlock process tree
│
└─ verdict: REAL ADVANTAGE for lateral movement containment
```

---

## summary of structural advantages

```
structural.advantage.summary
├─ per-terminal-chain blocks daemon access (path A) for
│  ├─ ✅ rogue code in DIFFERENT terminal (usecase 2)
│  ├─ ✅ compromised vscode extension (usecase 3)
│  ├─ ✅ tmux session reuse by attacker (usecase 4, edge case)
│  └─ ✅ lateral movement from compromised background process (usecase 5)
│
├─ per-terminal-chain does NOT block /proc access (path B) for ANY of these
│  ├─ ❌ attacker can poll /proc/*/environ for secrets in tool env
│  ├─ ❌ /proc/$PID/environ is readable by any same-UID process
│  ├─ ❌ kernel keyrings have no authority over /proc
│  └─ ❌ this side channel exists for all cross-terminal usecases
│
├─ per-terminal-chain does NOT protect against (at all)
│  ├─ ❌ rogue code in SAME terminal tree (usecase 1 — the most common vector)
│  ├─ ❌ attacker with root or CAP_SYS_PTRACE
│  ├─ ❌ systems with YAMA ptrace_scope=0
│  └─ ❌ keys with default (non-possessor-only) permissions
│
├─ conditions required for daemon-path protection
│  ├─ key permissions: possessor-only (explicit, not default)
│  ├─ ptrace_scope >= 1 (default on ubuntu/debian)
│  ├─ attacker in different terminal tree
│  └─ no privilege escalation
│
└─ net assessment
   ├─ per-terminal-chain blocks daemon access (path A) for cross-terminal attacks
   ├─ but /proc access (path B) remains open for all of them
   ├─ the protection is NOT a window reduction for persistent watchers
   │  ├─ daemon path: hours of exposure → zero (blocked)
   │  ├─ /proc path (short-lived tools): zero → seconds-minutes
   │  ├─ /proc path (long-lived sourced shells): zero → hours (same as daemon TTL)
   │  └─ net for persistent watcher: hours → hours (no reduction)
   ├─ a vscode extension can poll /proc continuously — guaranteed to find secrets
   │  └─ secrets in sourced shells persist for the shell's lifetime (hours)
   ├─ does NOT protect against the most common attack (same-terminal supply chain)
   └─ the gap per-terminal-chain closes is fully reopened by the /proc side channel
      └─ for any persistent watcher, the exposure is identical with or without it
```

---

## the tradeoff

```
tradeoff
├─ what per-terminal-chain costs
│  ├─ each terminal must unlock separately (no automatic cross-terminal)
│  ├─ human opens two terminals in same repo → must unlock both
│  ├─ breaks the zero-friction cross-terminal UX of os.daemon
│  ├─ added implementation complexity (keyctl setup, permission management)
│  └─ added failure modes (keyring state, permission misconfiguration)
│
├─ what per-terminal-chain buys
│  ├─ blocks daemon access from cross-terminal attackers (path A)
│  │  ├─ vscode extensions, background processes, tmux reuse
│  │  └─ real but moot — /proc side channel (path B) provides equivalent access
│  ├─ for short-lived tool processes only: reduces exposure from hours to seconds
│  │  └─ but long-lived sourced shells expose secrets for hours anyway
│  └─ does NOT buy protection from same-terminal supply chain attacks
│
└─ evaluation
   ├─ the most common attack vector (rogue npm in same terminal) is NOT mitigated
   ├─ the most meaningful protection (vscode isolation) is NOT effectively mitigated
   │  ├─ daemon access blocked ✅
   │  ├─ /proc access to sourced shells: wide open for hours ❌
   │  ├─ persistent /proc watcher: guaranteed to find secrets ❌
   │  └─ net: zero effective reduction for a persistent watcher
   ├─ the cost is significant UX friction for every bonintent user
   └─ the benefit is zero against any persistent watcher (the real threat)
      └─ not worth the cost — per-login-session + per-worksite is sufficient
```

---

## citations & empirical evidence

### /proc/$PID/environ access control

the kernel governs access to `/proc/$PID/environ` via a `PTRACE_MODE_READ_FSCREDS` check — not simple file permissions.

> "permission to access this file is governed by a ptrace access mode PTRACE_MODE_READ_FSCREDS check"
> — [proc_pid_environ(5)](https://man7.org/linux/man-pages/man5/proc_pid_environ.5.html)

### PTRACE_MODE_READ vs PTRACE_MODE_ATTACH

ptrace(2) distinguishes two access modes:

> "PTRACE_MODE_READ — for 'less dangerous' operations... e.g., get_robust_list(2); kcmp(2); read of /proc/pid/auxv, /proc/pid/environ, or /proc/pid/stat"
> — [ptrace(2)](https://man7.org/linux/man-pages/man2/ptrace.2.html)

YAMA ptrace_scope restricts `PTRACE_MODE_ATTACH` (debugger attachment) but does NOT restrict `PTRACE_MODE_READ` operations:

> "1 - restricted ptrace: a process must have a predefined relationship with the inferior it wants to call PTRACE_ATTACH on"
> — [YAMA kernel docs](https://docs.kernel.org/admin-guide/LSM/Yama.html)

this means ptrace_scope=1 blocks `ptrace(PTRACE_ATTACH)` from non-parent processes, but does NOT block reads of `/proc/$PID/environ`. the two checks are distinct kernel code paths.

### empirical verification

tested on Pop!_OS 22.04 (kernel 6.9.3, ptrace_scope=1):

```
test.result (2026-02-08)
├─ system: Pop!_OS 22.04, kernel 6.9.3-76060903-generic
├─ ptrace_scope: 1 (restricted ptrace — ubuntu/debian default)
│
├─ test 1: can same-user non-child process read /proc/$PID/environ?
│  └─ result: READABLE (exit 0)
│
├─ test 2: can it extract a specific secret env var?
│  └─ result: SECRET EXTRACTED (KEYRACK_TEST_SECRET=s3cr3t_hunter2_d0ntl34k)
│
├─ test 3: can it enumerate all /proc/*/environ and find the secret?
│  └─ result: found in 1 process via enumeration
│
└─ conclusion: ptrace_scope=1 does NOT block PTRACE_MODE_READ on /proc/$PID/environ
   └─ any same-UID process can read any other same-UID process's env vars
```

test source: `test.proc-environ-access.sh` (in this directory)

### industry sources on env var risk

> "environment variables are one of the most common ways secrets get exposed in modern applications"
> — [CyberArk: env vars don't hold secrets](https://developer.cyberark.com/blog/environment-variables-dont-keep-secrets-best-practices-for-plugging-application-credential-leaks/)

> "any process that runs as the same user can read /proc/[pid]/environ... there is no way to prevent other processes from the same user from access to the environment"
> — [Trend Micro: hidden danger of env vars for secret storage](https://www.trendmicro.com/en_us/research/22/h/analyzing-hidden-danger-of-environment-variables-for-keeping-secrets.html)

### note on ptrace_scope and kernel key retention

ptrace_scope=1 does protect kernel key retention keys (used in the per-terminal-chain approach) — `keyctl_read()` on possessor-only keys requires possession, not ptrace access. the ptrace_scope condition in the structural gap section (line ~109) refers to prevention of ptrace-based escalation to gain key possession, which IS blocked by ptrace_scope >= 1.

the distinction:
- `/proc/$PID/environ` → PTRACE_MODE_READ → NOT blocked by ptrace_scope=1
- `ptrace(PTRACE_ATTACH)` → PTRACE_MODE_ATTACH → blocked by ptrace_scope=1
- `keyctl_read()` on possessor-only key → kernel key retention permission check → blocked without possession

per-terminal-chain protects the daemon access path (via key retention tokens). but the /proc side channel bypasses the daemon entirely — and /proc reads are NOT blocked by ptrace_scope.
