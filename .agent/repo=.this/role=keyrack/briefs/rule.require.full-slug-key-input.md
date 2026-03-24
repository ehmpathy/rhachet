# rule.require.full-slug-key-input

## .what

all keyrack endpoints that accept `--key` must support both:
- raw key name: `EHMPATHY_SEATURTLE_GITHUB_TOKEN`
- full slug: `ehmpathy.test.EHMPATHY_SEATURTLE_GITHUB_TOKEN`

## .why

- convenience: users can paste full slug from logs/errors
- consistency: same slug format works everywhere
- discoverability: `--env` becomes optional when slug contains env

## .behavior

### when full slug provided

```
--key ehmpathy.test.EHMPATHY_SEATURTLE_GITHUB_TOKEN
```

1. extract org: `ehmpathy`
2. extract env: `test`
3. extract key name: `EHMPATHY_SEATURTLE_GITHUB_TOKEN`
4. validate org matches repo manifest (if manifest present)
5. `--env` becomes optional (env extracted from slug)
6. if `--env` also provided, must match slug env or fail-fast

### when raw key name provided

```
--key EHMPATHY_SEATURTLE_GITHUB_TOKEN --env test
```

1. require `--env` (unless key only in one env → infer)
2. construct slug: `${manifest.org}.${env}.${keyName}`

## .detection

full slug format: `$org.$env.$keyName` where:
- `$org` matches manifest org
- `$env` is one of: `sudo`, `prod`, `prep`, `test`, `all`
- `$keyName` is the rest (may contain dots)

## .validation

| condition | behavior |
|-----------|----------|
| full slug org != manifest org | fail-fast: "org mismatch" |
| full slug env != --env (when both provided) | fail-fast: "env mismatch" |
| raw key in multiple envs, no --env | fail-fast: "specify --env" |
| raw key in zero envs, no --env | passthrough (downstream fails) |

## .endpoints

all keyrack endpoints with `--key`:
- `keyrack get --key`
- `keyrack set --key`
- `keyrack del --key`
- `keyrack unlock --key`
- `keyrack fill --key`

## .examples

```bash
# full slug — env extracted, --env optional
rhx keyrack get --key ehmpathy.test.API_TOKEN

# full slug with explicit --env (must match)
rhx keyrack get --key ehmpathy.test.API_TOKEN --env test

# raw key name — env required
rhx keyrack get --key API_TOKEN --env test

# raw key name — env inferred (if unique)
rhx keyrack get --key UNIQUE_KEY
```
