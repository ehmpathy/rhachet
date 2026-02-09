# eval: per-login-session vs per-terminal-session scope

> does per-terminal-session isolation add value over per-login-session + per-worksite?

---

## the question

os.daemon uses per-login-session scope via `/proc/$PID/sessionid`. all terminals within a login session share one daemon.

the alternative: per-terminal-session scope — each terminal chain gets its own isolated daemon (or partition within a daemon). only processes descended from that terminal can access keys unlocked in that terminal.

does per-terminal-session add any real security or usability benefit?

---

## what per-login-session already provides

```
per.login.session.scope
├─ boundary: kernel-managed sessionid (set by setsid at login)
├─ all terminals in one login session share one daemon
├─ different login session (same user) → denied
├─ different user → denied
│
├─ combined with per-worksite isolation
│  ├─ keys tracked per worksite hash (already in os.daemon design)
│  ├─ unlock for repo-api → only repo-api's keys accessible via that worksite hash
│  ├─ unlock for repo-infra → separate key set, separate TTL
│  └─ no cross-worksite leakage regardless of terminal
│
└─ effective isolation
   ├─ attacker in different login session → denied (sessionid mismatch)
   ├─ bonintent user in different terminal → sees only keys for their worksite (cwd-based)
   └─ bonintent user in same terminal → sees only keys for current worksite
```

---

## enforced vs convened boundaries

the two boundaries in os.daemon have fundamentally different enforcement levels:

```
boundary.types
├─ ENFORCED: per-login-session
│  ├─ enforced by: kernel (sessionid) + daemon (SO_PEERCRED + /proc check)
│  ├─ mechanism: /proc/$PID/sessionid — kernel-assigned, inherited, unforgeable
│  ├─ bypass: impossible without a new login session (which gets a new sessionid)
│  ├─ secure against: malintent actors
│  │  ├─ attacker spawns new login session → different sessionid → daemon denies
│  │  ├─ attacker in same login session → allowed (irreducible floor)
│  │  └─ no forgery possible — kernel manages sessionid, not userspace
│  └─ nature: security boundary (real enforcement, real denial)
│
├─ CONVENED: per-worksite
│  ├─ enforced by: rhachet convention (callers who go through rhachet)
│  ├─ mechanism: worksite hash derived from caller's cwd gitroot
│  ├─ bypass: trivial for malintent — call daemon directly with any worksite hash
│  │  ├─ attacker in same login session can connect to daemon socket
│  │  ├─ daemon protocol accepts worksite hash as a parameter
│  │  ├─ attacker sends GET { worksite: hash("/path/to/other/repo") }
│  │  └─ daemon serves keys (no enforcement that caller is IN that worksite)
│  ├─ note: daemon COULD check /proc/$PID/cwd of caller vs requested worksite
│  │  └─ but: attacker can cd to target gitroot before call → still bypassable
│  ├─ secure against: bonintent actors only
│  │  ├─ prevents accidental cross-worksite key access
│  │  ├─ human or robot in wrong directory → rhachet hashes wrong gitroot → different keys
│  │  └─ reduces blast radius of honest mistakes
│  └─ nature: defense-in-depth (convention, not enforcement)
│
└─ why convened per-worksite is still valuable
   ├─ bonintent is the common case — most actors are not adversaries
   ├─ accidental cross-worksite access is a real risk without it
   ├─ makes key access intentional (must be in the right gitroot)
   └─ if attacker has login-session access, user has bigger problems
      ├─ /proc/$PID/environ readable for all same-session processes
      ├─ can cd anywhere the user has access
      ├─ can attach debuggers, read files, etc
      └─ per-worksite convened boundary is irrelevant at this threat level
```

| boundary | type | enforced by | secure against | bypass requires |
|----------|------|-------------|----------------|-----------------|
| per-login-session | enforced | kernel + daemon | malintent actors | new login session (kernel blocks) |
| per-worksite | convened | rhachet convention | bonintent actors only | direct daemon call with different worksite hash |

---

## what per-terminal-session would add

```
per.terminal.session.scope
├─ boundary: process tree rooted at a terminal (PTY/TTY)
├─ each terminal gets its own isolated key partition
├─ terminal A unlocks repo-api → only terminal A's descendants can access
│
├─ theoretical benefits
│  ├─ 1. terminal isolation for same worksite
│  │  ├─ two terminals open in the same repo
│  │  ├─ terminal A unlocks → terminal B cannot access
│  │  └─ is this useful? (evaluated below)
│  │
│  ├─ 2. narrower blast radius on terminal compromise
│  │  ├─ attacker compromises terminal B
│  │  ├─ terminal A's keys are inaccessible
│  │  └─ is this realistic? (evaluated below)
│  │
│  └─ 3. selective unlock per terminal
│     ├─ terminal A: unlocked for dev work
│     ├─ terminal B: unlocked for prod deploy
│     └─ is this useful? (evaluated below)
│
└─ implementation cost (evaluated below)
```

---

## evaluation of theoretical benefits

### benefit 1: terminal isolation for same worksite

two terminals open in the same repo. terminal A unlocks. can terminal B access?

```
terminal.isolation.same.worksite
├─ per-login-session: yes — terminal B can `get --for repo`, daemon serves keys
├─ per-terminal-session: no — terminal B must unlock separately
│
├─ is this useful?
│  ├─ bonintent: no — the human opened two terminals in the same repo
│  │  ├─ they likely want both to have access
│  │  ├─ force separate unlock per terminal = friction with no gain
│  │  └─ per-worksite isolation already prevents cross-repo leakage
│  │
│  └─ malintent: marginal — attacker already in the same login session
│     ├─ attacker can open a terminal in the same repo (cd to gitroot)
│     ├─ per-terminal would block this — but attacker can also just
│     │  inspect /proc of the terminal that IS unlocked
│     └─ per-login-session + sessionid already blocks cross-login attacks
│
└─ verdict: no practical value. creates friction for bonintent, marginal for malintent
```

### benefit 2: narrower blast radius on terminal compromise

attacker compromises terminal B (e.g., rogue npm postinstall). terminal A has unlocked keys.

```
terminal.compromise.blast.radius
├─ per-login-session: attacker in terminal B can connect to daemon
│  ├─ same login session → sessionid matches → daemon serves keys
│  └─ blast radius: all unlocked worksites in the login session
│
├─ per-terminal-session: attacker in terminal B cannot access terminal A's keys
│  ├─ different terminal session → denied
│  └─ blast radius: only keys unlocked in terminal B (none, if not unlocked)
│
├─ is this realistic?
│  ├─ if attacker has code execution in terminal B, they are already in the login session
│  ├─ they can enumerate /proc to find daemon socket
│  ├─ they can read /proc/$DAEMON_PID/... to find daemon details
│  ├─ per-terminal-session would block socket access — this IS a real barrier
│  │
│  ├─ however: the attacker's process inherits the same sessionid
│  │  ├─ /proc/$ATTACKER_PID/sessionid == /proc/$TERMINAL_A_PID/sessionid
│  │  ├─ because both terminals are in the same login session
│  │  └─ per-terminal-session would need a DIFFERENT primitive than sessionid
│  │
│  └─ correction: kernel keyrings DO provide per-terminal-chain isolation
│     ├─ keyctl_join_session_keyring(NULL) creates a new session keyring
│     ├─ children inherit the new keyring via fork
│     ├─ sibling processes (other terminals) retain the OLD keyring
│     ├─ keys in new keyring are inaccessible to non-inheritors
│     ├─ not in /proc/$PID/environ — kernel memory only
│     └─ this IS an unforgeable per-terminal-chain boundary
│
└─ verdict: real benefit, enforceable via kernel keyrings
   └─ but: does the added isolation justify the added friction? (see below)
```

### benefit 3: selective unlock per terminal (dev vs prod)

terminal A unlocked for dev. terminal B unlocked for prod. isolation prevents cross-contamination.

```
selective.unlock.per.terminal
├─ per-login-session: both terminals share one daemon
│  ├─ but keys are per-worksite, not per-terminal
│  ├─ if dev and prod are different repos → already isolated by worksite hash
│  └─ if dev and prod are same repo, different branches → same worksite hash
│
├─ per-terminal-session: each terminal has its own key partition
│  ├─ could unlock different key sets per terminal
│  └─ but this requires the daemon to know which terminal is which
│
├─ is this useful?
│  ├─ dev vs prod should be different repos or different machines
│  │  └─ if same repo, same machine → worksite hash is identical → no isolation
│  ├─ if someone needs prod keys and dev keys in different terminals
│  │  └─ they should use different worktrees (→ different worksite hashes)
│  └─ per-worksite isolation already handles this for the common case
│
└─ verdict: edge case. solved by worktree discipline, not terminal scope
```

---

## kernel primitives: what's available

```
kernel.primitives
├─ /proc/$PID/sessionid
│  ├─ set by setsid() at login time
│  ├─ inherited by all child processes (all terminals in the login)
│  ├─ scope: per-login-session
│  └─ NOT per-terminal
│
├─ kernel key retention service (keyctl) ← THIS IS THE PRIMITIVE
│  ├─ keyctl_join_session_keyring(NULL) creates a NEW session keyring
│  ├─ replaces the current process's session keyring
│  ├─ children created AFTER this inherit the new keyring via fork
│  ├─ sibling processes (other terminals) retain the OLD keyring
│  ├─ keys are in kernel memory — NOT in /proc/$PID/environ
│  ├─ possession-based access: only processes that inherited the keyring can read
│  ├─ keyctl timeout provides kernel-enforced TTL
│  ├─ scope: per-terminal-chain (unforgeable, kernel-managed)
│  └─ ref: keyrings(7), session-keyring(7), keyctl(1)
│
├─ TTY / PTY
│  ├─ identifies which terminal device a process is attached to
│  ├─ processes can detach (setsid, nohup, background)
│  ├─ scope: per-terminal-device (not a security boundary)
│  └─ forgeable: process can open /dev/ptmx and claim any PTY
│
├─ process group (PGID)
│  ├─ scope: per-pipeline, not per-terminal
│  └─ not useful for terminal isolation
│
└─ conclusion
   ├─ sessionid: strongest per-login-session primitive
   ├─ kernel keyrings: strongest per-terminal-chain primitive
   ├─ both are kernel-enforced, unforgeable
   └─ the question is not "can we?" but "should we?"
```

### how kernel keyrings enable per-terminal-chain scope

```
keyring.flow
├─ on unlock
│  ├─ `source rhx keyrack unlock`
│  ├─ keyctl new_session → creates new session keyring for this terminal
│  ├─ keyctl add user "keyrack_token" "$random_secret" @s
│  ├─ keyctl timeout $key_id 28800 (8h TTL, kernel-enforced)
│  └─ all child processes (claude, tools) inherit this keyring
│
├─ on get
│  ├─ tool runs `source rhx keyrack get --for repo`
│  ├─ tool reads token from @s keyring via keyctl
│  ├─ tool presents token to os.daemon via unix socket
│  ├─ daemon verifies token matches an active session → serves keys
│  └─ if no token in @s (different terminal) → denied
│
├─ what other terminals see
│  ├─ terminal B has the OLD session keyring (from login)
│  ├─ token is NOT in terminal B's keyring
│  ├─ terminal B cannot forge a keyring to include the token
│  └─ terminal B must run its own `unlock` to get its own token
│
└─ what this adds over per-login-session
   ├─ attacker in terminal B (same login session) → denied
   ├─ rogue npm postinstall in terminal B → cannot reach daemon with valid token
   └─ blast radius narrowed from "all terminals in login" to "this terminal chain"
```

---

## what per-terminal-session would require (if attempted)

```
per.terminal.implementation
├─ option A: per-terminal daemon instances
│  ├─ each `unlock` spawns a new daemon with a random socket path
│  ├─ socket path stored in env var (e.g., KEYRACK_DAEMON_SOCK)
│  ├─ child processes inherit the env var → can connect
│  ├─ other terminals don't have the env var → can't connect
│  │
│  ├─ problems
│  │  ├─ env var in /proc/$PID/environ → readable by same-user processes
│  │  │  └─ this is exactly the session key problem we eliminated
│  │  ├─ multiple daemons per user = resource overhead
│  │  ├─ cross-terminal reuse requires env var transfer (clipboard, etc)
│  │  │  └─ this is exactly the --reuse problem we eliminated
│  │  └─ defeats the core advantage of os.daemon: no env vars needed
│  │
│  └─ verdict: reintroduces the problems os.daemon was designed to solve
│
├─ option B: daemon-internal terminal track via PTY
│  ├─ daemon records which PTY the unlock came from
│  ├─ on GET: check caller's /proc/$PID/fd/0 → which PTY
│  ├─ only serve keys if caller's PTY matches unlock PTY
│  │
│  ├─ problems
│  │  ├─ PTY is forgeable (process can open any PTY)
│  │  ├─ processes detach from PTY (background jobs, nohup, tmux)
│  │  ├─ claude-code spawns subshells with new PTYs
│  │  └─ not a security boundary — convention only
│  │
│  └─ verdict: unreliable and forgeable
│
├─ option C: env var token (like encrypted vault session key)
│  ├─ unlock generates a random token, stores in env
│  ├─ daemon requires token on GET requests
│  ├─ only processes with the token can access keys
│  │
│  ├─ problems
│  │  ├─ this IS the session key pattern from the encrypted vault
│  │  ├─ token in env → readable via /proc
│  │  ├─ token must be inherited → same /proc leak
│  │  └─ we are back to square one
│  │
│  └─ verdict: exactly the pattern os.daemon was designed to replace
│
└─ option D: kernel keyrings (keyctl) ← THE VIABLE OPTION
   ├─ unlock calls keyctl_join_session_keyring(NULL) → new session keyring
   ├─ adds a token to @s keyring via keyctl add
   ├─ children inherit the new keyring via fork
   ├─ daemon requires valid token from caller's @s keyring on GET
   ├─ sibling processes (other terminals) retain the OLD keyring → denied
   │
   ├─ strengths
   │  ├─ kernel-enforced, unforgeable per-terminal-chain boundary
   │  ├─ not in /proc/$PID/environ — kernel memory only
   │  ├─ possession-based access: only inheritors can read
   │  ├─ keyctl timeout provides kernel-enforced TTL
   │  └─ no env var leak, no clipboard transfer, no forgeable PTY
   │
   ├─ problems
   │  ├─ adds friction for bonintent users
   │  │  ├─ each terminal must unlock separately (no automatic cross-terminal)
   │  │  ├─ human opens two terminals in same repo → must unlock both
   │  │  └─ per-worksite isolation already prevents cross-repo leakage
   │  ├─ marginal security gain over per-login-session + per-worksite
   │  │  ├─ attacker in same login session is already a catastrophic breach
   │  │  ├─ per-login-session blocks the primary threat (cross-session)
   │  │  └─ narrower blast radius per terminal adds defense-in-depth, but
   │  │     the attacker with login-session access has bigger tools
   │  └─ added complexity for os.daemon implementation
   │     ├─ daemon must verify keyring tokens per connection
   │     ├─ unlock flow must call keyctl before daemon handshake
   │     └─ more moving parts = more failure modes
   │
   └─ verdict: viable and enforceable, but friction outweighs the marginal gain
      ├─ per-login-session already blocks the primary threat vector
      ├─ per-worksite already isolates bonintent cross-repo access
      └─ per-terminal-chain adds real isolation at the cost of real friction
```

---

## summary

```
evaluation.summary
├─ per-login-session + per-worksite isolation
│  ├─ kernel-enforced boundary (sessionid — unforgeable)
│  ├─ per-worksite key isolation (hash-based — deterministic)
│  ├─ blocks: cross-login-session attacks, cross-user attacks
│  ├─ allows: same-login-session access (all terminals)
│  └─ the correct scope for os.daemon
│
├─ per-terminal-session
│  ├─ kernel primitive EXISTS: kernel keyrings (keyctl) provide
│  │  unforgeable per-terminal-chain isolation
│  ├─ options A/B/C reintroduce eliminated problems
│  │  ├─ env vars in /proc (session key leak)
│  │  ├─ clipboard transfer (--reuse friction)
│  │  └─ forgeable PTY (convention, not enforcement)
│  ├─ option D (kernel keyrings) is viable and enforceable
│  │  ├─ real per-terminal-chain isolation via keyctl
│  │  ├─ not in /proc — kernel memory only
│  │  └─ possession-based access + kernel-enforced TTL
│  ├─ but: marginal security gain does not justify the friction
│  │  ├─ same-worksite terminal isolation → adds burden on bonintent users
│  │  ├─ terminal compromise blast radius → real but marginal
│  │  │  └─ attacker in same login session already has bigger tools
│  │  └─ selective unlock per terminal → solved by worktree discipline
│  └─ not worth the cost for the current threat model
│
└─ conclusion
   ├─ per-login-session is the strongest practical boundary
   ├─ per-worksite isolation handles the bonintent cross-repo case
   ├─ per-terminal-session IS enforceable (via kernel keyrings)
   │  └─ but adds friction for bonintent actors without meaningful
   │     security gain over per-login-session + per-worksite
   ├─ the question is not "can we?" but "should we?" → no
   └─ os.daemon scope: per-login-session + per-worksite ✅
```
