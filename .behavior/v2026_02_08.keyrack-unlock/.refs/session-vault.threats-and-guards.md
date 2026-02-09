# session vault: threats and guards

> what can go wrong, what do we accept, and what do we guard against?

---

## security posture summary

env vars are plaintext to all same-user processes. this is the irreducible floor — inherited from decades of unix tools that expect `$AWS_ACCESS_KEY_ID` in env. the session vault pattern does not eliminate this floor. it raises the bar above it.

```
posture
├─ irreducible floor
│  ├─ env vars are readable by any same-user process via /proc/$PID/environ
│  ├─ this is a unix contract, not a keyrack limitation
│  └─ every tool that distributes secrets via env vars shares this floor
│
├─ what the session vault adds above the floor
│  ├─ filesystem-only attacks are blocked (vault is encrypted at rest)
│  ├─ temporal scope bounds blast radius (session key dies with terminal)
│  ├─ worksite isolation prevents accidental cross-repo secret leakage
│  └─ grade preservation ensures encrypted keys stay encrypted on disk
│
└─ defense posture
   ├─ for good-intent users: per-session isolation prevents accidental misuse
   ├─ for bad-intent actors: /proc enumeration is required (observable, patchable)
   └─ for filesystem attackers: vault is encrypted, session key is not on disk
```

---

## asset lifetime analysis

not all assets have the same exposure window. the session key lives longest and is the highest-value target.

```
asset.lifetime
├─ KEYRACK_SESSION_KEY
│  ├─ lives for entire terminal session (hours)
│  ├─ present in: parent shell + all child processes
│  ├─ readable via /proc for the entire session duration
│  ├─ value: unlocks the session vault (all granted keys)
│  └─ verdict: long-lived, high value → highest priority to protect
│
├─ actual secrets (after `source rhx keyrack get --for repo`)
│  ├─ lives only for the duration of the tool that runs `get`
│  ├─ e.g., `npm run test:integration` → secrets die when command exits
│  ├─ readable via /proc only while that command runs (seconds to minutes)
│  ├─ value: individual api keys, tokens, credentials
│  └─ verdict: short-lived, bounded by tool process lifetime
│
├─ session vault file (on disk)
│  ├─ lives until cleanup (proactive, lazy, or scheduled)
│  ├─ encrypted at rest — useless without session key
│  ├─ value: all granted keys (but only if session key is also captured)
│  └─ verdict: persistent but encrypted — low risk alone, high risk if paired with session key
│
└─ implication
   ├─ session key has the longest exposure window of any asset
   ├─ actual secrets are already bounded by tool process lifetime
   └─ kernel key retention for session key has the highest security impact
```

---

## threat surface

three assets an adversary could target:

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

## threats and guards

### threat: session key exfiltration

#### vector: /proc/$PID/environ

any same-user process can read another process's environment.

```
adversary (same user)
├─ cat /proc/$ROBOT_PID/environ
│  └─ KEYRACK_SESSION_KEY=age1abc123...
├─ decrypt session vault with stolen key
└─ access all granted keys
```

**severity**: high
**prerequisite**: same-user process, knows or can enumerate robot PID

```
guards
├─ env var (today): no guard — readable by same-user processes
├─ kernel key retention @s (future)
│  ├─ session key stored in kernel memory, not env
│  ├─ invisible to /proc and `ps`
│  ├─ invisible to same-user processes in different login sessions
│  └─ `keyctl timeout` auto-revokes after TTL
└─ hidepid=2 on /proc mount
   └─ prevents cross-process /proc reads (not standard, but available)
```

#### vector: /proc/$PID/cmdline

when `--reuse $sessionKey` is passed as a cli argument, it's visible in `/proc/$PID/cmdline` for the duration of that process.

**severity**: high
**prerequisite**: same-user process, must read while unlock command is active (narrow window)

```
guards
├─ narrow window: unlock command finishes fast
├─ kernel key retention (future): pass key id instead of raw key
└─ no persistent guard today — accepted risk with narrow window
```

#### vector: shell history

if the human types or pastes the session key on a command line, it persists in shell history.

**severity**: medium (key may be expired by the time adversary reads history)
**prerequisite**: access to shell history file

```
guards
├─ session vault TTL: expired vaults are useless even with the key
├─ HISTCONTROL=ignorespace: prefix command with space → not saved
├─ HISTIGNORE patterns: exclude keyrack commands from history
└─ kernel key retention (future): pass key id, not raw key value
```

#### vector: child process inheritance

every child process inherits the parent's env. long-lived children carry the session key beyond intended scope.

**severity**: medium
**prerequisite**: robot or tool spawns long-lived subprocess

```
guards
├─ session vault TTL: bounds blast radius regardless of child lifetime
├─ tools could unset KEYRACK_SESSION_KEY before long-lived children spawn
└─ kernel key retention @s: dies with login session regardless of children
```

---

### threat: session vault persistence

#### vector: vault outlives session

the vault file persists on disk until cleanup. if an adversary obtains the session key later (from history, swap, core dump), they can decrypt a stale vault.

```
timeline
├─ t0: human unlocks, vault created
├─ t1: terminal closed, session key gone from env
├─ t2: vault still on disk (encrypted, but present)
├─ t3: adversary obtains session key (from history, swap, core dump)
├─ t4: adversary decrypts vault with stolen key
└─ t5: next keyrack run cleans up expired vault (too late)
```

**severity**: medium (requires both vault file AND session key)

```
guards
├─ proactive: trap EXIT in unlock → delete vault on terminal close
│  └─ best effort — trap may not fire on SIGKILL, power loss, crash
├─ lazy: every keyrack run scans and deletes expired vaults
│  └─ reliable but delayed — gap is bounded by next keyrack use
├─ scheduled: cron or systemd timer scans every 15min
│  └─ most reliable, but requires user setup
├─ login hook: pam_exec or ~/.profile cleans expired vaults on login
│  └─ catches vaults from prior sessions
├─ kernel key retention timeout (future)
│  ├─ `keyctl timeout <key_id> <ttl_seconds>`
│  ├─ kernel auto-revokes session key after timeout
│  ├─ even if vault file persists, session key is gone
│  └─ strongest TTL enforcement — kernel-level, not convention
└─ secure deletion: `shred -u` on vault files
   └─ effective on HDD, limited on SSD (wear level)
```

#### vector: disk forensics / swap / hibernation

even after deletion, vault data may be recoverable from disk. session key may persist in swap.

**severity**: low (requires elevated privileges or offline disk access)

```
guards
├─ full disk encryption (FDE) at OS level
│  └─ outside keyrack scope, but the real answer
├─ encrypted swap
│  └─ outside keyrack scope
└─ these are OS-level concerns, not application-level
```

---

### threat: tooluse firewall bypass

#### vector: robot crafts vault decryption

the robot has the session key in env and knows the vault file path. it could write code to decrypt the vault directly, without `keyrack get`.

**severity**: high
**prerequisite**: malintent — robot must deliberately write decryption code

```
guards
├─ detection: audit logs capture all tool invocations
├─ admin hooks that block `age` cli usage
├─ admin hooks that block file reads of `~/.rhachet/keyrack.session.*`
└─ kernel key retention (future): session key not in env → robot can't read it directly
   └─ robot would need to invoke `keyctl` → hookable, observable
```

#### vector: sanctioned tool exfiltration

a sanctioned tool (e.g., `npm run test:integration`) runs `keyrack get` internally. the tool's output might leak secrets via stdout, stderr, or logs.

**severity**: medium
**prerequisite**: sanctioned tool leaks secrets in output

```
guards
├─ tool hygiene: tools should never log secret values
├─ convention only — no enforcement mechanism
└─ bounded by tool process lifetime (secrets die with the tool)
```

#### vector: tool supply chain

the robot could modify a sanctioned tool's source (e.g., alter `package.json` test command) to exfiltrate secrets.

**severity**: high
**prerequisite**: malintent + write access to repo files

```
guards
├─ git diff audit: review changes before commit
├─ pre-commit hooks: detect suspicious changes
└─ fundamentally a "trusted insider" problem — detection, not prevention
```

#### vector: hook pattern gaps

admin hooks use pattern match. if patterns are too narrow, a caller can invoke `get` through an unmatched path.

**severity**: high
**prerequisite**: hook patterns don't cover all invocation variants

```
guards
├─ hooks must cover all equivalent invocations
│  ├─ `rhx keyrack get`
│  ├─ `rhachet keyrack get`
│  ├─ `npx rhachet keyrack get`
│  └─ `./bin/run keyrack get`
└─ exhaustive pattern coverage is fragile — test all variants
```

---

### threat: cross-terminal reuse

#### vector: clipboard managers

when human copies session key between terminals, clipboard managers may persist it.

**severity**: medium
**prerequisite**: clipboard manager with persistent history

```
guards
├─ awareness: document clipboard manager risks
├─ clipboard managers should exclude sensitive patterns or auto-clear
└─ kernel key retention (future): pass key id, not raw key → no sensitive content in clipboard
```

---

## per-terminal-session vs per-user scope

the session key is architecturally per-terminal but practically per-user (with env vars). is per-terminal-session scope meaningful?

### effective scope by mechanism

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

### what per-terminal-session protects (even with env vars)

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

## TTL enforcement

TTL checks inside `rhx keyrack get` are **convention**, not **enforcement**. an adversary who has both the vault file and the session key can decrypt the vault directly via `age`, which skips any TTL check.

**real TTL enforcement = vault file must not exist + session key must not exist.**

```
ttl.enforcement.strategy
├─ convention (always)
│  └─ vault contains expiresAt, `get` and `unlock --reuse` check it
│
├─ proactive cleanup (always)
│  └─ trap EXIT in unlock → delete vault file on terminal close
│
├─ lazy cleanup (always)
│  └─ every keyrack run scans and deletes expired vaults
│
├─ kernel key retention timeout (when available)
│  └─ `keyctl timeout <key_id> <ttl_seconds>` → kernel auto-revokes
│
└─ secure deletion (best effort)
   └─ `shred -u` vault files on cleanup
```

the combination of proactive + lazy cleanup means:
- best case: vault is deleted when terminal closes (trap EXIT)
- worst case: vault is deleted on next keyrack run (lazy scan)
- with kernel key retention: session key is kernel-revoked after TTL, even if vault file persists

---

## accepted risks

```
accepted
├─ compromised terminal → game over (scoped to session)
├─ elevated privilege (root, ptrace) → can read any process env
├─ memory inspection → keys exist in memory for session duration
├─ determined rogue insider → can write decryption code (detectable)
├─ supply chain compromise → trusted tools could exfiltrate (auditable)
└─ same-user /proc enumeration → session key readable (env var floor)
```

the posture is **defense in depth, not absolute prevention**:
- casual access is blocked by default
- deliberate circumvention requires malintent
- malintent is detectable via audit trail
- blast radius is bounded by session TTL

---

## risk delta vs prior approach

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
   ├─ filesystem read no longer grants access (vault is encrypted)
   ├─ grade never degrades (encrypted keys stay encrypted)
   ├─ blast radius bounded by TTL (not indefinite)
   ├─ /proc/$PID/environ is a new vector (session key in env)
   ├─ shell history is a new vector (--reuse argument)
   └─ child process inheritance weakens "transient" guarantee
```

net assessment: the pattern **reduces** overall risk. the new vectors (proc, history, inheritance) require same-user access that was already sufficient to read `keyrack.direct.json` in the prior approach. the key improvement is that filesystem read alone is no longer sufficient — the adversary needs both the vault file AND the session key.

---

## guard priority

ordered by impact — which guards reduce the most risk for the least cost:

```
guard.priority
├─ 1. lazy vault cleanup on every keyrack run (always, zero cost)
│  └─ eliminates stale vaults — closes the "weeks later" scenario
│
├─ 2. proactive vault cleanup via trap EXIT (always, minimal cost)
│  └─ deletes vault when terminal closes — best effort but common case
│
├─ 3. TTL convention in vault metadata (always, zero cost)
│  └─ stops honest callers from reuse of expired sessions
│
├─ 4. kernel key retention @s for session key (future, moderate cost)
│  ├─ closes /proc enumeration vector
│  ├─ closes cross-login-session vector
│  ├─ enables kernel-enforced TTL via `keyctl timeout`
│  └─ highest-value single step to harden
│
├─ 5. HISTCONTROL=ignorespace guidance (documentation, zero cost)
│  └─ prevents session key from save to shell history
│
├─ 6. admin hook exhaustiveness test (process, moderate cost)
│  └─ ensures all invocation variants of `get` are covered
│
├─ 7. hidepid=2 on /proc mount (system config, moderate cost)
│  └─ prevents cross-process /proc reads entirely
│
└─ 8. secure deletion via shred (best effort, minimal cost)
   └─ limited by filesystem (SSD wear level, journal)
```
