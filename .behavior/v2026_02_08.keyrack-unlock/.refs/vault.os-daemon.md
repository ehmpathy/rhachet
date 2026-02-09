# os.daemon: in-memory daemon vault

> a keyrack vault type that holds secrets in daemon memory. never on disk. dies on logout. real TTL enforcement.

---

## vault taxonomy

the keyrack supports three vault types. each is a different tradeoff of security, durability, and convenience.

```
keyrack.vaults
├─ os.direct
│  ├─ what: plaintext json on disk (~/.rhachet/keyrack.direct.json)
│  ├─ grade.protection: plaintext
│  ├─ durability: permanent (survives reboot, logout, crash)
│  ├─ access: any process with filesystem read
│  └─ use: low-sensitivity keys where convenience > security
│
├─ os.secure
│  ├─ what: age-encrypted file on disk (~/.rhachet/keyrack.secure.*.age)
│  ├─ grade.protection: encrypted
│  ├─ durability: permanent (survives reboot, logout, crash)
│  ├─ access: requires passphrase or identity key to decrypt
│  └─ use: high-sensitivity keys where security > convenience
│
└─ os.daemon
   ├─ what: in-memory daemon process (~keyrack daemon via unix socket)
   ├─ grade.protection: in-memory (never on disk)
   ├─ durability: session-lived (dies on logout, crash, reboot)
   ├─ access: same-user processes via unix domain socket (SO_PEERCRED)
   └─ use: session-time credential cache after unlock (replaces os.direct cache)
```

os.daemon is the session-time vault. it holds unlocked credentials in memory so that tools can access them without re-auth. it replaces the prior pattern of cache in os.direct (plaintext on disk) with cache in daemon memory (never on disk).

```
source vault (os.secure, 1password, aws sso)
  → unlock → os.daemon (session cache, in memory)
  → get    → tool reads from os.daemon via socket
```

---

## concept

```
os.daemon
├─ what
│  ├─ in-memory daemon process, findserted per user
│  ├─ stores unlocked secrets in memory (never disk)
│  ├─ tracks per-worksite unlock sessions
│  ├─ manages TTL internally (real enforcement, not convention)
│  ├─ callers talk to daemon via unix domain socket
│  └─ dies on logout → instant cleanup, no stale files
│
├─ lifecycle
│  ├─ first `unlock` → findsert daemon (start if absent)
│  ├─ subsequent `unlock` (different worksite) → daemon adds keys
│  ├─ `get --for repo` → tool connects to daemon, daemon returns secrets
│  ├─ TTL expires → daemon purges that worksite's keys from memory
│  └─ logout → daemon dies → all secrets gone
│
└─ what it eliminates vs encrypted-on-disk session vault
   ├─ no vault file on disk → no disk forensics vector
   ├─ no session key in env → no /proc/$PID/environ leak of session key
   ├─ no `--reuse $sessionKey` → daemon IS the session
   ├─ no vault cleanup (proactive, lazy, scheduled) → daemon death = cleanup
   └─ no TTL convention gap → daemon enforces TTL in memory (real, not convention)
```

---

## comparison: os.daemon vs encrypted-on-disk session vault

```
os.daemon.vs.encrypted.session.vault
├─ vault file on disk
│  ├─ encrypted vault: yes (encrypted, but present)
│  ├─ daemon: no file at all → eliminates disk forensics entirely
│  └─ winner: daemon
│
├─ session key in env
│  ├─ encrypted vault: yes (KEYRACK_SESSION_KEY in env, readable via /proc)
│  ├─ daemon: no session key needed → callers talk to socket
│  └─ winner: daemon
│
├─ cross-terminal flow
│  ├─ encrypted vault: human copies session key between terminals
│  ├─ daemon: all terminals for same user can talk to daemon automatically
│  └─ winner: daemon (zero friction cross-terminal)
│
├─ TTL enforcement
│  ├─ encrypted vault: convention (adversary can decrypt file directly via age)
│  ├─ daemon: real enforcement (daemon refuses expired sessions, purges keys from memory)
│  └─ winner: daemon
│
├─ same-user process access
│  ├─ encrypted vault: session key readable via /proc by any same-user process
│  ├─ os.daemon: per-login-session via /proc/$PID/sessionid verification
│  │  └─ same-user process in a different login session → denied
│  └─ winner: os.daemon (per-login-session > per-user)
│
├─ actual secrets in env (after `get`)
│  ├─ encrypted vault: yes (tools expect $AWS_ACCESS_KEY_ID in env)
│  ├─ daemon: yes (same — tools still expect env vars)
│  └─ tie — irreducible floor unchanged
│
├─ crash resilience
│  ├─ encrypted vault: vault survives crashes (on disk, encrypted)
│  ├─ daemon: daemon crash = all sessions lost, must re-unlock
│  └─ winner: encrypted vault
│
├─ implementation complexity
│  ├─ encrypted vault: age encrypt/decrypt, file management, cleanup
│  ├─ daemon: process management, socket protocol, health checks
│  └─ tradeoff — daemon is more complex to implement, simpler to reason about
│
└─ attack surface
   ├─ encrypted vault: two locations (disk file + env var)
   ├─ daemon: one location (daemon memory only)
   └─ winner: daemon (strictly smaller surface)
```

---

## what the daemon eliminates

### 1. session key exfiltration (entire category)

with the encrypted vault, KEYRACK_SESSION_KEY lives in env for hours — readable by any same-user process via /proc. the daemon eliminates this entirely.

```
session.key.exfiltration
├─ encrypted vault
│  ├─ /proc/$PID/environ → KEYRACK_SESSION_KEY readable (high severity)
│  ├─ /proc/$PID/cmdline → --reuse $key visible (high severity)
│  ├─ shell history → --reuse $key persisted (medium severity)
│  └─ child process inheritance → key inherited by long-lived children (medium severity)
│
└─ daemon
   ├─ no session key in env → /proc/$PID/environ has no session key
   ├─ no --reuse argument → /proc/$PID/cmdline has no session key
   ├─ no session key to copy → shell history has no session key
   ├─ no session key to inherit → children have no session key
   └─ entire category eliminated
```

### 2. vault persistence (entire category)

with the encrypted vault, the file persists on disk until cleanup. the daemon holds secrets in memory only.

```
vault.persistence
├─ encrypted vault
│  ├─ vault outlives session → stale file recoverable (medium severity)
│  ├─ disk forensics → deleted file recoverable from journal/SSD (low severity)
│  ├─ swap/hibernation → vault data in swap (low severity)
│  └─ requires: proactive cleanup, lazy cleanup, scheduled cleanup, secure deletion
│
└─ daemon
   ├─ no file on disk → no stale files, no forensics, no journal recovery
   ├─ daemon death = instant cleanup → no cleanup mechanisms needed
   └─ entire category eliminated (swap/hibernation still applies to daemon memory)
```

### 3. cross-terminal clipboard risk

with the encrypted vault, human copies session key via clipboard. the daemon eliminates this.

```
clipboard.risk
├─ encrypted vault: human copies session key → clipboard managers may persist it
└─ daemon: no session key to copy → no clipboard risk
```

---

## what os.daemon does NOT eliminate

### same-login-session socket access

any process in the same login session can connect to the daemon and request secrets. per-login-session scope raises the bar (attacker must be in the same login session, not just the same user), but does not eliminate same-session access.

```
same.session.access
├─ encrypted vault: any same-user process reads /proc/$PID/environ → session key → decrypt vault
├─ os.daemon: same-login-session process connects to socket → daemon verifies sessionid → returns secrets
├─ os.daemon improvement: different login session → denied (even if same user)
└─ residual: same-login-session processes can still access secrets
```

### actual secrets in env vars

after `source rhx keyrack get --for repo`, the actual secrets ($AWS_ACCESS_KEY_ID, etc) are in env vars. this is true regardless of whether the source is a vault file or a daemon.

```
actual.secrets.in.env
├─ encrypted vault: tool runs `get` → decrypts vault file → exports to env
├─ os.daemon: tool runs `get` → talks to daemon → exports to env
└─ both: actual secrets in tool's env, readable via /proc while tool runs
```

the irreducible floor is unchanged. os.daemon only shortens the path from unlock to secrets.

---

## daemon architecture

### process management

```
daemon.process
├─ start: findserted on first `unlock`
│  ├─ check if socket exists at /run/user/$UID/keyrack.sock
│  ├─ if socket exists and daemon responds → findsert (reuse)
│  ├─ if socket absent or daemon unresponsive → start new daemon
│  └─ daemon forks to background, writes PID file
│
├─ run: listens on unix domain socket
│  ├─ accepts connections from same-UID callers (verified via SO_PEERCRED)
│  ├─ handles: unlock (add worksite keys), get (return keys), status (health check)
│  └─ manages TTL timers per worksite
│
└─ stop: dies on logout or explicit stop
   ├─ systemd user session: daemon registered as user service, dies with session
   ├─ or: daemon monitors parent session, self-terminates on session end
   └─ or: explicit `rhx keyrack relock` command kills daemon
```

### socket protocol

```
daemon.protocol
├─ transport: unix domain socket at /run/user/$UID/keyrack.sock
│  └─ /run/user/$UID/ is tmpfs → dies on reboot, per-user, proper permissions
│
├─ auth: SO_PEERCRED + /proc/$PID/sessionid
│  ├─ kernel provides caller UID, PID, GID on each connection
│  ├─ daemon verifies caller UID matches daemon UID
│  └─ daemon verifies caller's login session via /proc/$PID/sessionid
│
├─ commands
│  ├─ UNLOCK { worksite, keys[] } → store keys for worksite, start TTL timer
│  ├─ GET { worksite } → return keys for worksite (if TTL valid)
│  ├─ GET { worksite, key: slug } → return one key
│  ├─ STATUS → return list of unlocked worksites and TTL left
│  └─ RELOCK { worksite? } → purge keys for worksite (or all)
│
└─ format: json over unix socket (simple, debuggable)
```

### in-memory data model

```
daemon.memory
├─ worksites: Map<worksiteHash, WorksiteSession>
│
│  worksiteHash = hash(gitroot)
│
│  WorksiteSession
│  ├─ gitroot: string
│  ├─ unlockedAt: timestamp
│  ├─ expiresAt: timestamp
│  └─ keys: Map<slug, KeyrackKey>
│
├─ example: two worksites, same key slug, different instances
│  ├─ hash("/home/vlad/git/ehmpathy/api")
│  │  ├─ expiresAt: 2026-02-08T18:00:00Z
│  │  └─ keys
│  │     ├─ EHMPATHY_PREP_AWS_SSO: { secret: "AKIA...", grade: {...} }
│  │     └─ GITHUB_APP_TOKEN: { secret: "ghs_abc...", grade: {...} }
│  │
│  └─ hash("/home/vlad/git/ehmpathy/infra")
│     ├─ expiresAt: 2026-02-08T20:00:00Z
│     └─ keys
│        ├─ EHMPATHY_PREP_AWS_SSO: { secret: "AKIA...", grade: {...} }
│        └─ TERRAFORM_TOKEN: { secret: "tf_xyz...", grade: {...} }
│
├─ isolation: each worksite has its own key instances
│  ├─ same slug (EHMPATHY_PREP_AWS_SSO) → two separate grants
│  ├─ different TTLs per worksite (unlocked at different times)
│  ├─ purge one worksite → other worksite's keys unaffected
│  └─ no cross-worksite leakage, even for shared key slugs
│
└─ lookup: `get --for repo` → hash(caller's gitroot) → worksite session → keys
```

### TTL management

```
daemon.ttl
├─ each worksite has its own TTL timer
│  ├─ set at unlock time (default 8h, configurable via --ttl)
│  └─ daemon tracks expiresAt per worksite
│
├─ on GET: daemon checks expiresAt
│  ├─ if valid → return keys
│  └─ if expired → purge keys from memory, return error "session expired"
│
├─ background: daemon periodically purges expired worksites
│  └─ no external cleanup needed — daemon manages its own memory
│
└─ enforcement is real, not convention
   ├─ adversary cannot bypass TTL — daemon is the only holder of secrets
   ├─ no file to decrypt directly
   └─ daemon refuses expired sessions, deletes keys from memory
```

### caller authentication: per-login-session scope

```
daemon.auth.per.login.session
├─ scope: per-login-session (not per-user)
│  ├─ on UNLOCK: daemon records /proc/$PID/sessionid of the caller
│  ├─ on GET: daemon reads /proc/$PID/sessionid of the caller
│  ├─ daemon only serves keys to processes in the same login session
│  └─ equivalent to kernel key retention @s boundary
│
├─ why per-login-session, not per-user
│  ├─ per-user: any same-user process can access all unlocked keys
│  ├─ per-login-session: only processes in the unlock terminal's session tree
│  ├─ attacker who spawns a new login session → different sessionid → denied
│  └─ raises the bar above env var /proc readability floor
│
├─ mechanism: /proc/$PID/sessionid
│  ├─ kernel assigns a sessionid per login session (via setsid)
│  ├─ all child processes inherit the parent's sessionid
│  ├─ daemon reads it via SO_PEERCRED (PID) → /proc/$PID/sessionid
│  └─ unforgeable — kernel-managed, not user-settable
│
└─ socket path scoped per session (defense in depth)
   ├─ /run/user/$UID/keyrack.$SESSION_ID.sock
   ├─ only processes that know the socket path can connect
   └─ same-user processes can ls /run/user/$UID/ (minor barrier, but adds friction)
```

---

## flows with daemon

### flow.inherited (primary)

```
human
├─ source rhx keyrack unlock
│  ├─ interactive auth (sso, passphrase, etc)
│  ├─ findsert daemon (start if absent)
│  ├─ send UNLOCK { worksite, keys[] } to daemon
│  └─ daemon stores keys in memory, starts TTL timer
│  (no env var exported — daemon IS the session)
├─ claude
│  └─ robot inherits no special env var
│     └─ robot has zero access to secrets (no keycard, no env var)
└─ robot's tools access keys (gated by admin hooks)
   └─ tools internally invoke: source rhx keyrack get --for repo
      ├─ `get` connects to daemon via unix socket
      ├─ daemon verifies caller UID via SO_PEERCRED
      ├─ daemon returns keys for this worksite
      ├─ `get` exports actual secrets to tool's env
      └─ secrets die when tool's process ends
```

### flow.crossTerminal (zero friction)

```
terminal.a
├─ source rhx keyrack unlock
│  └─ daemon started, worksite unlocked

terminal.b
├─ source rhx keyrack get --for repo
│  ├─ connects to daemon (same user, same socket)
│  ├─ daemon returns keys
│  └─ done — no session key to copy, no --reuse, no clipboard
```

### flow.robotWithoutCreds (mid-session unlock works)

```
robot (no special env)
├─ tool runs: source rhx keyrack get --for repo
│  ├─ connects to daemon via socket
│  ├─ daemon has keys for this worksite? → no
│  └─ error: "locked, ask human to unlock"
│
human (any terminal)
├─ source rhx keyrack unlock
│  └─ daemon now has keys for this worksite
│
robot (same session, no restart needed)
├─ tool retries: source rhx keyrack get --for repo
│  ├─ connects to daemon via socket
│  ├─ daemon has keys now → return keys
│  └─ tool proceeds with secrets in env
```

**note**: with the daemon, mid-session unlock WORKS. the robot doesn't need restart. the human unlocks from any terminal, and the robot's next `get` call succeeds. this eliminates the "restart required" constraint of the encrypted vault approach.

---

## grade analysis

```
grade.comparison
├─ encrypted session vault
│  ├─ secrets on disk: encrypted (grade.protection preserved)
│  ├─ session key in env: plaintext in memory (grade.protection = plaintext)
│  ├─ secrets exist in two places: disk (encrypted) + env (plaintext)
│  └─ attack surface: two locations
│
├─ os.daemon
│  ├─ secrets on disk: absent (never written)
│  ├─ secrets in daemon memory: plaintext (same as any process memory)
│  ├─ secrets exist in one place: daemon memory only
│  └─ attack surface: one location
│
└─ which is "better"?
   ├─ encrypted vault: encrypted on disk + plaintext in env = two surfaces
   ├─ os.daemon: plaintext in memory only = one surface
   └─ os.daemon has strictly smaller attack surface
```

---

## tradeoffs

```
tradeoffs
├─ os.daemon wins
│  ├─ no session key in env (eliminates /proc leak of session key)
│  ├─ no vault file on disk (eliminates disk forensics, stale files)
│  ├─ real TTL enforcement (not convention)
│  ├─ per-login-session scope (not per-user — raises the bar above env var floor)
│  ├─ zero-friction cross-terminal (no --reuse, no clipboard)
│  ├─ mid-session unlock works (robot doesn't need restart)
│  ├─ strictly smaller attack surface (one location vs two)
│  └─ simpler mental model (daemon has the keys, ask the daemon)
│
├─ encrypted vault wins
│  ├─ crash resilience (vault survives daemon crash)
│  ├─ no daemon to manage (simpler operations)
│  ├─ no socket protocol to implement (simpler implementation)
│  └─ no process to monitor (no health checks needed)
│
└─ tie
   ├─ actual secrets in env after `get` (tool compat requirement)
   └─ elevated privilege attacks (root can read daemon memory too)
```

---

## implementation considerations

### how does the daemon die on logout?

```
daemon.lifecycle.options
├─ systemd user service
│  ├─ `systemctl --user start keyrack-daemon`
│  ├─ systemd manages lifecycle, restarts, logs
│  ├─ dies when user's systemd session ends (logout)
│  └─ most robust, but requires systemd (standard on modern linux)
│
├─ session-scoped background process
│  ├─ daemon started as background process from unlock
│  ├─ monitors /proc/self/sessionid or parent PID
│  ├─ self-terminates when login session ends
│  └─ portable, but less robust than systemd
│
└─ socket in /run/user/$UID/ (tmpfs)
   ├─ /run/user/$UID/ is created by pam_systemd on login
   ├─ cleaned up on logout (tmpfs unmounted)
   ├─ even if daemon somehow survives, socket is gone → daemon is unreachable
   └─ natural cleanup via OS lifecycle
```

### what about macOS?

```
daemon.macos
├─ no /run/user/$UID/ → use $TMPDIR or launchd socket
├─ no SO_PEERCRED → use LOCAL_PEERCRED (macOS equivalent)
├─ no systemd → use launchd user agent
├─ macOS keychain could serve a similar role natively
└─ cross-platform abstraction needed if daemon approach is chosen
```

### what about the keyrack.yml manifest?

os.daemon doesn't change the manifest. `keyrack.yml` still declares which keys exist, their source vaults (os.secure, 1password, etc), and their grant mechanisms. os.daemon is the session-time cache vault — it replaces the prior os.direct cache pattern, not the manifest.

```
keyrack.yml → declares keys, source vaults, and mechanisms (unchanged)
unlock → grants keys from source vaults → stores in os.daemon (was: cache in os.direct)
get → retrieves from os.daemon (was: read from os.direct cache)
```

---

## recommendation

os.daemon is the preferred session-time vault type. it is strictly better on security axes and eliminates the two weakest parts of an encrypted-on-disk session vault (session key in env, vault file on disk). the tradeoffs (crash resilience, implementation complexity) are manageable.

os.daemon also unlocks a major UX win: **mid-session unlock works**. the "restart required" constraint of the encrypted vault approach disappears — human unlocks from any terminal, robot's next `get` call succeeds.

```
recommendation
├─ os.daemon as the session-time vault type
│  ├─ strictly smaller attack surface (one location vs two)
│  ├─ real TTL enforcement (not convention)
│  ├─ zero-friction cross-terminal (no session key to copy)
│  ├─ mid-session unlock (no robot restart needed)
│  ├─ grade.protection never degrades (secrets never on disk)
│  └─ completes the vault taxonomy: os.direct, os.secure, os.daemon
│
├─ vault taxonomy after adoption
│  ├─ os.direct  → plaintext on disk (low-sensitivity, permanent)
│  ├─ os.secure  → encrypted on disk (high-sensitivity, permanent)
│  └─ os.daemon  → in-memory daemon (session cache, dies on logout)
│
└─ if implementation cost is too high (for now)
   └─ encrypted session vault is a solid interim approach
      ├─ still a major improvement over os.direct plaintext cache
      ├─ can be upgraded to os.daemon later without manifest changes
      └─ kernel key retention @s is a lighter-weight interim step
```
