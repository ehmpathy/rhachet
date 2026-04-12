# write-only vaults

write-only vaults push secrets to external systems but cannot retrieve them.

## detection

`adapter.get === null` signals a write-only vault.

## behavior

- **set**: pushes secret to external system (e.g., `gh secret set`)
- **get**: null — not supported; failfast at dispatch
- **unlock**: failfast with ConstraintError ("vault cannot be unlocked")
- **manifest**: skip host manifest write — write-only vaults are passthrough

## why skip manifest write

write-only vaults cannot be used for subsequent `keyrack get/unlock`, so its equivalent to them never been present on this host.

**bonus**: enables push to write-only vaults without risk of erasure of usable host keys.

example flow:
1. user sets key in os.secure (source of truth)
2. user pushes same key to github.secrets (passthrough)
3. host manifest still points to os.secure
4. `keyrack get` retrieves from os.secure (works)

## current write-only vaults

- `github.secrets` — pushes to GitHub Actions secrets via `gh secret set`
