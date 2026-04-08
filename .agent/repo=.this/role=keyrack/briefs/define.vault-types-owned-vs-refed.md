# define.vault-types-owned-vs-refed

## .what

keyrack vaults fall into two categories:

| type | description | examples |
|------|-------------|----------|
| **owned** | keyrack manages the secret directly | os.secure, os.direct, os.daemon |
| **refed** | keyrack points to an external source of truth | 1password, aws.config |

## .owned vaults

keyrack stores and manages the secret:
- `set` writes the secret to the vault
- `del` removes the secret from the vault
- keyrack is the source of truth

## .refed vaults

keyrack stores a pointer (exid) to the secret:
- `set` stores the pointer in the host manifest
- `del` removes the pointer from keyrack — the external item remains
- the external system (1password, aws) is the source of truth
- `unlock` fetches from the external system to daemon

## .why this matters

- `keyrack del` behaves differently: owned vaults lose the secret, refed vaults keep the external item
- rotations: refed vaults pick up rotations on next unlock, owned vaults require explicit update
- security model: refed vaults leverage external auth (biometric, sso), owned vaults rely on keyrack's encryption

## .keyrack is not a vault

keyrack is a firewall, dispatcher, and runtime access supplier — not a vault itself. it controls access to vaults (owned or refed) and supplies unlocked keys to sessions via the daemon.
