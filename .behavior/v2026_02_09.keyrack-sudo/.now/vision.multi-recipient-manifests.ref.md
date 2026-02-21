# ref: vision — multi-owner host manifests

## .what

support multiple host manifests on a single machine, one per owner identity.

each robot/agent can have its own isolated keyrack with its own credentials.

---

## .the problem

today's design: one `keyrack.host.yml.age` per machine, encrypted to one or more recipients.

this works for a single human developer, but breaks down when:

1. **multiple robots on one machine** — seaturtle and mechanic both run on vlad's laptop
2. **each robot needs different credentials** — seaturtle's GITHUB_TOKEN vs mechanic's GITHUB_TOKEN
3. **isolation is required** — seaturtle shouldn't access mechanic's AWS_PROFILE

the current shared-manifest model shares the manifest — all recipients see all keys. that's wrong for robot isolation.

---

## .the solution

**per-owner manifests**: each owner has their own host manifest.

```
~/.rhachet/keyrack/
  host.seaturtle.yml.age      # seaturtle's manifest, encrypted to seaturtle's key
  host.mechanic.yml.age       # mechanic's manifest, encrypted to mechanic's key
  host.human.yml.age          # human's manifest, encrypted to human's key (default)
```

each manifest is encrypted to exactly one recipient — the owner.

---

## .cli semantics

### init with owner identity

```bash
# human's default manifest (uses default ssh key)
rhx keyrack init
# → creates ~/.rhachet/keyrack/host.human.yml.age
# → --for defaults to "human"

# robot's manifest with explicit identity
rhx keyrack init --for seaturtle --via ssh --pubkey ~/.ssh/id_ed25519_seaturtle
# → creates ~/.rhachet/keyrack/host.seaturtle.yml.age
# → encrypted to seaturtle's pubkey

rhx keyrack init --for mechanic --via yubikey
# → creates ~/.rhachet/keyrack/host.mechanic.yml.age
# → encrypted to mechanic's yubikey
```

### set with owner context

```bash
# set a key in seaturtle's manifest
rhx keyrack set --for seaturtle --key GITHUB_TOKEN --env sudo --vault 1password
# → stored in host.seaturtle.yml.age only

# set a different key in mechanic's manifest
rhx keyrack set --for mechanic --key GITHUB_TOKEN --env sudo --vault 1password --exid "mechanic/github-pat"
# → stored in host.mechanic.yml.age only
# → different vault item than seaturtle's
```

### unlock with owner context

```bash
# seaturtle unlocks its keys
rhx keyrack unlock --for seaturtle --env sudo --key GITHUB_TOKEN
# → decrypts host.seaturtle.yml.age
# → stores in seaturtle's daemon

# mechanic unlocks its keys (separate)
rhx keyrack unlock --for mechanic --env sudo --key GITHUB_TOKEN
# → decrypts host.mechanic.yml.age
# → stores in mechanic's daemon
```

### get with owner context

```bash
# seaturtle gets its token
rhx keyrack get --for seaturtle --key GITHUB_TOKEN --env sudo
# → returns seaturtle's token

# mechanic gets its token (different value)
rhx keyrack get --for mechanic --key GITHUB_TOKEN --env sudo
# → returns mechanic's token
```

---

## .daemon isolation

each owner gets their own daemon process and socket.

### per-owner daemon sockets

each owner has its own daemon:

```
/tmp/keyrack-daemon.seaturtle.sock
/tmp/keyrack-daemon.mechanic.sock
/tmp/keyrack-daemon.human.sock
```

the `--for` flag determines which daemon to connect to:

```bash
# connects to seaturtle's daemon
rhx keyrack unlock --for seaturtle --key GITHUB_TOKEN --env sudo
rhx keyrack get --for seaturtle --key GITHUB_TOKEN --env sudo

# connects to mechanic's daemon (separate process)
rhx keyrack unlock --for mechanic --key GITHUB_TOKEN --env sudo
rhx keyrack get --for mechanic --key GITHUB_TOKEN --env sudo
```

**pros**:
- full process isolation — no shared memory between owners
- daemon compromise affects only one owner
- clean separation of concerns
- each daemon can have its own permissions (chmod 0600)
- daemon lifecycle tied to owner identity

**cons**:
- multiple daemon processes (minor resource overhead)
- each owner must start their daemon independently

### why not a shared daemon with owner tags?

a single daemon with owner-tagged keys would be simpler, but:
- keys from all owners in same memory space
- daemon compromise exposes all owners
- harder to reason about security boundaries

per-owner daemons provide true isolation with minimal complexity cost.

---

## .security model

### threat model

| threat | mitigation |
|--------|------------|
| robot A reads robot B's manifest | each manifest encrypted to different key |
| robot A accesses robot B's unlocked keys | separate daemon processes — no shared memory |
| robot A claims wrong `--for` | can't connect to other daemon; decryption fails (wrong key) |
| machine compromise | all manifests compromised (same as single manifest) |

### isolation levels

| level | mechanism | suitable for |
|-------|-----------|--------------|
| **manifest isolation** | separate .age files, separate keys | prevents offline discovery |
| **process isolation** | per-owner daemon sockets | prevents cross-access between owners |
| **kernel isolation** | separate users, lsm | prevents adversarial cross-access |

multi-owner manifests provide manifest isolation + process isolation by default.

---

## .manifest structure

### per-owner manifest

```yaml
# ~/.rhachet/keyrack/host.seaturtle.yml.age (decrypted view)
owner:
  name: seaturtle
  via: ssh
  pubkey: ssh-ed25519 AAAA... seaturtle

keys:
  ehmpathy.sudo.GITHUB_TOKEN:
    slug: ehmpathy.sudo.GITHUB_TOKEN
    env: sudo
    org: ehmpathy
    vault: 1password
    exid: seaturtle/github-pat
    mech: env
    createdAt: 2024-01-15T10:00:00Z
    updatedAt: 2024-01-15T10:00:00Z

  ehmpathy.sudo.AWS_PROFILE:
    slug: ehmpathy.sudo.AWS_PROFILE
    env: sudo
    org: ehmpathy
    vault: os.secure
    exid: null
    mech: env
    createdAt: 2024-01-15T10:00:00Z
    updatedAt: 2024-01-15T10:00:00Z
```

### comparison with current design

| aspect | current (v1) | multi-owner |
|--------|--------------|-------------|
| manifest file | `host.yml.age` | `host.${owner}.yml.age` |
| recipients array | multi-recipient, shared access | single owner, isolated access |
| key visibility | all recipients see all keys | each owner sees only their keys |
| daemon | single daemon | per-owner daemon |

---

## .backwards compatibility

the current design with `recipients[]` array serves a different purpose:
- multi-recipient = **backup keys** for same manifest
- per-owner manifests = **isolated access** for different identities

both can coexist:

```
~/.rhachet/keyrack/
  host.human.yml.age              # human's manifest (default), may have backup recipients
  host.seaturtle.yml.age          # seaturtle's isolated manifest
  host.mechanic.yml.age           # mechanic's isolated manifest
```

the `recipients[]` array within a manifest allows backup keys for that specific manifest.

---

## .use cases

### use case 1: multiple robots on developer machine

vlad runs seaturtle and mechanic on his laptop. each needs different github tokens.

```bash
# setup seaturtle
rhx keyrack init --for seaturtle --via ssh --pubkey ~/.ssh/id_ed25519_seaturtle
rhx keyrack set --for seaturtle --key GITHUB_TOKEN --env sudo --vault 1password --exid "seaturtle/pat"

# setup mechanic
rhx keyrack init --for mechanic --via ssh --pubkey ~/.ssh/id_ed25519_mechanic
rhx keyrack set --for mechanic --key GITHUB_TOKEN --env sudo --vault 1password --exid "mechanic/pat"

# seaturtle uses its token
rhx keyrack unlock --for seaturtle --key GITHUB_TOKEN --env sudo
rhx keyrack get --for seaturtle --key GITHUB_TOKEN --env sudo

# mechanic uses its token (different value)
rhx keyrack unlock --for mechanic --key GITHUB_TOKEN --env sudo
rhx keyrack get --for mechanic --key GITHUB_TOKEN --env sudo
```

### use case 2: shared ci runner with multiple agents

a ci runner hosts multiple agent identities. each agent has its own credentials.

```bash
# ci setup provisions each agent's manifest
for agent in agent-1 agent-2 agent-3; do
  rhx keyrack init --for $agent --via ssh --pubkey /etc/keyrack/$agent.pub
done

# each job runs with its agent identity
rhx keyrack unlock --for agent-1 --env repo
```

### use case 3: human + robot on same machine

vlad (human) and seaturtle (robot) share a machine but have separate credentials.

```bash
# human's keys (default)
rhx keyrack unlock --env repo
rhx keyrack get --key GITHUB_TOKEN

# seaturtle's keys (explicit owner)
rhx keyrack unlock --for seaturtle --key GITHUB_TOKEN --env sudo
rhx keyrack get --for seaturtle --key GITHUB_TOKEN --env sudo
```

---

## .implementation phases

### phase 1: per-owner manifests

- support `--for` flag on init/set/unlock/get
- manifest path: `host.${owner}.yml.age`
- default owner: `human`

### phase 2: per-owner daemons

- daemon socket per owner: `/tmp/keyrack-daemon.${owner}.sock`
- `--for` flag determines which daemon to connect to
- each daemon is a separate process with its own key store

---

## .open questions

| question | options |
|----------|---------|
| default owner name? | `human` (recommended), hostname, inferred from ssh key comment |
| owner in slug? | `seaturtle.ehmpathy.sudo.GITHUB_TOKEN` vs separate namespaces |
| share keys between owners? | copy on set, or reference? |
| daemon startup? | on-demand per owner, or all at boot? |

---

## .status

future extension, not in v1 scope.

this ref doc captures the vision for discussion and future planning.

