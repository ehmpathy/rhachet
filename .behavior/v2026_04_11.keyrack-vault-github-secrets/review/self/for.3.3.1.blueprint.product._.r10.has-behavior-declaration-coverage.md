# self-review: has-behavior-declaration-coverage (r10)

## deeper reflection: what did r9 miss?

r9 checked explicit usecases. let me examine implicit requirements and edge behaviors.

---

## implicit requirements from vision

### timeline (vision lines 112-118)

| step | vision says | blueprint addresses? |
|------|-------------|---------------------|
| set | mech guided setup → value acquired → gh api writes | yes — mech.acquireForSet + ghApiSetSecret |
| list | shows key in host manifest | **n/a** — extant behavior, not new |
| status | shows `locked` | yes — test case6 |
| get | failfast | yes — get: null |
| unlock | no-op | yes — failfast or skip |

**why list is n/a:** the blueprint does not need to declare list behavior. the host manifest is updated by the vault adapter's set method. extant `keyrack list` already displays manifest entries. no new code needed.

### exid format (vision line 98)

vision shows: `"exid": "ehmpathy/rhachet.GITHUB_APP_CREDS"`

**question:** does blueprint declare exid construction?

**answer:** no explicit declaration, but this follows extant pattern. vault adapters construct exid internally. for github.secrets, exid format `{owner}/{repo}.{SECRET_NAME}` is natural. this is implementation detail, not a blueprint requirement.

**verdict:** not a gap.

### sodium encryption (vision line 51)

vision mentions: "the mech adapter handles the json construction"

**question:** does blueprint cover json construction for EPHEMERAL_VIA_GITHUB_APP?

**answer:** yes — blueprint line 72 states `mech.acquireForSet (reuse from mechAdapterGithubApp)`. the mech adapter handles json construction (appId, installationId, privateKey). vault adapter just encrypts and pushes the output value.

**verdict:** covered via reuse.

---

## subtle edge cases from criteria

### criteria usecase.6 (upsert semantics)

criteria says: "gh api PUT overwrites the secret"

**question:** does blueprint explicitly state PUT is upsert?

**answer:** blueprint line 8 says "gh api -X PUT". the gh api PUT to secrets endpoint is idempotent upsert by design. this is not custom logic — it's github api semantics.

**verdict:** covered by gh api behavior.

### criteria usecase.2 (idempotent delete)

criteria lines 37-39: "key does not exist in github.secrets" → "gh api returns success"

**question:** does blueprint handle delete of absent key?

**answer:** blueprint declares ghApiDelSecret. the gh api DELETE is idempotent (returns success for absent keys). no special logic needed.

**verdict:** covered by gh api behavior.

---

## omitted in criteria but needed

### secret name validation

vision does not explicitly require secret name validation, but github has restrictions:
- alphanumeric and underscore only
- cannot start with GITHUB_ prefix
- cannot start with a number

**question:** does blueprint address this?

**answer:** yes — blueprint line 81: `validateSecretName (alphanumeric/underscore, no GITHUB_ prefix)`

**verdict:** covered. blueprint anticipated this need.

---

## summary of r10 reflection

| area | r9 checked? | r10 deeper check | result |
|------|-------------|------------------|--------|
| timeline steps | partial | list is extant behavior | not a gap |
| exid construction | no | follows extant pattern | not a gap |
| json construction | no | reused from mech adapter | covered |
| upsert semantics | yes | gh api behavior | covered |
| idempotent delete | partial | gh api behavior | covered |
| secret name validation | no | blueprint anticipated | covered |

**r10 found no additional gaps.** all implicit requirements are either covered by blueprint, handled by extant behavior, or follow gh api semantics.
