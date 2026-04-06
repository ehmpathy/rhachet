# rule.require.1password-vault-scope

## .what

the 1password vault adapter must enforce that:
1. all exids reference a vault named `keyrack`
2. the authenticated account is named `keyrack`

## .why

### the problem

dev machines are supply chain attack vectors. 1password is incapable of per-item authorization. therefore, keyrack enforces blast-radius limits: dedicated account, dedicated vault, dev credentials only.

#### given.1 = dev machines are always susceptible to supply chain attacks

any process on your machine can call `op read`. this cannot be prevented — not by keyrack, not by a wrapper, not by any code.

**then: dev machines should never have unrestricted access to personal credentials.**

if you need personal credentials on a dev machine, use a flatpak-sandboxed browser with the 1password extension — isolated from cli access.

#### given.2 = 1password cannot do per-item authorization

when you approve a 1password biometric prompt, you grant access to your **entire** account — every vault, every item. there is no way to approve access to just one credential.

this is by 1password's design. they tried per-item prompts twice and abandoned it:
> "both attempts were problematic in terms of usability... [this made] 1Password wary of [this feature]"

**then: keyrack must enforce a pit of success itself, via blast-radius limits.**

## .how

### the solution: dedicated keyrack account

1. **create account named `keyrack`** — separate from personal account
2. **create vault named `keyrack`** — the only vault in that account
3. **provision only keyrack secrets** — consciously move/copy items there

**blast radius** = what compromised code can access.

| setup | blast radius |
|-------|--------------|
| personal account | all credentials: banks, social, email, ssh, etc |
| dedicated keyrack account | only what you put in the keyrack vault |

## .the rules

### exid vault must be `keyrack`

```
op://keyrack/stripe-key/credential  ✓ valid
op://Personal/stripe-key/credential ✗ rejected
op://work/api-token/password        ✗ rejected
```

### account name must include `keyrack`

the authenticated account (via `op whoami`) must have `keyrack` in its email or url:
- `keyrack@example.com` ✓
- `keyrack.1password.com` ✓
- `vlad@personal.1password.com` ✗

## .error messages

### wrong vault

```
🔐 keyrack
   └─ ✗ 1password vault must be named 'keyrack'

   you provided: op://Personal/stripe-key/credential
   expected:     op://keyrack/...

   why:
   1password biometric prompts unlock your ENTIRE account — all vaults, all items.
   there is no way to approve access to just one credential.

   to minimize blast radius in case of worst case scenario,
   a dedicated 'keyrack' vault in a dedicated 'keyrack' account
   ensures only keyrack-intended secrets are accessible.

   to fix:
   1. create a vault named 'keyrack' in your keyrack 1password account
   2. move or copy the item to the 'keyrack' vault
   3. copy the new secret reference: op://keyrack/item/field
```

### wrong account

```
🔐 keyrack
   └─ ✗ 1password account name must include 'keyrack'

   authenticated as: vlad@example.com (Personal)
   expected:         'keyrack' in email or account url

   why:
   1password biometric prompts unlock your ENTIRE account — all vaults, all items.
   there is no way to approve access to just one credential.

   to minimize blast radius in case of worst case scenario,
   a dedicated 'keyrack' account ensures only keyrack-intended
   secrets are accessible, not your personal bank logins, social media, etc.

   to fix:
   1. create a 1password account with 'keyrack' in its name
   2. sign into that account: op account add --address keyrack.1password.com
   3. switch to that account: op signin --account keyrack
```

## .exceptions

none. this is a hard requirement for the 1password vault adapter.

## .if this bugs you

ask 1password to support per-item authorization — authorize extraction of a precise key, without vault unlock:
- https://1password.community/discussion/134015/feature-request-account-password-prompt-for-selected-passwords-or-secure-notes

## .see also

- `define.vault-types-owned-vs-refed.md` — 1password is a refed vault
- `define.keyrack-identity.md` — keyrack is not a vault, it's a firewall

## .appendix: why service accounts don't solve this

1password service accounts CAN scope to specific vaults. but service accounts have no biometric gate — the token has persistent access. if the token leaks, the attacker has access until revocation.

| auth mode | vault-scoped | biometric gate |
|-----------|--------------|----------------|
| biometric | no (full account) | yes |
| service account | yes | no |

neither gives us what we want: scoped access WITH human approval.
