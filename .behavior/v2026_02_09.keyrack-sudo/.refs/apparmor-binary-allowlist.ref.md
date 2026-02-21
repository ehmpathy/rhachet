# ref: AppArmor binary allowlist for keyrack

## .what

use AppArmor to restrict keyrack socket access to specific binaries, as defense against malicious extensions and unauthorized apps.

---

## .the problem: user-grain auth is too permissive

### socket 0600 permissions

```bash
ls -la /run/user/1000/keyrack/keyrack.sock
srw------- 1 vlad vlad 0 Jan 15 10:00 keyrack.sock
```

this means: **any process that runs as user `vlad` can connect**.

### what runs as your user?

| app | runs as you | can access socket 0600 |
|-----|-------------|------------------------|
| your terminal | yes | ✅ |
| vscode | yes | ✅ |
| vscode extensions | yes | ✅ |
| chrome/firefox | yes | ✅ |
| browser extensions | yes | ✅ |
| electron apps | yes | ✅ |
| npm packages (via node) | yes | ✅ |
| random app from internet | yes | ✅ |

**the vulnerability**: a malicious vscode extension or browser extension runs as your user. with socket 0600, it can connect to keyrack and read your secrets.

---

## .the solution: AppArmor binary allowlist

### how it works

instead of "any process as user vlad", we restrict to "only these specific binaries":

```
/usr/bin/git           → can access keyrack
/usr/bin/ssh           → can access keyrack
/usr/bin/node          → can access keyrack
/home/vlad/.local/bin/rhx → can access keyrack
all else               → BLOCKED
```

### what this blocks

| app | binary path | in allowlist? | access |
|-----|-------------|---------------|--------|
| git | /usr/bin/git | ✅ yes | allowed |
| vscode | /usr/bin/code | ❌ no | **blocked** |
| vscode extension | runs inside /usr/bin/code | ❌ no | **blocked** |
| chrome | /usr/bin/chromium | ❌ no | **blocked** |
| browser extension | runs inside /usr/bin/chromium | ❌ no | **blocked** |
| slack | /usr/bin/slack | ❌ no | **blocked** |
| random electron app | /opt/randomapp/app | ❌ no | **blocked** |

---

## .example: vscode extension attack

### without AppArmor (vulnerable)

```
┌─────────────────────────────────────────────────────────────┐
│ malicious vscode extension                                  │
│                                                             │
│   1. extension code runs inside vscode process              │
│   2. vscode runs as user vlad                               │
│   3. extension opens socket: /run/user/1000/keyrack/...     │
│   4. socket allows connect (0600, owner=vlad) ✓             │
│   5. extension sends: { "command": "GET", "slug": "..." }   │
│   6. daemon returns secret                                  │
│   7. extension exfiltrates secret to attacker server        │
└─────────────────────────────────────────────────────────────┘

result: secrets stolen
```

### with AppArmor (protected)

```
┌─────────────────────────────────────────────────────────────┐
│ malicious vscode extension                                  │
│                                                             │
│   1. extension code runs inside vscode process              │
│   2. vscode binary is /usr/bin/code                         │
│   3. extension tries to open socket                         │
│   4. AppArmor checks: is /usr/bin/code in allowlist?        │
│   5. NO → connect() returns EACCES                          │
│   6. extension fails to connect                             │
└─────────────────────────────────────────────────────────────┘

result: attack blocked at kernel level
```

---

## .example: browser extension attack

### without AppArmor (vulnerable)

```
┌─────────────────────────────────────────────────────────────┐
│ malicious browser extension (chrome)                        │
│                                                             │
│   1. extension uses native messaging to spawn helper        │
│   2. helper runs as user vlad                               │
│   3. helper connects to keyrack socket                      │
│   4. socket allows (0600, owner=vlad) ✓                     │
│   5. extension reads all unlocked secrets                   │
│   6. extension sends to attacker.com                        │
└─────────────────────────────────────────────────────────────┘

result: secrets stolen
```

### with AppArmor (protected)

```
┌─────────────────────────────────────────────────────────────┐
│ malicious browser extension (chrome)                        │
│                                                             │
│   1. extension spawns native messaging helper               │
│   2. helper binary is /home/vlad/.config/chromium/helper    │
│   3. helper tries to connect to keyrack socket              │
│   4. AppArmor checks: is helper path in allowlist?          │
│   5. NO → connect() returns EACCES                          │
│   6. extension fails                                        │
└─────────────────────────────────────────────────────────────┘

result: attack blocked
```

---

## .the profile

```
# /etc/apparmor.d/keyrack-socket

#include <tunables/global>

# keyrack socket access control
# only listed binaries can connect to keyrack daemon

profile keyrack-socket flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>

  # the keyrack socket path pattern
  # /run/user/{uid}/keyrack/keyrack.sock

  # === ALLOWED BINARIES ===

  # keyrack CLI itself
  /home/*/.local/bin/rhx rw /run/user/*/keyrack/keyrack.sock,
  /usr/local/bin/rhx rw /run/user/*/keyrack/keyrack.sock,

  # git (for credential helper)
  /usr/bin/git rw /run/user/*/keyrack/keyrack.sock,

  # ssh (for ssh-agent integration)
  /usr/bin/ssh rw /run/user/*/keyrack/keyrack.sock,

  # node (for npm operations that need secrets)
  /usr/bin/node rw /run/user/*/keyrack/keyrack.sock,

  # === DENIED BY DEFAULT ===
  # any binary not listed above cannot access the socket
}
```

---

## .what this eliminates

| threat | socket 0600 | + AppArmor |
|--------|-------------|------------|
| other users on machine | ✅ blocked | ✅ blocked |
| malicious vscode extension | ❌ allowed | ✅ blocked |
| malicious browser extension | ❌ allowed | ✅ blocked |
| malicious electron app | ❌ allowed | ✅ blocked |
| malicious slack/discord plugin | ❌ allowed | ✅ blocked |
| npm supply chain (inside node) | ❌ allowed | ❌ allowed* |
| git hook malware (inside git) | ❌ allowed | ❌ allowed* |

*these run inside allowed binaries — AppArmor can't distinguish

---

## .what this does NOT eliminate

### supply chain attacks inside allowed binaries

```
scenario: malicious npm package

1. you run: npm install cool-package
2. cool-package has postinstall hook
3. hook runs inside /usr/bin/node (allowed binary)
4. hook connects to keyrack socket
5. AppArmor allows (node is in allowlist)
6. hook steals secrets
```

AppArmor protects at the **binary** level, not the **code** level. if you allow `node`, you allow ALL code that runs inside node.

### mitigation options for supply chain

| option | protects against | tradeoff |
|--------|------------------|----------|
| don't add node to allowlist | npm supply chain | can't use keyrack from node |
| per-secret ACLs (daemon-side) | limits blast radius | complex to manage |
| short TTLs | limits exposure window | must re-unlock often |
| audit logs | detection, not prevention | reactive, not proactive |

---

## .honest assessment

### what AppArmor binary allowlist achieves

> **eliminates entire categories of attack**:
> - vscode extensions
> - browser extensions
> - electron apps
> - any app not explicitly blessed
>
> these are significant wins — browser/vscode extensions are common attack vectors.

### what it doesn't achieve

> **does not protect against malicious code inside allowed binaries**:
> - npm packages (if node allowed)
> - pip packages (if python allowed)
> - git hooks (if git allowed)
>
> for these, you need either:
> - don't allow the interpreter binary
> - accept the risk with short TTLs and audit logs
> - use per-secret ACLs to limit blast radius

### the tradeoff

| choice | security | usability |
|--------|----------|-----------|
| allow node | npm operations work | npm supply chain risk |
| deny node | npm operations blocked | no npm supply chain risk |
| allow git | git credential helper works | git hook risk |
| deny git | git credential helper blocked | no git hook risk |

---

## .recommendation for keyrack v1.5

### default: socket 0600 only

works out of the box, no root required.

### optional: AppArmor binary allowlist

```bash
rhx keyrack install apparmor
# prompts for sudo, installs profile
```

ships with conservative allowlist:
- rhx (keyrack CLI)
- git (credential helper)
- ssh (agent integration)

user can add more:
```bash
rhx keyrack acl allow --binary /usr/bin/node
# requires sudo, updates AppArmor profile
```

### document the tradeoffs

help text:
```
rhx keyrack acl allow --binary /usr/bin/node

⚠️  this allows ALL code that runs inside /usr/bin/node
   to access keyrack, including npm packages.

   if a malicious npm package runs, it can read
   any unlocked secrets.

   alternatives:
   - use rhx keyrack get in shell commands instead of node
   - use short TTLs for sensitive secrets
   - use per-secret ACLs (v2)

proceed? [y/N]
```

---

## .summary

> **AppArmor binary allowlist eliminates the "any user process can access" problem.**
>
> - vscode extensions: **blocked**
> - browser extensions: **blocked**
> - electron apps: **blocked**
> - random malware: **blocked**
>
> but it's binary-level, not code-level:
> - npm supply chain attacks: **not blocked** (if node allowed)
> - git hook attacks: **not blocked** (if git allowed)
>
> still valuable — it eliminates common attack vectors with low operational cost.
