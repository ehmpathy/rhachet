# self-review: has-behavior-declaration-adherance (r10)

## adherance check

check that the blueprint matches the vision and satisfies criteria correctly.

---

## vision adherance: vault adapter shape

### vision (lines 71-79)

```typescript
{
  name: 'github.secrets',
  set: async (input, context) => { ... },
  get: null,
  del: async (input, context) => { ... },
}
```

### blueprint declares

```
vaultAdapterGithubSecrets
├── set (ghApiSetSecret)
├── get: null
└── del (ghApiDelSecret)
```

**verdict:** adheres. blueprint matches vision adapter shape exactly.

---

## vision adherance: supported mechs

### vision (lines 84-85)

- PERMANENT_VIA_REPLICA
- EPHEMERAL_VIA_GITHUB_APP

### blueprint declares (lines 68-70)

- PERMANENT_VIA_REPLICA
- EPHEMERAL_VIA_GITHUB_APP

**verdict:** adheres. same mechs in same order.

---

## vision adherance: unlock behavior

### vision timeline (line 118)

> "unlock: no-op (no local cache for github secrets)"

### vision edgecases (lines 178-179)

| edgecase | behavior |
|----------|----------|
| unlock --key X | failfast: "github.secrets cannot be unlocked" |
| unlock --for repo with github.secrets keys | skip silently |

### blueprint declares (lines 104-107)

```
├── if --key X specifically → failfast
└── if bulk --for repo → add to omitted with reason 'remote'
```

**verdict:** adheres. "no-op" in timeline is shorthand. edgecases clarify failfast vs skip. blueprint matches edgecases.

---

## vision adherance: status output

### vision (lines 103-109)

```json
{
  "status": "locked",
  "slug": "ehmpathy.all.GITHUB_APP_CREDS",
  "message": "github secrets cannot be retrieved via api",
  "fix": null
}
```

### blueprint test coverage (line 144)

> status | shows locked | - | fix: null

**verdict:** adheres. blueprint declares status=locked and fix=null.

---

## criteria adherance: usecase.1 guided setup

### criteria (lines 9-11)

> guided setup prompts for org selection
> guided setup prompts for app selection
> guided setup prompts for private key path

### blueprint (line 72)

> mech.acquireForSet (reuse from mechAdapterGithubApp)

**question:** does reuse ensure all three prompts?

**answer:** yes. mechAdapterGithubApp.acquireForSet handles org → app → pem prompts. reuse preserves this behavior.

**verdict:** adheres.

---

## criteria adherance: usecase.4 unlock specificity

### criteria (lines 57-58)

> when(user runs `keyrack unlock --key X` specifically)
>   then(failfast with "github.secrets cannot be unlocked")

### blueprint (line 105)

> if --key X specifically → failfast

**verdict:** adheres. "specifically" is preserved in blueprint.

---

## criteria adherance: usecase.7 error messages

### criteria (lines 98, 102, 106)

- "gh auth required"
- "repo not found"
- "permission denied"

### blueprint test snapshots (lines 155-157)

- error: gh auth required
- error: repo not found
- error: permission denied

**verdict:** adheres. exact error messages match.

---

## potential deviation: exid format

### vision (line 98)

> "exid": "ehmpathy/rhachet.GITHUB_APP_CREDS"

### blueprint

blueprint does not declare exid format explicitly.

**question:** is this a deviation?

**answer:** no. exid is implementation detail. the format `{owner}/{repo}.{SECRET_NAME}` will be constructed in vault adapter. vision shows expected output, not a hard requirement for blueprint to declare.

**verdict:** not a deviation.

---

## summary

| requirement | source | blueprint | adheres? |
|-------------|--------|-----------|----------|
| adapter shape | vision 71-79 | set, get: null, del | yes |
| supported mechs | vision 84-85 | PERMANENT + EPHEMERAL | yes |
| unlock behavior | vision 178-179 | failfast vs skip | yes |
| status output | vision 103-109 | locked, fix: null | yes |
| guided prompts | criteria 9-11 | reuse mech adapter | yes |
| unlock specificity | criteria 57-58 | "specifically" preserved | yes |
| error messages | criteria 98-106 | exact match | yes |

**blueprint adheres to vision and criteria. no deviations found.**
