# define.vault-os-envvar-mech-translation

## .what

the os.envvar vault translates secrets via mech adapters at get time, just like other vaults.

## .why

os.envvar powers the keyrack firewall (GitHub Actions). secrets arrive as env vars — some contain JSON blobs with `mech` field that signals translation is needed (e.g., github app credentials → ghs_* token).

unlike other vaults, os.envvar:
- never populates the daemon (no unlock step)
- translation must happen on get

but it reuses the same vault pattern:
- mech adapters handle translation
- `input.mech` takes precedence if supplied
- fallback: infer mech from value via `inferKeyrackMechForGet`

## .mech inference symmetry

| operation | function | behavior |
|-----------|----------|----------|
| set | `inferKeyrackMechForSet` | prompts user (interactive) |
| get | `inferKeyrackMechForGet` | detects from JSON blob (non-interactive) |

`inferKeyrackMechForGet` parses the value — if JSON with `mech` field, uses that mech; otherwise defaults to passthrough.

## .firewall safety

the firewall validates the **token pattern** after translation:

| pattern | verdict | reason |
|---------|---------|--------|
| `ghp_*` | blocked | classic PAT, long-lived |
| `AKIA*` | blocked | AWS access key, long-lived |
| `ghs_*` | allowed | installation token, 1-hour max enforced by github |

ghs_* is safe regardless of origin — github enforces the short lifetime.

sources:
- [GitHub token prefixes](https://github.blog/2021-04-05-behind-githubs-new-authentication-token-formats/) — `ghs_` = installation access token
- [Installation token expiration](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app) — 1-hour max

## .see also

- `define.vault-mech-adapters.md` — vault/mech adapter relationship
- `define.keyrack-identity.md` — keyrack as firewall, dispatcher, broker

