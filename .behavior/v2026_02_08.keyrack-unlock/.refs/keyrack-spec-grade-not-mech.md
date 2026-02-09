# keyrack spec: grade requirements, not mechanism

> the spec declares WHAT security posture is required. the host declares HOW it achieves that.

---

## the insight

`mech` is an implementation detail — HOW a key is obtained.
`grade` is the security posture outcome — WHAT we require.

the spec should declare the **outcome**, not the **implementation**.

---

## why mech in spec is over-specification

different machines might provide the same key via different mechanisms:

```
machine          | key           | mechanism
-----------------|---------------|---------------------------
dev laptop       | AWS_SSO_PREP  | EPHEMERAL_VIA_AWS_SSO
ci runner        | AWS_SSO_PREP  | EPHEMERAL_VIA_GITHUB_OIDC
prod server      | AWS_SSO_PREP  | EPHEMERAL_VIA_INSTANCE_ROLE
```

all achieve the same outcome: an ephemeral, encrypted aws credential.

if the spec locked to `mech: EPHEMERAL_VIA_AWS_SSO`, the ci runner and prod server would fail validation — even though they provide equivalent (or better) security.

---

## the contract: grade shorthand

```yaml
# keyrack.yml
keys:
  AWS_SSO_PREP: ephemeral           # requires grade.duration = ephemeral
  XAI_API_KEY: encrypted            # requires grade.protection = encrypted
  SUPER_SECRET: encrypted,ephemeral # requires both
```

### allowed grade requirements

| shorthand             | minimum requirement                          |
|-----------------------|----------------------------------------------|
| `ephemeral`           | grade.duration must be ephemeral or better   |
| `encrypted`           | grade.protection must be encrypted           |
| `encrypted,ephemeral` | both constraints                             |

these are **minimums** — the host may always exceed them:

```
spec requirement    | host provides              | result
--------------------|----------------------------|--------
encrypted           | encrypted,permanent        | ✅ meets
encrypted           | encrypted,ephemeral        | ✅ exceeds
ephemeral           | plaintext,ephemeral        | ✅ meets
ephemeral           | encrypted,ephemeral        | ✅ exceeds
encrypted,ephemeral | encrypted,ephemeral        | ✅ meets
encrypted           | plaintext,permanent        | ❌ insufficient
```

### why `permanent` and `plaintext` are never specified

there's no usecase where a spec would require a *lower* grade:
- why require `permanent` when `ephemeral` is strictly better?
- why require `plaintext` when `encrypted` is strictly better?

grade requirements only go **up** the ladder. you never require a floor — only a ceiling that the host must meet or exceed.

---

## the flow

```
keyrack.yml (spec)
├─ declares minimum grade requirements per key
│  └─ e.g., AWS_SSO_PREP: ephemeral
│
keyrack.host.yml (host)
├─ declares how this machine provides each key
│  ├─ which vault (os.secure, 1password, aws sso, etc)
│  └─ which mechanism (implicitly determines grade)
│
keyrack get
├─ host supplies key via its mechanism
├─ keyrack checks: does supplied key meet spec's grade requirement?
│  ├─ if yes → grant
│  └─ if no → blocked (grade insufficient)
└─ grade degradation is always forbidden
```

---

## examples

### dev laptop

```yaml
# keyrack.yml (in repo)
keys:
  AWS_SSO_PREP: ephemeral
  XAI_API_KEY: encrypted

# keyrack.host.yml (on laptop)
keys:
  AWS_SSO_PREP:
    vault: aws.sso
    # mechanism: EPHEMERAL_VIA_AWS_SSO (implied by vault)
    # grade: { protection: encrypted, duration: ephemeral } ✅ meets requirement
  XAI_API_KEY:
    vault: os.secure
    # mechanism: PERMANENT_VIA_REPLICA (implied by vault)
    # grade: { protection: encrypted, duration: permanent } ✅ meets requirement
```

### ci runner

```yaml
# keyrack.yml (same repo)
keys:
  AWS_SSO_PREP: ephemeral
  XAI_API_KEY: encrypted

# keyrack.host.yml (on ci runner)
keys:
  AWS_SSO_PREP:
    vault: github.oidc
    # mechanism: EPHEMERAL_VIA_GITHUB_OIDC (implied by vault)
    # grade: { protection: encrypted, duration: ephemeral } ✅ meets requirement
  XAI_API_KEY:
    vault: github.secrets
    # mechanism: EPHEMERAL_VIA_GITHUB_SECRETS (implied by vault)
    # grade: { protection: encrypted, duration: ephemeral } ✅ exceeds requirement
```

---

## summary

- spec declares **grade requirements** (outcome), not mechanism (implementation)
- shorthand: `ephemeral`, `encrypted`, or `encrypted,ephemeral`
- `permanent` and `plaintext` are never specified (why require lower grade?)
- host provides keys via whatever mechanism it has
- keyrack validates: does supplied grade meet required grade?
- separation of concerns: spec = requirements, host = implementation
