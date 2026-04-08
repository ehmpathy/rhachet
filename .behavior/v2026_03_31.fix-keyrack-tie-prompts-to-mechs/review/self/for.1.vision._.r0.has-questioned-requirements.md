# self-review r0: has-questioned-requirements

fresh eyes after vision update with mech inference adapters.

---

## requirement 1: mechs drive their own prompts

**who said?** wisher: "keyrack vaults should use mech adapters, to enable each mechanism to prompt for exactly what it needs"

**evidence?** aws.iam.sso has guided setup baked into vault — couples EPHEMERAL_VIA_AWS_SSO to that vault only. EPHEMERAL_VIA_GITHUB_APP has no guided setup at all.

**what if we didn't?** users must manually craft json blobs for github app. no discoverability of appId/installationId fields.

**scope check?** right size — move prompt logic from vault to mech.

**simpler?** could add guided setup to mechAdapterGithubApp without vault restructure, but wish explicitly wants separation of concerns.

**verdict:** holds ✓

---

## requirement 2: mech inference adapters

**who said?** wisher clarified: when vault supports multiple mechs for same key, need to prompt which mech to use

**evidence?** AWS_PROFILE with aws.config vault — could be EPHEMERAL_VIA_AWS_SSO or PERMANENT_VIA_AWS_KEY. GITHUB_TOKEN — could be EPHEMERAL_VIA_GITHUB_APP or PERMANENT_VIA_REPLICA.

**what if we didn't?** either fail-fast (bad ux) or pick arbitrary default (unexpected behavior).

**scope check?** introduces new interface — mech inference adapters. but natural extension of guided setup pattern.

**simpler?** could require explicit --mech. but wisher wants the guided experience.

**verdict:** holds ✓ (wisher clarified this requirement)

---

## requirement 3: os.direct forbidden for ephemeral mechs

**who said?** wisher: "explicitly forbid os.direct from ephemeral support, because it cant secure the source key"

**evidence?** os.direct stores plaintext. ephemeral mechs store private keys (github app pem, aws credentials). plaintext private keys defeat the purpose.

**what if we didn't?** users could accidentally expose private keys in plaintext files.

**scope check?** minimal — just a fail-fast check in vault/mech compat.

**verdict:** holds ✓

---

## requirement 4: vault rename aws.iam.sso → aws.config

**who said?** wisher mentioned: "the vault is actually aws.config" and "maybe the vault is changed to just 'aws.credentials'"

**evidence?** current name describes auth method (iam.sso), not storage (config file). aws.config is clearer.

**what if we didn't?** no functional impact, just name clarity.

**scope check?** polish, not core.

**verdict:** defer to wisher — already marked as open question ✓

---

## requirement 5: github app guided setup flow

**who said?** wisher explicitly describes: org selection → app selection → pem path

**evidence?** wish includes actual gh api call and expected fields

**what if we didn't?** users must manually construct json blob — error-prone

**scope check?** right size — prompts are well-defined

**verdict:** holds ✓

---

## requirement 6: mech inference preserved

**who said?** wisher: "mech inference should still work as expected"

**evidence?** extant code infers mech from vault

**what if we didn't?** would break extant usage — users would need --mech everywhere

**scope check?** preserve extant behavior while prompt when ambiguous

**verdict:** holds ✓

---

## requirement 7: multi-vault portability for github app

**who said?** wisher: "can be used with any vault that supports it! (os.secure, 1password, etc)"

**evidence?** github app credentials are json — any vault that stores strings can store json

**what if we didn't?** 1password users can't use github app tokens

**scope check?** right — mech produces json, vault stores it

**verdict:** holds ✓

---

## summary

| requirement | verdict |
|-------------|---------|
| mechs drive prompts | holds |
| mech inference adapters | holds (wisher clarified) |
| os.direct forbidden for ephemeral | holds |
| vault rename | defer to wisher |
| github app guided setup | holds |
| mech inference preserved | holds |
| multi-vault portability | holds |

all requirements justified. one deferred (vault rename) as non-blocker.
