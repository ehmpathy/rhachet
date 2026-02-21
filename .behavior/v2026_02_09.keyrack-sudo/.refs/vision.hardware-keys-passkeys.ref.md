# vision: hardware keys and passkeys for keyrack

## .what

how keyrack's key-based lock system integrates with hardware security keys (YubiKey, etc) and the emerging passkey ecosystem.

---

## .the landscape

### hardware security keys

physical devices that store cryptographic keys:

| device | protocols | key storage |
|--------|-----------|-------------|
| **YubiKey** | FIDO2, PIV, OpenPGP, OTP | hardware-bound, non-extractable |
| **SoloKey** | FIDO2 | hardware-bound, open source |
| **Titan Key** | FIDO2 | hardware-bound (Google) |
| **Nitrokey** | FIDO2, OpenPGP | hardware-bound, open source |

### passkeys

passwordless authentication standard (FIDO2/WebAuthn):

| property | description |
|----------|-------------|
| **discoverable** | credential stored on device, no username needed |
| **synced** | can sync across devices (iCloud Keychain, Google Password Manager) |
| **platform** | built into os (macOS, iOS, Windows Hello, Android) |
| **roaming** | hardware key (YubiKey, etc) |

---

## .how they interact with keyrack

### current model: ssh keys

```
ssh key (software)
  └─> stored in ~/.ssh/id_ed25519
        └─> loaded into ssh-agent
              └─> keyrack uses for encryption/decryption
```

### hardware key model

```
hardware key (YubiKey)
  └─> stores private key in secure element
        └─> accessed via age-plugin-yubikey or ssh-agent
              └─> keyrack uses for encryption/decryption
```

### passkey model (future)

```
passkey (platform or roaming)
  └─> stored in secure enclave or hardware key
        └─> accessed via WebAuthn/CTAP2
              └─> keyrack uses for encryption/decryption
```

---

## .yubikey integration

### via age-plugin-yubikey

age has a plugin for YubiKey:

```bash
# setup (one-time)
age-plugin-yubikey  # generates key on YubiKey, outputs recipient

# encrypt to YubiKey
age -r "age1yubikey1..." file.txt > file.txt.age

# decrypt (requires physical touch)
age -d -i age-plugin-yubikey file.txt.age > file.txt
```

keyrack would use this directly:

```bash
# init keyrack with YubiKey
keyrack init --recipient yubikey
# → runs age-plugin-yubikey
# → stores recipient in config
# → encrypts keyrack.host.yml.age to YubiKey

# unlock (requires YubiKey touch)
keyrack unlock --env sudo --key X
# → age-plugin-yubikey prompts for touch
# → decrypts manifest
# → loads credential
```

### via ssh with YubiKey

YubiKey can also act as an ssh key:

```bash
# YubiKey stores ssh key in PIV slot
# ssh-agent talks to YubiKey
# keyrack uses ssh-agent (unchanged)

keyrack init --recipient ssh
# → uses YubiKey-backed ssh key
# → same flow as software ssh key
# → touch required for each use
```

### benefits of YubiKey

| benefit | explanation |
|---------|-------------|
| **non-extractable** | private key never leaves hardware |
| **physical presence** | touch required = confirms human |
| **tamper-resistant** | secure element resists extraction |
| **portable** | same key on any machine |

### tradeoffs

| tradeoff | mitigation |
|----------|------------|
| **cost** | ~$50 per key |
| **loss/damage** | backup key recommended |
| **touch fatigue** | cache unlock for session duration |
| **availability** | not everyone has one |

---

## .passkey integration (future)

### what passkeys offer

passkeys are the evolution of hardware keys + biometrics:

| feature | description |
|---------|-------------|
| **no password** | biometric or pin instead |
| **phishing-resistant** | bound to origin, can't be replayed |
| **synced** | platform passkeys sync across devices |
| **discoverable** | no username needed to authenticate |

### passkeys for encryption?

passkeys are designed for **authentication** (prove who you are), not **encryption** (protect data). however, they can derive encryption keys:

```
passkey assertion
  └─> PRF extension (FIDO2 hmac-secret)
        └─> derives symmetric key
              └─> encrypts/decrypts data
```

this is emerging (2024+) and not yet widely supported.

### potential keyrack flow

```bash
# future: init with passkey
keyrack init --recipient passkey
# → prompts for biometric/pin
# → derives encryption key via PRF
# → encrypts keyrack.host.yml.age

# future: unlock with passkey
keyrack unlock --env sudo --key X
# → prompts for biometric/pin
# → derives key via PRF
# → decrypts manifest
```

### current limitations

| limitation | status |
|------------|--------|
| **PRF support** | limited browser support, no cli support yet |
| **age integration** | no age-plugin-passkey exists |
| **platform support** | varies by os/browser |

### recommendation

passkeys are not ready for keyrack yet. use:
1. **ssh keys** (default, universal)
2. **YubiKey via age-plugin-yubikey** (for hardware security)
3. **YubiKey via ssh-agent** (if already using PIV)

revisit passkeys when PRF extension is widely available and age has a plugin.

---

## .comparison

| method | security | ux | availability | keyrack support |
|--------|----------|-----|--------------|-----------------|
| **ssh key (software)** | good | automatic | universal | ✓ now |
| **ssh key (YubiKey PIV)** | excellent | touch per use | yubikey owners | ✓ now |
| **age-plugin-yubikey** | excellent | touch per use | yubikey owners | ✓ now |
| **passkey (roaming)** | excellent | touch + biometric | hardware key owners | 🔜 future |
| **passkey (platform)** | good | biometric only | modern devices | 🔜 future |

---

## .multi-factor considerations

### ssh key alone

```
factor 1: possession of private key file
```

if machine is compromised, key is compromised.

### ssh key + YubiKey

```
factor 1: possession of YubiKey
factor 2: physical touch (presence)
```

much stronger — attacker needs physical access.

### passkey

```
factor 1: possession of device
factor 2: biometric or pin
```

comparable to YubiKey, but with biometric convenience.

### keyrack's role

keyrack doesn't add factors — it leverages what the key system provides:

| key source | factors | keyrack adds |
|------------|---------|--------------|
| software ssh key | 1 (possession) | none |
| YubiKey ssh | 2 (possession + touch) | none |
| YubiKey age plugin | 2 (possession + touch) | none |
| passkey | 2 (possession + biometric) | none |

keyrack is the **consumer** of authentication, not the provider.

---

## .recommended setup

### for most developers

```bash
# use ssh key (simple, universal)
keyrack init --recipient ssh
```

### for high-security needs

```bash
# use YubiKey via age plugin
keyrack init --recipient yubikey

# or via ssh with YubiKey PIV
# (setup YubiKey PIV first, then)
keyrack init --recipient ssh
```

### for teams

```bash
# each member uses their own key (ssh or yubikey)
# add each member's public key as recipient
keyrack recipient set --pubkey "ssh-ed25519 AAAA... alice"
keyrack recipient set --pubkey "age1yubikey1... bob"

# manifest encrypted to all recipients
# any member can decrypt
```

---

## .summary

| technology | keyrack support | when to use |
|------------|-----------------|-------------|
| **ssh key** | ✓ now | default, universal |
| **YubiKey (PIV/ssh)** | ✓ now | hardware security via ssh-agent |
| **YubiKey (age plugin)** | ✓ now | hardware security via age |
| **passkey** | 🔜 future | when PRF extension matures |

keyrack follows age's plugin model — as new key sources mature (passkeys, new hardware), age plugins will enable them. keyrack benefits automatically.

---

## .sources

- [age-plugin-yubikey](https://github.com/str4d/age-plugin-yubikey)
- [YubiKey PIV guide](https://developers.yubico.com/PIV/)
- [FIDO2 PRF extension](https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html#sctn-hmac-secret-extension)
- [WebAuthn PRF](https://w3c.github.io/webauthn/#prf-extension)
- [passkeys.dev](https://passkeys.dev/)

