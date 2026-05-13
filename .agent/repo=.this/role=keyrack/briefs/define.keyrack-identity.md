# define.keyrack-identity

## .what

keyrack is **not a vault**. keyrack is:

| role | description |
|------|-------------|
| **firewall** | controls which keys are accessible, to whom, in which env |
| **dispatcher** | routes unlock requests to the correct vault |
| **broker** | daemon holds unlocked keys for your session |

## .the daemon

the daemon is the session keyrack — an ephemeral cache of the keys unlocked and granted for access to the actors in this session.

- ephemeral: keys expire (9h default) or die with session
- not source of truth: vaults are
- `keyrack unlock` populates the session keyrack from the vaults
- `keyrack get` grabs from the session keyrack at access time

## .manifests and vaults

| layer | role |
|-------|------|
| **repo.manifest** | which keys are required (narrows what gets unlocked) |
| **host.manifest** | which & where keys can be found |
| **vault** | holds the secret (owned) or pointer to external (refed) |
| **daemon** | session keyrack — ephemeral cache of unlocked keys |

**why two manifests?** decouples where keys can be found from which keys are required. host.manifest may have more keys than a repo needs — repo.manifest narrows to unlock only the necessary set. different hosts can dispatch to different vaults for the same key. e.g., developer.1 might use 1password while developer.2 uses lastpass. or cicd might use aws.ssm.

the flow:
1. **repo.manifest** declares requirements → filters what's accessible
2. **host.manifest** maps keys to vaults → specifies where to fetch
3. **unlock** populates the session keyrack from the vaults
4. **get** grabs from the session keyrack at access time

## .set vs unlock vs get

| command | what it does |
|---------|--------------|
| **set** | configures where a key lives (writes to host.manifest, and vault for owned) |
| **unlock** | populates the session keyrack from the vaults |
| **get** | grabs from daemon (explicit unlock) or envvar (ci fallback) at access time |

**get resolution order:**
1. os.daemon — explicit unlock takes precedence
2. os.envvar — fallback for ci and ambient env
3. locked/absent — if not found in either

```
┌─────────────────────────────────────────────────────────────────┐
│                         keyrack flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  repo.manifest ─────────────────────────────────────────────┐   │
│  "i need STRIPE_KEY"                                        │   │
│         │                                            (filter)   │
│         ▼                                                   ▼   │
│  ┌─────────────┐      ┌──────────────┐      ┌────────────────┐  │
│  │ keyrack set │ ───▶ │ host.manifest │ ───▶ │     vault      │  │
│  └─────────────┘      │ "lives in X"  │      │ (owned: store) │  │
│                       └──────────────┘      │ (refed: exid)  │  │
│                              │              └────────────────┘  │
│                              ▼                      │           │
│                       ┌──────────────┐              │           │
│                       │keyrack unlock│ ─────────────┘           │
│                       └──────────────┘     (fetch)              │
│                              │                                  │
│                              ▼                                  │
│                       ┌──────────────┐                          │
│                       │    daemon    │  ◀── session keyrack      │
│                       │  (session)   │                          │
│                       └──────────────┘                          │
│                              │                                  │
│                              ▼  (access time)                   │
│                       ┌──────────────┐                          │
│                       │ keyrack get  │ ───▶ secret value        │
│                       └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## .vaults are source of truth

keyrack knows where keys live and how to get them to the daemon. the vaults hold the secrets — either owned by keyrack (os.secure, os.direct, os.daemon) or refed by keyrack (1password, aws.ssm).

see `define.vault-types-owned-vs-refed.md` for the owned/refed distinction.
