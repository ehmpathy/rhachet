# ref: peer terminal authorization

## .what

deep dive on how a human can authorize a peer terminal (e.g., a robot/agent) to access credentials from an unlock session, and the technical considerations for keyctl persistence in agent tool calls.

---

## .the problem

### scenario: robot needs credentials

```
terminal A (human):
  └── rhx keyrack unlock --env prod
        └── credentials unlocked, inheritanceKey in @s

terminal B (robot, e.g., Claude Code):
  └── spawned separately (different session)
  └── needs access to credentials from terminal A's unlock
  └── has its own @s, no inheritanceKey
```

the robot cannot access credentials because:
1. it has a different session key store (@s)
2. it has no valid inheritanceKey
3. daemon rejects requests without valid inheritanceKey

### the question

how does a human authorize a peer terminal to share their unlock session?

---

## .option 1: OTP-based authorization

### flow

```
┌─────────────────────────────────────────────────────────────────┐
│ ROBOT REQUESTS ACCESS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  robot terminal:                                                 │
│    $ rhx keyrack unlock --env prod                               │
│                                                                  │
│    ⚠️  no active session found for this terminal                 │
│                                                                  │
│    to request access from a human:                               │
│    1. robot generates inheritanceKey, stores in @s               │
│    2. robot generates inheritanceOtp (short, human-readable)     │
│    3. robot registers (otp → inheritanceKey) with daemon         │
│    4. robot displays:                                            │
│                                                                  │
│       ask a human to run:                                        │
│       $ rhx keyrack authorize abc-123-xyz                        │
│                                                                  │
│    5. robot waits for authorization...                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HUMAN AUTHORIZES                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  human terminal (with active unlock):                            │
│    $ rhx keyrack authorize abc-123-xyz                           │
│                                                                  │
│    1. human's cli reads own inheritanceKey from @s               │
│    2. cli sends to daemon:                                       │
│       { otp: "abc-123-xyz", grantorKey: humanInheritanceKey }    │
│    3. daemon looks up robot's inheritanceKey via otp             │
│    4. daemon links robot's key to human's credential set         │
│    5. daemon returns success                                     │
│                                                                  │
│    ✓ authorized terminal abc-123-xyz                             │
│      granted access to: 5 credentials (env=prod)                 │
│      expires: 2024-01-15 18:00:00                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ROBOT RECEIVES ACCESS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  robot terminal (was blocked, now unblocked):                    │
│                                                                  │
│    ✓ authorization received                                      │
│    ✓ unlocked: 5 credentials (env=prod)                          │
│    ✓ expires: 2024-01-15 18:00:00                                │
│                                                                  │
│  robot can now:                                                  │
│    $ rhx keyrack get --key AWS_PROFILE --env prod                │
│    → returns credential ✓                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### daemon state

```typescript
interface DaemonState {
  // active unlock sessions
  sessions: Map<InheritanceKey, SessionCredentials>;

  // OTPs that await authorization
  otpRegistry: Map<Otp, {
    robotInheritanceKey: InheritanceKey;
    requestedAt: IsoTimeStamp;
    expiresAt: IsoTimeStamp;  // OTP expires after 5 min
  }>;

  // authorized peer links
  peerLinks: Map<InheritanceKey, {
    grantorKey: InheritanceKey;  // human's key
    grantedAt: IsoTimeStamp;
    scope: CredentialScope;      // what credentials are shared
  }>;
}
```

### security properties

| property | mechanism |
|----------|-----------|
| OTP is short-lived | expires after 5 min if not authorized |
| OTP is single-use | deleted after authorization |
| robot must prove session ownership | inheritanceKey stored in robot's @s |
| human must prove session ownership | inheritanceKey stored in human's @s |
| credentials are not copied | robot's key links to human's session |

---

## .the keyctl persistence question

### the concern

when Claude Code (or similar agent) runs Bash tool calls:

```
tool call 1: keyctl add user ehmpathy.keyrack.ik "$KEY" @s
tool call 2: keyctl search @s user ehmpathy.keyrack.ik
```

**question**: do these share the same session key store (@s)?

### how session key stores work

```
session key store lifecycle:
  - created at login (or explicit `keyctl session`)
  - inherited by all child processes
  - destroyed at logout
```

### Claude Code execution model

```
scenario A: persistent shell
┌─────────────────────────────────────────────────────────────────┐
│  claude code process (session @s = 12345)                        │
│    │                                                             │
│    ├── tool call 1: bash -c 'keyctl add ...'                     │
│    │     └── inherits @s = 12345 ✓                               │
│    │                                                             │
│    ├── tool call 2: bash -c 'keyctl search ...'                  │
│    │     └── inherits @s = 12345 ✓                               │
│    │                                                             │
│    └── key persists across calls ✓                               │
└─────────────────────────────────────────────────────────────────┘

scenario B: isolated execution (container, sandbox)
┌─────────────────────────────────────────────────────────────────┐
│  tool call 1: (new session @s = 11111)                           │
│    └── keyctl add ... → stored in @s = 11111                     │
│    └── process exits, @s = 11111 destroyed                       │
│                                                                  │
│  tool call 2: (new session @s = 22222)                           │
│    └── keyctl search ... → key not found ✗                       │
└─────────────────────────────────────────────────────────────────┘
```

### empirical test

```bash
# test if claude code tool calls share @s
# tool call 1:
keyctl add user test.key "hello" @s && keyctl show @s

# tool call 2:
keyctl search @s user test.key && keyctl pipe $(keyctl search @s user test.key)
```

if tool call 2 returns "hello", they share @s. if "key not found", they don't.

---

## .option 2: pre-wrapped with inheritanceKey (simpler)

### the insight

instead of dynamic keyctl manipulation:

1. **wrap the agent** so it spawns with a pre-set inheritanceKey in @s
2. **at authorize time**, human just registers that key with the daemon

this sidesteps the keyctl persistence question entirely.

### wrapper command

```bash
#!/bin/bash
# wrap-with-keyrack-session
#
# spawns a command with a dedicated keyrack inheritanceKey

# create isolated session with new key store
exec keyctl session "keyrack-robot-$$" bash -c '
  # generate inheritanceKey for this session
  INHERITANCE_KEY=$(openssl rand -hex 32)

  # store in this sessions @s
  keyctl add user ehmpathy.keyrack.ik "$INHERITANCE_KEY" @s

  # export OTP for human to authorize
  INHERITANCE_OTP=$(echo "$INHERITANCE_KEY" | sha256sum | head -c 12)

  # register with daemon (otp → key mapping)
  echo "{\"cmd\":\"REGISTER_OTP\",\"otp\":\"$INHERITANCE_OTP\",\"key\":\"$INHERITANCE_KEY\"}" \
    | nc -U ~/.rhachet/keyrack/keyrack.sock

  echo "🤖 robot session ready"
  echo "   otp: $INHERITANCE_OTP"
  echo "   ask human to run: rhx keyrack authorize $INHERITANCE_OTP"
  echo ""

  # now run the actual command (e.g., claude)
  exec "$@"
' -- "$@"
```

### usage

```bash
# human spawns robot with wrapper
$ wrap-with-keyrack-session claude

🤖 robot session ready
   otp: a1b2c3d4e5f6
   ask human to run: rhx keyrack authorize a1b2c3d4e5f6

# claude starts...
# all claude tool calls now share the same @s with inheritanceKey

# human authorizes in their terminal
$ rhx keyrack authorize a1b2c3d4e5f6

✓ authorized robot session a1b2c3d4e5f6
  granted access to: 5 credentials (env=prod)

# claude can now get credentials
$ rhx keyrack get --key AWS_PROFILE --env prod
→ works ✓
```

### flow diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ SPAWN TIME                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  human runs:                                                     │
│    $ wrap-with-keyrack-session claude                            │
│                                                                  │
│  wrapper:                                                        │
│    1. keyctl session "keyrack-robot-$$"  → new isolated @s       │
│    2. generate inheritanceKey                                    │
│    3. keyctl add ... @s                  → store in @s           │
│    4. compute otp from key                                       │
│    5. register (otp → key) with daemon                           │
│    6. print otp for human                                        │
│    7. exec claude                        → claude inherits @s    │
│                                                                  │
│  all claude tool calls now share this @s ✓                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AUTHORIZE TIME                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  human runs (in their own terminal with active unlock):          │
│    $ rhx keyrack authorize a1b2c3d4e5f6                          │
│                                                                  │
│  daemon:                                                         │
│    1. lookup otp → robot's inheritanceKey                        │
│    2. lookup human's inheritanceKey → credential set             │
│    3. link robot's key to human's credentials                    │
│    4. delete otp (single-use)                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ACCESS TIME                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  claude tool call:                                               │
│    $ rhx keyrack get --key AWS_PROFILE --env prod                │
│                                                                  │
│  keyrack cli:                                                    │
│    1. read inheritanceKey from @s (set by wrapper)               │
│    2. send GET { slug, inheritanceKey } to daemon                │
│                                                                  │
│  daemon:                                                         │
│    1. lookup inheritanceKey → linked to human's session          │
│    2. return credential ✓                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## .comparison

| aspect | option 1: dynamic OTP | option 2: pre-wrapped |
|--------|----------------------|----------------------|
| keyctl persistence | requires shared @s across tool calls | guaranteed by wrapper |
| setup complexity | lower (no wrapper) | higher (wrapper executable) |
| reliability | depends on execution model | always works |
| human UX | robot prompts for authorize | wrapper prints otp at spawn |
| robot UX | robot waits for authorization | robot ready immediately (blocked until authorized) |

### recommendation

**option 2 (pre-wrapped)** is more robust:
- guarantees @s persistence regardless of agent execution model
- makes the inheritanceKey available from first tool call
- clear spawn-time contract: "this robot has otp X, authorize if you trust it"

---

## .daemon commands

### REGISTER_OTP

```typescript
// robot registers its otp → inheritanceKey mapping
interface RegisterOtpCommand {
  cmd: 'REGISTER_OTP';
  otp: string;              // short, human-readable (12 chars)
  inheritanceKey: string;   // robot's full 256-bit key
}

// daemon response
interface RegisterOtpResponse {
  registered: true;
  expiresAt: IsoTimeStamp;  // OTP expires in 5 min
}
```

### AUTHORIZE

```typescript
// human authorizes a robot's otp
interface AuthorizeCommand {
  cmd: 'AUTHORIZE';
  otp: string;                    // robot's otp
  grantorInheritanceKey: string;  // human's inheritanceKey
  scope?: {
    env?: string;                 // limit to specific env
    keys?: string[];              // limit to specific keys
  };
}

// daemon response
interface AuthorizeResponse {
  authorized: true;
  robotKey: string;               // (truncated for display)
  credentialsGranted: number;
  expiresAt: IsoTimeStamp;
}
```

### GET (with peer link resolution)

```typescript
// daemon handles GET by check of peer links
const handleGet = (input: GetCommand, state: DaemonState) => {
  // direct session lookup
  let session = state.sessions.get(input.inheritanceKey);

  // if not found, check peer links
  if (!session) {
    const peerLink = state.peerLinks.get(input.inheritanceKey);
    if (peerLink) {
      session = state.sessions.get(peerLink.grantorKey);
      // apply scope restrictions from peerLink
    }
  }

  if (!session) {
    return { error: 'no valid session' };
  }

  // return credential
  return { key: session.credentials.get(input.slug) };
};
```

---

## .security considerations

### OTP security

| property | mechanism |
|----------|-----------|
| short-lived | 5 min expiry |
| single-use | deleted after authorization |
| not the secret | OTP is hash of inheritanceKey, not the key itself |
| rate-limited | max 3 OTPs awaited per daemon |

### authorization scope

human can limit what robot can access:

```bash
# full access to human's session
$ rhx keyrack authorize abc-123

# limited to specific env
$ rhx keyrack authorize abc-123 --env prod

# limited to specific keys
$ rhx keyrack authorize abc-123 --keys AWS_PROFILE,GITHUB_TOKEN
```

### revocation

```bash
# human can revoke robot's access
$ rhx keyrack revoke abc-123

# or revoke all peer authorizations
$ rhx keyrack revoke --all-peers
```

---

## .key insight

> **the wrapper approach guarantees @s persistence.**
>
> by wrap of the agent spawn with `keyctl session`, we create an isolated session key store that:
> 1. persists for the lifetime of the agent
> 2. is inherited by all tool calls
> 3. contains the inheritanceKey from first moment
>
> authorization becomes a simple daemon-side operation: link the robot's pre-set inheritanceKey to the human's credential set.
>
> this separates concerns cleanly:
> - **spawn time**: robot gets its session identity (inheritanceKey in @s)
> - **authorize time**: human grants access to that identity
> - **access time**: robot uses its identity to retrieve credentials

---

## .sources

- [keyctl session - create new session](https://man7.org/linux/man-pages/man1/keyctl.1.html)
- [Linux session key stores](https://www.kernel.org/doc/html/latest/security/keys/core.html#session-keyrings)

