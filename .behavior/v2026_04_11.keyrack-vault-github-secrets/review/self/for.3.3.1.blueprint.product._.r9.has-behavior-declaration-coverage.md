# self-review: has-behavior-declaration-coverage (r9)

## behavior declaration check

check every requirement from vision and criteria against the blueprint.

---

## vision requirements

### usecases from vision (lines 59-68)

| goal | vision contract | blueprint coverage? |
|------|-----------------|---------------------|
| set github app to gh secrets | `--mech EPHEMERAL_VIA_GITHUB_APP` | yes — mechs.supported includes this |
| set any key to gh secrets | `--vault github.secrets` | yes — vaultAdapterGithubSecrets |
| delete key from gh secrets | `keyrack del --key X` | yes — ghApiDelSecret |
| check if key was set | `keyrack status --key X` | yes — shows `locked` |
| get key value | `keyrack get --key X` | yes — failfast at dispatch |

**verdict:** all usecases covered.

### vault adapter declaration (lines 71-79)

| requirement | blueprint coverage? |
|-------------|---------------------|
| name: 'github.secrets' | yes — filediff adds to union |
| set method | yes — ghApiSetSecret |
| get: null | yes — explicit in codepath tree |
| del method | yes — ghApiDelSecret |

**verdict:** adapter shape covered.

### supported mechs (lines 84-85)

| mech | blueprint coverage? |
|------|---------------------|
| PERMANENT_VIA_REPLICA | yes — mechs.supported |
| EPHEMERAL_VIA_GITHUB_APP | yes — mechs.supported |

**verdict:** mechs covered.

### edgecases (lines 175-184)

| edgecase | blueprint coverage? |
|----------|---------------------|
| get on github.secrets key | yes — failfast with message |
| unlock --key X | yes — failfast |
| unlock --for repo | yes — skip silently, add to omitted |
| key already set | yes — gh api PUT upsert semantics |
| del key | yes — ghApiDelSecret |
| gh cli not authenticated | yes — error cases in test coverage |
| repo doesn't exist | yes — error cases in test coverage |
| user lacks write access | yes — error cases in test coverage |

**verdict:** all edgecases covered.

---

## criteria requirements

### usecase.1 = set key to github.secrets

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| guided setup prompts (9-11) | yes — mech.acquireForSet reused |
| secret pushed via gh api (12) | yes — ghApiSetSecret |
| stdout shows message (13) | yes — acceptance test snapshots |
| host manifest records key (15) | yes — vault adapter handles this |

**verdict:** usecase.1 covered.

### usecase.2 = delete key from github.secrets

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| gh api DELETE called (32) | yes — ghApiDelSecret |
| key removed from host manifest (33) | yes — vault adapter handles this |
| idempotent delete (38) | yes — gh api returns success |

**verdict:** usecase.2 covered.

### usecase.3 = get key from github.secrets (failfast)

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| failfast message (47) | yes — getKeyrackKeyHost check |
| status shows locked (48) | yes — status shows locked |
| fix shows null (49) | yes — fix: null |

**verdict:** usecase.3 covered.

### usecase.4 = unlock key from github.secrets

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| unlock --key X failfast (58) | yes — unlockKeyrackKeys check |
| unlock --for repo skip silently (64) | yes — add to omitted with reason 'remote' |

**verdict:** usecase.4 covered.

### usecase.5 = status of github.secrets key

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| status shows locked (74) | yes — covered in test cases |
| vault shows github.secrets (75) | yes — covered in test cases |

**verdict:** usecase.5 covered.

### usecase.6 = upsert semantics

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| gh api PUT overwrites (88) | yes — gh api PUT is upsert |
| host manifest updated (89) | yes — vault adapter handles this |

**verdict:** usecase.6 covered.

### usecase.7 = error cases

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| gh auth required (98) | yes — validateGhAuth in ghApiSetSecret |
| repo not found (102) | yes — acceptance test case9 |
| permission denied (106) | yes — acceptance test case10 |

**verdict:** usecase.7 covered.

### usecase.8 = vault adapter declares get: null

| requirement (criteria line) | blueprint coverage? |
|-----------------------------|---------------------|
| get method is null (113) | yes — explicit in codepath tree |
| set method is defined (114) | yes — ghApiSetSecret |
| del method is defined (115) | yes — ghApiDelSecret |

**verdict:** usecase.8 covered.

---

## summary

| source | requirements | covered | gaps |
|--------|--------------|---------|------|
| vision usecases | 5 | 5 | 0 |
| vision edgecases | 8 | 8 | 0 |
| criteria usecases | 8 | 8 | 0 |

**all requirements from vision and criteria are addressed in the blueprint.**
