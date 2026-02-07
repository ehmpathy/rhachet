# wish extension: transient session keys & unlock/get separation

> session keys must stay transient. unlock and get are separate commands. robots get the keycard, not the keys.

---

## context

in design review of the keyrack unlock vision, we discovered a fundamental tension:

**claude-code spawns a new shell process per bash call.** env vars set in one call don't carry to the next. the only way for a robot to "remember" a session key across calls is to persist it -- which escalates the session key from `transient` to `ephemeral`.

this led to a critical design decision: **lean hard into the inherited flow** and split `unlock` from `get`.

---

## the insight: env var persistence across sessions

### the problem

robots (claude-code) can't persist env vars across bash calls without a write somewhere:

| persistence method | session key grade | accessible to |
|-------------------|-------------------|---------------|
| env var (inherited) | transient | current process tree only |
| `/run/user/$UID/` (tmpfs) | ephemeral | all same-user processes |
| file on disk | permanent | anyone with read access |
| robot context window | transient | fragile (compaction risk) |

### the decision

**transient is required.** we refuse to escalate session keys to ephemeral.

this means:
- **inherited flow is the only path** -- human unlocks, then launches robot from that terminal
- **imported flow (mid-session)** requires restart -- robot must be relaunched from an unlocked terminal
- **no tmpfs, no daemon, no disk persistence** for session keys

---

## the design: separate `unlock` from `get`

### alias: `rhx unlock`

`rhx unlock` is a shorthand alias for `rhachet keyrack unlock --for repo`. the keyrack is the only lockable resource in rhachet, and `--for repo` is the default scope. the alias removes friction from the most common operation.

| shorthand | expands to |
|-----------|-----------|
| `rhx unlock` | `rhachet keyrack unlock --for repo` |
| `rhx unlock --reuse $key` | `rhachet keyrack unlock --for repo --reuse $key` |

### two commands, uniform access

| command | purpose | exposes |
|---------|---------|---------|
| `source rhx unlock` | interactive auth, create new session vault | `KEYRACK_SESSION_KEY` only |
| `source rhx unlock --reuse $sessionKey` | resume prior session (validate + forward) | `KEYRACK_SESSION_KEY` only |
| `source rhx keyrack get --for repo` | decrypt session vault, export secrets | actual key secrets |
| `source rhx keyrack get --key $slug` | decrypt one key from session vault | one key secret |

**no `get --unlock` shortcut.** humans and robots follow the same access model: unlock is separate from get. if a human needs raw keys in their shell, they run `get` explicitly -- same as a robot would (if their admin allows it).

> no "rules for thee but not for me." same model, same friction, same audit trail.

### session resume via `--reuse $sessionKey`

`unlock` accepts `--reuse $sessionKey`. when provided, `--reuse` does three things:

1. validates the session vault exists for this worksite
2. validates the session vault is decryptable with the provided key (proves key is correct)
3. validates the session hasn't expired (TTL check)

then exports `KEYRACK_SESSION_KEY` to env. no interactive auth, no vault creation, no key retrieval. just "is this session still valid?" -> yes -> forward the key.

this enables cross-terminal reuse without re-authentication:

```sh
# terminal A: human unlocks (interactive auth)
source rhx unlock
# outputs: KEYRACK_SESSION_KEY=age1abc123...

# terminal B: human resumes session (no auth, just validate + forward)
source rhx unlock --reuse age1abc123...
```

the session key stays transient -- it's passed as a named argument and lives in env. the human copies it between terminals manually (no disk persistence).

### the launch pattern

```sh
# new session: unlock (interactive auth), then spawn robot
source rhx unlock && claude

# resume session: reuse prior session key, then spawn robot
source rhx unlock --reuse $KEYRACK_SESSION_KEY && claude
```

after unlock, claude inherits `KEYRACK_SESSION_KEY` -- transient, in process env. but claude has **zero access to actual secrets** until a sanctioned tool invokes `get`.

### why this separation matters

1. **uniform access model** -- humans and robots follow the same rules. nobody runs `get` directly unless they explicitly need to and their admin allows it. tools access keys on behalf of both.

2. **tooluse firewall** -- configure admin hooks to block or gate `rhx keyrack get` for any caller (human or robot). the keycard (session key) doesn't grant automatic access to keys.

3. **audit trail** -- every `get` is an explicit, observable action. you see exactly when and which keys any caller accessed.

4. **selective access** -- per-key access control via admin allowlists. `get --key GITHUB_TOKEN` could be allowed while `get --key AWS_PROD_CREDS` is blocked.

5. **grade stays transient** -- session key inherited via env, never persisted. actual secrets only exist in env for the duration of the bash call that runs `get`.

### access model: tools access keys, not callers

the unlock/get separation enables a critical access pattern: **callers (human or robot) are denied direct bash access to `keyrack get` by default, but their tools can access keys on their behalf.**

how it works:
- caller inherits `KEYRACK_SESSION_KEY` via env (transient, inherited)
- caller is **denied** `rhx keyrack get` by default via admin permission hooks
- caller's **tools** (e.g., integration test runners, deploy commands) invoke `keyrack get` internally as part of their execution
- the tools are pre-approved via the permission allowlist -- the caller can run `npm run test:integration` which internally sources keyrack keys, but can't run `rhx keyrack get` directly
- if a caller truly needs raw keys, they can run `get` explicitly -- but only if their admin allows it

this means:
- callers access keys **indirectly** through sanctioned tool invocations
- callers cannot `cat`, `echo`, or exfiltrate the raw secret values via bash (by default)
- if a caller attempts to circumvent this (e.g., writes a shell command to decrypt the session vault manually), that requires **malintent** and is trivially detectable in audit logs
- the distinction: accidental key exposure is prevented by design; deliberate circumvention requires explicit hostile action

| access path | allowed | why |
|-------------|---------|-----|
| `npm run test:integration` (internally uses keyrack get) | yes | sanctioned tool, pre-approved |
| `rhx keyrack get --for repo` (direct) | admin-gated | allowed only if admin permits |
| `cat ~/.rhachet/keyrack.session.*.age` (raw read) | no | encrypted, unreadable without decryption code |
| custom shell to decrypt vault | no | requires malintent, detectable |

the security posture is not absolute -- a determined rogue caller could write code to decrypt the vault. but this is **defense in depth**: casual access is blocked, deliberate circumvention is detectable, and the blast radius is bounded by the session TTL.

---

## flows

### flow.inherited (primary, recommended)

human unlocks first, launches robot from that terminal.

```
human
├─ source rhx unlock
│  ├─ interactive auth (sso, passphrase, etc)
│  ├─ create encrypted session vault on disk
│  └─ export KEYRACK_SESSION_KEY to current shell
├─ claude
│  └─ robot inherits KEYRACK_SESSION_KEY via env
│     └─ robot has zero access to secrets (only the keycard)
└─ robot's tools access keys (gated by admin hooks)
   └─ tools internally invoke: source rhx keyrack get --for repo
      ├─ decrypt session vault with inherited session key
      ├─ export actual secrets to that tool's process env
      ├─ secrets die when that tool's process ends
      ├─ robot cannot run `get` directly (blocked by admin hooks)
      └─ robot can run `get` directly only if admin explicitly allows it
```

session key grade: transient (env only, dies with terminal)

### flow.crossTerminal

human unlocks, opens new terminal, reuses session key.

```
terminal.a
├─ source rhx unlock
│  └─ export KEYRACK_SESSION_KEY to terminal A

terminal.b
├─ source rhx unlock --reuse $SESSION_KEY
│  ├─ validate session vault exists for this worksite
│  ├─ validate session vault is decryptable with provided key
│  ├─ validate session hasn't expired (TTL check)
│  ├─ export KEYRACK_SESSION_KEY to terminal B
│  └─ no interactive auth, no vault creation, no key retrieval
├─ claude
│  └─ robot inherits session key, same as flow.inherited
```

session key grade: transient (passed as argument, lives in env)

### flow.robotWithoutCreds (restart required)

robot was started without credentials. requires restart.

```
robot (no creds)
├─ source rhx keyrack get --for repo
│  ├─ no KEYRACK_SESSION_KEY in env
│  └─ error: "locked. ask human to unlock, then relaunch from unlocked terminal"

human (separate terminal)
├─ source rhx unlock

human (relaunch)
├─ claude
│  └─ robot inherits KEYRACK_SESSION_KEY
```

note: mid-session import is not supported because it would require the robot to persist the session key (grade escalation from transient to ephemeral). the pit of success is: unlock first, then launch.

### flow.import.rejected: why restart, not import

the alternative (mid-session import) would require one of:

```
import.alternatives
├─ tmpfs (/run/user/$UID/)
│  └─ escalates to ephemeral, accessible to all same-user processes
├─ disk
│  └─ escalates to permanent
└─ robot context window
   └─ transient but fragile (compaction risk)
```

none of these preserve transient grade reliably. restart is the honest answer.

---

## implications for vision

### update: inherited flow is primary

the vision's "imported flow" (robot imports session key mid-session) should be downgraded. mid-session import requires grade escalation from transient to ephemeral. the pit of success is: unlock first, then launch.

### update: unlock is a separate command, no `get --unlock`

the vision combines unlock and get into one command (`rhx keyrack get --for repo --unlock`). this extension splits them entirely:

- `rhx unlock` (alias for `rhx keyrack unlock --for repo`) -- creates session vault, exports session key only
- `rhx keyrack get --for repo` -- decrypts session vault, exports actual secrets

no `get --unlock` shortcut. humans and robots follow the same access model. this separation enables the tooluse firewall: callers hold the keycard (session key) but access keys only through sanctioned tools, unless their admin explicitly allows direct `get`.

### update: robot-without-creds requires restart

if a robot was started without `KEYRACK_SESSION_KEY` in its env, the honest answer is: relaunch the robot from an unlocked terminal. there is no way to inject a transient session key into a robot mid-session without grade escalation.
