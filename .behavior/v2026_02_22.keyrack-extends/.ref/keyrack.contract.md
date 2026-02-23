# keyrack contract

## .what

`rhachet keyrack get` fetches secrets from a secure keystore and outputs shell export statements.

## .why

- skills need api keys and tokens at runtime
- keys should not be hardcoded or committed
- keyrack provides secure, declarative key access

## .trust model

enforced via explicit `extends` in root keyrack:

```yaml
# .agent/keyrack.yml (root repo keyrack)
extends:
  - .agent/repo=ehmpathy/role=mechanic/keyrack.yml
```

- repo owner explicitly opts into which role keyracks to trust
- `keyrack get` only resolves keys from extended specs
- keyrack must be unlocked first (human action required)

## .usage

```bash
# in roles repo: init the spec (validates, prepares for distribution)
rhachet keyrack init --at src/domain.roles/mechanic/keyrack.yml

# in consumer repo: fetch key (reads from root keyrack, which extends role keyracks)
EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$(./node_modules/.bin/rhachet keyrack get --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN --json | jq -r '.key.secret')
```

## .contract

### init

run in the roles repo to prepare the spec for distribution:

```bash
rhachet keyrack init --at src/domain.roles/mechanic/keyrack.yml
```

this:
- validates the keyrack.yml schema
- ensures keys are resolvable from declared sources
- prepares for distribution (build → dist, then symlinked to `.agent/` in consumer repos)

### get

```
rhachet keyrack get --key <KEY_NAME>
```

| arg | required | description |
|-----|----------|-------------|
| `--key` | yes | name of the key to fetch |

reads from root keyrack (`.agent/keyrack.yml`), which extends role keyracks.

### output

with `--json`: JSON object with key metadata and value

```json
{
  "slug": "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN",
  "key": {
    "secret": "ghp_xxxx...",
    "grade": "prod"
  },
  "source": { "vault": "os.keychain", "mech": "REPLICA" },
  "env": "prod",
  "org": "ehmpathy"
}
```

without `--json`: raw value only (for direct assignment)

exit codes:
- `0` — success, export statement on stdout
- `2` — error (key not found, key not available in keystore, etc.)

### keyrack.yml schema

```yaml
# .agent/repo=ehmpathy/role=mechanic/keyrack.yml
keys:
  EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:
    description: github token for seaturtle[bot] pr operations
    source: 1password  # or: env, vault, aws-secrets-manager, etc.
    vault: ehmpathy-prod
    item: seaturtle-bot-github-token
```

## .integration

### git.commit.push.sh

before the token guard, fetch from keyrack:

```bash
# fetch token from keyrack
EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN=$(./node_modules/.bin/rhachet keyrack get --key EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN --json | jq -r '.key.secret') || true

# guard: token required for pr findsert
if [[ -z "${EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN:-}" ]]; then
  emit_error "EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN not set"
  ...
fi
```

the `|| true` allows graceful fallback — if keyrack fails or key unavailable, the guard handles it.

## .todo

- [ ] implement `rhachet keyrack init` in rhachet core
- [ ] implement `rhachet keyrack get` in rhachet core
- [ ] create `src/domain.roles/mechanic/keyrack.yml` with key spec
- [ ] update `git.commit.push.sh` to fetch from keyrack
