# self-review: has-zero-deferrals

review that no item from the vision is deferred. zero leniance.

---

## vision items checklist

| vision item | addressed in blueprint? | location in blueprint |
|-------------|------------------------|----------------------|
| translate JSON blobs to tokens in CI | yes | processOneSecret.ts routes to mech adapters |
| block dangerous credentials (ghp_*, AKIA*) | yes | firewall validation via LONG_LIVED_PATTERNS |
| same logic in dev and CI | yes | reuses mechAdapterGithubApp, mechAdapterAwsSso, mechAdapterReplica |
| no host manifest needed in CI | yes | self-descriptive blob with mech field |
| toJSON(secrets) input | yes | action.yml accepts secrets input |
| $GITHUB_ENV output | yes | exportGrantedSecrets uses core.exportVariable() |
| keyrack.yml as filter | yes | filterToManifestKeys uses daoKeyrackRepoManifest |
| mask secrets in logs | yes | exportGrantedSecrets uses core.setSecret() |
| fail fast on error | yes | index.ts orchestrator fail-fast pattern |
| output format (treestruct) | yes | success and blocked output formats specified |
| ghs_* bug fix | yes | remove ghs_* from LONG_LIVED_PATTERNS |

---

## deferrals found

none.

---

## verification

all vision items are addressed in the blueprint:

1. **translate JSON blobs to tokens** — processOneSecret.ts detects mech field and routes to appropriate adapter
2. **block dangerous credentials** — firewall validation in mechAdapterReplica with LONG_LIVED_PATTERNS
3. **same logic in dev and CI** — [REUSE] markers for mechanism adapters in codepath tree
4. **no host manifest in CI** — self-descriptive blob parse in detectMech()
5. **toJSON(secrets) input** — action.yml manifest shows secrets input with `${{ toJSON(secrets) }}`
6. **$GITHUB_ENV output** — exportGrantedSecrets.ts uses core.exportVariable()
7. **keyrack.yml filter** — filterToManifestKeys.ts uses daoKeyrackRepoManifest
8. **mask secrets** — core.setSecret() calls in exportGrantedSecrets
9. **fail fast** — error cases table shows exit code 1 for all errors
10. **output format** — success and blocked treestruct outputs documented
11. **ghs_* fix** — explicit fix section with diff that shows removal from LONG_LIVED_PATTERNS

---

## why each check holds

### 1. translate JSON blobs to tokens

the blueprint specifies `processOneSecret.ts` with:
- `detectMech()` function that parses JSON to find `mech` field
- routing to `mechAdapterGithubApp.deliverForGet()` or `mechAdapterAwsSso.deliverForGet()`
- explicit codepath tree showing the orchestrator flow

this is not deferred — it's the core implementation path.

### 2. block dangerous credentials

the blueprint specifies:
- firewall validation in `mechAdapterReplica.validate()`
- `LONG_LIVED_PATTERNS` regex array for ghp_*, gho_*, ghu_*, ghr_*, AKIA*
- test cases: `[case4] no mech, ghp_* → blocked` and `[case5] no mech, AKIA* → blocked`

this is not deferred — blocking is baked into the validation path.

### 3. same logic in dev and CI

the blueprint uses [REUSE] markers in codepath tree for:
- `mechAdapterGithubApp` — import and call `deliverForGet()`
- `mechAdapterAwsSso` — import and call `deliverForGet()`
- `mechAdapterReplica` — import and call for passthrough/block

same adapters, same translation logic. not a deferral.

### 4. no host manifest in CI

the blueprint relies on self-descriptive blobs:
- `detectMech()` parses blob for `mech` field
- no host manifest lookup in action flow
- manifest only used for key filtering via `daoKeyrackRepoManifest`

self-description replaces host manifest. not deferred.

### 5. toJSON(secrets) input

the blueprint specifies action.yml manifest:
```yaml
inputs:
  secrets:
    description: 'JSON object of secrets (use toJSON(secrets))'
    required: true
```

ergonomic input format is fully specified. not deferred.

### 6. $GITHUB_ENV output

the blueprint specifies `exportGrantedSecrets.ts`:
- `core.exportVariable(key, value)` for each granted key
- this writes to `$GITHUB_ENV` automatically

output mechanism is fully specified. not deferred.

### 7. keyrack.yml filter

the blueprint specifies `filterToManifestKeys.ts`:
- [REUSE] `daoKeyrackRepoManifest.get({ gitroot })`
- filter secrets to intersection with declared keys

filter mechanism is fully specified. not deferred.

### 8. mask secrets

the blueprint specifies:
- `core.setSecret(value)` call before `core.exportVariable()`
- this masks values in GitHub Actions logs

masking is fully specified. not deferred.

### 9. fail fast

the blueprint specifies error cases table:
- malformed JSON → exit 1
- keyrack.yml absent → exit 1
- unknown mech → exit 1
- translation error → exit 1
- blocked pattern → exit 2

all error paths fail fast. not deferred.

### 10. output format

the blueprint specifies treestruct output:
- success format with grants tree
- blocked format with fix hints
- matches established keyrack output patterns

output format is fully specified. not deferred.

### 11. ghs_* bug fix

the blueprint specifies explicit fix:
```diff
- /^ghs_[a-zA-Z0-9]{36}$/,  // github server-to-server (long-lived)
+ // ghs_* REMOVED: installation tokens are short-lived (1 hour max)
```

bug fix is specified with exact diff. not deferred.

---

## conclusion

blueprint has zero deferrals. all 11 vision items are addressed with concrete implementation plans. each item has:
- specific files in the filediff tree
- clear codepaths in the codepath tree
- test coverage in the test tree
- no "future work" or "phase 2" markers
