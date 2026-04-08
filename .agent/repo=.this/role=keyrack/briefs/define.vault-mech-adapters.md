# define.vault-mech-adapters

## .what

keyrack uses two adapter types to separate storage from transformation:

| adapter | responsibility | examples |
|---------|----------------|----------|
| **vault adapter** | storage backend | os.secure, os.direct, 1password, aws.config |
| **mech adapter** | credential transformation + guided setup | PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO |

## .the relationship

### set flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    keyrack set flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  input: --key, --vault, --mech?                                 │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                           │
│  │  vault adapter   │ ◀── looked up by vault name               │
│  │  (storage)       │                                           │
│  └────────┬─────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  vault.set({ slug, mech?, exid? })                      │    │
│  │  ═══════════════════════════════════════════════════════│    │
│  │  vault owns secret retrieval — delegates to mech        │    │
│  │                                                         │    │
│  │  ┌─────────────────────┐                                │    │
│  │  │  mech inference     │ ◀── if --mech not supplied     │    │
│  │  │  (stdin prompt)     │     filter to mechs.supported  │    │
│  │  └──────────┬──────────┘                                │    │
│  │             ▼                                           │    │
│  │  ┌─────────────────────┐                                │    │
│  │  │  mech.acquireForSet │ ◀── get source from user       │    │
│  │  │  (guided setup)     │     runs via stdin             │    │
│  │  └──────────┬──────────┘                                │    │
│  │             ▼                                           │    │
│  │  ┌─────────────────────┐                                │    │
│  │  │  store secret       │ ◀── secret never leaves scope  │    │
│  │  └─────────────────────┘                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**key insight:** vault.set encapsulates all secret operations. the orchestrator never sees the secret — it just calls `vault.set({ slug, mech? })` and the vault internally calls `mech.acquireForSet()` to get the source via guided setup.

### unlock flow (get)

```
┌─────────────────────────────────────────────────────────────────┐
│                   keyrack unlock flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  input: --key, --env                                            │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                           │
│  │  vault adapter   │ ◀── looked up by vault name               │
│  │  (storage)       │                                           │
│  └────────┬─────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  vault.get({ slug })                                    │    │
│  │  ═══════════════════════════════════════════════════════│    │
│  │  vault owns secret delivery — delegates to mech         │    │
│  │                                                         │    │
│  │  ┌─────────────────────┐                                │    │
│  │  │  retrieve source    │ ◀── from storage               │    │
│  │  └──────────┬──────────┘                                │    │
│  │             ▼                                           │    │
│  │  ┌─────────────────────┐                                │    │
│  │  │  mech.deliverForGet │ ◀── transform source → secret  │    │
│  │  │  (translate)        │     e.g., json → ghs_ token    │    │
│  │  └──────────┬──────────┘                                │    │
│  │             ▼                                           │    │
│  │  ┌─────────────────────┐                                │    │
│  │  │  return secret      │ ◀── translated, ready to use   │    │
│  │  └─────────────────────┘                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐                                           │
│  │     daemon       │ ◀── stores translated secret              │
│  │  (session cache) │     ephemeral, short-lived                │
│  └──────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**key insight:** vault.get encapsulates transformation. the orchestrator receives the usable secret — vault internally calls `mech.deliverForGet()` to transform source → secret.

mech.deliverForGet behavior:
- permanent mechs: identity (secret → secret)
- ephemeral mechs: source → short-lived token (e.g., json blob → ghs_ token)

## .vault adapter

owns storage format and location:

| vault | storage location | format |
|-------|------------------|--------|
| os.secure | `~/.keyrack/secrets/` | age-encrypted |
| os.direct | `~/.keyrack/secrets/` | plaintext |
| 1password | op://vault/item | 1password item |
| aws.config | `~/.aws/config` | ini profile |

## .mech adapter

owns source acquisition and secret delivery:

| method | signature | what it does |
|--------|-----------|--------------|
| `acquireForSet` | `({ keySlug }) → { source }` | guided setup → source credential |
| `deliverForGet` | `({ source }) → { secret, expiresAt? }` | source → usable secret |

per-mech behavior:

| mech | acquireForSet | deliverForGet |
|------|---------------|---------------|
| PERMANENT_VIA_REPLICA | prompt for secret | identity (secret → secret) |
| EPHEMERAL_VIA_GITHUB_APP | org → app → pem path | json blob → ghs_ token |
| EPHEMERAL_VIA_AWS_SSO | region → account → role | profile name → sso session |

## .inference

### vault inference

infers `--vault` from key name when unambiguous:

| key pattern | inferred vault |
|-------------|----------------|
| AWS_PROFILE | aws.config |
| AWS_* | aws.config |
| (other) | no inference, require --vault |

### mech inference

infers `--mech` via stdin prompt when vault supports multiple mechs for the key:

```
🔐 keyrack set AWS_PROFILE
   │
   ├─ which mechanism?
   │  ├─ options
   │  │  ├─ 1. aws sso (EPHEMERAL_VIA_AWS_SSO) — short-lived tokens via browser login
   │  │  └─ 2. aws key (PERMANENT_VIA_AWS_KEY) — long-lived access key + secret
   │  └─ choice
   │     └─ 1 ✓
```

vault.set invokes mech inference when:
- `--mech` not supplied
- vault supports multiple mechs

## .compatibility matrix

| vault | PERMANENT_VIA_REPLICA | EPHEMERAL_VIA_GITHUB_APP | EPHEMERAL_VIA_AWS_SSO |
|-------|----------------------|--------------------------|----------------------|
| os.secure | ✓ | ✓ | ✗ |
| os.direct | ✓ | ✗ (cannot secure source) | ✗ |
| 1password | ✓ | ✓ | ✗ |
| aws.config | ✗ | ✗ | ✓ |

enforcement: vault adapter fail-fast on incompatible mech with clear error + alternatives.

## .why this separation

| concern | owner |
|---------|-------|
| where to store | vault adapter |
| how to encrypt | vault adapter |
| what to prompt for | mech adapter |
| how to transform | mech adapter |
| which mech to use | mech inference (if ambiguous) |
| which vault to use | vault inference (if inferable) |

the insight: mechs are portable across vaults. EPHEMERAL_VIA_GITHUB_APP works with os.secure, 1password, or any vault that can store a json blob securely.

## .see also

- `define.vault-types-owned-vs-refed.md` — owned vs refed vault distinction
- `define.keyrack-identity.md` — keyrack as firewall, dispatcher, broker
