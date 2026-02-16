# vision: AppArmor process isolation for keyrack

## .what

optional AppArmor binary allowlist to restrict which programs can connect to the keyrack daemon socket.

extends: `apparmor-binary-allowlist.ref.md`

---

## .the problem

socket 0600 blocks other users, but any process that runs as YOUR user can connect — this includes malicious vscode extensions, browser extensions, and electron apps.

---

## .the solution

optional AppArmor binary allowlist restricts socket access to specific binaries.

---

## .attack surface reduction

| vector | pit of success |
|--------|----------------|
| daemon socket access by other users | socket in `~/.rhachet/keyrack/` (dir 0700) with socket file 0600 (owner-only) |
| daemon socket access by same-user apps | optional AppArmor binary allowlist |
| shell history captures passphrase | no `--passphrase` flag or env var; input via: tty prompt > stdin pipe |
| brute force unlock attempts | rate limit: exponential backoff on failed unlock attempts |
| multiple passphrase prompts for os.secure | user can reuse keyrack passphrase; lockhash enables auto-unlock if chosen |

---

## .what it blocks

| threat | socket 0600 only | + AppArmor |
|--------|------------------|------------|
| other users | ✅ blocked | ✅ blocked |
| vscode extensions | ❌ allowed | ✅ blocked |
| browser extensions | ❌ allowed | ✅ blocked |
| electron apps | ❌ allowed | ✅ blocked |
| npm supply chain* | ❌ allowed | ❌ allowed |

*npm packages run inside node — if node is in the allowlist, supply chain attacks still work. AppArmor is binary-level, not code-level.

---

## .supply chain protection (node not allowed)

when node is NOT in the allowlist, npm supply chain attacks are blocked:

```
┌─────────────────────────────────────────────────────────────┐
│ scenario: malicious npm package postinstall hook            │
│                                                             │
│   1. developer runs: npm install cool-package               │
│   2. cool-package has malicious postinstall hook            │
│   3. postinstall runs inside /usr/bin/node                  │
│   4. malicious code tries to connect to keyrack socket      │
│   5. AppArmor checks: is /usr/bin/node in allowlist?        │
│   6. NO → connect() returns EACCES                          │
│   7. attack fails — credentials safe                        │
└─────────────────────────────────────────────────────────────┘

result: supply chain attack blocked
```

### the tradeoff

| node in allowlist? | npm supply chain | node can access keyrack |
|--------------------|------------------|-------------------------|
| ❌ no              | ✅ blocked       | ❌ no                   |
| ✅ yes             | ❌ allowed       | ✅ yes                  |

if your workflow requires node to access keyrack (e.g., terraform external data via node), you accept the supply chain risk.

if your workflow only uses git, ssh, and rhx to access keyrack, leave node out of the allowlist — supply chain attacks are blocked.

### recommended workflow (node not allowed)

```bash
# use shell to fetch credentials, not node
. rhx keyrack unlock --env prod

# credentials now in env vars — node can read $AWS_ACCESS_KEY_ID etc
npm run build   # node reads from env, never touches keyrack socket

# or: pass credentials via stdin
rhx keyrack get --key DATABASE_URL | node ./bin/migrate.js
```

this pattern keeps node out of the allowlist while still letting node-based tools use credentials.

---

## .install flow

keyrack cannot enforce AppArmor out of the box because profile installation requires root. instead, users opt in:

```bash
# first run: daemon starts with socket 0600 (default)
rhx keyrack daemon start
#
# 🐢 keyrack daemon
#
# security:
#   ✅ socket 0600 (blocks other users)
#   ⚠️  any app you run can access unlocked secrets
#
# for stronger isolation, run:
#   rhx keyrack harden
#
# daemon started at /run/user/1000/keyrack/keyrack.sock
```

user opts in to process isolation:

```bash
rhx keyrack harden
#
# 🔐 keyrack process isolation
#
# this installs an AppArmor profile that restricts which
# programs can connect to the keyrack daemon.
#
# after install, only these binaries can access keyrack:
#   • /usr/bin/git
#   • /usr/bin/ssh
#   • /home/you/.local/bin/rhx
#
# blocked:
#   • vscode extensions
#   • browser extensions
#   • electron apps
#   • any other app
#
# requires sudo to install system profile.
#
# proceed? [y/N] y
# [sudo] password for vlad: ****
#
# ✓ AppArmor profile installed
# ✓ keyrack daemon restarted with protection
#
# to add more programs:
#   rhx keyrack harden --allow /usr/bin/node
```

---

## .add programs to allowlist

```bash
rhx keyrack harden --allow /usr/bin/node
#
# ⚠️  this allows ALL code that runs inside /usr/bin/node
#    to access keyrack, and that includes npm packages.
#
# proceed? [y/N] y
# [sudo] password for vlad: ****
#
# ✓ /usr/bin/node added to allowlist
# ✓ AppArmor profile reloaded
```

---

## .check status

```bash
rhx keyrack harden --status
#
# 🔐 process isolation: ACTIVE
#
# allowed binaries:
#   • /usr/bin/git
#   • /usr/bin/ssh
#   • /usr/bin/node
#   • /home/vlad/.local/bin/rhx
#
# to add: rhx keyrack harden --allow /path/to/binary
# to remove: rhx keyrack harden --remove /path/to/binary
# to disable: rhx keyrack harden --disable
```

---

## .platform support

| platform | method | auto-detected |
|----------|--------|---------------|
| Ubuntu/Debian | AppArmor | ✅ yes |
| Fedora/RHEL | SELinux | ⚠️ future |
| macOS | code-signed ACLs | ✅ built-in to Keychain |
| other linux | socket 0600 only | — |

on systems without AppArmor, `rhx keyrack harden` shows:

```bash
rhx keyrack harden
#
# ⚠️  AppArmor not available on this system
#
# keyrack uses socket 0600 permissions, which blocks
# other users but not apps you run.
#
# alternatives:
#   • use short TTLs for sensitive credentials
#   • relock when not in use: rhx keyrack relock
#   • audit access: rhx keyrack status --verbose
```
