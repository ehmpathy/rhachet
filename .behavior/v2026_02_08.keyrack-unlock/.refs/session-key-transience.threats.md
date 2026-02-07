# threat analysis: transient session keys & session vaults

> what can go wrong, how bad is it, and what do we accept?

---

## threat surface

the transient session key pattern introduces three assets an adversary could target:

```
assets
├─ sessionKey (transient, in process env)
│  └─ unlocks the session vault
├─ sessionVault (encrypted, on disk)
│  └─ contains all granted keys for this worksite
└─ tooluseFirewall (admin hooks)
   └─ prevents callers from direct `get` access
```

compromise any one of these and the adversary escalates toward granted keys.

---

## threat.sessionKey.exfiltration

the session key lives in process env. on linux, env vars are not secret from same-user processes.

### vector: /proc/$PID/environ

any process with the same UID can read another process's environment:

```
adversary (same user)
├─ cat /proc/$ROBOT_PID/environ
│  └─ KEYRACK_SESSION_KEY=age1abc123...
├─ decrypt session vault with stolen key
└─ access all granted keys
```

**severity**: high — grants full access to all keys in the session vault
**prerequisite**: same-user process, knows or can enumerate robot PID
**mitigation**: none within this design. env vars are readable by same-user processes on linux by default. `hidepid=2` on `/proc` mount helps but is not standard.

### vector: /proc/$PID/cmdline

when `--reuse $sessionKey` is passed as a cli argument, it's visible in `/proc/$PID/cmdline` for the duration of that process:

```
adversary (same user)
├─ cat /proc/*/cmdline | grep KEYRACK
│  └─ ...unlock --reuse age1abc123...
└─ session key captured from argument list
```

**severity**: high — same as above
**prerequisite**: same-user process, must read while unlock command is active (narrow window)
**mitigation**: the unlock command is short-lived (finishes fast), so the window is narrow. but `ps aux` or `/proc` enumeration could catch it.

### vector: shell history

if the human types or pastes the session key on a command line, it persists in shell history:

```
adversary (same user, later)
├─ cat ~/.bash_history | grep reuse
│  └─ source rhx unlock --reuse age1abc123...
└─ session key captured from history file
```

**severity**: medium — key may be expired by the time adversary reads history, but history persists indefinitely by default
**prerequisite**: access to shell history file
**mitigation**: session vault TTL bounds the blast radius. expired vaults are useless even with the key. users could prefix with a space (HISTCONTROL=ignorespace) but that's not enforced.

### vector: child process inheritance

every child process inherits the parent's env. if the robot spawns a long-lived subprocess, that subprocess carries the session key:

```
robot
├─ KEYRACK_SESSION_KEY in env
├─ spawns background process (e.g., file watcher, dev server)
│  └─ background process inherits KEYRACK_SESSION_KEY
│     └─ outlives the robot's terminal session
└─ session key is no longer transient — it lives as long as the child
```

**severity**: medium — the key persists beyond intended scope
**prerequisite**: robot or tool spawns long-lived subprocess
**mitigation**: session vault TTL still bounds blast radius. but the "transient" guarantee is weakened — the key's lifetime is the max of (terminal session, longest child process).

---

## threat.sessionVault.persistence

the session vault is encrypted on disk. but "on disk" has implications.

### vector: vault outlives session

the vault file persists on disk until the next keyrack run triggers TTL cleanup:

```
timeline
├─ t0: human unlocks, vault created
├─ t1: terminal closed, session key gone from env
├─ t2: vault still on disk (encrypted, but present)
├─ t3: adversary obtains session key (from history, swap, core dump)
├─ t4: adversary decrypts vault with stolen key
└─ t5: next keyrack run cleans up expired vault (too late)
```

**severity**: medium — requires both vault file AND session key
**prerequisite**: adversary obtains session key through another vector, vault not yet cleaned up
**mitigation**: aggressive TTL cleanup (cron or on-login hook). secure deletion (shred) of vault files. but lazy cleanup is the current design.

### vector: disk forensics

even after deletion, vault data may be recoverable from disk (journaled filesystems, SSD wear level):

```
adversary (elevated access, later)
├─ forensic recovery of deleted vault file
├─ if session key was also recovered (history, swap, etc)
└─ decrypt vault contents
```

**severity**: low — requires both forensic disk access AND session key recovery
**prerequisite**: elevated privileges, offline access to disk
**mitigation**: full disk encryption (FDE) at the OS level. this is outside keyrack's scope but is the real answer.

### vector: swap / hibernation

if the process memory is swapped to disk, the session key (and possibly decrypted secrets) could persist in swap:

```
os
├─ memory pressure → swap session key to disk
├─ hibernation → full memory dump to disk
└─ adversary with disk access recovers key from swap/hibernation image
```

**severity**: low — requires disk access
**prerequisite**: swap enabled, adversary has offline disk access
**mitigation**: encrypted swap. again, outside keyrack's scope.

---

## threat.tooluseFirewall.bypass

the tooluse firewall (admin hooks) prevents callers from direct `keyrack get`. but hooks are pattern-based, not capability-based.

### vector: robot crafts vault decryption

the robot has the session key in env and knows the vault file path. it could write code to decrypt the vault directly, without `keyrack get`:

```
robot (rogue)
├─ read vault file: ~/.rhachet/keyrack.session.$id.age
├─ read session key: $KEYRACK_SESSION_KEY (already in env)
├─ write decryption code (age decrypt with key)
└─ access all granted keys without `keyrack get`
```

**severity**: high — full access to all session keys
**prerequisite**: malintent. robot must deliberately write decryption code.
**mitigation**: this is acknowledged in the design as "requires malintent, detectable in audit logs." the defense is detection, not prevention. admin hooks that block `age` cli usage or file reads of `~/.rhachet/keyrack.session.*` could raise the bar.

### vector: sanctioned tool exfiltration

a sanctioned tool (e.g., `npm run test:integration`) runs `keyrack get` internally and exports secrets to its process env. the robot can't run `get` directly, but the tool's output might leak:

```
robot
├─ npm run test:integration
│  ├─ internally: source rhx keyrack get --for repo
│  ├─ secrets in tool's process env
│  └─ tool logs, stdout, or error output may contain secrets
├─ robot reads tool output
└─ secrets captured from logs
```

**severity**: medium — depends on tool's log hygiene
**prerequisite**: sanctioned tool leaks secrets in output
**mitigation**: tools should never log secret values. but this is a convention, not an enforcement.

### vector: tool supply chain

the robot could modify a sanctioned tool's source (e.g., alter `package.json` test command, inject into `node_modules`) to exfiltrate secrets:

```
robot (rogue)
├─ edit package.json: add `echo $XAI_API_KEY` to test command
├─ npm run test:integration (sanctioned, allowed by hooks)
│  └─ modified command prints secret to stdout
├─ robot reads stdout
└─ secret captured
```

**severity**: high — full exfiltration through sanctioned channel
**prerequisite**: malintent + write access to repo files
**mitigation**: git diff audit. pre-commit hooks that detect suspicious changes. but a determined rogue robot can work around these. this is fundamentally a "trusted insider" problem.

### vector: hook pattern gaps

admin hooks use pattern match (prefix, exact). if patterns are too narrow, a caller can invoke `get` through an unmatched path:

```
adversary
├─ hooks block: "rhx keyrack get"
├─ adversary runs: rhachet keyrack get --for repo (full path, not alias)
│  └─ not matched by hook pattern → allowed
└─ secrets exported
```

**severity**: high — full firewall bypass
**prerequisite**: hook patterns don't cover all invocation variants
**mitigation**: hooks must cover all equivalent invocations: `rhx keyrack get`, `rhachet keyrack get`, `npx rhachet keyrack get`, `./bin/run keyrack get`, etc. exhaustive pattern coverage is fragile.

---

## threat.crossTerminal.reuse

the `--reuse` flow introduces additional vectors.

### vector: clipboard managers

when human copies session key between terminals, clipboard managers may persist it:

```
human
├─ copies session key from terminal A
├─ clipboard manager stores it (e.g., clipman, gpaste, kde klipper)
│  └─ session key persists in clipboard history on disk
└─ adversary reads clipboard history
```

**severity**: medium — depends on clipboard manager config
**prerequisite**: clipboard manager with persistent history enabled
**mitigation**: awareness. clipboard managers should be configured to exclude sensitive patterns or auto-clear.

---

## accepted risks

the design explicitly accepts certain risks as outside scope:

```
accepted
├─ compromised terminal → game over (scoped to session)
├─ elevated privilege (root, ptrace) → can read any process env
├─ memory inspection → keys exist in memory for session duration
├─ determined rogue insider → can write decryption code (detectable)
└─ supply chain compromise → trusted tools could exfiltrate (auditable)
```

the posture is **defense in depth, not absolute prevention**:
- casual access is blocked by default
- deliberate circumvention requires malintent
- malintent is detectable via audit trail
- blast radius is bounded by session TTL

---

## risk delta: what does this pattern change?

compared to the prior approach (cache in os.direct as plaintext):

```
risk.comparison
├─ prior (os.direct cache)
│  ├─ any process can read keyrack.direct.json
│  ├─ no session scope — keys accessible indefinitely
│  ├─ grade degradation: encrypted → plaintext on disk
│  └─ blast radius: permanent (until key rotated)
│
├─ current (session vault)
│  ├─ vault encrypted at rest — requires session key to read
│  ├─ session scoped — keys accessible only from unlocked terminal tree
│  ├─ grade preserved: encrypted → encrypted (session vault)
│  └─ blast radius: bounded by TTL (default 8h)
│
└─ delta
   ├─ ✅ filesystem read no longer grants access (vault is encrypted)
   ├─ ✅ grade never degrades (encrypted keys stay encrypted)
   ├─ ✅ blast radius bounded by TTL (not indefinite)
   ├─ ⚠️ /proc/$PID/environ is a new vector (session key in env)
   ├─ ⚠️ shell history is a new vector (--reuse argument)
   └─ ⚠️ child process inheritance weakens "transient" guarantee
```

net assessment: the pattern **reduces** overall risk. the new vectors (proc, history, inheritance) require same-user access that was already sufficient to read `keyrack.direct.json` in the prior approach. the key improvement is that filesystem read alone is no longer sufficient — the adversary needs both the vault file AND the session key.

---

## deeper question: are env var secrets fundamentally leaky?

yes. this is not unique to keyrack — it's a property of env vars on linux.

after `source rhx keyrack get --for repo`, the **actual secrets** (AWS keys, API tokens, etc) sit in env vars. any same-user process can read them via `/proc/$PID/environ`. this is true for docker, kubernetes, 12-factor apps, and every other system that distributes credentials via env vars.

```
env.var.leak.scope
├─ session key in env (KEYRACK_SESSION_KEY)
│  └─ readable by same-user processes via /proc
├─ actual secrets in env (after `source ... get`)
│  └─ ALSO readable by same-user processes via /proc
└─ implication
   ├─ the session key is not the weakest link
   ├─ the actual secrets in env ARE the weakest link
   └─ any process with same UID can read them directly
      └─ no vault decryption needed — just read /proc
```

this means: after a tool runs `keyrack get` and exports secrets to its env, any same-user process can read those secrets directly from `/proc` — without ever needing the session key or the vault. the session vault only protects secrets **at rest on disk**. once they're in env, they're exposed.

this is the industry standard. it is leaky. but it's what every tool ecosystem (aws cli, docker, terraform, node) expects.

---

## alternative: linux kernel keyring (`keyctl`)

the linux kernel keyring service stores secrets in kernel memory, invisible to `/proc` and `ps`.

### keyring types

```
keyring.types
├─ @s (session)
│  ├─ inherited by child processes (fork, exec, clone)
│  ├─ NOT visible via /proc/$PID/environ
│  ├─ NOT visible via `ps eww`
│  ├─ NOT visible to same-user processes in different login sessions
│  ├─ IS visible to same-user processes in same login session
│  ├─ dies when login session ends
│  └─ verdict: strictly better than env vars for transient secrets
│
├─ @p (process)
│  ├─ private to a single process
│  ├─ cleared on fork() and exec()
│  ├─ child processes CANNOT access it
│  └─ verdict: too restrictive — robot's child shells can't read it
│
├─ @t (thread)
│  ├─ private to a single thread
│  ├─ NOT inherited across clone/fork
│  └─ verdict: too restrictive — same as @p but worse
│
└─ @us (user-session)
   ├─ shared across ALL sessions for a user
   ├─ visible to any process with same UID
   └─ verdict: equivalent to env vars — no improvement
```

### session keyring (@s) vs env vars

| property | env var | kernel keyring @s |
|----------|---------|-------------------|
| visible via `/proc/$PID/environ` | yes | **no** |
| visible via `ps eww` | yes | **no** |
| inherited by child processes | yes | **yes** |
| visible to same-user, same login session | yes | yes |
| visible to same-user, different login session | **yes** | **no** |
| visible to root | yes | yes |
| survives terminal close | no | no |

### usage from bash

```sh
# store session key in kernel keyring
keyctl add user keyrack_session "age1abc123..." @s

# read from child process (inherited via session keyring)
keyctl pipe $(keyctl search @s user keyrack_session)

# available on ubuntu/debian/fedora via `keyutils` package
# already present on this machine: /usr/bin/keyctl
```

### what kernel keyring would fix

```
fixes
├─ /proc/$PID/environ enumeration → closed (key not in env)
├─ /proc/$PID/cmdline exposure → closed (key not passed as arg)
├─ `ps eww` exposure → closed (key not in env)
├─ cross-login-session reads → closed (session keyring is per-session)
└─ shell history for --reuse → could pass keyring id instead of raw key
```

### what kernel keyring would NOT fix

```
not.fixed
├─ same-user, same-session processes can still `keyctl read`
├─ root can still access keyrings
├─ actual secrets still end up in env vars (for tool compatibility)
│  └─ AWS_ACCESS_KEY_ID, XAI_API_KEY, etc — tools expect env vars
│     └─ back in /proc/$PID/environ for the tool's process
└─ requires `keyutils` package (usually available, not always present)
```

### the fundamental tension

the kernel keyring can protect the **session key** from `/proc` enumeration. but the **actual secrets** still end up in env vars when tools consume them — because the entire tool ecosystem (aws cli, terraform, node sdk) expects `$AWS_ACCESS_KEY_ID` in env.

```
protection.layers
├─ session key → CAN be protected via kernel keyring @s
│  └─ invisible to /proc, inherited by children
├─ session vault → already protected via age encryption
│  └─ encrypted at rest, requires session key
└─ actual secrets → CANNOT be fully protected
   ├─ tools expect env vars (aws cli, terraform, node sdk)
   ├─ env vars are in /proc/$PID/environ
   └─ this is the irreducible leak — bounded only by process lifetime
```

### recommendation

use kernel keyring for the session key. accept that actual secrets in env vars are the irreducible floor of this design — bounded by the process lifetime of the tool that runs `get`.

the session key in a kernel keyring means: an adversary who can read `/proc` still can't decrypt the vault. they'd need to be in the same login session AND know how to query the keyring. this is a meaningful barrier — not absolute, but real.

---

## question: per-terminal-session vs per-user scope

the session key is architecturally per-terminal but practically per-user (with env vars). is per-terminal-session scope meaningful?

### with env vars (today)

any same-user process can enumerate `/proc/*/environ` and find the session key from any terminal. the "per terminal" boundary is cosmetic — it's really "per user who has any active terminal with the key."

```
per-terminal-session.effective.scope
├─ with env vars (today)
│  ├─ session key readable by any same-user process via /proc
│  ├─ per-terminal boundary is cosmetic, not enforced
│  └─ effective scope: per-user (any same-user process can read)
│
└─ with kernel key retention @s (future)
   ├─ session key invisible to /proc
   ├─ kernel enforces login session boundary
   ├─ process in login session A cannot read keys from login session B
   └─ effective scope: per-login-session (kernel-enforced)
```

### what per-terminal-session still protects (even with env vars)

```
per-terminal-session.value
├─ filesystem-only attacks
│  ├─ vault is encrypted on disk → can't read without session key
│  ├─ session key is NOT on disk → can't recover from filesystem alone
│  └─ this is the main win vs the prior os.direct plaintext cache
│
├─ temporal scope
│  ├─ session key dies with terminal → blast radius bounded by session lifetime
│  ├─ vault TTL adds explicit expiry → stale vaults cleaned up
│  └─ vs per-user vault which would live indefinitely
│
├─ intent scope
│  ├─ human explicitly chooses which terminal gets access
│  ├─ not all terminals are equal (prod vs dev vs scratch)
│  └─ per-user vault would grant all terminals implicitly
│
└─ what it does NOT protect
   ├─ same-user process enumeration via /proc → session key readable
   ├─ actual secrets in env vars → directly readable, no vault needed
   └─ these are the irreducible leaks
```

### recommendation

design for the correct boundary (per-session). accept that env vars weaken it to per-user today. plan for kernel key retention to close the gap.

the architecture should be correct even if env vars weaken it today. kernel key retention is a drop-in upgrade that makes the design fully correct. to design for per-user now would be to design DOWN to the weakest link — and lock into the weaker model permanently.

---

## question: how does the session vault enforce its own TTL?

if someone captures the session key (via /proc, history, swap) weeks after the terminal closed, and the vault file was never cleaned up — can they still decrypt it?

### the problem

TTL checks inside `rhx keyrack get` are a **convention**, not an **enforcement**. an adversary who has both the vault file and the session key can decrypt the vault directly — skipping any TTL check in rhachet's code.

```
ttl.enforcement.gap
├─ convention (what rhachet checks)
│  ├─ vault contains expiresAt timestamp
│  ├─ `get` checks expiresAt before return of secrets
│  └─ adversary who uses `get` is blocked by expired TTL
│
└─ reality (what an adversary can do)
   ├─ adversary has session key (from /proc, history, swap)
   ├─ adversary has vault file (still on disk, never cleaned up)
   ├─ adversary runs `age -d -i <session_key> vault.age` directly
   └─ TTL check is skipped entirely — vault contents are exposed
```

**real TTL enforcement = vault file must not exist + session key must not exist.**

### defense layers

```
ttl.enforcement.layers
├─ layer 1: convention (in rhachet)
│  ├─ vault contains expiresAt
│  ├─ `get` refuses expired vaults
│  ├─ `unlock --reuse` refuses expired vaults
│  └─ stops honest callers, not adversaries
│
├─ layer 2: vault file cleanup
│  ├─ proactive: delete vault file when session ends
│  │  ├─ trap EXIT in unlock shell to delete vault on terminal close
│  │  ├─ risk: trap may not fire (SIGKILL, power loss, crash)
│  │  └─ best effort, not guaranteed
│  │
│  ├─ lazy: delete expired vaults on next keyrack run
│  │  ├─ any `unlock` or `get` scans for expired vault files
│  │  ├─ deletes any vault where now > expiresAt
│  │  ├─ risk: gap between session end and next keyrack run
│  │  └─ reliable but delayed
│  │
│  ├─ scheduled: cron or systemd timer
│  │  ├─ periodic scan (e.g., every 15min) for expired vaults
│  │  ├─ `shred` (not just `rm`) for secure deletion
│  │  ├─ risk: requires user to set up cron
│  │  └─ most reliable, but has setup cost
│  │
│  └─ login hook: clean on new login session
│     ├─ pam_exec or ~/.profile runs vault cleanup
│     ├─ catches vaults from prior sessions
│     └─ risk: only fires on login, not between logins
│
├─ layer 3: session key expiry
│  ├─ env var: dies with terminal (no persistence)
│  │  └─ but recoverable from /proc, history, swap while alive
│  │
│  ├─ kernel key retention: `keyctl timeout <key_id> <seconds>`
│  │  ├─ kernel auto-revokes the key after timeout
│  │  ├─ even same-session processes can't read it after expiry
│  │  ├─ this is real enforcement — kernel-level, not convention
│  │  └─ strongest TTL mechanism available
│  │
│  └─ shell history: unrecoverable if HISTCONTROL=ignorespace
│     └─ user prefixes command with space → not saved to history
│
└─ layer 4: secure deletion
   ├─ `shred -u` overwrites file data before unlink
   ├─ effective on HDD, limited on SSD (wear level)
   ├─ journaled filesystems may retain copies in journal
   └─ full disk encryption (FDE) is the real answer for at-rest
```

### recommended TTL strategy

```
ttl.strategy.recommended
├─ convention (always)
│  └─ vault contains expiresAt, `get` and `unlock --reuse` check it
│
├─ proactive cleanup (always)
│  └─ trap EXIT in unlock to delete vault file on terminal close
│
├─ lazy cleanup (always)
│  └─ every keyrack run scans and deletes expired vaults
│
├─ kernel key retention timeout (when available)
│  └─ `keyctl timeout <key_id> <ttl_seconds>` → kernel auto-revokes
│
└─ secure deletion (best effort)
   └─ `shred -u` vault files on cleanup (limited by filesystem)
```

the combination of proactive + lazy cleanup means:
- best case: vault is deleted when terminal closes (trap EXIT)
- worst case: vault is deleted on next keyrack run (lazy scan)
- with kernel key retention: session key is kernel-revoked after TTL, even if vault file persists

the "weeks later" scenario is addressed by lazy cleanup: the next time anyone runs any keyrack command, all expired vaults are purged. the gap is bounded by how long it takes for someone to run keyrack again.

for machines with regular use: gap is typically minutes to hours.
for abandoned machines: gap could be indefinite — but an abandoned machine has larger problems than stale vaults.

---

## future harden opportunities (not prescribed, noted)

```
harden.opportunities
├─ kernel key retention for session key
│  ├─ store KEYRACK_SESSION_KEY in @s instead of env var
│  └─ `keyctl timeout` for kernel-enforced TTL on session key
├─ proc isolation
│  └─ hidepid=2 on /proc mount (prevents cross-process env reads)
├─ vault cleanup
│  ├─ trap EXIT in unlock for proactive vault deletion
│  ├─ lazy scan on every keyrack run for expired vaults
│  ├─ cron/systemd timer for scheduled cleanup
│  └─ secure deletion (shred) of expired vault files
├─ history prevention
│  └─ guide users to HISTCONTROL=ignorespace or HISTIGNORE patterns
├─ hook exhaustiveness
│  └─ test hook patterns against all invocation variants
├─ child process isolation
│  └─ tools could unset KEYRACK_SESSION_KEY before long-lived children spawn
└─ clipboard awareness
   └─ document clipboard manager risks in user guidance
```
