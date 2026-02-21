# ref: same-user process isolation for secret stores

## .what

deep dive on how secret management tools handle access control when multiple processes run as the same user.

## .the problem

any process that runs as user X can access resources owned by user X. this includes:
- unix sockets with 0600 permissions
- files in ~/.config, ~/.local, etc.
- environment variables
- shared memory segments

so if keyrack daemon listens on a socket with 0600 permissions, any process that runs as the same user can connect and read all unlocked secrets.

**threat model**: compromised browser extension, malware, or malicious npm package that runs as the user can exfiltrate all unlocked credentials.

---

## .how others solve this

### macOS Keychain (gold standard)

macOS Keychain uses **per-item Access Control Lists (ACLs)** with **code signature verification**:

1. **partition list**: each keychain item has an ACL that specifies which apps can access it
2. **code signature**: apps identified by cryptographic signature, not just path
3. **user prompt**: if an app isn't in the ACL, user sees "App X wants to access keychain item Y. Allow?"
4. **biometric per-item**: items can require Touch ID/Face ID for each access via `SecAccessControl`

```
keychain item: "GitHub Token"
  ACL:
    - /Applications/Terminal.app (signed by Apple)
    - /usr/bin/git (signed by Apple)
  access: "always prompt" | "allow after first unlock" | "require biometric"
```

**result**: even if malware runs as the user, it can't read keychain items unless:
- user explicitly approves the prompt, OR
- malware forges a code signature (very hard)

**sources**:
- [Keychain data protection - Apple Support](https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/1/web/1)
- [Accessing Keychain Items with Face ID or Touch ID](https://developer.apple.com/documentation/LocalAuthentication/accessing-keychain-items-with-face-id-or-touch-id)
- [kSecAttrAccessControl](https://developer.apple.com/documentation/security/ksecattraccesscontrol)

---

### GNOME Keyring / Linux Secret Service (same vulnerability)

GNOME Keyring uses D-Bus for IPC. the security model:

> "any application can easily read any secret if the keyring is unlocked"

GNOME's stated position: **untrusted applications must not be allowed to communicate with the secret service**. they expect the OS to sandbox untrusted apps.

**mitigations**:
- Flatpak provides filtered D-Bus access (sandboxed apps can't reach secret service)
- Snap has similar isolation
- native apps: no protection

**result**: same vulnerability as keyrack daemon. GNOME accepts this and relies on sandboxing.

**sources**:
- [What is Linux keyring, gnome-keyring, Secret Service, D-Bus](https://rtfm.co.ua/en/what-is-linux-keyring-gnome-keyring-secret-service-and-d-bus/)
- [GNOME/Keyring - ArchWiki](https://wiki.archlinux.org/title/GNOME/Keyring)

---

### SSH Agent (confirmation prompts)

SSH agent has the same vulnerability by default. mitigation via `-c` flag:

```bash
# add key with confirmation required
ssh-add -c ~/.ssh/id_rsa

# now every use of this key triggers SSH_ASKPASS prompt
# user sees: "Allow use of key ~/.ssh/id_rsa? [y/n]"
```

**how it works**:
- `SSH_ASKPASS` env var points to a program that displays prompt
- agent calls this program before each key use
- user must approve each ssh connection attempt

**result**: malware can connect to agent, but can't use keys without user see a prompt.

**sources**:
- [ssh-askpass on macOS for SSH agent confirmation](https://www.endpointdev.com/blog/2022/11/ssh-askpass-on-mac-os-for-agent-confirmation/)
- [SSH keys - ArchWiki](https://wiki.archlinux.org/title/SSH_keys)
- [ssh-agent - Wikipedia](https://en.wikipedia.org/wiki/Ssh-agent)

---

## .comparison

| tool | same-user isolation | mechanism | user friction |
|------|---------------------|-----------|---------------|
| macOS Keychain | strong | code-signed ACLs + biometric | low (one-time approve per app) |
| GNOME Keyring | none | relies on sandboxing | none |
| SSH Agent | optional | confirmation prompts | high (prompt per use) |
| 1Password CLI | none | session token in env var | none |
| keyrack (current) | none | socket 0600 | none |

---

## .options for keyrack

### v1: accept the model (current)

same as GNOME Keyring. socket 0600 prevents other users; same-user processes have full access.

**acceptable if**: users trust all code that runs as their user.

**risk**: supply chain attacks (malicious npm packages, browser extensions) can exfiltrate secrets.

---

### v1.5: confirmation prompts (like SSH agent)

add optional confirmation for each `get` request:

```bash
# at unlock time, require confirmation for gets
rhx keyrack unlock --env sudo --key X --confirm

# later, when any process calls get:
# user sees: "Process 'terraform' (pid 12345) wants GITHUB_TOKEN. Allow? [y/n]"
```

**pros**:
- user sees every access attempt
- malware can't silently exfiltrate

**cons**:
- high friction for legitimate use
- prompt fatigue leads to "always allow" habits
- need a way to display prompts (GUI? terminal?)

---

### v2: capability tokens (scoped access)

return a capability token at unlock time; require it for get:

```bash
# unlock returns a token
TOKEN=$(rhx keyrack unlock --env sudo --key X)

# get requires the token
rhx keyrack get --key X --token "$TOKEN"
```

**how it helps**:
- token is in the caller's process memory only
- malware must find and extract the token
- tokens can be scoped to specific keys
- tokens can have short TTL

**limitations**:
- tokens can still be stolen from process memory
- adds complexity to every get call
- doesn't prevent determined attacker, just raises bar

---

### v3: integrate with OS keychain

store actual secrets in macOS Keychain / GNOME Keyring, not our own daemon:

```bash
# keyrack becomes a frontend to OS keychain
# on macOS: uses Security.framework with code-signed ACLs
# on Linux: uses libsecret (inherits GNOME Keyring model)
```

**pros**:
- get macOS Keychain's strong isolation for free
- no daemon to secure
- user's current keychain workflow

**cons**:
- lose cross-platform consistency
- Linux still has no real isolation
- complex integration

---

## .recommendation

**v1** is acceptable for initial release:
- matches GNOME Keyring model
- sudo credentials have 30min TTL (limits exposure)
- relock available for immediate purge

**v1.5** (confirmation prompts) worth consider for high-value keys:
- opt-in via `--confirm` flag
- only practical for rarely-used sudo credentials
- not practical for bulk/automated access

**v2** (capability tokens) is overengineered:
- complexity doesn't match threat reduction
- determined attacker can still extract tokens

**v3** (OS keychain) is a different product:
- consider as separate "keyrack-native" adapter
- not a replacement for encrypted host manifest

---

## .key insight

> macOS is the only platform with real same-user isolation via code signatures.
> Linux tools (GNOME Keyring, SSH agent, 1Password CLI) all accept that same-user = full access.
> the industry answer on Linux is: sandbox untrusted code (Flatpak, containers, firejail).

keyrack can't solve a problem the OS doesn't solve. socket 0600 is the standard, acceptable protection. users who need stronger isolation should:
1. run untrusted code in containers
2. use separate user accounts for untrusted workloads
3. rely on short TTLs and explicit unlock for sudo credentials
